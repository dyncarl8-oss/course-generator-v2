import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type Quiz } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, ArrowRight, RefreshCcw, HelpCircle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

interface QuizViewerProps {
    quiz: Quiz;
    onComplete: () => void;
}

export default function QuizViewer({ quiz, onComplete }: QuizViewerProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion?.correctAnswer;

    const handleSubmit = () => {
        if (selectedOption === null) return;
        setIsSubmitted(true);
        if (isCorrect) {
            setScore((prev) => prev + 1);
            if (currentQuestionIndex === quiz.questions.length - 1 && score + 1 === quiz.questions.length) {
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
            setSelectedOption(null);
            setIsSubmitted(false);
        } else {
            setShowResults(true);
            if (score === quiz.questions.length) {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 }
                });
            }
        }
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedOption(null);
        setIsSubmitted(false);
        setScore(0);
        setShowResults(false);
    };

    if (showResults) {
        const isPerfect = score === quiz.questions.length;
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl mx-auto py-12"
            >
                <Card className="text-center overflow-hidden border-2 border-primary/10">
                    <div className={cn(
                        "h-2 bg-primary transition-all duration-1000",
                        isPerfect ? "bg-green-500" : "bg-primary"
                    )} />
                    <CardHeader className="pt-10">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
                            <Trophy className={cn("h-12 w-12", isPerfect ? "text-yellow-500" : "text-primary")} />
                        </div>
                        <CardTitle className="text-3xl font-bold">Quiz Complete!</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-10">
                        <p className="text-xl text-muted-foreground">
                            You scored <span className="text-foreground font-bold">{score}</span> out of <span className="text-foreground font-bold">{quiz.questions.length}</span>
                        </p>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            {isPerfect
                                ? "Perfect score! You've mastered this module's content."
                                : "Great effort! You can review the material and try again to get a perfect score."}
                        </p>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-6">
                        <Button variant="outline" onClick={handleRestart} className="w-full gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            Retake Quiz
                        </Button>
                        <Button onClick={onComplete} className="w-full gap-2">
                            Continue to Next Module
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-primary" />
                        Question {currentQuestionIndex + 1} of {quiz.questions.length}
                    </span>
                    <span className="tabular-nums">{Math.round(((currentQuestionIndex) / quiz.questions.length) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-primary"
                        initial={{ width: 0 }}
                        animate={{ width: `${((currentQuestionIndex) / quiz.questions.length) * 100}%` }}
                        transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestionIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                >
                    <Card className="border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-xl sm:text-2xl leading-tight">
                                {currentQuestion.question}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <RadioGroup
                                value={selectedOption?.toString()}
                                onValueChange={(val) => !isSubmitted && setSelectedOption(parseInt(val))}
                                className="space-y-3"
                            >
                                {currentQuestion.options.map((option, index) => {
                                    const isOptionSelected = selectedOption === index;
                                    const isOptionCorrect = index === currentQuestion.correctAnswer;

                                    let stateClasses = "border-2 hover:bg-muted/50 transition-all cursor-pointer";
                                    if (isSubmitted) {
                                        if (isOptionCorrect) {
                                            stateClasses = "border-green-500 bg-green-500/10 text-green-700 cursor-default";
                                        } else if (isOptionSelected && !isCorrect) {
                                            stateClasses = "border-destructive bg-destructive/10 text-destructive cursor-default";
                                        } else {
                                            stateClasses = "opacity-50 border-transparent cursor-default";
                                        }
                                    } else if (isOptionSelected) {
                                        stateClasses = "border-primary bg-primary/5 text-primary";
                                    }

                                    return (
                                        <Label
                                            key={index}
                                            htmlFor={`option-${index}`}
                                            className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl text-base font-medium",
                                                stateClasses
                                            )}
                                        >
                                            <RadioGroupItem
                                                value={index.toString()}
                                                id={`option-${index}`}
                                                className="sr-only"
                                                disabled={isSubmitted}
                                            />
                                            <span className={cn(
                                                "flex items-center justify-center h-8 w-8 rounded-lg text-sm font-bold shrink-0 transition-colors",
                                                isOptionSelected && !isSubmitted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                                                isSubmitted && isOptionCorrect ? "bg-green-500 text-white" : "",
                                                isSubmitted && isOptionSelected && !isCorrect ? "bg-destructive text-white" : ""
                                            )}>
                                                {String.fromCharCode(65 + index)}
                                            </span>
                                            <span className="flex-1">{option}</span>
                                            {isSubmitted && isOptionCorrect && (
                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                            )}
                                            {isSubmitted && isOptionSelected && !isCorrect && (
                                                <XCircle className="h-5 w-5 text-destructive" />
                                            )}
                                        </Label>
                                    );
                                })}
                            </RadioGroup>

                            <AnimatePresence>
                                {isSubmitted && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className={cn(
                                            "mt-6 p-5 rounded-xl border-l-4",
                                            isCorrect
                                                ? "bg-green-500/5 border-green-500"
                                                : "bg-destructive/5 border-destructive"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {isCorrect
                                                ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                : <XCircle className="h-5 w-5 text-destructive" />}
                                            <span className={cn(
                                                "font-bold text-sm uppercase tracking-wider",
                                                isCorrect ? "text-green-600" : "text-destructive"
                                            )}>
                                                {isCorrect ? "Correct!" : "Incorrect"}
                                            </span>
                                        </div>
                                        {currentQuestion.explanation && (
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {currentQuestion.explanation}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                        <CardFooter className="pt-0 pb-6 flex justify-end">
                            {!isSubmitted ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={selectedOption === null}
                                    size="lg"
                                    className="w-full sm:w-auto px-10 shadow-lg shadow-primary/20"
                                >
                                    Submit Answer
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleNext}
                                    size="lg"
                                    className="w-full sm:w-auto px-10"
                                >
                                    {currentQuestionIndex < quiz.questions.length - 1 ? "Next Question" : "See Results"}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
