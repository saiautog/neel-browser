import React from 'react';
import {
  Plus,
  X,
  Moon,
  Pin,
  Compass,
  Globe,
  EyeOff,
} from 'lucide-react';
import type { BrowserTab } from '../types/browser';
import { isInternalUrl } from '../utils/url';

interface TabStripProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabStrip: React.FC<TabStripProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
}) => {
  return (
    <div className="flex items-center h-10 px-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 select-none">
      <div
        className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto no-scrollbar"
        role="tablist"
        aria-label="Browser tabs"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const internal = isInternalUrl(tab.url);

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectTab(tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  onCloseTab(tab.id);
                }
              }}
              className={`group flex items-center gap-2 h-8 px-2.5 rounded-md border text-xs cursor-pointer transition-colors shrink-0 ${
                tab.isPinned ? 'max-w-[130px]' : 'min-w-[128px] max-w-[210px] flex-1'
              } ${
                isActive
                  ? 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-medium'
                  : tab.isSleeping
                    ? 'bg-transparent border-transparent text-slate-400 dark:text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                    : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="shrink-0 flex items-center justify-center w-3.5 h-3.5">
                {tab.isLoading ? (
                  <span className="w-3 h-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                ) : tab.isSleeping ? (
                  <Moon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                ) : tab.isPrivate ? (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                ) : internal ? (
                  <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                )}
              </span>

              <span className="truncate flex-1 text-left">
                {tab.title || 'New Tab'}
              </span>

              {tab.isPinned && (
                <Pin className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
              )}

              {!tab.isPinned && (
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-opacity shrink-0 ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={onNewTab}
          title="New Tab (Alt+T)"
          aria-label="New Tab"
          className="flex items-center justify-center w-8 h-8 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
