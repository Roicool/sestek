/* Sestek site search — shared types (engine + component + index builder). */

export type SearchKind =
  | "product"
  | "solution"
  | "case-study"
  | "blog"
  | "resource"
  | "career"
  | "page";

export type SearchLocale = "en" | "tr";

export interface SearchDoc {
  /** Site-relative path, locale-prefixed for TR: "/tr/agentic-ai" */
  path: string;
  /** Page H1 (falls back to <title>) */
  title: string;
  /** Meta description or first paragraph, ≤ 200 chars */
  summary: string;
  kind: SearchKind;
  locale: SearchLocale;
  /** Hand-curated synonyms / aliases — boosts recall */
  keywords?: string[];
  /** 0–100 curated boost, default 0 */
  priority?: number;
  /** Absolute image URL for the preview column (og:image from the crawl, or curated) */
  image?: string;
}

export interface SearchIndex {
  /** Cache-bust key, e.g. "2026-09-06T12:00Z" */
  version: string;
  generatedAt: string;
  /** How the docs were produced: "crawl" (pages fetched) or "sitemap" (provisional) */
  source: "crawl" | "sitemap";
  docs: SearchDoc[];
}

export interface RankedDoc extends SearchDoc {
  score: number;
  /** [start, end) ranges in `title` for highlighting (already in title's own casing) */
  titleMatches: Array<[number, number]>;
}
