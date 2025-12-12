import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SelectionMenuProps {
  onAsk: (text: string) => void;
}

export const SelectionMenu: React.FC<SelectionMenuProps> = ({ onAsk }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      // Basic validation
      if (!selection || selection.isCollapsed) {
        setPosition(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setPosition(null);
        return;
      }

      // Check if selection is inside an interactive element to avoid annoyances
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
          return;
      }

      // Get Coordinates
      try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          // Safety check for invisible selections
          if (rect.width === 0 && rect.height === 0) {
              setPosition(null);
              return;
          }

          // Calculate position (Fixed relative to viewport)
          // Position centered above the selection
          setPosition({
            top: rect.top - 50, 
            left: rect.left + (rect.width / 2)
          });
          setSelectedText(text);
      } catch (e) {
          setPosition(null);
      }
    };

    // We use selectionchange for responsiveness, but debounce could be added if performance suffers.
    // For now, raw event with standard checks is usually fine for UI responsiveness.
    // Using 'mouseup' and 'keyup' is often more stable for "finished" selections than 'selectionchange'.
    const handleInteractionEnd = () => {
        // Short timeout to let selection settle
        setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('mouseup', handleInteractionEnd);
    document.addEventListener('keyup', handleInteractionEnd);
    
    // Hide on scroll to prevent floating button from detaching from text
    const handleScroll = () => setPosition(null);
    document.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mouseup', handleInteractionEnd);
      document.removeEventListener('keyup', handleInteractionEnd);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  if (!position) return null;

  return (
    <div 
      className="fixed z-[100] animate-in fade-in zoom-in duration-200"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
      onMouseDown={(e) => e.preventDefault()} // Prevent clicking the button from clearing the selection
    >
      <button
        onClick={() => {
            onAsk(selectedText);
            setPosition(null);
            // Optional: Clear selection after asking
            window.getSelection()?.removeAllRanges();
        }}
        className="flex items-center gap-2 bg-brand-600 dark:bg-brand-500 text-white px-4 py-2 rounded-full shadow-xl hover:bg-brand-700 dark:hover:bg-brand-400 transition-all hover:scale-105 active:scale-95 text-sm font-medium border border-white/20"
      >
        <Sparkles size={16} />
        Ask AI
      </button>
      {/* Little Triangle/Arrow pointing down */}
      <div className="w-3 h-3 bg-brand-600 dark:bg-brand-500 rotate-45 absolute left-1/2 -bottom-1.5 -translate-x-1/2 -z-10 shadow-sm"></div>
    </div>
  );
};
