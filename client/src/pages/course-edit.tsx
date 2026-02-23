import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "@/components/ui/tabs";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  DollarSign,
  Layers,
  BookOpen,
  Settings,
  FileText,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Upload,
  Sparkles,
  Users,
  TrendingUp,
  Calendar,
  Pencil,
  X,
  Wand2,
  ZoomIn,
  Menu,
  HelpCircle,
  Edit,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "wouter";
import { cn, getEmbedUrl } from "@/lib/utils";
import QuizEditor from "@/components/QuizEditor";
import { MediaDialog } from "@/components/media-dialog";
import { BlockEditor, BlockEditorToolbar } from "@/components/block-editor";
import { ILessonBlock } from "@shared/schema";

function MobileSidebarTrigger() {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="shrink-0 -ml-2"
      onClick={() => toggleSidebar()}
      data-testid="sidebar-toggle"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

interface CourseSidebarProps {
  companyId: string;
  activeTab: string;
  handleTabChange: (tab: string) => void;
  analytics: any;
  course: CourseWithModules;
  displayModules: any[];
  selectedModuleId: string | null;
  handleModuleChange: (id: string | null) => void;
  isMobile: boolean;
  isEditMode: boolean;
  enterEditMode: () => void;
  exitEditMode: (force?: boolean) => void;
}

function CourseSidebar({
  companyId,
  activeTab,
  handleTabChange,
  analytics,
  course,
  displayModules,
  selectedModuleId,
  handleModuleChange,
  isMobile,
  isEditMode,
  enterEditMode,
  exitEditMode,
}: CourseSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleNavClick = (tab: string, moduleId: string | null = null) => {
    handleTabChange(tab);
    if (moduleId !== undefined) {
      handleModuleChange(moduleId);
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar className="border-r top-14 h-[calc(100svh-3.5rem)]">
      {isMobile && (
        <SidebarHeader className="p-4 border-b">
          <Button variant="ghost" size="sm" asChild className="w-full justify-start -ml-2 text-muted-foreground hover:text-foreground">
            <Link href={`/dashboard/${companyId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </SidebarHeader>
      )}
      <SidebarContent className="py-2">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === "students"}
                onClick={() => handleNavClick("students")}
                data-testid="sidebar-nav-analytics"
              >
                <Users className="h-4 w-4" />
                <span>Analytics</span>
                {analytics && analytics.totalStudents > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {analytics.totalStudents}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            <Collapsible className="group/collapsible" defaultOpen={activeTab === "content"}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    isActive={activeTab === "content"}
                    onClick={() => handleTabChange("content")}
                    data-testid="sidebar-nav-content"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Content</span>
                    <Badge variant="secondary" className="ml-auto mr-1 text-xs">
                      {course.modules.length}
                    </Badge>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {displayModules.map((module, moduleIndex) => (
                      <SidebarMenuSubItem key={module.id}>
                        <SidebarMenuSubButton
                          isActive={activeTab === "content" && selectedModuleId === module.id}
                          onClick={() => handleNavClick("content", module.id)}
                          className="text-xs"
                          data-testid={`sidebar-module-${module.id}`}
                        >
                          <span className="truncate">Module {moduleIndex + 1}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeTab === "settings"}
                onClick={() => handleNavClick("settings")}
                data-testid="sidebar-nav-settings"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {!isMobile && activeTab === "content" && (
        <SidebarFooter className="p-4 border-t mt-auto">
          <Button
            variant="default"
            className={cn(
              "w-full justify-center gap-2 shadow-sm transition-all duration-300 font-bold",
              isEditMode
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/10"
            )}
            onClick={isEditMode ? () => exitEditMode() : enterEditMode}
          >
            {isEditMode ? (
              <>
                <Eye className="h-4 w-4" />
                <span>View Mode</span>
              </>
            ) : (
              <>
                <Edit className="h-4 w-4" />
                <span>Edit Mode</span>
              </>
            )}
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

export default function CourseEditPage() {
  const { companyId, courseId } = useParams<{ companyId: string; courseId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data: course, isLoading } = useQuery<CourseWithModules>({
    queryKey: ["/api/dashboard", companyId, "courses", courseId],
    enabled: !!companyId && !!courseId,
  });

  interface AnalyticsStudent {
    id: string;
    username: string;
    email: string;
    profilePicUrl: string | null;
    grantedAt: string;
    purchasedViaWhop: boolean;
    paidAmount: string | null;
    paidAt: string | null;
  }

  interface AnalyticsData {
    students: AnalyticsStudent[];
    totalStudents: number;
    totalEarnings: string;
    paidStudents: number;
  }

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/dashboard", companyId, "courses", courseId, "analytics"],
    enabled: !!companyId && !!courseId,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("students");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [exitEditModeRequested, setExitEditModeRequested] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pendingMediaDelete, setPendingMediaDelete] = useState<{ lessonId: string; mediaId: string } | null>(null);
  const [uploadingMediaId, setUploadingMediaId] = useState<string | null>(null);
  const [showMobileScrollButton, setShowMobileScrollButton] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Refs to track edited content without causing re-renders
  const editedContentRef = useRef<Map<string, { type: 'module' | 'lessonTitle' | 'lessonContent', value: string }>>(new Map());

  useEffect(() => {
    if (course) {
      setTitle(course.title);
      setDescription(course.description || "");
      setIsFree(course.isFree);
      setPrice(course.price || "0");
      setCoverImage(course.coverImage || null);
    }
  }, [course]);

  useEffect(() => {
    if (course && course.modules.length > 0 && !selectedModuleId) {
      setSelectedModuleId(course.modules[0].id);
    }
  }, [course, selectedModuleId]);

  // Scroll to top when module changes
  const prevModuleIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedModuleId && selectedModuleId !== prevModuleIdRef.current && mainContentRef.current) {
      requestAnimationFrame(() => {
        mainContentRef.current?.scrollTo({ top: 0, behavior: 'instant' });
      });
    }
    prevModuleIdRef.current = selectedModuleId;
  }, [selectedModuleId]);

  // Handle scroll for mobile floating edit button
  useEffect(() => {
    const mainContent = mainContentRef.current;
    if (!mainContent || !isMobile || activeTab !== "content") {
      setShowMobileScrollButton(false);
      return;
    }

    const handleScroll = () => {
      // Very low threshold for immediate feedback
      setShowMobileScrollButton(mainContent.scrollTop > 50);
    };

    // Trigger check immediately in case we're already scrolled
    handleScroll();

    mainContent.addEventListener('scroll', handleScroll, { passive: true });
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [isMobile, activeTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCoverImage(dataUrl);
      updateCourseMutation.mutate({ coverImage: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImage = async () => {
    if (!course) return;
    setIsGeneratingImage(true);
    try {
      const newImage = await generateCourseImage(title || course.title);
      if (newImage) {
        setCoverImage(newImage);
        updateCourseMutation.mutate({ coverImage: newImage });
      } else {
        toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const updateCourseMutation = useMutation({
    mutationFn: async (updates: Partial<CourseWithModules>) => {
      return apiRequest("PATCH", `/api/dashboard/${companyId}/courses/${courseId}`, updates);
    },
    onSuccess: (data) => {
      // Merge response with existing data to preserve modules and other properties
      queryClient.setQueryData(["/api/dashboard", companyId, "courses", courseId], (old: CourseWithModules | undefined) => {
        if (!old) return data;
        return { ...old, ...data };
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId] });
      toast({ title: "Changes saved", description: "Your course has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update course.", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/dashboard/${companyId}/courses/${courseId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId] });
      navigate(`/dashboard/${companyId}`);
      toast({ title: "Course deleted", description: "The course has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete course.", variant: "destructive" });
    },
  });

  const updateModuleMutation = useMutation({
    mutationFn: async ({ moduleId, title }: { moduleId: string; title: string }) => {
      return apiRequest("PATCH", `/api/dashboard/${companyId}/modules/${moduleId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
    },
  });

  const updateLessonMutation = useMutation({
    mutationFn: async ({ lessonId, title, content }: { lessonId: string; title: string; content: string }) => {
      return apiRequest("PATCH", `/api/dashboard/${companyId}/lessons/${lessonId}`, { title, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
    },
  });

  const addLessonMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return apiRequest("POST", `/api/dashboard/${companyId}/modules/${moduleId}/lessons`, {
        title: "New Lesson",
        content: JSON.stringify([{ id: crypto.randomUUID(), type: 'text', content: { text: "" }, orderIndex: 0 }])
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Lesson added" });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      return apiRequest("DELETE", `/api/dashboard/${companyId}/lessons/${lessonId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Lesson deleted" });
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return apiRequest("POST", `/api/dashboard/${companyId}/modules/${moduleId}/quiz/generate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Quiz generated", description: "AI has created a quiz for this module." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate quiz.", variant: "destructive" });
    },
  });

  const saveQuizMutation = useMutation({
    mutationFn: async ({ quizId, updates }: { quizId: string; updates: Partial<Quiz> }) => {
      return apiRequest("PATCH", `/api/dashboard/${companyId}/quizzes/${quizId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Quiz saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save quiz.", variant: "destructive" });
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      return apiRequest("DELETE", `/api/dashboard/${companyId}/modules/${moduleId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Module deleted" });
    },
  });

  const addMediaMutation = useMutation({
    mutationFn: async ({ lessonId, type, url, alt, caption, placement }: {
      lessonId: string;
      type: "image" | "video";
      url: string;
      alt?: string;
      caption?: string;
      placement?: number
    }) => {
      return apiRequest("POST", `/api/dashboard/${companyId}/lessons/${lessonId}/media`, {
        type, url, alt, caption, placement
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Media added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add media.", variant: "destructive" });
    },
  });

  const removeMediaMutation = useMutation({
    mutationFn: async ({ lessonId, mediaId }: { lessonId: string; mediaId: string }) => {
      return apiRequest("DELETE", `/api/dashboard/${companyId}/lessons/${lessonId}/media/${mediaId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Media removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove media.", variant: "destructive" });
    },
  });

  const [generatingMediaForLesson, setGeneratingMediaForLesson] = useState<string | null>(null);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaDialogLessonId, setMediaDialogLessonId] = useState<string | null>(null);
  const [mediaDialogLessonTitle, setMediaDialogLessonTitle] = useState("");

  const openMediaDialog = (lessonId: string, lessonTitle: string) => {
    setMediaDialogLessonId(lessonId);
    setMediaDialogLessonTitle(lessonTitle);
    setMediaDialogOpen(true);
  };

  const handleAddImage = (url: string, alt?: string) => {
    if (!mediaDialogLessonId) return;
    addMediaMutation.mutate({
      lessonId: mediaDialogLessonId,
      type: "image",
      url,
      alt,
      placement: 0
    });
    setMediaDialogOpen(false);
  };

  const handleAddVideo = (url: string) => {
    if (!mediaDialogLessonId) return;
    addMediaMutation.mutate({
      lessonId: mediaDialogLessonId,
      type: "video",
      url,
      placement: 0
    });
    setMediaDialogOpen(false);
  };

  const handleGenerateLessonImage = (prompt: string, alt?: string) => {
    if (!mediaDialogLessonId) return;
    generateLessonImageMutation.mutate({
      lessonId: mediaDialogLessonId,
      prompt,
      alt,
      placement: 0
    });
    setMediaDialogOpen(false);
  };

  const generateLessonImageMutation = useMutation({
    mutationFn: async ({ lessonId, prompt, alt, placement }: {
      lessonId: string;
      prompt: string;
      alt?: string;
      placement?: number
    }) => {
      setGeneratingMediaForLesson(lessonId);
      return apiRequest("POST", `/api/dashboard/${companyId}/lessons/${lessonId}/generate-image`, {
        prompt, alt, placement
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Image generated", description: "AI image added to lesson." });
      setGeneratingMediaForLesson(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate image.", variant: "destructive" });
      setGeneratingMediaForLesson(null);
    },
  });

  // State and mutation for regenerating images with NanoBanana
  const [regeneratingMediaId, setRegeneratingMediaId] = useState<string | null>(null);

  // Lightbox state for viewing images in full size
  const [lightboxImage, setLightboxImage] = useState<{ url: string; alt: string } | null>(null);

  const regenerateImageMutation = useMutation({
    mutationFn: async ({ lessonId, mediaId }: { lessonId: string; mediaId: string }) => {
      setRegeneratingMediaId(mediaId);
      return apiRequest("POST", `/api/dashboard/${companyId}/lessons/${lessonId}/media/${mediaId}/regenerate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      toast({ title: "Image regenerated", description: "The image has been regenerated with AI." });
      setRegeneratingMediaId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate image. Make sure the image was AI-generated.",
        variant: "destructive"
      });
      setRegeneratingMediaId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="h-14 border-b px-6 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Course not found</h2>
          <p className="text-muted-foreground text-sm">The course you're looking for doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/${companyId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isSaving = updateCourseMutation.isPending || updateModuleMutation.isPending || updateLessonMutation.isPending || isSavingDraft;
  const totalLessons = course?.modules?.reduce((acc, m) => acc + m.lessons.length, 0) || 0;

  // Always display from original - edits are tracked in ref without re-rendering
  const displayModules = course.modules;

  // Edit mode helpers
  const enterEditMode = () => {
    // Clear any previous edits
    editedContentRef.current.clear();
    setIsEditMode(true);
    setIsDirty(false);
  };

  const exitEditMode = (force = false) => {
    if (isDirty && !force) {
      setExitEditModeRequested(true);
      setShowUnsavedDialog(true);
      return;
    }
    setIsEditMode(false);
    setIsDirty(false);
    editedContentRef.current.clear();
    setExitEditModeRequested(false);
  };

  const handleSaveChanges = async () => {
    const edits = editedContentRef.current;
    if (edits.size === 0) return;

    setIsSavingDraft(true);
    try {
      // Persist all edits to the server
      for (const [key, edit] of edits) {
        if (edit.type === 'module') {
          await apiRequest("PATCH", `/api/dashboard/${companyId}/modules/${key}`, { title: edit.value });
        } else if (edit.type === 'lessonTitle') {
          const lessonId = key.replace('title-', '');
          await apiRequest("PATCH", `/api/dashboard/${companyId}/lessons/${lessonId}`, { title: edit.value });
        } else if (edit.type === 'lessonContent') {
          const lessonId = key.replace('content-', '');
          await apiRequest("PATCH", `/api/dashboard/${companyId}/lessons/${lessonId}`, { content: edit.value });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
      setIsEditMode(false);
      setIsDirty(false);
      editedContentRef.current.clear();
      toast({ title: "Changes saved", description: "Your content has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleDiscardChanges = () => {
    // Simply reset - no server refetch needed since we haven't persisted
    setIsEditMode(false);
    setIsDirty(false);
    editedContentRef.current.clear();
    setShowUnsavedDialog(false);
    setPendingTabChange(null);
    setExitEditModeRequested(false);
    // Force re-render to reset contentEditable elements to original content
    queryClient.invalidateQueries({ queryKey: ["/api/dashboard", companyId, "courses", courseId] });
    toast({ title: "Changes discarded", description: "Your changes have been reverted." });
  };

  const handleTabChange = (newTab: string) => {
    if (newTab === "content" || !isEditMode || !isDirty) {
      setActiveTab(newTab);
      if (newTab !== "content") {
        setIsEditMode(false);
        setIsDirty(false);
        editedContentRef.current.clear();
      }
      return;
    }
    // Has unsaved changes, show dialog
    setPendingTabChange(newTab);
    setShowUnsavedDialog(true);
  };

  const handleModuleChange = (moduleId: string) => {
    // Allow switching modules freely - changes are tracked in ref
    setSelectedModuleId(moduleId);
  };

  const handleDialogSave = async () => {
    await handleSaveChanges();
    setShowUnsavedDialog(false);

    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
    if (exitEditModeRequested) {
      setExitEditModeRequested(false);
    }
  };

  const handleDialogDiscard = () => {
    handleDiscardChanges();

    if (pendingTabChange) {
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
  };

  const handleDialogCancel = () => {
    setShowUnsavedDialog(false);
    setPendingTabChange(null);
    setExitEditModeRequested(false);
  };

  // Check if there are any pending edits that differ from original
  const checkIfDirtyFromRef = () => {
    const edits = editedContentRef.current;
    if (edits.size === 0) return false;

    for (const [key, edit] of edits) {
      if (edit.type === 'module') {
        const originalModule = course.modules.find(m => m.id === key);
        if (originalModule && edit.value !== originalModule.title) return true;
      } else if (edit.type === 'lessonTitle') {
        const lessonId = key.replace('title-', '');
        for (const module of course.modules) {
          const originalLesson = module.lessons.find(l => l.id === lessonId);
          if (originalLesson && edit.value !== originalLesson.title) return true;
        }
      } else if (edit.type === 'lessonContent') {
        const lessonId = key.replace('content-', '');
        for (const module of course.modules) {
          const originalLesson = module.lessons.find(l => l.id === lessonId);
          if (originalLesson && edit.value !== originalLesson.content) return true;
        }
      }
    }
    return false;
  };

  // Track module title edit
  const trackModuleEdit = (moduleId: string, newTitle: string) => {
    const originalModule = course.modules.find(m => m.id === moduleId);
    if (originalModule && newTitle === originalModule.title) {
      // Matches original, remove from edits
      editedContentRef.current.delete(moduleId);
    } else {
      editedContentRef.current.set(moduleId, { type: 'module', value: newTitle });
    }
    setIsDirty(checkIfDirtyFromRef());
  };

  // Track lesson title edit
  const trackLessonTitleEdit = (lessonId: string, newTitle: string) => {
    let originalTitle = '';
    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) { originalTitle = lesson.title; break; }
    }
    if (newTitle === originalTitle) {
      editedContentRef.current.delete(`title-${lessonId}`);
    } else {
      editedContentRef.current.set(`title-${lessonId}`, { type: 'lessonTitle', value: newTitle });
    }
    setIsDirty(checkIfDirtyFromRef());
  };

  // Track lesson content edit (now supports blocks)
  const trackLessonContentEdit = (lessonId: string, newContent: string) => {
    let originalContent = '';
    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) { originalContent = lesson.content || ''; break; }
    }
    if (newContent === originalContent) {
      editedContentRef.current.delete(`content-${lessonId}`);
    } else {
      editedContentRef.current.set(`content-${lessonId}`, { type: 'lessonContent', value: newContent });
    }
    setIsDirty(checkIfDirtyFromRef());
  };

  const handleMoveBlockOutside = (lessonId: string, blockIndex: number, direction: 'up' | 'down') => {
    const selectedModule = course.modules.find(m => m.id === selectedModuleId);
    if (!selectedModule) return;

    const selectedModuleIndex = course.modules.findIndex(m => m.id === selectedModuleId);
    const lessonIndex = selectedModule.lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return;

    const currentLesson = selectedModule.lessons[lessonIndex];
    const currentBlocks = getLessonBlocks(currentLesson);
    const blockToMove = currentBlocks[blockIndex];

    if (direction === 'up' && lessonIndex > 0) {
      // Move to previous lesson
      const prevLesson = selectedModule.lessons[lessonIndex - 1];
      const prevBlocks = getLessonBlocks(prevLesson);

      // Remove from current
      const newCurrentBlocks = currentBlocks.filter((_, i) => i !== blockIndex);
      trackLessonContentEdit(currentLesson.id, JSON.stringify(newCurrentBlocks.map((b, i) => ({ ...b, orderIndex: i }))));

      // Add to prev (at the end)
      const newPrevBlocks = [...prevBlocks, blockToMove];
      trackLessonContentEdit(prevLesson.id, JSON.stringify(newPrevBlocks.map((b, i) => ({ ...b, orderIndex: i }))));

      toast({ title: "Block moved up", description: `Moved to lesson ${selectedModuleIndex + 1}.${lessonIndex}` });
    } else if (direction === 'down' && lessonIndex < selectedModule.lessons.length - 1) {
      // Move to next lesson
      const nextLesson = selectedModule.lessons[lessonIndex + 1];
      const nextBlocks = getLessonBlocks(nextLesson);

      // Remove from current
      const newCurrentBlocks = currentBlocks.filter((_, i) => i !== blockIndex);
      trackLessonContentEdit(currentLesson.id, JSON.stringify(newCurrentBlocks.map((b, i) => ({ ...b, orderIndex: i }))));

      // Add to next (at the start)
      const newNextBlocks = [blockToMove, ...nextBlocks];
      trackLessonContentEdit(nextLesson.id, JSON.stringify(newNextBlocks.map((b, i) => ({ ...b, orderIndex: i }))));

      toast({ title: "Block moved down", description: `Moved to lesson ${selectedModuleIndex + 1}.${lessonIndex + 2}` });
    }
  };

  // Helper to parse blocks from lesson content
  const getLessonBlocks = (lesson: any): ILessonBlock[] => {
    // Check for buffered edits first
    const edited = editedContentRef.current.get(`content-${lesson.id}`);
    const contentToParse = edited ? edited.value : lesson.content;

    try {
      const parsed = JSON.parse(contentToParse);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // Not JSON, convert legacy text + media to blocks
      const blocks: ILessonBlock[] = [];
      if (contentToParse) {
        blocks.push({
          id: `legacy-text-${lesson.id}-${blocks.length}`,
          type: 'text',
          content: { text: contentToParse },
          orderIndex: 0
        });
      }

      // Add legacy media as blocks if any (only if not already converted/edited)
      if (!edited && lesson.media && Array.isArray(lesson.media)) {
        lesson.media.forEach((m: any, i: number) => {
          blocks.push({
            id: m.id ? String(m.id) : `legacy-media-${lesson.id}-${i}`,
            type: m.type === 'video' ? 'video' : 'image',
            content: { url: m.url, alt: m.alt, caption: m.caption },
            orderIndex: blocks.length
          });
        });
      }
      return blocks;
    }
    return [];
  };



  if (!course) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Course not found</h2>
          <p className="text-muted-foreground text-sm">The course you're looking for doesn't exist.</p>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/${companyId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": "14rem" } as React.CSSProperties}>
      <div className="h-screen flex flex-1 flex-col bg-background overflow-hidden w-full">
        {/* Minimal Header */}
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
          <div className="h-full px-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {isMobile ? (
                <MobileSidebarTrigger />
              ) : (
                <>
                  <Button variant="ghost" size="icon" asChild className="shrink-0" data-testid="button-back">
                    <Link href={`/dashboard/${companyId}`}>
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                </>
              )}
              <nav className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 flex-1">
                <span className="shrink-0">Courses</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-foreground truncate">{course.title}</span>
              </nav>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                className={course.published
                  ? "bg-green-500/90 text-white"
                  : "bg-amber-500/90 text-white"}
              >
                {course.published ? "Live" : "Draft"}
              </Badge>
              <Separator orientation="vertical" className="h-5" />
              {course.published ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      disabled={isSaving}
                      data-testid="button-toggle-publish"
                    >
                      {updateCourseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <EyeOff className="h-4 w-4 mr-1.5" />
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
                        onClick={() => updateCourseMutation.mutate({ published: false })}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        Unpublish
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateCourseMutation.mutate({ published: true })}
                  disabled={isSaving}
                  data-testid="button-toggle-publish"
                >
                  {updateCourseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1.5" />
                  )}
                  Publish
                </Button>
              )}
            </div>
          </div>
        </header>
        <div className="flex flex-1 min-h-0 w-full">
          {/* Left Navigation Sidebar */}
          <CourseSidebar
            companyId={companyId!}
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            analytics={analytics}
            course={course}
            displayModules={displayModules}
            selectedModuleId={selectedModuleId}
            handleModuleChange={handleModuleChange}
            isMobile={isMobile}
            isEditMode={isEditMode}
            enterEditMode={enterEditMode}
            exitEditMode={exitEditMode}
          />

          {/* Main Content Area */}
          <main ref={mainContentRef} className="flex-1 overflow-y-auto">
            {/* Content Section */}
            {activeTab === "content" && (
              <div key={selectedModuleId} className="max-w-3xl mx-auto py-6 pb-24 px-4 sm:px-6">
                {course.modules.length > 0 ? (
                  <>
                    {/* Course Stats & Edit Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" data-testid="course-stats">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground order-2 sm:order-1">
                        <span className="flex items-center gap-1.5 min-w-fit">
                          <Layers className="h-3.5 w-3.5" />
                          {course.modules.length} modules
                        </span>
                        <span className="flex items-center gap-1.5 min-w-fit">
                          <BookOpen className="h-3.5 w-3.5" />
                          {totalLessons} lessons
                        </span>
                        <span className="flex items-center gap-1.5 min-w-fit font-medium text-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          {course.isFree ? "Free" : `$${parseFloat(course.price || "0").toFixed(2)}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 order-1 sm:order-2">
                        <Button
                          variant={isEditMode ? "secondary" : "default"}
                          size="sm"
                          onClick={() => isEditMode ? exitEditMode() : enterEditMode()}
                          className="w-full sm:w-auto h-9 sm:h-8 md:hidden"
                          data-testid="button-toggle-edit"
                        >
                          {isEditMode ? (
                            <>
                              <X className="h-4 w-4 mr-1.5" />
                              Done Editing
                            </>
                          ) : (
                            <>
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit Mode
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Document Style Content */}
                    <AnimatePresence>
                      {activeTab === "content" && isMobile && showMobileScrollButton && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.8, x: 20 }}
                          className="fixed top-[60px] right-4 z-[9999] pointer-events-auto"
                        >
                          <Button
                            size="sm"
                            onClick={() => isEditMode ? exitEditMode() : enterEditMode()}
                            className={cn(
                              "h-10 rounded-full shadow-2xl border transition-all active:scale-95 px-5 font-bold",
                              isEditMode
                                ? "bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-400"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 border-primary/20"
                            )}
                          >
                            {isEditMode ? (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Done
                              </>
                            ) : (
                              <>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </>
                            )}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {(() => {
                      const selectedModule = displayModules.find(m => m.id === selectedModuleId);
                      const selectedModuleIndex = displayModules.findIndex(m => m.id === selectedModuleId);
                      if (!selectedModule) return null;

                      return (
                        <article className="prose prose-neutral dark:prose-invert max-w-none" data-testid="module-content">
                          {/* Module Title */}
                          <div className="group flex items-start gap-3 mb-8">
                            <div
                              contentEditable={isEditMode}
                              suppressContentEditableWarning
                              onInput={(e) => {
                                if (!isEditMode) return;
                                const newTitle = e.currentTarget.textContent || "";
                                trackModuleEdit(selectedModule.id, newTitle);
                              }}
                              className={`flex-1 text-xl sm:text-2xl font-bold outline-none rounded transition-colors ${isEditMode ? "cursor-text focus:bg-muted/30 focus:px-2 focus:-mx-2" : "cursor-default"
                                }`}
                              data-testid={`input-module-${selectedModule.id}`}
                            >
                              {selectedModule.title || `Module ${selectedModuleIndex + 1}`}
                            </div>
                            {isEditMode && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity"
                                    data-testid={`button-delete-module-${selectedModule.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete module?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will delete "{selectedModule.title}" and all its lessons. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        deleteModuleMutation.mutate(selectedModule.id);
                                        const remainingModules = course.modules.filter(m => m.id !== selectedModule.id);
                                        if (remainingModules.length > 0) {
                                          setSelectedModuleId(remainingModules[0].id);
                                        } else {
                                          setSelectedModuleId(null);
                                        }
                                      }}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>

                          {/* Lessons */}
                          {selectedModule.lessons.length > 0 ? (
                            <div className="space-y-10">
                              {selectedModule.lessons.map((lesson, lessonIndex) => (
                                <section
                                  key={lesson.id}
                                  className="group"
                                  data-testid={`container-lesson-${lesson.id}`}
                                >
                                  {/* Lesson Title */}
                                  <div className="flex items-start gap-2 mb-3">
                                    <span className="text-sm text-muted-foreground font-medium mt-1 shrink-0">
                                      {selectedModuleIndex + 1}.{lessonIndex + 1}
                                    </span>
                                    <div
                                      contentEditable={isEditMode}
                                      suppressContentEditableWarning
                                      onInput={(e) => {
                                        if (!isEditMode) return;
                                        const newTitle = e.currentTarget.textContent || "";
                                        trackLessonTitleEdit(lesson.id, newTitle);
                                      }}
                                      className={`flex-1 text-base sm:text-lg font-semibold outline-none rounded transition-colors ${isEditMode ? "cursor-text focus:bg-muted/30 focus:px-2 focus:-mx-2" : "cursor-default"
                                        }`}
                                      data-testid={`input-lesson-title-${lesson.id}`}
                                    >
                                      {lesson.title}
                                    </div>
                                    {isEditMode && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground hover:text-destructive transition-opacity"
                                            data-testid={`button-delete-lesson-${lesson.id}`}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete lesson?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This will permanently delete this lesson. This cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() => deleteLessonMutation.mutate(lesson.id)}
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                  {/* Lesson Content with Inline Media */}
                                  {(() => {
                                    const paragraphs = (lesson.content || "").split(/\n\n/).filter(p => p.trim());
                                    const getMediaForPosition = (afterParagraphIndex: number) => {
                                      if (!lesson.media || lesson.media.length === 0) return [];
                                      return lesson.media.filter(m => m.placement === afterParagraphIndex);
                                    };

                                    const renderMedia = (media: typeof lesson.media[0]) => {
                                      const hasCaption = !!media.caption;

                                      return (
                                        <figure key={media.id} className={`my-4 ${hasCaption ? 'rounded-lg border bg-card overflow-hidden' : ''}`}>
                                          {media.type === "image" ? (
                                            <>
                                              <div
                                                className="relative"
                                                data-testid={`container-lesson-media-${media.id}`}
                                              >
                                                <img
                                                  src={media.url}
                                                  alt={media.alt || "Lesson image"}
                                                  className={`w-full block cursor-pointer ${hasCaption ? '' : 'rounded-lg'}`}
                                                  onClick={() => !isEditMode && setLightboxImage({ url: media.url, alt: media.alt || "Lesson image" })}
                                                  data-testid={`img-lesson-media-${media.id}`}
                                                />
                                                {!isEditMode && (
                                                  <div
                                                    className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                                    onClick={() => setLightboxImage({ url: media.url, alt: media.alt || "Lesson image" })}
                                                  >
                                                    <div className="bg-background/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
                                                      <ZoomIn className="h-5 w-5 text-foreground" />
                                                    </div>
                                                  </div>
                                                )}
                                                {isEditMode && (
                                                  <button
                                                    type="button"
                                                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white/90 flex items-center justify-center backdrop-blur-sm transition-colors"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setPendingMediaDelete({ lessonId: lesson.id, mediaId: media.id });
                                                    }}
                                                    data-testid={`button-remove-media-${media.id}`}
                                                  >
                                                    <X className="h-3.5 w-3.5" />
                                                  </button>
                                                )}
                                              </div>
                                              {isEditMode && (
                                                <div className="flex items-center justify-center gap-2 py-3 px-3 bg-muted/40 rounded-b-lg flex-wrap">
                                                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                                                    Image doesn't look right? try
                                                  </p>
                                                  <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="shadow-sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      regenerateImageMutation.mutate({ lessonId: lesson.id, mediaId: media.id });
                                                    }}
                                                    disabled={regeneratingMediaId === media.id}
                                                    data-testid={`button-regenerate-${media.id}`}
                                                  >
                                                    {regeneratingMediaId === media.id ? (
                                                      <>
                                                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                                        Regenerating...
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Wand2 className="h-4 w-4 mr-1.5" />
                                                        Regenerate
                                                      </>
                                                    )}
                                                  </Button>
                                                  <span className="text-xs text-muted-foreground">or</span>
                                                  <label>
                                                    <input
                                                      type="file"
                                                      accept="image/*"
                                                      className="hidden"
                                                      onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                          const reader = new FileReader();
                                                          reader.onload = async () => {
                                                            const newUrl = reader.result as string;
                                                            setUploadingMediaId(media.id);
                                                            try {
                                                              const updatedMediaArray = lesson.media.map(m =>
                                                                m.id === media.id
                                                                  ? { ...m, url: newUrl }
                                                                  : m
                                                              );
                                                              // Save to server using existing lesson update route
                                                              await apiRequest("PATCH", `/api/dashboard/${companyId}/lessons/${lesson.id}`, {
                                                                media: updatedMediaArray
                                                              });

                                                              const updatedLessons = selectedModule.lessons.map(l =>
                                                                l.id === lesson.id
                                                                  ? { ...l, media: updatedMediaArray }
                                                                  : l
                                                              );
                                                              const updatedModules = course.modules.map(mod =>
                                                                mod.id === selectedModule.id
                                                                  ? { ...mod, lessons: updatedLessons }
                                                                  : mod
                                                              );
                                                              queryClient.setQueryData(["/api/dashboard", companyId, "courses", courseId], (old: CourseWithModules | undefined) => {
                                                                if (!old) return old;
                                                                return {
                                                                  ...old,
                                                                  modules: updatedModules
                                                                };
                                                              });
                                                              trackLessonContentEdit(lesson.id, lesson.content);
                                                              toast({ title: "Image updated", description: "Your image has been uploaded successfully." });
                                                            } catch (error) {
                                                              toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
                                                            } finally {
                                                              setUploadingMediaId(null);
                                                            }
                                                          };
                                                          reader.readAsDataURL(file);
                                                        }
                                                      }}
                                                      data-testid={`input-upload-image-${media.id}`}
                                                    />
                                                    <Button
                                                      variant="secondary"
                                                      size="sm"
                                                      className="shadow-sm cursor-pointer"
                                                      disabled={uploadingMediaId === media.id}
                                                      asChild
                                                      data-testid={`button-upload-image-${media.id}`}
                                                    >
                                                      <span>
                                                        {uploadingMediaId === media.id ? (
                                                          <>
                                                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                                            Uploading...
                                                          </>
                                                        ) : (
                                                          <>
                                                            <Upload className="h-4 w-4 mr-1.5" />
                                                            Upload new
                                                          </>
                                                        )}
                                                      </span>
                                                    </Button>
                                                  </label>
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div
                                              className="relative aspect-video bg-black"
                                              data-testid={`container-lesson-media-${media.id}`}
                                            >
                                              <iframe
                                                src={media.url}
                                                className={`w-full h-full ${hasCaption ? '' : 'rounded-lg'}`}
                                                allowFullScreen
                                                data-testid={`video-lesson-media-${media.id}`}
                                              />
                                              {isEditMode && (
                                                <button
                                                  type="button"
                                                  className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white/90 flex items-center justify-center backdrop-blur-sm transition-colors"
                                                  onClick={() => setPendingMediaDelete({ lessonId: lesson.id, mediaId: media.id })}
                                                  data-testid={`button-remove-media-${media.id}`}
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              )}
                                            </div>
                                          )}
                                          {hasCaption && (
                                            <figcaption className="text-sm text-muted-foreground p-3 text-center italic border-t">
                                              {media.caption}
                                            </figcaption>
                                          )}
                                        </figure>
                                      );
                                    };

                                    return (
                                      <div className="relative">
                                        {isEditMode ? (
                                          <BlockEditor
                                            blocks={getLessonBlocks(lesson)}
                                            onChange={(blocks) => {
                                              const newContent = JSON.stringify(blocks);
                                              trackLessonContentEdit(lesson.id, newContent);
                                            }}
                                            onMoveOutside={(index, direction) => handleMoveBlockOutside(lesson.id, index, direction)}
                                            courseTitle={course.title}
                                            moduleTitle={selectedModule.title}
                                            lessonTitle={lesson.title}
                                          />
                                        ) : (
                                          <div className="text-base leading-relaxed text-muted-foreground space-y-4">
                                            {/* Legacy View for backwards compatibility */}
                                            {lesson.content && typeof lesson.content === 'string' && !lesson.content.startsWith('[') ? (
                                              <>
                                                {paragraphs.length > 0 ? (
                                                  <>
                                                    {getMediaForPosition(0).map(renderMedia)}
                                                    {paragraphs.map((paragraph, pIndex) => (
                                                      <div key={pIndex}>
                                                        <p className="whitespace-pre-wrap">{paragraph}</p>
                                                        {getMediaForPosition(pIndex + 1).map(renderMedia)}
                                                      </div>
                                                    ))}
                                                  </>
                                                ) : lesson.media && lesson.media.length > 0 ? (
                                                  lesson.media
                                                    .slice()
                                                    .sort((a, b) => (a.placement ?? 0) - (b.placement ?? 0))
                                                    .map(renderMedia)
                                                ) : (
                                                  <p className="text-muted-foreground/50 italic">No content yet</p>
                                                )}
                                              </>
                                            ) : (
                                              /* New Block View */
                                              <div className="space-y-10">
                                                {getLessonBlocks(lesson).map((block) => (
                                                  <div key={block.id}>
                                                    {block.type === 'text' && (
                                                      <div
                                                        className="prose prose-slate max-w-none dark:prose-invert leading-relaxed"
                                                        dangerouslySetInnerHTML={{ __html: block.content.text }}
                                                      />
                                                    )}
                                                    {block.type === 'image' && (
                                                      <figure className="my-10">
                                                        <img src={block.content.url} alt={block.content.alt} className="rounded-3xl w-full shadow-2xl border border-muted-foreground/10" />
                                                        {block.content.caption && <figcaption className="text-sm text-center mt-4 italic text-muted-foreground">{block.content.caption}</figcaption>}
                                                      </figure>
                                                    )}
                                                    {block.type === 'video' && (
                                                      <div className="my-10 aspect-video w-full rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
                                                        <iframe
                                                          src={getEmbedUrl(block.content.url)}
                                                          className="w-full h-full"
                                                          allowFullScreen
                                                        />
                                                      </div>
                                                    )}
                                                    {block.type === 'quote' && (
                                                      <div className="my-10 border-l-4 border-primary pl-8 py-6 bg-primary/5 rounded-r-3xl italic shadow-sm">
                                                        <div
                                                          className="text-2xl mb-4 leading-normal prose-italic prose-slate dark:prose-invert"
                                                          dangerouslySetInnerHTML={{ __html: block.content.text }}
                                                        />
                                                        {block.content.author && <p className="text-sm font-bold uppercase tracking-wider text-primary">— {block.content.author}</p>}
                                                      </div>
                                                    )}
                                                    {block.type === 'banner' && (
                                                      <div className="my-10 p-12 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group/banner" style={{ backgroundColor: block.content.color || '#0f172a' }}>
                                                        <div className="relative z-10 max-w-2xl">
                                                          <h3 className="text-4xl font-black mb-6 tracking-tight">{block.content.title}</h3>
                                                          <p className="text-xl opacity-90 leading-relaxed font-medium">{block.content.subtitle}</p>
                                                        </div>
                                                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl opacity-50 group-hover:scale-110 transition-transform duration-1000" />
                                                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full -ml-20 -mb-20 blur-2xl opacity-30" />
                                                      </div>
                                                    )}
                                                    {block.type === 'grid' && (
                                                      <div className="my-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                        {(block.content.items || []).map((item: any, i: number) => (
                                                          <Card key={i} className="border-none shadow-xl bg-card/60 backdrop-blur-sm border border-white/5 hover:translate-y-[-4px] transition-transform duration-300">
                                                            <CardContent className="p-8">
                                                              <h4 className="font-bold text-xl mb-4 text-primary">{item.title}</h4>
                                                              <p className="text-muted-foreground leading-relaxed">{item.content}</p>
                                                            </CardContent>
                                                          </Card>
                                                        ))}
                                                      </div>
                                                    )}
                                                    {block.type === 'tabs' && (
                                                      <div className="my-10">
                                                        <Tabs defaultValue="v-tab-0" className="w-full">
                                                          <TabsList className="bg-muted/30 p-1 rounded-2xl h-auto gap-1 border border-muted-foreground/10 overflow-x-auto no-scrollbar">
                                                            {(block.content.tabs || []).map((tab: any, i: number) => (
                                                              <TabsTrigger key={i} value={`v-tab-${i}`} className="px-8 py-3 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-lg transition-all font-semibold">
                                                                {tab.label || `Tab ${i + 1}`}
                                                              </TabsTrigger>
                                                            ))}
                                                          </TabsList>
                                                          {(block.content.tabs || []).map((tab: any, i: number) => (
                                                            <TabsContent key={i} value={`v-tab-${i}`} className="mt-8 p-10 border rounded-[2rem] bg-muted/10 animate-in fade-in zoom-in-95 duration-500 shadow-sm">
                                                              <p className="whitespace-pre-wrap leading-relaxed text-lg">{tab.content}</p>
                                                            </TabsContent>
                                                          ))}
                                                        </Tabs>
                                                      </div>
                                                    )}
                                                    {block.type === 'flip' && (
                                                      <div className="my-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
                                                        <div className="lg:col-span-2 perspective-1000 group/flip cursor-pointer h-80">
                                                          <div className="relative w-full h-full transition-all duration-700 preserve-3d group-hover/flip:rotate-y-180">
                                                            <Card className="absolute inset-0 backface-hidden flex items-center justify-center p-8 text-center border-2 border-primary/10 bg-muted/30 shadow-lg">
                                                              <p className="text-2xl font-black tracking-tight italic text-primary/80">{block.content.front}</p>
                                                            </Card>
                                                            <Card className="absolute inset-0 backface-hidden rotate-y-180 flex items-center justify-center p-8 text-center bg-primary text-primary-foreground shadow-2xl">
                                                              <p className="text-xl leading-relaxed font-medium">{block.content.back}</p>
                                                            </Card>
                                                          </div>
                                                        </div>
                                                        <div className="lg:col-span-3 space-y-4">
                                                          <div className="flex items-center gap-2 text-primary">
                                                            <Sparkles className="h-5 w-5" />
                                                            <span className="font-bold uppercase tracking-widest text-xs">Interactive Insight</span>
                                                          </div>
                                                          <p className="text-lg text-muted-foreground leading-relaxed italic">"Hover over the card to reveal the secret! These 'Flip Cards' are great for definitions, quiz questions, or hidden facts."</p>
                                                        </div>
                                                      </div>
                                                    )}
                                                    {block.type === 'quiz' && (
                                                      <div className="my-10 p-10 border rounded-[2.5rem] bg-muted/20 shadow-2xl relative overflow-hidden border-white/10 ring-1 ring-black/5">
                                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                                          <HelpCircle className="h-24 w-24" />
                                                        </div>
                                                        <h4 className="text-2xl font-black mb-8 flex items-center gap-4 relative z-10">
                                                          <div className="bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg ring-4 ring-primary/20">
                                                            <HelpCircle className="h-6 w-6" />
                                                          </div>
                                                          {block.content.question}
                                                        </h4>
                                                        <div className="space-y-4 relative z-10">
                                                          {(block.content.options || []).map((option: string, i: number) => (
                                                            <Button
                                                              key={i}
                                                              variant="outline"
                                                              className="w-full justify-start h-auto py-5 px-8 rounded-2xl hover:bg-white hover:shadow-xl hover:border-primary/50 transition-all text-left bg-background/50 border-muted group"
                                                              onClick={() => {
                                                                if (i === block.content.correctAnswer) {
                                                                  toast({ title: "Correct!", description: "Spot on! You've got this.", className: "bg-green-600 text-white border-none shadow-2xl" });
                                                                } else {
                                                                  toast({ title: "Keep trying", description: "Not quite right. Try another option!", variant: "destructive", className: "shadow-2xl" });
                                                                }
                                                              }}
                                                            >
                                                              <div className="w-10 h-10 rounded-xl border-2 border-muted-foreground/20 flex items-center justify-center mr-6 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all font-bold text-lg">
                                                                {String.fromCharCode(65 + i)}
                                                              </div>
                                                              <span className="text-lg font-medium">{option}</span>
                                                            </Button>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                </section>
                              ))}
                              {isEditMode && (
                                <div className="pt-4 border-t border-dashed border-muted-foreground/20">
                                  <Button
                                    variant="outline"
                                    className="w-full h-12 border-dashed text-muted-foreground hover:text-primary hover:border-primary/50 transition-all gap-2 bg-muted/5 hover:bg-muted/10"
                                    onClick={() => addLessonMutation.mutate(selectedModule.id)}
                                    disabled={addLessonMutation.isPending}
                                  >
                                    {addLessonMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Plus className="h-4 w-4" />
                                    )}
                                    Add New Lesson
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-6">
                              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-muted-foreground/10">
                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No lessons in this module yet</p>
                              </div>
                              {isEditMode && (
                                <Button
                                  variant="outline"
                                  className="w-full h-12 border-dashed text-muted-foreground hover:text-primary hover:border-primary/50 transition-all gap-2 bg-muted/5 hover:bg-muted/10"
                                  onClick={() => addLessonMutation.mutate(selectedModule.id)}
                                  disabled={addLessonMutation.isPending}
                                >
                                  {addLessonMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                  Add Your First Lesson
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Module Quiz */}
                          <QuizEditor
                            quiz={selectedModule.quiz || null}
                            moduleId={selectedModule.id}
                            isEditMode={isEditMode}
                            onSave={async (updates) => {
                              if (selectedModule.quiz) {
                                await saveQuizMutation.mutateAsync({
                                  quizId: selectedModule.quiz.id,
                                  updates
                                });
                              }
                            }}
                            onGenerate={async () => {
                              await generateQuizMutation.mutateAsync(selectedModule.id);
                            }}
                            isGenerating={generateQuizMutation.isPending}
                          />
                        </article>
                      );
                    })()}

                  </>
                ) : (
                  <div className="text-center py-16 text-muted-foreground">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-1">No modules yet</p>
                    <p className="text-sm">Generate content to add modules and lessons</p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Section */}
            {activeTab === "settings" && (
              <div className="max-w-2xl mx-auto p-6 pb-24 space-y-8">
                {/* Course Details Section */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Course Details</h2>
                    <p className="text-sm text-muted-foreground">Basic information about your course</p>
                  </div>
                  <Separator />
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Appearance & Branding</Label>
                      <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-muted-foreground/10">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Primary Color</Label>
                          <div className="flex gap-2">
                            <div
                              className="h-9 w-9 rounded-lg border border-muted-foreground/20 shrink-0"
                              style={{ backgroundColor: course.theme?.primaryColor || "#0f172a" }}
                            />
                            <Input
                              type="text"
                              value={course.theme?.primaryColor || "#0f172a"}
                              onChange={(e) => updateCourseMutation.mutate({
                                theme: {
                                  headingColor: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  bodyTextColor: "#334155",
                                  linkColor: "#2563eb",
                                  ...course.theme,
                                  primaryColor: e.target.value
                                }
                              })}
                              className="h-9 font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Heading Color</Label>
                          <div className="flex gap-2">
                            <div
                              className="h-9 w-9 rounded-lg border border-muted-foreground/20 shrink-0"
                              style={{ backgroundColor: course.theme?.headingColor || "#0f172a" }}
                            />
                            <Input
                              type="text"
                              value={course.theme?.headingColor || "#0f172a"}
                              onChange={(e) => updateCourseMutation.mutate({
                                theme: {
                                  primaryColor: "#0f172a",
                                  backgroundColor: "#f8fafc",
                                  bodyTextColor: "#334155",
                                  linkColor: "#2563eb",
                                  ...course.theme,
                                  headingColor: e.target.value
                                }
                              })}
                              className="h-9 font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium">Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter course title"
                        className="h-11"
                        data-testid="input-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe what students will learn..."
                        className="min-h-[120px] resize-none"
                        data-testid="input-description"
                      />
                    </div>
                  </div>
                </section>

                {/* Course Thumbnail Section */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Course Thumbnail</h2>
                    <p className="text-sm text-muted-foreground">The cover image displayed for your course</p>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="relative w-full aspect-video rounded-lg border bg-muted/30 overflow-hidden">
                      {coverImage ? (
                        <img
                          src={coverImage}
                          alt="Course thumbnail"
                          className="w-full h-full object-cover"
                          data-testid="img-course-thumbnail"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                          <p className="text-sm">No thumbnail set</p>
                        </div>
                      )}
                      {isGeneratingImage && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                            <p className="text-sm text-muted-foreground">Generating image...</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="input-thumbnail-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGeneratingImage || isSaving}
                        data-testid="button-upload-thumbnail"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || isSaving}
                        data-testid="button-generate-thumbnail"
                      >
                        {isGeneratingImage ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Generate with AI
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload your own image (max 5MB) or generate one using AI based on your course title.
                    </p>
                  </div>
                </section>

                {/* Pricing Section */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Pricing</h2>
                    <p className="text-sm text-muted-foreground">Configure how students access your course</p>
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                      <div className="space-y-0.5">
                        <Label htmlFor="is-free" className="text-sm font-medium">Free Access</Label>
                        <p className="text-xs text-muted-foreground">Allow anyone to access this course for free</p>
                      </div>
                      <Switch
                        id="is-free"
                        checked={isFree}
                        onCheckedChange={setIsFree}
                        data-testid="switch-free"
                      />
                    </div>

                    <AnimatePresence>
                      {!isFree && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="price" className="text-sm font-medium">Price (USD)</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                                $
                              </span>
                              <Input
                                id="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="pl-8 h-11"
                                placeholder="0.00"
                                data-testid="input-price"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                {/* Danger Zone */}
                <section className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </h2>
                    <p className="text-sm text-muted-foreground">Irreversible actions for this course</p>
                  </div>
                  <Separator className="bg-destructive/20" />
                  <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">Delete this course</p>
                        <p className="text-xs text-muted-foreground">
                          Permanently remove this course and all its content
                        </p>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" data-testid="button-delete-course">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <span className="font-semibold">"{course.title}"</span> and all {course.modules.length} modules with {totalLessons} lessons. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteCourseMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, delete course
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* Students/Analytics Section */}
            {activeTab === "students" && (
              <div className="max-w-4xl mx-auto p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.totalStudents || 0}</p>
                        <p className="text-xs text-muted-foreground">Students</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">${analytics?.totalEarnings || "0.00"}</p>
                        <p className="text-xs text-muted-foreground">Course Earnings</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{analytics?.paidStudents || 0}</p>
                        <p className="text-xs text-muted-foreground">Paid Enrollments</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Students List */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Enrolled Students</h2>
                  </div>

                  {analyticsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : analytics?.students && analytics.students.length > 0 ? (
                    <div className="border rounded-lg divide-y">
                      {analytics.students.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-4 p-4"
                          data-testid={`student-row-${student.id}`}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={student.profilePicUrl || undefined} alt={student.username} />
                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                              {student.username?.slice(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{student.username}</p>
                            <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {student.paidAmount ? (
                              <>
                                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20">
                                  Paid ${parseFloat(student.paidAmount).toFixed(2)}
                                </Badge>
                                {student.paidAt && (
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(student.paidAt).toLocaleDateString()}
                                  </p>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge variant="secondary">Free Access</Badge>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(student.grantedAt).toLocaleDateString()}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 border rounded-lg bg-muted/30">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
                      <p className="text-lg font-medium mb-1">No students yet</p>
                      <p className="text-sm text-muted-foreground">
                        Students will appear here once they enroll in your course
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )}
          </main>

          {/* Floating Save Button */}
          <AnimatePresence>
            {((isEditMode && isDirty) || (activeTab === "settings" && course && (
              title !== course.title ||
              description !== course.description ||
              isFree !== course.isFree ||
              price !== course.price
            ))) && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "fixed top-[60px] z-[9998] transition-all duration-300",
                    isMobile ? "left-4" : "left-1/2 -translate-x-1/2"
                  )}
                  data-testid="floating-save-button"
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="shadow-xl"
                    onClick={activeTab === "settings" ? () => updateCourseMutation.mutate({
                      title: title || course.title,
                      description: description || course.description,
                      isFree,
                      price: isFree ? "0" : price,
                    }) : handleSaveChanges}
                    disabled={isSaving}
                    data-testid="button-save-changes"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        {/* Unsaved Changes Confirmation Dialog */}
        <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to save your changes before leaving? Your changes will be lost if you don't save them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDialogCancel}>
                Cancel
              </AlertDialogCancel>
              <Button
                variant="outline"
                onClick={handleDialogDiscard}
                data-testid="button-discard-changes"
              >
                Discard
              </Button>
              <AlertDialogAction
                onClick={handleDialogSave}
                data-testid="button-confirm-save"
              >
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Media Confirmation Dialog */}
        <AlertDialog open={!!pendingMediaDelete} onOpenChange={(open) => !open && setPendingMediaDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this image?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this image? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (pendingMediaDelete) {
                    removeMediaMutation.mutate(pendingMediaDelete);
                    setPendingMediaDelete(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-media"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Media Dialog */}
        <MediaDialog
          open={mediaDialogOpen}
          onOpenChange={setMediaDialogOpen}
          lessonTitle={mediaDialogLessonTitle}
          onAddImage={handleAddImage}
          onAddVideo={handleAddVideo}
          onGenerateImage={handleGenerateLessonImage}
          isGenerating={generatingMediaForLesson === mediaDialogLessonId}
        />

        {/* Image Lightbox */}
        <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-0 bg-transparent border-0 shadow-none overflow-visible [&>button]:hidden">
            {lightboxImage && (
              <div className="relative">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.alt}
                  className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                  data-testid="img-lightbox"
                />
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-lg"
                  data-testid="button-close-lightbox"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
}
