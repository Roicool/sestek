/*
 * <SiteSearch/> — ⌘K command palette for the Sestek site.
 *
 * Accessible dialog + combobox/listbox: focus trap, Esc closes, focus is
 * restored to the opener, ↑/↓/Home/End move, Enter navigates, ⌘K / Ctrl+K
 * toggles globally (ignored while typing in another field). Results are
 * ranked client-side from the index fetched once via useSearch().
 *
 * Styling: SEARCH_CSS is injected by whoever mounts this (the embed puts it
 * in a shadow root; the app renders it inline through <style>).
 */

import * as React from "react";
import { MESSAGES } from "../../lib/search/messages";
import type { RankedDoc, SearchDoc, SearchLocale } from "../../lib/search/types";
import { useSearch } from "./useSearch";

export interface SiteSearchProps {
  open: boolean;
  onClose: () => void;
  indexUrl: string;
  locale?: SearchLocale;
  contactHref?: string;
  assistantHref?: string;
  /** Called instead of location.assign when set (e.g. SPA router) */
  onNavigate?: (doc: SearchDoc) => void;
  /** Render <style>{css}</style> inside the component (app surface). */
  inlineCss?: string;
}

const KIND_ABBR: Record<string, string> = { product: "PR", solution: "SOL", "case-study": "CS", blog: "BL", resource: "RES", career: "JOB", page: "PG" };

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

export function SiteSearch({ open, onClose, indexUrl, locale = "en", contactHref, assistantHref, onNavigate, inlineCss }: SiteSearchProps) {
  const t = MESSAGES[locale] || MESSAGES.en;
  const { query, setQuery, debounced, results, popular, status, load } = useSearch({ indexUrl, locale });
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const openerRef = React.useRef<Element | null>(null);

  const showing: SearchDoc[] = debounced.trim() ? results : popular;
  const isEmpty = status === "ready" && debounced.trim().length > 0 && results.length === 0;

  /* open: load index, remember opener, focus input; close: restore focus */
  React.useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    void load();
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.documentElement.style.overflow = prevOverflow;
      setQuery("");                                   // fresh palette next time
      const o = openerRef.current as HTMLElement | null;
      if (o && typeof o.focus === "function") o.focus();
    };
  }, [open, load, setQuery]);

  React.useEffect(() => { setActive(0); }, [debounced, open]);

  /* keep the active option in view */
  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest" });
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
        // focus trap: cycle between the input and the focusable controls in the panel
        const f = panelRef.current?.querySelectorAll<HTMLElement>('input,button,a[href],[tabindex]:not([tabindex="-1"])');
        if (!f || !f.length) break;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        break;
      }
    }
  };

  if (!open) return null;
  const listId = "sst-search-listbox";

  return (
    <div className="sst-search" role="presentation" onKeyDown={onKey}>
      {inlineCss && <style dangerouslySetInnerHTML={{ __html: inlineCss }} />}
      <div className="sst-search__backdrop" onMouseDown={onClose} />
      <div ref={panelRef} className="sst-search__panel" role="dialog" aria-modal="true" aria-label={t.open} id="site-search-dialog">
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
          <button type="button" className="sst-search__kbd" onClick={onClose} aria-label={t.close}>esc</button>
        </div>

        <div className="sst-search__body">
          {status === "loading" && !showing.length && <div className="sst-search__status">…</div>}
          {status === "error" && <div className="sst-search__status">{t.empty}</div>}
          {showing.length > 0 && (
            <>
              <div className="sst-search__label">{debounced.trim() ? t.results : t.suggestions}</div>
              <ul ref={listRef} id={listId} className="sst-search__list" role="listbox" aria-label={t.results}>
                {showing.map((d, i) => (
                  <li key={d.path} role="presentation">
                    <a
                      id={listId + "-" + i}
                      role="option"
                      aria-selected={i === active}
                      className="sst-search__opt"
                      href={d.path}
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; e.preventDefault(); go(d); }}
                    >
                      <span className="sst-search__kind" aria-hidden="true">{KIND_ABBR[d.kind] || "PG"}</span>
                      <span className="sst-search__text">
                        <span className="sst-search__title"><Highlight doc={d} /></span>
                        <span className="sst-search__meta">
                          <span>{t.kinds[d.kind] || d.kind}</span>
                          {d.summary ? <span>{d.summary}</span> : <span>{d.path}</span>}
                        </span>
                      </span>
                      <span className="sst-search__enter" aria-hidden="true">↵</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
          {isEmpty && (
            <div className="sst-search__empty">
              <h3>{t.empty}</h3>
              <p>{t.emptyHint}</p>
              <div className="sst-search__ctas">
                {contactHref && <a className="sst-search__cta sst-search__cta--primary" href={contactHref}>{t.contact}</a>}
                {assistantHref && <a className="sst-search__cta" href={assistantHref}>{t.assistant}</a>}
              </div>
            </div>
          )}
        </div>

        <div className="sst-search__foot">
          <span className="sst-search__hintkbd"><kbd>↑</kbd> <kbd>↓</kbd> · <kbd>↵</kbd> · <kbd>esc</kbd></span>
          <span>Sestek</span>
        </div>
      </div>
    </div>
  );
}

/** Global ⌘K / Ctrl+K hook shared by both surfaces. */
export function useSearchHotkey(toggle: () => void) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggle();
        return;
      }
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
