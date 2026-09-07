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
 * [data-site-search-trigger] / [data-site-search-open] element on the page
 * (its OWN attributes — search.js's [data-search-trigger] belongs to the
 * blog/CMS search and must not open this palette)
 * Locale from /tr or <html lang>.
 * Results come from the index served by the Webflow Cloud app
 * (GET /demos/api/search/index, see docs/sestek-site-search-server-spec.md);
 * ranking runs client-side. No assistant; empty state = demo + contact CTAs.
 *
 * Engine/palette source of truth: /site-search (copied into src/site-search
 * because the DevLink bundler only sees this package).
 */

import * as React from "react";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;
import { createPortal } from "react-dom";
import { SiteSearch as Palette, useSearchHotkey } from "./site-search/components/SiteSearch/SiteSearch";
import { SEARCH_CSS } from "./site-search/components/SiteSearch/styles";
import { MESSAGES } from "./site-search/lib/search/messages";
import { parseQuickLinks } from "./site-search/data/quick-links";
import type { SearchLocale } from "./site-search/lib/search/types";

export interface SiteSearchProps {
  indexUrl?: string;
  locale?: string;
  demoHref?: string;
  contactHref?: string;
  siteHost?: string;
  footerText?: string;
  quickLinksEn?: string;
  quickLinksTr?: string;
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
:host{all:initial;display:inline-block;font-family:inherit;color:inherit;line-height:0;vertical-align:middle}
*,*::before,*::after{box-sizing:border-box}
.ssb{
  --ls-fg:rgba(23,21,31,.78);--ls-fg-strong:var(--color-text--base,#17151f);
  --ls-bg:#e1e1e1;--ls-bg-hover:#d7d7d7;--ls-border:transparent;--ls-size:2rem;
  --ssb-pad:.5625rem;--ssb-gap:.375rem;--ssb-fs:.8125rem;--ssb-fw:var(--font-weight--medium,500);--ssb-ls:.02em;--ssb-icon:.9375rem;--ssb-radius:var(--radius--full,9999px);
  display:inline-flex;align-items:center;justify-content:center;gap:var(--ssb-gap);height:var(--ls-size);padding:0 var(--ssb-pad);margin:0;
  border:1px solid var(--ls-border);border-radius:var(--ssb-radius);background:var(--ls-bg);color:var(--ls-fg);
  font-family:var(--ssb-font,var(--font--primary,inherit));font-size:var(--ssb-fs);font-weight:var(--ssb-fw);line-height:0;letter-spacing:var(--ssb-ls);
  cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:color .18s ease,background .18s ease,border-color .18s ease}
.ssb:hover{color:var(--ls-fg-strong);background:var(--ls-bg-hover)}
.ssb:focus-visible{outline:2px solid var(--ls-fg-strong);outline-offset:2px}
.ssb>*{flex:0 0 auto;display:flex;align-items:center;justify-content:center;line-height:1}
.ssb svg{width:var(--ssb-icon);height:var(--ssb-icon);display:block}
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
  footerText = "SESTEK",
  quickLinksEn = "",
  quickLinksTr = "",
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
  /* locale + platform are resolved in effects (never in render) so the chip can be server-rendered */
  const forced: SearchLocale | null = locale === "tr" || locale === "en" ? locale : null;
  const [detected, setDetected] = React.useState<SearchLocale>("en");
  const [isMac, setIsMac] = React.useState(false);
  React.useEffect(() => { setDetected(detectLocale()); setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  const loc: SearchLocale = forced || detected;
  const t = MESSAGES[loc];
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  const openIt = React.useCallback(() => setOpen(true), []);
  /* the trigger lives in this component's shadow root, so the palette's own
     focus restore only reaches the shadow host — refocus the button here */
  const close = React.useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btnRef.current?.focus());
  }, []);

  const noop = React.useCallback(() => {}, []);
  useSearchHotkey(hotkeys ? toggle : noop);

  /* Chip = EXACTLY the nav's locale switch. The defaults above mirror
     locale-switch.css, but the site may override --ls-* / the trigger in
     Webflow — so measure the real .locale-switch__trigger on the page and copy
     its computed box, type and colours onto the button (re-measured once the
     fonts land). Pill / Icon only keep their own sizes. */
  const [sync, setSync] = React.useState<React.CSSProperties | null>(null);
  useIsoLayoutEffect(() => {
    if (buttonStyle === "Pill" || buttonStyle === "Icon only") { setSync(null); return; }
    const measure = () => {
      const root = document.querySelector<HTMLElement>("[data-locale-switch]");
      const el = document.querySelector<HTMLElement>(".locale-switch__trigger");
      if (!el) return;
      const cs = getComputedStyle(el);
      const svg = el.querySelector("svg, img");
      const icon = svg ? getComputedStyle(svg).width : "";
      const hover = root ? getComputedStyle(root).getPropertyValue("--ls-bg-hover").trim() : "";
      const strong = root ? getComputedStyle(root).getPropertyValue("--ls-fg-strong").trim() : "";
      const v: Record<string, string> = {
        "--ls-size": cs.height, "--ssb-pad": cs.paddingLeft, "--ssb-gap": cs.columnGap !== "normal" ? cs.columnGap : cs.gap,
        "--ssb-fs": cs.fontSize, "--ssb-fw": cs.fontWeight, "--ssb-ls": cs.letterSpacing === "normal" ? "0" : cs.letterSpacing,
        "--ssb-font": cs.fontFamily, "--ssb-radius": cs.borderTopLeftRadius,
        "--ls-bg": cs.backgroundColor, "--ls-fg": cs.color, "--ls-border": cs.borderTopColor,
      };
      if (icon) v["--ssb-icon"] = icon;
      if (hover) v["--ls-bg-hover"] = hover;
      if (strong) v["--ls-fg-strong"] = strong;
      setSync(v as React.CSSProperties);
    };
    measure();                                             // before first paint — one measure, no visible re-style
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown>; status?: string } }).fonts;
    if (fonts && fonts.ready && fonts.status !== "loaded") fonts.ready.then(measure);
  }, [buttonStyle]);

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
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-site-search-trigger],[data-site-search-open]"));
    const onClick = (e: Event) => { e.preventDefault(); setOpen(true); };
    els.forEach((el) => { el.addEventListener("click", onClick); el.setAttribute("aria-haspopup", "dialog"); el.setAttribute("aria-controls", "site-search-dialog"); });
    return () => els.forEach((el) => el.removeEventListener("click", onClick));
  }, [bindPageTriggers]);

  React.useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-site-search-trigger],[data-site-search-open]").forEach((el) => el.setAttribute("aria-expanded", open ? "true" : "false"));
    (window as unknown as { __sestekSiteSearch?: unknown }).__sestekSiteSearch = { open: openIt, close, toggle, version: "code-component" };
  }, [open, openIt, close, toggle]);

  const demo = demoHref || (loc === "tr" ? "/tr/demo-isteyin" : "/request-a-demo");
  const cls = "ssb" + (buttonStyle === "Pill" ? " ssb--pill" : buttonStyle === "Icon only" ? " ssb--icon" : "");
  const quickText = (loc === "tr" ? quickLinksTr : quickLinksEn).trim();
  const quickLinks = React.useMemo(
    () => (quickText ? parseQuickLinks(quickText, loc, contactHref || undefined) : undefined),
    [quickText, loc, contactHref],
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: BTN_CSS }} />
      {showButton && (
        <button ref={btnRef} type="button" className={cls} style={sync || undefined} onClick={openIt} aria-haspopup="dialog" aria-expanded={open} aria-controls="site-search-dialog" aria-label={t.open}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          {buttonStyle !== "Icon only" && <span>{buttonLabel || t.open}</span>}
          {buttonStyle !== "Icon only" && showKbd && <kbd>{isMac ? "⌘" : "Ctrl"} K</kbd>}
        </button>
      )}
      {portal && createPortal(
        <Palette open={open} onClose={close} indexUrl={indexUrl} locale={loc} demoHref={demo} contactHref={contactHref || undefined} siteHost={siteHost} footerText={footerText} quickLinks={quickLinks} />,
        portal,
      )}
    </>
  );
}
