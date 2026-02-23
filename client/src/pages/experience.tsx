import { useState, useEffect, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CourseGenerator, CoursePreview } from "@/components/course-generator";
import { CourseCard } from "@/components/course-card";
import { WithdrawRequestDialog } from "@/components/withdraw-request-dialog";
import { UserMenu } from "@/components/user-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen, Lock, Unlock, ChevronRight,
  Sparkles, Plus, Users, TrendingUp, FileText, LayoutGrid,
  Info, CheckCircle, Layers, Loader2, CreditCard, DollarSign, HelpCircle, CheckCircle2, Wallet
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { generateCourseImage } from "@/lib/image-generator";
import confetti from "canvas-confetti";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import type { Course, GeneratedCourse, ModuleWithLessons } from "@shared/schema";

interface ExperienceData {
  user: { id: string; username: string; email: string; profilePicUrl?: string | null };
  courses: (Course & { moduleCount: number; lessonCount: number; hasAccess: boolean; studentCount?: number })[];
  experienceId: string;
  accessLevel: "admin" | "customer" | "no_access";
  earnings?: { totalEarnings: number; availableBalance: number; pendingBalance: number };
  generationLimit?: {
    limit: number;
    used: number;
    remaining: number;
    resetAt: string;
  };
}

export default function ExperiencePage() {
  const { experienceId } = useParams<{ experienceId: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("courses");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<GeneratedCourse | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [memberTab, setMemberTab] = useState("all");
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [enrolledCourseName, setEnrolledCourseName] = useState("");
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const createTabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "create" && createTabRef.current) {
      createTabRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#22c55e', '#10b981', '#34d399', '#6ee7b7'],
    });
  }, []);

  // Check if any courses are still generating to enable polling
  const hasGeneratingCourses = (courses: ExperienceData["courses"] | undefined) =>
    courses?.some(c => c.generationStatus === "generating") ?? false;

  const { data, isLoading, error } = useQuery<ExperienceData>({
    queryKey: ["/api/experiences", experienceId],
    enabled: !!experienceId,
    refetchInterval: (query) => {
      // Poll every 5 seconds if there are courses still generating
      const courses = query.state.data?.courses;
      return hasGeneratingCourses(courses) ? 5000 : false;
    },
  });

  const grantAccessMutation = useMutation({
    mutationFn: async ({ courseId, courseName }: { courseId: string; courseName: string }) => {
      const result = await apiRequest("POST", `/api/experiences/${experienceId}/courses/${courseId}/access`, {});
      return { ...result, courseName };
    },
    onSuccess: (result: any) => {
      if (result.accessGranted) {
        queryClient.invalidateQueries({ queryKey: ["/api/experiences", experienceId] });
        setEnrolledCourseName(result.courseName);
        setSuccessModalOpen(true);
        triggerConfetti();
        setTimeout(() => {
          setMemberTab("my");
        }, 100);
      } else if (result.requiresPurchase) {
        toast({
          title: "Purchase required",
          description: `This course costs $${result.price}. Purchase via Whop to get access.`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to get access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (courseData: { generatedCourse: GeneratedCourse; isFree: boolean; price: string; coverImage?: string; generateLessonImages?: boolean; generateVideo?: boolean }) => {
      console.log(`[Frontend Save] Sending save request to /api/experiences/${experienceId}/courses`);
      return apiRequest("POST", `/api/experiences/${experienceId}/courses`, courseData);
    },
    onMutate: async (courseData) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/experiences", experienceId] });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<ExperienceData>(["/api/experiences", experienceId]);

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
          hasAccess: true,
          studentCount: 0,
        };

        queryClient.setQueryData<ExperienceData>(["/api/experiences", experienceId], {
          ...previousData,
          courses: [optimisticCourse as any, ...previousData.courses],
        });
      }

      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", experienceId] });
    },
    onError: (error: any, __, context) => {
      console.error("[Frontend Save] Error saving course:", error);
      // Rollback to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(["/api/experiences", experienceId], context.previousData);
      }
      toast({
        title: "Failed to save",
        description: "There was an error saving your course. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveCourse = async (options: { isFree: boolean; price: string; generateLessonImages: boolean; generateVideo: boolean }) => {
    if (!generatedCourse || isGeneratingImage || saveMutation.isPending) return;

    // Store the course data before clearing state
    const courseToSave = generatedCourse;

    setIsGeneratingImage(true);

    let coverImage: string | undefined;
    try {
      const generatedImage = await generateCourseImage(courseToSave.course_title);
      coverImage = generatedImage || undefined;
    } catch (error) {
      console.error("Failed to generate cover image:", error);
    }

    // Use flushSync to force synchronous state updates BEFORE mutation
    // This ensures CoursePreview unmounts and tab switches before mutation enters pending state
    flushSync(() => {
      setIsGeneratingImage(false);
      setGeneratedCourse(null);
      setActiveTab("courses");
    });

    // Show toast immediately
    toast({
      title: "Creating your course...",
      description: (options.generateLessonImages || options.generateVideo)
        ? "Your course is being created. You'll receive a notification when lesson media is ready."
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
      return apiRequest("PATCH", `/api/experiences/${experienceId}/courses/${courseId}`, { published });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", experienceId] });
      setPublishingCourseId(null);
      toast({
        title: "Course updated",
        description: "The course status has been updated.",
      });
    },
    onError: () => {
      setPublishingCourseId(null);
    },
  });

  if (error) {
    const is403 = (error as any)?.status === 403;
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-sm w-full">
          <CardHeader className="text-center py-8">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg">{is403 ? "Access Denied" : "Something went wrong"}</CardTitle>
            <CardDescription>
              {is403 ? "You don't have access to this experience." : "Failed to load courses. Please try refreshing the page."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full bg-background">
        <div className="border-b">
          <div className="h-14 px-5 flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = data?.accessLevel === "admin";

  if (isAdmin) {
    const stats = {
      totalCourses: data?.courses.length || 0,
      publishedCourses: data?.courses.filter((c) => c.published).length || 0,
      totalStudents: data?.courses.reduce((acc, c) => acc + (c.studentCount || 0), 0) || 0,
      totalEarnings: data?.earnings?.totalEarnings || 0,
      availableBalance: data?.earnings?.availableBalance || 0,
    };

    return (
      <div className="h-full bg-background flex flex-col">
        <header className="border-b bg-background shrink-0">
          <div className="h-14 px-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="font-semibold">Course Builder</h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHowItWorks(true)}
                className="h-6 w-6 text-muted-foreground hover:text-foreground ml-1"
                data-testid="button-how-it-works"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <UserMenu />
              <Button
                onClick={() => setShowWithdrawDialog(true)}
                data-testid="button-withdraw"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
              >
                <Wallet className="h-4 w-4" />
                <span>Withdraw</span>
              </Button>
              <Button onClick={() => setActiveTab("create")} data-testid="button-create-course">
                <Plus className="h-4 w-4 mr-2" />
                Create Course
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              icon={Wallet}
              label="Available Balance"
              value={stats.availableBalance}
              testId="stat-available-balance"
              isCurrency
              bgColor="bg-emerald-500/10 dark:bg-emerald-400/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={DollarSign}
              label="Total Earnings"
              value={stats.totalEarnings}
              testId="stat-earnings"
              isCurrency
              bgColor="bg-amber-500/10 dark:bg-amber-400/10"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={BookOpen}
              label="Total Courses"
              value={stats.totalCourses}
              testId="stat-total-courses"
              bgColor="bg-blue-500/10 dark:bg-blue-400/10"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Published"
              value={stats.publishedCourses}
              testId="stat-published"
              bgColor="bg-emerald-500/10 dark:bg-emerald-400/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={Users}
              label="Total Students"
              value={stats.totalStudents}
              testId="stat-students"
              bgColor="bg-violet-500/10 dark:bg-violet-400/10"
              iconColor="text-violet-600 dark:text-violet-400"
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
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
                      companyId={experienceId}
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
                <EmptyState
                  title="No courses yet"
                  description="Create your first AI-powered course to get started."
                  action={
                    <Button onClick={() => setActiveTab("create")} data-testid="button-create-first-course">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Create Course
                    </Button>
                  }
                />
              )}
            </TabsContent>

            <TabsContent value="create" className="mt-5" ref={createTabRef}>
              <div className="max-w-2xl mx-auto">
                {!generatedCourse ? (
                  <CourseGenerator
                    companyId={experienceId || ""}
                    onGenerated={setGeneratedCourse}
                    isGenerating={isGenerating}
                    setIsGenerating={setIsGenerating}
                    apiBasePath={`/api/experiences/${experienceId}`}
                    generationLimit={data?.generationLimit}
                  />
                ) : (
                  <CoursePreview
                    course={generatedCourse}
                    onSave={handleSaveCourse}
                    onDiscard={() => setGeneratedCourse(null)}
                    isSaving={isGeneratingImage || saveMutation.isPending}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

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
                  <li>1. Click "+Create Course" and enter a topic</li>
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
          companyId={experienceId || ""}
          availableBalance={stats.availableBalance}
          apiBasePath={`/api/experiences/${experienceId}`}
        />
      </div>
    );
  }

  const myCourses = data?.courses.filter((c) => c.hasAccess) || [];
  const availableCourses = data?.courses.filter((c) => !c.hasAccess) || [];

  return (
    <div className="h-full bg-background flex flex-col">
      <header className="border-b bg-background shrink-0">
        <div className="h-14 px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="font-semibold">Course Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 hidden sm:flex">
              <Avatar className="h-7 w-7">
                <AvatarImage src={data?.user.profilePicUrl || undefined} alt={data?.user.username || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {(data?.user.username || data?.user.email || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {data?.user.username}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-5 space-y-5">
        <Tabs value={memberTab} onValueChange={setMemberTab}>
          <TabsList>
            <TabsTrigger value="all" className="gap-2" data-testid="tab-all-courses">
              <LayoutGrid className="h-4 w-4" />
              Browse
              <Badge variant="secondary" className="ml-1">
                {availableCourses.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="my" className="gap-2" data-testid="tab-my-courses">
              <Unlock className="h-4 w-4" />
              My Courses
              <Badge variant="secondary" className="ml-1">
                {myCourses.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-5">
            {availableCourses.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {availableCourses.map((course) => (
                  <StudentCourseCard
                    key={course.id}
                    course={course}
                    experienceId={experienceId!}
                    hasAccess={false}
                    onRequestAccess={() => {
                      setEnrollingCourseId(course.id);
                      grantAccessMutation.mutate({ courseId: course.id, courseName: course.title });
                    }}
                    isLoading={enrollingCourseId === course.id && grantAccessMutation.isPending}
                    onPurchaseSuccess={(courseName) => {
                      setEnrolledCourseName(courseName);
                      setSuccessModalOpen(true);
                      triggerConfetti();
                      setTimeout(() => setMemberTab("my"), 100);
                    }}
                  />
                ))}
              </div>
            ) : myCourses.length > 0 ? (
              <EmptyState
                title="All caught up!"
                description="You've enrolled in all available courses."
              />
            ) : (
              <EmptyState
                title="No courses yet"
                description="Check back soon for new courses."
              />
            )}
          </TabsContent>

          <TabsContent value="my" className="mt-5">
            {myCourses.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                {myCourses.map((course) => (
                  <StudentCourseCard
                    key={course.id}
                    course={course}
                    experienceId={experienceId!}
                    hasAccess={true}
                    onRequestAccess={() => { }}
                    isLoading={false}
                    onPurchaseSuccess={() => { }}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No courses yet"
                description="Enroll in a course to get started learning."
              />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={successModalOpen} onOpenChange={setSuccessModalOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden">
          <div className="bg-gradient-to-b from-green-500/10 to-transparent px-6 pt-8 pb-6">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mb-5 shadow-lg shadow-green-500/25">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>

              <h2 className="text-xl font-semibold text-center mb-2">
                Enrolled Successfully
              </h2>
              <p className="text-sm text-muted-foreground text-center">
                You now have access to this course
              </p>
            </div>
          </div>

          <div className="px-6 pb-6">
            <div className="mb-6 p-4 bg-muted/50 rounded-lg border text-center">
              <p className="font-medium text-foreground">{enrolledCourseName}</p>
            </div>

            <Button
              onClick={() => setSuccessModalOpen(false)}
              className="w-full"
              size="lg"
              data-testid="button-start-learning"
            >
              Start Learning
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StatCardProps {
  icon: typeof BookOpen;
  label: string;
  value: number;
  testId: string;
  isCurrency?: boolean;
  bgColor?: string;
  iconColor?: string;
}

function StatCard({ icon: Icon, label, value, testId, isCurrency, bgColor = "bg-primary/10", iconColor = "text-primary" }: StatCardProps) {
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

interface StudentCourseCardProps {
  course: Course & { moduleCount: number; lessonCount: number; hasAccess: boolean };
  experienceId: string;
  hasAccess: boolean;
  onRequestAccess: () => void;
  isLoading: boolean;
  onPurchaseSuccess: (courseName: string) => void;
}

function StudentCourseCard({ course, experienceId, hasAccess, onRequestAccess, isLoading, onPurchaseSuccess }: StudentCourseCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const { toast } = useToast();

  const { data: modules } = useQuery<ModuleWithLessons[]>({
    queryKey: ['/api/courses', course.id, 'modules'],
    enabled: isModalOpen,
  });

  const handlePurchase = async () => {
    setIsCreatingCheckout(true);
    try {
      const response = await apiRequest("POST", `/api/experiences/${experienceId}/courses/${course.id}/checkout`, {});
      if (response.checkoutId) {
        setCheckoutSessionId(response.checkoutId);
        setCheckoutModalOpen(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const handleCheckoutComplete = async (paymentId: string) => {
    try {
      // Verify payment and grant access (Option 2 - without webhooks)
      await apiRequest("POST", `/api/payments/${checkoutSessionId}/verify`, { paymentId });

      setCheckoutModalOpen(false);
      setCheckoutSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", experienceId] });
      onPurchaseSuccess(course.title);
    } catch (error) {
      console.error("Payment verification error:", error);
      toast({
        title: "Error",
        description: "Payment was processed but there was an issue granting access. Please refresh the page.",
        variant: "destructive",
      });
      setCheckoutModalOpen(false);
      setCheckoutSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/experiences", experienceId] });
    }
  };

  return (
    <>
      <Card className="group flex flex-col hover-elevate transition-all overflow-hidden" data-testid={`card-course-${course.id}`}>
        {/* Thumbnail */}
        <div className="relative aspect-video w-full bg-muted overflow-hidden">
          {course.coverImage ? (
            <img
              src={course.coverImage}
              alt={course.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              data-testid={`img-course-${course.id}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <BookOpen className="h-12 w-12 text-primary/30" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            {course.isFree ? (
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">Free</Badge>
            ) : (
              <Badge className="bg-chart-4/90 text-white backdrop-blur-sm">
                ${parseFloat(course.price || "0").toFixed(2)}
              </Badge>
            )}
          </div>
        </div>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-base font-semibold leading-snug line-clamp-2" data-testid={`text-course-title-${course.id}`}>
            {course.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 pb-4 pt-0">
          {course.description && (
            <CardDescription className="line-clamp-2 text-sm mb-3">
              {course.description}
            </CardDescription>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {course.moduleCount} modules
            </span>
            <span>{course.lessonCount} lessons</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid={`button-learn-more-${course.id}`}
            >
              <Info className="h-3 w-3" />
              Learn more
            </button>
          </div>
        </CardContent>
        <div className="p-4 pt-0 mt-auto">
          {hasAccess ? (
            <Button className="w-full" asChild data-testid={`button-view-${course.id}`}>
              <Link href={`/experiences/${experienceId}/courses/${course.id}`}>
                Continue Learning
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          ) : course.isFree ? (
            <Button
              className="w-full"
              onClick={onRequestAccess}
              disabled={isLoading}
              data-testid={`button-enroll-${course.id}`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Unlock className="h-4 w-4 mr-2" />
                  Get Free
                </>
              )}
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handlePurchase}
              disabled={isCreatingCheckout}
              data-testid={`button-purchase-${course.id}`}
            >
              {isCreatingCheckout ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Purchase ${parseFloat(course.price || "0").toFixed(2)}
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Checkout Modal */}
      <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col" style={{ backgroundColor: '#090909' }} data-testid={`modal-checkout-${course.id}`}>
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5" />
              Complete Purchase
            </DialogTitle>
            <DialogDescription className="text-white/70">
              You're purchasing: {course.title}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto min-h-[500px] -mt-px" style={{ backgroundColor: '#090909' }}>
            {checkoutSessionId && (
              <div className="[&>*]:!mt-0 [&>*]:!pt-0">
                <WhopCheckoutEmbed
                  sessionId={checkoutSessionId}
                  onComplete={handleCheckoutComplete}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Course Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid={`modal-course-details-${course.id}`}>
          <DialogHeader>
            <div className="flex items-start gap-4">
              {course.coverImage ? (
                <img
                  src={course.coverImage}
                  alt={course.title}
                  className="w-24 h-16 object-cover rounded-md flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-16 flex-shrink-0 rounded-md bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-primary/30" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl leading-tight mb-2" data-testid={`modal-title-${course.id}`}>
                  {course.title}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  {course.isFree ? (
                    <Badge variant="secondary">Free</Badge>
                  ) : (
                    <Badge className="bg-chart-4 text-white">
                      ${parseFloat(course.price || "0").toFixed(2)}
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <Layers className="h-3 w-3" />
                    {course.moduleCount} modules
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <FileText className="h-3 w-3" />
                    {course.lessonCount} lessons
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-4">
              {/* Description */}
              {course.description && (
                <div>
                  <h4 className="font-semibold mb-2">About this course</h4>
                  <DialogDescription className="text-sm leading-relaxed whitespace-pre-wrap" data-testid={`modal-description-${course.id}`}>
                    {course.description}
                  </DialogDescription>
                </div>
              )}

              {/* What you'll learn */}
              {modules && modules.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">What you'll learn</h4>
                  <div className="space-y-3">
                    {modules.map((module, index) => (
                      <div
                        key={module.id}
                        className="rounded-md border p-3"
                        data-testid={`modal-module-${module.id}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                            {index + 1}
                          </span>
                          <h5 className="font-medium text-sm">{module.title}</h5>
                        </div>
                        {module.lessons && module.lessons.length > 0 && (
                          <ul className="ml-8 space-y-1">
                            {module.lessons.slice(0, 5).map((lesson) => (
                              <li
                                key={lesson.id}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                                data-testid={`modal-lesson-${lesson.id}`}
                              >
                                <CheckCircle className="h-3 w-3 text-primary/60 flex-shrink-0" />
                                <span className="line-clamp-1">{lesson.title}</span>
                              </li>
                            ))}
                            {module.lessons.length > 5 && (
                              <li className="text-sm text-muted-foreground ml-5">
                                +{module.lessons.length - 5} more lessons
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Course stats summary */}
              <div className="rounded-md bg-muted/50 p-4">
                <h4 className="font-semibold mb-2">Course includes</h4>
                <ul className="grid grid-cols-2 gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    {course.moduleCount} structured modules
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {course.lessonCount} comprehensive lessons
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Self-paced learning
                  </li>
                  <li className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-primary" />
                    Full lifetime access
                  </li>
                </ul>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} data-testid={`button-close-modal-${course.id}`}>
              Close
            </Button>
            {hasAccess ? (
              <Button asChild data-testid={`modal-button-view-${course.id}`}>
                <Link href={`/experiences/${experienceId}/courses/${course.id}`}>
                  Continue Learning
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            ) : course.isFree ? (
              <Button onClick={onRequestAccess} disabled={isLoading} data-testid={`modal-button-get-free-${course.id}`}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" />
                    Get Free
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handlePurchase}
                disabled={isCreatingCheckout}
                data-testid={`modal-button-purchase-${course.id}`}
              >
                {isCreatingCheckout ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Purchase - ${parseFloat(course.price || "0").toFixed(2)}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BookOpen className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-sm">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
