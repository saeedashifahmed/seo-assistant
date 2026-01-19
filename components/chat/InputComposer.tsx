'use client';

import { useState, useRef, ChangeEvent, FormEvent, DragEvent } from 'react';
import {
    Send,
    Paperclip,
    X,
    Brain,
    Loader2,
    FileText,
    Image as ImageIcon
} from 'lucide-react';
import { Attachment, SEODataSource } from '@/types';
import { DataSourceSelector } from '../sidebar/DataSourceSelector';
import { readFileAsDataURL, readFileAsText } from '@/lib/utils';

interface InputComposerProps {
    onSubmit: (text: string, attachment: Attachment | null) => void;
    isProcessing: boolean;
    dataSource: SEODataSource;
    onDataSourceChange: (source: SEODataSource) => void;
    thinkingMode: boolean;
    onThinkingModeChange: (enabled: boolean) => void;
}

export function InputComposer({
    onSubmit,
    isProcessing,
    dataSource,
    onDataSourceChange,
    thinkingMode,
    onThinkingModeChange,
}: InputComposerProps) {
    const [input, setInput] = useState('');
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    };

    const handleFileSelect = async (file: File) => {
        try {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const result = await readFileAsDataURL(file);
                setAttachment({
                    name: file.name,
                    type: file.type,
                    data: result,
                    mimeType: file.type,
                    isInline: true,
                });
            } else {
                const text = await readFileAsText(file);
                setAttachment({
                    name: file.name,
                    type: file.type || 'text/plain',
                    data: text,
                    mimeType: 'text/plain',
                    isInline: false,
                });
            }
        } catch (error) {
            console.error('Error reading file:', error);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e?: FormEvent) => {
        e?.preventDefault();
        if ((!input.trim() && !attachment) || isProcessing) return;

        onSubmit(input, attachment);
        setInput('');
        setAttachment(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="p-4 md:p-6 bg-transparent">
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="relative group">
                    {/* Gradient glow on focus */}
                    <div className="
            absolute -inset-0.5 
            bg-gradient-to-r from-cyan-500/20 via-cyan-500/20 to-blue-500/20 
            rounded-2xl blur 
            opacity-0 group-focus-within:opacity-100 
            transition duration-500
          " />

                    {/* Main container */}
                    <div
                        className={`
              relative glass
              border rounded-2xl 
              shadow-xl shadow-zinc-200/50 dark:shadow-black/30
              flex flex-col transition-all duration-300
              ${isDragging
                                ? 'border-cyan-400 dark:border-cyan-600 ring-2 ring-cyan-500/20'
                                : 'border-zinc-200 dark:border-zinc-700'
                            }
            `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {/* Drag overlay */}
                        {isDragging && (
                            <div className="
                absolute inset-0 z-10 
                flex items-center justify-center
                bg-cyan-50/90 dark:bg-cyan-900/30
                rounded-2xl
              ">
                                <div className="text-center">
                                    <Paperclip size={32} className="mx-auto mb-2 text-cyan-500" />
                                    <p className="text-sm font-medium text-cyan-700 dark:text-cyan-400">
                                        Drop file here
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Attachment preview */}
                        {attachment && (
                            <div className="px-4 pt-4 pb-1">
                                <div className="
                  inline-flex items-center gap-2 
                  bg-cyan-50 dark:bg-cyan-900/20 
                  px-3 py-2 rounded-xl 
                  text-xs 
                  border border-cyan-200 dark:border-cyan-800
                  animate-fade-in-up
                ">
                                    {attachment.isInline ? (
                                        <ImageIcon size={14} className="text-cyan-600 dark:text-cyan-400" />
                                    ) : (
                                        <FileText size={14} className="text-cyan-600 dark:text-cyan-400" />
                                    )}
                                    <span className="
                    text-zinc-700 dark:text-zinc-300 
                    font-medium truncate max-w-[200px]
                  ">
                                        {attachment.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={removeAttachment}
                                        className="
                      ml-1 p-1 
                      hover:bg-cyan-100 dark:hover:bg-cyan-800 
                      rounded-full 
                      text-zinc-400 hover:text-zinc-900 dark:hover:text-white 
                      transition-colors
                    "
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Textarea */}
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about SEO, keywords, backlinks, or digital marketing..."
                            rows={1}
                            className="
                w-full bg-transparent 
                p-4 min-h-[60px] max-h-[200px] 
                text-zinc-900 dark:text-zinc-100 
                placeholder-zinc-400 dark:placeholder-zinc-600 
                focus:outline-none resize-none
                text-sm leading-relaxed
              "
                            disabled={isProcessing}
                        />

                        {/* Toolbar */}
                        <div className="flex items-center justify-between px-3 pb-3 pt-1">
                            <div className="flex items-center gap-2">
                                {/* File attachment */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept="image/*,application/pdf,.docx,.doc,.txt,.html,.csv,.json,.md,.xml"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                    p-2 rounded-xl transition-all duration-200
                    ${attachment
                                            ? 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                        }
                  `}
                                    title="Attach file (images, PDFs, documents)"
                                >
                                    <Paperclip size={18} />
                                </button>

                                {/* Data source selector */}
                                <DataSourceSelector
                                    value={dataSource}
                                    onChange={onDataSourceChange}
                                />

                                <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

                                {/* Thinking mode toggle */}
                                <button
                                    type="button"
                                    onClick={() => onThinkingModeChange(!thinkingMode)}
                                    className={`
                    group flex items-center gap-2 px-3 py-2 rounded-xl
                    text-xs font-semibold transition-all duration-300 
                    border
                    ${thinkingMode
                                            ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-lg shadow-cyan-500/10'
                                            : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-cyan-400 dark:hover:border-cyan-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }
                  `}
                                    title="Toggle Deep Reasoning Mode"
                                >
                                    <Brain
                                        size={14}
                                        className={`
                      transition-colors duration-300
                      ${thinkingMode
                                                ? 'text-cyan-400 dark:text-cyan-600'
                                                : 'text-zinc-400 group-hover:text-cyan-500'
                                            }
                    `}
                                    />
                                    <span className="hidden sm:inline uppercase tracking-wider text-[10px] font-bold">
                                        Thinking
                                    </span>
                                    <span className={`
                    w-1.5 h-1.5 rounded-full transition-colors duration-300
                    ${thinkingMode
                                            ? 'bg-cyan-400 animate-pulse'
                                            : 'bg-zinc-300 dark:bg-zinc-700'
                                        }
                  `} />
                                </button>
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={(!input.trim() && !attachment) || isProcessing}
                                className={`
                  p-2.5 rounded-xl transition-all duration-300
                  ${(input.trim() || attachment) && !isProcessing
                                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                                    }
                `}
                            >
                                {isProcessing ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <Send size={18} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium tracking-wide">
                            SEO ASSISTANT BY RABBIT RANK • POWERED BY RABBIT RANK INTELLIGENCE 2.5
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
