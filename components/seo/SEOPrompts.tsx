'use client';

import { Search, Settings, FileText, Link2 } from 'lucide-react';
import { SEO_PROMPTS } from '@/types';

const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    Search,
    Settings,
    FileText,
    Link: Link2,
};

interface SEOPromptsProps {
    onSelect: (text: string) => void;
}

export function SEOPrompts({ onSelect }: SEOPromptsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 animate-fade-in-up">
            {SEO_PROMPTS.map((prompt, idx) => {
                const IconComponent = IconMap[prompt.icon] || Search;

                return (
                    <button
                        key={idx}
                        onClick={() => onSelect(prompt.text)}
                        className="
              group relative flex flex-col items-start p-4 sm:p-5 rounded-2xl
              border border-zinc-200 dark:border-zinc-800
              bg-white dark:bg-zinc-900
              hover:border-cyan-400 dark:hover:border-cyan-600
              hover:shadow-lg hover:shadow-cyan-500/10
              transition-all duration-300 text-left
              overflow-hidden
            "
                    >
                        {/* Gradient overlay on hover */}
                        <div className="
              absolute inset-0 opacity-0 group-hover:opacity-100
              bg-gradient-to-br from-cyan-50/50 to-transparent
              dark:from-cyan-900/20 dark:to-transparent
              transition-opacity duration-300
            " />

                        {/* Category badge */}
                        <span className="
              relative z-10 px-2.5 py-0.5 rounded-full
              text-[10px] font-bold uppercase tracking-wider
              bg-cyan-100 dark:bg-cyan-900/30
              text-cyan-700 dark:text-cyan-400
              mb-3
            ">
                            {prompt.category}
                        </span>

                        {/* Icon and label */}
                        <div className="relative z-10 flex items-center gap-3 mb-2">
                            <div className="
                w-8 h-8 rounded-lg flex items-center justify-center
                bg-zinc-100 dark:bg-zinc-800
                group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/30
                transition-colors duration-300
              ">
                                <IconComponent
                                    size={16}
                                    className="text-cyan-600 dark:text-cyan-400"
                                />
                            </div>
                            <span className="
                text-sm font-semibold 
                text-zinc-900 dark:text-white
                group-hover:text-cyan-700 dark:group-hover:text-cyan-400
                transition-colors duration-300
              ">
                                {prompt.label}
                            </span>
                        </div>

                        {/* Description */}
                        <span className="
              relative z-10 text-xs leading-relaxed
              text-zinc-500 dark:text-zinc-400 
              line-clamp-2
            ">
                            {prompt.text}
                        </span>

                        {/* Arrow indicator */}
                        <div className="
              absolute bottom-4 right-4 
              opacity-0 group-hover:opacity-100
              transform translate-x-2 group-hover:translate-x-0
              transition-all duration-300
            ">
                            <svg
                                className="w-5 h-5 text-cyan-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                                />
                            </svg>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
