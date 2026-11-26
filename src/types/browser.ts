export type ThemeMode = 'system' | 'light' | 'dark';

export type SearchEngineId = 'duckduckgo' | 'startpage' | 'google' | 'bing';

export type HaloColorId = 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';

export type SecurityState = 'internal' | 'https' | 'upgraded' | 'http-warning' | 'error';

export type InternalRoute =
  | 'neel://newtab'
  | 'neel://settings'
  | 'neel://bookmarks'
  | 'neel://history';

export interface ReaderBlock {
  type: 'h2' | 'h3' | 'p' | 'blockquote' | 'li';
  text: string;
}

export interface ReaderArticle {
  title: string;
  byline: string;
  siteName: string;
  readingTimeMin: number;
  blocks: ReaderBlock[];
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  faviconUrl: string;
  historyStack: string[];
  historyIndex: number;
  isLoading: boolean;
  isSleeping: boolean;
  isPinned: boolean;
  isPrivate: boolean;
  lastActiveAt: number;
  estimatedRamMb: number;
  securityState: SecurityState;
  blockedCount: number;
  blockedDomains: string[];
  strippedParams: string[];
  readerMode: boolean;
  sanitizedHtml: string;
  youtubeVideoId?: string | null;
  readerArticle: ReaderArticle | null;
  rawByteSize: number;
  sanitizedByteSize: number;
  errorMessage: string | null;
  protocolWarning: {
    attemptedUrl: string;
    httpFallbackUrl: string;
    reason: string;
  } | null;
  siteTrackerShieldOverride: boolean | null;
}

export interface BrowserSettings {
  themeMode: ThemeMode;
  haloColor: HaloColorId;
  httpsOnly: boolean;
  trackerBlocking: boolean;
  autoSleepSeconds: number; // 0 means disabled
  defaultSearchEngine: SearchEngineId;
}

export interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitedAt: number;
  blockedCount: number;
}
