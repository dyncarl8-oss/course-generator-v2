import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Loader2, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export interface WordTiming {
  word: string;
  startTime: number;
  endTime: number;
}

interface TTSResponse {
  audioBase64: string;
  duration: number;
  wordTimings: WordTiming[];
}

interface TTSPlayerProps {
  lessonId: string;
  experienceId: string;
  content: string;
  onWordIndexChange?: (index: number) => void;
  onPlayingChange?: (isPlaying: boolean) => void;
  onWordTimingsLoaded?: (words: string[]) => void;
  compact?: boolean;
}

export function TTSPlayer({ 
  lessonId, 
  experienceId, 
  content,
  onWordIndexChange,
  onPlayingChange,
  onWordTimingsLoaded,
  compact = false
}: TTSPlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const speedOptions = [0.75, 1, 1.25, 1.5, 2];
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const wordTimingsRef = useRef<WordTiming[]>([]);
  const currentWordIndexRef = useRef<number>(-1);
  const { toast } = useToast();

  const stopTracking = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const startTracking = useCallback(() => {
    stopTracking();
    currentWordIndexRef.current = -1;
    
    const updateTracking = () => {
      if (!audioRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateTracking);
        return;
      }
      
      const currentTime = audioRef.current.currentTime;
      setProgress(currentTime);
      
      const timings = wordTimingsRef.current;
      if (timings.length > 0 && onWordIndexChange) {
        let newIdx = -1;
        
        for (let i = 0; i < timings.length; i++) {
          if (currentTime >= timings[i].startTime && currentTime < timings[i].endTime) {
            newIdx = i;
            break;
          }
          if (currentTime >= timings[i].endTime && (i === timings.length - 1 || currentTime < timings[i + 1].startTime)) {
            newIdx = i;
            break;
          }
        }
        
        if (currentTime < timings[0].startTime) {
          newIdx = -1;
        }
        
        if (newIdx !== currentWordIndexRef.current) {
          currentWordIndexRef.current = newIdx;
          onWordIndexChange(newIdx);
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateTracking);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateTracking);
  }, [stopTracking, onWordIndexChange]);

  const setPlayingState = useCallback((playing: boolean) => {
    setIsPlaying(playing);
    onPlayingChange?.(playing);
  }, [onPlayingChange]);

  const handleAudioEnd = useCallback(() => {
    setPlayingState(false);
    setProgress(0);
    stopTracking();
    currentWordIndexRef.current = -1;
    onWordIndexChange?.(-1);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [stopTracking, setPlayingState, onWordIndexChange]);

  const generateTTS = async () => {
    if (audioData && audioRef.current) {
      try {
        await audioRef.current.play();
        setPlayingState(true);
        startTracking();
      } catch (error) {
        console.error("Playback error:", error);
      }
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest(
        "POST",
        `/api/experiences/${experienceId}/lessons/${lessonId}/tts`,
        {}
      ) as TTSResponse;
      
      setAudioData(response.audioBase64);
      wordTimingsRef.current = response.wordTimings || [];
      setDuration(response.duration);
      
      if (response.wordTimings && response.wordTimings.length > 0) {
        const words = response.wordTimings.map(wt => wt.word);
        onWordTimingsLoaded?.(words);
      }
      
      const audio = new Audio(`data:audio/mp3;base64,${response.audioBase64}`);
      audio.playbackRate = playbackRate;
      audioRef.current = audio;
      
      audio.addEventListener("loadedmetadata", () => {
        const actualDuration = audio.duration;
        if (actualDuration && actualDuration !== response.duration) {
          setDuration(actualDuration);
        }
      });
      
      audio.addEventListener("ended", handleAudioEnd);
      
      audio.addEventListener("canplaythrough", async () => {
        try {
          await audio.play();
          setPlayingState(true);
          startTracking();
        } catch (e) {
          console.error("Autoplay failed:", e);
        }
      }, { once: true });
      
      audio.load();
    } catch (error: any) {
      toast({
        title: "TTS Error",
        description: error.message || "Failed to generate audio",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingState(false);
      stopTracking();
    }
  }, [stopTracking, setPlayingState]);

  const togglePlayback = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      generateTTS();
    }
  };

  const setSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  useEffect(() => {
    return () => {
      stopTracking();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [stopTracking]);

  useEffect(() => {
    setAudioData(null);
    setProgress(0);
    setDuration(0);
    setPlayingState(false);
    stopTracking();
    currentWordIndexRef.current = -1;
    onWordIndexChange?.(-1);
    wordTimingsRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [lessonId, stopTracking, setPlayingState, onWordIndexChange]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2" data-testid="container-tts-player-compact">
        <Button
          size="sm"
          variant="ghost"
          onClick={togglePlayback}
          disabled={isLoading}
          className="shrink-0"
          data-testid="button-tts-toggle"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3 ml-0.5" />
          )}
        </Button>
        
        <div className="flex-1 min-w-0 max-w-xs">
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-100"
              style={{ width: audioData && duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {audioData && duration > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            {formatTime(progress)} / {formatTime(duration)}
          </span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 tabular-nums text-xs font-medium gap-0.5 h-6 px-1.5"
              data-testid="button-playback-speed"
            >
              {playbackRate}x
              <ChevronDown className="h-2.5 w-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {speedOptions.map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => setSpeed(speed)}
                className={playbackRate === speed ? "bg-accent" : ""}
                data-testid={`menu-speed-${speed}`}
              >
                {speed}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border" data-testid="container-tts-player">
      <Button
        size="icon"
        variant={isPlaying ? "secondary" : "default"}
        onClick={togglePlayback}
        disabled={isLoading}
        className="shrink-0"
        data-testid="button-tts-toggle"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">
            {isLoading
              ? "Generating audio..."
              : isPlaying
              ? "Now playing"
              : audioData
              ? "Paused"
              : "Listen to this lesson"}
          </span>
          {audioData && duration > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
          )}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-100"
            style={{ width: audioData && duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 tabular-nums text-xs font-medium gap-1"
            data-testid="button-playback-speed"
          >
            {playbackRate}x
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {speedOptions.map((speed) => (
            <DropdownMenuItem
              key={speed}
              onClick={() => setSpeed(speed)}
              className={playbackRate === speed ? "bg-accent" : ""}
              data-testid={`menu-speed-${speed}`}
            >
              {speed}x
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
