'use client';

import { useState, useRef, useEffect } from 'react';
import {
    ChevronDown,
    BarChart3,
    TrendingUp,
    Target,
    Newspaper,
    Search,
    LineChart,
    X,
    Check,
    Database,
    LucideProps
} from 'lucide-react';
import { SEODataSource, SEO_DATA_SOURCES } from '@/types';

const IconMap: Record<string, React.ComponentType<LucideProps>> = {
    BarChart3,
    TrendingUp,
    Target,
    Newspaper,
    Search,
    LineChart,
    X,
    Database,
};

interface DataSourceSelectorProps {
    value: SEODataSource;
    onChange: (value: SEODataSource) => void;
}

export function DataSourceSelector({ value, onChange }: DataSourceSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentSource = SEO_DATA_SOURCES.find(s => s.id === value) || SEO_DATA_SOURCES[6];
    const IconComponent = IconMap[currentSource.icon] || Database;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                  group flex items-center gap-1.5 px-2.5 py-2 rounded-xl
                  text-[10px] font-bold uppercase tracking-wider
                  transition-all duration-200 border
                  ${value !== 'none'
                        ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-400 dark:border-cyan-600 text-cyan-700 dark:text-cyan-300'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-cyan-400 dark:hover:border-cyan-600'
                    }
                `}
            >
                <Database size={12} className={value !== 'none' ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-400 group-hover:text-cyan-500'} />
                <span className="hidden sm:inline">{value !== 'none' ? currentSource.label : 'Source'}</span>
                <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="
          absolute bottom-full left-0 mb-2 w-80 
          bg-white dark:bg-zinc-900 
          border-2 border-zinc-200 dark:border-zinc-700 
          rounded-2xl shadow-2xl shadow-black/20
          py-2 z-50 animate-fade-in-up
          max-h-[400px] overflow-hidden
        ">
                    <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                        <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                            <Database size={14} className="text-cyan-500" />
                            SEO Data Source
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                            Ground AI responses with data from trusted SEO platforms
                        </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar py-2">
                        {SEO_DATA_SOURCES.map((source) => {
                            const SourceIcon = IconMap[source.icon] || Database;
                            const isSelected = value === source.id;

                            return (
                                <button
                                    key={source.id}
                                    onClick={() => {
                                        onChange(source.id);
                                        setIsOpen(false);
                                    }}
                                    className={`
                    w-full flex items-center gap-3 px-4 py-3 mx-2
                    text-left transition-all duration-200 rounded-xl
                    ${isSelected
                                            ? 'bg-cyan-100 dark:bg-cyan-900/30 border-2 border-cyan-400 dark:border-cyan-600'
                                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 border-2 border-transparent'
                                        }
                  `}
                                    style={{ width: 'calc(100% - 16px)' }}
                                >
                                    <div
                                        className={`
                      w-10 h-10 rounded-xl flex items-center justify-center
                      transition-all duration-200 flex-shrink-0
                    `}
                                        style={{
                                            backgroundColor: source.color + '20',
                                            border: `2px solid ${source.color}`
                                        }}
                                    >
                                        <SourceIcon size={18} style={{ color: source.color }} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm font-semibold block ${isSelected
                                            ? 'text-cyan-700 dark:text-cyan-300'
                                            : 'text-zinc-800 dark:text-zinc-200'
                                            }`}>
                                            {source.label}
                                        </span>
                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                            {source.description}
                                        </p>
                                    </div>

                                    {isSelected && (
                                        <div className="w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                                            <Check size={14} className="text-white" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
