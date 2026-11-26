import React from 'react';
import { Moon, Pin, PinOff, Play, X, Cpu } from 'lucide-react';
import type { BrowserTab } from '../types/browser';

interface TabMemoryPopoverProps {
  tabs: BrowserTab[];
  activeTabId: string;
  totalRamMb: number;
  autoSleepSeconds: number;
  onSelectTab: (tabId: string) => void;
  onSleepTab: (tabId: string) => void;
  onWakeTab: (tabId: string) => void;
  onTogglePin: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSleepAllInactive: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const TabMemoryPopover: React.FC<TabMemoryPopoverProps> = ({
  tabs,
  activeTabId,
  totalRamMb,
  autoSleepSeconds,
  onSelectTab,
  onSleepTab,
  onWakeTab,
  onTogglePin,
  onCloseTab,
  onSleepAllInactive,
  onOpenSettings,
  onClose,
}) => {
  const activeCount = tabs.filter((t) => !t.isSleeping).length;
  const sleepingCount = tabs.filter((t) => t.isSleeping).length;
  const chromiumBaselineMb = 310 + tabs.length * 95;
  const savedMb = Math.max(0, chromiumBaselineMb - totalRamMb);

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="absolute top-20 right-3 w-[360px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-4 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Tab Memory Manager"
      >
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="font-display text-sm font-semibold">
              Memory &amp; Tab Hibernation
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              OS WebView footprint ·{' '}
              <span className="font-mono tabular-nums">{totalRamMb} MB</span> active
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close memory manager"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-200 dark:border-slate-800 text-left">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Active tabs
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums mt-0.5">
              {activeCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Sleeping tabs
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums mt-0.5 text-amber-600 dark:text-amber-400">
              {sleepingCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Est. saved
            </div>
            <div className="font-mono text-sm font-semibold tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">
              {savedMb} MB
            </div>
          </div>
        </div>

        <div className="py-2.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSleepAllInactive}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Moon className="w-3.5 h-3.5" />
            Sleep Background Tabs
          </button>
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 whitespace-nowrap shrink-0"
          >
            {autoSleepSeconds > 0
              ? `Auto-sleep: ${autoSleepSeconds < 60 ? `${autoSleepSeconds}s` : `${Math.round(autoSleepSeconds / 60)}m`}`
              : 'Auto-sleep: Off'}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => {
            const isCurrent = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className="flex items-center justify-between gap-2 py-2 text-xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(tab.id);
                    onClose();
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Cpu className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate font-medium">
                    {tab.title || 'New Tab'}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 shrink-0">
                      Current
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 mr-1">
                    {tab.isSleeping ? '0 MB' : `${tab.estimatedRamMb} MB`}
                  </span>

                  <button
                    type="button"
                    onClick={() => onTogglePin(tab.id)}
                    title={tab.isPinned ? 'Unpin tab' : 'Pin tab (keeps awake)'}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                  >
                    {tab.isPinned ? (
                      <PinOff className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Pin className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {tab.isSleeping ? (
                    <button
                      type="button"
                      onClick={() => onWakeTab(tab.id)}
                      title="Wake tab"
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    !tab.isPinned && (
                      <button
                        type="button"
                        onClick={() => onSleepTab(tab.id)}
                        title="Put tab to sleep"
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                      >
                        <Moon className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}

                  {!tab.isPinned && (
                    <button
                      type="button"
                      onClick={() => onCloseTab(tab.id)}
                      title="Close tab"
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
