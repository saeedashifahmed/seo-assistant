'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Menu,
  Brain,
  Plus,
  Search,
  Sparkles,
  FileDown,
  Crosshair,
  X,
  MessageSquare,
  Clock,
  Activity,
  Pin,
  ChevronDown
} from 'lucide-react';
import { Message, Attachment, ResponseMode, SEODataSource, SEO_DATA_SOURCES } from '@/types';
import { generateText } from '@/lib/gemini';
import { generateId } from '@/lib/utils';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ThinkingBubble } from '@/components/chat/ThinkingBubble';
import { InputComposer } from '@/components/chat/InputComposer';
import { SEOPrompts } from '@/components/seo/SEOPrompts';
import { SERPPreview } from '@/components/seo/SERPPreview';
import { Toast } from '@/components/ui/Toast';

const STORAGE_KEY = 'seo-assistant-messages';
const PINNED_KEY = 'seo-assistant-pins';
const SETTINGS_KEY = 'seo-assistant-settings';
const LOADING_DURATION_MS = 1800;

const RESPONSE_MODE_GUIDANCE: Record<ResponseMode, string> = {
  concise: 'Keep the response concise. Prioritize key insights, short bullets, and clear actions.',
  balanced: 'Provide a balanced response with practical steps, brief rationale, and clear prioritization.',
  deep: 'Provide a deep, comprehensive strategy with examples, checklists, and measurable outcomes.'
};

const EMPTY_FEATURES = [
  {
    title: 'Search Intelligence',
    description: 'Spot growth opportunities, benchmark competitors, and uncover ranking gaps in minutes.'
  },
  {
    title: 'Content Performance',
    description: 'Transform briefs into high-ranking pages with on-page clarity, schema, and internal linking.'
  },
  {
    title: 'Technical Audits',
    description: 'Diagnose crawlability, Core Web Vitals, and indexing barriers with prioritized fixes.'
  }
];

interface SessionSettings {
  dataSource: SEODataSource;
  thinkingMode: boolean;
  responseMode: ResponseMode;
}

// Load messages from localStorage
function loadMessagesFromStorage(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
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

function saveMessagesToStorage(messages: Message[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error('Failed to save messages to storage:', e);
  }
}

function loadPinnedMessages(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(PINNED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load pinned messages:', e);
  }
  return [];
}

function savePinnedMessages(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error('Failed to save pinned messages:', e);
  }
}

function loadSettings(): SessionSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.dataSource && parsed?.responseMode !== undefined) {
        return parsed as SessionSettings;
      }
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
  return null;
}

function saveSettings(settings: SessionSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function countWords(text?: string) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataSource, setDataSource] = useState<SEODataSource>('none');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [responseMode, setResponseMode] = useState<ResponseMode>('balanced');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'error' | 'success'>('info');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<string[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Initialize on client side - load from localStorage with minimum loading time
  useEffect(() => {
    const storedMessages = loadMessagesFromStorage();
    const storedPins = loadPinnedMessages();
    const storedSettings = loadSettings();

    if (storedSettings) {
      setDataSource(storedSettings.dataSource);
      setThinkingMode(storedSettings.thinkingMode);
      setResponseMode(storedSettings.responseMode);
    }
    setPinnedMessageIds(storedPins);

    const intervalMs = 40;
    const steps = Math.ceil(LOADING_DURATION_MS / intervalMs);
    const increment = 100 / steps;

    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    const timer = setTimeout(() => {
      setMounted(true);
      setMessages(storedMessages);
    }, LOADING_DURATION_MS);

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

  useEffect(() => {
    if (mounted) {
      savePinnedMessages(pinnedMessageIds);
    }
  }, [pinnedMessageIds, mounted]);

  useEffect(() => {
    if (mounted) {
      saveSettings({ dataSource, thinkingMode, responseMode });
    }
  }, [dataSource, thinkingMode, responseMode, mounted]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!searchQuery.trim()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing, searchQuery]);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 120;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    setShowScrollToBottom(!isAtBottom);
  };

  useEffect(() => {
    handleScroll();
  }, [messages, isProcessing]);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToastMessage(message);
    setToastType(type);
  };

  const handleNewChat = () => {
    setMessages([]);
    setPinnedMessageIds([]);
    setSearchQuery('');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PINNED_KEY);
    showToast('Started a new SEO chat session', 'success');
    setIsMobileSidebarOpen(false);
  };

  const handleClearChat = () => {
    handleNewChat();
  };

  const buildPrompt = (text: string) => {
    const basePrompt = text.trim()
      ? text.trim()
      : 'Analyze the attached content and provide SEO insights, priorities, and next steps.';
    return `${basePrompt}\n\n[Response Style]\n${RESPONSE_MODE_GUIDANCE[responseMode]}`;
  };

  const handleSubmit = async (text: string, attachment: Attachment | null) => {
    if ((!text.trim() && !attachment) || isProcessing) return;

    const userText = text || (attachment ? `[Attached File: ${attachment.name}]` : '');
    const promptForModel = buildPrompt(text);
    const modelLabel = 'Gemini 2.5 Flash';

    const userMessage: Message = {
      id: generateId(),
      type: 'text',
      sender: 'user',
      text: userText,
      timestamp: new Date(),
      dataSource,
      thinkingMode,
      responseMode,
      model: modelLabel
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      const { text: responseText, sources } = await generateText(
        promptForModel,
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
        dataSource,
        thinkingMode,
        responseMode,
        model: modelLabel
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
        dataSource,
        thinkingMode,
        responseMode,
        model: modelLabel
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

  const handleTogglePin = (id: string) => {
    setPinnedMessageIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [id, ...prev];
    });
  };

  const handleQuickAction = (actionId: string, content: string) => {
    const trimmedContent = content.length > 4000 ? `${content.slice(0, 4000)}...` : content;
    const quickActionPrompts: Record<string, (text: string) => string> = {
      summarize: (text) => `Summarize the answer below in 5 executive bullets with clear takeaways.\n\nAnswer:\n${text}`,
      checklist: (text) => `Turn the answer below into a step-by-step SEO checklist with priorities.\n\nAnswer:\n${text}`,
      metatags: (text) => `Generate an SEO title (<=60 chars) and meta description (<=160 chars) based on the answer below.\n\nAnswer:\n${text}`,
      actionplan: (text) => `Create a 30-day SEO action plan with milestones and KPIs based on the answer below.\n\nAnswer:\n${text}`
    };
    const builder = quickActionPrompts[actionId];
    if (builder) {
      handleSubmit(builder(trimmedContent), null);
    }
  };

  const handleExportChat = () => {
    if (!messages.length) {
      showToast('No messages to export yet', 'info');
      return;
    }
    const exportContent = messages.map((message) => {
      const label = message.sender === 'user' ? 'User' : 'Assistant';
      const timestamp = new Date(message.timestamp).toLocaleString();
      return `### ${label} • ${timestamp}\n${message.text || ''}\n`;
    }).join('\n');

    const blob = new Blob([exportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `rabbit-rank-session-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('Chat exported successfully', 'success');
  };

  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;

  const visibleMessages = useMemo(() => {
    if (!normalizedQuery) return messages;
    return messages.filter((msg) => (msg.text || '').toLowerCase().includes(normalizedQuery));
  }, [messages, normalizedQuery]);

  const aiMessages = useMemo(() => messages.filter(message => message.sender === 'ai'), [messages]);
  const avgAiWords = aiMessages.length
    ? Math.round(aiMessages.reduce((sum, message) => sum + countWords(message.text), 0) / aiMessages.length)
    : 0;
  const groundedCount = aiMessages.filter(message => message.dataSource && message.dataSource !== 'none').length;
  const pinnedMessages = messages.filter(message => pinnedMessageIds.includes(message.id));
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  const lastAiWords = lastAiMessage ? countWords(lastAiMessage.text) : 0;

  const responseLatencyMs = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'ai') {
        for (let j = i - 1; j >= 0; j--) {
          if (messages[j].sender === 'user') {
            return new Date(messages[i].timestamp).getTime() - new Date(messages[j].timestamp).getTime();
          }
        }
        break;
      }
    }
    return null;
  }, [messages]);

  const dataSourceLabel = SEO_DATA_SOURCES.find(source => source.id === dataSource)?.label || 'AI Only';

  const isEmptyState = messages.length === 0;
  const messageWidthClass = focusMode
    ? 'w-full max-w-6xl 2xl:max-w-[80rem]'
    : 'w-full max-w-5xl 2xl:max-w-6xl';

  // Show premium loading screen during initial mount
  if (!mounted) {
    return (
      <div className="app-shell flex h-screen w-full items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 right-10 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 left-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative w-[320px] rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="
              w-12 h-12 rounded-2xl 
              bg-gradient-to-br from-cyan-400 to-cyan-600 
              flex items-center justify-center 
              shadow-xl shadow-cyan-500/40
              animate-glow
            ">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">Rabbit Rank AI</p>
              <h1 className="text-lg font-semibold text-zinc-900 dark:text-white font-display">
                Preparing your workspace
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 transition-all duration-150"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>Loading AI assets</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell flex h-screen w-full overflow-hidden">
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
        fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)]
        transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar
          onNewChat={handleNewChat}
          onClearChat={handleClearChat}
          onToolSelect={handleToolSelect}
          isMobile={true}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      {/* Desktop sidebar */}
      {!focusMode && (
        <Sidebar onNewChat={handleNewChat} onClearChat={handleClearChat} onToolSelect={handleToolSelect} />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Global header */}
        <div className="
          flex items-center justify-between 
          px-3 sm:px-4 md:px-6 py-4 
          border-b border-zinc-200/80 dark:border-zinc-800/80 
          bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl
          z-30
        ">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Menu size={20} className="text-zinc-600 dark:text-zinc-400" />
            </button>

            <div className="flex items-center gap-3">
              <div className="
                w-10 h-10 rounded-xl 
                bg-gradient-to-br from-cyan-500 to-teal-600 
                flex items-center justify-center
                shadow-lg shadow-cyan-500/30
              ">
                <Brain size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">Rabbit Rank AI</p>
                <h1 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white font-display">
                  SEO Intelligence Suite
                </h1>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex flex-1 justify-center px-6">
            <div className="relative w-full max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search this session..."
                className="
                  w-full rounded-xl border border-zinc-200 dark:border-zinc-700
                  bg-white/80 dark:bg-zinc-900/70 
                  px-9 py-2 text-sm
                  text-zinc-800 dark:text-zinc-200
                  placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500
                "
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {dataSourceLabel}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${thinkingMode
                  ? 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}>
                {thinkingMode ? 'Thinking On' : 'Thinking Off'}
              </span>
            </div>

            <button
              onClick={handleExportChat}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors"
              title="Export chat"
            >
              <FileDown size={16} />
            </button>
            <button
              onClick={() => setFocusMode(prev => !prev)}
              className={`p-2 rounded-xl border transition-colors ${focusMode
                  ? 'border-cyan-400 text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-600'
                }`}
              title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
            >
              <Crosshair size={16} />
            </button>
            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors"
              title="New chat"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="lg:hidden px-3 sm:px-4 pt-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search this session..."
              className="
                w-full rounded-xl border border-zinc-200 dark:border-zinc-700
                bg-white/80 dark:bg-zinc-900/70 
                px-9 py-2 text-sm
                text-zinc-800 dark:text-zinc-200
                placeholder:text-zinc-400 dark:placeholder:text-zinc-500
                focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500
              "
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-8 2xl:px-12 py-6 scroll-smooth custom-scrollbar"
            >
              <div className={`mx-auto ${messageWidthClass} space-y-6 pb-12`}>
                {isFiltering && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <Search size={12} />
                    <span>{visibleMessages.length} results</span>
                  </div>
                )}

                {isEmptyState && !isProcessing && !isFiltering && (
                  <div className="flex flex-col items-center justify-center min-h-[65vh] gap-8 sm:gap-10">
                    <div className="text-center space-y-4">
                      <div className="
                        w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl 
                        bg-gradient-to-br from-cyan-400 to-cyan-600 
                        flex items-center justify-center
                        shadow-xl shadow-cyan-500/30
                      ">
                        <Sparkles size={26} className="text-white sm:w-[30px] sm:h-[30px]" />
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 dark:text-white font-display">
                        Build winning SEO strategies in minutes
                      </h1>
                      <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
                        Ask anything about keyword strategy, rankings, audits, or content optimization. Rabbit Rank AI will deliver an actionable plan.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                      {EMPTY_FEATURES.map((feature) => (
                        <div
                          key={feature.title}
                          className="
                            rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70
                            bg-white/80 dark:bg-zinc-950/70
                            backdrop-blur-xl p-4 sm:p-5
                            shadow-lg shadow-zinc-200/40 dark:shadow-black/30
                          "
                        >
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">{feature.title}</h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <SEOPrompts onSelect={handlePromptSelect} />
                  </div>
                )}

                {isFiltering && visibleMessages.length === 0 && (
                  <div className="flex flex-col items-center text-center gap-4 py-16">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Search size={18} className="text-zinc-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">No results found</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Try a different keyword or clear the filter.
                      </p>
                    </div>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800"
                    >
                      Clear search
                    </button>
                  </div>
                )}

                {visibleMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isPinned={pinnedMessageIds.includes(msg.id)}
                    onTogglePin={handleTogglePin}
                    onQuickAction={handleQuickAction}
                    onNotify={showToast}
                  />
                ))}

                {isProcessing && (
                  <ThinkingBubble
                    dataSource={dataSource !== 'none' ? dataSource : undefined}
                  />
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>
            </div>

            <div className="border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/70 backdrop-blur-xl">
              <InputComposer
                onSubmit={handleSubmit}
                isProcessing={isProcessing}
                dataSource={dataSource}
                onDataSourceChange={setDataSource}
                thinkingMode={thinkingMode}
                onThinkingModeChange={setThinkingMode}
                responseMode={responseMode}
                onResponseModeChange={setResponseMode}
              />
            </div>
          </div>

          {/* Insights sidebar */}
          {!focusMode && (
            <aside className="hidden xl:flex w-[320px] 2xl:w-[360px] shrink-0 border-l border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 overflow-hidden">
              <div className="flex h-full flex-col gap-4 px-4 py-6 overflow-y-auto custom-scrollbar">
                <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/80 p-4 shadow-lg shadow-zinc-200/40 dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-cyan-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Session Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Messages</span>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{messages.length}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">AI replies</span>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{aiMessages.length}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Avg words</span>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{avgAiWords || '—'}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50 dark:bg-zinc-900/60 p-3">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400">Latency</span>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white">{formatDuration(responseLatencyMs)}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    <span>Last reply</span>
                  </div>
                  <span>{lastAiWords ? `${lastAiWords} words` : '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    <span>Grounded replies</span>
                  </div>
                  <span>{groundedCount}</span>
                </div>
              </div>

                <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/80 p-4 shadow-lg shadow-zinc-200/40 dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-4">
                  <Pin size={16} className="text-cyan-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Pinned highlights</h3>
                </div>
                {pinnedMessages.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Pin responses to keep key insights here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pinnedMessages.slice(0, 4).map((message) => (
                      <button
                        key={message.id}
                        onClick={() => scrollToMessage(message.id)}
                        className="
                          w-full text-left rounded-xl border border-zinc-200/70 dark:border-zinc-800/70
                          bg-zinc-50 dark:bg-zinc-900/60 p-3
                          hover:border-cyan-400 dark:hover:border-cyan-600
                          transition-colors
                        "
                      >
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                          {message.text}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

                <div className="rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-950/80 p-4 shadow-lg shadow-zinc-200/40 dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-cyan-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Live SERP Preview</h3>
                </div>
                <SERPPreview />
              </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {showScrollToBottom && (
        <button
          onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-30 w-10 h-10 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 shadow-lg flex items-center justify-center text-zinc-500 hover:text-cyan-600 transition-colors"
          title="Scroll to latest"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
