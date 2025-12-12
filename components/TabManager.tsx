import React from 'react';
import { Tab } from '../types';
import { Plus, X, FileText } from 'lucide-react';

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
}

export const TabManager: React.FC<TabManagerProps> = ({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  onNewTab
}) => {
  return (
    <div className="flex items-end h-12 bg-gray-200 dark:bg-gray-950 border-b border-gray-300 dark:border-gray-800 px-2 gap-1 overflow-x-auto no-scrollbar select-none transition-colors">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => onSwitchTab(tab.id)}
            className={`
              group relative flex items-center min-w-[150px] max-w-[200px] h-10 px-3 rounded-t-lg cursor-pointer transition-colors
              ${isActive ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm z-10' : 'bg-gray-300 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}
            `}
          >
            <FileText size={14} className={`mr-2 ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-500'}`} />
            <span className="text-sm font-medium truncate flex-1">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.id);
              }}
              className={`ml-2 p-0.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-400/30 dark:hover:bg-gray-600/50 transition-all ${tabs.length === 1 ? 'hidden' : ''}`}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      <button
        onClick={onNewTab}
        className="flex items-center justify-center w-8 h-8 mb-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
        title="New Tab"
      >
        <Plus size={20} />
      </button>
    </div>
  );
};