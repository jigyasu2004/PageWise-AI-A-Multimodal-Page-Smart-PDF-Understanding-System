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
// Tuned for A4 scaling.
// IMPORTANT: Using standard system fonts (Arial, Times) is crucial for reliable PDF generation via html2canvas/jsPDF.
const PdfComponents = {
  h1: ({node, ...props}: any) => <h1 style={{fontSize: '32px', fontFamily: '"Times New Roman", Times, serif', fontWeight: 'bold', color: '#111827', marginTop: '0px', marginBottom: '24px', lineHeight: '1.4', pageBreakAfter: 'avoid'}} {...props} />,
  h2: ({node, ...props}: any) => <h2 style={{fontSize: '24px', fontFamily: '"Times New Roman", Times, serif', fontWeight: 'bold', color: '#1e3a8a', marginTop: '30px', marginBottom: '16px', lineHeight: '1.4', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', pageBreakAfter: 'avoid'}} {...props} />,
  h3: ({node, ...props}: any) => <h3 style={{fontSize: '20px', fontFamily: '"Times New Roman", Times, serif', fontWeight: 'bold', color: '#374151', marginTop: '24px', marginBottom: '12px', lineHeight: '1.4', pageBreakAfter: 'avoid'}} {...props} />,
  p: ({node, ...props}: any) => <p style={{fontSize: '14px', fontFamily: 'Arial, sans-serif', color: '#1f2937', marginBottom: '12px', lineHeight: '1.6', textAlign: 'left', letterSpacing: 'normal'}} {...props} />,
  ul: ({node, ...props}: any) => <ul style={{marginBottom: '16px', paddingLeft: '24px', listStyleType: 'disc'}} {...props} />,
  ol: ({node, ...props}: any) => <ol style={{marginBottom: '16px', paddingLeft: '24px', listStyleType: 'decimal'}} {...props} />,
  li: ({node, ...props}: any) => <li style={{marginBottom: '8px', fontSize: '14px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6', color: '#374151', textAlign: 'left'}} {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote style={{borderLeft: '4px solid #cbd5e0', paddingLeft: '16px', marginLeft: '0', color: '#4b5563', fontStyle: 'italic', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6'}} {...props} />,
  table: ({node, ...props}: any) => <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #d1d5db', tableLayout: 'auto'}} {...props} />,
  thead: ({node, ...props}: any) => <thead style={{backgroundColor: '#f3f4f6'}} {...props} />,
  tr: ({node, ...props}: any) => <tr style={{borderBottom: '1px solid #d1d5db'}} {...props} />,
  th: ({node, ...props}: any) => <th style={{padding: '8px', border: '1px solid #d1d5db', fontSize: '12px', fontWeight: 'bold', textAlign: 'left', backgroundColor: '#f9fafb', color: '#111827'}} {...props} />,
  td: ({node, ...props}: any) => <td style={{padding: '8px', border: '1px solid #d1d5db', fontSize: '12px', verticalAlign: 'top', color: '#374151'}} {...props} />,
  code: ({inline, className, children, ...props}: any) => {
    if (inline) {
       return <code style={{backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: '4px', fontFamily: '"Courier New", Courier, monospace', fontSize: '0.9em', color: '#c05621'}} {...props}>{children}</code>;
    }
    return (
       <div style={{backgroundColor: '#1a202c', color: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', overflow: 'hidden'}}>
         <pre style={{margin: 0, fontFamily: '"Courier New", Courier, monospace', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: '1.4'}}>{children}</pre>
       </div>
    );
  },
  img: ({node, ...props}: any) => <img style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '20px auto', borderRadius: '4px'}} {...props} />,
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
        // Create a dedicated container for PDF generation attached to the body
        const element = printRef.current.cloneNode(true) as HTMLElement;
        
        // Append to body FIRST to ensure correct style computation by browser
        document.body.appendChild(element);

        // Standard A4 dimensions at 96 DPI (Web Standard)
        const A4_WIDTH_PX = 794; 
        
        // Setup the invisible container styles
        // Position fixed at 0,0 but behind everything (z-index -9999) to ensure 
        // it's in the viewport for capture (fixing blank pages) but hidden from user.
        element.style.display = 'block';
        element.style.position = 'fixed'; 
        element.style.left = '0';
        element.style.top = '0';
        element.style.width = `${A4_WIDTH_PX}px`;
        element.style.zIndex = '-9999';
        
        // Ensure the container can grow
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        element.style.overflow = 'visible';
        
        element.style.backgroundColor = '#ffffff';
        element.style.color = '#000000'; // Force black text
        element.style.padding = '40px'; 
        element.className = 'pdf-export-root';
        
        // Add print-specific styles to force safe fonts and line heights
        const style = document.createElement('style');
        style.innerHTML = `
          .pdf-export-root {
            font-family: Arial, sans-serif !important;
            line-height: 1.5 !important;
            letter-spacing: normal !important;
            text-align: left !important;
          }
          .pdf-export-root h1, .pdf-export-root h2, .pdf-export-root h3 {
             font-family: "Times New Roman", Times, serif !important;
             line-height: 1.2 !important;
          }
          .pdf-export-root p, .pdf-export-root li {
             line-height: 1.6 !important;
          }
        `;
        element.appendChild(style);

        // A4 Dimensions in points: 595.28 x 841.89
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4'
        });
        
        const pdfWidth = doc.internal.pageSize.getWidth(); // ~595pt
        const margin = 30; // 30pt margin
        const contentWidth = pdfWidth - (margin * 2);
        
        // Calculate rendering
        await doc.html(element, {
            callback: function (doc) {
                const safeTitle = (tab.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                doc.save(`${safeTitle}_explanations.pdf`);
                // Cleanup
                if (document.body.contains(element)) {
                   document.body.removeChild(element);
                }
                setIsDownloading(false);
            },
            x: margin,
            y: margin,
            // The 'width' option in doc.html() sets the width of the content in the PDF (in pt).
            // It automatically calculates the scale factor based on the element's clientWidth (windowWidth).
            width: contentWidth, 
            windowWidth: A4_WIDTH_PX, 
            autoPaging: 'text',
            html2canvas: {
                scale: 1, // Fix overlap: Force 1:1 scale, let jsPDF handle vector scaling
                useCORS: true,
                logging: false,
                letterRendering: false, 
                backgroundColor: '#ffffff'
            },
            margin: [margin, margin, margin, margin]
        });
    } catch (e) {
        console.error("PDF generation failed", e);
        alert("Failed to generate PDF. Please try again.");
        setIsDownloading(false);
        // Cleanup global selector if needed
        const el = document.querySelector('.pdf-export-root');
        if (el) document.body.removeChild(el);
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
      {/* Note: The 'display: none' here is intentional for the React render. 
          When we clone it in handleDownload, we force display: block. */}
      <div ref={printRef} style={{ display: 'none' }}>
         <div style={{fontFamily: 'Arial, sans-serif', color: '#111827'}}>
            {/* Title Page Look */}
            <div style={{borderBottom: '4px solid #1e3a8a', paddingBottom: '32px', marginBottom: '48px', marginTop: '20px'}}>
               <h1 style={{fontSize: '42px', fontWeight: 'bold', margin: '0 0 16px 0', color: '#1e3a8a', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.2'}}>{tab.title}</h1>
               <p style={{fontSize: '18px', color: '#4b5563', margin: 0}}>AI-Powered Analysis & Explanation</p>
               <div style={{marginTop: '12px', fontSize: '14px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px'}}>
                 <span>Generated by Tabwise PDF Explainer</span>
                 <span>•</span>
                 <span>{new Date().toLocaleDateString()}</span>
               </div>
            </div>
            
            {tab.overallSummary && (
                <div style={{marginBottom: '50px', pageBreakAfter: 'always'}}>
                    <h2 style={{fontSize: '32px', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', marginBottom: '24px', color: '#1e3a8a', fontFamily: '"Times New Roman", Times, serif'}}>Executive Summary</h2>
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
                    <div key={page} style={{marginBottom: '50px', pageBreakInside: 'avoid'}}>
                        <div style={{backgroundColor: '#eff6ff', borderLeft: '6px solid #2563eb', padding: '16px 24px', marginBottom: '24px', borderRadius: '0 8px 8px 0'}}>
                           <h2 style={{fontSize: '24px', fontWeight: 'bold', margin: '0', color: '#1e40af', fontFamily: '"Times New Roman", Times, serif'}}>
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
                        {/* Subtle divider between pages if they flow together */}
                        <div style={{height: '1px', backgroundColor: '#e5e7eb', margin: '40px 0', width: '100%'}}></div>
                    </div>
                )
            ))}
         </div>
      </div>
    </div>
  );
};
