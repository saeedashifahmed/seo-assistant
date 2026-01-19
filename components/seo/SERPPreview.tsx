'use client';

import { useState, useEffect } from 'react';
import {
    Globe,
    Search,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    CheckCircle,
    Eye
} from 'lucide-react';

interface SERPPreviewProps {
    title?: string;
    url?: string;
    description?: string;
    onTitleChange?: (title: string) => void;
    onDescriptionChange?: (description: string) => void;
}

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

export function SERPPreview({
    title = '',
    url = 'https://example.com/page',
    description = '',
    onTitleChange,
    onDescriptionChange
}: SERPPreviewProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [editableTitle, setEditableTitle] = useState(title);
    const [editableDescription, setEditableDescription] = useState(description);

    useEffect(() => {
        setEditableTitle(title);
    }, [title]);

    useEffect(() => {
        setEditableDescription(description);
    }, [description]);

    const titleLength = editableTitle.length;
    const descriptionLength = editableDescription.length;

    const getTitleStatus = () => {
        if (titleLength === 0) return { color: 'text-zinc-400', status: 'empty' };
        if (titleLength < 30) return { color: 'text-yellow-500', status: 'short' };
        if (titleLength <= TITLE_LIMIT) return { color: 'text-green-500', status: 'good' };
        return { color: 'text-red-500', status: 'long' };
    };

    const getDescriptionStatus = () => {
        if (descriptionLength === 0) return { color: 'text-zinc-400', status: 'empty' };
        if (descriptionLength < 120) return { color: 'text-yellow-500', status: 'short' };
        if (descriptionLength <= DESCRIPTION_LIMIT) return { color: 'text-green-500', status: 'good' };
        return { color: 'text-red-500', status: 'long' };
    };

    const titleStatus = getTitleStatus();
    const descriptionStatus = getDescriptionStatus();

    const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const truncatedTitle = editableTitle.length > 60 ? editableTitle.slice(0, 60) + '...' : editableTitle;
    const truncatedDescription = editableDescription.length > 160 ? editableDescription.slice(0, 160) + '...' : editableDescription;

    return (
        <div className="
      bg-white dark:bg-zinc-900 
      border border-zinc-200 dark:border-zinc-800 
      rounded-2xl overflow-hidden
      shadow-lg shadow-zinc-200/50 dark:shadow-black/20
    ">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="
          w-full flex items-center justify-between 
          px-5 py-4 
          bg-gradient-to-r from-cyan-50 to-white dark:from-cyan-900/20 dark:to-zinc-900
          border-b border-zinc-200 dark:border-zinc-800
          hover:bg-cyan-50 dark:hover:bg-cyan-900/30
          transition-colors
        "
            >
                <div className="flex items-center gap-3">
                    <div className="
            w-10 h-10 rounded-xl 
            bg-gradient-to-br from-cyan-400 to-cyan-600
            flex items-center justify-center
            shadow-lg shadow-cyan-500/30
          ">
                        <Eye size={18} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                            SERP Preview
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            See how your page appears in Google search results
                        </p>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={20} className="text-zinc-400" />
                ) : (
                    <ChevronDown size={20} className="text-zinc-400" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="p-5 space-y-6">
                    {/* Google Preview */}
                    <div className="
            p-4 rounded-xl 
            bg-white dark:bg-zinc-800 
            border border-zinc-200 dark:border-zinc-700
          ">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 flex items-center gap-2">
                            <Search size={12} />
                            Google Search Preview
                        </p>

                        {/* SERP Result */}
                        <div className="space-y-1">
                            {/* URL */}
                            <div className="flex items-center gap-2 text-sm">
                                <Globe size={14} className="text-zinc-400" />
                                <span className="text-zinc-600 dark:text-zinc-400 truncate">
                                    {displayUrl}
                                </span>
                            </div>

                            {/* Title */}
                            <h4 className="
                text-lg font-medium 
                text-blue-600 dark:text-blue-400
                hover:underline cursor-pointer
                line-clamp-2
              ">
                                {truncatedTitle || 'Enter your page title...'}
                            </h4>

                            {/* Description */}
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                                {truncatedDescription || 'Enter your meta description...'}
                            </p>
                        </div>
                    </div>

                    {/* Edit Fields */}
                    <div className="space-y-4">
                        {/* Title Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Page Title
                                </label>
                                <span className={`text-xs font-medium ${titleStatus.color}`}>
                                    {titleLength}/{TITLE_LIMIT} characters
                                </span>
                            </div>
                            <input
                                type="text"
                                value={editableTitle}
                                onChange={(e) => {
                                    setEditableTitle(e.target.value);
                                    onTitleChange?.(e.target.value);
                                }}
                                placeholder="Enter your SEO title..."
                                className="
                  w-full px-4 py-3 rounded-xl
                  bg-zinc-50 dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  focus:border-cyan-500 dark:focus:border-cyan-500
                  focus:ring-2 focus:ring-cyan-500/20
                  outline-none transition-all
                  text-zinc-800 dark:text-zinc-200
                  placeholder:text-zinc-400
                "
                            />
                            {/* Status indicator */}
                            <div className="flex items-center gap-2 text-xs">
                                {titleStatus.status === 'good' ? (
                                    <CheckCircle size={14} className="text-green-500" />
                                ) : titleLength > 0 ? (
                                    <AlertTriangle size={14} className={titleStatus.color} />
                                ) : null}
                                <span className={titleStatus.color}>
                                    {titleStatus.status === 'empty' && 'Add a title for better SEO'}
                                    {titleStatus.status === 'short' && 'Title is a bit short. Aim for 50-60 characters.'}
                                    {titleStatus.status === 'good' && 'Perfect length!'}
                                    {titleStatus.status === 'long' && 'Title may be truncated in search results.'}
                                </span>
                            </div>
                        </div>

                        {/* Description Input */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Meta Description
                                </label>
                                <span className={`text-xs font-medium ${descriptionStatus.color}`}>
                                    {descriptionLength}/{DESCRIPTION_LIMIT} characters
                                </span>
                            </div>
                            <textarea
                                value={editableDescription}
                                onChange={(e) => {
                                    setEditableDescription(e.target.value);
                                    onDescriptionChange?.(e.target.value);
                                }}
                                placeholder="Enter your meta description..."
                                rows={3}
                                className="
                  w-full px-4 py-3 rounded-xl
                  bg-zinc-50 dark:bg-zinc-800
                  border border-zinc-200 dark:border-zinc-700
                  focus:border-cyan-500 dark:focus:border-cyan-500
                  focus:ring-2 focus:ring-cyan-500/20
                  outline-none transition-all resize-none
                  text-zinc-800 dark:text-zinc-200
                  placeholder:text-zinc-400
                "
                            />
                            {/* Status indicator */}
                            <div className="flex items-center gap-2 text-xs">
                                {descriptionStatus.status === 'good' ? (
                                    <CheckCircle size={14} className="text-green-500" />
                                ) : descriptionLength > 0 ? (
                                    <AlertTriangle size={14} className={descriptionStatus.color} />
                                ) : null}
                                <span className={descriptionStatus.color}>
                                    {descriptionStatus.status === 'empty' && 'Add a description to improve click-through rates'}
                                    {descriptionStatus.status === 'short' && 'Description is short. Aim for 150-160 characters.'}
                                    {descriptionStatus.status === 'good' && 'Great length!'}
                                    {descriptionStatus.status === 'long' && 'Description may be truncated in search results.'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* SEO Tips */}
                    <div className="
            p-4 rounded-xl
            bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20
            border border-cyan-200 dark:border-cyan-800
          ">
                        <h4 className="text-sm font-bold text-cyan-700 dark:text-cyan-400 mb-2">
                            💡 Quick SEO Tips
                        </h4>
                        <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                            <li>• Include your main keyword in the title</li>
                            <li>• Make the description compelling and action-oriented</li>
                            <li>• Use numbers and power words to increase CTR</li>
                            <li>• Ensure title and description accurately reflect page content</li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
