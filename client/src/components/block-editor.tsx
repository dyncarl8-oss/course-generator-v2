import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, GripVertical, Trash2, Layout, Type,
    Image as ImageIcon, Video, HelpCircle, FileText,
    ChevronUp, ChevronDown, CheckCircle2, MoreVertical,
    MousePointer2, MessageSquare, List, Info, AlignLeft,
    Quote, Bold, Italic, Link, Maximize2, Play, Wand2, Loader2, Sparkles, Check, X, Upload
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn, getEmbedUrl } from "@/lib/utils";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent
} from "@/components/ui/tabs";
import type { ILessonBlock } from "@shared/schema";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RichTextEditor } from "./rich-text-editor";

interface BlockEditorProps {
    blocks: ILessonBlock[];
    onChange: (blocks: ILessonBlock[]) => void;
    courseTitle?: string;
    moduleTitle?: string;
    lessonTitle?: string;
    onMoveOutside?: (index: number, direction: 'up' | 'down') => void;
}

export function BlockEditor({ blocks, onChange, courseTitle, moduleTitle, lessonTitle, onMoveOutside }: BlockEditorProps) {
    const { companyId } = useParams<{ companyId: string }>();
    const { toast } = useToast();
    const [localBlocks, setLocalBlocks] = useState<ILessonBlock[]>(blocks || []);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);
    const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null);

    const lastReceivedPropRef = useRef<string>(JSON.stringify(blocks || []));

    useEffect(() => {
        const blocksStr = JSON.stringify(blocks || []);
        if (blocksStr !== lastReceivedPropRef.current) {
            // This means the parent actually changed the blocks (e.g. lesson change)
            setLocalBlocks(blocks || []);
            lastReceivedPropRef.current = blocksStr;
        }
    }, [blocks]);

    const updateBlocks = (newBlocks: ILessonBlock[]) => {
        setLocalBlocks(newBlocks);
        // We do NOT update lastReceivedPropRef here. 
        // We only update it when the PROP changes (in useEffect).
        // This ensures that when the parent re-renders with the SAME data we just sent it,
        // we don't accidentally "reset" to that data if we've made further internal changes.
        onChange(newBlocks);
    };

    const addBlock = (type: string, index?: number) => {
        const newId = (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(2, 11);

        const newBlock: ILessonBlock = {
            id: newId,
            type,
            content: getInitialContent(type),
            orderIndex: typeof index === 'number' ? index : localBlocks.length
        };

        let newBlocks: ILessonBlock[];
        if (typeof index === 'number') {
            newBlocks = [...localBlocks];
            newBlocks.splice(index, 0, newBlock);
            // Re-index all blocks
            newBlocks = newBlocks.map((b, i) => ({ ...b, orderIndex: i }));
        } else {
            newBlocks = [...localBlocks, newBlock];
        }

        updateBlocks(newBlocks);

        // Autofocus/Scroll to new block + Auto-open prompt for images
        if (type === 'image') {
            setExpandedPromptId(newId);
        }

        setTimeout(() => {
            const element = document.getElementById(`block-${newId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('ring-2', 'ring-primary/50', 'ring-offset-2');
                setTimeout(() => element.classList.remove('ring-2', 'ring-primary/50', 'ring-offset-2'), 2000);
            }
        }, 100);
    };

    const removeBlock = (id: string) => {
        updateBlocks(localBlocks.filter(b => b.id !== id));
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...localBlocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex < 0 || targetIndex >= newBlocks.length) {
            if (onMoveOutside) {
                onMoveOutside(index, direction);
            }
            return;
        }

        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];

        // Update order indices
        updateBlocks(newBlocks.map((b, i) => ({ ...b, orderIndex: i })));
    };

    const updateBlockContent = (id: string, content: any) => {
        updateBlocks(localBlocks.map(b => b.id === id ? { ...b, content } : b));
    };

    const handleMagicWrite = async (blockId: string, type: string) => {
        const block = localBlocks.find(b => b.id === blockId);
        if (!block) return;

        setIsGenerating(blockId);
        try {
            const res = await apiRequest("POST", `/api/dashboard/${companyId}/generate-block-content`, {
                blockType: type,
                userPrompt: block.content.text || "",
                context: {
                    courseTitle: courseTitle || "Course",
                    moduleTitle: moduleTitle || "Module",
                    lessonTitle: lessonTitle || "Lesson"
                }
            });
            const data = await res.json();
            if (data.content) {
                updateBlockContent(blockId, { ...block.content, text: data.content });
                toast({ title: "Magic Write Complete", description: "AI has polished your content." });
            }
        } catch (error) {
            toast({ title: "Magic Failed", description: "Could not reach the AI spirits. Try again.", variant: "destructive" });
        } finally {
            setIsGenerating(null);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-2 pb-24">
                {localBlocks.length === 0 ? (
                    <div className="border border-dashed rounded-[2.5rem] p-16 text-center space-y-8 bg-muted/5 border-muted-foreground/20">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Layout className="h-16 w-16 text-muted-foreground/20" />
                                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-lg ring-4 ring-background">
                                    <Plus className="h-5 w-5" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2 max-w-sm mx-auto">
                            <h3 className="text-xl font-bold">Start Building Your Lesson</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">Your lesson is currently empty. Use the tools below to add your first piece of content.</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4 pt-4">
                            <Button onClick={() => addBlock('text')} variant="outline" className="h-12 px-6 rounded-2xl gap-2 hover:border-primary/50 transition-all">
                                <Type className="h-5 w-5 text-primary" />
                                <span>Add Text</span>
                            </Button>
                            <Button onClick={() => addBlock('image')} variant="outline" className="h-12 px-6 rounded-2xl gap-2 hover:border-primary/50 transition-all">
                                <ImageIcon className="h-5 w-5 text-emerald-500" />
                                <span>Add Image</span>
                            </Button>
                            <Button onClick={() => addBlock('video')} variant="outline" className="h-12 px-6 rounded-2xl gap-2 hover:border-primary/50 transition-all">
                                <Video className="h-5 w-5 text-rose-500" />
                                <span>Add Video</span>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-0">
                        <InsertionPoint onAdd={(type) => addBlock(type, 0)} isFirst />
                        {localBlocks.map((block, index) => (
                            <div key={block.id}>
                                <div id={`block-${block.id}`} className="group relative scroll-mt-20">
                                    {/* ... existing block rendering ... */}
                                    <div className="flex items-start gap-4">
                                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-4 z-20">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:bg-muted bg-background/50 backdrop-blur-sm shadow-sm border border-muted-foreground/10"
                                                        onClick={() => moveBlock(index, 'up')}
                                                        disabled={index === 0 && !onMoveOutside}
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">Move Up</TooltipContent>
                                            </Tooltip>

                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:bg-muted bg-background/50 backdrop-blur-sm shadow-sm border border-muted-foreground/10"
                                                        onClick={() => moveBlock(index, 'down')}
                                                        disabled={index === localBlocks.length - 1 && !onMoveOutside}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">Move Down</TooltipContent>
                                            </Tooltip>
                                        </div>

                                        <Card className="flex-1 shadow-sm border-muted-foreground/10 group-hover:border-primary/20 transition-colors">
                                            <CardContent className="p-0">
                                                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 rounded-t-xl">
                                                    <div className="flex items-center gap-2">
                                                        {getBlockIcon(block.type)}
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                                            {block.type} Block
                                                        </span>
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => removeBlock(block.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Delete Block</TooltipContent>
                                                    </Tooltip>
                                                </div>
                                                <div className="p-4 relative">
                                                    {renderBlock(
                                                        block,
                                                        (content) => updateBlockContent(block.id, content),
                                                        { id: isGenerating, setter: setIsGenerating },
                                                        () => handleMagicWrite(block.id, block.type),
                                                        { course: courseTitle, module: moduleTitle, lesson: lessonTitle },
                                                        { expandedId: expandedPromptId, setExpandedId: setExpandedPromptId },
                                                        toast
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                                <InsertionPoint onAdd={(type) => addBlock(type, index + 1)} />
                            </div>
                        ))}

                        {/* Persistent Add Block Toolbar at the bottom */}
                        <div className="mt-12 flex justify-center sticky bottom-0 z-40 pb-4">
                            <div className="bg-background/80 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-primary/20 ring-1 ring-black/5 scale-110 hover:scale-125 transition-transform duration-300">
                                <BlockEditorToolbar onAddBlock={(type) => addBlock(type)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

export function BlockEditorToolbar({ onAddBlock }: { onAddBlock: (type: string) => void }) {
    return (
        <Card className="shadow-2xl border-primary/20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 rounded-full px-2 py-1 flex items-center gap-1 ring-1 ring-black/5">
            <ToolbarItem icon={Type} label="Text" onClick={() => onAddBlock('text')} />
            <ToolbarItem icon={ImageIcon} label="Image" onClick={() => onAddBlock('image')} />
            <ToolbarItem icon={Video} label="Video" onClick={() => onAddBlock('video')} />
            <ToolbarItem icon={List} label="Grid" onClick={() => onAddBlock('grid')} />
            <ToolbarItem icon={MessageSquare} label="Quiz" onClick={() => onAddBlock('quiz')} />
            <div className="w-px h-6 bg-muted-foreground/20 mx-1" />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                        <Plus className="h-5 w-5 text-primary" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 mb-4">
                    <DropdownMenuLabel>Magic Tools</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Text Utils</div>
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onAddBlock('banner')}>
                            <Layout className="mr-2 h-4 w-4" />
                            <span>Banner</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAddBlock('quote')}>
                            <Quote className="mr-2 h-4 w-4" />
                            <span>Quote</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Interactions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onAddBlock('tabs')}>
                        <AlignLeft className="mr-2 h-4 w-4" />
                        <span>Info Tabs</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAddBlock('flip')}>
                        <MousePointer2 className="mr-2 h-4 w-4" />
                        <span>Flip Cards</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </Card>
    );
}

function ToolbarItem({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full hover:bg-primary/10 group relative"
                    onClick={onClick}
                >
                    <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-black text-white border-none py-1.5 px-3 text-[11px] font-bold shadow-xl">
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

function getBlockIcon(type: string) {
    switch (type) {
        case 'text': return <Type className="h-3.5 w-3.5" />;
        case 'image': return <ImageIcon className="h-3.5 w-3.5" />;
        case 'video': return <Video className="h-3.5 w-3.5" />;
        case 'grid': return <List className="h-3.5 w-3.5" />;
        case 'quiz': return <HelpCircle className="h-3.5 w-3.5" />;
        case 'banner': return <Layout className="h-3.5 w-3.5" />;
        case 'quote': return <Quote className="h-3.5 w-3.5" />;
        case 'tabs': return <AlignLeft className="h-3.5 w-3.5" />;
        case 'flip': return <MousePointer2 className="h-3.5 w-3.5" />;
        default: return <FileText className="h-3.5 w-3.5" />;
    }
}

function getInitialContent(type: string) {
    switch (type) {
        case 'text': return { text: "" };
        case 'image': return { url: "", alt: "", caption: "" };
        case 'video': return { url: "", type: "youtube" };
        case 'grid': return { items: [{ title: "", content: "" }] };
        case 'quiz': return { question: "", options: ["", ""], correctAnswer: 0 };
        case 'banner': return { title: "", subtitle: "", color: "#0f172a" };
        case 'quote': return { text: "", author: "" };
        case 'tabs': return { tabs: [{ label: "", content: "" }] };
        case 'flip': return { front: "", back: "" };
        default: return {};
    }
}

function InsertionPoint({ onAdd, isFirst = false }: { onAdd: (type: string) => void, isFirst?: boolean }) {
    return (
        <div className={cn(
            "group/insert h-6 relative flex items-center justify-center transition-all duration-300",
            "hover:h-12 hover:my-2"
        )}>
            {/* Context line - always visible but subtle */}
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent scale-x-75 group-hover/insert:scale-x-100 group-hover/insert:via-primary/30 transition-all duration-500" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-7 w-7 rounded-full bg-background border border-muted-foreground/20 shadow-sm transition-all z-30",
                            "opacity-40 group-hover/insert:opacity-100 hover:scale-125 hover:border-primary/50 hover:bg-primary/5",
                            "flex items-center justify-center text-muted-foreground hover:text-primary"
                        )}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-56 z-[60]">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Insert Block</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onAdd('text')} className="gap-2 cursor-pointer">
                            <Type className="h-4 w-4 text-primary/70" />
                            <span>Text Block</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('banner')} className="gap-2 cursor-pointer">
                            <Layout className="h-4 w-4 text-indigo-500/70" />
                            <span>Hero Banner</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('image')} className="gap-2 cursor-pointer">
                            <ImageIcon className="h-4 w-4 text-emerald-500/70" />
                            <span>Image / AI Art</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('video')} className="gap-2 cursor-pointer">
                            <Video className="h-4 w-4 text-rose-500/70" />
                            <span>Video Embed</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Interactions</DropdownMenuLabel>
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => onAdd('quiz')} className="gap-2 cursor-pointer">
                            <MessageSquare className="h-4 w-4 text-amber-500/70" />
                            <span>Quick Quiz</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('tabs')} className="gap-2 cursor-pointer">
                            <AlignLeft className="h-4 w-4 text-blue-500/70" />
                            <span>Info Tabs</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('flip')} className="gap-2 cursor-pointer">
                            <MousePointer2 className="h-4 w-4 text-purple-500/70" />
                            <span>Flip Cards</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onAdd('grid')} className="gap-2 cursor-pointer">
                            <List className="h-4 w-4 text-sky-500/70" />
                            <span>Feature Grid</span>
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function renderBlock(
    block: ILessonBlock,
    onUpdate: (content: any) => void,
    generating: { id: string | null, setter: (id: string | null) => void },
    onMagicWrite: () => void,
    titles: { course?: string, module?: string, lesson?: string },
    promptState: { expandedId: string | null, setExpandedId: (id: string | null) => void },
    toast: any
) {
    const { id: generatingId, setter: setIsGenerating } = generating;
    const isGenerating = generatingId === block.id;
    const { expandedId, setExpandedId } = promptState;
    switch (block.type) {
        case 'text':
            return (
                <div className="relative group/text">
                    <RichTextEditor
                        content={block.content.text || ""}
                        onChange={(content) => onUpdate({ ...block.content, text: content })}
                        placeholder="Write something amazing... or use AI to generate content"
                        className="bg-transparent border-none shadow-none"
                    />
                    {onMagicWrite && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute bottom-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover/text:opacity-100 transition-all hover:bg-primary/10 hover:text-primary z-10",
                                isGenerating && "opacity-100"
                            )}
                            onClick={onMagicWrite}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>
            );
        case 'image':
            return (
                <div className="space-y-4">
                    <div className={cn(
                        "relative group/image overflow-hidden rounded-xl transition-all duration-300",
                        !block.content.url && "border-2 border-dashed border-muted-foreground/10 bg-muted/5 min-h-[200px] flex items-center justify-center",
                        block.content.url && "border-none shadow-sm"
                    )}>
                        {block.content.url ? (
                            <div className="relative w-full h-full">
                                <img
                                    src={block.content.url}
                                    alt={block.content.alt || "Block image"}
                                    className="w-full h-auto block rounded-xl"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-9 rounded-full px-4 text-xs"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = async (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    const dataUrl = event.target?.result as string;
                                                    onUpdate({ ...block.content, url: dataUrl });
                                                };
                                                reader.readAsDataURL(file);
                                            };
                                            input.click();
                                        }}
                                    >
                                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                                        Replace
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="h-9 rounded-full px-4 text-xs"
                                        onClick={() => {
                                            if (!block.content.prompt) {
                                                const defaultPrompt = `Professional educational illustration for ${titles.lesson || 'the lesson'} in a course about ${titles.course || 'the topic'}`;
                                                onUpdate({ ...block.content, prompt: defaultPrompt });
                                            }
                                            setExpandedId(expandedId === block.id ? null : block.id);
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                                        Regenerate
                                    </Button>
                                </div>
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-xs font-medium text-muted-foreground animate-pulse">AI is creating your image...</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 py-12 relative w-full h-full min-h-[200px] justify-center">
                                {isGenerating && (
                                    <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-xs font-medium text-muted-foreground animate-pulse">AI is creating your image...</p>
                                    </div>
                                )}
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-primary opacity-60" />
                                </div>
                                <div className="text-center space-y-1">
                                    <p className="text-sm font-medium">No image selected</p>
                                    <p className="text-xs text-muted-foreground">Upload your own or generate with AI</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = async (e: any) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    const dataUrl = event.target?.result as string;
                                                    onUpdate({ ...block.content, url: dataUrl });
                                                };
                                                reader.readAsDataURL(file);
                                            };
                                            input.click();
                                        }}
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                            onUpdate({ ...block.content, prompt: "" });
                                            setExpandedId(block.id);
                                        }}
                                        disabled={isGenerating}
                                    >
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        Generate with AI
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>



                    <AnimatePresence>
                        {expandedId === block.id && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="space-y-3 pt-2 bg-muted/30 p-4 rounded-xl border border-muted-foreground/10">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 px-1">
                                            {block.content.url ? "Refine your prompt" : "What should AI create?"}
                                        </Label>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 rounded-full"
                                            onClick={() => setExpandedId(null)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <Textarea
                                        value={block.content.prompt || ""}
                                        onChange={(e) => onUpdate({ ...block.content, prompt: e.target.value })}
                                        placeholder="e.g., A professional minimalist illustration of a database architecture..."
                                        className="min-h-[100px] text-sm resize-none bg-background shadow-inner"
                                        autoFocus
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="default"
                                            className="h-8 min-w-[120px]"
                                            disabled={isGenerating}
                                            onClick={async () => {
                                                setIsGenerating(block.id);
                                                try {
                                                    const data = await apiRequest("POST", "/api/generate-course-image", {
                                                        courseTitle: titles.course || 'Topic',
                                                        prompt: block.content.prompt || `Professional educational illustration for ${titles.lesson || 'the lesson'} in a course about ${titles.course || 'the topic'}`
                                                    });

                                                    if (data.imageUrl) {
                                                        onUpdate({ ...block.content, url: data.imageUrl, prompt: block.content.prompt });
                                                        setTimeout(() => {
                                                            setExpandedId(null);
                                                            toast({ title: block.content.url ? "Image Regenerated" : "Image Generated" });
                                                        }, 100);
                                                    }
                                                } catch (error) {
                                                    toast({ title: "Generation Failed", description: "Failed to generate image. Please try again.", variant: "destructive" });
                                                } finally {
                                                    setIsGenerating(null);
                                                }
                                            }}
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                                                    {block.content.url ? "Regenerate Now" : "Generate Image"}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            );
        case 'video':
            return (
                <div className="space-y-3">
                    <Input
                        value={block.content.url}
                        onChange={(e) => onUpdate({ ...block.content, url: e.target.value })}
                        placeholder="Video URL (YouTube, Vimeo...)"
                    />
                    {block.content.url && (
                        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black/5 border border-muted-foreground/10">
                            <iframe
                                src={getEmbedUrl(block.content.url)}
                                className="w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    )}
                </div>
            );
        case 'quote':
            return (
                <div className="relative group/quote space-y-3 border-l-4 border-primary/40 pl-4 py-2 bg-muted/10 rounded-r-lg">
                    <RichTextEditor
                        content={block.content.text || ""}
                        onChange={(content) => onUpdate({ ...block.content, text: content })}
                        placeholder="The quote text..."
                        className="border-none bg-transparent shadow-none italic text-lg p-0"
                    />
                    <Input
                        value={block.content.author}
                        onChange={(e) => onUpdate({ ...block.content, author: e.target.value })}
                        placeholder="Author"
                        className="h-8 text-sm"
                        disabled={isGenerating}
                    />
                    {onMagicWrite && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover/quote:opacity-100 transition-all hover:bg-primary/10 hover:text-primary z-10",
                                isGenerating && "opacity-100"
                            )}
                            onClick={onMagicWrite}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                        </Button>
                    )}
                </div>
            );
        case 'grid':
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(block.content.items || []).map((item: any, i: number) => (
                            <Card key={i} className="bg-muted/30 border-dashed relative group/item">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/item:opacity-100"
                                    onClick={() => {
                                        const items = [...block.content.items];
                                        items.splice(i, 1);
                                        onUpdate({ ...block.content, items });
                                    }}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                                <CardContent className="p-3 space-y-2">
                                    <Input
                                        value={item.title}
                                        onChange={(e) => {
                                            const items = [...block.content.items];
                                            items[i].title = e.target.value;
                                            onUpdate({ ...block.content, items });
                                        }}
                                        placeholder="Item Title"
                                        className="h-8 text-sm font-semibold"
                                    />
                                    <Textarea
                                        value={item.content}
                                        onChange={(e) => {
                                            const items = [...block.content.items];
                                            items[i].content = e.target.value;
                                            onUpdate({ ...block.content, items });
                                        }}
                                        placeholder="Description..."
                                        className="min-h-[60px] text-xs resize-none"
                                    />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={() => onUpdate({
                            ...block.content,
                            items: [...(block.content.items || []), { title: "", content: "" }]
                        })}
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Grid Item
                    </Button>
                </div>
            );
        case 'quiz':
            return (
                <div className="space-y-4">
                    <Input
                        value={block.content.question}
                        onChange={(e) => onUpdate({ ...block.content, question: e.target.value })}
                        placeholder="Your question here..."
                        className="font-medium"
                    />
                    <div className="space-y-2">
                        {(block.content.options || []).map((option: string, i: number) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors",
                                        block.content.correctAnswer === i ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                                    )}
                                    onClick={() => onUpdate({ ...block.content, correctAnswer: i })}
                                >
                                    {i + 1}
                                </div>
                                <Input
                                    value={option}
                                    onChange={(e) => {
                                        const options = [...block.content.options];
                                        options[i] = e.target.value;
                                        onUpdate({ ...block.content, options });
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className="h-8 text-sm"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        const options = [...block.content.options];
                                        options.splice(i, 1);
                                        onUpdate({ ...block.content, options });
                                    }}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary text-xs"
                        onClick={() => onUpdate({
                            ...block.content,
                            options: [...(block.content.options || []), ""]
                        })}
                    >
                        Add Option
                    </Button>
                </div>
            );
        case 'banner':
            return (
                <div className="space-y-4 rounded-xl p-6 bg-slate-900 text-white relative overflow-hidden group/banner">
                    <div className="relative z-10 space-y-3">
                        <Input
                            value={block.content.title}
                            onChange={(e) => onUpdate({ ...block.content, title: e.target.value })}
                            placeholder="Hero Title"
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-xl font-bold h-auto py-2"
                        />
                        <Textarea
                            value={block.content.subtitle}
                            onChange={(e) => onUpdate({ ...block.content, subtitle: e.target.value })}
                            placeholder="Supporting description..."
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/40 resize-none min-h-[80px]"
                        />
                    </div>
                    <div className="absolute right-4 bottom-4 flex gap-2">
                        <div className="flex items-center gap-2 bg-black/40 px-2 py-1.5 rounded-full border border-white/10 group-hover/banner:bg-black/60 transition-colors">
                            <input
                                type="color"
                                value={block.content.color || "#0f172a"}
                                onChange={(e) => onUpdate({ ...block.content, color: e.target.value })}
                                className="w-6 h-6 rounded-full overflow-hidden border-none cursor-pointer p-0 bg-transparent"
                                title="Change Background Color"
                            />
                        </div>
                    </div>
                </div>
            );
        case 'tabs':
            return (
                <Tabs defaultValue="tab-0" className="w-full">
                    <TabsList className="bg-muted/50 w-full justify-start overflow-x-auto no-scrollbar h-auto p-1 gap-1">
                        {(block.content.tabs || []).map((tab: any, i: number) => (
                            <TabsTrigger key={i} value={`tab-${i}`} className="px-4 py-1.5 text-xs rounded-lg">
                                {tab.label || `Tab ${i + 1}`}
                            </TabsTrigger>
                        ))}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg ml-1"
                            onClick={() => onUpdate({
                                ...block.content,
                                tabs: [...(block.content.tabs || []), { label: "New Tab", content: "" }]
                            })}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </TabsList>
                    {(block.content.tabs || []).map((tab: any, i: number) => (
                        <TabsContent key={i} value={`tab-${i}`} className="mt-4 space-y-3 p-4 border rounded-xl bg-muted/5 border-dashed border-muted-foreground/20">
                            <div className="flex gap-2">
                                <Input
                                    value={tab.label}
                                    onChange={(e) => {
                                        const tabs = [...block.content.tabs];
                                        tabs[i].label = e.target.value;
                                        onUpdate({ ...block.content, tabs });
                                    }}
                                    placeholder="Tab Label"
                                    className="font-medium h-9"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={() => {
                                        const tabs = [...block.content.tabs];
                                        tabs.splice(i, 1);
                                        onUpdate({ ...block.content, tabs });
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <Textarea
                                value={tab.content}
                                onChange={(e) => {
                                    const tabs = [...block.content.tabs];
                                    tabs[i].content = e.target.value;
                                    onUpdate({ ...block.content, tabs });
                                }}
                                placeholder="Tab content..."
                                className="min-h-[120px] resize-none"
                            />
                        </TabsContent>
                    ))}
                </Tabs>
            );
        case 'flip':
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-2xl bg-muted/5 border-dashed">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Front Content</Label>
                        <Textarea
                            value={block.content.front}
                            onChange={(e) => onUpdate({ ...block.content, front: e.target.value })}
                            placeholder="Text/Emoji on front..."
                            className="min-h-[100px] resize-none text-center flex items-center justify-center italic text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Back Content</Label>
                        <Textarea
                            value={block.content.back}
                            onChange={(e) => onUpdate({ ...block.content, back: e.target.value })}
                            placeholder="Answer or details on back..."
                            className="min-h-[100px] resize-none text-center bg-primary/5 border-primary/20"
                        />
                    </div>
                </div>
            );
    }
}
