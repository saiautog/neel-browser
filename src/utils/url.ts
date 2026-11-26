import type { HaloColorId, InternalRoute, SearchEngineId } from '../types/browser';

export const HALO_COLORS: Record<
  HaloColorId,
  {
    label: string;
    swatchClass: string;
    glowClass: string;
    moteClass: string;
    borderFocusClass: string;
  }
> = {
  sky: {
    label: 'Sky Blue',
    swatchClass: 'bg-sky-400',
    glowClass: 'from-sky-300 via-sky-400 to-blue-400',
    moteClass: 'bg-sky-400/70 dark:bg-sky-300/70',
    borderFocusClass: 'focus-within:border-sky-400 dark:focus-within:border-sky-400',
  },
  indigo: {
    label: 'Indigo',
    swatchClass: 'bg-indigo-500',
    glowClass: 'from-indigo-300 via-blue-400 to-indigo-500',
    moteClass: 'bg-indigo-400/70 dark:bg-indigo-300/70',
    borderFocusClass: 'focus-within:border-indigo-400 dark:focus-within:border-indigo-400',
  },
  emerald: {
    label: 'Mint',
    swatchClass: 'bg-emerald-400',
    glowClass: 'from-emerald-300 via-teal-400 to-cyan-400',
    moteClass: 'bg-emerald-400/70 dark:bg-emerald-300/70',
    borderFocusClass: 'focus-within:border-emerald-400 dark:focus-within:border-emerald-400',
  },
  amber: {
    label: 'Amber',
    swatchClass: 'bg-amber-400',
    glowClass: 'from-amber-200 via-amber-400 to-orange-400',
    moteClass: 'bg-amber-400/70 dark:bg-amber-300/70',
    borderFocusClass: 'focus-within:border-amber-400 dark:focus-within:border-amber-400',
  },
  rose: {
    label: 'Rose',
    swatchClass: 'bg-rose-400',
    glowClass: 'from-rose-300 via-pink-400 to-rose-400',
    moteClass: 'bg-rose-400/70 dark:bg-rose-300/70',
    borderFocusClass: 'focus-within:border-rose-400 dark:focus-within:border-rose-400',
  },
  slate: {
    label: 'Silver',
    swatchClass: 'bg-slate-400',
    glowClass: 'from-slate-300 via-slate-400 to-zinc-400',
    moteClass: 'bg-slate-400/70 dark:bg-slate-300/70',
    borderFocusClass: 'focus-within:border-slate-400 dark:focus-within:border-slate-400',
  },
};

export const SEARCH_ENGINES: Record<
  SearchEngineId,
  { label: string; buildUrl: (query: string) => string; domain: string }
> = {
  duckduckgo: {
    label: 'DuckDuckGo',
    domain: 'html.duckduckgo.com',
    buildUrl: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
  },
  startpage: {
    label: 'Startpage',
    domain: 'www.startpage.com',
    buildUrl: (q) => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}`,
  },
  google: {
    label: 'Google',
    domain: 'www.google.com',
    buildUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  bing: {
    label: 'Bing',
    domain: 'www.bing.com',
    buildUrl: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
};

export interface QuickLinkItem {
  title: string;
  subtitle: string;
  url: string;
}

export const QUICK_LINKS: QuickLinkItem[] = [
  {
    title: 'Wikipedia',
    subtitle: 'en.wikipedia.org',
    url: 'https://en.wikipedia.org/wiki/Web_browser',
  },
  {
    title: 'Hacker News',
    subtitle: 'news.ycombinator.com',
    url: 'https://news.ycombinator.com/',
  },
  {
    title: 'MDN Web Docs',
    subtitle: 'developer.mozilla.org',
    url: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
  },
  {
    title: 'NPR Text',
    subtitle: 'text.npr.org',
    url: 'https://text.npr.org/',
  },
  {
    title: 'Rust Lang',
    subtitle: 'www.rust-lang.org',
    url: 'https://www.rust-lang.org/',
  },
];

const INTERNAL_ROUTES = new Set<string>([
  'neel://newtab',
  'neel://settings',
  'neel://bookmarks',
  'neel://history',
]);

export function isInternalUrl(url: string): url is InternalRoute {
  return INTERNAL_ROUTES.has(url.trim().toLowerCase());
}

export function getInternalTitle(url: InternalRoute): string {
  switch (url) {
    case 'neel://newtab':
      return 'New Tab';
    case 'neel://settings':
      return 'Settings';
    case 'neel://bookmarks':
      return 'Bookmarks';
    case 'neel://history':
      return 'History';
  }
}

export function resolveAddressInput(
  rawInput: string,
  searchEngine: SearchEngineId,
  httpsOnly: boolean
): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return 'neel://newtab';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('neel://')) {
    const normalized = lower.replace(/\/+$/, '');
    if (INTERNAL_ROUTES.has(normalized)) {
      return normalized;
    }
    return 'neel://newtab';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Domain-like input (contains a dot, no spaces, valid host characters)
  if (!/\s/.test(trimmed) && /^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+([/:?#].*)?$/.test(trimmed)) {
    return `${httpsOnly ? 'https' : 'http'}://${trimmed}`;
  }

  return SEARCH_ENGINES[searchEngine].buildUrl(trimmed);
}

export function getHostname(url: string): string {
  if (isInternalUrl(url)) return url;
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(timestamp).toLocaleDateString();
}
