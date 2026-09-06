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
import { DEFAULT_PREVIEW_IMAGE, parseQuickLinks } from "./site-search/data/quick-links";
import type { SearchLocale } from "./site-search/lib/search/types";

type ImageValue = { src: string; alt?: string };

export interface SiteSearchProps {
  indexUrl?: string;
  locale?: string;
  demoHref?: string;
  contactHref?: string;
  siteHost?: string;
  quickLinksEn?: string;
  quickLinksTr?: string;
  previewImage?: ImageValue;
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

/*
 * Trigger = the same chip as the nav's locale switch (css/components/
 * locale-switch.css v1.3: 2rem tall, #e1e1e1 → #d7d7d7 on hover, 13px/500,
 * .02em, 15px icon, .375rem gap, no border). Same --ls-* custom properties,
 * so whatever the site overrides on [data-locale-switch] applies here too
 * when set on :root / the navbar.
 */
const BTN_CSS = `
:host{all:initial;display:inline-block;font-family:inherit;color:inherit;line-height:0}
*,*::before,*::after{box-sizing:border-box}
.ssb{
  --ls-fg:rgba(23,21,31,.78);--ls-fg-strong:var(--color-text--base,#17151f);
  --ls-bg:#e1e1e1;--ls-bg-hover:#d7d7d7;--ls-border:transparent;--ls-size:2rem;
  display:inline-flex;align-items:center;justify-content:center;gap:.375rem;height:var(--ls-size);padding:0 .5625rem;
  border:1px solid var(--ls-border);border-radius:var(--radius--full,9999px);background:var(--ls-bg);color:var(--ls-fg);
  font-family:var(--font--primary,inherit);font-size:.8125rem;font-weight:var(--font-weight--medium,500);line-height:0;letter-spacing:.02em;
  cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:color .18s ease,background .18s ease,border-color .18s ease}
.ssb:hover{color:var(--ls-fg-strong);background:var(--ls-bg-hover)}
.ssb:focus-visible{outline:2px solid var(--ls-fg-strong);outline-offset:2px}
.ssb>*{flex:0 0 auto;display:flex;align-items:center;justify-content:center;line-height:1}
.ssb svg{width:.9375rem;height:.9375rem;display:block}
.ssb--pill{--ls-bg:var(--surface--light,#eeebf8);--ls-bg-hover:var(--surface--muted,#e6e3f3);--ls-size:2.25rem;padding:0 .875rem;font-size:.875rem}
.ssb--icon{width:var(--ls-size);padding:0}
.ssb kbd{font:inherit;font-size:.625rem;font-weight:600;letter-spacing:.04em;padding:0 .3125rem;height:1.125rem;border-radius:.375rem;background:rgba(255,255,255,.7);color:var(--ls-fg);opacity:.85}
`;

export function SiteSearch({
  indexUrl = "/demos/api/search/index",
  locale = "Auto",
  demoHref = "",
  contactHref = "",
  siteHost = "www.sestek.com",
  quickLinksEn = "",
  quickLinksTr = "",
  previewImage,
  showButton = true,
  buttonLabel = "Search",
  showKbd = false,
  buttonStyle = "Chip",
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
    host.setAttribute("data-lenis-prevent", "");   // Lenis ignores wheel/touch retargeted to this host
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
  const quickText = (loc === "tr" ? quickLinksTr : quickLinksEn).trim();
  const quickLinks = React.useMemo(
    () => (quickText ? parseQuickLinks(quickText, loc, contactHref || undefined) : undefined),
    [quickText, loc, contactHref],
  );
  const pvImage = previewImage && previewImage.src ? previewImage.src : DEFAULT_PREVIEW_IMAGE;

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
        <Palette open={open} onClose={close} indexUrl={indexUrl} locale={loc} demoHref={demo} contactHref={contactHref || undefined} siteHost={siteHost} quickLinks={quickLinks} previewImage={pvImage} />,
        portal,
      )}
    </>
  );
}
