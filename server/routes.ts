import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fileUpload from "express-fileupload";
import { PDFParse } from "pdf-parse";
import { storage } from "./storage";
import { verifyUserToken, checkAccess, getUser as getWhopUser, createCheckoutConfiguration, verifyPaymentComplete, whop, sendNotification, getCompanyIdFromExperience } from "./whop";
import { generateCourse, regenerateModule, regenerateLesson, generateCourseImage, generateImagePrompt, generateCourseMediaPlan, generateLessonImage, generateQuiz, generateDeepVideoImage, generateVeoVideoSegment, analyzeDocumentMetadata, generateFallbackImagePrompt, generateBlockContent, generateCourseImageWithDeAPI } from "./gemini";
import { stitchVideos } from "./video-processor";
import path from "path";
import fs from "fs";
import { generateTTS } from "./tts";
import { generatedCourseSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import { sendWithdrawRequestEmail } from "./resend";

// In-memory store for background generation jobs
interface GenerationJob {
  status: "pending" | "completed" | "failed";
  result?: any;
  error?: string;
  createdAt: number;
}
const generationJobs = new Map<string, GenerationJob>();

// Cleanup old jobs every hour
setInterval(() => {
  const oneHourAgo = Date.now() - (1000 * 60 * 60);
  for (const [id, job] of generationJobs.entries()) {
    if (job.createdAt < oneHourAgo) {
      generationJobs.delete(id);
    }
  }
}, 1000 * 60 * 60);

// Custom type for requests that have been authenticated with Whop
// We extend any as a fallback if express types are not properly loaded
interface AuthenticatedRequest {
  [key: string]: any;
  whopUserId?: string;
  user?: any;
  accessLevel?: "admin" | "customer" | "no_access";
}

const DAILY_GENERATION_LIMIT = 2;

async function getGenerationLimit(userId: string) {
  const used = await storage.getCoursesGeneratedToday(userId);
  const resetAt = new Date();
  resetAt.setUTCHours(24, 0, 0, 0);

  return {
    limit: DAILY_GENERATION_LIMIT,
    used,
    remaining: Math.max(0, DAILY_GENERATION_LIMIT - used),
    resetAt: resetAt.toISOString(),
  };
}

async function authenticateWhop(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers["x-whop-user-token"] as string;

  if (!token) {
    return res.status(401).json({ error: "Missing authentication token" });
  }

  try {
    const result = await verifyUserToken(token);
    if (!result) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.whopUserId = result.userId;

    let user = await storage.getUserByWhopId(result.userId);

    if (!user) {
      const whopUserData = await getWhopUser(result.userId);
      user = await storage.createUser({
        id: randomUUID(),
        whopUserId: result.userId,
        email: (whopUserData as any)?.email || null,
        username: (whopUserData as any)?.username || null,
        profilePicUrl: (whopUserData as any)?.profile_picture?.url || null,
        role: "member",
        whopCompanyId: null,
      });
    } else if (!user.profilePicUrl) {
      const whopUserData = await getWhopUser(result.userId);
      if (whopUserData?.profile_picture?.url) {
        await storage.updateUser(user.id, { profilePicUrl: whopUserData.profile_picture.url });
        user = await storage.getUser(user.id);
      }
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// Helper to get Business ID (the ID stored in DB) from either Business or Experience ID
async function resolveCompanyId(id: string): Promise<string> {
  if (id.startsWith("biz_")) return id;
  if (id.startsWith("exp_")) {
    const bizId = await getCompanyIdFromExperience(id);
    return bizId || id;
  }
  return id;
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let companyId = req.params.companyId || req.body.companyId;

  if (!companyId || !req.whopUserId) {
    return res.status(400).json({ error: "Missing company ID" });
  }

  try {
    // Normalize companyId if it's an experience ID
    if (companyId.startsWith("exp_")) {
      const resolved = await resolveCompanyId(companyId);
      if (resolved !== companyId) {
        console.log(`[requireAdmin] Normalized ${companyId} to ${resolved}`);
        companyId = resolved;
        // Update both params and body to ensure all future logic sees the normalized ID
        if (req.params.companyId) req.params.companyId = resolved;
        if (req.body.companyId) req.body.companyId = resolved;
      }
    }

    const access = await checkAccess(companyId, req.whopUserId);
    if (access.access_level !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.accessLevel = access.access_level;

    if (req.user) {
      const updates: any = {};
      let needsUpdate = false;

      if (req.user.role !== "creator" && req.user.role !== "admin") {
        updates.role = "creator";
        needsUpdate = true;
      }

      if (req.user.whopCompanyId !== companyId) {
        updates.whopCompanyId = companyId;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await storage.updateUser(req.user.id, updates);
        req.user = await storage.getUser(req.user.id);
      }
    }

    next();
  } catch {
    return res.status(403).json({ error: "Access denied" });
  }
}

async function requireExperienceAccess(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const experienceId = req.params.experienceId;

  if (!experienceId || !req.whopUserId) {
    return res.status(400).json({ error: "Missing experience ID" });
  }

  try {
    const access = await checkAccess(experienceId, req.whopUserId);
    if (!access.has_access) {
      return res.status(403).json({ error: "Access denied" });
    }

    req.accessLevel = access.access_level;
    next();
  } catch {
    return res.status(403).json({ error: "Access denied" });
  }
}

async function startBackgroundMediaGeneration(options: {
  courseId: string;
  creatorId: string;
  companyId: string;
  experienceId?: string;
  courseTitle: string;
  modules: any[];
  generateLessonImages: boolean;
  generateVideo: boolean;
  createdLessons: { moduleIndex: number; lessonIndex: number; lessonId: string }[];
}) {
  const { courseId, creatorId, companyId, experienceId, courseTitle, modules, generateLessonImages, generateVideo, createdLessons } = options;

  // Process images asynchronously without blocking the response
  setTimeout(async () => {
    try {
      console.log(`=== Starting shared background media generation for course: ${courseTitle} ===`);
      console.log("Flags - images:", generateLessonImages, "video:", generateVideo);

      const mediaPlan = await generateCourseMediaPlan(courseTitle, modules);
      console.log("Media plan generated:", JSON.stringify(mediaPlan, null, 2));

      if (!mediaPlan || !Array.isArray((mediaPlan as any).modules)) {
        console.error("Invalid media plan structure. modules array missing.");
        throw new Error("Invalid media plan: missing modules");
      }

      let imagesGenerated = 0;
      const maxRetries = 2;

      const modulesToProcess = (mediaPlan as any).modules || [];
      for (let i = 0; i < modulesToProcess.length; i++) {
        const modulePlan = modulesToProcess[i];
        const lessonsToProcess = modulePlan.lessons || [];

        for (let j = 0; j < lessonsToProcess.length; j++) {
          const lessonPlan = lessonsToProcess[j];
          const imagePlans = lessonPlan.images || [];

          const lessonInfo = createdLessons.find(
            l => l.moduleIndex === modulePlan.moduleIndex && l.lessonIndex === lessonPlan.lessonIndex
          );

          if (!lessonInfo) continue;

          // 1. Generate Images
          if (generateLessonImages && imagePlans.length > 0) {
            for (let k = 0; k < imagePlans.length; k++) {
              const imagePlan = imagePlans[k];
              let imageUrl: string | null = null;
              let attempts = 0;

              while (!imageUrl && attempts < maxRetries) {
                attempts++;
                try {
                  console.log(`[Attempt ${attempts}/${maxRetries}] Generating image for lesson ${lessonInfo.lessonId}...`);
                  imageUrl = await generateLessonImage(imagePlan.imagePrompt);
                  if (!imageUrl && attempts < maxRetries) await new Promise(r => setTimeout(r, 2000));
                } catch (e) {
                  console.error(`Image generation attempt ${attempts} failed:`, e);
                  if (attempts < maxRetries) await new Promise(r => setTimeout(r, 2000));
                }
              }

              if (imageUrl) {
                await storage.addLessonMedia(lessonInfo.lessonId, {
                  id: randomUUID(),
                  type: "image",
                  url: imageUrl,
                  alt: imagePlan.imageAlt || "",
                  caption: "",
                  placement: imagePlan.placement ?? 0,
                  prompt: imagePlan.imagePrompt,
                });
                imagesGenerated++;
              }
            }
          }

          // 2. Generate Video - Now at Module level (Module Introduction)
          // We trigger video generation ONLY for the selected lesson flagged in the media plan
          if (generateVideo && lessonPlan.shouldGenerateVideo) {
            try {
              console.log(`--- Starting Lesson Video Flow for Lesson ${lessonInfo.lessonId} in Module ${modulePlan.moduleIndex + 1} ---`);

              const moduleContext = {
                title: modules[modulePlan.moduleIndex].module_title,
                lessons: modules[modulePlan.moduleIndex].lessons.map((l: any) => ({
                  title: l.lesson_title,
                  content: l.content.substring(0, 200) // Provide summaries
                }))
              };

              const baseImageUrl = await generateDeepVideoImage(
                courseTitle,
                moduleContext.title,
                moduleContext.lessons
              );

              if (baseImageUrl) {
                const videoSegments: string[] = [];
                for (let k = 0; k < 3; k++) {
                  const segmentUrl = await generateVeoVideoSegment(baseImageUrl, k);
                  if (segmentUrl) videoSegments.push(segmentUrl);
                }

                if (videoSegments.length > 0) {
                  const outputDir = path.join(process.cwd(), "public", "uploads");
                  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

                  const outputFilename = `video_${courseId}_mod_${modulePlan.moduleIndex}.mp4`;
                  const outputPath = path.join(outputDir, outputFilename);

                  // Stitch whatever we have (preferably 3)
                  await stitchVideos(videoSegments, outputPath);

                  const videoUrl = `/uploads/${outputFilename}`;

                  // Attach video to the FIRST lesson of the module as an introduction
                  await storage.addLessonMedia(lessonInfo.lessonId, {
                    id: randomUUID(),
                    type: "video",
                    url: videoUrl,
                    alt: `AI Generated Introduction for ${moduleContext.title}`,
                    caption: `Module Intro: ${moduleContext.title}`,
                    placement: 0, // Top of lesson
                    prompt: `Module Intro Video`,
                  });
                  console.log(`Successfully added module video ${videoUrl} to lesson ${lessonInfo.lessonId}`);
                }
              }
            } catch (vError) {
              console.error("Video generation failed:", vError);
            }
          }
        }
      }

      console.log(`=== Finished background generation for course ${courseId}. Success: ${imagesGenerated} images ===`);

      // Update course status to complete
      await storage.updateCourse(courseId, { generationStatus: "complete" });

      // Send Whop notification
      try {
        const idForResolution = experienceId || companyId;
        const realCompanyId = idForResolution.startsWith("biz_") ? idForResolution : await getCompanyIdFromExperience(idForResolution);
        if (realCompanyId) {
          await sendNotification({
            companyId: realCompanyId,
            title: "Course Ready!",
            content: `Your course "${courseTitle}" has finished generating. All media is now ready.`,
            subtitle: `${imagesGenerated} images generated successfully`,
            restPath: `${idForResolution}/courses/${courseId}/edit`,
          });
        }
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
      }

    } catch (mediaPlanError) {
      console.error("Critical error in background generation:", mediaPlanError);
      await storage.updateCourse(courseId, { generationStatus: "complete" });
    }
  }, 100);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/auth/me", authenticateWhop, (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Middleware for file uploads
  app.use(fileUpload());

  app.post("/api/extract-document-text", authenticateWhop, async (req: any, res: any) => {
    try {
      if (!req.files || !req.files.document) {
        return res.status(400).json({ error: "No document uploaded" });
      }

      const file = req.files.document;
      let text = "";

      console.log(`[Document Extraction] File: ${file.name}, Mime: ${file.mimetype}, Size: ${file.size} bytes`);

      if (file.mimetype === "application/pdf") {
        const parser = new PDFParse({ data: file.data });
        const result = await parser.getText();
        text = result.text;
      } else if (file.mimetype === "text/plain" || file.name.endsWith(".txt")) {
        text = file.data.toString("utf8");
      } else {
        return res.status(400).json({ error: "Unsupported file type. Please upload PDF or TXT." });
      }

      // Basic cleanup
      text = text.replace(/\s+/g, " ").trim();

      // Limit text size for prompt safety
      if (text.length > 15000) {
        text = text.substring(0, 15000) + "... [truncated due to length]";
      }

      res.json({ text });
    } catch (error) {
      console.error("Text extraction error:", error);
      res.status(500).json({ error: "Failed to extract text from document" });
    }
  });

  app.post("/api/analyze-document", authenticateWhop, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "No text provided for analysis" });
      }

      const analysis = await analyzeDocumentMetadata(text);
      res.json(analysis);
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });

  app.get("/api/dashboard/:companyId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const courses = await storage.getCoursesByCreator(req.user.id, req.params.companyId);

      const coursesWithStats = await Promise.all(
        courses.map(async (course: any) => {
          const courseWithModules = await storage.getCourseWithModules(course.id);
          const access = await storage.getCourseAccessByCourse(course.id);
          return {
            ...course,
            moduleCount: courseWithModules?.modules.length || 0,
            lessonCount: courseWithModules?.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0) || 0,
            studentCount: access.length,
          };
        })
      );

      // For admin users (platform owners), use adminBalance
      // For creator users (course creators), use CreatorEarnings
      let earnings;
      if (req.user.role === "admin" && req.user.adminBalance) {
        earnings = {
          totalEarnings: req.user.adminBalance.totalEarnings,
          availableBalance: req.user.adminBalance.availableBalance,
          pendingBalance: 0, // Admin balance doesn't have pending balance
        };
      } else {
        const creatorEarnings = await storage.getCreatorEarnings(req.user.id);
        earnings = creatorEarnings ? {
          totalEarnings: creatorEarnings.totalEarnings,
          availableBalance: creatorEarnings.availableBalance,
          pendingBalance: creatorEarnings.pendingBalance,
        } : {
          totalEarnings: 0,
          availableBalance: 0,
          pendingBalance: 0,
        };
      }

      const generationLimit = await getGenerationLimit(req.user.id);

      res.json({
        user: req.user,
        courses: coursesWithStats,
        companyId: req.params.companyId,
        earnings,
        generationLimit,
      });
    } catch {

      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.post("/api/dashboard/:companyId/withdraw-request", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { amount } = req.body;
      const requestedAmount = amount ? parseFloat(amount) : null;

      if (requestedAmount !== null && (isNaN(requestedAmount) || requestedAmount <= 0)) {
        return res.status(400).json({ error: "Invalid withdrawal amount" });
      }

      // For admin users, use adminBalance; for creators, use CreatorEarnings
      let availableBalance: number;
      let totalEarnings: number;

      if (req.user.role === "admin" && req.user.adminBalance) {
        availableBalance = req.user.adminBalance.availableBalance;
        totalEarnings = req.user.adminBalance.totalEarnings;
      } else {
        const earnings = await storage.getCreatorEarnings(req.user.id);
        if (!earnings) {
          return res.status(400).json({ error: "No earnings found" });
        }
        availableBalance = earnings.availableBalance;
        totalEarnings = earnings.totalEarnings;
      }

      if (availableBalance <= 0) {
        return res.status(400).json({ error: "No available balance to withdraw" });
      }

      const withdrawAmount = requestedAmount !== null ? requestedAmount : availableBalance;

      if (withdrawAmount > availableBalance) {
        return res.status(400).json({ error: "Withdrawal amount exceeds available balance" });
      }

      // Deduct the amount
      if (req.user.role === "admin") {
        await storage.deductAdminEarnings(req.user.id, withdrawAmount);
      } else {
        await storage.deductCreatorEarnings(req.user.id, withdrawAmount);
      }

      const adminName = req.user.username || req.user.email || "Unknown Admin";

      await sendWithdrawRequestEmail({
        adminName,
        adminEmail: req.user.email,
        adminUsername: req.user.username,
        whopUserId: req.user.whopUserId,
        amount: withdrawAmount,
        availableBalance: availableBalance - withdrawAmount,
        totalEarnings,
      });

      res.json({
        success: true,
        message: "Withdraw request sent successfully",
        amount: withdrawAmount,
      });
    } catch (error) {
      console.error("Failed to process withdraw request:", error);
      res.status(500).json({ error: "Failed to send withdraw request" });
    }
  });

  app.post("/api/dashboard/:companyId/courses/generate", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { topic, tone, audience, outline, referenceText } = req.body;

      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }

      const { remaining, resetAt } = await getGenerationLimit(req.user.id);
      if (remaining <= 0) {
        return res.status(429).json({
          error: "Daily generation limit reached",
          resetAt
        });
      }

      const generatedCourse = await generateCourse(topic, { tone, audience, outline, referenceText });
      res.json(generatedCourse);
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ error: "Failed to generate course" });
    }
  });

  // Async version to handle timeouts
  app.post("/api/dashboard/:companyId/courses/generate-async", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { topic, tone, audience, outline, referenceText } = req.body;

      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }

      const { remaining, resetAt } = await getGenerationLimit(req.user.id);
      if (remaining <= 0) {
        return res.status(429).json({
          error: "Daily generation limit reached",
          resetAt
        });
      }

      const jobId = randomUUID();
      generationJobs.set(jobId, {
        status: "pending",
        createdAt: Date.now(),
      });

      // Start generation in background
      (async () => {
        try {
          console.log(`[Job ${jobId}] Starting background generation for topic: ${topic}`);
          const result = await generateCourse(topic, { tone, audience, outline, referenceText });
          generationJobs.set(jobId, {
            status: "completed",
            result,
            createdAt: Date.now(),
          });
          console.log(`[Job ${jobId}] Background generation completed`);
        } catch (error: any) {
          console.error(`[Job ${jobId}] Background generation failed:`, error);
          generationJobs.set(jobId, {
            status: "failed",
            error: error.message || "Failed to generate course",
            createdAt: Date.now(),
          });
        }
      })();

      res.json({ jobId });
    } catch (error) {
      console.error("Async generation error:", error);
      res.status(500).json({ error: "Failed to initiate generation" });
    }
  });

  app.get("/api/dashboard/:companyId/courses/generate-status/:jobId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    const { jobId } = req.params;
    const job = generationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  });

  app.post("/api/dashboard/:companyId/courses/generate-image", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { courseTitle } = req.body;

      if (!courseTitle || typeof courseTitle !== "string") {
        return res.status(400).json({ error: "Course title is required" });
      }

      const imageDataUrl = await generateCourseImage(courseTitle);

      if (!imageDataUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      res.json({ imageDataUrl });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: "Failed to generate course image" });
    }
  });

  app.post("/api/generate-image-prompt", async (req: any, res: any) => {
    try {
      const { courseTitle } = req.body;

      if (!courseTitle || typeof courseTitle !== "string") {
        return res.status(400).json({ error: "Course title is required" });
      }

      const prompt = await generateImagePrompt(courseTitle);
      res.json({ prompt });
    } catch (error) {
      console.error("Prompt generation error:", error);
      res.status(500).json({ error: "Failed to generate image prompt" });
    }
  });

  app.post("/api/generate-course-image", async (req: any, res: any) => {
    try {
      const { courseTitle, prompt } = req.body;

      if (!courseTitle && !prompt) {
        return res.status(400).json({ error: "Course title or prompt is required" });
      }

      console.log("Generating course image for:", prompt || courseTitle);

      let imageUrl;
      if (prompt) {
        // Use prompt directly if provided (e.g. from BlockEditor)
        imageUrl = await generateCourseImageWithDeAPI(prompt);
      } else {
        // Generate prompt from course title first (legacy behavior/course creation)
        imageUrl = await generateCourseImage(courseTitle);
      }

      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      res.json({ imageUrl });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: "Failed to generate course image" });
    }
  });

  app.post("/api/dashboard/:companyId/generate-block-content", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { blockType, userPrompt, context } = req.body;
      if (!blockType || !context) {
        return res.status(400).json({ error: "Block type and context are required" });
      }

      const content = await generateBlockContent(blockType, userPrompt, context);
      res.json({ content });
    } catch (error) {
      console.error("Block content generation error:", error);
      res.status(500).json({ error: "Failed to generate block content" });
    }
  });

  app.post("/api/generate-course-media-plan", async (req: any, res: any) => {
    try {
      const { courseTitle, modules } = req.body;

      if (!courseTitle || !modules) {
        return res.status(400).json({ error: "Course title and modules are required" });
      }

      console.log("Generating media plan for course:", courseTitle);
      const mediaPlan = await generateCourseMediaPlan(courseTitle, modules);

      res.json({ mediaPlan });
    } catch (error) {
      console.error("Media plan generation error:", error);
      res.status(500).json({ error: "Failed to generate media plan" });
    }
  });

  app.post("/api/dashboard/:companyId/courses/:courseId/modules", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { title } = req.body;
      const { courseId } = req.params;

      const modules = await storage.getModulesByCourse(courseId);
      const newModule = await storage.createModule({
        courseId,
        title: title || `Module ${modules.length + 1}`,
        orderIndex: modules.length,
      });

      res.json(newModule);
    } catch (error) {
      res.status(500).json({ error: "Failed to create module" });
    }
  });

  app.post("/api/dashboard/:companyId/modules/:moduleId/lessons", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { title } = req.body;
      const { moduleId } = req.params;

      const lessons = await storage.getLessonsByModule(moduleId);
      const newLesson = await storage.createLesson({
        moduleId,
        title: title || `Lesson ${lessons.length + 1}`,
        content: "Start writing your content here...",
        orderIndex: lessons.length,
        media: [],
      });

      res.json(newLesson);
    } catch (error) {
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  app.post("/api/dashboard/:companyId/lessons/:lessonId/generate-image", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { lessonId } = req.params;
      const lesson = await storage.getLesson(lessonId);
      if (!lesson) return res.status(404).json({ error: "Lesson not found" });

      const module = await storage.getModule(lesson.moduleId);
      const course = await storage.getCourse(module?.courseId || "");

      const prompt = generateFallbackImagePrompt(
        course?.title || "Course",
        module?.title || "Module",
        lesson.title,
        lesson.content
      );

      const imageUrl = await generateLessonImage(prompt);
      if (!imageUrl) return res.status(500).json({ error: "Failed to generate image" });

      const updated = await storage.updateLesson(lessonId, {
        media: [
          ...lesson.media,
          {
            id: randomUUID(),
            type: "image",
            url: imageUrl,
            alt: lesson.title,
            placement: 0,
          }
        ]
      });

      res.json(updated);
    } catch (error) {
      console.error("Lesson image generation error:", error);
      res.status(500).json({ error: "Failed to generate lesson image" });
    }
  });

  app.post("/api/dashboard/:companyId/courses", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { generatedCourse, isFree, price, coverImage, generateLessonImages, generateVideo } = req.body;
      const companyId = req.params.companyId;

      const validated = generatedCourseSchema.safeParse(generatedCourse);
      if (!validated.success) {
        console.error("Course validation failed:", validated.error.format());
        return res.status(400).json({ error: "Invalid course data", details: validated.error.format() });
      }

      console.log(`Creating course: "${validated.data.course_title}" for user ${req.user.id}`);

      // Create course with "generating" status if lesson images will be generated
      const course = await storage.createCourse({
        creatorId: req.user.id,
        whopCompanyId: companyId,
        title: validated.data.course_title,
        description: validated.data.description || null,
        coverImage: coverImage || null,
        published: false,
        isFree: isFree === true,
        price: isFree === true ? "0" : (price || "0"),
        generationStatus: (generateLessonImages || generateVideo) ? "generating" : "complete",
      });
      // Use the optimized batch insertion method
      const createdLessons = await storage.createFullCourseStructure(course.id, validated.data);

      console.log(`Course foundation created: ${course.id}. Total modules: ${validated.data.modules.length}, lessons: ${createdLessons.length}`);

      // Return the course immediately - images will be generated in the background
      const courseWithModules = await storage.getCourseWithModules(course.id);

      if (!courseWithModules) {
        throw new Error("Failed to retrieve course after creation");
      }

      res.json(courseWithModules);
      console.log("Successfully sent course creation response to UI");

      // Generate lesson media (images/video) in the background if enabled
      if (generateLessonImages || generateVideo) {
        startBackgroundMediaGeneration({
          courseId: course.id,
          creatorId: req.user.id,
          companyId,
          courseTitle: validated.data.course_title,
          modules: validated.data.modules as any,
          generateLessonImages,
          generateVideo: !!generateVideo,
          createdLessons,
        });
      } else {
        console.log("Skipping lesson image generation (toggle disabled)");
      }
    } catch {

      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.get("/api/dashboard/:companyId/courses/:courseId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      console.log(`GET course: companyId=${req.params.companyId}, courseId=${req.params.courseId}`);
      const course = await storage.getCourseWithModules(req.params.courseId);

      if (!course) {
        console.warn(`Course not found in DB: ${req.params.courseId}`);
        return res.status(404).json({ error: "Course not found" });
      }

      const paramCompanyId = await resolveCompanyId(req.params.companyId);
      console.log(`Course found: "${course.title}". Owner: ${course.creatorId}, DB Company: ${course.whopCompanyId}, Resolved Param Company: ${paramCompanyId}`);
      console.log(`Current user: ${req.user?.id}`);

      if (course.creatorId !== req.user?.id || course.whopCompanyId !== paramCompanyId) {
        console.warn(`Permission denied: course.creatorId(${course.creatorId}) !== user.id(${req.user?.id}) OR course.whopCompanyId(${course.whopCompanyId}) !== paramCompanyId(${paramCompanyId})`);
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      res.json(course);
    } catch (error) {
      console.error("Failed to get course:", error);
      res.status(500).json({ error: "Failed to get course" });
    }
  });

  app.patch("/api/dashboard/:companyId/courses/:courseId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const course = await storage.getCourse(req.params.courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const paramCompanyId = await resolveCompanyId(req.params.companyId);
      if (course.creatorId !== req.user?.id || course.whopCompanyId !== paramCompanyId) {
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      const { title, description, published, isFree, price, coverImage } = req.body;

      const updated = await storage.updateCourse(course.id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(published !== undefined && { published }),
        ...(isFree !== undefined && { isFree }),
        ...(price !== undefined && { price }),
        ...(coverImage !== undefined && { coverImage }),
      });

      res.json(updated);
    } catch {

      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/dashboard/:companyId/courses/:courseId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const course = await storage.getCourse(req.params.courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const paramCompanyId = await resolveCompanyId(req.params.companyId);
      if (course.creatorId !== req.user?.id || course.whopCompanyId !== paramCompanyId) {
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      await storage.deleteCourse(course.id);
      res.json({ success: true });
    } catch {

      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  app.patch("/api/dashboard/:companyId/modules/:moduleId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const module = await storage.getModule(req.params.moduleId);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }

      const { title } = req.body;
      const updated = await storage.updateModule(module.id, { title });
      res.json(updated);
    } catch {

      res.status(500).json({ error: "Failed to update module" });
    }
  });

  app.delete("/api/dashboard/:companyId/modules/:moduleId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      await storage.deleteModule(req.params.moduleId);
      res.json({ success: true });
    } catch {

      res.status(500).json({ error: "Failed to delete module" });
    }
  });

  app.patch("/api/dashboard/:companyId/lessons/:lessonId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const { title, content, media } = req.body;
      const updated = await storage.updateLesson(lesson.id, {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(media !== undefined && { media }),
      });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to update lesson" });
    }
  });

  app.post("/api/dashboard/:companyId/modules/:moduleId/lessons", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { moduleId } = req.params;
      const { title, content } = req.body;

      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const lessons = await storage.getLessonsByModule(moduleId);
      const lesson = await storage.createLesson({
        moduleId,
        title,
        content: content || "",
        orderIndex: lessons.length,
      });

      res.json(lesson);
    } catch (error) {
      console.error("Failed to create lesson:", error);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  });

  app.post("/api/dashboard/:companyId/lessons/:lessonId/media", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const { type, url, alt, caption, placement } = req.body;

      if (!type || !url) {
        return res.status(400).json({ error: "Type and URL are required" });
      }

      const newMedia = {
        id: randomUUID(),
        type: type as "image" | "video",
        url,
        alt: alt || "",
        caption: caption || "",
        placement: placement ?? 0,
      };

      const updatedMedia = [...(lesson.media || []), newMedia];
      const updated = await storage.updateLesson(lesson.id, { media: updatedMedia });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to add media" });
    }
  });

  app.delete("/api/dashboard/:companyId/lessons/:lessonId/media/:mediaId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const updatedMedia = (lesson.media || []).filter(m => m.id !== req.params.mediaId);
      const updated = await storage.updateLesson(lesson.id, { media: updatedMedia });
      res.json(updated);
    } catch {
      res.status(500).json({ error: "Failed to remove media" });
    }
  });

  app.post("/api/dashboard/:companyId/lessons/:lessonId/generate-image", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const { prompt, alt, placement } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const imageUrl = await generateLessonImage(prompt);
      if (!imageUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      const newMedia = {
        id: randomUUID(),
        type: "image" as const,
        url: imageUrl,
        alt: alt || "",
        caption: "",
        placement: placement ?? 0,
        prompt: prompt, // Store the prompt for regeneration
      };

      const updatedMedia = [...(lesson.media || []), newMedia];
      const updated = await storage.updateLesson(lesson.id, { media: updatedMedia });
      res.json({ lesson: updated, generatedImage: newMedia });
    } catch {
      res.status(500).json({ error: "Failed to generate image" });
    }
  });

  // Regenerate image using DeAPI (Fix with AI)
  app.post("/api/dashboard/:companyId/lessons/:lessonId/media/:mediaId/regenerate", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);
      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const mediaItem = (lesson.media || []).find(m => m.id === req.params.mediaId);
      if (!mediaItem) {
        return res.status(404).json({ error: "Media not found" });
      }

      if (mediaItem.type !== "image") {
        return res.status(400).json({ error: "Can only regenerate images" });
      }

      // Get prompt from media item or request body
      const prompt = req.body.prompt || mediaItem.prompt;
      if (!prompt) {
        return res.status(400).json({ error: "No prompt available for regeneration. This image may have been added manually." });
      }

      console.log("Regenerating image with DeAPI, prompt:", prompt);
      const newImageUrl = await generateLessonImage(prompt);

      if (!newImageUrl) {
        return res.status(500).json({ error: "Failed to regenerate image" });
      }

      // Update the media item with the new URL
      const updatedMedia = (lesson.media || []).map(m =>
        m.id === req.params.mediaId
          ? { ...m, url: newImageUrl }
          : m
      );

      const updated = await storage.updateLesson(lesson.id, { media: updatedMedia });
      res.json({ lesson: updated, regeneratedMedia: updatedMedia.find(m => m.id === req.params.mediaId) });
    } catch (error) {
      console.error("Failed to regenerate image:", error);
      res.status(500).json({ error: "Failed to regenerate image" });
    }
  });

  app.delete("/api/dashboard/:companyId/lessons/:lessonId", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      await storage.deleteLesson(req.params.lessonId);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete lesson" });
    }
  });

  // Quiz routes
  app.post("/api/dashboard/:companyId/modules/:moduleId/quiz/generate", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { moduleId } = req.params;
      const module = await storage.getModule(moduleId);
      if (!module) return res.status(404).json({ error: "Module not found" });

      const lessons = await storage.getLessonsByModule(moduleId);
      const lessonsContext = lessons.map(l => `${l.title}: ${l.content}`).join("\n\n");

      console.log(`Generating quiz for module: ${module.title}`);
      const quizData = await generateQuiz(module.title, lessonsContext);

      // Delete existing quiz if any
      const existingQuiz = await storage.getQuizByModule(moduleId);
      if (existingQuiz) {
        await storage.deleteQuiz(existingQuiz.id);
      }

      const quiz = await storage.createQuiz({
        moduleId,
        title: quizData.title,
        questions: quizData.questions.map(q => ({
          id: randomUUID(),
          ...q
        }))
      });

      res.json(quiz);
    } catch (error) {
      console.error("Quiz generation error:", error);
      res.status(500).json({ error: "Failed to generate quiz" });
    }
  });

  app.patch("/api/dashboard/:companyId/quizzes/:id", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { id } = req.params;
      const quiz = await storage.updateQuiz(id, req.body);
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: "Failed to update quiz" });
    }
  });

  app.delete("/api/dashboard/:companyId/quizzes/:id", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const { id } = req.params;
      await storage.deleteQuiz(id);
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete quiz" });
    }
  });

  app.get("/api/dashboard/:companyId/courses/:courseId/analytics", authenticateWhop, requireAdmin, async (req: AuthenticatedRequest, res: any) => {
    try {
      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const paramCompanyId = await resolveCompanyId(req.params.companyId);
      if (course.creatorId !== req.user?.id || course.whopCompanyId !== paramCompanyId) {
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      const [access, payments] = await Promise.all([
        storage.getCourseAccessByCourse(course.id),
        storage.getPaymentsByCourse(course.id),
      ]);

      const paymentsByUser = new Map(payments.map(p => [p.buyerId, p]));
      const totalEarnings = payments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || "0"), 0);

      // Fetch profile pictures from Whop for users who don't have them
      const studentsWithPics = await Promise.all(
        access.map(async (a) => {
          const payment = paymentsByUser.get(a.user.id);
          let profilePicUrl = a.user.profilePicUrl;

          // If no profile pic stored, try to fetch from Whop
          if (!profilePicUrl && a.user.whopUserId) {
            try {
              const whopUserData = await getWhopUser(a.user.whopUserId);
              if (whopUserData?.profile_picture?.url) {
                profilePicUrl = whopUserData.profile_picture.url;
                // Update in storage for future requests
                await storage.updateUser(a.user.id, { profilePicUrl });
              }
            } catch {
              // Ignore errors fetching profile pic
            }
          }

          return {
            id: a.user.id,
            username: a.user.username,
            email: a.user.email,
            profilePicUrl,
            grantedAt: a.grantedAt,
            purchasedViaWhop: a.purchasedViaWhop,
            paidAmount: payment?.amount || null,
            paidAt: payment?.completedAt || null,
          };
        })
      );

      res.json({
        course,
        students: studentsWithPics,
        totalStudents: access.length,
        totalEarnings: totalEarnings.toFixed(2),
        paidStudents: payments.length,
      });
    } catch {

      res.status(500).json({ error: "Failed to get analytics" });
    }
  });

  app.get("/api/experiences/:experienceId", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res) => {
    try {
      const isAdmin = req.accessLevel === "admin";

      if (isAdmin && req.user) {
        // Admin view - show all courses with management stats
        // Set the admin's company ID if not already set
        const companyId = await getCompanyIdFromExperience(req.params.experienceId);
        if (companyId && !req.user.whopCompanyId) {
          await storage.updateUser(req.user.id, {
            role: "creator",
            whopCompanyId: companyId
          });
          req.user = await storage.getUser(req.user.id);
        } else if (req.user.role !== "creator") {
          await storage.updateUser(req.user.id, { role: "creator" });
          req.user = await storage.getUser(req.user.id);
        }

        // Re-assert user exists for TypeScript after the conditional blocks
        if (!req.user) {
          return res.status(401).json({ error: "User not found" });
        }

        const userId = req.user.id;
        const courses = await storage.getCoursesByCreator(userId, companyId || "");
        const coursesWithStats = await Promise.all(
          courses.map(async (course) => {
            const courseWithModules = await storage.getCourseWithModules(course.id);
            const access = await storage.getCourseAccessByCourse(course.id);
            return {
              ...course,
              moduleCount: courseWithModules?.modules.length || 0,
              lessonCount: courseWithModules?.modules.reduce((acc: number, m: any) => acc + m.lessons.length, 0) || 0,
              studentCount: access.length,
              hasAccess: true,
            };
          })
        );

        // For admin users (platform owners), use adminBalance
        // For creator users (course creators), use CreatorEarnings
        let earnings;
        if (req.user.role === "admin" && req.user.adminBalance) {
          earnings = {
            totalEarnings: req.user.adminBalance.totalEarnings,
            availableBalance: req.user.adminBalance.availableBalance,
            pendingBalance: 0, // Admin balance doesn't have pending balance
          };
        } else {
          const creatorEarnings = await storage.getCreatorEarnings(userId);
          earnings = creatorEarnings ? {
            totalEarnings: creatorEarnings.totalEarnings,
            availableBalance: creatorEarnings.availableBalance,
            pendingBalance: creatorEarnings.pendingBalance,
          } : {
            totalEarnings: 0,
            availableBalance: 0,
            pendingBalance: 0,
          };
        }

        res.json({
          user: req.user,
          courses: coursesWithStats,
          experienceId: req.params.experienceId,
          accessLevel: req.accessLevel,
          earnings,
          generationLimit: await getGenerationLimit(req.user.id),
        });
      } else {
        // Customer view - show published courses + unpublished courses user has access to
        // Only show courses from this admin's company, not from all admins
        const companyId = await getCompanyIdFromExperience(req.params.experienceId);
        if (!companyId) {
          return res.status(400).json({ error: "Invalid experience" });
        }

        // Update user's company ID if they're a customer and don't have it set
        if (req.user && !req.user.whopCompanyId) {
          await storage.updateUser(req.user.id, { whopCompanyId: companyId });
          req.user = await storage.getUser(req.user.id);
        }

        const publishedCourses = await storage.getPublishedCoursesByCompany(companyId);

        // Get courses user has access to (including unpublished ones they already paid for)
        const userAccessRecords = req.user ? await storage.getCourseAccessByUser(req.user.id) : [];

        // Filter out access records for courses that still exist
        const validAccessRecords = [];
        for (const access of userAccessRecords) {
          const course = await storage.getCourse(access.courseId);
          if (course) {
            validAccessRecords.push(access);
          }
        }
        const accessedCourseIds = new Set(validAccessRecords.map(a => a.courseId));

        // Get unpublished courses user has access to (only those that still exist)
        const unpublishedAccessedCourses = await Promise.all(
          validAccessRecords
            .filter(a => !publishedCourses.some(c => c.id === a.courseId))
            .map(async (access) => {
              const course = await storage.getCourse(access.courseId);
              return course;
            })
        );

        // Combine published courses with unpublished ones user has access to
        const allVisibleCourses = [
          ...publishedCourses,
          ...unpublishedAccessedCourses.filter((c): c is NonNullable<typeof c> => c !== null),
        ];

        const coursesWithAccess = await Promise.all(
          allVisibleCourses.map(async (course) => {
            const courseWithModules = await storage.getCourseWithModules(course.id);
            const hasAccess = accessedCourseIds.has(course.id);

            return {
              ...course,
              moduleCount: courseWithModules?.modules.length || 0,
              lessonCount: courseWithModules?.modules.reduce((acc, m) => acc + m.lessons.length, 0) || 0,
              hasAccess,
            };
          })
        );

        res.json({
          user: req.user,
          courses: coursesWithAccess,
          experienceId: req.params.experienceId,
          accessLevel: req.accessLevel,
          generationLimit: req.user ? await getGenerationLimit(req.user.id) : null,
        });
      }
    } catch {

      res.status(500).json({ error: "Failed to load courses" });
    }
  });

  // Admin routes for experience context
  app.post("/api/experiences/:experienceId/courses/generate", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { topic, tone, audience, outline, referenceText } = req.body;
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }

      const { remaining, resetAt } = await getGenerationLimit(req.user.id);
      if (remaining <= 0) {
        return res.status(429).json({
          error: "Daily generation limit reached",
          resetAt
        });
      }

      const generatedCourse = await generateCourse(topic, { tone, audience, outline, referenceText });
      res.json(generatedCourse);
    } catch {

      res.status(500).json({ error: "Failed to generate course" });
    }
  });

  // Async version for experiences to handle timeouts
  app.post("/api/experiences/:experienceId/courses/generate-async", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { topic, tone, audience, outline, referenceText } = req.body;
      if (!topic || typeof topic !== "string") {
        return res.status(400).json({ error: "Topic is required" });
      }

      const { remaining, resetAt } = await getGenerationLimit(req.user.id);
      if (remaining <= 0) {
        return res.status(429).json({
          error: "Daily generation limit reached",
          resetAt
        });
      }

      const jobId = randomUUID();
      generationJobs.set(jobId, {
        status: "pending",
        createdAt: Date.now(),
      });

      // Start generation in background
      (async () => {
        try {
          console.log(`[Job ${jobId}] Starting background generation for topic: ${topic}`);
          const result = await generateCourse(topic, { tone, audience, outline, referenceText });
          generationJobs.set(jobId, {
            status: "completed",
            result,
            createdAt: Date.now(),
          });
          console.log(`[Job ${jobId}] Background generation completed`);
        } catch (error: any) {
          console.error(`[Job ${jobId}] Background generation failed:`, error);
          generationJobs.set(jobId, {
            status: "failed",
            error: error.message || "Failed to generate course",
            createdAt: Date.now(),
          });
        }
      })();

      res.json({ jobId });
    } catch (error) {
      console.error("Async generation error:", error);
      res.status(500).json({ error: "Failed to initiate generation" });
    }
  });

  app.get("/api/experiences/:experienceId/courses/generate-status/:jobId", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    const { jobId } = req.params;
    const job = generationJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json(job);
  });


  app.post("/api/experiences/:experienceId/courses/generate-image", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { courseTitle } = req.body;

      if (!courseTitle || typeof courseTitle !== "string") {
        return res.status(400).json({ error: "Course title is required" });
      }

      const imageDataUrl = await generateCourseImage(courseTitle);

      if (!imageDataUrl) {
        return res.status(500).json({ error: "Failed to generate image" });
      }

      res.json({ imageDataUrl });
    } catch (error) {
      console.error("Image generation error:", error);
      res.status(500).json({ error: "Failed to generate course image" });
    }
  });

  app.post("/api/experiences/:experienceId/withdraw-request", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { amount } = req.body;
      const requestedAmount = amount ? parseFloat(amount) : null;

      if (requestedAmount !== null && (isNaN(requestedAmount) || requestedAmount <= 0)) {
        return res.status(400).json({ error: "Invalid withdrawal amount" });
      }

      // For admin users, use adminBalance; for creators, use CreatorEarnings
      let availableBalance: number;
      let totalEarnings: number;

      if (req.user.role === "admin" && req.user.adminBalance) {
        availableBalance = req.user.adminBalance.availableBalance;
        totalEarnings = req.user.adminBalance.totalEarnings;
      } else {
        const earnings = await storage.getCreatorEarnings(req.user.id);
        if (!earnings) {
          return res.status(400).json({ error: "No earnings found" });
        }
        availableBalance = earnings.availableBalance;
        totalEarnings = earnings.totalEarnings;
      }

      if (availableBalance <= 0) {
        return res.status(400).json({ error: "No available balance to withdraw" });
      }

      const withdrawAmount = requestedAmount !== null ? requestedAmount : availableBalance;

      if (withdrawAmount > availableBalance) {
        return res.status(400).json({ error: "Withdrawal amount exceeds available balance" });
      }

      // Deduct the amount
      if (req.user.role === "admin") {
        await storage.deductAdminEarnings(req.user.id, withdrawAmount);
      } else {
        await storage.deductCreatorEarnings(req.user.id, withdrawAmount);
      }

      const adminName = req.user.username || req.user.email || "Unknown Admin";

      await sendWithdrawRequestEmail({
        adminName,
        adminEmail: req.user.email,
        adminUsername: req.user.username,
        whopUserId: req.user.whopUserId,
        amount: withdrawAmount,
        availableBalance: availableBalance - withdrawAmount,
        totalEarnings,
      });

      res.json({
        success: true,
        message: "Withdraw request sent successfully",
        amount: withdrawAmount,
      });
    } catch (error) {
      console.error("Failed to process withdraw request:", error);
      res.status(500).json({ error: "Failed to send withdraw request" });
    }
  });

  app.post("/api/experiences/:experienceId/courses", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      // Ensure user is marked as creator and has company ID set
      const companyId = await getCompanyIdFromExperience(req.params.experienceId);
      if (companyId && (!req.user.whopCompanyId || req.user.role !== "creator")) {
        await storage.updateUser(req.user.id, {
          role: "creator",
          whopCompanyId: companyId
        });
        req.user = await storage.getUser(req.user.id);
      }

      const { generatedCourse, isFree, price, coverImage, generateLessonImages, generateVideo } = req.body;
      console.log(`[Experience Save] Creating course for user ${req.user.id}, experience: ${req.params.experienceId}, title: ${generatedCourse?.course_title}`);

      const validated = generatedCourseSchema.safeParse(generatedCourse);
      if (!validated.success) {
        console.error("[Experience Save] Course validation failed:", validated.error.format());
        return res.status(400).json({ error: "Invalid course data", details: validated.error.format() });
      }

      // Create course with "generating" status if lesson images will be generated
      console.log(`[Experience Save] Saving course to DB with companyId: ${companyId || "(empty)"}`);
      const course = await storage.createCourse({
        creatorId: req.user!.id,
        whopCompanyId: companyId || "",
        title: validated.data.course_title,
        description: validated.data.description || null,
        coverImage: coverImage || null,
        published: false,
        isFree: isFree === true,
        price: isFree === true ? "0" : (price || "0"),
        generationStatus: (generateLessonImages || generateVideo) ? "generating" : "complete",
      });
      console.log(`[Experience Save] Course created in DB: ${course.id}`);

      // Use the optimized batch insertion method
      const createdLessons = await storage.createFullCourseStructure(course.id, validated.data);

      console.log(`[Experience Save] Course foundation created: ${course.id}. Total modules: ${validated.data.modules.length}, lessons: ${createdLessons.length}`);

      // Return the course immediately - images will be generated in the background
      const courseWithModules = await storage.getCourseWithModules(course.id);
      if (!courseWithModules) {
        throw new Error("Failed to retrieve course after creation");
      }

      res.json(courseWithModules);
      console.log("[Experience Save] Successfully sent course creation response to UI");

      // Generate lesson media (images/video) in the background if enabled
      if (generateLessonImages || generateVideo) {
        startBackgroundMediaGeneration({
          courseId: course.id,
          creatorId: req.user.id,
          companyId: companyId || "",
          experienceId: req.params.experienceId,
          courseTitle: validated.data.course_title,
          modules: validated.data.modules as any,
          generateLessonImages: !!generateLessonImages,
          generateVideo: !!generateVideo,
          createdLessons,
        });
      } else {
        console.log("Skipping lesson media generation (toggle disabled)");
      }
    } catch {

      res.status(500).json({ error: "Failed to create course" });
    }
  });

  app.patch("/api/experiences/:experienceId/courses/:courseId", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const companyId = await getCompanyIdFromExperience(req.params.experienceId);
      if (course.creatorId !== req.user?.id || course.whopCompanyId !== companyId) {
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      const { title, description, published, isFree, price } = req.body;

      const updated = await storage.updateCourse(course.id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(published !== undefined && { published }),
        ...(isFree !== undefined && { isFree }),
        ...(price !== undefined && { price }),
      });

      res.json(updated);
    } catch {

      res.status(500).json({ error: "Failed to update course" });
    }
  });

  app.delete("/api/experiences/:experienceId/courses/:courseId", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (req.accessLevel !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const companyId = await getCompanyIdFromExperience(req.params.experienceId);
      if (course.creatorId !== req.user?.id || course.whopCompanyId !== companyId) {
        return res.status(403).json({ error: "Access denied or course not found in this company" });
      }

      await storage.deleteCourse(course.id);
      res.json({ success: true });
    } catch {

      res.status(500).json({ error: "Failed to delete course" });
    }
  });

  app.get("/api/experiences/:experienceId/courses/:courseId", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      const course = await storage.getCourseWithModules(req.params.courseId);

      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      const accessRecord = req.user && await storage.getCourseAccess(course.id, req.user.id);

      // If course is unpublished, only allow users who already have access (paid/enrolled)
      if (!course.published && !accessRecord) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (!accessRecord) {
        return res.status(403).json({
          error: course.isFree ? "Enrollment required" : "Purchase required",
          course: {
            id: course.id,
            title: course.title,
            description: course.description,
            price: course.price,
            isFree: course.isFree,
            moduleCount: course.modules.length,
            lessonCount: course.modules.reduce((acc, m) => acc + m.lessons.length, 0),
          }
        });
      }

      res.json(course);
    } catch {

      res.status(500).json({ error: "Failed to get course" });
    }
  });

  app.post("/api/experiences/:experienceId/courses/:courseId/access", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (course.isFree) {
        const existing = await storage.getCourseAccess(course.id, req.user.id);
        if (!existing) {
          await storage.grantCourseAccess({
            courseId: course.id,
            userId: req.user.id,
            purchasedViaWhop: false,
          });
        }
        return res.json({ success: true, accessGranted: true });
      }

      res.json({
        success: false,
        requiresPurchase: true,
        price: course.price
      });
    } catch {

      res.status(500).json({ error: "Failed to grant access" });
    }
  });

  interface WordTiming {
    word: string;
    startTime: number;
    endTime: number;
  }

  const ttsCache = new Map<string, {
    audioBase64: string;
    duration: number;
    wordTimings: WordTiming[];
    timestamp: number;
  }>();
  const TTS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

  app.post("/api/experiences/:experienceId/lessons/:lessonId/tts", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      const lesson = await storage.getLesson(req.params.lessonId);

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const cacheKey = `${req.params.lessonId}-${req.body.voiceId || 'default'}`;
      const cached = ttsCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < TTS_CACHE_TTL) {
        return res.json({
          audioBase64: cached.audioBase64,
          duration: cached.duration,
          wordTimings: cached.wordTimings,
        });
      }

      const ttsResult = await generateTTS({
        text: lesson.content,
        voiceId: req.body.voiceId,
      });

      ttsCache.set(cacheKey, {
        audioBase64: ttsResult.audioBase64,
        duration: ttsResult.duration,
        wordTimings: ttsResult.wordTimings,
        timestamp: Date.now(),
      });

      res.json(ttsResult);
    } catch (error: any) {
      console.error("TTS generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate TTS" });
    }
  });

  // Create checkout for paid course
  app.post("/api/experiences/:experienceId/courses/:courseId/checkout", authenticateWhop, requireExperienceAccess, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const course = await storage.getCourse(req.params.courseId);
      if (!course) {
        return res.status(404).json({ error: "Course not found" });
      }

      if (course.isFree) {
        return res.status(400).json({ error: "This course is free, use the access endpoint instead" });
      }

      // Check if already has access
      const existing = await storage.getCourseAccess(course.id, req.user.id);
      if (existing) {
        return res.status(400).json({ error: "You already have access to this course" });
      }

      const price = course.price ? parseFloat(course.price) : 0;

      const checkoutResult = await createCheckoutConfiguration(
        price,
        {
          courseId: course.id,
          buyerId: req.user.id,
          creatorId: course.creatorId,
        }
      );

      if (!checkoutResult) {
        return res.status(500).json({ error: "Failed to create checkout" });
      }

      // Store the payment record
      await storage.createPayment({
        courseId: course.id,
        buyerId: req.user.id,
        creatorId: course.creatorId,
        amount: parseFloat(course.price || "0"),
        whopCheckoutId: checkoutResult.checkoutId,
        status: "pending",
      });

      res.json({ checkoutId: checkoutResult.checkoutId });
    } catch (error) {
      console.error("Checkout creation error:", error);
      res.status(500).json({ error: "Failed to create checkout" });
    }
  });

  // Payment verification endpoint (Option 2 - called from frontend onComplete)
  app.post("/api/payments/:checkoutId/verify", authenticateWhop, async (req: AuthenticatedRequest, res: any) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "User not found" });
      }

      const { checkoutId } = req.params;
      const { paymentId } = req.body;

      // Look up the payment record we created
      const payment = await storage.getPaymentByCheckoutId(checkoutId);

      if (!payment) {
        return res.status(404).json({ error: "Payment record not found" });
      }

      // Verify the payment belongs to this user
      if (payment.buyerId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // If already completed, return success
      if (payment.status === "completed") {
        return res.json({ success: true, message: "Payment already processed" });
      }

      // The onComplete callback from Whop is triggered when payment succeeds
      // So if we reach here with a paymentId, the payment was successful
      if (paymentId) {
        // Grant course access
        const existing = await storage.getCourseAccess(payment.courseId, payment.buyerId);
        if (!existing) {
          await storage.grantCourseAccess({
            courseId: payment.courseId,
            userId: payment.buyerId,
            purchasedViaWhop: true,
          });
        }

        // Update payment status
        await storage.updatePaymentStatus(payment.id, "completed", paymentId);

        // Add creator earnings (55% to creator, 45% platform fee)
        // TODO: Platform fee percentage can be made configurable in the future
        const CREATOR_PERCENTAGE = 0.55; // Creator gets 55%, platform keeps 45%
        const PLATFORM_PERCENTAGE = 0.45; // Platform gets 45%
        const totalAmount = Number(payment.amount);
        const creatorEarnings = totalAmount * CREATOR_PERCENTAGE;
        const platformEarnings = totalAmount * PLATFORM_PERCENTAGE;
        await storage.addCreatorEarnings(payment.creatorId, creatorEarnings);
        await storage.addAdminEarnings(platformEarnings);

        console.log(`Payment verified and completed: course ${payment.courseId} for buyer ${payment.buyerId}, creator earnings: ${creatorEarnings.toFixed(2)} (55% of ${totalAmount.toFixed(2)}), platform earnings: ${platformEarnings.toFixed(2)} (45%)`);
        return res.json({ success: true, message: "Payment verified and access granted" });
      }

      // Fallback: verify payment status with Whop API
      const verifyResult = await verifyPaymentComplete(checkoutId);

      if (verifyResult.success) {
        // Grant course access
        const existing = await storage.getCourseAccess(payment.courseId, payment.buyerId);
        if (!existing) {
          await storage.grantCourseAccess({
            courseId: payment.courseId,
            userId: payment.buyerId,
            purchasedViaWhop: true,
          });
        }

        // Update payment status
        await storage.updatePaymentStatus(payment.id, "completed", verifyResult.paymentId);

        // Add creator earnings (55% to creator, 45% platform fee)
        // TODO: Platform fee percentage can be made configurable in the future
        const CREATOR_PERCENTAGE_API = 0.55; // Creator gets 55%, platform keeps 45%
        const PLATFORM_PERCENTAGE_API = 0.45; // Platform gets 45%
        const totalAmountApi = Number(payment.amount);
        const creatorEarningsApi = totalAmountApi * CREATOR_PERCENTAGE_API;
        const platformEarningsApi = totalAmountApi * PLATFORM_PERCENTAGE_API;
        await storage.addCreatorEarnings(payment.creatorId, creatorEarningsApi);
        await storage.addAdminEarnings(platformEarningsApi);

        console.log(`Payment verified via API: course ${payment.courseId} for buyer ${payment.buyerId}, creator earnings: ${creatorEarningsApi.toFixed(2)} (55% of ${totalAmountApi.toFixed(2)}), platform earnings: ${platformEarningsApi.toFixed(2)} (45%)`);
        return res.json({ success: true, message: "Payment verified and access granted" });
      }

      return res.status(400).json({ error: "Payment not yet completed" });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
    }
  });

  return httpServer;
}
