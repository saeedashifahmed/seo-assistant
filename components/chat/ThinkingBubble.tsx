'use client';

import { useState, useEffect } from 'react';
import { Brain } from 'lucide-react';

interface ThinkingBubbleProps {
    dataSource?: string;
}

export function ThinkingBubble({ dataSource }: ThinkingBubbleProps) {
    const [step, setStep] = useState(0);

    const steps = [
        'Analyzing your SEO query...',
        dataSource && dataSource !== 'none'
            ? `Searching ${dataSource} data...`
            : 'Consulting SEO knowledge base...',
        'Formulating strategy...',
        'Preparing recommendations...'
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setStep(prev => (prev + 1) % steps.length);
        }, 1500);
        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <div className="flex w-full mb-8 justify-start animate-fade-in-up">
            <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="
          relative flex-shrink-0 w-10 h-10 rounded-xl 
          flex items-center justify-center
          bg-gradient-to-br from-cyan-400 to-cyan-600
          shadow-lg shadow-cyan-500/30
        ">
                    <Brain size={18} className="text-white" />

                    {/* Animated ring */}
                    <div className="
            absolute inset-0 rounded-xl
            border-2 border-cyan-400
            animate-ping opacity-30
          " />
                </div>

                {/* Thinking text */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            SEO Assistant
                        </span>
                        <span className="
              px-2 py-0.5 rounded-full
              text-[10px] font-bold uppercase tracking-wider
              bg-cyan-100 dark:bg-cyan-900/30
              text-cyan-600 dark:text-cyan-400
              animate-pulse
            ">
                            Thinking
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {steps[step]}
                        </span>

                        {/* Animated dots */}
                        <div className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full bg-cyan-500"
                                    style={{
                                        animation: 'pulse 1.4s infinite',
                                        animationDelay: `${i * 0.2}s`
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
