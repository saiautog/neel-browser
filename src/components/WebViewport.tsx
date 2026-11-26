import React, { useEffect, useRef } from 'react';
import {
  Moon,
  Play,
  AlertTriangle,
  ArrowLeft,
  RotateCw,
  BookOpen,
  ExternalLink,
} from 'lucide-react';
import type { BrowserTab } from '../types/browser';
import { getHostname } from '../utils/url';

interface WebViewportProps {
  tab: BrowserTab;
  onWakeTab: (tabId: string) => void;
  onNavigate: (url: string, options?: { allowHttp?: boolean }) => void;
  onBack: () => void;
  onReload: () => void;
  onExitReader: () => void;
}

export const WebViewport: React.FC<WebViewportProps> = ({
  tab,
  onWakeTab,
  onNavigate,
  onBack,
  onReload,
  onExitReader,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) {
        return;
      }
      const data = event.data as { type?: string; url?: string } | null;
      if (data && data.type === 'neel:navigate' && typeof data.url === 'string') {
        onNavigate(data.url);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onNavigate]);

  if (tab.isSleeping) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 text-center space-y-4">
          <div className="mx-auto w-11 h-11 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Moon className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Tab Sleeping to Save RAM
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {tab.title} · <span className="font-mono">{getHostname(tab.url)}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              DOM and script timers were released (<span className="font-mono tabular-nums">0 MB</span> active).
            </p>
          </div>
          <button
            type="button"
            onClick={() => onWakeTab(tab.id)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            Wake Tab
          </button>
        </div>
      </div>
    );
  }

  if (tab.isLoading) {
    return (
      <div className="h-full bg-white dark:bg-slate-950 p-8 sm:p-12">
        <div className="max-w-3xl mx-auto space-y-5 animate-pulse">
          <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-2.5 pt-4">
            <div className="h-3.5 w-full rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-3.5 w-11/12 rounded bg-slate-100 dark:bg-slate-900" />
            <div className="h-3.5 w-4/5 rounded bg-slate-100 dark:bg-slate-900" />
          </div>
        </div>
      </div>
    );
  }

  if (tab.protocolWarning) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-lg w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                HTTPS-Only Protection Warning
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Neel Browser attempted to upgrade{' '}
                <span className="font-mono break-all">{tab.protocolWarning.httpFallbackUrl}</span>{' '}
                to HTTPS, but a secure connection could not be verified.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tab.protocolWarning.reason}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Go Back to Safety
            </button>
            <button
              type="button"
              onClick={() =>
                onNavigate(tab.protocolWarning!.httpFallbackUrl, { allowHttp: true })
              }
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Proceed via HTTP Anyway
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tab.errorMessage) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-lg w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Unable to reach {getHostname(tab.url)}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {tab.errorMessage}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onReload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Try Again
            </button>
            <a
              href={/^https?:\/\//i.test(tab.url) ? tab.url : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Directly
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (tab.readerMode && tab.readerArticle) {
    return (
      <div className="h-full overflow-y-auto bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <article className="max-w-[68ch] mx-auto px-6 py-10 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{tab.readerArticle.siteName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {tab.readerArticle.readingTimeMin} min read
              </span>
            </div>
            <button
              type="button"
              onClick={onExitReader}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              Show Full Page
            </button>
          </div>

          <header className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
              {tab.readerArticle.title}
            </h1>
            {tab.readerArticle.byline && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                By {tab.readerArticle.byline}
              </p>
            )}
          </header>

          <div className="space-y-4 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
            {tab.readerArticle.blocks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No long-form article blocks could be extracted from this page. Switch back to full page view to inspect the layout.
              </p>
            ) : (
              tab.readerArticle.blocks.map((block, index) => {
                if (block.type === 'h2') {
                  return (
                    <h2
                      key={index}
                      className="font-display text-xl font-semibold pt-3 text-slate-900 dark:text-slate-100"
                    >
                      {block.text}
                    </h2>
                  );
                }
                if (block.type === 'h3') {
                  return (
                    <h3
                      key={index}
                      className="font-display text-base font-semibold pt-2 text-slate-900 dark:text-slate-100"
                    >
                      {block.text}
                    </h3>
                  );
                }
                if (block.type === 'blockquote') {
                  return (
                    <blockquote
                      key={index}
                      className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 italic"
                    >
                      {block.text}
                    </blockquote>
                  );
                }
                if (block.type === 'li') {
                  return (
                    <p key={index} className="pl-4 text-slate-700 dark:text-slate-300">
                      · {block.text}
                    </p>
                  );
                }
                return <p key={index}>{block.text}</p>;
              })
            )}
          </div>
        </article>
      </div>
    );
  }

  const validYouTubeId =
    tab.youtubeVideoId && /^[a-zA-Z0-9_-]{11}$/.test(tab.youtubeVideoId)
      ? tab.youtubeVideoId
      : null;

  return (
    <div className="h-full w-full flex flex-col bg-white dark:bg-slate-950 overflow-hidden">
      {validYouTubeId && (
        <div className="w-full bg-black shrink-0 flex justify-center border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-4xl aspect-video max-h-[54vh]">
            <iframe
              title={tab.title || 'YouTube Video Player'}
              src={`https://www.youtube-nocookie.com/embed/${validYouTubeId}?rel=0`}
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={tab.title || 'Web content'}
        srcDoc={tab.sanitizedHtml}
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
        className="w-full flex-1 min-h-0 border-0 bg-white"
      />
    </div>
  );
};
