import React, { useState, useEffect, useRef } from 'react';
import { TabManager } from './components/TabManager';
import { PDFViewer } from './components/PDFViewer';
import { ControlPanel } from './components/ControlPanel';
import { ExplanationFeed } from './components/ExplanationFeed';
import { ChatInterface } from './components/ChatInterface';
import { SelectionMenu } from './components/SelectionMenu';
import { Tab, INITIAL_TAB, ChatMessage, ChatMode, AIModel, ExplanationState, APP_THEMES } from './types';
import { analyzePDFInitial, generatePageExplanation, generateOverallSummary, sendChatMessage } from './services/geminiService';
import { MessageCircle, Loader2, Undo } from 'lucide-react';

const generateId = () => Math.random().toString(36).substr(2, 9);

type LayoutMode = 'split' | 'pdf' | 'text';

const App: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([{ ...INITIAL_TAB, id: generateId() }]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>('split');
  const [currentThemeId, setCurrentThemeId] = useState<string>('blue');

  // Undo State
  const [recentlyClosed, setRecentlyClosed] = useState<{ tab: Tab; index: number } | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  // Theme Effect: Updates CSS variables and toggles Dark Mode class
  useEffect(() => {
    const theme = APP_THEMES.find(t => t.id === currentThemeId) || APP_THEMES[0];
    const root = document.documentElement;
    
    // Toggle Dark Mode
    if (theme.type === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    // Set Brand Colors
    root.style.setProperty('--brand-50', theme.colors[50]);
    root.style.setProperty('--brand-100', theme.colors[100]);
    root.style.setProperty('--brand-500', theme.colors[500]);
    root.style.setProperty('--brand-600', theme.colors[600]);
    root.style.setProperty('--brand-900', theme.colors[900]);
  }, [currentThemeId]);

  const updateTab = (tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  };

  const handleNewTab = () => {
    const newTab: Tab = { ...INITIAL_TAB, id: generateId(), title: `Untitled ${tabs.length + 1}` };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (id: string) => {
    if (tabs.length === 1) return;
    
    const tabIndex = tabs.findIndex(t => t.id === id);
    if (tabIndex === -1) return;

    const tabToClose = tabs[tabIndex];

    // Store for undo
    setRecentlyClosed({ tab: tabToClose, index: tabIndex });
    
    // Clear existing timeout if present
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    
    // Auto-hide undo after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setRecentlyClosed(null);
    }, 5000);

    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    
    if (activeTabId === id) {
      let newActiveIndex = tabIndex;
      if (newActiveIndex >= newTabs.length) {
        newActiveIndex = newTabs.length - 1;
      }
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  const handleUndoClose = () => {
    if (!recentlyClosed) return;

    setTabs(prev => {
      const newTabs = [...prev];
      if (recentlyClosed.index >= newTabs.length) {
        newTabs.push(recentlyClosed.tab);
      } else {
        newTabs.splice(recentlyClosed.index, 0, recentlyClosed.tab);
      }
      return newTabs;
    });

    setActiveTabId(recentlyClosed.tab.id);
    setRecentlyClosed(null);
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
  };

  const handleUpload = async (file: File) => {
    // 1. Set File & Loading State
    const objectUrl = URL.createObjectURL(file);
    updateTab(activeTabId, {
      file,
      pdfUrl: objectUrl,
      title: file.name,
      isProcessing: true,
      overallSummaryStatus: 'loading',
      currentExplanationPage: 1,
      explanationViewMode: 'page',
      currentPage: 1
    });

    // Auto-minimize settings panel
    setIsSettingsOpen(false);

    try {
      // 2. Initial Analysis
      const analysis = await analyzePDFInitial(file);
      
      // Update state with analysis results. 
      // NOTE: We do NOT trigger generation here to avoid race conditions. 
      // The useEffect hooks below will detect the change and trigger generation.
      updateTab(activeTabId, {
        pageCount: analysis.pageCount || 1, 
        globalSummary: analysis.globalSummary || "Summary unavailable",
        perPageSummaries: (analysis.perPageSummaries || []).reduce((acc: any, curr: any) => {
            acc[curr.page] = curr.summary;
            return acc;
        }, {}),
        isProcessing: false, // This flip to false triggers the chain
      });
      
    } catch (error) {
      console.error("Upload processing failed", error);
      updateTab(activeTabId, { isProcessing: false });
      alert("Failed to analyze PDF. Please try again.");
    }
  };

  const triggerOverallSummary = async (tabId: string) => {
    const currentTab = tabs.find(t => t.id === tabId);
    if (!currentTab) return;

    try {
        const text = await generateOverallSummary(currentTab, currentTab.settings.model);
        updateTab(tabId, { overallSummary: text, overallSummaryStatus: 'done' });
    } catch (e) {
        updateTab(tabId, { overallSummaryStatus: 'error' });
    }
  };

  const triggerPageExplanation = async (tabId: string, pageNum: number, userComment?: string) => {
    // Fetch latest tab state to grab old explanation if needed
    // NOTE: This captures the state at the moment the function is called.
    const tabBeforeUpdate = tabs.find(t => t.id === tabId);
    if (!tabBeforeUpdate || !tabBeforeUpdate.file) return;

    const previousExplanationText = tabBeforeUpdate.explanations[pageNum]?.text || "";

    // Optimistically set loading state
    // We use functional update here to ensure we are updating based on latest state
    // IMPORTANT: Provide 'text' (even if empty) to satisfy ExplanationState interface and avoid crashes
    setTabs(prev => prev.map(t => t.id === tabId ? {
        ...t,
        explanations: {
            ...t.explanations,
            [pageNum]: { 
                text: previousExplanationText, 
                ...t.explanations[pageNum], 
                status: 'loading' 
            } 
        }
    } : t));

    try {
      let refinementContext = undefined;
      
      // Determine effective comment: passed arg OR global prompt
      const effectiveComment = userComment || tabBeforeUpdate.globalRegenerationPrompt;

      if (effectiveComment) {
          refinementContext = {
              previousText: previousExplanationText,
              userComment: effectiveComment
          };
      }

      // We use the tab state captured *before* the async call to ensure settings are fresh,
      // but we need to rely on the latest settings in case user changed them just now.
      
      const text = await generatePageExplanation(tabBeforeUpdate, pageNum, tabBeforeUpdate.settings.model, refinementContext);
      
      // CRITICAL FIX: Use functional update for completion to ensure we merge with the *current* state.
      // Do NOT use 'updateTab' with '...tabBeforeUpdate.explanations' because 'tabBeforeUpdate' might be stale
      // (e.g., if handleRegenerateAll wiped the explanations while this request was flying).
      setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          return {
              ...t,
              explanations: {
                  ...t.explanations, 
                  [pageNum]: { text, status: 'done', lastUpdated: Date.now() }
              }
          };
      }));

    } catch (e) {
      // Handle Error with functional update
      setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          return {
              ...t,
              explanations: {
                  ...t.explanations,
                  [pageNum]: { text: previousExplanationText || '', status: 'error' }
              }
          };
      }));
    }
  };

  const handleRegenerateAll = (comment: string) => {
      // 1. Wipe explanations and Set Global Prompt
      // This state update is batched. The useEffect hooks below will detect 
      // the empty explanations state and the 'loading' summary status,
      // automatically triggering the regeneration process.
      // This approach prevents race conditions where an explicit trigger might 
      // run before the state update is fully committed.
      updateTab(activeTabId, {
          explanations: {}, 
          globalRegenerationPrompt: comment, 
          currentExplanationPage: 1, 
          explanationViewMode: 'page',
          overallSummaryStatus: 'loading' 
      });
  };

  const ensureExplanationExists = (tab: Tab, page: number) => {
    const exp = tab.explanations[page];
    if (!exp || exp.status === 'idle' || exp.status === 'error') {
      triggerPageExplanation(tab.id, page);
    }
  };

  // Called when User changes page in PDF Viewer
  const handlePageChange = (page: number) => {
    // Always update PDF page
    const updates: Partial<Tab> = { currentPage: page };
    
    // If sync is enabled, also update the explanation page and ensure we are in page mode
    if (activeTab.isSyncEnabled) {
        updates.currentExplanationPage = page;
        updates.explanationViewMode = 'page';
        // Trigger generation if needed
        ensureExplanationExists(activeTab, page);
    }

    updateTab(activeTabId, updates);
  };

  // Called when User changes page in Explanation Feed
  const handleExplanationPageChange = (page: number) => {
    const updates: Partial<Tab> = { 
        currentExplanationPage: page,
        explanationViewMode: 'page'
    };

    // If sync is enabled, also update the PDF page
    if (activeTab.isSyncEnabled) {
        updates.currentPage = page;
    }

    updateTab(activeTabId, updates);
    
    // Always trigger generation for the target page if needed
    const simulatedTab = { ...activeTab, ...updates };
    ensureExplanationExists(simulatedTab, page);
  };

  const handleToggleSummaryView = () => {
    updateTab(activeTabId, { 
        explanationViewMode: activeTab.explanationViewMode === 'summary' ? 'page' : 'summary' 
    });
  };

  const handleSendMessage = async (
    text: string, 
    mode: ChatMode, 
    useSearch: boolean, 
    model: AIModel,
    imageConfig?: { prompt: string, size: '1K'|'2K'|'4K' }
  ) => {
    const newUserMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    const newHistory = [...activeTab.chatHistory, newUserMsg];
    updateTab(activeTabId, { chatHistory: newHistory });

    try {
       const response = await sendChatMessage(activeTab, mode, text, newHistory, useSearch, model, imageConfig);
       
       const modelContent = typeof response === 'string' ? response : response.text || "";
       const images = typeof response === 'object' ? response.images : undefined;

       const newModelMsg: ChatMessage = {
           id: generateId(),
           role: 'model',
           content: modelContent,
           timestamp: Date.now(),
           images
       };
       
       updateTab(activeTabId, { chatHistory: [...newHistory, newModelMsg] });
    } catch (e) {
       const errorMsg: ChatMessage = {
           id: generateId(),
           role: 'model',
           content: "Sorry, I encountered an error.",
           timestamp: Date.now(),
           isError: true
       };
       updateTab(activeTabId, { chatHistory: [...newHistory, errorMsg] });
    }
  };

  const handleSelectionAsk = (text: string) => {
    if (!activeTab.file) {
        alert("Please upload a file first to ask questions.");
        return;
    }
    
    // Open chat and force mode to full-pdf
    setIsChatOpen(true);
    updateTab(activeTabId, { chatMode: 'full-pdf' });
    
    handleSendMessage(
        `Explain this: "${text}"`, 
        'full-pdf', // Default to full-pdf context for selected text
        false, 
        activeTab.settings.model // Use currently selected model
    );
  };

  // --- AUTOMATION EFFECTS ---

  // 1. Trigger Overall Summary & First Page when analysis completes (isProcessing goes true -> false)
  //    OR if we wiped the state (handleRegenerateAll)
  useEffect(() => {
    if (!activeTab.file) return;
    
    // Check if we just finished processing (file exists, not processing, and no summary yet)
    if (!activeTab.isProcessing && activeTab.overallSummaryStatus === 'loading') {
        triggerOverallSummary(activeTabId);
    }
    
    // Trigger Page 1 if it hasn't started and we are not processing
    // NOTE: This effect runs after handleRegenerateAll sets explanations to {}
    const page1 = activeTab.explanations[1];
    if (!activeTab.isProcessing && (!page1 || page1.status === 'idle')) {
        // Pass the global prompt if it exists (for the regenerate all case)
        triggerPageExplanation(activeTabId, 1, activeTab.globalRegenerationPrompt);
    }
  }, [
      activeTab.isProcessing, 
      activeTabId, 
      activeTab.file, 
      activeTab.overallSummaryStatus, 
      activeTab.explanations,
      activeTab.globalRegenerationPrompt // Trigger effect when global prompt changes
  ]);

  // 2. Daisy Chain: Automatically trigger next page when current page finishes
  useEffect(() => {
    if (!activeTab.file || activeTab.isProcessing) return;

    // Convert to array, sort by page number to ensure sequential checking
    const pages = Object.entries(activeTab.explanations)
        .map(([k, v]) => ({ page: parseInt(k), state: v as ExplanationState }))
        .sort((a, b) => a.page - b.page);

    for (const { page, state } of pages) {
        if (state.status === 'done') {
            const nextPage = page + 1;
            // If next page exists (within count) and is not started, trigger it
            if (nextPage <= activeTab.pageCount) {
                const nextState = activeTab.explanations[nextPage];
                if (!nextState || nextState.status === 'idle') {
                    // Pass the global prompt if it exists
                    triggerPageExplanation(activeTabId, nextPage, activeTab.globalRegenerationPrompt);
                    break; // Trigger one at a time to not flood
                }
            }
        }
    }
  }, [activeTab.explanations, activeTab.pageCount, activeTabId, activeTab.file, activeTab.isProcessing, activeTab.globalRegenerationPrompt]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 transition-colors relative">
      <TabManager 
        tabs={tabs} 
        activeTabId={activeTabId} 
        onSwitchTab={setActiveTabId} 
        onCloseTab={handleCloseTab} 
        onNewTab={handleNewTab}
      />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: PDF Viewer */}
        {layout !== 'text' && (
           <div className={`${layout === 'pdf' ? 'w-full' : 'w-1/2 min-w-[300px]'} border-r border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 transition-all duration-300 ease-in-out`}>
            <PDFViewer 
                tab={activeTab} 
                onUpload={handleUpload}
                onPageChange={handlePageChange}
                onUpdatePageCount={(count) => updateTab(activeTabId, { pageCount: count })}
                onToggleSync={() => updateTab(activeTabId, { isSyncEnabled: !activeTab.isSyncEnabled })}
                isMaximized={layout === 'pdf'}
                onToggleMaximize={() => setLayout(prev => prev === 'pdf' ? 'split' : 'pdf')}
            />
            </div>
        )}

        {/* Right Panel: Explanations + Chat Overlay */}
        {layout !== 'pdf' && (
            <div className={`${layout === 'text' ? 'w-full' : 'w-1/2 min-w-[300px]'} relative flex flex-col bg-white dark:bg-gray-900 overflow-hidden transition-all duration-300 ease-in-out`}>
            
            {/* Main Scrollable Content Area: Explanation Feed */}
            <div className="flex-1 flex flex-col overflow-hidden h-full relative">
                <ControlPanel 
                settings={activeTab.settings}
                onUpdateSettings={(s) => updateTab(activeTabId, { settings: s })}
                isOpen={isSettingsOpen}
                onToggle={() => setIsSettingsOpen(!isSettingsOpen)}
                isMaximized={layout === 'text'}
                onToggleMaximize={() => setLayout(prev => prev === 'text' ? 'split' : 'text')}
                onRegenerateAll={handleRegenerateAll}
                currentThemeId={currentThemeId}
                onThemeChange={setCurrentThemeId}
                />
                
                <ExplanationFeed 
                tab={activeTab}
                onRegeneratePage={(p, comment) => triggerPageExplanation(activeTabId, p, comment)}
                onRegenerateAll={handleRegenerateAll}
                onExplanationPageChange={handleExplanationPageChange}
                onToggleSummary={handleToggleSummaryView}
                />
            </div>

            {/* Floating Chat Button (Only visible if chat is CLOSED and file loaded) */}
            {!isChatOpen && activeTab.file && (
                <button
                onClick={() => setIsChatOpen(true)}
                className="absolute bottom-6 right-6 z-30 flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-5 py-3 rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 animate-in fade-in zoom-in duration-300"
                >
                <MessageCircle size={20} />
                <span className="font-medium">Ask AI</span>
                </button>
            )}

            {/* Chat Drawer Overlay */}
            {isChatOpen && (
                <div className="absolute bottom-0 left-0 right-0 h-[70%] z-40 shadow-[0_-4px_25px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-full duration-300 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
                <ChatInterface 
                    history={activeTab.chatHistory}
                    onSendMessage={handleSendMessage}
                    isProcessing={activeTab.chatHistory.length > 0 && activeTab.chatHistory[activeTab.chatHistory.length-1].role === 'user'}
                    currentPage={activeTab.currentPage}
                    onClose={() => setIsChatOpen(false)}
                    mode={activeTab.chatMode || 'general'} 
                    onModeChange={(m) => updateTab(activeTabId, { chatMode: m })}
                />
                </div>
            )}
            </div>
        )}
      </div>
      
      <SelectionMenu onAsk={handleSelectionAsk} />
      
      {/* Global Processing Overlay */}
      {activeTab.isProcessing && (
        <div className="absolute inset-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center flex-col animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-gray-100 dark:border-gray-700 max-w-sm text-center">
                <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Analyzing Document</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Gemini is reading your PDF to create summaries and structure explanations. This may take a moment.</p>
            </div>
        </div>
      )}

      {/* Undo Toast */}
      {recentlyClosed && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
           <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-xl flex items-center gap-4">
              <span className="text-sm font-medium">Tab closed</span>
              <button 
                onClick={handleUndoClose}
                className="text-sm font-bold text-brand-400 dark:text-brand-600 hover:text-brand-300 flex items-center gap-1.5 transition-colors"
              >
                 <Undo size={16} />
                 Undo
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;