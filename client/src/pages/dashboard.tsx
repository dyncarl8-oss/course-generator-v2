import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CourseGenerator, CoursePreview } from "@/components/course-generator";
import { CourseCard } from "@/components/course-card";
import { WithdrawRequestDialog } from "@/components/withdraw-request-dialog";
import { UserMenu } from "@/components/user-menu";
import {
  Plus, BookOpen, Users, TrendingUp,
  Sparkles, LayoutGrid, DollarSign, HelpCircle, CheckCircle2, Wallet
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateCourseImage } from "@/lib/image-generator";
import type { GeneratedCourse, Course } from "@shared/schema";

interface DashboardData {
  user: { id: string; username: string; email: string };
  courses: (Course & { moduleCount: number; lessonCount: number; studentCount: number })[];
  companyId: string;
  earnings: {
    totalEarnings: number;
    availableBalance: number;
    pendingBalance: number;
  };
  generationLimit?: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
  };
}

export default function DashboardPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [activeTab, setActiveTab] = useState("courses");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Check if any courses are still generating to enable polling
  const hasGeneratingCourses = (courses: DashboardData["courses"] | undefined) =>
    courses?.some(c => c.generationStatus === "generating") ?? false;

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", companyId],
    enabled: !!companyId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if there are courses still generating
      const courses = query.state.data?.courses;
      return hasGeneratingCourses(courses) ? 5000 : false;
    },
  });

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const createTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "create" && createTabRef.current) {
      createTabRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const [savingStatus, setSavingStatus] = useState<string>("");
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async (courseData: { generatedCourse: GeneratedCourse; isFree: boolean; price: string; coverImage?: string; generateLessonImages?: boolean; generateVideo?: boolean }) => {
      return apiRequest("POST", `/api/dashboard/${companyId}/courses`, courseData);
    },
    onMutate: async (courseData) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/dashboard", companyId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<DashboardData>(["/api/dashboard", companyId]);

      // Optimistically add the new course to the list with all required fields
      if (previousData) {
        const now = new Date().toISOString();
        const optimisticCourse = {
          id: `temp-${Date.now()}`,
          creatorId: previousData.user.id,
          title: courseData.generatedCourse.course_title,
          description: courseData.generatedCourse.description || null,
          coverImage: courseData.coverImage || null,
          published: false,
          isFree: courseData.isFree,
          price: courseData.isFree ? "0" : courseData.price,
          generationStatus: (courseData.generateLessonImages || courseData.generateVideo) ? "generating" as const : "complete" as const,
          createdAt: now,
          updatedAt: now,
          moduleCount: courseData.generatedCourse.modules.length,
          lessonCount: courseData.generatedCourse.modules.reduce((acc, m) => acc + m.lessons.length, 0),
          studentCount: 0,
        };

        queryClient.setQueryData<DashboardData>(["/api/dashboard", companyId], {
          ...previousData,
          courses: [optimisticCourse as any, ...previousData.courses],
        });
      }

      return { previousData };
    },
    onSuccess: (newCourse: Course & { moduleCount: number; lessonCount: number; studentCount: number }) => {
      // Proactively update the cache with the real course data to replace the temp ID
      queryClient.setQueryData(["/api/dashboard", companyId], (old: DashboardData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          courses: [newCourse, ...old.courses.filter(c => !c.id.toString().startsWith("temp-"))]
        };
      });

      // Also invalidate to be sure, but the setQueryData above handles the immediate UI update
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId] });
      setIsGeneratingImages(false);

      // Only clear state and switch tabs on success
      setGeneratedCourse(null);

      // If it was a scratch/manual course, redirect to editor immediately
      if (newCourse.id) {
        window.location.href = `/dashboard/${companyId}/courses/${newCourse.id}/edit`;
      } else {
        setActiveTab("courses");
      }
    },
    onError: (_, __, context) => {
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/dashboard", companyId], context.previousData);
      }
      setIsGeneratingImages(false);
      toast({
        title: "Failed to save",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveCourse = async (options: { isFree: boolean; price: string; generateLessonImages: boolean; generateVideo: boolean }) => {
    if (!generatedCourse || isGeneratingImage || saveMutation.isPending) return;

    // Handle "From Scratch" mode specifically if it exists
    if ((generatedCourse as any).mode === "scratch") {
      const scratchData: GeneratedCourse = {
        course_title: "Untitled Course",
        description: "Set your course description here",
        modules: [
          {
            module_title: "Module 1",
            lessons: [
              {
                lesson_title: "Lesson 1",
                content: "Start writing your course content here..."
              }
            ]
          }
        ]
      };

      saveMutation.mutate({
        generatedCourse: scratchData,
        isFree: true,
        price: "0",
        generateLessonImages: false,
        generateVideo: false,
      });
      return;
    }

    // Store the course data before clearing state
    const courseToSave = generatedCourse;

    setIsGeneratingImage(true);
    setIsGeneratingImages(options.generateLessonImages);
    setSavingStatus("Generating cover image...");

    let coverImage: string | undefined;
    try {
      const generatedImage = await generateCourseImage(courseToSave.course_title);
      coverImage = generatedImage || undefined;
    } catch (error) {
      console.error("Failed to generate cover image:", error);
    }

    setIsGeneratingImage(false);
    setSavingStatus("");

    // Show toast immediately
    toast({
      title: "Creating your course...",
      description: options.generateLessonImages
        ? "Your course is being created. You'll receive a notification when lesson images are ready."
        : "Your course is being created.",
    });

    // Now trigger the mutation - the UI has already switched to courses tab
    saveMutation.mutate({
      generatedCourse: courseToSave,
      isFree: options.isFree,
      price: options.price,
      coverImage,
      generateLessonImages: options.generateLessonImages,
      generateVideo: options.generateVideo,
    });
  };

  const togglePublishMutation = useMutation({
    mutationFn: async ({ courseId, published }: { courseId: string; published: boolean }) => {
      setPublishingCourseId(courseId);
      return apiRequest("PATCH", `/api/dashboard/${companyId}/courses/${courseId}`, { published });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId] });
      setPublishingCourseId(null);
    },
    onError: () => {
      setPublishingCourseId(null);
    },
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center py-8">
            <CardTitle className="text-destructive text-lg">Access Denied</CardTitle>
            <CardDescription>
              You don't have admin access to this dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    totalCourses: data?.courses.length || 0,
    publishedCourses: data?.courses.filter((c) => c.published).length || 0,
    totalStudents: data?.courses.reduce((acc, c) => acc + c.studentCount, 0) || 0,
    totalEarnings: data?.earnings?.totalEarnings || 0,
    availableBalance: data?.earnings?.availableBalance || 0,
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="border-b bg-background shrink-0">
        <div className="flex h-14 items-center justify-between px-3 sm:px-5">
          <div className="flex items-center gap-2">
            {/* Library Icon - now always visible and on the left for mobile */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            {/* User Profile on Left for Mobile (now to the right of library icon) */}
            <div className="sm:hidden">
              <UserMenu />
            </div>
            <h1 className="font-semibold hidden sm:block">Course Builder</h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHowItWorks(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground flex"
              data-testid="button-how-it-works"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* User Profile on Right for Desktop */}
            <div className="hidden sm:block">
              <UserMenu />
            </div>
            <Button
              onClick={() => setShowWithdrawDialog(true)}
              data-testid="button-withdraw"
              className="h-9 px-3 sm:px-4 gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none shrink-0"
            >
              <Wallet className="h-4 w-4" />
              <span className="text-xs sm:text-sm font-medium">Withdraw</span>
            </Button>
            <Button
              onClick={() => setActiveTab("create")}
              data-testid="button-create-course"
              className="h-9 px-3 sm:px-4 shrink-0"
            >
              <Plus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm font-medium">{isMobile ? "Create" : "Create Course"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={Wallet} label="Available Balance" value={stats.availableBalance} testId="stat-available-balance" bgColor="bg-emerald-500/10 dark:bg-emerald-400/10" iconColor="text-emerald-600 dark:text-emerald-400" isCurrency />
          <StatCard icon={DollarSign} label="Total Earnings" value={stats.totalEarnings} testId="stat-earnings" bgColor="bg-amber-500/10 dark:bg-amber-400/10" iconColor="text-amber-600 dark:text-amber-400" isCurrency />
          <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} testId="stat-total-courses" bgColor="bg-blue-500/10 dark:bg-blue-400/10" iconColor="text-blue-600 dark:text-blue-400" />
          <StatCard icon={TrendingUp} label="Published" value={stats.publishedCourses} testId="stat-published" bgColor="bg-emerald-500/10 dark:bg-emerald-400/10" iconColor="text-emerald-600 dark:text-emerald-400" />
          <StatCard icon={Users} label="Total Students" value={stats.totalStudents} testId="stat-students" bgColor="bg-violet-500/10 dark:bg-violet-400/10" iconColor="text-violet-600 dark:text-violet-400" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="courses" className="gap-2" data-testid="tab-courses">
              <LayoutGrid className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2" data-testid="tab-create">
              <Sparkles className="h-4 w-4" />
              Create
            </TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="mt-5">
            {data?.courses && data.courses.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    companyId={companyId}
                    moduleCount={course.moduleCount}
                    lessonCount={course.lessonCount}
                    isCreator={true}
                    onTogglePublish={(id, published) =>
                      togglePublishMutation.mutate({ courseId: id, published })
                    }
                    isPublishing={publishingCourseId === course.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">No courses yet</h3>
                  <p className="text-sm text-muted-foreground mb-5 max-w-sm">
                    Create your first AI-powered course to get started.
                  </p>
                  <Button onClick={() => setActiveTab("create")} data-testid="button-create-first-course">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="create" className="mt-5" ref={createTabRef}>
            <div className="max-w-2xl mx-auto">
              {!generatedCourse ? (
                <CourseGenerator
                  companyId={companyId || ""}
                  onGenerated={setGeneratedCourse}
                  isGenerating={isGenerating}
                  setIsGenerating={setIsGenerating}
                  generationLimit={data?.generationLimit}
                />
              ) : (
                <CoursePreview
                  course={generatedCourse}
                  onSave={handleSaveCourse}
                  onDiscard={() => setGeneratedCourse(null)}
                  isSaving={isGeneratingImage || saveMutation.isPending}
                  savingStatus={savingStatus}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How Cursai Works</DialogTitle>
            <DialogDescription>Everything you need to know about running your courses on our platform</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                AI Course Generation
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Enter any topic and our AI instantly generates a complete course with modules, lessons, and structured content. No more spending hours on curriculum design—let AI handle it.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Customization & Control
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Customize every module and lesson. Add your own content, regenerate sections, and personalize the course before publishing. You have full control.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Free or Paid Courses
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Decide whether your course is free or paid. Set any price you want. Free courses grow your audience, paid courses generate revenue.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Member Access
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Once published, your community members can discover and access your courses. Free courses are instantly available. Paid courses require purchase.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Revenue Split
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                <span className="font-semibold text-foreground">You earn 55% of every course sale</span>. Cursai keeps 45% to maintain the platform and power the AI. It's a fair partnership.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Earn Passively
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Once your course is published, it sells 24/7. Watch your earnings grow as members purchase access. No ongoing effort required after publishing.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Clean Learning Experience
              </h3>
              <p className="text-sm text-muted-foreground ml-7">
                Members enjoy a distraction-free reading and listening experience. They can read lessons or listen with AI-powered text-to-speech powered by Murf TTS. Navigate through modules, track progress, and learn at their own pace without clutter.
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg mt-6">
              <p className="text-sm text-foreground font-semibold mb-2">Quick Start:</p>
              <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                <li>1. Click "Create Course" and enter a topic</li>
                <li>2. Review the AI-generated course structure</li>
                <li>3. Customize modules and lessons as needed</li>
                <li>4. Set it as free or add a price</li>
                <li>5. Publish and start earning</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <WithdrawRequestDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        companyId={companyId || ""}
        availableBalance={stats.availableBalance}
      />
    </div>
  );
}

interface StatCardProps {
  icon: typeof BookOpen;
  label: string;
  value: number;
  testId: string;
  bgColor?: string;
  iconColor?: string;
  isCurrency?: boolean;
}

function StatCard({ icon: Icon, label, value, testId, bgColor = "bg-primary/10", iconColor = "text-primary", isCurrency }: StatCardProps) {
  const displayValue = isCurrency ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value;
  return (
    <Card data-testid={testId} className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center shrink-0 shadow-sm`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-tighter font-semibold text-muted-foreground/90 truncate mb-0.5">{label}</p>
            <p className="text-xl font-bold tracking-tight truncate leading-none">{displayValue}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
