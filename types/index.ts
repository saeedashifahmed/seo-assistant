export interface Message {
  id: string;
  type: 'text' | 'image';
  sender: 'user' | 'ai';
  text?: string;
  image?: string;
  sources?: Source[];
  timestamp: Date;
  reasoning?: string;
}

export interface Source {
  title: string;
  uri: string;
}

export interface Attachment {
  name: string;
  type: string;
  data: string;
  mimeType: string;
  isInline: boolean;
}

export type SEODataSource = 
  | 'ahrefs'
  | 'moz'
  | 'semrush'
  | 'sej'
  | 'kwfinder'
  | 'googletrends'
  | 'none';

export interface SEODataSourceConfig {
  id: SEODataSource;
  label: string;
  icon: string;
  siteQuery: string;
  description: string;
  color: string;
}

export const SEO_DATA_SOURCES: SEODataSourceConfig[] = [
  {
    id: 'ahrefs',
    label: 'Ahrefs Data',
    icon: 'BarChart3',
    siteQuery: 'site:ahrefs.com',
    description: 'Backlink analysis, keyword research',
    color: '#FF6B35'
  },
  {
    id: 'moz',
    label: 'MOZ Data',
    icon: 'TrendingUp',
    siteQuery: 'site:moz.com',
    description: 'Domain authority, SEO guides',
    color: '#4A90D9'
  },
  {
    id: 'semrush',
    label: 'Semrush Data',
    icon: 'Target',
    siteQuery: 'site:semrush.com',
    description: 'Competitive analysis, PPC data',
    color: '#FF642D'
  },
  {
    id: 'sej',
    label: 'SEJ Data',
    icon: 'Newspaper',
    siteQuery: 'site:searchenginejournal.com',
    description: 'SEO news, algorithm updates',
    color: '#1A73E8'
  },
  {
    id: 'kwfinder',
    label: 'KW Finder Data',
    icon: 'Search',
    siteQuery: 'site:mangools.com OR site:kwfinder.com',
    description: 'Keyword difficulty, SERP analysis',
    color: '#00C853'
  },
  {
    id: 'googletrends',
    label: 'Google Trends',
    icon: 'LineChart',
    siteQuery: 'site:trends.google.com',
    description: 'Trending topics, search interest',
    color: '#EA4335'
  },
  {
    id: 'none',
    label: 'No External Data',
    icon: 'X',
    siteQuery: '',
    description: 'Use AI knowledge only',
    color: '#71717A'
  }
];

export interface SEOPrompt {
  label: string;
  text: string;
  icon: string;
  category: string;
}

export const SEO_PROMPTS: SEOPrompt[] = [
  {
    label: 'Keyword Research Strategy',
    text: 'Help me develop a comprehensive keyword research strategy for my website. I need to identify high-volume, low-competition keywords in my niche.',
    icon: 'Search',
    category: 'Research'
  },
  {
    label: 'Technical SEO Audit',
    text: 'What are the most critical technical SEO elements I should audit on my website? Provide a comprehensive checklist with prioritization.',
    icon: 'Settings',
    category: 'Technical'
  },
  {
    label: 'Content Optimization',
    text: 'How can I optimize my existing blog content to rank higher for competitive keywords? Give me actionable on-page SEO tips.',
    icon: 'FileText',
    category: 'Content'
  },
  {
    label: 'Backlink Strategy',
    text: 'Create a white-hat backlink building strategy for my website. Focus on sustainable link acquisition methods.',
    icon: 'Link',
    category: 'Off-Page'
  }
];
