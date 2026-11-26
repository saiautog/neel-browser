import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  Star,
  MoreVertical,
  Bookmark,
  Compass,
  EyeOff,
  History,
  Settings,
  Sun,
  Moon,
  Monitor,
  Plus,
  Cpu,
} from 'lucide-react';
import type { BrowserTab, ThemeMode } from '../types/browser';
import { isInternalUrl } from '../utils/url';

interface CommandBarProps {
  tab: BrowserTab;
  isBookmarked: boolean;
  shieldPopoverOpen: boolean;
  themeMode: ThemeMode;
  addressInputRef: React.RefObject<HTMLInputElement | null>;
  onNavigate: (input: string) => void;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onToggleShieldPopover: () => void;
  onToggleReaderMode: () => void;
  onToggleBookmark: () => void;
  onNewPrivateTab: () => void;
  onNewTab: () => void;
  onOpenInternal: (route: 'neel://bookmarks' | 'neel://history' | 'neel://settings') => void;
  onOpenMemoryManager: () => void;
  onChangeTheme: (mode: ThemeMode) => void;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  tab,
  isBookmarked,
  shieldPopoverOpen,
  themeMode,
  addressInputRef,
  onNavigate,
  onBack,
  onForward,
  onReload,
  onToggleShieldPopover,
  onToggleReaderMode,
  onToggleBookmark,
  onNewPrivateTab,
  onNewTab,
  onOpenInternal,
  onOpenMemoryManager,
  onChangeTheme,
}) => {
  const [draftUrl, setDraftUrl] = useState(tab.url === 'neel://newtab' ? '' : tab.url);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftUrl(tab.url === 'neel://newtab' ? '' : tab.url);
  }, [tab.id, tab.url]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const canGoBack = tab.historyIndex > 0;
  const canGoForward = tab.historyIndex < tab.historyStack.length - 1;
  const internal = isInternalUrl(tab.url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(draftUrl || 'neel://newtab');
    addressInputRef.current?.blur();
  };

  return (
    <div className="relative flex items-center gap-2 h-11 px-2.5 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          title="Back (Alt+Left)"
          aria-label="Back"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onForward}
          disabled={!canGoForward}
          title="Forward (Alt+Right)"
          aria-label="Forward"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onReload}
          title="Reload"
          aria-label="Reload page"
          className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RotateCw className={`w-4 h-4 ${tab.isLoading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex items-center flex-1 min-w-0 h-8 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-colors px-1.5"
      >
        <button
          type="button"
          onClick={onToggleShieldPopover}
          aria-expanded={shieldPopoverOpen}
          title="Neel Shield & Connection Security"
          className="flex items-center gap-1 px-1.5 py-1 rounded text-xs hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {internal ? (
            <Compass className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          ) : tab.securityState === 'http-warning' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          ) : tab.blockedCount > 0 ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums text-[11px] font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              {tab.blockedCount}
            </span>
          ) : (
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
        </button>

        {tab.isPrivate && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 px-1.5 shrink-0">
            <EyeOff className="w-3 h-3" />
            Private
          </span>
        )}

        <input
          ref={addressInputRef}
          type="text"
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          placeholder="Search or enter address (Ctrl+K)"
          aria-label="Address bar"
          className="flex-1 min-w-0 bg-transparent px-2 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
        />

        {!internal && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={onToggleReaderMode}
              title={tab.readerMode ? 'Exit Reader View' : 'Enter Reader View'}
              aria-label="Toggle Reader View"
              className={`p-1 rounded transition-colors ${
                tab.readerMode
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleBookmark}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this page'}
              aria-label="Bookmark page"
              className={`p-1 rounded transition-colors ${
                isBookmarked
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
        )}
      </form>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onOpenInternal('neel://bookmarks')}
          title="Bookmarks"
          aria-label="Bookmarks"
          className="hidden md:inline-flex p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Bookmark className="w-4 h-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Browser menu"
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1.5 text-xs text-slate-800 dark:text-slate-200">
              <button
                type="button"
                onClick={() => {
                  onNewTab();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                New Tab
              </button>
              <button
                type="button"
                onClick={() => {
                  onNewPrivateTab();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                New Private Tab
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

              <button
                type="button"
                onClick={() => {
                  onOpenInternal('neel://bookmarks');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                Bookmarks
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenInternal('neel://history');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                History
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenInternal('neel://settings');
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenMemoryManager();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
              >
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                Memory &amp; Tab Sleep
              </button>

              <div className="my-1 border-t border-slate-200 dark:border-slate-800" />

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Theme
                </span>
                <div className="flex items-center gap-1 p-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => onChangeTheme('system')}
                    title="Follow OS theme"
                    className={`p-1 rounded ${
                      themeMode === 'system'
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTheme('light')}
                    title="Light theme"
                    className={`p-1 rounded ${
                      themeMode === 'light'
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTheme('dark')}
                    title="Dark theme"
                    className={`p-1 rounded ${
                      themeMode === 'dark'
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {tab.isLoading && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600/20 overflow-hidden"
        >
          <div className="h-full w-1/3 bg-blue-600 animate-[pulse_1s_ease-in-out_infinite]" />
        </div>
      )}
    </div>
  );
};
