'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <button className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <div className="w-5 h-5" />
            </button>
        );
    }

    return (
        <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="group flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300
        text-zinc-600 dark:text-zinc-400 
        hover:bg-zinc-100 dark:hover:bg-zinc-800
        hover:text-zinc-900 dark:hover:text-zinc-100
        border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            <div className="relative w-5 h-5">
                <Sun
                    className={`absolute inset-0 transition-all duration-300 ${theme === 'dark'
                            ? 'opacity-100 rotate-0 scale-100'
                            : 'opacity-0 -rotate-90 scale-0'
                        }`}
                    size={20}
                />
                <Moon
                    className={`absolute inset-0 transition-all duration-300 ${theme === 'dark'
                            ? 'opacity-0 rotate-90 scale-0'
                            : 'opacity-100 rotate-0 scale-100'
                        }`}
                    size={20}
                />
            </div>
            <span className="text-sm font-medium">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
        </button>
    );
}
