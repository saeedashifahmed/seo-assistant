'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    Bot,
    Copy,
    Check,
    ChevronDown,
    Brain,
    Loader2,
    Lightbulb,
    Sparkles,
    FileDown,
    Volume2,
    Pause,
    Star,
    ListChecks,
    Wand2,
    FileText
} from 'lucide-react';
import { Message, SEO_DATA_SOURCES } from '@/types';
import { formatTime } from '@/lib/utils';
import { generateSpeech } from '@/lib/gemini';
import { SourcesList } from '@/components/chat/SourcesList';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
    isPinned?: boolean;
    onTogglePin?: (id: string) => void;
    onQuickAction?: (actionId: string, content: string) => void;
    onNotify?: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const QUICK_ACTIONS = [
    { id: 'summarize', label: 'Summarize', icon: Sparkles },
    { id: 'checklist', label: 'Checklist', icon: ListChecks },
    { id: 'metatags', label: 'Meta Tags', icon: FileText },
    { id: 'actionplan', label: 'Action Plan', icon: Wand2 },
];

const RESPONSE_MODE_LABELS: Record<string, string> = {
    concise: 'Concise',
    balanced: 'Balanced',
    deep: 'Deep'
};

// Typing effect hook
function useTypingEffect(text: string, speed: number = 10, enabled: boolean = true) {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        let index = 0;

        const interval = setInterval(() => {
            if (index < text.length) {
                const chunkSize = Math.min(3, text.length - index);
                setDisplayedText(prev => prev + text.slice(index, index + chunkSize));
                index += chunkSize;
            } else {
                setIsComplete(true);
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed, enabled]);

    return { displayedText, isComplete };
}

// Extract and separate content sections
function parseMessageContent(text: string) {
    let reasoning: string | null = null;
    let mainContent = text;
    let rabbitRankPromo: string | null = null;

    // First, extract <thinking> tags (can appear multiple times)
    const thinkingMatches = mainContent.match(/<thinking>([\s\S]*?)<\/thinking>/gi);
    if (thinkingMatches) {
        const allThinking = thinkingMatches
            .map(m => m.replace(/<\/?thinking>/gi, '').trim())
            .filter(Boolean)
            .join('\n\n');
        if (allThinking) {
            reasoning = allThinking;
        }
        mainContent = mainContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    }

    // Extract [Reasoning]...[/Reasoning] tags
    const bracketReasoningMatch = mainContent.match(/\[Reasoning\]([\s\S]*?)\[\/Reasoning\]/i);
    if (bracketReasoningMatch) {
        const extracted = bracketReasoningMatch[1]?.trim();
        if (extracted) {
            reasoning = reasoning ? `${reasoning}\n\n${extracted}` : extracted;
        }
        mainContent = mainContent.replace(bracketReasoningMatch[0], '').trim();
    }

    // Extract **Reasoning:** ... **Answer:** format (most common from Gemini)
    // Use a more precise pattern that requires both sections to be present
    const boldReasoningAnswerMatch = mainContent.match(
        /\*\*Reasoning:\*\*\s*([\s\S]*?)\*\*(Answer|Final\s*Answer|Response):\*\*\s*([\s\S]*)/i
    );
    if (boldReasoningAnswerMatch) {
        const reasoningText = boldReasoningAnswerMatch[1]?.trim();
        const answerText = boldReasoningAnswerMatch[3]?.trim();

        // Only accept if both reasoning and answer have substantial content
        if (reasoningText && reasoningText.length > 10 && answerText && answerText.length > 10) {
            reasoning = reasoning ? `${reasoning}\n\n${reasoningText}` : reasoningText;
            mainContent = answerText;
        }
    }

    // If no reasoning found yet, try other formats
    if (!reasoning) {
        // Try Reasoning: ... Answer: (no bold) format
        const plainReasoningAnswerMatch = mainContent.match(
            /^Reasoning:\s*([\s\S]*?)\n(Answer|Final\s*Answer|Response):\s*([\s\S]*)/im
        );
        if (plainReasoningAnswerMatch) {
            const reasoningText = plainReasoningAnswerMatch[1]?.trim();
            const answerText = plainReasoningAnswerMatch[3]?.trim();

            if (reasoningText && reasoningText.length > 10 && answerText && answerText.length > 10) {
                reasoning = reasoningText;
                mainContent = answerText;
            }
        }
    }

    if (!reasoning) {
        // Try Thinking: ... Answer: format
        const thinkingAnswerMatch = mainContent.match(
            /^Thinking:\s*([\s\S]*?)\n(Answer|Final\s*Answer|Response):\s*([\s\S]*)/im
        );
        if (thinkingAnswerMatch) {
            const reasoningText = thinkingAnswerMatch[1]?.trim();
            const answerText = thinkingAnswerMatch[3]?.trim();

            if (reasoningText && reasoningText.length > 10 && answerText && answerText.length > 10) {
                reasoning = reasoningText;
                mainContent = answerText;
            }
        }
    }

    if (!reasoning) {
        // Try --- Reasoning --- ... --- Answer --- format
        const dashReasoningMatch = mainContent.match(
            /---\s*Reasoning\s*---\s*([\s\S]*?)---\s*(Answer|Final\s*Answer|Response)\s*---\s*([\s\S]*)/i
        );
        if (dashReasoningMatch) {
            const reasoningText = dashReasoningMatch[1]?.trim();
            const answerText = dashReasoningMatch[3]?.trim();

            if (reasoningText && reasoningText.length > 10 && answerText && answerText.length > 10) {
                reasoning = reasoningText;
                mainContent = answerText;
            }
        }
    }

    if (!reasoning) {
        // Try ## Reasoning ... ## Answer format (markdown headers)
        const headerReasoningMatch = mainContent.match(
            /^#{2,3}\s*Reasoning\s*[\r\n]+([\s\S]*?)(?=\n#{2,3}\s*(Answer|Final\s*Answer|Response)\b)/im
        );
        if (headerReasoningMatch) {
            const reasoningText = headerReasoningMatch[1]?.trim();
            // Find the answer section after the reasoning
            const afterReasoning = mainContent.slice(mainContent.indexOf(headerReasoningMatch[0]) + headerReasoningMatch[0].length);
            const answerHeaderMatch = afterReasoning.match(/^#{2,3}\s*(Answer|Final\s*Answer|Response)\s*[\r\n]+([\s\S]*)/im);

            if (answerHeaderMatch) {
                const answerText = answerHeaderMatch[2]?.trim();

                if (reasoningText && reasoningText.length > 10 && answerText && answerText.length > 10) {
                    reasoning = reasoningText;
                    mainContent = answerText;
                }
            }
        }
    }

    // Clean up any leftover answer labels at the start of mainContent
    mainContent = mainContent.replace(/^\*\*(Answer|Final\s*Answer|Response):\*\*\s*/i, '').trim();
    mainContent = mainContent.replace(/^---\s*(Answer|Final\s*Answer|Response)\s*---\s*/i, '').trim();
    mainContent = mainContent.replace(/^#{2,3}\s*(Answer|Final\s*Answer|Response)\s*[\r\n]+/im, '').trim();
    mainContent = mainContent.replace(/^(Answer|Final\s*Answer|Response):\s*/i, '').trim();

    // Extract Rabbit Rank promotion
    const promoPatterns = [
        /---\s*\n?\s*💡\s*\*?\*?Need Professional SEO Help\?\*?\*?[\s\S]*?(?:Rabbit Rank|rabbitrank\.com)[\s\S]*?(?:success\.|$)/i,
        /💡\s*\*?\*?Need Professional SEO Help\?\*?\*?[\s\S]*?(?:Rabbit Rank|rabbitrank\.com)[\s\S]*?(?:success\.|$)/i
    ];

    for (const pattern of promoPatterns) {
        const match = mainContent.match(pattern);
        if (match) {
            rabbitRankPromo = match[0].replace(/^---\s*\n?\s*/, '').trim();
            mainContent = mainContent.replace(match[0], '').trim();
            break;
        }
    }

    // Final validation: if mainContent is empty or just whitespace, something went wrong
    // Reset and show everything as main content
    if (!mainContent || mainContent.length < 5) {
        // Check if reasoning has the actual answer content
        if (reasoning && reasoning.length > 20) {
            // Keep as is - reasoning has content and mainContent is legitimately empty
        } else {
            // Reset - parsing failed
            mainContent = text;
            reasoning = null;
        }
    }

    return { reasoning, mainContent, rabbitRankPromo };
}

// Convert Markdown to HTML for PDF export
function markdownToHTML(markdown: string): string {
    let html = markdown;

    // Escape HTML entities first
    html = html.replace(/&/g, '&amp;');

    // Headers (must be done before other replacements)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks
    html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #0891B2;">$1</a>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr style="border: none; border-top: 2px solid #e2e8f0; margin: 20px 0;">');

    // Unordered lists - handle nested lists
    html = html.replace(/^(\s*)[-*•] (.+)$/gm, (match, indent, content) => {
        const level = Math.floor(indent.length / 2);
        const marginLeft = level * 20;
        return `<li style="margin-left: ${marginLeft}px; margin-bottom: 8px;">${content}</li>`;
    });

    // Wrap consecutive li elements in ul
    html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, '<ul style="list-style-type: disc; padding-left: 20px; margin: 12px 0;">$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom: 8px;">$1</li>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left: 4px solid #00D9FF; padding-left: 16px; margin: 16px 0; background: #f0fdfa; padding: 12px 16px;">$1</blockquote>');

    // Tables - improved parsing
    // Match tables with header, separator, and body rows
    html = html.replace(/(?:^|\n)((?:\|[^\n]+\|\n)+)/g, (match, tableContent) => {
        const lines = tableContent.trim().split('\n').filter((line: string) => line.trim());
        if (lines.length < 2) return match;

        // Check if second line is separator (contains dashes)
        const separatorPattern = /^\|[\s\-:|]+\|$/;
        if (!separatorPattern.test(lines[1])) return match;

        // Parse header row
        const headerCells = lines[0].split('|')
            .filter((cell: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1)
            .map((cell: string) => cell.trim());

        // Parse body rows (skip header and separator)
        const bodyRows = lines.slice(2).map((row: string) => {
            const cells = row.split('|')
                .filter((cell: string, idx: number, arr: string[]) => idx > 0 && idx < arr.length - 1)
                .map((cell: string) => cell.trim());
            return cells;
        });

        // Build HTML table
        const headerHTML = headerCells.map((cell: string) =>
            `<th style="border: 1px solid #d1d5db; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc, #f1f5f9); font-weight: 600; text-align: left; color: #0891B2;">${cell}</th>`
        ).join('');

        const bodyHTML = bodyRows.map((cells: string[]) => {
            const cellsHTML = cells.map((cell: string) =>
                `<td style="border: 1px solid #e5e7eb; padding: 10px 16px; background: white;">${cell}</td>`
            ).join('');
            return `<tr>${cellsHTML}</tr>`;
        }).join('');

        return `
<table style="border-collapse: collapse; width: 100%; margin: 24px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <thead style="background: #f8fafc;">
        <tr>${headerHTML}</tr>
    </thead>
    <tbody>
        ${bodyHTML}
    </tbody>
</table>`;
    });

    // Paragraphs - wrap text blocks
    html = html.split('\n\n').map(block => {
        if (block.trim() &&
            !block.startsWith('<h') &&
            !block.startsWith('<ul') &&
            !block.startsWith('<ol') &&
            !block.startsWith('<pre') &&
            !block.startsWith('<table') &&
            !block.startsWith('<blockquote') &&
            !block.startsWith('<hr')) {
            return `<p style="margin: 12px 0; line-height: 1.7;">${block.replace(/\n/g, '<br>')}</p>`;
        }
        return block;
    }).join('\n');

    return html;
}

// PDF Export function
async function exportToPDF(content: string, title: string = 'SEO-Assistant-Response') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedContent = markdownToHTML(content);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Tahoma, Geneva, Verdana, sans-serif;
          padding: 50px;
          max-width: 850px;
          margin: 0 auto;
          color: #1f2937;
          line-height: 1.7;
          font-size: 14px;
        }
        h1 { 
          color: #0891B2; 
          font-size: 24px;
          border-bottom: 3px solid #00D9FF; 
          padding-bottom: 12px;
          margin-top: 30px;
        }
        h2 { 
          color: #0891B2; 
          font-size: 20px;
          margin-top: 28px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        h3 { 
          color: #0891B2; 
          font-size: 16px;
          margin-top: 24px;
        }
        code { 
          background: #f1f5f9; 
          padding: 3px 8px; 
          border-radius: 6px; 
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          color: #0891B2;
        }
        pre { 
          background: #1e293b; 
          color: #e2e8f0; 
          padding: 20px; 
          border-radius: 12px; 
          overflow-x: auto;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.5;
          margin: 20px 0;
        }
        pre code {
          background: transparent;
          color: inherit;
          padding: 0;
        }
        strong { color: #0f172a; }
        a { color: #0891B2; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #e2e8f0;
        }
        .header h1 {
          border: none;
          margin: 0;
          padding: 0;
        }
        .logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #22d3ee, #0891b2);
          border-radius: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          font-size: 28px;
        }
        .content {
          padding: 20px 0;
        }
        .footer { 
          margin-top: 50px; 
          padding-top: 25px; 
          border-top: 2px solid #e2e8f0; 
          text-align: center; 
          color: #6b7280; 
          font-size: 12px;
        }
        .footer a {
          color: #0891B2;
          font-weight: 600;
        }
        @media print { 
          body { padding: 30px; }
          .header { page-break-after: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🤖</div>
        <h1>Rabbit Rank AI</h1>
        <p style="color: #6b7280; margin-top: 8px;">SEO Assistant Report • Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="content">
        ${formattedContent}
      </div>
      <div class="footer">
        <p>💡 For professional SEO implementation and measurable results, visit <a href="https://rabbitrank.com">Rabbit Rank</a></p>
        <p style="margin-top: 8px; color: #9ca3af;">© ${new Date().getFullYear()} Rabbit Rank. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

export function MessageBubble({
    message,
    isStreaming = false,
    isPinned = false,
    onTogglePin,
    onQuickAction,
    onNotify
}: MessageBubbleProps) {
    const isUser = message.sender === 'user';
    const [copied, setCopied] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Parse message content
    const { reasoning, mainContent, rabbitRankPromo } = parseMessageContent(message.text || '');

    // Typing effect for AI messages
    const { displayedText, isComplete } = useTypingEffect(
        mainContent,
        8,
        !isUser && !hasAnimated && mainContent.length < 3000
    );

    useEffect(() => {
        if (isComplete && !isUser) {
            setHasAnimated(true);
        }
    }, [isComplete, isUser]);

    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const sourceConfig = message.dataSource
        ? SEO_DATA_SOURCES.find(source => source.id === message.dataSource)
        : undefined;

    const responseModeLabel = message.responseMode
        ? RESPONSE_MODE_LABELS[message.responseMode] || message.responseMode
        : undefined;

    const modelLabel = message.model || 'Gemini 2.5 Flash';

    const handleCopy = async () => {
        if (message.text) {
            await navigator.clipboard.writeText(mainContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.('Copied response to clipboard', 'success');
        }
    };

    const handleExportPDF = () => {
        exportToPDF(mainContent);
        onNotify?.('Preparing PDF export', 'info');
    };

    const handleCopyUserMessage = async () => {
        if (message.text) {
            await navigator.clipboard.writeText(message.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onNotify?.('Copied message to clipboard', 'success');
        }
    };

    const startPlayback = (url: string) => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
            setIsPlaying(false);
            onNotify?.('Audio playback failed', 'error');
        };
        audio.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
                setIsPlaying(false);
                onNotify?.('Audio playback failed', 'error');
            });
    };

    const handleToggleSpeech = async () => {
        if (isSpeaking) return;

        if (isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        if (audioUrl) {
            startPlayback(audioUrl);
            return;
        }

        try {
            setIsSpeaking(true);
            const url = await generateSpeech(mainContent);
            setAudioUrl(url);
            startPlayback(url);
        } catch (error) {
            onNotify?.('Failed to generate audio', 'error');
        } finally {
            setIsSpeaking(false);
        }
    };

    const contentToShow = hasAnimated ? mainContent : displayedText;

    return (
        <div
            id={`message-${message.id}`}
            className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
        >
            <div className={`flex w-full ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
                {!isUser && (
                    <div className="flex-shrink-0 pt-1">
                        <div className="
                          w-11 h-11 rounded-2xl 
                          flex items-center justify-center
                          bg-gradient-to-br from-cyan-400 to-cyan-600
                          shadow-xl shadow-cyan-500/30
                        ">
                            <Bot size={18} className="text-white" />
                        </div>
                    </div>
                )}

                {isUser && (
                    <div className="relative flex-shrink-0 pt-1">
                        <div className="
                          w-11 h-11 rounded-2xl 
                          flex items-center justify-center
                          bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-500
                          shadow-xl shadow-cyan-500/40
                        ">
                            <Sparkles size={16} className="text-white animate-pulse" />
                        </div>
                    </div>
                )}

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                    <div className={`flex items-center gap-2 mb-2 px-1 ${isUser ? 'justify-end' : 'justify-between'} w-full`}>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                {isUser ? 'You' : 'Rabbit Rank AI'}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                {formatTime(message.timestamp)}
                            </span>
                        </div>
                        {!isComplete && !isUser && (
                            <span className="flex items-center gap-1 text-[10px] text-cyan-500">
                                <Loader2 size={10} className="animate-spin" />
                                typing...
                            </span>
                        )}
                    </div>

                    <div className={`
                        relative w-full overflow-hidden rounded-3xl
                        ${isUser
                            ? 'max-w-[520px] bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-500 text-white border border-cyan-400/40 shadow-2xl shadow-cyan-500/20'
                            : 'bg-white/90 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl shadow-zinc-200/50 dark:shadow-black/40 backdrop-blur-xl'
                        }
                    `}>
                        {!isUser && (
                            <div className="flex flex-col gap-3 px-3 sm:px-4 py-3 border-b border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/60 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                        Answer
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-300">
                                        {modelLabel}
                                    </span>
                                    {sourceConfig && sourceConfig.id !== 'none' && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300">
                                            Grounded · {sourceConfig.label}
                                        </span>
                                    )}
                                    {message.thinkingMode && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300">
                                            Thinking
                                        </span>
                                    )}
                                    {responseModeLabel && (
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300">
                                            Style · {responseModeLabel}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    {onTogglePin && (
                                        <button
                                            onClick={() => onTogglePin(message.id)}
                                            className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border border-transparent transition-colors ${isPinned
                                                    ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                                    : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                                }`}
                                            title={isPinned ? 'Unpin message' : 'Pin message'}
                                        >
                                            <Star size={16} className={isPinned ? 'fill-current' : ''} />
                                        </button>
                                    )}
                                    <button
                                        onClick={handleToggleSpeech}
                                        disabled={isSpeaking || !mainContent}
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                                        title={isPlaying ? 'Pause audio' : 'Listen to answer'}
                                    >
                                        {isSpeaking ? <Loader2 size={16} className="animate-spin" /> : isPlaying ? <Pause size={16} /> : <Volume2 size={16} />}
                                    </button>
                                    <button
                                        onClick={handleCopy}
                                        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg border border-transparent transition-colors ${copied
                                                ? 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/30'
                                                : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                        title="Copy answer"
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-transparent text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                        title="Export PDF"
                                    >
                                        <FileDown size={16} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {message.type === 'text' && (
                            isUser ? (
                                <div className="px-5 py-4">
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                                </div>
                            ) : (
                                <div className="px-4 sm:px-5 py-3.5 sm:py-4 space-y-4">
                                    {reasoning && (
                                        <div className="
                                            rounded-xl overflow-hidden 
                                            border border-cyan-200 dark:border-cyan-800
                                            bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/20 dark:to-zinc-800/50
                                        ">
                                            <button
                                                onClick={() => setShowReasoning(!showReasoning)}
                                                className="
                                                  w-full flex items-center gap-2 px-3.5 py-2.5
                                                  text-[10px] font-bold uppercase tracking-wider
                                                  text-cyan-700 dark:text-cyan-400
                                                  hover:bg-cyan-100 dark:hover:bg-cyan-900/30
                                                  transition-all duration-200
                                                "
                                            >
                                                <div className={`
                                                  w-5 h-5 rounded-md flex items-center justify-center
                                                  ${showReasoning
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400'
                                                    }
                                                  transition-colors duration-200
                                                `}>
                                                    <Brain size={10} />
                                                </div>
                                                <span>{showReasoning ? 'Hide Reasoning' : 'View Reasoning'}</span>
                                                <ChevronDown
                                                    size={12}
                                                    className={`ml-auto transition-transform duration-300 ${showReasoning ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            <div className={`
                                                grid transition-all duration-300 ease-in-out
                                                ${showReasoning ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                                            `}>
                                                <div className="overflow-hidden">
                                                    <div className="
                                                        px-3.5 py-3 
                                                        border-t border-cyan-200 dark:border-cyan-800
                                                        bg-cyan-50/50 dark:bg-zinc-900/50
                                                    ">
                                                        <div className="prose prose-sm text-[11px] text-zinc-600 dark:text-zinc-400">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {reasoning}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="prose text-[0.9rem] sm:text-[0.95rem]">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                a: ({ href, children }) => (
                                                    <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 underline decoration-cyan-400/50 hover:decoration-cyan-400 transition-colors font-medium"
                                                    >
                                                        {children}
                                                    </a>
                                                ),
                                                code: ({ className, children, ...props }) => {
                                                    const isInline = !className;
                                                    return isInline ? (
                                                        <code className="
                                                            bg-cyan-100 dark:bg-cyan-900/30 
                                                            px-1.5 py-0.5 rounded text-sm
                                                            text-cyan-700 dark:text-cyan-400
                                                            border border-cyan-200 dark:border-cyan-800
                                                        " {...props}>
                                                            {children}
                                                        </code>
                                                    ) : (
                                                        <code className={className} {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {contentToShow}
                                        </ReactMarkdown>

                                        {!isComplete && !isUser && (
                                            <span className="inline-block w-0.5 h-4 bg-cyan-500 animate-pulse ml-0.5" />
                                        )}
                                    </div>

                                    {rabbitRankPromo && isComplete && (
                                        <div className="
                                            relative mt-6 p-4 rounded-xl
                                            bg-gradient-to-br from-cyan-50 via-white to-teal-50 
                                            dark:from-cyan-900/20 dark:via-zinc-800/50 dark:to-teal-900/20
                                            border-2 border-cyan-200 dark:border-cyan-800
                                            shadow-lg shadow-cyan-500/10
                                            overflow-hidden
                                            animate-fade-in-up
                                        ">
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400" />

                                            <div className="flex items-start gap-3">
                                                <div className="
                                                    flex-shrink-0 w-10 h-10 rounded-xl
                                                    bg-gradient-to-br from-cyan-400 to-teal-500
                                                    flex items-center justify-center
                                                    shadow-lg shadow-cyan-500/30
                                                ">
                                                    <Lightbulb size={18} className="text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-400 mb-1">
                                                        Need Professional SEO Help?
                                                    </h4>
                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                                        For expert implementation and measurable results, consult{' '}
                                                        <a
                                                            href="https://rabbitrank.com"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 underline decoration-cyan-400/50 hover:decoration-cyan-400 transition-colors"
                                                        >
                                                            Rabbit Rank
                                                        </a>
                                                        {' '}— your trusted SEO partner.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        )}

                        {message.type === 'image' && message.image && (
                            <div className="p-3 sm:p-4">
                                <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                    <img src={message.image} alt="Generated" className="w-full h-auto max-h-[600px] object-cover" />
                                </div>
                            </div>
                        )}

                        {!isUser && message.sources && message.sources.length > 0 && (
                            <div className="px-4 sm:px-5 pb-4">
                                <SourcesList sources={message.sources} />
                            </div>
                        )}

                        {!isUser && onQuickAction && isComplete && (
                            <div className="px-4 sm:px-5 pb-5">
                                <div className="flex flex-wrap gap-2">
                                    {QUICK_ACTIONS.map((action) => {
                                        const ActionIcon = action.icon;
                                        return (
                                            <button
                                                key={action.id}
                                                onClick={() => onQuickAction(action.id, mainContent)}
                                                className="
                                                    inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                                                    text-[11px] font-semibold uppercase tracking-wider
                                                    bg-zinc-50 dark:bg-zinc-900
                                                    border border-zinc-200 dark:border-zinc-700
                                                    text-zinc-600 dark:text-zinc-300
                                                    hover:border-cyan-400 dark:hover:border-cyan-600
                                                    hover:text-cyan-600 dark:hover:text-cyan-300
                                                    hover:bg-cyan-50 dark:hover:bg-cyan-900/20
                                                    transition-all duration-200
                                                "
                                            >
                                                <ActionIcon size={12} />
                                                {action.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {isUser && message.type === 'text' && (
                        <div className="flex items-center gap-1.5 mt-2 px-1 justify-end">
                            <button
                                onClick={handleCopyUserMessage}
                                className={`
                                    flex items-center gap-1.5 px-2 py-1 rounded-md
                                    text-[10px] font-medium transition-all duration-200
                                    ${copied
                                        ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400'
                                        : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                                    }
                                    border border-zinc-200/50 dark:border-zinc-700/50
                                `}
                                title="Copy message"
                            >
                                {copied ? <Check size={10} /> : <Copy size={10} />}
                                <span>{copied ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
