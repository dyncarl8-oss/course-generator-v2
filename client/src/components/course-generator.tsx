import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Sparkles, BookOpen, ChevronRight, Lightbulb, Code, Camera, Palette, TrendingUp, DollarSign, Upload, FileText, User, MessageSquare, Book, PenTool, Layout } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GenerationProgress } from "@/components/generation-progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { GeneratedCourse } from "@shared/schema";

interface CourseGeneratorProps {
  companyId: string;
  onGenerated: (course: GeneratedCourse) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  apiBasePath?: string;
  generationLimit?: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
  };
}

const exampleTopics = [
  { icon: Code, label: "Python Basics", topic: "Python Programming for Complete Beginners" },
  { icon: Camera, label: "Photography", topic: "Digital Photography Fundamentals" },
  { icon: TrendingUp, label: "Marketing", topic: "Social Media Marketing Strategy" },
  { icon: Palette, label: "Design", topic: "UI/UX Design Principles" },
];

export function CourseGenerator({
  companyId,
  onGenerated,
  isGenerating,
  setIsGenerating,
  apiBasePath,
  generationLimit
}: CourseGeneratorProps) {
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"magic" | "guided" | "scratch">("magic");

  // Guided options
  const [tone, setTone] = useState("Professional");
  const [audience, setAudience] = useState("");
  const [outline, setOutline] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [fileName, setFileName] = useState("");

  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const { toast } = useToast();

  const basePath = apiBasePath || `/api/dashboard/${companyId}`;

  const formatResetTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('default', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch (e) {
      return "midnight UTC";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsExtracting(true);

    const formData = new FormData();
    formData.append("document", file);

    try {
      const response = await fetch("/api/extract-document-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to extract text");

      const { text } = await response.json();
      setReferenceText(text);

      // NEW: Automatically analyze document metadata
      try {
        toast({
          title: "Analyzing document...",
          description: "Generating recommended title and audience...",
        });

        const analysisResponse = await fetch("/api/analyze-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          if (analysis.title) setTopic(analysis.title);
          if (analysis.audience) setAudience(analysis.audience);
          if (analysis.tone) setTone(analysis.tone);
          if (analysis.outline) setOutline(analysis.outline);

          setMode("guided"); // Switch to guided mode to show the results

          toast({
            title: "Analysis complete",
            description: "Suggested title, audience, and tone have been auto-filled!",
          });
        }
      } catch (analyzeErr) {
        console.warn("Auto-analysis failed:", analyzeErr);
      }

      toast({
        title: "Reference attached",
        description: `Successfully extracted text from ${file.name}`,
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: "Could not read the file. Please try a standard PDF or TXT file.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (mode !== "scratch" && !topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for your course.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "scratch") {
      // Direct manual creation bypasses AI
      const emptyCourse: GeneratedCourse = {
        course_title: topic.trim() || "Untitled Course",
        description: "Manually created course.",
        modules: [{
          module_title: "Module 1",
          lessons: [{
            lesson_title: "Lesson 1",
            content: "Start writing your content here..."
          }],
          quiz: {
            title: "Module 1 Quiz",
            questions: []
          }
        }]
      };
      onGenerated(emptyCourse);
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
        body: JSON.stringify({
          topic: topic.trim(),
          tone: mode === "guided" ? tone : undefined,
          audience: mode === "guided" ? audience : undefined,
          outline: mode === "guided" ? outline : undefined,
          referenceText: mode === "guided" ? referenceText : undefined,
        }),
      });

      if (!startResponse.ok) {
        if (startResponse.status === 429) {
          const errorData = await startResponse.json().catch(() => ({}));
          const resetTime = errorData.resetAt ? formatResetTime(errorData.resetAt) : "midnight UTC";
          throw new Error(errorData.error || `Daily generation limit reached. Resets at ${resetTime}.`);
        }
        if (startResponse.status === 403) {
          throw new Error("Permission denied. Please refresh or check your account permissions.");
        }
        throw new Error("Failed to start course generation. Please try again.");
      }

      const { jobId } = await startResponse.json();

      // Step 2: Poll for completion
      const POLL_INTERVAL = 3000;
      const MAX_POLL_TIME = 5 * 60 * 1000;
      const startTime = Date.now();

      const pollForResult = (): Promise<any> => {
        return new Promise((resolve, reject) => {
          const poll = async () => {
            if (Date.now() - startTime > MAX_POLL_TIME) {
              reject(new Error("Generation timed out. The AI is taking too long."));
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
                reject(new Error(job.error || "Course generation failed."));
                return;
              }

              setTimeout(poll, POLL_INTERVAL);
            } catch (err) {
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
            <h2 className="text-2xl font-semibold tracking-tight">Create Your Course</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose how you want to build your curriculum
            </p>
          </div>
        </div>
      )}

      {isGenerating && topic ? (
        <GenerationProgress topic={topic} isComplete={isGenerationComplete} />
      ) : (
        <Tabs value={mode} onValueChange={(v: any) => setMode(v)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 p-1 h-auto bg-muted/50 rounded-xl">
            <TabsTrigger value="magic" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
              Magic AI
            </TabsTrigger>
            <TabsTrigger value="guided" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <span className="flex items-center justify-center">
                <PenTool className="h-4 w-4 mr-2 text-blue-500" />
                Guided
              </span>
              <Badge variant="default" className="absolute top-[-5px] right-[-10px] h-4 px-1 text-[9px] bg-primary hover:bg-primary text-primary-foreground border-none animate-pulse font-bold shadow-sm">NEW</Badge>
            </TabsTrigger>
            <TabsTrigger value="scratch" className="py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Layout className="h-4 w-4 mr-2 text-emerald-500" />
              Scratch
            </TabsTrigger>
          </TabsList>

          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                {mode === "guided" && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        <Upload className="h-4 w-4 text-primary" />
                        Reference Documents (Optional)
                      </Label>
                      <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[10px] uppercase tracking-wider font-bold">
                        Auto-fills fields
                      </Badge>
                    </div>

                    <div className="relative group">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        disabled={isExtracting}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300
                          ${isExtracting ? 'opacity-50 cursor-not-allowed bg-muted' : 'border-muted-foreground/10 bg-muted/20 hover:bg-muted/30 hover:border-primary/30 hover:shadow-inner'}`}
                      >
                        {isExtracting ? (
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-sm font-medium">Extracting content...</span>
                          </div>
                        ) : fileName ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                              <FileText className="h-7 w-7 text-primary" />
                            </div>
                            <span className="text-sm font-semibold text-primary">{fileName}</span>
                            <span className="text-xs text-muted-foreground">Click to change file</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-3 p-6 text-center">
                            <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-sm font-semibold">Upload PDF or Text File</span>
                              <p className="text-xs text-muted-foreground max-w-[240px]">
                                Pro Tip: Uploading a document will <span className="text-primary font-medium">auto-populate everything</span> for you!
                              </p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between items-center sm:items-center gap-3 sm:gap-4">
                    <Label className="text-sm font-semibold flex items-center gap-2 whitespace-nowrap">
                      {mode === "scratch" ? <PenTool className="h-4 w-4" /> : <Lightbulb className="h-4 w-4 text-amber-500" />}
                      {mode === "scratch" ? "Course Title" : "What is this course about?"}
                    </Label>
                    {generationLimit && (
                      <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                        <div className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full border text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${generationLimit.remaining > 0
                            ? "bg-secondary/40 border-secondary/40 text-secondary-foreground"
                            : "bg-amber-50/80 border-amber-200/50 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-400"
                          }`}>
                          <span className="whitespace-nowrap italic opacity-80">{generationLimit.remaining} / {generationLimit.limit} Daily Limit</span>
                          <span className="w-px h-3 bg-current/20" />
                          <span className="font-medium normal-case whitespace-nowrap">
                            Next reset: {formatResetTime(generationLimit.resetAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Input
                    placeholder={mode === "scratch" ? "Enter course title..." : "e.g., 'Mastering Modern Portrait Photography'"}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="h-12 text-base"
                    disabled={isGenerating}
                  />
                </div>

                {mode === "guided" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Voice & Tone
                      </Label>
                      <Select value={tone} onValueChange={setTone}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Professional">Professional & Authoritative</SelectItem>
                          <SelectItem value="Conversational">Friendly & Conversational</SelectItem>
                          <SelectItem value="Academic">Academic & Technical</SelectItem>
                          <SelectItem value="Enthusiastic">High Energy & Motivating</SelectItem>
                          <SelectItem value="Storytelling">Engaging Storytelling</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <User className="h-3 w-3" />
                        Target Audience
                      </Label>
                      <Input
                        placeholder="e.g. 'Complete Beginners', 'Senior Developers'"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Book className="h-3 w-3" />
                        Detailed Outline (Optional)
                      </Label>
                      <Textarea
                        placeholder="Paste your syllabus or specific topics you want to cover..."
                        value={outline}
                        onChange={(e) => setOutline(e.target.value)}
                        className="min-h-24 resize-none"
                      />
                    </div>
                  </div>
                )}

                {mode === "magic" && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <p className="text-xs text-muted-foreground">Or try one of these proven ideas:</p>
                    <div className="flex flex-wrap gap-2">
                      {exampleTopics.map((example) => (
                        <button
                          key={example.label}
                          onClick={() => setTopic(example.topic)}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full border bg-muted/30 hover:bg-muted transition-all active:scale-95 disabled:opacity-50"
                        >
                          <example.icon className="h-3.5 w-3.5" />
                          {example.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || (mode !== "scratch" && !topic.trim()) || isExtracting || (generationLimit && generationLimit.remaining === 0)}
                  className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                      We're building your course...
                    </>
                  ) : mode === "scratch" ? (
                    <>
                      <PenTool className="mr-2 h-5 w-5" />
                      Create Manual Course
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate {mode === "guided" ? "Custom" : "Magic"} Course
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  {mode === "scratch"
                    ? "Skip the AI and start with a blank canvas."
                    : "You'll be able to review and customize the curriculum before finalizing."}
                </p>
              </div>
            </CardContent>
          </Card>
        </Tabs>
      )}
    </div>
  );
}


interface CoursePreviewProps {
  course: GeneratedCourse;
  onSave: (options: { isFree: boolean; price: string; generateLessonImages: boolean; generateVideo: boolean }) => void;
  onDiscard: () => void;
  isSaving: boolean;
  savingStatus?: string;
}

export function CoursePreview({ course, onSave, onDiscard, isSaving, savingStatus }: CoursePreviewProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [isFree, setIsFree] = useState(false);
  const [price, setPrice] = useState("29.99");
  const [generateLessonImages, setGenerateLessonImages] = useState(true);
  const [generateVideo, setGenerateVideo] = useState(false);

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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="video-toggle" className="text-sm font-medium">
                Generate AI Video
              </Label>
              <p className="text-xs text-muted-foreground">
                AI will generate a 20-30s video for each module.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-none text-[10px] font-bold">
                COMING SOON
              </Badge>
              <Switch
                id="video-toggle"
                checked={false}
                disabled={true}
                data-testid="switch-generate-video"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            onClick={() => onSave({ isFree, price: isFree ? "0" : price, generateLessonImages, generateVideo })}
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
