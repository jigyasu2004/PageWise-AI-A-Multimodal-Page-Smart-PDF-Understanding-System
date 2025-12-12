import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatMode, AIModel } from '../types';
import { Send, User, Bot, Sparkles, Globe, Image as ImageIcon, Loader2, X, Zap, BrainCircuit, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSendMessage: (message: string, mode: ChatMode, useSearch: boolean, model: AIModel, imageConfig?: { prompt: string, size: '1K'|'2K'|'4K' }) => void;
  isProcessing: boolean;
  currentPage: number;
  onClose: () => void;
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
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
      <div className="rounded-lg overflow-hidden my-4 border border-gray-700 bg-[#1e1e1e] shadow-md not-prose">
        <div className="bg-[#2d2d2d] px-3 py-1.5 flex justify-between items-center border-b border-[#404040]">
          <span className="text-[10px] text-gray-300 font-mono font-medium lowercase">{match[1]}</span>
          <button 
            onClick={handleCopy}
            className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
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
            padding: '0.75rem', 
            background: 'transparent',
            fontSize: '0.8rem',
            lineHeight: '1.4'
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
    <code className={`${className} bg-gray-100 dark:bg-gray-800 text-brand-700 dark:text-brand-400 rounded px-1 py-0.5 font-mono text-xs border border-gray-200 dark:border-gray-700`} {...props}>
      {children}
    </code>
  );
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  history, 
  onSendMessage, 
  isProcessing, 
  currentPage, 
  onClose,
  mode,
  onModeChange
}) => {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<AIModel>('gemini-2.5-flash');
  const [useSearch, setUseSearch] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [imageSize, setImageSize] = useState<'1K'|'2K'|'4K'>('1K');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (showImageGen) {
        onSendMessage(input, mode, false, model, { prompt: input, size: imageSize });
        setShowImageGen(false);
    } else {
        onSendMessage(input, mode, useSearch, model, undefined);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 shadow-2xl">
      {/* Header / Mode Selector */}
      <div className="flex flex-col border-b border-brand-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-3 py-2 bg-brand-50 dark:bg-gray-900">
            <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg text-white">
                <Bot size={16} />
            </div>
            <span className="font-semibold text-brand-900 dark:text-gray-100 text-sm">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
               <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-brand-200 dark:border-gray-600 p-0.5">
                  <button 
                    onClick={() => setModel('gemini-2.5-flash')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${model === 'gemini-2.5-flash' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 font-medium' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Fast (Flash)"
                  >
                     <Zap size={12} className={model === 'gemini-2.5-flash' ? 'fill-current' : ''} />
                  </button>
                  <button 
                    onClick={() => setModel('gemini-3-pro-preview')}
                    className={`p-1 rounded text-xs flex items-center gap-1 ${model === 'gemini-3-pro-preview' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-medium' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Reasoning (Pro)"
                  >
                     <BrainCircuit size={12} />
                  </button>
               </div>
               <div className="h-4 w-px bg-brand-200 dark:bg-gray-600 mx-1"></div>
               <button 
                onClick={onClose}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Close Chat"
                >
                <X size={16} />
                </button>
            </div>
        </div>
        
        <div className="px-3 py-2 flex items-center gap-2 justify-between bg-white dark:bg-gray-800 text-xs">
           <div className="flex items-center gap-2 flex-1">
             <span className="text-gray-400">Context:</span>
             <select 
                value={mode} 
                onChange={(e) => onModeChange(e.target.value as ChatMode)}
                className="font-medium border-none bg-gray-50 dark:bg-gray-700 rounded px-2 py-1 focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer outline-none hover:bg-gray-100 dark:hover:bg-gray-600"
            >
                <option value="general">General Chat</option>
                <option value="full-pdf">Full PDF Context</option>
                <option value="page-context">Page {currentPage} Context</option>
            </select>
           </div>
           
           <div className="flex items-center gap-1">
                <button 
                    onClick={() => setShowImageGen(!showImageGen)}
                    className={`p-1.5 rounded-md transition-colors ${showImageGen ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Generate Image"
                >
                    <ImageIcon size={14} />
                </button>
                <button 
                    onClick={() => setUseSearch(!useSearch)}
                    className={`p-1.5 rounded-md transition-colors ${useSearch ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    title="Search Grounding"
                >
                    <Globe size={14} />
                </button>
           </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-800">
        {history.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-sm mt-10">
                <Sparkles className="mx-auto mb-2 opacity-50" />
                <p>Ask anything about the document.</p>
                <p className="text-xs mt-1">Try "Summarize page 3" or "What is the conclusion?"</p>
            </div>
        )}
        {history.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`
              w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1
              ${msg.role === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300' : 'bg-brand-600 text-white'}
            `}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm
              ${msg.role === 'user' ? 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-tr-none border border-gray-100 dark:border-gray-600' : 'bg-brand-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-tl-none border border-brand-100 dark:border-gray-700'}
            `}>
               {msg.images && msg.images.length > 0 && (
                   <div className="mb-2 grid grid-cols-1 gap-2">
                       {msg.images.map((img, idx) => (
                           <img key={idx} src={`data:image/png;base64,${img}`} alt="Generated" className="rounded-lg max-w-full h-auto" />
                       ))}
                   </div>
               )}
               <div className="prose dark:prose-invert prose-sm prose-slate max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0 prose-img:rounded-lg">
                 <ReactMarkdown 
                    remarkPlugins={[remarkGfm]} 
                    rehypePlugins={[rehypeRaw]}
                    components={{
                        code: CodeBlock,
                        img: (props) => (
                            <img 
                                {...props} 
                                className="rounded-lg max-w-full h-auto" 
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                        )
                    }}
                 >
                    {msg.content}
                </ReactMarkdown>
               </div>
            </div>
          </div>
        ))}
        {isProcessing && (
            <div className="flex gap-3">
                 <div className="w-7 h-7 rounded-full bg-brand-600 text-white flex items-center justify-center flex-shrink-0 animate-pulse mt-1">
                    <Bot size={14} />
                 </div>
                 <div className="bg-brand-50 dark:bg-gray-900 px-4 py-2 rounded-2xl rounded-tl-none flex items-center border border-brand-100 dark:border-gray-700">
                    <Loader2 size={12} className="animate-spin mr-2 text-brand-600 dark:text-brand-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{model === 'gemini-2.5-flash' ? 'Processing...' : 'Thinking...'}</span>
                 </div>
            </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        {showImageGen && (
            <div className="flex items-center gap-2 mb-2 px-1 animate-in fade-in slide-in-from-bottom-2">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1"><ImageIcon size={12}/> Image Gen:</span>
                <select 
                    value={imageSize} 
                    onChange={(e) => setImageSize(e.target.value as any)}
                    className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 focus:border-purple-500 focus:ring-purple-500"
                >
                    <option value="1K">1K</option>
                    <option value="2K">2K</option>
                    <option value="4K">4K</option>
                </select>
            </div>
        )}
        <div className="relative flex items-center">
            <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={showImageGen ? "Describe image to generate..." : "Type your question..."}
            className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-all shadow-sm placeholder-gray-400 dark:placeholder-gray-500"
            disabled={isProcessing}
            />
            <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:hover:bg-brand-600 transition-colors shadow-sm"
            >
            <Send size={16} />
            </button>
        </div>
      </form>
    </div>
  );
};
