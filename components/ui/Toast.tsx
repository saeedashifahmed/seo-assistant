'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';

interface ToastProps {
    message: string | null;
    onClose: () => void;
    type?: 'info' | 'error' | 'success';
}

export function Toast({ message, onClose, type = 'info' }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalRoot(document.body);
    }, []);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message || !portalRoot) return null;

    const colors = {
        info: 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20',
        error: 'border-red-500/30 bg-red-50 dark:bg-red-900/20',
        success: 'border-green-500/30 bg-green-50 dark:bg-green-900/20',
    };

    const iconColors = {
        info: 'text-emerald-500',
        error: 'text-red-500',
        success: 'text-green-500',
    };

    return createPortal(
        <div
            className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 pointer-events-none transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
                }`}
        >
            <div className={`
        pointer-events-auto glass border ${colors[type]} 
        px-4 py-3 rounded-xl shadow-2xl 
        flex items-center gap-3 
        max-w-[min(24rem,calc(100vw-2rem))]
      `}>
                <AlertCircle size={20} className={iconColors[type]} />
                <div className="flex-1">
                    <h4 className={`text-sm font-semibold ${iconColors[type]}`}>
                        {type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notification'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {message}
                    </p>
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>
        </div>,
        portalRoot
    );
}
