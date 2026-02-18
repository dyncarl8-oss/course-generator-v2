import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { CourseWithModules } from "@shared/schema";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CourseEditorProps {
  course: CourseWithModules;
  onSave: (updates: Partial<CourseWithModules>) => Promise<void>;
  onUpdateModule: (moduleId: string, title: string) => Promise<void>;
  onUpdateLesson: (lessonId: string, title: string, content: string) => Promise<void>;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onTogglePublish: () => Promise<void>;
  isSaving: boolean;
}

export function CourseEditor({
  course,
  onSave,
  onUpdateModule,
  onUpdateLesson,
  onDeleteModule,
  onDeleteLesson,
  onTogglePublish,
  isSaving,
}: CourseEditorProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description || "");
  const [isFree, setIsFree] = useState(course.isFree);
  const [price, setPrice] = useState(course.price || "0");
  const [editingModule, setEditingModule] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<string | null>(null);
  const [openModules, setOpenModules] = useState<string[]>(course.modules.map(m => m.id));
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { toast } = useToast();

  const scrollToModule = (moduleId: string) => {
    if (!openModules.includes(moduleId)) {
      setOpenModules(prev => [...prev, moduleId]);
    }
    setTimeout(() => {
      moduleRefs.current[moduleId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleSaveCourse = async () => {
    await onSave({
      title,
      description,
      isFree,
      price: isFree ? "0" : price,
    });
    toast({
      title: "Course saved",
      description: "Your changes have been saved successfully.",
    });
  };

  return (
    <div className="space-y-6" data-testid="container-course-editor">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back-to-dashboard">
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">Edit Course</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onTogglePublish}
            disabled={isSaving}
            data-testid="button-toggle-publish"
          >
            {course.published ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </>
            )}
          </Button>
          <Button onClick={handleSaveCourse} disabled={isSaving} data-testid="button-save-changes">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Course title"
                  data-testid="input-course-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Course description"
                  className="min-h-24 resize-none"
                  data-testid="input-course-description"
                />
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is-free">Free course</Label>
                  <Switch
                    id="is-free"
                    checked={isFree}
                    onCheckedChange={setIsFree}
                    data-testid="switch-is-free"
                  />
                </div>
                {!isFree && (
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="pl-7"
                        data-testid="input-course-price"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-semibold">{course.modules.length}</p>
                  <p className="text-xs text-muted-foreground">Modules</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-semibold">
                    {course.modules.reduce((acc, m) => acc + m.lessons.length, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lessons</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Course Content</CardTitle>
            </CardHeader>
            <div className="sticky top-0 z-10 bg-card border-b px-6 py-2">
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {course.modules.map((module, moduleIndex) => (
                    <Button
                      key={module.id}
                      variant={openModules.includes(module.id) ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() => scrollToModule(module.id)}
                      data-testid={`button-jump-module-${module.id}`}
                    >
                      Module {moduleIndex + 1}
                    </Button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
            <CardContent className="pt-4">
              <Accordion 
                type="multiple" 
                value={openModules}
                onValueChange={setOpenModules}
                className="space-y-2" 
                data-testid="accordion-modules"
              >
                {course.modules.map((module, moduleIndex) => (
                  <div 
                    key={module.id} 
                    ref={(el) => { moduleRefs.current[module.id] = el; }}
                  >
                  <AccordionItem
                    value={module.id}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {moduleIndex + 1}
                        </span>
                        {editingModule === module.id ? (
                          <Input
                            value={module.title}
                            onChange={(e) => onUpdateModule(module.id, e.target.value)}
                            onBlur={() => setEditingModule(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingModule(null);
                            }}
                            className="h-8 flex-1"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`input-module-title-${module.id}`}
                          />
                        ) : (
                          <span
                            className="font-medium text-left flex-1 cursor-text"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModule(module.id);
                            }}
                            data-testid={`text-module-title-${module.id}`}
                          >
                            {module.title}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4">
                      <div className="space-y-3 ml-9">
                        {module.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="border rounded-lg p-3 space-y-2 bg-muted/30"
                            data-testid={`container-lesson-${lesson.id}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs text-muted-foreground font-medium">
                                  {moduleIndex + 1}.{lessonIndex + 1}
                                </span>
                                {editingLesson === lesson.id ? (
                                  <Input
                                    value={lesson.title}
                                    onChange={(e) =>
                                      onUpdateLesson(lesson.id, e.target.value, lesson.content)
                                    }
                                    onBlur={() => setEditingLesson(null)}
                                    className="h-7 flex-1 text-sm"
                                    autoFocus
                                    data-testid={`input-lesson-title-${lesson.id}`}
                                  />
                                ) : (
                                  <span
                                    className="text-sm font-medium cursor-text flex-1"
                                    onClick={() => setEditingLesson(lesson.id)}
                                    data-testid={`text-lesson-title-${lesson.id}`}
                                  >
                                    {lesson.title}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => onDeleteLesson(lesson.id)}
                                data-testid={`button-delete-lesson-${lesson.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <Textarea
                              value={lesson.content}
                              onChange={(e) =>
                                onUpdateLesson(lesson.id, lesson.title, e.target.value)
                              }
                              className="text-sm min-h-20 resize-none"
                              placeholder="Lesson content..."
                              data-testid={`textarea-lesson-content-${lesson.id}`}
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  </div>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
