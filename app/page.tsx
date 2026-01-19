'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, Brain, Plus } from 'lucide-react';
import { Message, Attachment, SEODataSource } from '@/types';
import { generateText } from '@/lib/gemini';
import { generateId } from '@/lib/utils';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ThinkingBubble } from '@/components/chat/ThinkingBubble';
import { InputComposer } from '@/components/chat/InputComposer';
import { SEOPrompts } from '@/components/seo/SEOPrompts';
import { Toast } from '@/components/ui/Toast';

const STORAGE_KEY = 'seo-assistant-messages';

// Load messages from localStorage
function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert timestamp strings back to Date objects
      return parsed.map((msg: Message) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    }
  } catch (e) {
    console.error('Failed to load messages from storage:', e);
  }
  return [];
}

// Save messages to localStorage
function saveMessagesToStorage(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save messages to storage:', e);
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataSource, setDataSource] = useState<SEODataSource>('none');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize on client side - load from localStorage with minimum loading time
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();

    // Animate loading bar over 7 seconds
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2; // Increase by 2% every 140ms = 100% in 7 seconds
      });
    }, 140);

    // Show loading screen for at least 7 seconds
    const timer = setTimeout(() => {
      setMounted(true);
      setMessages(storedMessages);
    }, 7000);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (mounted && messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages, mounted]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    showToast('Started a new SEO chat session', 'success');
    setIsMobileSidebarOpen(false);
  };

  const handleClearChat = () => {
    handleNewChat();
  };

  const handleSubmit = async (text: string, attachment: Attachment | null) => {
    if ((!text.trim() && !attachment) || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      type: 'text',
      sender: 'user',
      text: text || (attachment ? `[Attached File: ${attachment.name}]` : ''),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const { text: responseText, sources } = await generateText(
        text,
        dataSource,
        attachment,
        thinkingMode
      );

      const aiMessage: Message = {
        id: generateId(),
        type: 'text',
        sender: 'ai',
        text: responseText,
        sources,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: generateId(),
        type: 'text',
        sender: 'ai',
        text: `**Error:** ${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      showToast('Failed to generate response', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePromptSelect = (promptText: string) => {
    handleSubmit(promptText, null);
  };

  const handleToolSelect = (prompt: string) => {
    handleSubmit(prompt, null);
  };

  const isEmptyState = messages.length === 0;

  // Show premium loading screen during initial mount
  if (!mounted) {
    return (
      <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 items-center justify-center overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative flex flex-col items-center gap-6">
          {/* Animated logo container */}
          <div className="relative">
            {/* Outer ring */}
            <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 opacity-30 blur animate-spin-slow" style={{ animationDuration: '4s' }} />

            {/* Inner ring */}
            <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 opacity-50 blur-sm animate-pulse" />

            {/* Logo */}
            <div className="
              relative w-16 h-16 rounded-xl 
              bg-gradient-to-br from-cyan-400 to-cyan-600 
              flex items-center justify-center 
              shadow-2xl shadow-cyan-500/40
              animate-glow
            ">
              <Brain size={28} className="text-white" />
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-2">
            <h1 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">
              Rabbit Rank AI
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
              Loading your AI-powered SEO toolkit...
            </p>
          </div>

          {/* Loading bar */}
          <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all duration-150 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">{loadingProgress}%</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      <Toast
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        type={toastType}
      />

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-[280px]
        transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar onNewChat={handleNewChat} onClearChat={handleClearChat} onToolSelect={handleToolSelect} />
      </div>

      {/* Desktop sidebar */}
      <Sidebar onNewChat={handleNewChat} onClearChat={handleClearChat} onToolSelect={handleToolSelect} />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Mobile header */}
        <div className="
          md:hidden flex items-center justify-between 
          p-4 border-b border-zinc-200 dark:border-zinc-800 
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg
          z-30
        ">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu size={20} className="text-zinc-600 dark:text-zinc-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="
              w-8 h-8 rounded-lg 
              bg-gradient-to-br from-cyan-500 to-teal-600 
              flex items-center justify-center
            ">
              <Brain size={14} className="text-white" />
            </div>
            <span className="font-bold text-zinc-900 dark:text-white text-sm">
              Rabbit Rank AI
            </span>
          </div>

          <button
            onClick={handleNewChat}
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Plus size={20} className="text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 scroll-smooth custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Empty state - show prompts */}
            {isEmptyState && !isProcessing && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                <div className="text-center space-y-3">
                  <div className="
                    w-16 h-16 mx-auto rounded-2xl 
                    bg-gradient-to-br from-cyan-400 to-cyan-600 
                    flex items-center justify-center
                    shadow-xl shadow-cyan-500/30
                    mb-4
                  ">
                    <Brain size={28} className="text-white" />
                  </div>
                  <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                    How can I help with your SEO today?
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-md">
                    Ask me anything about keywords, rankings, technical SEO, content optimization, and more.
                  </p>
                </div>
                <SEOPrompts onSelect={handlePromptSelect} />
              </div>
            )}

            {/* Messages */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Thinking indicator */}
            {isProcessing && (
              <ThinkingBubble
                dataSource={dataSource !== 'none' ? dataSource : undefined}
              />
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input area */}
        <InputComposer
          onSubmit={handleSubmit}
          isProcessing={isProcessing}
          dataSource={dataSource}
          onDataSourceChange={setDataSource}
          thinkingMode={thinkingMode}
          onThinkingModeChange={setThinkingMode}
        />
      </div>
    </div>
  );
}
