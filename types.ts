
export interface Tab {
  id: string;
  title: string;
  file: File | null;
  pdfUrl: string | null;
  pageCount: number;
  currentPage: number;
  isSyncEnabled: boolean;
  
  // Processing State
  isProcessing: boolean;
  globalSummary: string | null;
  perPageSummaries: Record<number, string>;
  
  // Explanations
  explanations: Record<number, ExplanationState>;
  overallSummary: string | null;
  overallSummaryStatus: 'idle' | 'loading' | 'done' | 'error';
  
  // Right Panel State
  currentExplanationPage: number;
  explanationViewMode: 'page' | 'summary';
  
  // Settings
  settings: TabSettings;
  
  // Chat
  chatHistory: ChatMessage[];
  chatMode: ChatMode;
  
  // Global Regeneration Context
  globalRegenerationPrompt?: string;
}

export interface ExplanationState {
  text: string;
  status: 'idle' | 'loading' | 'done' | 'error';
  lastUpdated?: number;
}

export type AIModel = 'gemini-2.5-flash' | 'gemini-3-pro-preview';

export interface TabSettings {
  model: AIModel;
  style: string;
  customStyle: string;
  language: string;
  customLanguage: string;
  instructions: string;
  
  checkboxes: {
    style: SettingScope;
    language: SettingScope;
    instructions: SettingScope;
  };
}

export interface SettingScope {
  general: boolean;
  fullPdf: boolean;
  page: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  images?: string[]; // base64
  isError?: boolean;
}

export type ChatMode = 'general' | 'full-pdf' | 'page-context';

// Theme Definitions
export interface AppTheme {
  id: string;
  name: string;
  type: 'light' | 'dark';
  colors: {
    50: string;
    100: string;
    500: string;
    600: string;
    900: string;
  };
}

export const APP_THEMES: AppTheme[] = [
  {
    id: 'blue',
    name: 'Default Blue',
    type: 'light',
    colors: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      500: '#0ea5e9',
      600: '#0284c7',
      900: '#0c4a6e',
    }
  },
  {
    id: 'emerald',
    name: 'Emerald',
    type: 'light',
    colors: {
      50: '#ecfdf5',
      100: '#d1fae5',
      500: '#10b981',
      600: '#059669',
      900: '#064e3b',
    }
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    type: 'light',
    colors: {
      50: '#faf5ff',
      100: '#f3e8ff',
      500: '#a855f7',
      600: '#9333ea',
      900: '#581c87',
    }
  },
  {
    id: 'rose',
    name: 'Rose',
    type: 'light',
    colors: {
      50: '#fff1f2',
      100: '#ffe4e6',
      500: '#f43f5e',
      600: '#e11d48',
      900: '#881337',
    }
  },
  {
    id: 'amber',
    name: 'Warm Amber',
    type: 'light',
    colors: {
      50: '#fffbeb',
      100: '#fef3c7',
      500: '#f59e0b',
      600: '#d97706',
      900: '#78350f',
    }
  },
  {
    id: 'slate',
    name: 'Professional Slate',
    type: 'light',
    colors: {
      50: '#f8fafc',
      100: '#f1f5f9',
      500: '#64748b',
      600: '#475569',
      900: '#0f172a',
    }
  },
  {
    id: 'midnight',
    name: 'Midnight (Dark)',
    type: 'dark',
    colors: {
      50: '#1e293b', // slate-800
      100: '#334155', // slate-700
      500: '#818cf8', // indigo-400 (brighter for dark mode)
      600: '#6366f1', // indigo-500
      900: '#e0e7ff', // indigo-100 (light text for dark mode)
    }
  }
];

export const DEFAULT_SETTINGS: TabSettings = {
  model: 'gemini-3-pro-preview',
  style: 'Medium',
  customStyle: '',
  language: 'Hinglish',
  customLanguage: '',
  instructions: 'Focus on the intuition and key ideas. Adapt the explanation to the document type. Keep explanation short and to the point ( less than original content ). Explain and talk like a close friend. Use tables whenever needed. Avoid hallucinations. If the PDF does not clearly mention something, say you are not sure.',
  checkboxes: {
    style: { general: false, fullPdf: true, page: true },
    language: { general: true, fullPdf: true, page: true },
    instructions: { general: false, fullPdf: true, page: true },
  }
};

export const INITIAL_TAB: Tab = {
  id: 'tab-1',
  title: 'Untitled',
  file: null,
  pdfUrl: null,
  pageCount: 1, // Default to 1 until loaded
  currentPage: 1,
  isSyncEnabled: true,
  isProcessing: false,
  globalSummary: null,
  perPageSummaries: {},
  explanations: {},
  overallSummary: null,
  overallSummaryStatus: 'idle',
  
  currentExplanationPage: 1,
  explanationViewMode: 'page',

  settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
  chatHistory: [],
  chatMode: 'general'
};
