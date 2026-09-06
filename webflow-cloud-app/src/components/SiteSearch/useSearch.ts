/* State + data hook for the palette: fetches the index once, ranks locally. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { prepare, rankPrepared, suggestions } from "../../lib/search/rank";
import type { RankedDoc, SearchDoc, SearchIndex, SearchLocale } from "../../lib/search/types";

const CACHE_KEY = "sestek:search-index";
const CACHE_TTL = 60 * 60 * 1000;   // 1h in sessionStorage; server cache headers do the rest

export interface UseSearchOptions {
  indexUrl: string;
  locale: SearchLocale;
  limit?: number;
  debounceMs?: number;
}

export type SearchStatus = "idle" | "loading" | "ready" | "error";

export function useSearch({ indexUrl, locale, limit = 10, debounceMs = 60 }: UseSearchOptions) {
  const [docs, setDocs] = useState<SearchDoc[] | null>(null);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const loading = useRef<Promise<void> | null>(null);

  /** Load the index (once). Call on first open so the closed page pays nothing. */
  const load = useCallback(() => {
    if (docs || loading.current) return loading.current || Promise.resolve();
    setStatus("loading");
    loading.current = (async () => {
      try {
        try {
          const raw = sessionStorage.getItem(CACHE_KEY);
          if (raw) {
            const c = JSON.parse(raw) as { at: number; url: string; index: SearchIndex };
            if (c.url === indexUrl && Date.now() - c.at < CACHE_TTL) { setDocs(c.index.docs); setStatus("ready"); return; }
          }
        } catch { /* storage unavailable */ }
        const r = await fetch(indexUrl, { credentials: "omit" });
        if (!r.ok) throw new Error(String(r.status));
        const index = (await r.json()) as SearchIndex;
        setDocs(index.docs);
        setStatus("ready");
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), url: indexUrl, index })); } catch { /* quota */ }
      } catch {
        setStatus("error");
      } finally {
        loading.current = null;
      }
    })();
    return loading.current;
  }, [docs, indexUrl]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), debounceMs);
    return () => clearTimeout(t);
  }, [query, debounceMs]);

  const prepared = useMemo(() => (docs ? prepare(docs) : null), [docs]);
  const results: RankedDoc[] = useMemo(
    () => (prepared && debounced.trim() ? rankPrepared(prepared, debounced, { limit, locale }) : []),
    [prepared, debounced, limit, locale],
  );
  const popular = useMemo(() => (docs ? suggestions(docs, locale, 6) : []), [docs, locale]);

  return { query, setQuery, debounced, results, popular, status, load, docCount: docs ? docs.length : 0 };
}
