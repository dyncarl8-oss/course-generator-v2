import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CourseReader } from "@/components/course-reader";
import { Lock, DollarSign, BookOpen, ArrowLeft, Layers, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import type { CourseWithModules } from "@shared/schema";

function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="shrink-0 flex items-center gap-4 px-4 py-3 border-b">
        <Skeleton className="h-9 w-28 rounded-md" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </header>

      <div className="flex-1 px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <Skeleton className="h-5 w-24 mb-3" />
          <Skeleton className="h-9 w-4/5 mb-2" />
        </div>

        <Skeleton className="h-[72px] w-full rounded-xl mb-8" />

        <div className="space-y-5">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-11/12" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>

      <footer className="shrink-0 flex items-center justify-between gap-4 px-4 py-3 border-t">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-1 flex-1 max-w-xs rounded-full hidden sm:block" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </footer>
    </div>
  );
}

export default function CourseViewPage() {
  const { experienceId, courseId } = useParams<{ experienceId: string; courseId: string }>();

  const { data, isLoading, error } = useQuery<CourseWithModules>({
    queryKey: ["/api/experiences", experienceId, "courses", courseId],
    enabled: !!experienceId && !!courseId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    const errorData = (error as any)?.course;

    if (errorData) {
      return (
        <div className="flex items-center justify-center h-full p-6 bg-background">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="max-w-md w-full">
              <CardHeader className="text-center pt-10 pb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10"
                >
                  <Lock className="h-10 w-10 text-amber-500" />
                </motion.div>
                <CardTitle className="text-xl">{errorData.title}</CardTitle>
                <CardDescription className="text-base mt-2">
                  {errorData.description || "Unlock this course to access all lessons and content."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pb-8">
                <div className="flex items-center justify-center gap-4 py-4 px-4 rounded-xl bg-muted/50">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {errorData.moduleCount}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Modules</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      {errorData.lessonCount}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Lessons</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      {errorData.moduleCount}
                    </div>
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Quizzes</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <Button size="lg" className="w-full text-base">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Purchase for ${parseFloat(errorData.price || "0").toFixed(2)}
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href={`/experiences/${experienceId}`}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Library
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-sm w-full">
            <CardHeader className="text-center py-10">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
                <BookOpen className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-lg">Course Not Found</CardTitle>
              <CardDescription>
                This course doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/experiences/${experienceId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Library
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return <CourseReader course={data} experienceId={experienceId} />;
}
