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
    Download
} from 'lucide-react';
import { Message } from '@/types';
import { formatTime } from '@/lib/utils';

interface MessageBubbleProps {
    message: Message;
    isStreaming?: boolean;
}

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

    // Extract reasoning section (handles multiple formats from Gemini API)
    const reasoningPatterns = [
        // **Reasoning:** ... **Answer:**
        /\*\*Reasoning:\*\*\s*([\s\S]*?)(?=\*\*(Answer|Final\s+Answer|Response):\*\*)/i,
        // Reasoning: ... Answer: (no bold)
        /^Reasoning:\s*([\s\S]*?)(?=\n(?:Answer|Final\s+Answer|Response):)/im,
        // [Reasoning]...[/Reasoning]
        /\[Reasoning\]([\s\S]*?)\[\/Reasoning\]/i,
        // **Internal Reasoning:** or **Thought Process:**
        /\*\*(Internal\s+)?Reasoning:\*\*\s*([\s\S]*?)(?=\*\*(Answer|Final\s+Answer|Response):\*\*)/i,
        /\*\*Thought\s+Process:\*\*\s*([\s\S]*?)(?=\*\*(Answer|Final\s+Answer|Response):\*\*)/i,
        // --- Reasoning --- style
        /---\s*Reasoning\s*---\s*([\s\S]*?)(?=---\s*(Answer|Final\s+Answer|Response)\s*---)/i,
        // Markdown headers: ## Reasoning ... ## Answer
        /^#{2,3}\s*Reasoning\s*[\r\n]+([\s\S]*?)(?=\n#{2,3}\s*(Answer|Final\s+Answer|Response)\b)/im,
        // (Reasoning: ...) at the start
        /^\s*\(Reasoning:\s*([\s\S]*?)\)\s*\n/i,
        // Thinking: ... Answer: format
        /^Thinking:\s*([\s\S]*?)(?=\n(?:Answer|Final\s+Answer|Response):)/im,
        // <thinking>...</thinking>
        /<thinking>([\s\S]*?)<\/thinking>/i,
    ];

    for (const pattern of reasoningPatterns) {
        const match = mainContent.match(pattern);
        if (match) {
            // Handle different capture group positions
            reasoning = (match[2] || match[1]).trim();
            mainContent = mainContent.replace(match[0], '').trim();
            // Clean up answer prefixes
            mainContent = mainContent.replace(/^\*\*(Answer|Final\s+Answer|Response):\*\*\s*/i, '').trim();
            mainContent = mainContent.replace(/^---\s*(Answer|Final\s+Answer|Response)\s*---\s*/i, '').trim();
            mainContent = mainContent.replace(/^(Answer|Final\s+Answer|Response):\s*/i, '').trim();
            break;
        }
    }

    // Also check for <thinking> tags that might appear multiple times
    const thinkingMatches = mainContent.match(/<thinking>([\s\S]*?)<\/thinking>/gi);
    if (thinkingMatches && !reasoning) {
        const allThinking = thinkingMatches.map(m => m.replace(/<\/?thinking>/gi, '').trim()).join('\n\n');
        reasoning = allThinking;
        mainContent = mainContent.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
    }

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

export function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
    const isUser = message.sender === 'user';
    const [copied, setCopied] = useState(false);
    const [showReasoning, setShowReasoning] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

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

    const handleCopy = async () => {
        if (message.text) {
            await navigator.clipboard.writeText(mainContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleExportPDF = () => {
        exportToPDF(mainContent);
    };

    const handleCopyUserMessage = async () => {
        if (message.text) {
            await navigator.clipboard.writeText(message.text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const contentToShow = hasAnimated ? mainContent : displayedText;

    return (
        <div className={`flex w-full mb-8 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div className={`flex ${isUser ? 'max-w-md' : 'max-w-[85%]'} ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                {/* AI Avatar */}
                {!isUser && (
                    <div className="flex-shrink-0">
                        <div className="
                          w-10 h-10 rounded-xl 
                          flex items-center justify-center
                          bg-gradient-to-br from-cyan-400 to-cyan-600
                          shadow-lg shadow-cyan-500/30
                        ">
                            <Bot size={18} className="text-white" />
                        </div>
                    </div>
                )}

                {/* User Avatar */}
                {isUser && (
                    <div className="relative flex-shrink-0 group">
                        <div className="
                          w-10 h-10 rounded-xl 
                          flex items-center justify-center
                          bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-500
                          shadow-lg shadow-cyan-500/40
                          transition-all duration-300
                          group-hover:scale-110 group-hover:shadow-cyan-400/60
                        ">
                            <Sparkles size={16} className="text-white animate-pulse" />
                        </div>
                    </div>
                )}

                {/* Message content */}
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1 min-w-0`}>
                    {/* Header - Just timestamp */}
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                            {formatTime(message.timestamp)}
                        </span>
                        {!isComplete && !isUser && (
                            <span className="flex items-center gap-1 text-[10px] text-cyan-500">
                                <Loader2 size={10} className="animate-spin" />
                                typing...
                            </span>
                        )}
                    </div>

                    {/* Message bubble */}
                    <div className={`
            w-full rounded-2xl overflow-hidden
            ${isUser
                            ? 'bg-gradient-to-br from-cyan-500 via-cyan-400 to-teal-500 text-white px-4 py-2.5 rounded-tr-sm shadow-lg shadow-cyan-500/25'
                            : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-5 py-4 rounded-tl-sm shadow-lg shadow-zinc-200/50 dark:shadow-black/20'
                        }
            transition-all duration-300 hover:shadow-xl
          `}>
                        {message.type === 'text' && (
                            isUser ? (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Reasoning Section - COLLAPSED BY DEFAULT */}
                                    {reasoning && (
                                        <div className="
                      rounded-xl overflow-hidden 
                      border-2 border-cyan-200 dark:border-cyan-800
                      bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-900/20 dark:to-zinc-800/50
                    ">
                                            <button
                                                onClick={() => setShowReasoning(!showReasoning)}
                                                className="
                          w-full flex items-center gap-3 px-4 py-3
                          text-xs font-bold uppercase tracking-wider
                          text-cyan-700 dark:text-cyan-400
                          hover:bg-cyan-100 dark:hover:bg-cyan-900/30
                          transition-all duration-200
                        "
                                            >
                                                <div className={`
                          w-6 h-6 rounded-lg flex items-center justify-center
                          ${showReasoning
                                                        ? 'bg-cyan-500 text-white'
                                                        : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400'
                                                    }
                          transition-colors duration-200
                        `}>
                                                    <Brain size={12} />
                                                </div>
                                                <span>{showReasoning ? 'Hide Reasoning' : 'View Reasoning'}</span>
                                                <ChevronDown
                                                    size={14}
                                                    className={`ml-auto transition-transform duration-300 ${showReasoning ? 'rotate-180' : ''}`}
                                                />
                                            </button>

                                            {/* Collapsible content */}
                                            <div className={`
                        grid transition-all duration-300 ease-in-out
                        ${showReasoning ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                      `}>
                                                <div className="overflow-hidden">
                                                    <div className="
                            px-4 py-3 
                            border-t-2 border-cyan-200 dark:border-cyan-800
                            bg-cyan-50/50 dark:bg-zinc-900/50
                          ">
                                                        <div className="prose prose-sm text-zinc-600 dark:text-zinc-400">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                                {reasoning}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Main content */}
                                    <div className="prose">
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

                                        {/* Typing cursor */}
                                        {!isComplete && !isUser && (
                                            <span className="inline-block w-0.5 h-4 bg-cyan-500 animate-pulse ml-0.5" />
                                        )}
                                    </div>

                                    {/* Rabbit Rank Promotion Box */}
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
                            <div className="mt-2 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                                <img src={message.image} alt="Generated" className="w-full h-auto max-h-[600px] object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Action Buttons - Professional styling */}
                    {!isUser && message.type === 'text' && isComplete && (
                        <div className="flex items-center gap-2 mt-3 px-1">
                            {/* Copy Button */}
                            <button
                                onClick={handleCopy}
                                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-all duration-200
                  border
                  ${copied
                                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-400'
                                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                                    }
                `}
                            >
                                {copied ? (
                                    <>
                                        <Check size={14} />
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={14} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>

                            {/* Export PDF Button */}
                            <button
                                onClick={handleExportPDF}
                                className="
                  flex items-center gap-2 px-3 py-1.5 rounded-lg
                  text-xs font-medium transition-all duration-200
                  border
                  bg-zinc-50 dark:bg-zinc-800 
                  border-zinc-200 dark:border-zinc-700 
                  text-zinc-600 dark:text-zinc-400 
                  hover:border-cyan-300 dark:hover:border-cyan-700 
                  hover:bg-cyan-50 dark:hover:bg-cyan-900/20
                  hover:text-cyan-700 dark:hover:text-cyan-400
                "
                            >
                                <FileDown size={14} />
                                <span>Export PDF</span>
                            </button>
                        </div>
                    )}

                    {/* User Message Action Buttons */}
                    {isUser && message.type === 'text' && (
                        <div className="flex items-center gap-1.5 mt-2 px-1 justify-end">
                            {/* Copy Button */}
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
