#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};
use url::Url;

const TRACKER_DOMAINS: &[&str] = &[
    // Analytics & Telemetry
    "google-analytics.com",
    "googletagmanager.com",
    "connect.facebook.net",
    "pixel.facebook.com",
    "hotjar.com",
    "segment.io",
    "segment.com",
    "mixpanel.com",
    "amplitude.com",
    "scorecardresearch.com",
    "quantserve.com",
    "clarity.ms",
    "fullstory.com",
    "newrelic.com",
    "nr-data.net",
    "analytics.tiktok.com",
    "bat.bing.com",
    "chartbeat.com",
    "optimizely.com",
    "heapanalytics.com",
    "hubspot.com",
    "hs-analytics.net",
    "matomo.cloud",
    "plausible.io",
    "mouseflow.com",
    "crazyegg.com",
    "luckyorange.com",
    // Ad Networks & Programmatic Exchanges
    "doubleclick.net",
    "googlesyndication.com",
    "pagead2.googlesyndication.com",
    "googleadservices.com",
    "adservice.google.com",
    "adnxs.com",
    "pubmatic.com",
    "rubiconproject.com",
    "openx.net",
    "casalemedia.com",
    "criteo.com",
    "criteo.net",
    "taboola.com",
    "outbrain.com",
    "revcontent.com",
    "mgid.com",
    "zergnet.com",
    "amazon-adsystem.com",
    "ads.yahoo.com",
    "advertising.com",
    "media.net",
    "sharethrough.com",
    "triplelift.com",
    "smartadserver.com",
    "bidswitch.net",
    "adsrvr.org",
    "demdex.net",
    "krxd.net",
    "bluekai.com",
    "moatads.com",
    "doubleverify.com",
    "adsafeprotected.com",
    "ads-twitter.com",
    "ads.linkedin.com",
    "ads.pinterest.com",
    "popads.net",
    "propellerads.com",
    "adsterra.com",
    "exoclick.com",
    "juicyads.com",
];

const COSMETIC_AD_SELECTORS: &[&str] = &[
    "ins.adsbygoogle",
    "amp-ad",
    "amp-embed",
    "amp-sticky-ad",
    "[id^=\"div-gpt-ad\"]",
    "[id^=\"google_ads_iframe\"]",
    "[id^=\"taboola-\"]",
    "[data-ad-slot]",
    "[data-ad-client]",
    "[data-ad-unit]",
    "[data-google-query-id]",
    "[data-ad-region]",
    "[aria-label=\"Advertisement\"]",
    "[aria-label=\"Sponsored\"]",
    ".adsbygoogle",
    ".ad-banner",
    ".ad-container",
    ".ad-wrapper",
    ".ad-slot",
    ".ad-unit",
    ".ad-box",
    ".ad-leaderboard",
    ".ad-sidebar",
    ".ad-placeholder",
    ".advertisement",
    ".sponsored-content",
    ".sponsored-post",
    ".sponsored-card",
    ".promoted-link",
    ".taboola-widget",
    ".OUTBRAIN",
    "#ad-banner",
    "#ad-header",
    "#ad-footer",
    "#ad-sidebar",
    "#ad_banner",
    "#ad_container",
    "#google_ads_frame",
    "#taboola-below-article-thumbnails",
    "ytd-ad-slot-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-in-feed-ad-layout-renderer",
    ".ytp-ad-module",
    ".ytp-ad-overlay-container",
    "#player-ads",
];

const TRACKING_QUERY_PARAMS: &[&str] = &[
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "fbclid",
    "gclid",
    "dclid",
    "msclkid",
    "mc_cid",
    "mc_eid",
    "igshid",
    "ref_src",
    "yclid",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NativeTabRecord {
    pub id: String,
    pub url: String,
    pub is_sleeping: bool,
    pub is_pinned: bool,
    pub blocked_count: u32,
}

#[derive(Default)]
pub struct BrowserCoreState {
    pub tabs: Mutex<HashMap<String, NativeTabRecord>>,
    pub https_only: Mutex<bool>,
    pub tracker_blocking: Mutex<bool>,
}

#[derive(Serialize)]
pub struct SanitizedUrlResult {
    pub url: String,
    pub upgraded_https: bool,
    pub stripped_params: Vec<String>,
    pub blocked_tracker_host: Option<String>,
}

#[derive(Serialize)]
pub struct MemoryBudgetSummary {
    pub active_tabs: usize,
    pub sleeping_tabs: usize,
    pub estimated_process_ram_mb: u32,
}

fn is_tracker_host(host: &str) -> bool {
    let lower = host.to_ascii_lowercase();
    TRACKER_DOMAINS
        .iter()
        .any(|tracker| lower == *tracker || lower.ends_with(&format!(".{tracker}")))
}

#[tauri::command]
fn sanitize_navigation_url(
    raw_url: String,
    state: State<BrowserCoreState>,
) -> Result<SanitizedUrlResult, String> {
    let mut parsed = Url::parse(&raw_url).map_err(|e| format!("Invalid URL: {e}"))?;
    let https_only = *state.https_only.lock().map_err(|_| "State lock poisoned")?;
    let tracker_blocking = *state
        .tracker_blocking
        .lock()
        .map_err(|_| "State lock poisoned")?;

    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("Only http and https URLs are permitted".to_string());
    }

    let host = parsed.host_str().unwrap_or_default().to_string();
    if tracker_blocking && is_tracker_host(&host) {
        return Ok(SanitizedUrlResult {
            url: parsed.to_string(),
            upgraded_https: false,
            stripped_params: vec![],
            blocked_tracker_host: Some(host),
        });
    }

    let mut upgraded_https = false;
    if https_only && parsed.scheme() == "http" {
        let _ = parsed.set_scheme("https");
        upgraded_https = true;
    }

    let mut stripped_params = Vec::new();
    let kept_pairs: Vec<(String, String)> = parsed
        .query_pairs()
        .filter(|(k, _)| {
            let is_tracker = TRACKING_QUERY_PARAMS
                .iter()
                .any(|p| p.eq_ignore_ascii_case(k.as_ref()));
            if is_tracker {
                stripped_params.push(k.to_string());
            }
            !is_tracker
        })
        .map(|(k, v)| (k.into_owned(), v.into_owned()))
        .collect();

    if !stripped_params.is_empty() {
        if kept_pairs.is_empty() {
            parsed.set_query(None);
        } else {
            let mut serializer = parsed.query_pairs_mut();
            serializer.clear();
            for (k, v) in kept_pairs {
                serializer.append_pair(&k, &v);
            }
        }
    }

    Ok(SanitizedUrlResult {
        url: parsed.to_string(),
        upgraded_https,
        stripped_params,
        blocked_tracker_host: None,
    })
}

#[tauri::command]
fn sleep_tab(
    app: AppHandle,
    tab_id: String,
    state: State<BrowserCoreState>,
) -> Result<MemoryBudgetSummary, String> {
    if let Some(webview) = app.get_webview(&format!("tab-{tab_id}")) {
        let _ = webview.close();
    }

    let mut tabs = state.tabs.lock().map_err(|_| "State lock poisoned")?;
    if let Some(tab) = tabs.get_mut(&tab_id) {
        if !tab.is_pinned {
            tab.is_sleeping = true;
        }
    }

    let active_tabs = tabs.values().filter(|t| !t.is_sleeping).count();
    let sleeping_tabs = tabs.values().filter(|t| t.is_sleeping).count();

    Ok(MemoryBudgetSummary {
        active_tabs,
        sleeping_tabs,
        estimated_process_ram_mb: 38 + (active_tabs as u32 * 22),
    })
}

#[tauri::command]
fn wake_tab(tab_id: String, state: State<BrowserCoreState>) -> Result<MemoryBudgetSummary, String> {
    let mut tabs = state.tabs.lock().map_err(|_| "State lock poisoned")?;
    if let Some(tab) = tabs.get_mut(&tab_id) {
        tab.is_sleeping = false;
    }

    let active_tabs = tabs.values().filter(|t| !t.is_sleeping).count();
    let sleeping_tabs = tabs.values().filter(|t| t.is_sleeping).count();

    Ok(MemoryBudgetSummary {
        active_tabs,
        sleeping_tabs,
        estimated_process_ram_mb: 38 + (active_tabs as u32 * 22),
    })
}

fn build_native_blocker_init_script() -> String {
    let domains_json = serde_json::to_string(TRACKER_DOMAINS).unwrap_or_else(|_| "[]".to_string());
    let selectors_json =
        serde_json::to_string(COSMETIC_AD_SELECTORS).unwrap_or_else(|_| "[]".to_string());
    format!(
        r#"(function() {{
  if (window.__neelNativeBlockerInstalled) return;
  window.__neelNativeBlockerInstalled = true;
  var BLOCKED = {domains_json};
  var SELECTORS = {selectors_json};

  function isBlockedUrl(raw) {{
    try {{
      var u = new URL(String(raw || ''), location.href);
      var host = u.hostname.toLowerCase();
      for (var i = 0; i < BLOCKED.length; i++) {{
        var d = BLOCKED[i];
        if (host === d || host.endsWith('.' + d)) return true;
      }}
      if (u.pathname.indexOf('/pagead/') !== -1 || u.pathname.indexOf('/aclk') === 0) return true;
    }} catch (e) {{}}
    return false;
  }}

  // 1. Document-start cosmetic CSS injection
  var css = SELECTORS.join(',') + '{{display:none !important;visibility:hidden !important;height:0 !important;min-height:0 !important;margin:0 !important;padding:0 !important;overflow:hidden !important;}}';
  function injectStyle() {{
    var target = document.head || document.documentElement;
    if (!target || document.getElementById('__neel_cosmetic_style')) return;
    var st = document.createElement('style');
    st.id = '__neel_cosmetic_style';
    st.textContent = css;
    target.appendChild(st);
  }}
  injectStyle();

  // 2. Native sub-resource network interception (fetch, XHR, sendBeacon)
  if (typeof window.fetch === 'function') {{
    var origFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {{
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url && isBlockedUrl(url)) {{
        return Promise.resolve(new Response('', {{ status: 204, statusText: 'Blocked by Neel Shield' }}));
      }}
      return origFetch(input, init);
    }};
  }}

  if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {{
    var origOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function(method, url) {{
      if (url && isBlockedUrl(url)) {{
        this.__neelBlocked = true;
        return;
      }}
      return origOpen.apply(this, arguments);
    }};
    var origSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function() {{
      if (this.__neelBlocked) return;
      return origSend.apply(this, arguments);
    }};
  }}

  if (navigator && typeof navigator.sendBeacon === 'function') {{
    var origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {{
      if (url && isBlockedUrl(url)) return true;
      return origBeacon(url, data);
    }};
  }}

  // 3. DOM MutationObserver for dynamic scripts, iframes, and cosmetic ad containers
  var combinedSelector = SELECTORS.join(',');
  function scrubNode(node) {{
    if (!node || node.nodeType !== 1) return;
    var tag = node.tagName ? node.tagName.toLowerCase() : '';
    if (tag === 'script' || tag === 'iframe' || tag === 'img' || tag === 'link') {{
      var src = node.getAttribute('src') || node.getAttribute('href') || '';
      if (src && isBlockedUrl(src)) {{
        node.remove();
        return;
      }}
    }}
    if (combinedSelector && node.matches && node.matches(combinedSelector)) {{
      if (tag !== 'html' && tag !== 'head' && tag !== 'body' && tag !== 'main' && tag !== 'article') {{
        node.remove();
        return;
      }}
    }}
    if (combinedSelector && node.querySelectorAll) {{
      var nested = node.querySelectorAll(combinedSelector);
      for (var i = 0; i < nested.length; i++) {{
        var nt = nested[i].tagName ? nested[i].tagName.toLowerCase() : '';
        if (nt !== 'html' && nt !== 'head' && nt !== 'body' && nt !== 'main' && nt !== 'article') {{
          nested[i].remove();
        }}
      }}
    }}
  }}

  var observer = new MutationObserver(function(mutations) {{
    injectStyle();
    for (var i = 0; i < mutations.length; i++) {{
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {{
        scrubNode(added[j]);
      }}
    }}
  }});

  if (document.documentElement) {{
    observer.observe(document.documentElement, {{ childList: true, subtree: true }});
  }} else {{
    document.addEventListener('DOMContentLoaded', function() {{
      injectStyle();
      observer.observe(document.documentElement, {{ childList: true, subtree: true }});
    }});
  }}
}})();"#
    )
}

#[tauri::command]
fn set_privacy_settings(
    https_only: bool,
    tracker_blocking: bool,
    state: State<BrowserCoreState>,
) -> Result<(), String> {
    *state.https_only.lock().map_err(|_| "State lock poisoned")? = https_only;
    *state
        .tracker_blocking
        .lock()
        .map_err(|_| "State lock poisoned")? = tracker_blocking;
    Ok(())
}

#[tauri::command]
fn open_native_tab(
    app: AppHandle,
    tab_id: String,
    raw_url: String,
    state: State<BrowserCoreState>,
) -> Result<SanitizedUrlResult, String> {
    let tracker_blocking_enabled = *state
        .tracker_blocking
        .lock()
        .map_err(|_| "State lock poisoned")?;
    let sanitized = sanitize_navigation_url(raw_url, state)?;
    let parsed = Url::parse(&sanitized.url).map_err(|e| format!("Invalid URL: {e}"))?;
    let safe_label: String = tab_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .take(36)
        .collect();
    let label = format!("neel-view-{}", if safe_label.is_empty() { "tab" } else { &safe_label });

    if let Some(existing) = app.get_webview_window(&label) {
        let _ = existing.navigate(parsed.clone());
        let _ = existing.set_focus();
    } else {
        let title = parsed.host_str().unwrap_or("Neel Browser").to_string();
        let mut builder =
            tauri::WebviewWindowBuilder::new(&app, &label, tauri::WebviewUrl::External(parsed))
                .title(format!("{title} — Neel Browser"))
                .inner_size(1200.0, 800.0)
                .on_navigation(move |nav_url| {
                    let scheme = nav_url.scheme();
                    if scheme != "http" && scheme != "https" {
                        return false;
                    }
                    if tracker_blocking_enabled {
                        if let Some(host) = nav_url.host_str() {
                            if is_tracker_host(host) {
                                return false;
                            }
                        }
                    }
                    true
                });

        if tracker_blocking_enabled {
            let blocker_script = build_native_blocker_init_script();
            builder = builder.initialization_script(&blocker_script);
        }

        builder
            .build()
            .map_err(|e| format!("Unable to open native window: {e}"))?;
    }

    Ok(sanitized)
}

fn main() {
    let initial_state = BrowserCoreState {
        tabs: Mutex::new(HashMap::new()),
        https_only: Mutex::new(true),
        tracker_blocking: Mutex::new(true),
    };

    tauri::Builder::default()
        .manage(initial_state)
        .invoke_handler(tauri::generate_handler![
            sanitize_navigation_url,
            set_privacy_settings,
            open_native_tab,
            sleep_tab,
            wake_tab
        ])
        .run(tauri::generate_context!())
        .expect("Failed to start Neel Browser native shell");
}
