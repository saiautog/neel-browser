import React, { useEffect, useState } from 'react';
import {
  Trash2,
  ExternalLink,
  Search,
  Bookmark,
  History,
  Settings,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react';
import type {
  BookmarkEntry,
  BrowserSettings,
  HaloColorId,
  HistoryEntry,
  InternalRoute,
  SearchEngineId,
  ThemeMode,
} from '../types/browser';
import { HALO_COLORS, SEARCH_ENGINES, formatRelativeTime } from '../utils/url';

interface InternalPagesProps {
  route: InternalRoute;
  settings: BrowserSettings;
  bookmarks: BookmarkEntry[];
  history: HistoryEntry[];
  onUpdateSettings: (patch: Partial<BrowserSettings>) => void;
  onNavigate: (url: string) => void;
  onRemoveBookmark: (id: string) => void;
  onRemoveHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  onClearBookmarks: () => void;
}

export const InternalPages: React.FC<InternalPagesProps> = ({
  route,
  settings,
  bookmarks,
  history,
  onUpdateSettings,
  onNavigate,
  onRemoveBookmark,
  onRemoveHistoryItem,
  onClearHistory,
  onClearBookmarks,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    setFilterQuery('');
  }, [route]);

  if (route === 'neel://settings') {
    const sleepOptions = [
      { label: '15 seconds (Demo)', value: 15 },
      { label: '2 minutes', value: 120 },
      { label: '5 minutes', value: 300 },
      { label: '15 minutes', value: 900 },
      { label: 'Never sleep automatically', value: 0 },
    ];

    const themeOptions: Array<{ mode: ThemeMode; label: string; icon: React.ReactNode }> = [
      { mode: 'system', label: 'System (Follow OS)', icon: <Monitor className="w-3.5 h-3.5" /> },
      { mode: 'light', label: 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
      { mode: 'dark', label: 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
    ];

    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
          </div>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              Appearance
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">Theme</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Adaptive light and dark surface matching your operating system
                </div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => onUpdateSettings({ themeMode: opt.mode })}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      settings.themeMode === opt.mode
                        ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">Search Bar Halo Glow</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Color of the ambient glow and motes on the New Tab search bar
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(Object.entries(HALO_COLORS) as Array<[HaloColorId, (typeof HALO_COLORS)[HaloColorId]]>).map(
                  ([id, option]) => {
                    const selected = (settings.haloColor || 'sky') === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onUpdateSettings({ haloColor: id })}
                        title={option.label}
                        aria-label={`Set halo glow to ${option.label}`}
                        aria-pressed={selected}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors whitespace-nowrap shrink-0 ${
                          selected
                            ? 'border-slate-900 dark:border-slate-100 bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${option.swatchClass} shrink-0`}
                        />
                        <span className="hidden sm:inline">{option.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              Privacy &amp; Security
            </h2>

            <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">Built-in Ad &amp; Tracker Blocker</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Block ad networks, cosmetic ad slots, tracking scripts, pixels, and UTM parameters
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.trackerBlocking}
                onClick={() =>
                  onUpdateSettings({ trackerBlocking: !settings.trackerBlocking })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.trackerBlocking
                    ? 'bg-emerald-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.trackerBlocking ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">HTTPS-Only Mode</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Automatically upgrade unencrypted HTTP requests and warn before fallback
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.httpsOnly}
                onClick={() => onUpdateSettings({ httpsOnly: !settings.httpsOnly })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  settings.httpsOnly
                    ? 'bg-emerald-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.httpsOnly ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="font-display text-sm font-semibold text-slate-700 dark:text-slate-300">
              Memory &amp; Search
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">Auto Tab Sleep</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Hibernate inactive background tabs to keep memory footprint minimal
                </div>
              </div>
              <select
                value={settings.autoSleepSeconds}
                onChange={(e) =>
                  onUpdateSettings({ autoSleepSeconds: Number(e.target.value) })
                }
                aria-label="Auto tab sleep threshold"
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5"
              >
                {sleepOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-slate-100 dark:border-slate-900">
              <div>
                <div className="text-sm font-medium">Default Search Engine</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Used when entering search queries in the unified address bar
                </div>
              </div>
              <select
                value={settings.defaultSearchEngine}
                onChange={(e) =>
                  onUpdateSettings({
                    defaultSearchEngine: e.target.value as SearchEngineId,
                  })
                }
                aria-label="Default search engine"
                className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5"
              >
                {Object.entries(SEARCH_ENGINES).map(([id, engine]) => (
                  <option key={id} value={id}>
                    {engine.label}
                  </option>
                ))}
              </select>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (route === 'neel://bookmarks') {
    const filtered = bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
        b.url.toLowerCase().includes(filterQuery.toLowerCase())
    );

    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h1 className="font-display text-2xl font-bold tracking-tight">
                Bookmarks
              </h1>
            </div>
            {bookmarks.length > 0 && (
              <button
                type="button"
                onClick={onClearBookmarks}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter bookmarks..."
              className="flex-1 bg-transparent text-xs focus:outline-none"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {bookmarks.length === 0
                  ? 'No bookmarks saved yet'
                  : 'No bookmarks match your filter'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click the star icon in the address bar on any webpage to save it locally.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60"
                >
                  <button
                    type="button"
                    onClick={() => onNavigate(item.url)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="text-sm font-medium truncate hover:text-blue-600 dark:hover:text-blue-400">
                      {item.title}
                    </div>
                    <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.url}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-slate-400 tabular-nums hidden sm:inline">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.url)}
                      aria-label={`Open ${item.title}`}
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(item.id)}
                      aria-label={`Remove ${item.title}`}
                      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const filteredHistory = history.filter(
    (h) =>
      h.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      h.url.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h1 className="font-display text-2xl font-bold tracking-tight">History</h1>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={onClearHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search browsing history..."
            className="flex-1 bg-transparent text-xs focus:outline-none"
          />
        </div>

        {filteredHistory.length === 0 ? (
          <div className="py-16 text-center space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {history.length === 0
                ? 'No browsing history recorded'
                : 'No history entries match your search'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Private tabs never write entries to history.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900/60"
              >
                <button
                  type="button"
                  onClick={() => onNavigate(item.url)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-sm font-medium truncate hover:text-blue-600 dark:hover:text-blue-400">
                    {item.title}
                  </div>
                  <div className="font-mono text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {item.url}
                  </div>
                </button>
                <div className="flex items-center gap-3 shrink-0">
                  {item.blockedCount > 0 && (
                    <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400 hidden sm:inline">
                      {item.blockedCount} blocked
                    </span>
                  )}
                  <span className="text-xs text-slate-400 tabular-nums">
                    {formatRelativeTime(item.visitedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveHistoryItem(item.id)}
                    aria-label={`Delete ${item.title} from history`}
                    className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
