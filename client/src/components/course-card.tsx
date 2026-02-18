import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BookOpen, Lock, Unlock, Settings, Eye, EyeOff, Loader2, Clock } from "lucide-react";
import type { Course } from "@shared/schema";
import { Link } from "wouter";

interface CourseCardProps {
  course: Course;
  companyId?: string;
  moduleCount?: number;
  lessonCount?: number;
  hasAccess?: boolean;
  isCreator?: boolean;
  onTogglePublish?: (courseId: string, published: boolean) => void;
  isPublishing?: boolean;
}

export function CourseCard({
  course,
  companyId,
  moduleCount = 0,
  lessonCount = 0,
  hasAccess = false,
  isCreator = false,
  onTogglePublish,
  isPublishing = false,
}: CourseCardProps) {
  const priceDisplay = course.isFree
    ? "Free"
    : `$${parseFloat(course.price || "0").toFixed(2)}`;

  return (
    <Card className="group flex flex-col hover-elevate overflow-hidden" data-testid={`card-course-${course.id}`}>
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
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {course.generationStatus === "generating" && (
            <Badge className="bg-blue-500/90 text-white backdrop-blur-sm animate-pulse" data-testid={`badge-generating-${course.id}`}>
              <Clock className="h-3 w-3 mr-1" />
              Finalizing...
            </Badge>
          )}
          {course.isFree ? (
            <Badge className="bg-emerald-500/90 text-white backdrop-blur-sm" data-testid={`badge-free-${course.id}`}>
              Free
            </Badge>
          ) : (
            <Badge className="bg-chart-4/90 text-white backdrop-blur-sm" data-testid={`badge-price-${course.id}`}>
              ${parseFloat(course.price || "0").toFixed(2)}
            </Badge>
          )}
          {isCreator && course.generationStatus !== "generating" && (
            <Badge
              className={course.published 
                ? "bg-green-500/90 text-white backdrop-blur-sm" 
                : "bg-amber-500/90 text-white backdrop-blur-sm"}
              data-testid={`badge-status-${course.id}`}
            >
              {course.published ? "Live" : "Draft"}
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2 pt-4">
        <h3 className="font-semibold text-base leading-snug line-clamp-2" data-testid={`text-course-title-${course.id}`}>
          {course.title}
        </h3>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pt-0">
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-course-description-${course.id}`}>
            {course.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {moduleCount} modules
          </span>
          <span>{lessonCount} lessons</span>
        </div>
        {course.generationStatus === "generating" && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-2 mt-3">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              We're still finalizing your course, please check back later. A notification will popup when it's done.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 gap-2 flex-wrap">
        {isCreator ? (
          course.generationStatus === "generating" ? null : (
            <>
              <Button asChild className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid={`button-manage-${course.id}`}>
                <Link href={companyId ? `/dashboard/${companyId}/courses/${course.id}/edit` : `/course/${course.id}/edit`}>
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Link>
              </Button>
              {course.published ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={isPublishing}
                      data-testid={`button-toggle-publish-${course.id}`}
                    >
                      {isPublishing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <EyeOff className="h-4 w-4 mr-2" />
                      )}
                      Unpublish
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Unpublish this course?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will hide the course from new students. Existing students who already have access will still be able to view the course.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onTogglePublish?.(course.id, false)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Unpublish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onTogglePublish?.(course.id, true)}
                  disabled={isPublishing}
                  data-testid={`button-toggle-publish-${course.id}`}
                >
                  {isPublishing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Publish
                </Button>
              )}
            </>
          )
        ) : hasAccess || course.isFree ? (
          <Button className="w-full" asChild data-testid={`button-view-course-${course.id}`}>
            <Link href={`/course/${course.id}`}>
              <Unlock className="h-4 w-4 mr-2" />
              View Course
            </Link>
          </Button>
        ) : (
          <Button className="w-full" variant="secondary" data-testid={`button-purchase-${course.id}`}>
            <Lock className="h-4 w-4 mr-2" />
            {priceDisplay}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
