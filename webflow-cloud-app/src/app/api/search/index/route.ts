/*
 * /demos/api/search/index
 *
 *   GET   → the search index (JSON). Freshest copy wins:
 *             1. Cloudflare KV  (binding SEARCH_INDEX, key "index") — written by POST
 *             2. public/search-index.json bundled at build time — fallback
 *           Cached 5 min in browsers, 1 day at the edge, stale-while-revalidate;
 *           ETag = index.version so a regenerated index busts every cache.
 *   POST  → replace the index in KV. Body = SearchIndex JSON, header
 *           Authorization: Bearer <SEARCH_INDEX_SECRET>. Called by the
 *           daily crawl workflow (.github/workflows/search-index.yml), so the
 *           index stays current WITHOUT a redeploy.
 *
 * KV binding + secret:
 *   wrangler.json → kv_namespaces: [{ binding: "SEARCH_INDEX", id: "…" }]
 *   npx webflow apps env-vars set SEARCH_INDEX_SECRET --secret
 *
 * CORS: www.sestek.com is same-origin (app mounted at /demos); only the
 * webflow.io staging origins need the header.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import bundled from "../../../../../public/search-index.json";
import type { SearchIndex } from "../../../../lib/search/types";

export const dynamic = "force-dynamic";

const KV_KEY = "index";
const ALLOWED = ["https://www.sestek.com", "https://sestek.com"];

/* Minimal KV surface we use — avoids a hard dependency on @cloudflare/workers-types. */
type KV = { get(key: string, type: "text"): Promise<string | null>; put(key: string, value: string): Promise<void> };
type Env = { SEARCH_INDEX?: KV; SEARCH_INDEX_SECRET?: string };

function env(): Env {
  try { return (getCloudflareContext().env as unknown as Env) || {}; } catch { return {}; }
}

function cors(origin: string | null): Record<string, string> {
  if (!origin) return {};
  let ok = ALLOWED.includes(origin);
  if (!ok) { try { ok = /\.webflow\.io$/.test(new URL(origin).hostname); } catch { ok = false; } }
  return ok ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
}

function isIndex(x: unknown): x is SearchIndex {
  const i = x as SearchIndex;
  return !!i && typeof i.version === "string" && Array.isArray(i.docs) && i.docs.length > 0
    && i.docs.every((d) => d && typeof d.path === "string" && d.path.startsWith("/") && typeof d.title === "string");
}

async function load(): Promise<{ index: SearchIndex; from: "kv" | "bundled" }> {
  const kv = env().SEARCH_INDEX;
  if (kv) {
    try {
      const raw = await kv.get(KV_KEY, "text");
      if (raw) { const parsed = JSON.parse(raw); if (isIndex(parsed)) return { index: parsed, from: "kv" }; }
    } catch { /* fall through to bundled */ }
  }
  return { index: bundled as unknown as SearchIndex, from: "bundled" };
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const { index, from } = await load();
  const etag = `"${index.version}"`;
  const base = { ETag: etag, "X-Search-Index-Source": from, ...cors(origin) };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: base });
  return new Response(JSON.stringify(index), {
    headers: {
      ...base,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

export async function POST(req: Request) {
  const { SEARCH_INDEX: kv, SEARCH_INDEX_SECRET: secret } = env();
  if (!secret) return Response.json({ error: "SEARCH_INDEX_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!kv) return Response.json({ error: "SEARCH_INDEX KV binding missing" }, { status: 503 });
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: "invalid json" }, { status: 400 }); }
  if (!isIndex(body)) return Response.json({ error: "not a SearchIndex" }, { status: 422 });
  await kv.put(KV_KEY, JSON.stringify(body));
  return Response.json({ ok: true, version: body.version, docs: body.docs.length, source: body.source });
}

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      ...cors(req.headers.get("origin")),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "If-None-Match",
      "Access-Control-Max-Age": "86400",
    },
  });
}
