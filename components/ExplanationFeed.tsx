import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Tab, ExplanationState } from '../types';
import { RefreshCw, Download, Sparkles, ChevronLeft, ChevronRight, FileText, AlignLeft, Check, Copy, Loader2, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ExplanationFeedProps {
  tab: Tab;
  onRegeneratePage: (page: number, comment?: string) => void;
  onRegenerateAll: (comment: string) => void;
  onExplanationPageChange: (page: number) => void;
  onToggleSummary: () => void;
}

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!inline && match) {
    return (
      <div className="rounded-lg overflow-hidden my-6 border border-gray-700 bg-[#1e1e1e] shadow-md not-prose">
        <div className="bg-[#2d2d2d] px-4 py-2 flex justify-between items-center border-b border-[#404040]">
          <span className="text-xs text-gray-300 font-mono font-medium lowercase">{match[1]}</span>
          <button 
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0, 
            padding: '1rem', 
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}
          wrapLines={true}
          wrapLongLines={true}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <code className={`${className} bg-gray-100 dark:bg-gray-800 text-brand-700 dark:text-brand-400 rounded px-1.5 py-0.5 font-mono text-sm border border-gray-200 dark:border-gray-700`} {...props}>
      {children}
    </code>
  );
};

// --- PDF Specific Components ---
const PdfComponents = {
  h1: ({node, ...props}: any) => <h1 style={{fontSize: '24pt', fontFamily: 'Times New Roman, serif', fontWeight: 'bold', color: '#1a365d', marginTop: '24px', marginBottom: '16px', lineHeight: '1.2', pageBreakAfter: 'avoid'}} {...props} />,
  h2: ({node, ...props}: any) => <h2 style={{fontSize: '18pt', fontFamily: 'Times New Roman, serif', fontWeight: 'bold', color: '#2c5282', marginTop: '20px', marginBottom: '12px', lineHeight: '1.3', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', pageBreakAfter: 'avoid'}} {...props} />,
  h3: ({node, ...props}: any) => <h3 style={{fontSize: '14pt', fontFamily: 'Times New Roman, serif', fontWeight: 'bold', color: '#2d3748', marginTop: '16px', marginBottom: '10px', lineHeight: '1.3', pageBreakAfter: 'avoid'}} {...props} />,
  p: ({node, ...props}: any) => <p style={{fontSize: '11pt', fontFamily: 'Helvetica, Arial, sans-serif', color: '#1f2937', marginBottom: '12px', lineHeight: '1.6', textAlign: 'justify'}} {...props} />,
  ul: ({node, ...props}: any) => <ul style={{marginBottom: '12px', paddingLeft: '24px', listStyleType: 'disc'}} {...props} />,
  ol: ({node, ...props}: any) => <ol style={{marginBottom: '12px', paddingLeft: '24px', listStyleType: 'decimal'}} {...props} />,
  li: ({node, ...props}: any) => <li style={{marginBottom: '6px', fontSize: '11pt', fontFamily: 'Helvetica, Arial, sans-serif', lineHeight: '1.6'}} {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote style={{borderLeft: '4px solid #cbd5e0', paddingLeft: '16px', marginLeft: '0', color: '#4a5568', fontStyle: 'italic', marginBottom: '16px'}} {...props} />,
  table: ({node, ...props}: any) => <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '16px', tableLayout: 'fixed', border: '1px solid #e2e8f0'}} {...props} />,
  thead: ({node, ...props}: any) => <thead style={{backgroundColor: '#f7fafc'}} {...props} />,
  tr: ({node, ...props}: any) => <tr style={{borderBottom: '1px solid #e2e8f0'}} {...props} />,
  th: ({node, ...props}: any) => <th style={{padding: '10px', border: '1px solid #cbd5e0', fontSize: '10pt', fontWeight: 'bold', textAlign: 'left', backgroundColor: '#edf2f7', color: '#2d3748'}} {...props} />,
  td: ({node, ...props}: any) => <td style={{padding: '10px', border: '1px solid #cbd5e0', fontSize: '10pt', verticalAlign: 'top', wordWrap: 'break-word', overflowWrap: 'break-word'}} {...props} />,
  code: ({inline, className, children, ...props}: any) => {
    if (inline) {
       return <code style={{backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '4px', fontFamily: 'Courier New, monospace', fontSize: '0.9em', color: '#c05621'}} {...props}>{children}</code>;
    }
    return (
       <div style={{backgroundColor: '#1a202c', color: '#e2e8f0', padding: '12px', borderRadius: '6px', marginBottom: '16px', overflowX: 'hidden'}}>
         <pre style={{margin: 0, fontFamily: 'Courier New, monospace', fontSize: '9pt', whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>{children}</pre>
       </div>
    );
  },
  img: ({node, ...props}: any) => <img style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '16px auto', borderRadius: '4px'}} {...props} />,
};

export const ExplanationFeed: React.FC<ExplanationFeedProps> = ({ 
  tab, 
  onRegeneratePage, 
  onRegenerateAll,
  onExplanationPageChange,
  onToggleSummary
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  // State for regeneration dialog
  const [regenDialogPage, setRegenDialogPage] = useState<number | null>(null);
  const [regenComment, setRegenComment] = useState('');
  const [applyToAll, setApplyToAll] = useState(false);
  const regenButtonRef = useRef<HTMLButtonElement>(null);

  const handleDownload = async () => {
    if (!printRef.current) return;
    
    try {
        setIsDownloading(true);
        const element = printRef.current.cloneNode(true) as HTMLElement;
        
        element.style.display = 'block';
        element.style.position = 'fixed';
        element.style.top = '0';
        element.style.left = '0';
        element.style.width = '800px'; 
        element.style.zIndex = '-9999';
        element.style.backgroundColor = '#ffffff';
        element.style.padding = '40px';
        element.className = 'pdf-export-root';

        const style = document.createElement('style');
        style.innerHTML = `
          .pdf-export-root * {
            box-sizing: border-box !important;
            letter-spacing: normal !important;
            font-variant-ligatures: none !important;
            text-rendering: auto !important;
          }
        `;
        element.appendChild(style);

        document.body.appendChild(element);

        const doc = new jsPDF('p', 'pt', 'a4');
        const pdfWidth = doc.internal.pageSize.getWidth();
        const margin = 30;
        const availableWidth = pdfWidth - (margin * 2);
        const elementWidth = 800;
        const scale = availableWidth / elementWidth;

        await doc.html(element, {
            callback: function (doc) {
                const safeTitle = (tab.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                doc.save(`${safeTitle}_explanations.pdf`);
                document.body.removeChild(element);
                setIsDownloading(false);
            },
            x: margin,
            y: margin,
            html2canvas: {
                scale: scale,
                useCORS: true,
                logging: false,
                windowWidth: 1000,
                scrollY: 0,
                scrollX: 0,
                backgroundColor: '#ffffff',
                letterRendering: false, 
            },
            autoPaging: 'text',
            width: elementWidth,
            windowWidth: elementWidth,
        });
    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF.");
        setIsDownloading(false);
    }
  };

  const currentPageNum = tab.currentExplanationPage;
  const isSummaryView = tab.explanationViewMode === 'summary';

  // Navigation handlers
  const handlePrev = () => {
      if (currentPageNum > 1) onExplanationPageChange(currentPageNum - 1);
  };
  
  const handleNext = () => {
      if (currentPageNum < tab.pageCount) onExplanationPageChange(currentPageNum + 1);
  };

  // Regeneration Handlers
  const openRegenDialog = (e: React.MouseEvent) => {
      e.stopPropagation();
      setRegenComment('');
      setApplyToAll(false);
      setRegenDialogPage(currentPageNum);
  };

  const submitRegeneration = () => {
      if (regenDialogPage !== null) {
          if (applyToAll) {
              if (window.confirm("This will clear all current explanations and regenerate them based on your instruction. Continue?")) {
                  onRegenerateAll(regenComment);
              }
          } else {
              onRegeneratePage(regenDialogPage, regenComment);
          }
          setRegenDialogPage(null);
      }
  };

  if (!tab.file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-400 dark:text-gray-500">
        <Sparkles size={48} className="mb-4 text-gray-200 dark:text-gray-700" />
        <p className="text-center">Upload a PDF to see AI-powered explanations here.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50/50 dark:bg-gray-900 relative transition-colors">
      
      {/* Navigation Toolbar */}
      <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm shrink-0 transition-colors">
          
          <div className="flex items-center gap-2">
              <button 
                  onClick={onToggleSummary}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${isSummaryView ? 'bg-brand-50 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
              >
                  <AlignLeft size={14} />
                  <span>Summary</span>
              </button>
          </div>

          {!isSummaryView && (
             <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    onClick={handlePrev} 
                    disabled={currentPageNum <= 1}
                    className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 dark:text-gray-200"
                    title="Previous Explanation"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-[5rem] text-center flex items-center justify-center gap-1">
                    <FileText size={12} className="opacity-50"/>
                    {currentPageNum} / {tab.pageCount}
                </span>
                <button 
                    onClick={handleNext} 
                    disabled={currentPageNum >= tab.pageCount}
                    className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 dark:text-gray-200"
                    title="Next Explanation"
                >
                    <ChevronRight size={18} />
                </button>
             </div>
          )}

          <button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            title="Download PDF"
          >
            {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 relative" id="explanation-content-area">
        
        {/* VIEW: Overall Summary */}
        {isSummaryView && (
            <div className="max-w-3xl mx-auto border rounded-xl bg-white dark:bg-gray-800 shadow-md overflow-hidden border-brand-100 dark:border-gray-700 animate-in fade-in duration-300 transition-colors">
                <div className="bg-brand-50/50 dark:bg-brand-900/20 px-5 py-4 border-b border-brand-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-serif font-bold text-brand-900 dark:text-brand-100 text-lg">Overall Document Summary</h3>
                </div>
                <div className="p-8 prose dark:prose-invert prose-slate max-w-none leading-relaxed prose-headings:font-serif prose-headings:text-brand-900 dark:prose-headings:text-brand-100 prose-headings:mt-6 prose-p:mb-5 prose-li:mb-2 prose-a:text-brand-600 dark:prose-a:text-brand-400">
                    {tab.overallSummaryStatus === 'loading' ? (
                    <div className="animate-pulse flex space-x-4">
                        <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                        </div>
                        </div>
                    </div>
                    ) : tab.overallSummary ? (
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                            components={{
                                code: CodeBlock,
                                img: (props) => (
                                    <img 
                                        {...props} 
                                        className="rounded-xl shadow-md mx-auto max-w-full"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )
                            }}
                        >
                            {tab.overallSummary}
                        </ReactMarkdown>
                    ) : (
                        <p className="text-gray-400 italic">Summary will appear here after initial processing.</p>
                    )}
                </div>
            </div>
        )}

        {/* VIEW: Specific Page */}
        {!isSummaryView && (
            <div key={currentPageNum} className="max-w-3xl mx-auto border rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 relative border-gray-200 dark:border-gray-700 transition-colors">
                <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center relative">
                    <h3 className="font-serif font-bold text-gray-700 dark:text-gray-200">Page {currentPageNum} Analysis</h3>
                    <div className="flex gap-2 items-center relative">
                        <button 
                            ref={regenButtonRef}
                            onClick={openRegenDialog}
                            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded shadow-sm hover:shadow" 
                            title="Regenerate this explanation"
                        >
                            <RefreshCw size={12} />
                            <span>Regenerate</span>
                        </button>
                        
                        {/* Regeneration Dialog Popover */}
                        {regenDialogPage === currentPageNum && (
                            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 z-50 animate-in fade-in zoom-in-95 origin-top-right p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Refine Explanation</span>
                                    <button onClick={() => setRegenDialogPage(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                        <X size={14} />
                                    </button>
                                </div>
                                <textarea
                                    autoFocus
                                    value={regenComment}
                                    onChange={(e) => setRegenComment(e.target.value)}
                                    placeholder="Add comment (e.g. 'Focus more on the dates', 'Make it simpler')..."
                                    className="w-full text-xs p-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-[80px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />

                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <input 
                                        id="apply-all-checkbox"
                                        type="checkbox" 
                                        checked={applyToAll} 
                                        onChange={(e) => setApplyToAll(e.target.checked)}
                                        className="rounded text-brand-600 focus:ring-brand-500 w-3.5 h-3.5 border-gray-300 dark:border-gray-600 cursor-pointer"
                                    />
                                    <label htmlFor="apply-all-checkbox" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer select-none">
                                        Apply to all pages
                                    </label>
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={submitRegeneration}
                                        className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                                    >
                                        <RefreshCw size={12} />
                                        {applyToAll ? 'Regenerate All' : 'Regenerate'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="p-8 min-h-[300px] prose dark:prose-invert prose-slate max-w-none leading-relaxed prose-headings:font-serif prose-headings:text-gray-800 dark:prose-headings:text-gray-100 prose-headings:mt-8 prose-headings:mb-4 prose-p:mb-6 prose-li:mb-2 prose-a:text-brand-600 dark:prose-a:text-brand-400 prose-img:rounded-xl prose-img:shadow-md prose-img:mx-auto">
                    {(() => {
                        const explanation = tab.explanations[currentPageNum];
                        if (!explanation || explanation.status === 'idle') {
                            return (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500 gap-2">
                                    <Sparkles size={24} className="opacity-20" />
                                    <span className="italic">Waiting to process...</span>
                                </div>
                            );
                        }
                        if (explanation.status === 'loading') {
                            return (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Gemini is analyzing page {currentPageNum}...</span>
                                </div>
                            );
                        }
                        if (explanation.status === 'error') {
                            return (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-500 dark:text-red-400">
                                    <p>Failed to generate explanation.</p>
                                    <button 
                                        onClick={() => onRegeneratePage(currentPageNum)}
                                        className="text-xs bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-1 rounded-full transition-colors border border-red-200 dark:border-red-800"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            );
                        }
                        return (
                            <ReactMarkdown 
                                remarkPlugins={[remarkGfm]} 
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                    code: CodeBlock,
                                    img: (props) => (
                                        <img 
                                            {...props} 
                                            className="rounded-xl shadow-md mx-auto max-w-full"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                    )
                                }}
                            >
                                {explanation.text}
                            </ReactMarkdown>
                        );
                    })()}
                </div>
            </div>
        )}

      </div>
      
      {/* Hidden container - Source for PDF Generation */}
      <div 
        ref={printRef} 
        style={{ display: 'none' }}
      >
         <div style={{fontFamily: 'Helvetica, Arial, sans-serif', color: '#000000'}}>
            <div style={{borderBottom: '2px solid #2c5282', paddingBottom: '20px', marginBottom: '30px'}}>
               <h1 style={{fontSize: '28pt', fontWeight: 'bold', margin: '0 0 10px 0', color: '#1a365d', fontFamily: 'Times New Roman, serif'}}>{tab.title}</h1>
               <p style={{fontSize: '12pt', color: '#718096', margin: 0}}>AI-Powered Analysis & Explanation</p>
               <p style={{fontSize: '10pt', color: '#a0aec0', marginTop: '5px'}}>Generated by Tabwise PDF Explainer</p>
            </div>
            
            {tab.overallSummary && (
                <div style={{marginBottom: '40px', pageBreakAfter: 'always'}}>
                    <h2 style={{fontSize: '20pt', fontWeight: 'bold', borderBottom: '1px solid #cbd5e0', paddingBottom: '8px', marginBottom: '20px', color: '#2d3748', fontFamily: 'Times New Roman, serif'}}>Executive Summary</h2>
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={[rehypeRaw]}
                        components={PdfComponents}
                    >
                        {tab.overallSummary}
                    </ReactMarkdown>
                </div>
            )}
            
            {(Object.entries(tab.explanations) as [string, ExplanationState][]).sort((a, b) => Number(a[0]) - Number(b[0])).map(([page, exp]) => (
                exp.status === 'done' && (
                    <div key={page} style={{marginBottom: '40px', pageBreakInside: 'avoid'}}>
                        <div style={{backgroundColor: '#ebf8ff', borderLeft: '5px solid #3182ce', padding: '12px 16px', marginBottom: '20px'}}>
                           <h2 style={{fontSize: '16pt', fontWeight: 'bold', margin: 0, color: '#2c5282', fontFamily: 'Times New Roman, serif'}}>
                               Page {page} Analysis
                           </h2>
                        </div>
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]} 
                            rehypePlugins={[rehypeRaw]}
                            components={PdfComponents}
                        >
                            {exp.text}
                        </ReactMarkdown>
                        <div style={{height: '1px', backgroundColor: '#e2e8f0', margin: '30px 0', width: '100%'}}></div>
                    </div>
                )
            ))}
         </div>
      </div>
    </div>
  );
};