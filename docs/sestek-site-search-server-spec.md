# Sestek Site Search — Server-side Spec (Webflow Cloud app repo)

> **Scope of this document: only what is built in the cloud-app repository.**
> The frontend (ranking engine, full-page palette, embed bundle, crawler
> script) is finished and tested in `roicool/sestek → site-search/`; you copy
> it in. Your job is the index API, KV storage, the refresh pipeline and
> hosting the embed. No assistant, no chatbot fallback, no analytics.
>
> Full context (architecture, ranking, UX): `docs/sestek-site-search-spec.md`.
> Maintainer for the **ASK** items: mahmud.filoglu@roicool.com.

---

## 0. Facts (verified) — read before touching anything

| Fact | Consequence |
|---|---|
| App = Next.js 16 App Router + `@opennextjs/cloudflare`, deployed with `webflow cloud deploy`, **mounted at `/demos`** | Route file `src/app/api/search/index/route.ts` is live at **`https://www.sestek.com/demos/api/search/index`**. Never hard-code `basePath` in `next.config`. |
| Marketing site and app share the `www.sestek.com` origin | Index fetch from the embed is same-origin. CORS only for `https://*.webflow.io` (staging). |
| OpenNext-Cloudflare runs the **Node** runtime (`nodejs_compat`) | Do **not** add `export const runtime = "edge"`. Plain route handlers. |
| Bindings come from the app's `wrangler.json`; the Webflow CLI may regenerate that file (it is git-ignored in the app) | Declare the KV binding there and verify it survives `webflow cloud deploy` — **ASK** the maintainer how they want it tracked/committed. |
| Sitemap: `https://www.sestek.com/sitemap.xml`, 549 URLs (213 under `/tr`) | Crawl takes ~1–2 min at concurrency 6. Runs in GitHub Actions, **not** in the Worker (subrequest/CPU limits). |
| The embed expects `GET /demos/api/search/index` to return a `SearchIndex` JSON and the script at `/demos/site-search.v1.js` | Both are served by this app. |

---

## 1. Copy the frontend package in

From `roicool/sestek` → `site-search/` (see its `README.md`):

```
site-search/src/lib/search/*            →  src/lib/search/*
site-search/src/data/search-seeds.ts    →  src/data/search-seeds.ts
site-search/src/components/SiteSearch/* →  src/components/SiteSearch/*
site-search/scripts/bundle-search.mjs   →  scripts/bundle-search.mjs   (change outfile to public/site-search.v${major}.js)
site-search/scripts/build-search-index.ts → scripts/build-search-index.ts (default --out public/search-index.json)
site-search/fixtures-search-index.json  →  public/search-index.json    (provisional; replaced by the first crawl)
```

`package.json` additions:

```json
{
  "searchVersion": "1.0.0",
  "scripts": {
    "search:index": "tsx scripts/build-search-index.ts",
    "search:index:sitemap": "tsx scripts/build-search-index.ts --sitemap-only",
    "search:bundle": "node scripts/bundle-search.mjs",
    "search:test": "tsx --test src/lib/search/rank.test.ts",
    "prebuild": "node scripts/bundle-search.mjs"
  },
  "devDependencies": { "esbuild": "^0.24.0", "tsx": "^4.19.0", "preact": "^10.24.0" }
}
```

`prebuild` guarantees `public/site-search.v1.js` exists on every deploy (Next
serves `public/` as static assets). Do not commit `*.js.map`. `tsconfig`
needs `resolveJsonModule: true` (Next default).

Sanity: `npm run search:test` → 10 passing; `npm run search:bundle` → ~43 KB.

---

## 2. Index API — `src/app/api/search/index/route.ts`

Behaviour:

| Method | Does | Status codes |
|---|---|---|
| `GET` | Returns the freshest index: **KV** (`SEARCH_INDEX`, key `index`) if present and valid, else the JSON **bundled at build time** (`import bundled from "…/public/search-index.json"`). Headers: `Content-Type: application/json; charset=utf-8`, `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`, `ETag: "<version>"`, `X-Search-Index-Source: kv \| bundled`, CORS (§2.1). `If-None-Match` match → **304**. | 200 / 304 |
| `POST` | Replaces the KV copy. Requires `Authorization: Bearer <SEARCH_INDEX_SECRET>`. Body must validate as `SearchIndex` (`version` string, non-empty `docs`, every `doc.path` starts with `/`, `title` string). Writes `kv.put("index", JSON.stringify(body))`. Returns `{ ok, version, docs, source }`. | 200 / 400 invalid JSON / 401 / 422 shape / 503 no secret or no binding |
| `OPTIONS` | CORS preflight. | 204 |

`export const dynamic = "force-dynamic"`. Read env via
`getCloudflareContext().env` from `@opennextjs/cloudflare`; type the KV
surface locally (`get(key, "text")`, `put(key, value)`) instead of pulling
`@cloudflare/workers-types`.

### 2.1 CORS

Allow `https://www.sestek.com`, `https://sestek.com` and any origin whose
hostname ends with `.webflow.io`; respond with `Access-Control-Allow-Origin:
<origin>` + `Vary: Origin`, `Access-Control-Allow-Methods: GET, OPTIONS`,
`Access-Control-Allow-Headers: If-None-Match`, `Access-Control-Max-Age: 86400`.
No credentials.

### 2.2 Reference implementation

This file was written and type-checked against the app earlier; use it as-is
or as the starting point.

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import bundled from "../../../../../public/search-index.json";
import type { SearchIndex } from "../../../../lib/search/types";

export const dynamic = "force-dynamic";

const KV_KEY = "index";
const ALLOWED = ["https://www.sestek.com", "https://sestek.com"];

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
    } catch { /* fall through */ }
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
    headers: { ...base, "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" },
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
  return new Response(null, { status: 204, headers: { ...cors(req.headers.get("origin")),
    "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "If-None-Match", "Access-Control-Max-Age": "86400" } });
}
```

---

## 3. KV + secret

```jsonc
// wrangler.json (app root)
{
  "kv_namespaces": [{ "binding": "SEARCH_INDEX", "id": "<namespace-id>" }]
}
```

- **ASK**: namespace id / whether Webflow Cloud provisions it on deploy, and
  how to keep the file since the CLI regenerates it (force-commit vs. a
  post-deploy check).
- Secret: `npx webflow apps env-vars set SEARCH_INDEX_SECRET --secret`
  (generate 32+ random chars). The same value goes into GitHub Actions
  secrets (§4).
- Without KV the API still works from the bundled JSON (`X-Search-Index-Source: bundled`) — degrade, don't fail.

---

## 4. Refresh pipeline — `.github/workflows/search-index.yml`

Keeps the index current **without a redeploy**. Triggers: nightly cron,
manual, and `repository_dispatch` (type `site-published`) for an optional
Webflow publish webhook.

```yaml
name: Refresh site search index
on:
  schedule: [{ cron: "17 2 * * *" }]     # 02:17 UTC daily
  workflow_dispatch:
  repository_dispatch: { types: [site-published] }
concurrency: { group: search-index, cancel-in-progress: true }
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - name: Crawl site → public/search-index.json
        env: { SITE: ${{ vars.SEARCH_SITE || 'https://www.sestek.com' }} }
        run: npx tsx scripts/build-search-index.ts --site "$SITE"
      - name: Push index to KV
        env:
          URL: ${{ vars.SEARCH_INDEX_URL || 'https://www.sestek.com/demos/api/search/index' }}
          SECRET: ${{ secrets.SEARCH_INDEX_SECRET }}
        run: |
          [ -n "$SECRET" ] || { echo "::warning::SEARCH_INDEX_SECRET missing — KV push skipped"; exit 0; }
          code=$(curl -sS -o /tmp/r.json -w "%{http_code}" -X POST "$URL" \
            -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" \
            --data-binary @public/search-index.json)
          cat /tmp/r.json; echo; [ "$code" = "200" ] || { echo "::error::POST → $code"; exit 1; }
      - name: Commit refreshed fallback
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add public/search-index.json
          git diff --cached --quiet || { git commit -m "search: refresh index ($(date -u +%F))"; git push; }
```

Notes
- Committing the JSON keeps the **bundled fallback** fresh for the next deploy; KV is what the live GET serves.
- Optional Webflow hook: Site settings → Webhooks → `site_publish` → a tiny
  relay (or the GitHub dispatch endpoint with a scoped token) that fires
  `repository_dispatch: site-published`. Not required for phase 1.
- If the crawl fails for some pages, the script falls back to slug-derived
  titles for those pages only; the run still succeeds.

---

## 5. Hosting the embed + wiring Webflow

- `public/site-search.v1.js` is built by `prebuild`; served at
  `https://www.sestek.com/demos/site-search.v1.js`. Long cache is fine — the
  filename carries the major version (`searchVersion` in package.json);
  rollback = point the script tag at the previous file.
- Webflow → Site Settings → Custom Code → **Footer**:
  ```html
  <script defer src="https://www.sestek.com/demos/site-search.v1.js"></script>
  ```
  Optional attributes: `data-index`, `data-demo`, `data-contact`,
  `data-locale`, `data-host`.
- Nav search icon: add attribute `data-search-trigger` (the old `search.js`
  overlay block is removed).
- Staging (`rc-sestek.webflow.io`) loads the same production script; the
  index request works thanks to the webflow.io CORS rule.

---

## 6. Rollout order

1. Copy the package (§1), `npm run search:test`, `npm run search:bundle`.
2. Add the route (§2), `wrangler.json` binding + secret (§3). Deploy.
3. Verify: `curl -I https://www.sestek.com/demos/api/search/index` → 200,
   `X-Search-Index-Source: bundled`, ETag present; `curl -I …/site-search.v1.js` → 200.
4. Add the workflow (§4) + GitHub secret; run it manually once → GET now
   reports `X-Search-Index-Source: kv` and real H1 titles.
5. Add the script tag on staging, validate EN + `/tr` queries with the
   maintainer, then publish to production.

## 7. Acceptance

- [ ] `GET /demos/api/search/index`: 200 JSON, ETag, 304 on `If-None-Match`, CORS only for webflow.io / sestek.com.
- [ ] `POST` rejects missing/wrong bearer (401), bad shape (422); accepted body is what GET returns next (`kv`).
- [ ] Workflow: nightly crawl completes for all sitemap URLs, POST 200, fallback JSON committed when changed.
- [ ] A page added to the sitemap is searchable by the next morning with no deploy.
- [ ] `site-search.v1.js` served from `/demos/`, embed opens on the published site with ⌘K and the nav icon.
