import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Link as LinkIcon, X, Check, ExternalLink,
    ChevronDown, ChevronUp, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
}

export function RichTextEditor({ content, onChange, placeholder, className }: RichTextEditorProps) {
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkText, setLinkText] = useState('');
    const [openInNewWindow, setOpenInNewWindow] = useState(true);
    const lastContentRef = useRef(content);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-disc ml-6 space-y-1',
                    },
                },
                orderedList: {
                    keepMarks: true,
                    keepAttributes: false,
                    HTMLAttributes: {
                        class: 'list-decimal ml-6 space-y-1',
                    },
                },
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-primary underline cursor-pointer',
                },
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            if (html !== lastContentRef.current) {
                lastContentRef.current = html;
                onChange(html);
            }
        },
        editorProps: {
            attributes: {
                class: cn(
                    "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] outline-none",
                    className
                ),
                'data-placeholder': placeholder || '',
            },
        },
    });

    // Update content IF it changes externally (e.g. from AI or another block)
    useEffect(() => {
        if (!editor) return;

        // The key is to compare the incoming content with the editor's current state,
        // rather than just a ref of what we last SENT. This avoids prop-loop resets.
        const currentHtml = editor.getHTML();
        if (content !== currentHtml && content !== lastContentRef.current) {
            // Only force set content if the editor is NOT focused.
            // If the user is typing, we NEVER want to slam the content prop back in.
            if (!editor.isFocused || content.length === 0) {
                lastContentRef.current = content;
                editor.commands.setContent(content, false);
            }
        }
    }, [content, editor]);

    const addLink = useCallback(() => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');

        setLinkText(selectedText);
        setLinkUrl(editor.getAttributes('link').href || '');
        setOpenInNewWindow(editor.getAttributes('link').target === '_blank');
        setIsLinkDialogOpen(true);
    }, [editor]);

    const saveLink = () => {
        if (!editor) return;

        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({
                href: linkUrl,
                target: openInNewWindow ? '_blank' : null
            }).run();
        }
        setIsLinkDialogOpen(false);
    };

    if (!editor) return null;

    return (
        <div className="relative border rounded-xl overflow-hidden bg-card transition-all focus-within:ring-2 focus-within:ring-primary/20">
            {/* Toolbar */}
            <div className="flex items-center gap-0.5 p-1 border-b bg-muted/30 flex-wrap">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    icon={Bold}
                    label="Bold (Ctrl+B)"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    icon={Italic}
                    label="Italic (Ctrl+I)"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    icon={UnderlineIcon}
                    label="Underline (Ctrl+U)"
                />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    icon={List}
                    label="Bullet List"
                />
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    icon={ListOrdered}
                    label="Numbered List"
                />
                <div className="w-px h-4 bg-border mx-1" />
                <ToolbarButton
                    onClick={addLink}
                    active={editor.isActive('link')}
                    icon={LinkIcon}
                    label="Insert Link"
                />
                {editor.isActive('link') && (
                    <ToolbarButton
                        onClick={() => editor.chain().focus().unsetLink().run()}
                        active={false}
                        icon={X}
                        label="Remove Link"
                    />
                )}
            </div>

            {/* Editor Surface */}
            <div className="p-4">
                <EditorContent editor={editor} />
            </div>

            {/* Link Dialog */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            Insert Link
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Text to display</Label>
                            <Input
                                value={linkText}
                                readOnly
                                className="bg-muted text-muted-foreground cursor-not-allowed"
                                placeholder="Select text in editor first"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>To what URL should this link go?</Label>
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && saveLink()}
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Checkbox
                                id="newWindow"
                                checked={openInNewWindow}
                                onCheckedChange={(checked) => setOpenInNewWindow(!!checked)}
                            />
                            <Label htmlFor="newWindow" className="flex items-center gap-1.5 cursor-pointer">
                                Open in new window
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsLinkDialogOpen(false)}>Cancel</Button>
                        <Button onClick={saveLink} className="gap-2">
                            <Check className="h-4 w-4" /> Save Link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function ToolbarButton({ onClick, active, icon: Icon, label }: { onClick: () => void, active: boolean, icon: any, label: string }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            onMouseDown={(e) => {
                e.preventDefault();
                onClick();
            }}
            title={label}
            type="button"
        >
            <Icon className="h-4 w-4" />
        </Button>
    );
}
