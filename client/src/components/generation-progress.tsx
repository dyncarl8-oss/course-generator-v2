import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Zap } from "lucide-react";

interface GenerationProgressProps {
  topic: string;
  isComplete?: boolean;
}

const statusMessages = [
  "Initializing AI model...",
  "Searching the web for latest information...",
  "Analyzing current trends and best practices...",
  "Structuring course framework...",
  "Generating modules...",
  "Generating modules...",
  "Generating modules...",
  "Generating modules...",
  "Generating modules...",
  "Crafting lesson content...",
  "Adding real-world examples...",
  "Finalizing curriculum...",
];

export function GenerationProgress({ topic, isComplete = false }: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      let newProgress: number;
      
      if (isComplete) {
        newProgress = 100;
      } else {
        const seconds = elapsed / 1000;
        newProgress = Math.min(95, 100 * (1 - Math.exp(-seconds / 15)));
      }
      
      setProgress(newProgress);
      const messageIndex = Math.floor((newProgress / 100) * statusMessages.length);
      setStatusIndex(Math.min(messageIndex, statusMessages.length - 1));
    }, 200);

    return () => clearInterval(updateInterval);
  }, [isComplete]);

  return (
    <Card className="p-8 space-y-6 border-0" style={{ backgroundColor: "#16181d" }}>
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Generating your course</h3>
        <p className="text-sm text-muted-foreground">
          Creating a comprehensive curriculum for{" "}
          <span className="font-medium text-foreground">{topic}</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center mb-2">
          <p className="text-xs font-medium text-muted-foreground">Progress</p>
          <p className="text-xs font-semibold text-foreground">{Math.round(progress)}%</p>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status Message */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Zap className="h-4 w-4 text-primary flex-shrink-0 animate-pulse" />
          <p className="text-sm font-medium text-foreground">
            {statusMessages[statusIndex]}
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">Web Search: Active</span>
      </div>
    </Card>
  );
}
