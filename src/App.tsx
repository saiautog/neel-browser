import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  BookmarkEntry,
  BrowserSettings,
  BrowserTab,
  HistoryEntry,
  InternalRoute,
  ReaderArticle,
} from './types/browser';
import {
  getInternalTitle,
  isInternalUrl,
  resolveAddressInput,
} from './utils/url';
import { TabStrip } from './components/TabStrip';
import { CommandBar } from './components/CommandBar';
import { TabMemoryPopover } from './components/TabMemoryPopover';
import { ShieldPopover } from './components/ShieldPopover';
import { NewTabView } from './components/NewTabView';
import { WebViewport } from './components/WebViewport';
import { InternalPages } from './components/InternalPages';

const STORAGE_SETTINGS_KEY = 'neel_browser_settings_v1';
const STORAGE_BOOKMARKS_KEY = 'neel_browser_bookmarks_v1';
const STORAGE_HISTORY_KEY = 'neel_browser_history_v1';

const DEFAULT_SETTINGS: BrowserSettings = {
  themeMode: 'system',
  haloColor: 'sky',
  httpsOnly: true,
  trackerBlocking: true,
  autoSleepSeconds: 300,
  defaultSearchEngine: 'duckduckgo',
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createTab(url = 'neel://newtab', options?: { isPrivate?: boolean }): BrowserTab {
  const internal = isInternalUrl(url);
  return {
    id: createId(),
    title: internal ? getInternalTitle(url) : url,
    url,
    faviconUrl: '',
    historyStack: [url],
    historyIndex: 0,
    isLoading: false,
    isSleeping: false,
    isPinned: false,
    isPrivate: Boolean(options?.isPrivate),
    lastActiveAt: Date.now(),
    estimatedRamMb: internal ? 10 : 22,
    securityState: internal ? 'internal' : 'https',
    blockedCount: 0,
    blockedDomains: [],
    strippedParams: [],
    readerMode: false,
    sanitizedHtml: '',
    youtubeVideoId: null,
    readerArticle: null,
    rawByteSize: 0,
    sanitizedByteSize: 0,
    errorMessage: null,
    protocolWarning: null,
    siteTrackerShieldOverride: null,
  };
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface BrowseApiResponse {
  ok?: boolean;
  protocolWarning?: boolean;
  attemptedUrl?: string;
  httpFallbackUrl?: string;
  error?: string;
  finalUrl?: string;
  title?: string;
  faviconUrl?: string;
  upgradedHttps?: boolean;
  blockedCount?: number;
  blockedDomains?: string[];
  strippedParams?: string[];
  rawByteSize?: number;
  sanitizedByteSize?: number;
  sanitizedHtml?: string;
  youtubeVideoId?: string | null;
  readerArticle?: ReaderArticle;
}

export default function App() {
  const [settings, setSettings] = useState<BrowserSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJson<Partial<BrowserSettings>>(STORAGE_SETTINGS_KEY, {}),
  }));
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() =>
    loadJson<BookmarkEntry[]>(STORAGE_BOOKMARKS_KEY, [])
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadJson<HistoryEntry[]>(STORAGE_HISTORY_KEY, [])
  );

  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createTab('neel://newtab')]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? '');
  const [memoryPopoverOpen, setMemoryPopoverOpen] = useState(false);
  const [shieldPopoverOpen, setShieldPopoverOpen] = useState(false);

  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const tabAbortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const tabFetchSeqRef = useRef<Map<string, number>>(new Map());

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  );

  // Persist settings, bookmarks, history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage quota errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Adaptive OS Light / Dark theme controller
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const shouldUseDark =
        settings.themeMode === 'dark' ||
        (settings.themeMode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', shouldUseDark);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.themeMode]);

  // Sync privacy settings to native Rust WebView core when running as desktop app
  useEffect(() => {
    const tauriInternals = (
      window as unknown as {
        __TAURI_INTERNALS__?: {
          invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
        };
      }
    ).__TAURI_INTERNALS__;
    if (tauriInternals && typeof tauriInternals.invoke === 'function') {
      void tauriInternals.invoke('set_privacy_settings', {
        httpsOnly: settings.httpsOnly,
        trackerBlocking: settings.trackerBlocking,
      });
    }
  }, [settings.httpsOnly, settings.trackerBlocking]);

  const fetchWebPageIntoTab = useCallback(
    async (
      tabId: string,
      targetUrl: string,
      options?: { allowHttp?: boolean; blockTrackersOverride?: boolean | null }
    ) => {
      tabAbortControllersRef.current.get(tabId)?.abort();
      const controller = new AbortController();
      tabAbortControllersRef.current.set(tabId, controller);
      const seq = (tabFetchSeqRef.current.get(tabId) || 0) + 1;
      tabFetchSeqRef.current.set(tabId, seq);

      const tabSnapshot = tabsRef.current.find((t) => t.id === tabId);
      const effectiveBlockTrackers =
        options?.blockTrackersOverride !== undefined
          ? (options.blockTrackersOverride ?? settings.trackerBlocking)
          : (tabSnapshot?.siteTrackerShieldOverride ?? settings.trackerBlocking);

      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId
            ? {
                ...t,
                url: targetUrl,
                isLoading: true,
                isSleeping: false,
                errorMessage: null,
                protocolWarning: null,
                lastActiveAt: Date.now(),
              }
            : t
        )
      );

      try {
        const tauriInternals = (
          window as unknown as {
            __TAURI_INTERNALS__?: {
              invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
            };
          }
        ).__TAURI_INTERNALS__;

        if (tauriInternals && typeof tauriInternals.invoke === 'function') {
          const result = await tauriInternals.invoke<{
            url: string;
            upgraded_https: boolean;
            stripped_params: string[];
            blocked_tracker_host: string | null;
          }>('open_native_tab', { tabId, rawUrl: targetUrl });

          if (tabFetchSeqRef.current.get(tabId) !== seq) return;
          const finalUrl = result.url || targetUrl;
          let hostname = finalUrl;
          try {
            hostname = new URL(finalUrl).hostname;
          } catch {
            // keep raw
          }
          const blockedCount =
            (result.stripped_params?.length || 0) + (result.blocked_tracker_host ? 1 : 0);

          const nativeNoticeHtml = `<!DOCTYPE html><html><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#0f172a;padding:24px;"><div style="max-width:460px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;text-align:center;"><h2 style="margin:0 0 8px 0;font-size:17px;">Opened in Native WebView Window</h2><p style="margin:0;font-size:13px;color:#475569;line-height:1.5;"><strong>${hostname.replace(/[<>&"']/g, '')}</strong> is running directly in your OS-native WebView engine with hardware acceleration and full site compatibility.</p></div></body></html>`;

          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    url: finalUrl,
                    title: hostname,
                    isLoading: false,
                    isSleeping: false,
                    lastActiveAt: Date.now(),
                    estimatedRamMb: 24,
                    securityState: result.upgraded_https ? 'upgraded' : 'https',
                    blockedCount,
                    blockedDomains: result.blocked_tracker_host
                      ? [result.blocked_tracker_host]
                      : [],
                    strippedParams: result.stripped_params || [],
                    sanitizedHtml: nativeNoticeHtml,
                    youtubeVideoId: null,
                    readerArticle: null,
                    errorMessage: null,
                    protocolWarning: null,
                  }
                : t
            )
          );
          return;
        }

        const params = new URLSearchParams({
          url: targetUrl,
          httpsOnly: String(settings.httpsOnly),
          blockTrackers: String(effectiveBlockTrackers),
          allowHttp: String(Boolean(options?.allowHttp)),
        });

        const res = await fetch(`/api/browse?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as BrowseApiResponse;
        if (tabFetchSeqRef.current.get(tabId) !== seq) return;

        if (data.protocolWarning && data.httpFallbackUrl) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    isLoading: false,
                    title: 'HTTPS-Only Warning',
                    securityState: 'http-warning',
                    protocolWarning: {
                      attemptedUrl: data.attemptedUrl || targetUrl,
                      httpFallbackUrl: data.httpFallbackUrl || targetUrl,
                      reason: data.error || 'Secure HTTPS verification failed.',
                    },
                  }
                : t
            )
          );
          return;
        }

        if (!res.ok || !data.ok || !data.finalUrl) {
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tabId
                ? {
                    ...t,
                    isLoading: false,
                    securityState: 'error',
                    errorMessage:
                      data.error || 'The destination server could not be reached.',
                  }
                : t
            )
          );
          return;
        }

        const sanitizedBytes = data.sanitizedByteSize || 0;
        const estimatedRam = Math.min(48, Math.max(16, Math.round(16 + sanitizedBytes / 32768)));
        const blockedCount = data.blockedCount || 0;
        const pageTitle = data.title || data.finalUrl;

        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  url: data.finalUrl!,
                  title: pageTitle,
                  faviconUrl: data.faviconUrl || '',
                  isLoading: false,
                  isSleeping: false,
                  lastActiveAt: Date.now(),
                  estimatedRamMb: estimatedRam,
                  securityState: options?.allowHttp
                    ? 'http-warning'
                    : data.upgradedHttps
                      ? 'upgraded'
                      : 'https',
                  blockedCount,
                  blockedDomains: data.blockedDomains || [],
                  strippedParams: data.strippedParams || [],
                  rawByteSize: data.rawByteSize || 0,
                  sanitizedByteSize: sanitizedBytes,
                  sanitizedHtml: data.sanitizedHtml || '',
                  youtubeVideoId: data.youtubeVideoId || null,
                  readerArticle: data.readerArticle || null,
                  errorMessage: null,
                  protocolWarning: null,
                }
              : t
          )
        );

        if (!tabSnapshot?.isPrivate) {
          setHistory((prev) => [
            {
              id: createId(),
              title: pageTitle,
              url: data.finalUrl!,
              visitedAt: Date.now(),
              blockedCount,
            },
            ...prev.slice(0, 149),
          ]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (tabFetchSeqRef.current.get(tabId) !== seq) return;
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isLoading: false,
                  securityState: 'error',
                  errorMessage: 'Network error while connecting through Neel Shield.',
                }
              : t
          )
        );
      }
    },
    [settings.httpsOnly, settings.trackerBlocking]
  );

  const navigateTab = useCallback(
    (
      tabId: string,
      rawInput: string,
      options?: { allowHttp?: boolean; pushHistory?: boolean }
    ) => {
      const resolvedUrl = resolveAddressInput(
        rawInput,
        settings.defaultSearchEngine,
        settings.httpsOnly
      );

      if (isInternalUrl(resolvedUrl)) {
        tabAbortControllersRef.current.get(tabId)?.abort();
        tabAbortControllersRef.current.delete(tabId);
        tabFetchSeqRef.current.set(tabId, (tabFetchSeqRef.current.get(tabId) || 0) + 1);
      }

      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId) return t;
          const shouldPush = options?.pushHistory !== false && resolvedUrl !== t.url;
          const nextStack = shouldPush
            ? [...t.historyStack.slice(0, t.historyIndex + 1), resolvedUrl]
            : t.historyStack;
          const nextIndex = shouldPush ? nextStack.length - 1 : t.historyIndex;

          if (isInternalUrl(resolvedUrl)) {
            return {
              ...t,
              url: resolvedUrl,
              title: getInternalTitle(resolvedUrl),
              historyStack: nextStack,
              historyIndex: nextIndex,
              isLoading: false,
              isSleeping: false,
              lastActiveAt: Date.now(),
              estimatedRamMb: 10,
              securityState: 'internal',
              blockedCount: 0,
              blockedDomains: [],
              strippedParams: [],
              readerMode: false,
              sanitizedHtml: '',
              youtubeVideoId: null,
              readerArticle: null,
              errorMessage: null,
              protocolWarning: null,
            };
          }

          return {
            ...t,
            url: resolvedUrl,
            historyStack: nextStack,
            historyIndex: nextIndex,
            readerMode: false,
            lastActiveAt: Date.now(),
          };
        })
      );

      if (!isInternalUrl(resolvedUrl)) {
        void fetchWebPageIntoTab(tabId, resolvedUrl, { allowHttp: options?.allowHttp });
      }
    },
    [fetchWebPageIntoTab, settings.defaultSearchEngine, settings.httpsOnly]
  );

  const handleSelectTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, lastActiveAt: Date.now() } : t))
    );
  }, []);

  const handleNewTab = useCallback(
    (url = 'neel://newtab', isPrivate = false) => {
      const next = createTab(url, { isPrivate });
      setTabs((prev) => [...prev, next]);
      setActiveTabId(next.id);
      if (!isInternalUrl(url)) {
        void fetchWebPageIntoTab(next.id, url);
      }
    },
    [fetchWebPageIntoTab]
  );

  const handleCloseTab = useCallback(
    (tabId: string) => {
      tabAbortControllersRef.current.get(tabId)?.abort();
      tabAbortControllersRef.current.delete(tabId);
      tabFetchSeqRef.current.delete(tabId);
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const remaining = prev.filter((t) => t.id !== tabId);
        if (remaining.length === 0) {
          const fallback = createTab('neel://newtab');
          setActiveTabId(fallback.id);
          return [fallback];
        }
        if (tabId === activeTabId) {
          const nextTab = remaining[Math.max(0, idx - 1)] || remaining[0];
          setActiveTabId(nextTab.id);
        }
        return remaining;
      });
    },
    [activeTabId]
  );

  const handleBack = useCallback(() => {
    if (!activeTab || activeTab.historyIndex <= 0) return;
    const prevIndex = activeTab.historyIndex - 1;
    const targetUrl = activeTab.historyStack[prevIndex];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id ? { ...t, historyIndex: prevIndex } : t
      )
    );
    navigateTab(activeTab.id, targetUrl, { pushHistory: false });
  }, [activeTab, navigateTab]);

  const handleForward = useCallback(() => {
    if (!activeTab || activeTab.historyIndex >= activeTab.historyStack.length - 1) return;
    const nextIndex = activeTab.historyIndex + 1;
    const targetUrl = activeTab.historyStack[nextIndex];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id ? { ...t, historyIndex: nextIndex } : t
      )
    );
    navigateTab(activeTab.id, targetUrl, { pushHistory: false });
  }, [activeTab, navigateTab]);

  const handleReload = useCallback(() => {
    if (!activeTab) return;
    if (isInternalUrl(activeTab.url)) return;
    void fetchWebPageIntoTab(activeTab.id, activeTab.url);
  }, [activeTab, fetchWebPageIntoTab]);

  const handleSleepTab = useCallback((tabId: string) => {
    tabAbortControllersRef.current.get(tabId)?.abort();
    tabAbortControllersRef.current.delete(tabId);
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId && !t.isPinned
          ? {
              ...t,
              isSleeping: true,
              isLoading: false,
              sanitizedHtml: '',
              estimatedRamMb: 0,
            }
          : t
      )
    );
  }, []);

  const handleWakeTab = useCallback(
    (tabId: string) => {
      const target = tabsRef.current.find((t) => t.id === tabId);
      if (!target) return;
      if (isInternalUrl(target.url)) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isSleeping: false,
                  estimatedRamMb: 10,
                  lastActiveAt: Date.now(),
                }
              : t
          )
        );
        return;
      }
      void fetchWebPageIntoTab(tabId, target.url);
    },
    [fetchWebPageIntoTab]
  );

  const handleSleepAllInactive = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id !== activeTabId && !t.isPinned && !t.isSleeping
          ? {
              ...t,
              isSleeping: true,
              sanitizedHtml: '',
              estimatedRamMb: 0,
            }
          : t
      )
    );
  }, [activeTabId]);

  const handleTogglePin = useCallback((tabId: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === tabId
          ? {
              ...t,
              isPinned: !t.isPinned,
              isSleeping: !t.isPinned ? false : t.isSleeping,
            }
          : t
      )
    );
  }, []);

  const handleToggleSiteShield = useCallback(
    (tabId: string) => {
      const target = tabsRef.current.find((t) => t.id === tabId);
      if (!target) return;
      const current =
        target.siteTrackerShieldOverride !== null
          ? target.siteTrackerShieldOverride
          : settings.trackerBlocking;
      const nextValue = !current;
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tabId ? { ...t, siteTrackerShieldOverride: nextValue } : t
        )
      );
      if (!isInternalUrl(target.url)) {
        void fetchWebPageIntoTab(tabId, target.url, {
          blockTrackersOverride: nextValue,
        });
      }
    },
    [fetchWebPageIntoTab, settings.trackerBlocking]
  );

  const handleToggleBookmark = useCallback(() => {
    if (!activeTab || isInternalUrl(activeTab.url)) return;
    setBookmarks((prev) => {
      const existing = prev.find((b) => b.url === activeTab.url);
      if (existing) {
        return prev.filter((b) => b.id !== existing.id);
      }
      return [
        {
          id: createId(),
          title: activeTab.title || activeTab.url,
          url: activeTab.url,
          createdAt: Date.now(),
        },
        ...prev,
      ];
    });
  }, [activeTab]);

  // Automatic inactive tab sleep scheduler
  useEffect(() => {
    if (settings.autoSleepSeconds <= 0) return;
    const thresholdMs = settings.autoSleepSeconds * 1000;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setTabs((prev) => {
        let changed = false;
        const next = prev.map((t) => {
          if (
            t.id !== activeTabId &&
            !t.isPinned &&
            !t.isSleeping &&
            !t.isLoading &&
            now - t.lastActiveAt >= thresholdMs
          ) {
            changed = true;
            return {
              ...t,
              isSleeping: true,
              sanitizedHtml: '',
              estimatedRamMb: 0,
            };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [activeTabId, settings.autoSleepSeconds]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        addressInputRef.current?.focus();
        addressInputRef.current?.select();
        return;
      }
      if (!inInput && e.key === '/') {
        e.preventDefault();
        addressInputRef.current?.focus();
        addressInputRef.current?.select();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewTab();
        return;
      }
      if (e.altKey && e.key.toLowerCase() === 'w' && activeTab && !activeTab.isPinned) {
        e.preventDefault();
        handleCloseTab(activeTab.id);
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
        return;
      }
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        handleForward();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, handleBack, handleCloseTab, handleForward, handleNewTab]);

  const totalRamMb = useMemo(() => {
    const baseShellMb = 34;
    const tabsRam = tabs.reduce(
      (sum, tab) => sum + (tab.isSleeping ? 0 : tab.estimatedRamMb),
      0
    );
    return baseShellMb + tabsRam;
  }, [tabs]);

  const isCurrentBookmarked = useMemo(
    () => Boolean(activeTab && bookmarks.some((b) => b.url === activeTab.url)),
    [activeTab, bookmarks]
  );

  if (!activeTab) return null;

  const activeIsInternal = isInternalUrl(activeTab.url);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TabStrip
        tabs={tabs}
        activeTabId={activeTab.id}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onNewTab={() => handleNewTab()}
      />

      <CommandBar
        tab={activeTab}
        isBookmarked={isCurrentBookmarked}
        shieldPopoverOpen={shieldPopoverOpen}
        themeMode={settings.themeMode}
        addressInputRef={addressInputRef}
        onNavigate={(input) => navigateTab(activeTab.id, input)}
        onBack={handleBack}
        onForward={handleForward}
        onReload={handleReload}
        onToggleShieldPopover={() => {
          setMemoryPopoverOpen(false);
          setShieldPopoverOpen((prev) => !prev);
        }}
        onToggleReaderMode={() =>
          setTabs((prev) =>
            prev.map((t) =>
              t.id === activeTab.id ? { ...t, readerMode: !t.readerMode } : t
            )
          )
        }
        onToggleBookmark={handleToggleBookmark}
        onNewPrivateTab={() => handleNewTab('neel://newtab', true)}
        onNewTab={() => handleNewTab()}
        onOpenInternal={(route) => navigateTab(activeTab.id, route)}
        onOpenMemoryManager={() => {
          setShieldPopoverOpen(false);
          setMemoryPopoverOpen((prev) => !prev);
        }}
        onChangeTheme={(themeMode) =>
          setSettings((prev) => ({ ...prev, themeMode }))
        }
      />

      <main className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab.url === 'neel://newtab' ? (
          <NewTabView
            searchEngine={settings.defaultSearchEngine}
            haloColor={settings.haloColor || 'sky'}
            onNavigate={(input) => navigateTab(activeTab.id, input)}
          />
        ) : activeIsInternal ? (
          <InternalPages
            route={activeTab.url as InternalRoute}
            settings={settings}
            bookmarks={bookmarks}
            history={history}
            onUpdateSettings={(patch) =>
              setSettings((prev) => ({ ...prev, ...patch }))
            }
            onNavigate={(url) => navigateTab(activeTab.id, url)}
            onRemoveBookmark={(id) =>
              setBookmarks((prev) => prev.filter((b) => b.id !== id))
            }
            onRemoveHistoryItem={(id) =>
              setHistory((prev) => prev.filter((h) => h.id !== id))
            }
            onClearHistory={() => setHistory([])}
            onClearBookmarks={() => setBookmarks([])}
          />
        ) : (
          <WebViewport
            tab={activeTab}
            onWakeTab={handleWakeTab}
            onNavigate={(url, opts) => navigateTab(activeTab.id, url, opts)}
            onBack={handleBack}
            onReload={handleReload}
            onExitReader={() =>
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === activeTab.id ? { ...t, readerMode: false } : t
                )
              )
            }
          />
        )}
      </main>

      {memoryPopoverOpen && (
        <TabMemoryPopover
          tabs={tabs}
          activeTabId={activeTab.id}
          totalRamMb={totalRamMb}
          autoSleepSeconds={settings.autoSleepSeconds}
          onSelectTab={handleSelectTab}
          onSleepTab={handleSleepTab}
          onWakeTab={handleWakeTab}
          onTogglePin={handleTogglePin}
          onCloseTab={handleCloseTab}
          onSleepAllInactive={handleSleepAllInactive}
          onOpenSettings={() => navigateTab(activeTab.id, 'neel://settings')}
          onClose={() => setMemoryPopoverOpen(false)}
        />
      )}

      {shieldPopoverOpen && (
        <ShieldPopover
          tab={activeTab}
          globalTrackerBlocking={settings.trackerBlocking}
          globalHttpsOnly={settings.httpsOnly}
          onToggleSiteShield={handleToggleSiteShield}
          onClose={() => setShieldPopoverOpen(false)}
        />
      )}
    </div>
  );
}
