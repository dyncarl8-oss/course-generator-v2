import { useState, useEffect } from "react";
import { type Quiz, type QuizQuestion } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface QuizEditorProps {
    quiz: Quiz | null;
    moduleId: string;
    isEditMode: boolean;
    onSave: (quiz: Partial<Quiz>) => Promise<void>;
    onGenerate: () => Promise<void>;
    isGenerating?: boolean;
}

export default function QuizEditor({
    quiz,
    moduleId,
    isEditMode,
    onSave,
    onGenerate,
    isGenerating = false,
}: QuizEditorProps) {
    const [localQuiz, setLocalQuiz] = useState<Partial<Quiz> | null>(quiz);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLocalQuiz(quiz);
    }, [quiz]);

    if (!localQuiz && !isEditMode) {
        return null;
    }

    const handleAddQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: uuidv4(),
            question: "New Question",
            options: ["Option 1", "Option 2", "Option 3", "Option 4"],
            correctAnswer: 0,
            explanation: "",
        };

        const updatedQuiz = {
            ...(localQuiz || { moduleId, title: "Module Quiz", questions: [] }),
            questions: [...(localQuiz?.questions || []), newQuestion],
        };
        setLocalQuiz(updatedQuiz);
    };

    const handleRemoveQuestion = (questionId: string) => {
        if (!localQuiz) return;
        const updatedQuiz = {
            ...localQuiz,
            questions: localQuiz.questions?.filter((q) => q.id !== questionId),
        };
        setLocalQuiz(updatedQuiz);
    };

    const handleUpdateQuestion = (questionId: string, updates: Partial<QuizQuestion>) => {
        if (!localQuiz) return;
        const updatedQuiz = {
            ...localQuiz,
            questions: localQuiz.questions?.map((q) =>
                q.id === questionId ? { ...q, ...updates } : q
            ),
        };
        setLocalQuiz(updatedQuiz);
    };

    const handleSave = async () => {
        if (!localQuiz) return;
        setIsSaving(true);
        try {
            await onSave(localQuiz);
        } finally {
            setIsSaving(false);
        }
    };

    if (!localQuiz && isEditMode) {
        return (
            <Card className="mt-12 border-dashed bg-muted/30">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <HelpCircle className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                    <h3 className="text-lg font-medium mb-1">No Quiz for this Module</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Add a quiz to help students test their knowledge of this module.
                    </p>
                    <div className="flex gap-3">
                        <Button onClick={handleAddQuestion} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Create Manually
                        </Button>
                        <Button onClick={onGenerate} size="sm" disabled={isGenerating}>
                            {isGenerating ? "Generating..." : "Generate with AI"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="mt-12 space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        Module Quiz
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Test comprehension with multiple-choice questions
                    </p>
                </div>
                {isEditMode && (
                    <Button onClick={handleSave} disabled={isSaving} size="sm">
                        {isSaving ? "Saving..." : "Save Quiz Changes"}
                    </Button>
                )}
            </div>

            <Separator />

            <div className="space-y-6">
                {localQuiz?.questions?.map((q, index) => (
                    <Card key={q.id} className="relative group overflow-hidden">
                        {isEditMode && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveQuestion(q.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5 shrink-0">
                                    {index + 1}
                                </span>
                                {isEditMode ? (
                                    <Input
                                        value={q.question}
                                        onChange={(e) => handleUpdateQuestion(q.id, { question: e.target.value })}
                                        className="font-medium text-base border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
                                        placeholder="Enter question..."
                                    />
                                ) : (
                                    <CardTitle className="text-base font-semibold leading-snug pt-0.5">
                                        {q.question}
                                    </CardTitle>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <RadioGroup
                                value={q.correctAnswer.toString()}
                                onValueChange={(val) =>
                                    isEditMode && handleUpdateQuestion(q.id, { correctAnswer: parseInt(val) })
                                }
                                className="space-y-2"
                            >
                                {q.options.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center space-x-3 group/option">
                                        <RadioGroupItem
                                            value={optIndex.toString()}
                                            id={`q-${q.id}-opt-${optIndex}`}
                                            disabled={!isEditMode}
                                        />
                                        {isEditMode ? (
                                            <Input
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...q.options];
                                                    newOptions[optIndex] = e.target.value;
                                                    handleUpdateQuestion(q.id, { options: newOptions });
                                                }}
                                                className="h-9 py-1 px-2 text-sm bg-muted/50 border-none focus-visible:ring-1"
                                                placeholder={`Option ${optIndex + 1}`}
                                            />
                                        ) : (
                                            <Label
                                                htmlFor={`q-${q.id}-opt-${optIndex}`}
                                                className={`text-sm py-1 cursor-pointer flex-1 ${q.correctAnswer === optIndex ? "font-bold text-primary" : ""
                                                    }`}
                                            >
                                                {option}
                                            </Label>
                                        )}
                                    </div>
                                ))}
                            </RadioGroup>

                            {isEditMode ? (
                                <div className="space-y-2 mt-4 pt-4 border-t border-dashed">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <AlertCircle className="h-3 w-3" />
                                        Explanation (shown after answer)
                                    </Label>
                                    <Textarea
                                        value={q.explanation || ""}
                                        onChange={(e) => handleUpdateQuestion(q.id, { explanation: e.target.value })}
                                        className="text-sm min-h-[60px] resize-none bg-muted/30"
                                        placeholder="Explain why this is the correct answer..."
                                    />
                                </div>
                            ) : q.explanation && (
                                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                        <AlertCircle className="h-3 w-3" />
                                        Explanation
                                    </p>
                                    <p className="text-sm text-muted-foreground italic">
                                        {q.explanation}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}

                {isEditMode && (
                    <Button
                        variant="outline"
                        className="w-full border-dashed py-8 flex flex-col gap-2 h-auto hover:bg-muted/50 transition-all"
                        onClick={handleAddQuestion}
                    >
                        <Plus className="h-5 w-5" />
                        <span>Add Another Question</span>
                    </Button>
                )}
            </div>
        </div>
    );
}
