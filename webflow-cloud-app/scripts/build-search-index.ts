/*
 * build-search-index.ts — crawls the WHOLE site and writes the search index.
 *
 *   npx tsx scripts/build-search-index.ts                    # crawl live site
 *   npx tsx scripts/build-search-index.ts --sitemap-only     # no page fetches (provisional)
 *   npx tsx scripts/build-search-index.ts --site https://rc-sestek.webflow.io
 *   npx tsx scripts/build-search-index.ts --sitemap ../sitemap.xml   # local sitemap file
 *
 * Source of truth is the sitemap (every published page, both locales). For
 * each URL the page is fetched and the H1 (or <title>), meta description (or
 * first paragraph) and locale are extracted; `kindForPath` classifies it and
 * the curated seeds (src/data/search-seeds.ts) are merged on top. Output:
 * public/search-index.json — served by GET /api/search/index and also as a
 * static asset.
 *
 * No dependencies: regex-based extraction is enough for Webflow's clean HTML.
 * Concurrency 6, polite; a failed page falls back to the sitemap-derived doc.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { kindForPath, localeForPath, titleFromSlug } from "../src/lib/search/kinds";
import { SEEDS } from "../src/data/search-seeds";
import type { SearchDoc, SearchIndex } from "../src/lib/search/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const SITE = (opt("--site") || "https://www.sestek.com").replace(/\/$/, "");
const SITEMAP = opt("--sitemap");
const SITEMAP_ONLY = args.includes("--sitemap-only");
const OUT = resolve(__dirname, "..", opt("--out") || "public/search-index.json");
const CONCURRENCY = 6;

const decode = (s: string) => s
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const clip = (s: string, n = 200) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");

async function loadSitemap(): Promise<string[]> {
  let xml: string;
  if (SITEMAP) xml = readFileSync(resolve(SITEMAP), "utf8");
  else {
    const r = await fetch(SITE + "/sitemap.xml");
    if (!r.ok) throw new Error("sitemap " + r.status);
    xml = await r.text();
  }
  const locs = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)).map((m) => m[1]);
  const paths = new Set<string>();
  for (const loc of locs) {
    try {
      const u = new URL(loc);
      let p = u.pathname.replace(/\/+$/, "") || "/";
      if (p === "/tr/") p = "/tr";
      paths.add(p);
    } catch { /* ignore */ }
  }
  return Array.from(paths).sort();
}

function fromSitemap(path: string): SearchDoc {
  return { path, title: titleFromSlug(path), summary: "", kind: kindForPath(path), locale: localeForPath(path) };
}

async function fetchDoc(path: string): Promise<SearchDoc> {
  const base = fromSitemap(path);
  try {
    const r = await fetch(SITE + path, { headers: { "user-agent": "SestekSearchIndexer/1.0 (+https://www.sestek.com)" }, redirect: "follow" });
    if (!r.ok) return base;
    const html = await r.text();
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
    const lang = html.match(/<html[^>]+lang=["']([a-z]{2})/i);
    const firstP = html.replace(/<(nav|header|footer|script|style)[\s\S]*?<\/\1>/gi, "").match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const t = strip((h1 && h1[1]) || (title && title[1]) || "").replace(/\s*[|–-]\s*Sestek\s*$/i, "");
    const summary = clip(strip((metaDesc && metaDesc[1]) || (ogDesc && ogDesc[1]) || (firstP && firstP[1]) || ""));
    return {
      ...base,
      title: t || base.title,
      summary,
      locale: lang && lang[1].toLowerCase() === "tr" ? "tr" : base.locale,
    };
  } catch {
    return base;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

function mergeSeeds(docs: SearchDoc[]): SearchDoc[] {
  const byPath = new Map(docs.map((d) => [d.path, d]));
  for (const s of SEEDS) {
    const cur = byPath.get(s.path);
    if (cur) byPath.set(s.path, { ...cur, ...s, keywords: Array.from(new Set([...(cur.keywords || []), ...(s.keywords || [])])) });
    else byPath.set(s.path, { ...fromSitemap(s.path), ...s } as SearchDoc);   // seed for a page missing from the sitemap
  }
  return Array.from(byPath.values()).sort((a, b) => a.path.localeCompare(b.path));
}

async function main() {
  const paths = await loadSitemap();
  console.log(`sitemap: ${paths.length} urls (${paths.filter((p) => p.startsWith("/tr")).length} tr)`);
  let docs: SearchDoc[];
  if (SITEMAP_ONLY) docs = paths.map(fromSitemap);
  else {
    let done = 0;
    docs = await mapLimit(paths, CONCURRENCY, async (p) => { const d = await fetchDoc(p); if (++done % 50 === 0) console.log(`  ${done}/${paths.length}`); return d; });
  }
  docs = mergeSeeds(docs);
  const now = new Date();
  const index: SearchIndex = {
    version: now.toISOString().slice(0, 16) + "Z",
    generatedAt: now.toISOString(),
    source: SITEMAP_ONLY ? "sitemap" : "crawl",
    docs,
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(index));
  const kinds = docs.reduce<Record<string, number>>((a, d) => { a[d.kind] = (a[d.kind] || 0) + 1; return a; }, {});
  console.log(`wrote ${OUT}: ${docs.length} docs, ${(JSON.stringify(index).length / 1024).toFixed(0)} KB`, kinds);
}

main().catch((e) => { console.error(e); process.exit(1); });
