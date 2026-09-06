/*
 * embed.tsx — IIFE entry for the live Webflow site.
 *
 *   <script defer src="https://www.sestek.com/demos/site-search.v1.js"></script>
 *
 * Mounts the palette into a shadow root on a <div> appended to <body>
 * (style isolation from Webflow CSS; never inside the nav, whose autohide
 * transform would break position:fixed), binds ⌘K / Ctrl+K / "/" and every
 * [data-search-trigger] / [data-search-open] element, and exposes
 * window.__sestekSiteSearch = { open, close, toggle, version }.
 *
 * Optional config via data attributes on the script tag:
 *   data-index="/demos/api/search/index"   index URL (default: script origin + /demos/api/search/index)
 *   data-demo="/request-a-demo"            empty-state primary CTA
 *   data-contact="/contact"                empty-state secondary CTA
 *   data-locale="en|tr"                    override auto-detection (/tr path or <html lang>)
 *   data-host="www.sestek.com"             host shown in the preview column
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import { SiteSearch, useSearchHotkey } from "./SiteSearch";
import { SEARCH_CSS } from "./styles";
import type { SearchLocale } from "../../lib/search/types";

declare const __SEARCH_VERSION__: string;
const VERSION = typeof __SEARCH_VERSION__ !== "undefined" ? __SEARCH_VERSION__ : "dev";

function detectLocale(): SearchLocale {
  if (/^\/tr(\/|$)/.test(location.pathname)) return "tr";
  return (document.documentElement.lang || "").toLowerCase().startsWith("tr") ? "tr" : "en";
}

type Cfg = { indexUrl: string; demo: string; contact?: string; locale: SearchLocale; host: string };

function App({ cfg }: { cfg: Cfg }) {
  const [open, setOpen] = React.useState(false);
  const toggle = React.useCallback(() => setOpen((o) => !o), []);
  useSearchHotkey(toggle);
  React.useEffect(() => {
    (window as unknown as { __sestekSiteSearch: unknown }).__sestekSiteSearch = { open: () => setOpen(true), close: () => setOpen(false), toggle, version: VERSION };
    const triggers = Array.from(document.querySelectorAll<HTMLElement>("[data-search-open],[data-search-trigger]"));
    const onClick = (e: Event) => { e.preventDefault(); setOpen(true); };
    triggers.forEach((el) => { el.addEventListener("click", onClick); el.setAttribute("aria-haspopup", "dialog"); el.setAttribute("aria-controls", "site-search-dialog"); });
    return () => triggers.forEach((el) => el.removeEventListener("click", onClick));
  }, [toggle]);
  React.useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-search-open],[data-search-trigger]").forEach((el) => el.setAttribute("aria-expanded", open ? "true" : "false"));
  }, [open]);
  return <SiteSearch open={open} onClose={() => setOpen(false)} indexUrl={cfg.indexUrl} locale={cfg.locale} demoHref={cfg.demo} contactHref={cfg.contact} siteHost={cfg.host} />;
}

function boot() {
  if ((window as unknown as { __sestekSiteSearch?: unknown }).__sestekSiteSearch) return;
  const script = (document.currentScript as HTMLScriptElement | null) || Array.from(document.scripts).find((s) => /site-search/.test(s.src)) || null;
  const ds = script?.dataset || {};
  const origin = (() => { try { return script ? new URL(script.src).origin : location.origin; } catch { return location.origin; } })();
  const locale = (ds.locale as SearchLocale) || detectLocale();
  const cfg: Cfg = {
    indexUrl: ds.index || origin + "/demos/api/search/index",
    demo: ds.demo || (locale === "tr" ? "/tr/demo-isteyin" : "/request-a-demo"),
    contact: ds.contact,
    locale,
    host: ds.host || (origin.replace(/^https?:\/\//, "") || "www.sestek.com"),
  };
  const host = document.createElement("div");
  host.setAttribute("data-site-search-host", VERSION);
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = SEARCH_CSS;
  shadow.appendChild(style);
  const mount = document.createElement("div");
  shadow.appendChild(mount);
  createRoot(mount).render(<App cfg={cfg} />);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
