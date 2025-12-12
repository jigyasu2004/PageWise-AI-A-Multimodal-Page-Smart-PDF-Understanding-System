import React, { useState } from 'react';
import { TabSettings, SettingScope, APP_THEMES } from '../types';
import { Sliders, ChevronDown, ChevronUp, Zap, BrainCircuit, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface ControlPanelProps {
  settings: TabSettings;
  onUpdateSettings: (newSettings: TabSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  onRegenerateAll: (comment: string) => void;
  currentThemeId: string;
  onThemeChange: (id: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  onUpdateSettings, 
  isOpen, 
  onToggle,
  isMaximized,
  onToggleMaximize,
  onRegenerateAll,
  currentThemeId,
  onThemeChange
}) => {
  const [globalRegenComment, setGlobalRegenComment] = useState('');

  const updateField = (field: keyof TabSettings, value: any) => {
    onUpdateSettings({ ...settings, [field]: value });
  };

  const updateCheckbox = (category: keyof TabSettings['checkboxes'], scope: keyof SettingScope, value: boolean) => {
    onUpdateSettings({
      ...settings,
      checkboxes: {
        ...settings.checkboxes,
        [category]: {
          ...settings.checkboxes[category],
          [scope]: value
        }
      }
    });
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
      <div className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <button 
            onClick={onToggle}
            className="flex-1 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Sliders size={16} />
              <span>Configuration & Context</span>
            </div>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-600 mx-2"></div>
          
          <button 
              onClick={onToggleMaximize}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={isMaximized ? "Restore Split View" : "Maximize Explanations"}
           >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
           </button>
      </div>

      {isOpen && (
        <div className="px-4 pb-4 space-y-5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 shadow-inner p-4 max-h-[60vh] overflow-y-auto">
          
          {/* Model Selection */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">AI Model</label>
             <div className="flex gap-2">
                <button
                   onClick={() => updateField('model', 'gemini-2.5-flash')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${settings.model === 'gemini-2.5-flash' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <Zap size={14} className={settings.model === 'gemini-2.5-flash' ? 'fill-amber-500 text-amber-500' : 'text-gray-400'} />
                    <span>Fast (Flash)</span>
                </button>
                <button
                   onClick={() => updateField('model', 'gemini-3-pro-preview')}
                   className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm transition-all ${settings.model === 'gemini-3-pro-preview' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 ring-1 ring-blue-300 dark:ring-blue-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <BrainCircuit size={14} className={settings.model === 'gemini-3-pro-preview' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                    <span>Reasoning (Pro)</span>
                </button>
             </div>
             <p className="text-xs text-gray-400 italic">
                 {settings.model === 'gemini-2.5-flash' ? "Best for speed and simple summaries." : "Best for complex reasoning and deep understanding."}
             </p>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

          {/* Theme Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">App Theme</label>
            <div className="flex flex-wrap gap-3">
              {APP_THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`w-8 h-8 rounded-full border-2 transition-all shadow-sm flex items-center justify-center hover:scale-110 ${currentThemeId === theme.id ? 'border-gray-600 dark:border-white scale-110 ring-2 ring-gray-200 dark:ring-gray-600' : 'border-gray-200 dark:border-gray-700'}`}
                  style={{ backgroundColor: theme.colors[500] }}
                  title={theme.name}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

          {/* Style */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Explanation Style</label>
            </div>
            <select 
              value={settings.style}
              onChange={(e) => updateField('style', e.target.value)}
              className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2 border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option>Short</option>
              <option>Medium</option>
              <option>Long</option>
              <option>Pointwise</option>
              <option>Detailed</option>
              <option>Custom</option>
            </select>
            {settings.style === 'Custom' && (
              <input 
                type="text"
                placeholder="e.g. Use analogies, keep it funny"
                value={settings.customStyle}
                onChange={(e) => updateField('customStyle', e.target.value)}
                className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}
            <ScopeCheckboxes 
              label="Apply to" 
              values={settings.checkboxes.style} 
              onChange={(scope, val) => updateCheckbox('style', scope, val)} 
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Language</label>
            <select 
              value={settings.language}
              onChange={(e) => updateField('language', e.target.value)}
              className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2 border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option>Hinglish</option>
              <option>English</option>
              <option>Hindi</option>
              <option>Sanskrit</option>
              <option>Custom</option>
            </select>
            {settings.language === 'Custom' && (
              <input 
                type="text"
                placeholder="e.g. Formal legal English"
                value={settings.customLanguage}
                onChange={(e) => updateField('customLanguage', e.target.value)}
                className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border mt-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            )}
            {settings.language === 'Hinglish' && <p className="text-xs text-gray-400 italic">Example: "Tumhe mai samjhata hoon..."</p>}
            <ScopeCheckboxes 
              label="Apply to" 
              values={settings.checkboxes.language} 
              onChange={(scope, val) => updateCheckbox('language', scope, val)} 
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Additional Instructions</label>
            <textarea 
              value={settings.instructions}
              onChange={(e) => updateField('instructions', e.target.value)}
              rows={3}
              className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2 border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <ScopeCheckboxes 
              label="Apply to" 
              values={settings.checkboxes.instructions} 
              onChange={(scope, val) => updateCheckbox('instructions', scope, val)} 
            />
          </div>

          {/* Regenerate All Action */}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
             <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Regenerate Entire Document</label>
             <textarea 
               value={globalRegenComment}
               onChange={(e) => setGlobalRegenComment(e.target.value)}
               placeholder="Optional: Add comment for all pages (e.g. 'Use bullet points', 'Keep it extremely short')..."
               rows={2}
               className="w-full text-xs border-gray-300 dark:border-gray-600 rounded-md p-2 border mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
             />
             <button
               onClick={() => {
                   if (confirm("Are you sure? This will delete all current explanations and regenerate them with the new settings/comments.")) {
                       onRegenerateAll(globalRegenComment);
                   }
               }}
               className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-200 border border-orange-200 dark:border-orange-800 rounded-lg text-sm font-medium transition-colors"
             >
                <RefreshCw size={14} />
                Regenerate All Pages
             </button>
             <p className="text-center text-[10px] text-gray-400 mt-1">
                 This clears existing explanations and re-processes the entire PDF.
             </p>
          </div>

        </div>
      )}
    </div>
  );
};

const ScopeCheckboxes: React.FC<{ 
  label: string; 
  values: SettingScope; 
  onChange: (s: keyof SettingScope, v: boolean) => void 
}> = ({ label, values, onChange }) => (
  <div className="flex items-center gap-3 mt-1">
    <span className="text-xs text-gray-400">{label}:</span>
    <label className="inline-flex items-center gap-1 cursor-pointer">
      <input type="checkbox" checked={values.general} onChange={(e) => onChange('general', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500 w-3 h-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
      <span className="text-xs text-gray-600 dark:text-gray-400">General</span>
    </label>
    <label className="inline-flex items-center gap-1 cursor-pointer">
      <input type="checkbox" checked={values.fullPdf} onChange={(e) => onChange('fullPdf', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500 w-3 h-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
      <span className="text-xs text-gray-600 dark:text-gray-400">Full PDF</span>
    </label>
    <label className="inline-flex items-center gap-1 cursor-pointer">
      <input type="checkbox" checked={values.page} onChange={(e) => onChange('page', e.target.checked)} className="rounded text-brand-600 focus:ring-brand-500 w-3 h-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600" />
      <span className="text-xs text-gray-600 dark:text-gray-400">Page</span>
    </label>
  </div>
);