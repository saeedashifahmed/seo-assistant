'use client';

import {
    Brain,
    Trash2,
    Zap,
    BarChart3,
    FileText,
    Link2,
    Settings,
    HelpCircle,
    ExternalLink,
    BookOpen,
    Eye,
    Search,
    X
} from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

interface SidebarProps {
    onNewChat: () => void;
    onClearChat: () => void;
    onToolSelect?: (prompt: string) => void;
    isMobile?: boolean;
    onClose?: () => void;
}

const SEO_TOOLS = [
    {
        icon: Search,
        label: 'Keyword Research',
        description: 'Find high-value keywords',
        prompt: 'Help me conduct comprehensive keyword research for my website. I need to identify high-volume, low-competition keywords that align with my niche. Provide a step-by-step approach including tools and techniques.'
    },
    {
        icon: BarChart3,
        label: 'Rank Tracking',
        description: 'Monitor SERP positions',
        prompt: 'How can I set up effective rank tracking for my website? Explain the best practices for monitoring SERP positions, tracking keyword rankings over time, and identifying ranking fluctuations.'
    },
    {
        icon: FileText,
        label: 'Content Audit',
        description: 'Optimize existing content',
        prompt: 'Guide me through performing a comprehensive content audit for my website. How do I identify underperforming pages, content gaps, and opportunities for content optimization to improve SEO?'
    },
    {
        icon: Link2,
        label: 'Backlink Analysis',
        description: 'Analyze link profile',
        prompt: 'Help me analyze my website\'s backlink profile. What metrics should I focus on, how do I identify toxic backlinks, and what strategies can I use to build high-quality backlinks?'
    },
    {
        icon: Settings,
        label: 'Technical SEO',
        description: 'Site health check',
        prompt: 'Perform a technical SEO audit checklist for my website. Cover site speed, mobile-friendliness, crawlability, indexation issues, Core Web Vitals, and structured data implementation.'
    },
    {
        icon: Eye,
        label: 'SERP Preview',
        description: 'Preview Google results',
        prompt: 'Help me optimize my title tag and meta description for SEO. Provide best practices for crafting compelling titles and descriptions that improve click-through rates in Google search results.'
    },
];

export function Sidebar({ onNewChat, onClearChat, onToolSelect, isMobile = false, onClose }: SidebarProps) {
    const handleToolClick = (prompt: string) => {
        if (onToolSelect) {
            onToolSelect(prompt);
        }
        // Close sidebar on mobile after selecting a tool
        if (isMobile && onClose) {
            onClose();
        }
    };

    const handleNewChatClick = () => {
        onNewChat();
        // Close sidebar on mobile after starting new chat
        if (isMobile && onClose) {
            onClose();
        }
    };

    const handleClearChatClick = () => {
        onClearChat();
        // Close sidebar on mobile after clearing chat
        if (isMobile && onClose) {
            onClose();
        }
    };

    return (
        <div className={`
      ${isMobile ? 'flex' : 'hidden md:flex'} w-[280px] flex-col h-full
      border-r border-zinc-200 dark:border-zinc-800
      bg-white dark:bg-zinc-900
      transition-colors duration-300
    `}>
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="
                w-10 h-10
                bg-gradient-to-br from-cyan-400 to-cyan-600
                rounded-xl flex items-center justify-center
                shadow-lg shadow-cyan-500/30
              ">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-base tracking-tight bg-gradient-to-r from-cyan-600 to-teal-500 bg-clip-text text-transparent">
                                Rabbit Rank AI
                            </h1>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                                SEO Assistant
                            </p>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    {isMobile && onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X size={20} className="text-zinc-500 dark:text-zinc-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={handleNewChatClick}
                    className="
            w-full flex items-center justify-center gap-2
            py-3 px-4 rounded-xl
            bg-gradient-to-r from-cyan-400 to-cyan-600
            text-white font-semibold text-sm
            shadow-lg shadow-cyan-500/30
            hover:shadow-cyan-500/50
            transition-all duration-300
            hover:scale-[1.02]
          "
                >
                    <span>+ New SEO Chat</span>
                </button>
            </div>

            {/* SEO Tools Quick Access */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
                <div className="mb-4">
                    <h3 className="
            text-[10px] font-bold uppercase tracking-widest
            text-zinc-400 dark:text-zinc-500 mb-3 px-1
          ">
                        Quick SEO Tools
                    </h3>

                    <div className="space-y-1">
                        {SEO_TOOLS.map((tool, idx) => {
                            const IconComponent = tool.icon;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleToolClick(tool.prompt)}
                                    className="
                    w-full flex items-center gap-3 p-3 rounded-xl
                    text-left transition-all duration-200
                    text-zinc-600 dark:text-zinc-400
                    hover:bg-cyan-50 dark:hover:bg-cyan-900/20
                    hover:text-zinc-900 dark:hover:text-zinc-100
                    group cursor-pointer
                    border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800
                  "
                                >
                                    <div className="
                    w-8 h-8 rounded-lg flex items-center justify-center
                    bg-zinc-100 dark:bg-zinc-800
                    group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40
                    transition-colors duration-200
                  ">
                                        <IconComponent
                                            size={14}
                                            className="text-zinc-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium block group-hover:text-cyan-700 dark:group-hover:text-cyan-300">{tool.label}</span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate">
                                            {tool.description}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Help Section */}
                <div className="mb-4">
                    <h3 className="
            text-[10px] font-bold uppercase tracking-widest
            text-zinc-400 dark:text-zinc-500 mb-3 px-1
          ">
                        Resources
                    </h3>

                    <a
                        href="https://rabbitrank.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
              flex items-center gap-3 p-3 rounded-xl
              text-zinc-600 dark:text-zinc-400
              hover:bg-cyan-50 dark:hover:bg-cyan-900/20
              hover:text-zinc-900 dark:hover:text-zinc-100
              transition-all duration-200 group
              border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800
            "
                    >
                        <div className="
              w-8 h-8 rounded-lg flex items-center justify-center
              bg-zinc-100 dark:bg-zinc-800
              group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40
              transition-colors duration-200
            ">
                            <ExternalLink size={14} className="text-zinc-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-cyan-700 dark:group-hover:text-cyan-300">Visit Rabbit Rank</span>
                    </a>

                    <a
                        href="https://rabbitrank.com/blog"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
              flex items-center gap-3 p-3 rounded-xl
              text-zinc-600 dark:text-zinc-400
              hover:bg-cyan-50 dark:hover:bg-cyan-900/20
              hover:text-zinc-900 dark:hover:text-zinc-100
              transition-all duration-200 group
              border border-transparent hover:border-cyan-200 dark:hover:border-cyan-800
            "
                    >
                        <div className="
              w-8 h-8 rounded-lg flex items-center justify-center
              bg-zinc-100 dark:bg-zinc-800
              group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40
              transition-colors duration-200
            ">
                            <BookOpen size={14} className="text-zinc-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400" />
                        </div>
                        <span className="text-sm font-medium group-hover:text-cyan-700 dark:group-hover:text-cyan-300">SEO Guide</span>
                    </a>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="mt-auto p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                {/* Clear Chat Button */}
                <button
                    onClick={handleClearChatClick}
                    className="
            w-full flex items-center gap-3 p-3 rounded-xl
            text-zinc-500 dark:text-zinc-400
            hover:bg-red-50 dark:hover:bg-red-900/20
            hover:text-red-600 dark:hover:text-red-400
            transition-all duration-200
            border border-transparent hover:border-red-200 dark:hover:border-red-800
          "
                >
                    <Trash2 size={16} />
                    <span className="text-sm font-medium">Clear Chat</span>
                </button>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Engine Status */}
                <div className="
          bg-zinc-50 dark:bg-zinc-950/50 
          rounded-xl p-4 
          border border-zinc-100 dark:border-zinc-800
        ">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={14} className="text-yellow-500" />
                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                            Engine Status
                        </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                        <span className="text-zinc-400 dark:text-zinc-500">Rabbit Rank AI 2.5</span>
                        <span className="text-cyan-500 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                            ONLINE
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
