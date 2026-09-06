/*
 * Client-side ranking — our own, dependency-free. Synchronous and fast for a
 * few hundred docs (≈ 0.1 ms/doc), so it runs on every debounced keystroke.
 *
 * Score = Σ per-token best match + coverage bonus + curated priority + kind boost.
 * Curated pages (products / solutions) carry `priority` so they beat blog posts
 * on head terms even when a blog title contains the exact phrase.
 */

import { normalizeText, tokenize } from "./normalize";
import type { RankedDoc, SearchDoc, SearchKind } from "./types";

export const WEIGHTS = {
  titleExact: 100,     // whole normalised query === normalised title
  titlePhrase: 60,     // whole query appears in title as a phrase
  titleStarts: 40,     // a token starts the title
  titleWordStart: 30,  // a token starts a word in the title
  titleContains: 20,   // a token appears anywhere in the title
  keywordExact: 30,    // a token equals a curated keyword
  keywordContains: 12,
  summaryContains: 8,
  pathContains: 6,
  allTokens: 20,       // every query token matched somewhere (AND bonus)
  priorityScale: 0.6,  // + priority × scale (curated 0–100 → 0–60)
} as const;

export const KIND_BOOST: Record<SearchKind, number> = {
  product: 12,
  solution: 10,
  "case-study": 6,
  resource: 4,
  page: 3,
  blog: 0,
  career: 0,
};

type Prepared = {
  doc: SearchDoc;
  title: string;
  titleWords: string[];
  summary: string;
  path: string;
  keywords: string[];
};

/** Pre-normalise once per index load; rank() then only touches strings. */
export function prepare(docs: SearchDoc[]): Prepared[] {
  return docs.map((doc) => {
    const title = normalizeText(doc.title);
    return {
      doc,
      title,
      titleWords: title.split(/[^a-z0-9+#]+/).filter(Boolean),
      summary: normalizeText(doc.summary || ""),
      path: normalizeText(doc.path.replace(/[-_/]+/g, " ")),
      keywords: (doc.keywords || []).map(normalizeText),
    };
  });
}

function scoreOne(p: Prepared, tokens: string[], query: string): number {
  let score = 0;
  let matched = 0;

  if (p.title === query) score += WEIGHTS.titleExact;
  else if (query.length >= 3 && p.title.includes(query)) score += WEIGHTS.titlePhrase;

  for (const t of tokens) {
    let best = 0;
    if (p.title.startsWith(t)) best = WEIGHTS.titleStarts;
    else if (p.titleWords.some((w) => w.startsWith(t))) best = WEIGHTS.titleWordStart;
    else if (p.title.includes(t)) best = WEIGHTS.titleContains;

    if (p.keywords.length) {
      if (p.keywords.some((k) => k === t)) best = Math.max(best, WEIGHTS.keywordExact);
      else if (p.keywords.some((k) => k.includes(t))) best = Math.max(best, WEIGHTS.keywordContains);
    }
    if (best === 0 && p.summary.includes(t)) best = WEIGHTS.summaryContains;
    if (best === 0 && p.path.includes(t)) best = WEIGHTS.pathContains;

    if (best > 0) { score += best; matched++; }
  }

  if (matched === 0) return 0;
  if (matched === tokens.length && tokens.length > 1) score += WEIGHTS.allTokens;
  score += (p.doc.priority || 0) * WEIGHTS.priorityScale;
  score += KIND_BOOST[p.doc.kind] ?? 0;
  return score;
}

/** Character ranges of the tokens inside the ORIGINAL title, for highlighting. */
function titleMatches(title: string, tokens: string[]): Array<[number, number]> {
  const norm = normalizeText(title);
  // normalizeText never changes string length for the Turkish map (1:1) but may
  // for NFD-stripped chars; guard by only highlighting when lengths agree.
  if (norm.length !== title.length) return [];
  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    let from = 0;
    while (from <= norm.length - t.length) {
      const i = norm.indexOf(t, from);
      if (i === -1) break;
      ranges.push([i, i + t.length]);
      from = i + t.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

export interface RankOptions {
  limit?: number;
  locale?: SearchDoc["locale"];
}

/** Rank prepared docs for a query. Returns only positive scores, best first. */
export function rankPrepared(prepared: Prepared[], q: string, opts: RankOptions = {}): RankedDoc[] {
  const tokens = tokenize(q);
  if (!tokens.length) return [];
  const query = normalizeText(q);
  const limit = opts.limit ?? 12;
  const out: RankedDoc[] = [];
  for (const p of prepared) {
    if (opts.locale && p.doc.locale !== opts.locale) continue;
    const score = scoreOne(p, tokens, query);
    if (score > 0) out.push({ ...p.doc, score, titleMatches: titleMatches(p.doc.title, tokens) });
  }
  out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return out.slice(0, limit);
}

/** Convenience for one-off use (tests, server). Prefer prepare() + rankPrepared() in the UI. */
export function rankDocs(docs: SearchDoc[], q: string, opts: RankOptions = {}): RankedDoc[] {
  return rankPrepared(prepare(docs), q, opts);
}

/** Idle-state suggestions: top curated docs of the locale. */
export function suggestions(docs: SearchDoc[], locale: SearchDoc["locale"], limit = 6): SearchDoc[] {
  return docs
    .filter((d) => d.locale === locale && (d.priority || 0) > 0)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || a.title.localeCompare(b.title))
    .slice(0, limit);
}
