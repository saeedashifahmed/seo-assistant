'use client';

import { Globe, ExternalLink } from 'lucide-react';
import { Source } from '@/types';

interface SourcesListProps {
    sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
    if (!sources || sources.length === 0) return null;

    // Group sources by domain
    const groupedSources = sources.reduce((acc, source) => {
        try {
            const domain = new URL(source.uri).hostname.replace('www.', '');
            if (!acc[domain]) {
                acc[domain] = [];
            }
            acc[domain].push(source);
        } catch {
            if (!acc['other']) {
                acc['other'] = [];
            }
            acc['other'].push(source);
        }
        return acc;
    }, {} as Record<string, Source[]>);

    return (
        <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-4">
                <div className="
          w-6 h-6 rounded-lg 
          bg-blue-100 dark:bg-blue-900/30 
          flex items-center justify-center
        ">
                    <Globe size={12} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="
          text-[11px] font-bold uppercase tracking-widest
          text-zinc-500 dark:text-zinc-400
        ">
                    Sources ({sources.length})
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => (
                    <a
                        key={idx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
              group flex items-center gap-2 px-3 py-2 rounded-xl
              bg-zinc-50 dark:bg-zinc-800/50
              border border-zinc-200 dark:border-zinc-700
              hover:border-cyan-400 dark:hover:border-cyan-600
              hover:bg-white dark:hover:bg-zinc-800
              hover:shadow-lg hover:shadow-cyan-500/5
              transition-all duration-200
            "
                    >
                        <Globe size={14} className="text-blue-500 dark:text-blue-400" />
                        <span className="
              text-xs font-medium truncate max-w-[180px]
              text-zinc-600 dark:text-zinc-400
              group-hover:text-zinc-900 dark:group-hover:text-zinc-200
            ">
                            {source.title}
                        </span>
                        <ExternalLink
                            size={12}
                            className="
                text-zinc-400 opacity-0 
                group-hover:opacity-100 
                transition-opacity duration-200
              "
                        />
                    </a>
                ))}
            </div>
        </div>
    );
}
