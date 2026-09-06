/*!
 * SiteSearch (Code Component) — ⌘K full-page site search for sestek.com.
 *
 * What the Designer gets: a search TRIGGER (icon + optional label + ⌘K badge)
 * that you drop into the nav, plus the full-page palette it opens. The palette
 * is NOT rendered inside this component's shadow root: the nav autohide uses a
 * transform, which would break position:fixed. Instead it is portalled into a
 * <div> appended to <body> with its own shadow root and the palette's CSS —
 * fully style-isolated from Webflow.
 *
 * Opens on: the trigger click, ⌘K / Ctrl+K, "/" outside inputs, and any
 * existing [data-search-trigger] / [data-search-open] element on the page
 * (so the old nav icon keeps working). Locale from /tr or <html lang>.
 * Results come from the index served by the Webflow Cloud app
 * (GET /demos/api/search/index, see docs/sestek-site-search-server-spec.md);
 * ranking runs client-side. No assistant; empty state = demo + contact CTAs.
 *
 * Engine/palette source of truth: /site-search (copied into src/site-search
 * because the DevLink bundler only sees this package).
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { SiteSearch as Palette, useSearchHotkey } from "./site-search/components/SiteSearch/SiteSearch";
import { SEARCH_CSS } from "./site-search/components/SiteSearch/styles";
import { MESSAGES } from "./site-search/lib/search/messages";
import type { SearchLocale } from "./site-search/lib/search/types";

export interface SiteSearchProps {
  indexUrl?: string;
  locale?: string;
  demoHref?: string;
  contactHref?: string;
  siteHost?: string;
  showButton?: boolean;
  buttonLabel?: string;
  showKbd?: boolean;
  buttonStyle?: string;
  bindPageTriggers?: boolean;
  hotkeys?: boolean;
}

function detectLocale(): SearchLocale {
  if (typeof window === "undefined") return "en";
  if (/^\/tr(\/|$)/.test(location.pathname)) return "tr";
  return (document.documentElement.lang || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

const BTN_CSS = `
.ssb{display:inline-flex;align-items:center;gap:10px;padding:8px 12px;border:0;border-radius:var(--radius--full,999px);background:transparent;color:inherit;font:inherit;font-size:var(--text--sm,.875rem);font-weight:var(--font-weight--medium,500);cursor:pointer;line-height:1;transition:background .2s ease,color .2s ease}
.ssb:hover{background:var(--surface--light,rgba(120,100,220,.10))}
.ssb--pill{background:var(--surface--light,#eeebf8);color:var(--color-text--base,#111);padding:9px 14px}
.ssb--pill:hover{background:var(--surface--muted,#e6e3f3)}
.ssb--icon{padding:8px}
.ssb svg{width:20px;height:20px;flex:none}
.ssb kbd{font:inherit;font-size:11px;font-weight:600;padding:3px 6px;border-radius:6px;border:1px solid var(--border--color-border-page,rgba(0,0,0,.12));background:var(--surface--base,rgba(255,255,255,.6));color:var(--color-text--muted,#777)}
`;

export function SiteSearch({
  indexUrl = "/demos/api/search/index",
  locale = "Auto",
  demoHref = "",
  contactHref = "",
  siteHost = "www.sestek.com",
  showButton = true,
  buttonLabel = "Search",
  showKbd = true,
  buttonStyle = "Icon + label",
  bindPageTriggers = true,
  hotkeys = true,
}: SiteSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [portal, setPortal] = React.useState<HTMLElement | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const loc: SearchLocale = locale === "tr" || locale === "en" ? locale : detectLocale();
  const t = MESSAGES[loc];
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  const openIt = React.useCallback(() => setOpen(true), []);
  /* the trigger lives in this component's shadow root, so the palette's own
     focus restore only reaches the shadow host — refocus the button here */
  const close = React.useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btnRef.current?.focus());
  }, []);

  useSearchHotkey(hotkeys ? toggle : () => {});

  /* palette host on <body>: own shadow root + palette CSS */
  React.useEffect(() => {
    const host = document.createElement("div");
    host.setAttribute("data-site-search-host", "code-component");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = SEARCH_CSS;
    shadow.appendChild(style);
    const mount = document.createElement("div");
    shadow.appendChild(mount);
    setPortal(mount);
    return () => { host.remove(); setPortal(null); };
  }, []);

  /* existing page triggers (old nav icon etc.) */
  React.useEffect(() => {
    if (!bindPageTriggers) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-search-trigger],[data-search-open]"));
    const onClick = (e: Event) => { e.preventDefault(); setOpen(true); };
    els.forEach((el) => { el.addEventListener("click", onClick); el.setAttribute("aria-haspopup", "dialog"); el.setAttribute("aria-controls", "site-search-dialog"); });
    return () => els.forEach((el) => el.removeEventListener("click", onClick));
  }, [bindPageTriggers]);

  React.useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-search-trigger],[data-search-open]").forEach((el) => el.setAttribute("aria-expanded", open ? "true" : "false"));
    (window as unknown as { __sestekSiteSearch?: unknown }).__sestekSiteSearch = { open: openIt, close, toggle, version: "code-component" };
  }, [open, openIt, close, toggle]);

  const demo = demoHref || (loc === "tr" ? "/tr/demo-isteyin" : "/request-a-demo");
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const cls = "ssb" + (buttonStyle === "Pill" ? " ssb--pill" : buttonStyle === "Icon only" ? " ssb--icon" : "");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BTN_CSS }} />
      {showButton && (
        <button ref={btnRef} type="button" className={cls} onClick={openIt} aria-haspopup="dialog" aria-expanded={open} aria-controls="site-search-dialog" aria-label={t.open}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          {buttonStyle !== "Icon only" && <span>{buttonLabel || t.open}</span>}
          {buttonStyle !== "Icon only" && showKbd && <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>}
        </button>
      )}
      {portal && createPortal(
        <Palette open={open} onClose={close} indexUrl={indexUrl} locale={loc} demoHref={demo} contactHref={contactHref || undefined} siteHost={siteHost} />,
        portal,
      )}
    </>
  );
}
