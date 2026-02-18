import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { TTSPlayer } from "@/components/tts-player";
import QuizViewer from "@/components/QuizViewer";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Check,
  ArrowLeft,
  Layers,
  CircleCheck,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import type { CourseWithModules, Lesson, MediaItem, Quiz } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface CourseReaderProps {
  course: CourseWithModules;
  experienceId?: string;
  initialLessonId?: string;
}

interface HighlightedContentProps {
  content: string;
  currentWordIndex: number;
  isPlaying: boolean;
  serverWords?: string[];
  media?: MediaItem[];
}

function InlineMediaImage({ media }: { media: MediaItem }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="my-6"
      data-testid={`figure-inline-media-${media.id}`}
    >
      {media.type === "image" ? (
        <img
          src={media.url}
          alt={media.alt || "Lesson illustration"}
          className="w-full max-h-[400px] object-contain"
          data-testid={`img-inline-media-${media.id}`}
        />
      ) : media.type === "video" ? (
        <div className="aspect-video bg-black">
          <video
            src={media.url}
            controls
            className="w-full h-full"
            data-testid={`video-inline-media-${media.id}`}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      ) : null}
      {media.caption && (
        <figcaption
          className="text-sm text-muted-foreground p-3 text-center italic border-t"
          data-testid={`caption-inline-media-${media.id}`}
        >
          {media.caption}
        </figcaption>
      )}
    </motion.figure>
  );
}

function HighlightedContent({ content, currentWordIndex, isPlaying, serverWords, media }: HighlightedContentProps) {
  const highlightRef = useRef<HTMLSpanElement>(null);
  const paragraphs = useMemo(() => content.split("\n\n"), [content]);

  useEffect(() => {
    if (isPlaying && highlightRef.current && currentWordIndex >= 0) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentWordIndex, isPlaying]);

  const wordMapping = useMemo(() => {
    if (!serverWords || serverWords.length === 0) {
      return { paragraphWords: [], serverToOriginal: new Map<number, { pIdx: number; wIdx: number }>() };
    }

    const paragraphWords: string[][] = paragraphs.map(p =>
      p.split(/\s+/).filter(w => w.length > 0)
    );

    const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

    const originalFlat: { pIdx: number; wIdx: number; word: string; charStart: number; charEnd: number }[] = [];
    let charPos = 0;
    for (let pIdx = 0; pIdx < paragraphWords.length; pIdx++) {
      for (let wIdx = 0; wIdx < paragraphWords[pIdx].length; wIdx++) {
        const word = paragraphWords[pIdx][wIdx];
        const normalized = normalizeText(word);
        originalFlat.push({
          pIdx,
          wIdx,
          word,
          charStart: charPos,
          charEnd: charPos + normalized.length
        });
        charPos += normalized.length;
      }
    }

    const serverFlat: { idx: number; charStart: number; charEnd: number }[] = [];
    charPos = 0;
    for (let i = 0; i < serverWords.length; i++) {
      const normalized = normalizeText(serverWords[i]);
      serverFlat.push({
        idx: i,
        charStart: charPos,
        charEnd: charPos + normalized.length
      });
      charPos += normalized.length;
    }

    const serverToOriginal = new Map<number, { pIdx: number; wIdx: number }>();

    for (const server of serverFlat) {
      const serverMid = (server.charStart + server.charEnd) / 2;

      let bestMatch = originalFlat[0];
      let bestDistance = Infinity;

      for (const orig of originalFlat) {
        if (serverMid >= orig.charStart && serverMid < orig.charEnd) {
          bestMatch = orig;
          break;
        }
        const origMid = (orig.charStart + orig.charEnd) / 2;
        const distance = Math.abs(serverMid - origMid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = orig;
        }
      }

      if (bestMatch) {
        serverToOriginal.set(server.idx, { pIdx: bestMatch.pIdx, wIdx: bestMatch.wIdx });
      }
    }

    return { paragraphWords, serverToOriginal };
  }, [serverWords, paragraphs]);

  const currentHighlight = useMemo(() => {
    if (currentWordIndex < 0 || !wordMapping.serverToOriginal.has(currentWordIndex)) {
      return null;
    }
    return wordMapping.serverToOriginal.get(currentWordIndex) || null;
  }, [currentWordIndex, wordMapping.serverToOriginal]);

  const shouldHighlight = isPlaying && serverWords && serverWords.length > 0;

  const getMediaForPosition = (afterParagraphIndex: number) => {
    if (!media || media.length === 0) return [];
    return media.filter(m => m.placement === afterParagraphIndex);
  };

  if (shouldHighlight) {
    return (
      <div className="text-base leading-[1.8] text-foreground/85 space-y-5">
        {getMediaForPosition(0).map((m) => (
          <InlineMediaImage key={m.id} media={m} />
        ))}
        {wordMapping.paragraphWords.map((words, pIdx) => (
          <div key={pIdx}>
            <p>
              {words.map((word, wIdx) => {
                const isCurrent = currentHighlight?.pIdx === pIdx && currentHighlight?.wIdx === wIdx;
                const isLast = wIdx === words.length - 1;
                return (
                  <span key={wIdx}>
                    <span
                      ref={isCurrent ? highlightRef : null}
                      className={cn(
                        "transition-colors duration-75 rounded-sm",
                        isCurrent ? "bg-primary/25 text-primary" : "bg-transparent"
                      )}
                    >
                      {word}
                    </span>
                    {!isLast && ' '}
                  </span>
                );
              })}
            </p>
            {getMediaForPosition(pIdx + 1).map((m) => (
              <InlineMediaImage key={m.id} media={m} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-base leading-[1.8] text-foreground/85 space-y-5">
      {getMediaForPosition(0).map((m) => (
        <InlineMediaImage key={m.id} media={m} />
      ))}
      {paragraphs.map((paragraph, pIndex) => (
        <div key={pIndex}>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pIndex * 0.05, duration: 0.3 }}
          >
            {paragraph}
          </motion.p>
          {getMediaForPosition(pIndex + 1).map((m) => (
            <InlineMediaImage key={m.id} media={m} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CourseReader({ course, experienceId, initialLessonId }: CourseReaderProps) {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isTTSPlaying, setIsTTSPlaying] = useState(false);
  const [serverWords, setServerWords] = useState<string[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());

  const allItems = useMemo(() => {
    const items: ({ type: 'lesson'; data: Lesson } | { type: 'quiz'; data: Quiz })[] = [];
    course.modules.forEach(m => {
      m.lessons.forEach(l => items.push({ type: 'lesson', data: l }));
      if (m.quiz) items.push({ type: 'quiz', data: m.quiz });
    });
    return items;
  }, [course.modules]);

  const currentIndex = useMemo(() => {
    if (currentQuiz) {
      return allItems.findIndex((item) => item.type === 'quiz' && item.data.id === currentQuiz.id);
    }
    if (currentLesson) {
      return allItems.findIndex((item) => item.type === 'lesson' && item.data.id === currentLesson.id);
    }
    return -1;
  }, [currentLesson, currentQuiz, allItems]);

  const progressPercent = allItems.length > 0 ? ((currentIndex + 1) / allItems.length) * 100 : 0;

  useEffect(() => {
    if (initialLessonId) {
      const lesson = allItems.find((item) => item.type === 'lesson' && item.data.id === initialLessonId);
      if (lesson && lesson.type === 'lesson') {
        setCurrentLesson(lesson.data);
        return;
      }
    }
    if (allItems.length > 0 && !currentLesson && !currentQuiz) {
      const first = allItems[0];
      if (first.type === 'lesson') setCurrentLesson(first.data);
      else setCurrentQuiz(first.data);
    }
  }, [initialLessonId, allItems.length]);

  const goToLesson = (lesson: Lesson) => {
    if (currentLesson) {
      setCompletedLessons(prev => new Set(prev).add(currentLesson.id));
    }
    setCurrentLesson(lesson);
    setCurrentQuiz(null);
    setIsSidebarOpen(false);
    setCurrentWordIndex(-1);
    setIsTTSPlaying(false);
    setServerWords([]);
  };

  const goToQuiz = (quiz: Quiz) => {
    if (currentLesson) {
      setCompletedLessons(prev => new Set(prev).add(currentLesson.id));
    }
    setCurrentQuiz(quiz);
    setCurrentLesson(null);
    setIsSidebarOpen(false);
    setCurrentWordIndex(-1);
    setIsTTSPlaying(false);
    setServerWords([]);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevItem = allItems[currentIndex - 1];
      if (prevItem.type === 'lesson') goToLesson(prevItem.data);
      else goToQuiz(prevItem.data);
    }
  };

  const goToNext = () => {
    if (currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1];
      if (nextItem.type === 'lesson') goToLesson(nextItem.data);
      else goToQuiz(nextItem.data);
    }
  };

  const getModuleForLesson = (lesson: Lesson) => {
    return course.modules.find((m) => m.id === lesson.moduleId);
  };

  const handleWordIndexChange = useCallback((index: number) => {
    setCurrentWordIndex(index);
  }, []);

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsTTSPlaying(playing);
    if (!playing) {
      setCurrentWordIndex(-1);
    }
  }, []);

  const currentModule = currentLesson ? getModuleForLesson(currentLesson) : null;
  const moduleIndex = currentModule ? course.modules.findIndex(m => m.id === currentModule.id) : 0;
  const lessonIndexInModule = currentModule && currentLesson
    ? currentModule.lessons.findIndex(l => l.id === currentLesson.id)
    : 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-background">
      <div className="p-5 border-b">
        <h2 className="font-semibold text-lg leading-snug mb-2" data-testid="text-course-title">
          {course.title}
        </h2>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{course.modules.length} modules</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span>{course.modules.reduce((acc, m) => acc + m.lessons.length, 0)} lessons</span>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-1.5" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-4 space-y-6" data-testid="nav-course-sidebar">
          {course.modules.map((module, mIndex) => (
            <div key={module.id}>
              <div className="flex items-start gap-3 px-2 mb-3">
                <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary text-sm font-semibold shrink-0">
                  {mIndex + 1}
                </div>
                <span className="text-sm font-medium text-foreground" data-testid={`text-sidebar-module-${module.id}`}>
                  {module.title}
                </span>
              </div>
              <ul className="space-y-1">
                {module.lessons.map((lesson, lIndex) => {
                  const isActive = currentLesson?.id === lesson.id;
                  const isCompleted = completedLessons.has(lesson.id);
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => goToLesson(lesson)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        data-testid={`button-lesson-${lesson.id}`}
                      >
                        <span className={cn(
                          "flex items-center justify-center h-5 w-5 rounded-full text-xs shrink-0",
                          isActive ? "bg-primary-foreground/20" : isCompleted ? "bg-primary/20 text-primary" : "bg-muted"
                        )}>
                          {isCompleted && !isActive ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <span className="tabular-nums">{lIndex + 1}</span>
                          )}
                        </span>
                        <span className="flex-1 leading-snug">{lesson.title}</span>
                      </button>
                    </li>
                  );
                })}
                {module.quiz && (
                  <li>
                    <button
                      onClick={() => goToQuiz(module.quiz!)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-left transition-all mt-1",
                        currentQuiz?.id === module.quiz.id
                          ? "bg-primary text-primary-foreground shadow-sm font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      data-testid={`button-quiz-${module.quiz.id}`}
                    >
                      <span className={cn(
                        "flex items-center justify-center h-5 w-5 rounded-full text-xs shrink-0",
                        currentQuiz?.id === module.quiz.id ? "bg-primary-foreground/20" : completedQuizzes.has(module.quiz.id) ? "bg-primary/20 text-primary" : "bg-muted"
                      )}>
                        {completedQuizzes.has(module.quiz.id) && currentQuiz?.id !== module.quiz.id ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <HelpCircle className="h-3 w-3" />
                        )}
                      </span>
                      <span className="flex-1 leading-snug">Module Quiz</span>
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background" data-testid="container-course-reader">
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[320px] border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <header className="shrink-0 flex items-center gap-4 px-4 py-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href={experienceId ? `/experiences/${experienceId}` : "/"}>
          <Button
            variant="ghost"
            size="icon"
            data-testid="link-back-to-library"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSidebarOpen(true)}
          className="gap-2"
          data-testid="button-open-modules"
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Modules</span>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {currentModule ? `Module ${moduleIndex + 1}: ${currentModule.title}` : course.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
            <CircleCheck className="h-3.5 w-3.5 text-primary" />
            <span className="tabular-nums font-medium">{currentIndex + 1}</span>
            <span className="text-muted-foreground">/ {allItems.length}</span>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <AnimatePresence mode="wait">
          <motion.article
            key={currentLesson?.id || currentQuiz?.id || 'empty'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="px-5 py-8 sm:px-8 sm:py-10"
          >
            {currentLesson ? (
              <>
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                    <BookOpen className="h-4 w-4" />
                    <span>Lesson {moduleIndex + 1}.{lessonIndexInModule + 1}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground" data-testid="text-lesson-heading">
                    {currentLesson.title}
                  </h1>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <HighlightedContent
                    content={currentLesson.content}
                    currentWordIndex={currentWordIndex}
                    isPlaying={isTTSPlaying}
                    serverWords={serverWords}
                    media={currentLesson.media}
                  />
                </motion.div>
              </>
            ) : currentQuiz ? (
              <QuizViewer
                quiz={currentQuiz}
                onComplete={() => {
                  setCompletedQuizzes(prev => new Set(prev).add(currentQuiz.id));
                  goToNext();
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg text-muted-foreground">Select a lesson to begin</p>
              </div>
            )}
          </motion.article>
        </AnimatePresence>
      </ScrollArea>

      <footer className="sticky bottom-0 z-50 shrink-0 px-4 py-3 border-t bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={goToPrevious}
            disabled={currentIndex <= 0}
            className="gap-2 shrink-0"
            data-testid="button-previous-lesson"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {experienceId && currentLesson && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex-1 max-w-sm"
            >
              <TTSPlayer
                lessonId={currentLesson.id}
                experienceId={experienceId}
                content={currentLesson.content}
                onWordIndexChange={handleWordIndexChange}
                onPlayingChange={handlePlayingChange}
                onWordTimingsLoaded={setServerWords}
                compact
              />
            </motion.div>
          )}

          {!currentLesson && !currentQuiz && <div className="flex-1 px-4 hidden sm:block">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>}

          {currentIndex < allItems.length - 1 ? (
            <Button onClick={goToNext} className="gap-2 shrink-0" data-testid="button-next-lesson">
              <span className="hidden sm:inline">Next</span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="default" className="gap-2 shrink-0 bg-green-600 hover:bg-green-700" data-testid="button-complete-course">
              <Check className="h-4 w-4" />
              <span className="hidden sm:inline">Complete Course</span>
              <span className="sm:hidden">Complete</span>
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
