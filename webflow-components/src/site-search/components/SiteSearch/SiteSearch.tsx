/*
 * <SiteSearch/> — full-page ⌘K search for sestek.com.
 *
 * Header (eyebrow + big search bar), two-column body (results list · text
 * preview of the active result with an "Open page" button, no image), footer with
 * keyboard hints. Accessible dialog + combobox/listbox: focus trap, Esc
 * closes, focus restored to the opener, ↑/↓/Home/End move, Enter navigates,
 * ⌘K / Ctrl+K toggle globally (see useSearchHotkey). Results are ranked
 * client-side from the index fetched once via useSearch().
 *
 * Styling: SEARCH_CSS is injected by whoever mounts this (the embed puts it
 * in a shadow root; the app renders it inline through `inlineCss`).
 * No assistant / chatbot: the empty state offers "Request a demo" + "Contact".
 */

import * as React from "react";
import { MESSAGES } from "../../lib/search/messages";
import type { RankedDoc, SearchDoc, SearchLocale } from "../../lib/search/types";
import { defaultQuickLinks, type QuickGroup } from "../../data/quick-links";
import { useSearch } from "./useSearch";

export interface SiteSearchProps {
  open: boolean;
  onClose: () => void;
  indexUrl: string;
  locale?: SearchLocale;
  /** Empty-state CTAs */
  demoHref?: string;
  contactHref?: string;
  /** Shown in the preview column under the title, e.g. "www.sestek.com" */
  siteHost?: string;
  /** Idle-state groups (before typing). Default: curated hub pages per locale. */
  quickLinks?: QuickGroup[];
  /** Called instead of location.assign when set (e.g. SPA router) */
  onNavigate?: (doc: SearchDoc) => void;
  /** Render <style>{css}</style> inside the component (app surface). */
  inlineCss?: string;
}

const KIND_ABBR: Record<string, string> = { product: "PR", solution: "SOL", "case-study": "CS", blog: "BL", resource: "RES", career: "JOB", page: "PG" };
const ARROW = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12 12 4M6 4h6v6" /></svg>;

function Highlight({ doc }: { doc: RankedDoc | SearchDoc }) {
  const m = (doc as RankedDoc).titleMatches;
  if (!m || !m.length) return <>{doc.title}</>;
  const out: React.ReactNode[] = [];
  let i = 0;
  m.forEach(([a, b], k) => {
    if (a > i) out.push(doc.title.slice(i, a));
    out.push(<mark key={k}>{doc.title.slice(a, b)}</mark>);
    i = b;
  });
  if (i < doc.title.length) out.push(doc.title.slice(i));
  return <>{out}</>;
}

export function SiteSearch({ open, onClose, indexUrl, locale = "en", demoHref, contactHref, siteHost = "www.sestek.com", quickLinks, onNavigate, inlineCss }: SiteSearchProps) {
  const t = MESSAGES[locale] || MESSAGES.en;
  const { query, setQuery, debounced, results, status, load } = useSearch({ indexUrl, locale });
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const openerRef = React.useRef<Element | null>(null);

  const groups = React.useMemo<QuickGroup[]>(
    () => (quickLinks && quickLinks.length ? quickLinks : defaultQuickLinks(locale, contactHref)),
    [quickLinks, locale, contactHref],
  );
  const quick = React.useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const searching = debounced.trim().length > 0;
  /* idle: curated groups (index not needed); typing: ranked index results */
  const showing: SearchDoc[] = searching ? results : quick;
  const isEmpty = status === "ready" && searching && results.length === 0;
  const current = showing[Math.min(active, Math.max(0, showing.length - 1))];

  /* open: load index, remember opener, focus input, lock scroll; close: restore.
     Scroll lock covers native scrolling (html + body overflow) AND the site's
     Lenis smooth scroll (Sestek.stopScroll / lenisInstance.stop), which
     ignores overflow:hidden and would keep moving the page under the palette. */
  const loadRef = React.useRef(load);
  loadRef.current = load;
  React.useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    void loadRef.current();   // via ref: `load` changes identity once the index lands and must not re-run this effect
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const html = document.documentElement, body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const w = window as unknown as { Sestek?: { stopScroll?: () => void; startScroll?: () => void }; lenisInstance?: { stop?: () => void; start?: () => void } };
    if (w.Sestek?.stopScroll) w.Sestek.stopScroll(); else w.lenisInstance?.stop?.();
    return () => {
      cancelAnimationFrame(id);
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      if (w.Sestek?.startScroll) w.Sestek.startScroll(); else w.lenisInstance?.start?.();
      setQuery("");
      const o = openerRef.current as HTMLElement | null;
      if (o && typeof o.focus === "function") o.focus();
    };
  }, [open, setQuery]);

  /* wheel/touch inside the palette must not reach the page (Lenis listens on window) */
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  React.useEffect(() => { setActive(0); }, [debounced, open]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, showing.length]);

  const go = React.useCallback((doc: SearchDoc) => {
    onClose();
    if (onNavigate) onNavigate(doc);
    else window.location.assign(doc.path);
  }, [onClose, onNavigate]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = showing.length;
    switch (e.key) {
      case "Escape": e.preventDefault(); onClose(); break;
      case "ArrowDown": e.preventDefault(); if (n) setActive((a) => (a + 1) % n); break;
      case "ArrowUp": e.preventDefault(); if (n) setActive((a) => (a - 1 + n) % n); break;
      case "Home": if (n) { e.preventDefault(); setActive(0); } break;
      case "End": if (n) { e.preventDefault(); setActive(n - 1); } break;
      case "Enter": if (n && showing[active]) { e.preventDefault(); go(showing[active]); } break;
      case "Tab": {
        const f = panelRef.current?.querySelectorAll<HTMLElement>('input,button,a[href]:not([tabindex="-1"])');
        if (!f || !f.length) break;
        const first = f[0], last = f[f.length - 1];
        const ae = (panelRef.current?.getRootNode() as Document | ShadowRoot).activeElement;
        if (e.shiftKey && ae === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
        break;
      }
    }
  };

  if (!open) return null;
  const listId = "sst-search-listbox";
  const link = (doc: SearchDoc) => ({
    href: doc.path,
    onClick: (e: React.MouseEvent) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); go(doc); },
  });

  return (
    <div className="sst-search" role="presentation" onKeyDown={onKey} onWheel={stop} onTouchMove={stop} data-lenis-prevent="">
      {inlineCss && <style dangerouslySetInnerHTML={{ __html: inlineCss }} />}
      <div className="sst-search__backdrop" onMouseDown={onClose} />
      <div ref={panelRef} className="sst-search__panel" role="dialog" aria-modal="true" aria-label={t.open} id="site-search-dialog">

        <div className="sst-search__head">
          <p className="sst-search__eyebrow">{t.eyebrow}</p>
          <div className="sst-search__bar">
            <svg className="sst-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              ref={inputRef}
              className="sst-search__input"
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showing.length > 0}
              aria-controls={listId}
              aria-activedescendant={showing.length ? listId + "-" + active : undefined}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={160}
              placeholder={t.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="sst-search__esc" onClick={onClose} aria-label={t.close}>Esc</button>
          </div>
          {!searching && t.suggested.length > 0 && (
            <div className="sst-search__try">
              <span className="sst-search__try-label">{t.tryLabel}</span>
              {t.suggested.map((q) => (
                <button type="button" key={q} className="sst-search__try-chip" onClick={() => { setQuery(q); inputRef.current?.focus(); }}>{q}</button>
              ))}
            </div>
          )}
        </div>

        <div className="sst-search__body">
          <div className="sst-search__list-col">
            {searching && status === "loading" && (
              <div aria-live="polite" aria-label={t.loading}>{[0, 1, 2, 3, 4].map((i) => <div key={i} className="sst-search__skel" />)}</div>
            )}
            {searching && status === "error" && <div className="sst-search__status">{t.empty}</div>}
            {showing.length > 0 && (
              <>
                <p className="sst-search__label">{searching ? t.results : t.quick}</p>
                <p className="sst-search__hint">{searching ? t.resultsHint : t.quickHint}</p>
                <div ref={listRef} id={listId} className="sst-search__list" role="listbox" aria-label={searching ? t.results : t.quick}>
                  {(searching ? [{ label: "", items: showing }] : groups).map((g, gi) => {
                    const offset = searching ? 0 : groups.slice(0, gi).reduce((n, x) => n + x.items.length, 0);
                    return (
                      <ul key={g.label || "results"} className={"sst-search__group" + (searching ? "" : " sst-search__group--quick")} role="group" aria-label={g.label || undefined}>
                        {g.label && <li className="sst-search__group-label" role="presentation">{g.label}</li>}
                        {g.items.map((d, k) => {
                          const i = offset + k;
                          return (
                            <li key={d.path} role="presentation">
                              <a id={listId + "-" + i} role="option" aria-selected={i === active} className={"sst-search__opt" + (searching ? "" : " sst-search__tile")} tabIndex={-1} onMouseEnter={() => setActive(i)} {...link(d)}>
                                {searching ? (
                                  <>
                                    <span className="sst-search__chip" data-kind={d.kind} aria-hidden="true">{KIND_ABBR[d.kind] || "PG"}</span>
                                    <span className="sst-search__text">
                                      <span className="sst-search__eyeline"><b>{t.kinds[d.kind] || d.kind}</b><span>{d.path}</span></span>
                                      <span className="sst-search__title"><Highlight doc={d} /></span>
                                      {d.summary && <span className="sst-search__sum">{d.summary}</span>}
                                    </span>
                                    <span className="sst-search__arrow" aria-hidden="true">{ARROW}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="sst-search__tile-kind"><i className="sst-search__dot" data-kind={d.kind} aria-hidden="true" />{t.kinds[d.kind] || d.kind}</span>
                                    <span className="sst-search__title">{d.title}</span>
                                    {d.summary && <span className="sst-search__sum">{d.summary}</span>}
                                    <span className="sst-search__arrow" aria-hidden="true">{ARROW}</span>
                                  </>
                                )}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })}
                </div>
              </>
            )}
            {isEmpty && (
              <div className="sst-search__empty">
                <h3>{t.empty}</h3>
                <p>{t.emptyHint}</p>
                <div className="sst-search__ctas">
                  {demoHref && <a className="sst-search__cta sst-search__cta--primary" href={demoHref}>{t.demo}</a>}
                  {contactHref && <a className="sst-search__cta" href={contactHref}>{t.contact}</a>}
                </div>
              </div>
            )}
          </div>

          <aside className="sst-search__preview" aria-live="polite">
            {current ? (
              <>
                <span className="sst-search__pv-chip">{t.kinds[current.kind] || current.kind}</span>
                <h2 className="sst-search__pv-title">{current.title}</h2>
                {current.summary && <p className="sst-search__pv-sum">{current.summary}</p>}
                <p className="sst-search__pv-url">{siteHost}<b>{current.path}</b></p>
                <a className="sst-search__btn" {...link(current)}>{t.openPage}{ARROW}</a>
              </>
            ) : (
              <p className="sst-search__pv-empty">{isEmpty ? t.emptyHint : t.quickHint}</p>
            )}
          </aside>
        </div>

        <div className="sst-search__foot">
          <div className="sst-search__keys">
            <span><kbd>↑↓</kbd>{t.navigate}</span>
            <span><kbd>↵</kbd>{t.enter}</span>
            <span><kbd>Esc</kbd>{t.esc}</span>
          </div>
          <span className="sst-search__brand">Sestek</span>
        </div>
      </div>
    </div>
  );
}

/** Global ⌘K / Ctrl+K (+ "/" outside editable fields) hook shared by both surfaces. */
export function useSearchHotkey(toggle: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); toggle(); return; }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const el = document.activeElement as HTMLElement | null;
        const typing = !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        if (!typing) { e.preventDefault(); toggle(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);
}
