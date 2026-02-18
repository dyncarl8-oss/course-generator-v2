import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, ChevronRight, Lightbulb, Code, Camera, Palette, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GenerationProgress } from "@/components/generation-progress";
import type { GeneratedCourse } from "@shared/schema";

interface CourseGeneratorProps {
  companyId: string;
  onGenerated: (course: GeneratedCourse) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  apiBasePath?: string;
}

const exampleTopics = [
  { icon: Code, label: "Python Basics", topic: "Python Programming for Complete Beginners" },
  { icon: Camera, label: "Photography", topic: "Digital Photography Fundamentals" },
  { icon: TrendingUp, label: "Marketing", topic: "Social Media Marketing Strategy" },
  { icon: Palette, label: "Design", topic: "UI/UX Design Principles" },
];

export function CourseGenerator({ companyId, onGenerated, isGenerating, setIsGenerating, apiBasePath }: CourseGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const { toast } = useToast();

  const basePath = apiBasePath || `/api/dashboard/${companyId}`;

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for your course.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setIsGenerationComplete(false);
    try {
      // Step 1: Start async generation job
      const startResponse = await fetch(`${basePath}/courses/generate-async`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!startResponse.ok) {
        if (startResponse.status === 403) {
          throw new Error("Permission denied. Please refresh or check your account permissions.");
        }
        throw new Error("Failed to start course generation. Please try again.");
      }

      const { jobId } = await startResponse.json();

      // Step 2: Poll for completion
      const POLL_INTERVAL = 3000; // 3 seconds
      const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes max
      const startTime = Date.now();

      const pollForResult = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          const poll = async () => {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              reject(new Error("Generation timed out. The AI is taking too long. Please try again."));
              return;
            }

            try {
              const statusResponse = await fetch(`${basePath}/courses/generate-status/${jobId}`, {
                credentials: "include",
              });

              if (!statusResponse.ok) {
                reject(new Error("Failed to check generation status."));
                return;
              }

              const job = await statusResponse.json();

              if (job.status === "completed") {
                resolve(job.result);
                return;
              }

              if (job.status === "failed") {
                reject(new Error(job.error || "Course generation failed. Please try again."));
                return;
              }

              // Still pending, poll again
              setTimeout(poll, POLL_INTERVAL);
            } catch (err) {
              // Network error during polling — retry silently
              setTimeout(poll, POLL_INTERVAL);
            }
          };

          poll();
        });
      };

      const generatedCourse = await pollForResult();
      setIsGenerationComplete(true);
      onGenerated(generatedCourse);
      toast({
        title: "Course generated!",
        description: "Review and customize your course below.",
      });
    } catch (error: any) {
      console.error("Generation error:", error);
      setIsGenerating(false);
      setIsGenerationComplete(false);

      toast({
        title: "Generation failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="card-course-generator">
      {!isGenerating && (
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/20 dark:to-primary/10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Create Course</h2>
            <p className="text-muted-foreground mt-1">
              Enter a topic and AI will generate a complete curriculum
            </p>
          </div>
        </div>
      )}

      {isGenerating && topic ? (
        <GenerationProgress topic={topic} isComplete={isGenerationComplete} />
      ) : (
        <Card>
          <CardContent className="p-5 space-y-5">
            <div className="space-y-3">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                What would you like to teach?
              </label>
              <Textarea
                placeholder="e.g., 'Complete Guide to Machine Learning', 'Mastering Watercolor Painting'"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="min-h-28 text-base resize-none"
                disabled={isGenerating}
                data-testid="input-course-topic"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try one of these ideas:</p>
              <div className="flex flex-wrap gap-2">
                {exampleTopics.map((example) => (
                  <button
                    key={example.label}
                    onClick={() => setTopic(example.topic)}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-muted/50 hover-elevate transition-colors disabled:opacity-50"
                    data-testid={`button-example-${example.label.toLowerCase()}`}
                  >
                    <example.icon className="h-3 w-3" />
                    {example.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full"
              size="lg"
              data-testid="button-generate-course"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating curriculum...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Generate Course
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Be specific for better results. You can edit everything after generation.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CoursePreviewProps {
  course: GeneratedCourse;
  onSave: (options: { isFree: boolean; price: string; generateLessonImages: boolean }) => void;
  onDiscard: () => void;
  isSaving: boolean;
  savingStatus?: string;
}

export function CoursePreview({ course, onSave, onDiscard, isSaving, savingStatus }: CoursePreviewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("29.99");
  const [generateLessonImages, setGenerateLessonImages] = useState(true);

  const toggleModule = (index: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedModules(newExpanded);
  };

  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);

  return (
    <Card data-testid="card-course-preview">
      <CardHeader className="pb-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <CardTitle className="text-xl leading-tight" data-testid="text-preview-title">
              {course.course_title}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0 bg-muted/50 px-3 py-1.5 rounded-full">
              <BookOpen className="h-4 w-4" />
              <span>{course.modules.length} modules, {totalLessons} lessons</span>
            </div>
          </div>
          {course.description && (
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-preview-description">
              {course.description}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2" data-testid="container-modules-preview">
          {course.modules.map((module, moduleIndex) => (
            <div
              key={moduleIndex}
              className="border rounded-lg overflow-hidden bg-card"
            >
              <button
                onClick={() => toggleModule(moduleIndex)}
                className="w-full flex items-center justify-between p-4 text-left hover-elevate transition-colors gap-3"
                data-testid={`button-module-toggle-${moduleIndex}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                    {moduleIndex + 1}
                  </span>
                  <span className="text-sm font-medium">{module.module_title}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground shrink-0">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{module.lessons.length} lessons</span>
                  <ChevronRight
                    className={`h-4 w-4 transition-transform duration-200 ${expandedModules.has(moduleIndex) ? "rotate-90" : ""
                      }`}
                  />
                </div>
              </button>
              {expandedModules.has(moduleIndex) && (
                <div className="bg-muted/30 px-4 pb-4 border-t">
                  <ul className="space-y-2 ml-10 pt-3">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li
                        key={lessonIndex}
                        className="flex items-center gap-3 text-sm text-muted-foreground py-1.5"
                        data-testid={`text-lesson-${moduleIndex}-${lessonIndex}`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-medium shrink-0">
                          {lessonIndex + 1}
                        </span>
                        <span>{lesson.lesson_title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pricing</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="free-toggle" className="text-sm font-medium">
                Offer for free
              </Label>
              <p className="text-xs text-muted-foreground">
                {isFree ? "Students can access this course for free" : "Set a price for your course"}
              </p>
            </div>
            <Switch
              id="free-toggle"
              checked={isFree}
              onCheckedChange={setIsFree}
              data-testid="switch-free-course"
            />
          </div>

          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price-input" className="text-sm font-medium">
                Course Price (USD)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="pl-9"
                  placeholder="29.99"
                  data-testid="input-course-price"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">AI Enhancements</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="images-toggle" className="text-sm font-medium">
                Auto-generate lesson images
              </Label>
              <p className="text-xs text-muted-foreground">
                {generateLessonImages
                  ? "AI will add relevant images to lessons (takes longer)"
                  : "Skip image generation for faster course creation"}
              </p>
            </div>
            <Switch
              id="images-toggle"
              checked={generateLessonImages}
              onCheckedChange={setGenerateLessonImages}
              data-testid="switch-generate-images"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => onSave({ isFree, price: isFree ? "0" : price, generateLessonImages })}
            disabled={isSaving || (!isFree && (!price || parseFloat(price) < 0))}
            className="flex-1"
            size="lg"
            data-testid="button-save-course"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {savingStatus || "Finalizing course..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Finalize Course
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            size="lg"
            data-testid="button-discard-course"
          >
            Discard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          You can always edit the content, pricing, and settings later.
        </p>
      </CardContent>
    </Card>
  );
}
