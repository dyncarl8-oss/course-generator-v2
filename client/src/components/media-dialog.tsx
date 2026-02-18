import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, Link, Sparkles, Video, Image as ImageIcon, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonTitle: string;
  onAddImage: (url: string, alt?: string) => void;
  onAddVideo: (url: string) => void;
  onGenerateImage: (prompt: string, alt?: string) => void;
  isGenerating?: boolean;
}

export function MediaDialog({
  open,
  onOpenChange,
  lessonTitle,
  onAddImage,
  onAddVideo,
  onGenerateImage,
  isGenerating = false,
}: MediaDialogProps) {
  const [activeTab, setActiveTab] = useState("ai");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setImageUrl("");
    setVideoUrl("");
    setImageAlt("");
    setAiPrompt("");
    setUploadError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleAddImageUrl = () => {
    if (!imageUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter an image URL.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      new URL(imageUrl.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL.",
        variant: "destructive",
      });
      return;
    }
    
    onAddImage(imageUrl.trim(), imageAlt.trim() || undefined);
    handleClose();
  };

  const handleAddVideo = () => {
    if (!videoUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a video embed URL.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      new URL(videoUrl.trim());
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid embed URL.",
        variant: "destructive",
      });
      return;
    }
    
    onAddVideo(videoUrl.trim());
    handleClose();
  };

  const handleGenerateImage = () => {
    const prompt = aiPrompt.trim() || `Educational illustration for: ${lessonTitle}`;
    onGenerateImage(prompt, lessonTitle);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG, JPG, GIF).");
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File too large. Maximum size is 5MB.");
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onAddImage(dataUrl, imageAlt.trim() || file.name);
      handleClose();
    };
    reader.onerror = () => {
      setUploadError("Failed to read file. Please try again.");
      toast({
        title: "Upload failed",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const suggestedPrompts = [
    `Diagram explaining key concepts from "${lessonTitle}"`,
    `Step-by-step visual guide for "${lessonTitle}"`,
    `Infographic summarizing "${lessonTitle}"`,
    `Professional illustration for learning "${lessonTitle}"`,
  ];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Media to Lesson</DialogTitle>
          <DialogDescription>
            Add images or videos to enhance your lesson content
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              AI Generate
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5">
              <Link className="h-3.5 w-3.5" />
              URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Image Description</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Describe the image you want to generate..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                data-testid="input-ai-prompt"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Suggested prompts:</Label>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPrompts.map((prompt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="h-auto py-1 px-2 text-xs whitespace-normal text-left"
                    onClick={() => setAiPrompt(prompt)}
                    data-testid={`button-suggested-prompt-${i}`}
                  >
                    {prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="w-full"
              data-testid="button-generate-ai-image"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Image...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                uploadError ? "border-destructive" : "hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-upload"
            >
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Click to upload an image</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, GIF up to 5MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-file-upload"
              />
            </div>

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="upload-alt">Alt Text (optional)</Label>
              <Input
                id="upload-alt"
                placeholder="Describe the image for accessibility"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                data-testid="input-upload-alt"
              />
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4 pt-4">
            <Tabs defaultValue="image" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Image
                </TabsTrigger>
                <TabsTrigger value="video" className="gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  Video
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input
                    id="image-url"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    data-testid="input-image-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url-alt">Alt Text (optional)</Label>
                  <Input
                    id="url-alt"
                    placeholder="Describe the image for accessibility"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    data-testid="input-url-alt"
                  />
                </div>

                <Button
                  onClick={handleAddImageUrl}
                  disabled={!imageUrl.trim()}
                  className="w-full"
                  data-testid="button-add-image-url"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Add Image
                </Button>
              </TabsContent>

              <TabsContent value="video" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="video-url">Video Embed URL</Label>
                  <Input
                    id="video-url"
                    placeholder="https://youtube.com/embed/..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    data-testid="input-video-url"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the embed URL from YouTube, Vimeo, or Loom
                  </p>
                </div>

                <Button
                  onClick={handleAddVideo}
                  disabled={!videoUrl.trim()}
                  className="w-full"
                  data-testid="button-add-video-url"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
