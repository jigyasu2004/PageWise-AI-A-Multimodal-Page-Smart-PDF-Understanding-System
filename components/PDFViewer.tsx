import React, { useState, useEffect, useRef } from 'react';
import { Tab } from '../types';
import { Upload, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle, Link2, Link2Off, Maximize2, Minimize2, Globe, ArrowRight } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Robustly handle module import for pdfjs-dist in browser ESM environment
let pdfjs: any = pdfjsLib;
if (pdfjs.default) {
    pdfjs = pdfjs.default;
}

// Configures the worker to use the classic script from CDNJS, which is compatible with importScripts
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// Matrix multiplication helper
function multiply(m1: number[], m2: number[]) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
  ];
}

interface PDFViewerProps {
  tab: Tab;
  onUpload: (file: File) => void;
  onPageChange: (page: number) => void;
  onUpdatePageCount: (count: number) => void;
  onToggleSync: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ 
  tab, 
  onUpload, 
  onPageChange, 
  onUpdatePageCount, 
  onToggleSync,
  isMaximized,
  onToggleMaximize
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.0);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // URL Upload State
  const [urlInput, setUrlInput] = useState('');
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Document
  useEffect(() => {
    if (tab.pdfUrl && (!pdfDoc || pdfDoc.loadingTask?.destroyed)) {
      setError(null);
      const loadingTask = pdfjs.getDocument(tab.pdfUrl);
      loadingTask.promise.then((doc: any) => {
        setPdfDoc(doc);
        onUpdatePageCount(doc.numPages);
        setError(null);
      }, (reason: any) => {
        console.error("Error loading PDF", reason);
        setError("Failed to load PDF document. It might be corrupted or password protected.");
      });
    } else if (!tab.pdfUrl) {
      setPdfDoc(null);
    }
  }, [tab.pdfUrl]);

  // Render Page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      setRendering(true);
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(tab.currentPage);
        
        // HiDPI Rendering Support
        const outputScale = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = canvasRef.current;
        const textLayer = textLayerRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        
        // Set dimensions for HiDPI
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context!,
          viewport: viewport,
          transform: transform
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        // Render Text Layer manually for selection
        if (textLayer) {
            textLayer.innerHTML = '';
            textLayer.style.width = `${Math.floor(viewport.width)}px`;
            textLayer.style.height = `${Math.floor(viewport.height)}px`;
            
            const textContent = await page.getTextContent();
            
            textContent.items.forEach((item: any) => {
                if (!item.str || !item.str.trim()) return;

                // Create span
                const span = document.createElement('span');
                span.textContent = item.str;

                // Get the transform matrix for the text item relative to the viewport
                // item.transform is [scaleX, skewY, skewX, scaleY, x, y] (PDF space)
                // viewport.transform maps PDF units to viewport pixels and flips Y axis
                const tx = multiply(viewport.transform, item.transform);
                
                // Calculate geometry
                const angle = Math.atan2(tx[1], tx[0]);
                const fontHeight = Math.hypot(tx[2], tx[3]);
                const fontWidth = Math.hypot(tx[0], tx[1]);
                
                if (fontHeight <= 0) return;

                // Calculate scaling (stretch/compress)
                // Use aspect ratio to detect if font is condensed or expanded compared to square
                const scaleX = fontWidth / fontHeight;

                // Style the span
                span.style.left = `${tx[4]}px`;
                // Adjust top to account for baseline. HTML positioning is top-left, PDF is baseline.
                // Subtracting fontHeight approximates the ascent to position top correctly.
                span.style.top = `${tx[5] - fontHeight}px`; 
                span.style.fontSize = `${fontHeight}px`;
                span.style.fontFamily = 'sans-serif';
                span.style.position = 'absolute';
                span.style.transformOrigin = '0% 100%'; // Pivot at bottom-left (baseline start)
                span.style.whiteSpace = 'pre';
                span.style.cursor = 'text';
                
                // Apply transformations
                let transform = '';
                if (angle !== 0) {
                     transform += `rotate(${angle}rad) `;
                }
                if (Math.abs(scaleX - 1) > 0.05) {
                     transform += `scaleX(${scaleX})`;
                }
                
                if (transform) {
                    span.style.transform = transform;
                }

                textLayer.appendChild(span);
            });
        }

      } catch (error: any) {
        if (error.name !== 'RenderingCancelledException') {
          console.error('Render error:', error);
        }
      } finally {
        setRendering(false);
      }
    };

    renderPage();
  }, [pdfDoc, tab.currentPage, scale]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onUpload(file);
      } else {
        alert('Please upload a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsUrlLoading(true);
    try {
        const response = await fetch(urlInput);
        if (!response.ok) throw new Error("Failed to fetch PDF");
        
        const blob = await response.blob();
        if (blob.type !== 'application/pdf') {
            throw new Error("URL does not point to a valid PDF file");
        }
        
        // Create a proper File object from the blob
        const fileName = urlInput.split('/').pop() || "document.pdf";
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        onUpload(file);
    } catch (err: any) {
        console.error("URL Load Error:", err);
        alert(`Could not load PDF from URL. \n\nReason: ${err.message}\n\nNote: Many websites block direct access (CORS). Try downloading the file first.`);
    } finally {
        setIsUrlLoading(false);
    }
  };

  const handlePageChange = (delta: number) => {
    const newPage = Math.max(1, Math.min(tab.pageCount, tab.currentPage + delta));
    if (newPage !== tab.currentPage) {
      onPageChange(newPage);
    }
  };

  // Support Trackpad Pinch/Ctrl+Wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomSensitivity = 0.1;
      // If deltaY is negative, user is scrolling up (zooming in)
      if (e.deltaY < 0) {
        setScale(s => Math.min(5, s + zoomSensitivity));
      } else {
        setScale(s => Math.max(0.5, s - zoomSensitivity));
      }
    }
  };

  if (!tab.file && !tab.pdfUrl) {
    return (
      <div 
        className={`h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-8 transition-colors ${dragActive ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="bg-white dark:bg-gray-700 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-600 text-center max-w-md w-full transition-colors">
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Upload your PDF</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Drag and drop your document here, or click to browse files.</p>
          
          <label className="block w-full mb-6">
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
            <span className="block w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
              Select PDF File
            </span>
          </label>

          {/* Divider */}
          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-gray-500 text-xs uppercase font-medium">Or load from URL</span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-600"></div>
          </div>

          {/* URL Input */}
          <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
            <div className="relative">
                <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="url" 
                    placeholder="https://example.com/document.pdf" 
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                    required
                />
            </div>
            <button 
                type="submit" 
                disabled={isUrlLoading || !urlInput.trim()}
                className="w-full py-2.5 px-4 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-100 font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
                {isUrlLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {isUrlLoading ? 'Loading...' : 'Load from Link'}
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Note: Some websites block direct access via URL (CORS).</p>
          </form>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 relative group transition-colors">
      {/* Toolbar */}
      <div className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shadow-sm z-20 relative transition-colors">
        <div className="flex items-center gap-4 flex-1 overflow-hidden mr-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate" title={tab.title}>
                {tab.title}
            </span>
        </div>
        
        <div className="flex items-center gap-2">
           {/* Sync Toggle */}
           <button 
             onClick={onToggleSync}
             className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${tab.isSyncEnabled ? 'bg-brand-50 dark:bg-brand-900/50 text-brand-700 dark:text-brand-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}
             title={tab.isSyncEnabled ? "Sync ON: Explanation follows PDF" : "Sync OFF: Move independently"}
           >
             {tab.isSyncEnabled ? <Link2 size={16} /> : <Link2Off size={16} />}
             <span className="text-xs font-medium hidden sm:inline">{tab.isSyncEnabled ? "Sync" : "Unsync"}</span>
           </button>

           <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>

           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
             <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
               <ZoomOut size={16} />
             </button>
             <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-center font-mono">{Math.round(scale * 100)}%</span>
             <button onClick={() => setScale(s => Math.min(5, s + 0.25))} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
               <ZoomIn size={16} />
             </button>
           </div>

           <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button 
                onClick={() => handlePageChange(-1)} 
                disabled={tab.currentPage <= 1}
                className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 dark:text-gray-300"
            >
                <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-mono text-gray-600 dark:text-gray-300 min-w-[4rem] text-center">
                {tab.currentPage} / {tab.pageCount}
            </span>
            <button 
                onClick={() => handlePageChange(1)} 
                disabled={tab.currentPage >= tab.pageCount}
                className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-30 disabled:hover:bg-transparent text-gray-700 dark:text-gray-300"
            >
                <ChevronRight size={18} />
            </button>
           </div>
           
           <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 mx-1"></div>

           <button 
              onClick={onToggleMaximize}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              title={isMaximized ? "Restore" : "Maximize PDF"}
           >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
           </button>
        </div>
      </div>
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative bg-gray-500 dark:bg-gray-900 overflow-auto outline-none transition-colors" 
        onWheel={handleWheel}
        tabIndex={0} 
      >
         <div className="min-h-full min-w-full flex items-center justify-center p-8">
             <div className="relative shadow-2xl bg-white">
                 <canvas ref={canvasRef} />
                 <div ref={textLayerRef} className="textLayer" />
             </div>
         </div>
      </div>

      {/* Overlays (Loader / Error) */}
      {error && (
        <div className="absolute inset-0 top-12 flex items-center justify-center bg-gray-100/90 dark:bg-gray-900/90 z-10 pointer-events-none">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center text-red-600 dark:text-red-400 max-w-sm text-center pointer-events-auto">
            <AlertCircle size={48} className="mb-2"/>
            <p>{error}</p>
            </div>
        </div>
      )}
      
      {rendering && !error && (
        <div className="absolute top-20 right-8 z-30 pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur px-3 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-600 flex items-center gap-2">
            <Loader2 className="animate-spin text-brand-600 dark:text-brand-400" size={16} />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Rendering...</span>
            </div>
        </div>
      )}
    </div>
  );
};