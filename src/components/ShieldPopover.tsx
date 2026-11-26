import React from 'react';
import { ShieldCheck, Lock, AlertTriangle, X, ShieldOff } from 'lucide-react';
import type { BrowserTab } from '../types/browser';
import { formatBytes, getHostname, isInternalUrl } from '../utils/url';

interface ShieldPopoverProps {
  tab: BrowserTab;
  globalTrackerBlocking: boolean;
  globalHttpsOnly: boolean;
  onToggleSiteShield: (tabId: string) => void;
  onClose: () => void;
}

export const ShieldPopover: React.FC<ShieldPopoverProps> = ({
  tab,
  globalTrackerBlocking,
  onToggleSiteShield,
  onClose,
}) => {
  const internal = isInternalUrl(tab.url);
  const host = getHostname(tab.url);
  const shieldEnabled =
    tab.siteTrackerShieldOverride !== null
      ? tab.siteTrackerShieldOverride
      : globalTrackerBlocking;

  const bytesSaved = Math.max(0, tab.rawByteSize - tab.sanitizedByteSize);

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="absolute top-[86px] left-4 sm:left-32 w-[340px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg p-4 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Neel Shield & Security"
      >
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {tab.securityState === 'http-warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : shieldEnabled ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <ShieldOff className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <h2 className="font-display text-sm font-semibold truncate">
                {internal ? 'Neel Browser Internal' : host}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {internal
                ? 'Local built-in page · zero external requests'
                : tab.securityState === 'http-warning'
                  ? 'Unencrypted HTTP connection'
                  : tab.securityState === 'upgraded'
                    ? 'Upgraded automatically to HTTPS'
                    : 'Verified HTTPS connection'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shield panel"
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!internal && (
          <>
            <div className="py-3 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs font-medium">Ad, Tracker &amp; Cosmetic Blocker</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Blocks ad networks, cosmetic ad slots, pixels, and UTM links
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={shieldEnabled}
                onClick={() => onToggleSiteShield(tab.id)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  shieldEnabled
                    ? 'bg-emerald-600'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    shieldEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ads &amp; trackers blocked
                </div>
                <div className="font-mono text-base font-semibold tabular-nums mt-0.5">
                  {tab.blockedCount}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Payload trimmed
                </div>
                <div className="font-mono text-base font-semibold tabular-nums mt-0.5">
                  {formatBytes(bytesSaved)}
                </div>
              </div>
            </div>

            <div className="pt-3 space-y-2 max-h-44 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {tab.securityState === 'http-warning'
                    ? 'HTTPS-Only bypassed for this request'
                    : 'HTTPS-Only enforcement active'}
                </span>
              </div>

              {tab.blockedDomains.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Blocked ad &amp; tracker rules
                  </div>
                  <ul className="space-y-1">
                    {tab.blockedDomains.map((domain) => (
                      <li
                        key={domain}
                        className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate"
                      >
                        {domain}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {tab.strippedParams.length > 0 && (
                <div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                    Stripped tracking parameters
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                    {tab.strippedParams.join(' · ')}
                  </div>
                </div>
              )}

              {tab.blockedDomains.length === 0 && tab.strippedParams.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No third-party trackers detected on this page.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
