import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Users, BookOpen, TrendingUp, 
  Calendar, BarChart3, ChevronRight 
} from "lucide-react";
import { useState } from "react";
import type { Course } from "@shared/schema";

interface DashboardData {
  user: { id: string; username: string; email: string };
  courses: (Course & { moduleCount: number; lessonCount: number; studentCount: number })[];
  companyId: string;
}

interface AnalyticsData {
  course: Course;
  students: {
    id: string;
    username: string | null;
    email: string | null;
    profilePicUrl: string | null;
    grantedAt: string;
    purchasedViaWhop: boolean;
  }[];
  totalStudents: number;
}

export default function AnalyticsPage() {
  const { companyId } = useParams<{ companyId: string }>();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", companyId],
    enabled: !!companyId,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/dashboard", companyId, "courses", selectedCourseId, "analytics"],
    enabled: !!companyId && !!selectedCourseId,
  });

  if (dashboardLoading) {
    return (
      <div className="p-5 space-y-5">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const courses = dashboardData?.courses || [];
  const totalStudents = courses.reduce((acc, c) => acc + c.studentCount, 0);
  const totalLessons = courses.reduce((acc, c) => acc + c.lessonCount, 0);
  const publishedCourses = courses.filter((c) => c.published).length;

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="border-b bg-background shrink-0">
        <div className="flex h-14 items-center px-5 gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href={`/dashboard/${companyId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold">Analytics</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <Card data-testid="stat-total-students">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{totalStudents}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-published-courses">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{publishedCourses}</p>
                  <p className="text-xs text-muted-foreground mt-1">Published</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="stat-total-lessons">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold leading-none">{totalLessons}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Courses</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[320px]">
                <div className="space-y-2">
                  {courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        selectedCourseId === course.id
                          ? "bg-primary text-primary-foreground"
                          : "hover-elevate"
                      }`}
                      data-testid={`button-select-course-${course.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{course.title}</p>
                        <p className={`text-xs ${
                          selectedCourseId === course.id 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                        }`}>
                          {course.studentCount} students
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={course.published ? "default" : "outline"}
                          className={`${
                            selectedCourseId === course.id && course.published
                              ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                              : ""
                          }`}
                        >
                          {course.published ? "Live" : "Draft"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </div>
                    </button>
                  ))}
                  {courses.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No courses yet
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Students</CardTitle>
              <CardDescription>
                {selectedCourseId
                  ? `Enrolled in "${analyticsData?.course.title || ""}"`
                  : "Select a course to view students"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {!selectedCourseId ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Select a Course</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Choose a course from the list to see enrolled students.
                  </p>
                </div>
              ) : analyticsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : analyticsData?.students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Users className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">No Students Yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    No one has enrolled in this course yet.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[320px]">
                  <div className="space-y-3">
                    {analyticsData?.students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                        data-testid={`student-row-${student.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.profilePicUrl || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              {(student.username || student.email || "U")
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {student.username || student.email || "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              {new Date(student.grantedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={student.purchasedViaWhop ? "default" : "secondary"}>
                          {student.purchasedViaWhop ? "Paid" : "Free"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
