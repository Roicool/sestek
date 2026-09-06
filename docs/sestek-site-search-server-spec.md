# Sestek Site Search — Server-side Spec (Webflow Cloud app repo)

> **Scope of this document: only what is built in the cloud-app repository.**
> The frontend is a **Webflow Code Component** ("Site Search" in the
> `sestek-code-components` library, source `roicool/sestek →
> webflow-components/src/SiteSearch.tsx`) — already published and placed in
> the Designer. It does exactly one network call:
> `GET /demos/api/search/index`. Your job is that endpoint, KV storage and the
> nightly refresh pipeline. **Nothing to host for the UI** (no embed script,
> no bundle). No assistant, no chatbot fallback, no analytics.
>
> Full context (architecture, ranking, UX): `docs/sestek-site-search-spec.md`.
> Maintainer for the **ASK** items: mahmud.filoglu@roicool.com.

---

## 0. Facts (verified) — read before touching anything

| Fact | Consequence |
|---|---|
| App = Next.js 16 App Router + `@opennextjs/cloudflare`, deployed with `webflow cloud deploy`, **mounted at `/demos`** | Route file `src/app/api/search/index/route.ts` is live at **`https://www.sestek.com/demos/api/search/index`**. Never hard-code `basePath` in `next.config`. |
| Marketing site and app share the `www.sestek.com` origin | Index fetch from the Code Component is same-origin. CORS only for `https://*.webflow.io` (staging). |
| OpenNext-Cloudflare runs the **Node** runtime (`nodejs_compat`) | Do **not** add `export const runtime = "edge"`. Plain route handlers. |
| Bindings come from the app's `wrangler.json`; the Webflow CLI may regenerate that file (it is git-ignored in the app) | Declare the KV binding there and verify it survives `webflow cloud deploy` — **ASK** the maintainer how they want it tracked/committed. |
| **Domains.** The new site lives on **staging `https://rc-sestek.webflow.io`** until launch; production will be **`https://www.sestek.com`** (today that host still serves the old site). | Crawl **staging now**: `SEARCH_SITE=https://rc-sestek.webflow.io` (repo variable). At launch flip the variable to `https://www.sestek.com` — nothing else changes, the index stores site-relative paths only. |
| Sitemap: `<site>/sitemap.xml`, ~487 URLs (240 under `/tr`) — folder-based (`/products/`, `/solutions/`, `/industries/`, `/success-stories/`, `/blog/`, `/cx-insights/`, `/webinars/`, `/podcasts/`, `/careers/`, `/compares/`, `/legal/`, `/authors/`, `/calculators/`; TR under `/tr/<turkish-folder>/`). Kinds come from the folder (`src/lib/search/kinds.ts`); nothing is excluded. | Crawl takes ~1–2 min at concurrency 6. Runs in GitHub Actions, **not** in the Worker (subrequest/CPU limits). |
| The Code Component fetches `GET /demos/api/search/index` (`credentials: "omit"`, honours `ETag`/`If-None-Match` via the browser cache, caches the JSON in `sessionStorage` for 1 h) and expects a `SearchIndex` JSON | Only this endpoint is served by this app. Response shape is fixed by `src/lib/search/types.ts` — do not rename fields. |

---

## 1. Copy the crawler + shared types in

Only the index-building side is needed here (the palette/ranking UI lives in
the Code Component). From `roicool/sestek` → `site-search/`:

```
site-search/src/lib/search/types.ts       →  src/lib/search/types.ts      (SearchDoc / SearchIndex — the API contract)
site-search/src/lib/search/kinds.ts       →  src/lib/search/kinds.ts      (kind + locale from URL, title from slug)
site-search/src/lib/search/normalize.ts   →  src/lib/search/normalize.ts  (imported by kinds.ts)
site-search/src/data/search-seeds.ts      →  src/data/search-seeds.ts     (curated summaries, merged by the crawler)
site-search/scripts/build-search-index.ts →  scripts/build-search-index.ts (default --out public/search-index.json)
site-search/fixtures-search-index.json    →  public/search-index.json     (provisional; replaced by the first crawl)
```

Do **not** copy `components/SiteSearch/*`, `rank.ts`, `messages.ts` or
`bundle-search.mjs` — nothing in this repo renders the search.

`package.json` additions:

```json
{
  "scripts": {
    "search:index": "tsx scripts/build-search-index.ts",
    "search:index:sitemap": "tsx scripts/build-search-index.ts --sitemap-only"
  },
  "devDependencies": { "tsx": "^4.19.0" }
}
```

`tsconfig` needs `resolveJsonModule: true` (Next default) for the bundled
fallback import in the route.

Sanity: `npm run search:index:sitemap` → `public/search-index.json` with
~487 docs in a few seconds (no page fetches; copy `site-search/sitemap.staging.paths.txt` if you want the offline list).

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
        # staging until launch, then set the repo variable to https://www.sestek.com
        env:
          SITE: ${{ vars.SEARCH_SITE || 'https://rc-sestek.webflow.io' }}
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

## 5. How the Code Component consumes the API (nothing to do here, for context)

- The "Site Search" component sits in the Webflow nav; its **Index URL** prop
  defaults to `/demos/api/search/index` (same-origin). That works on staging
  too **if the Cloud app's staging environment is mounted on
  `rc-sestek.webflow.io/demos`**; if the app only exists in production, the
  maintainer sets the prop to the full URL — hence the webflow.io CORS rule
  in §2.1. Tell the maintainer which of the two applies once deployed.
- The index is fetched once per session when the palette first opens
  (`credentials: "omit"`), then cached in `sessionStorage` for 1 h; the
  browser's HTTP cache + `ETag` handle the rest. Ranking, locale, preview
  are all client-side — **no per-keystroke requests**, no other endpoints.
- Until the endpoint responds, the palette opens but shows its loading
  state; the site is otherwise unaffected. A non-2xx or a non-`SearchIndex`
  body shows the empty state.
- Changing field names or the `docs[]` shape breaks the published component;
  additive fields are fine.
- `doc.image` (optional, absolute URL) feeds the preview column's image
  area; the crawler fills it from `og:image`. Without it the component shows
  its own default visual, so the field is nice-to-have, not required.
- Before the visitor types, the palette lists curated quick links that ship
  inside the component — the index is only used once a query is entered.

---

## 6. Rollout order

1. Copy the crawler + types (§1), `npm run search:index:sitemap`.
2. Add the route (§2), `wrangler.json` binding + secret (§3). Deploy.
3. Verify: `curl -I https://www.sestek.com/demos/api/search/index` → 200,
   `X-Search-Index-Source: bundled`, ETag present.
4. Add the workflow (§4) + GitHub secret; run it manually once → GET now
   reports `X-Search-Index-Source: kv` and real H1 titles.
5. Tell the maintainer; they open ⌘K on the published site and validate EN +
   `/tr` queries (the component is already in place).
6. **At launch** (www.sestek.com goes live with the new site): set repo
   variable `SEARCH_SITE=https://www.sestek.com` (and `SEARCH_INDEX_URL` if
   it was pointing at staging), run the workflow once. No code change.

## 7. Acceptance

- [ ] `GET /demos/api/search/index`: 200 JSON, ETag, 304 on `If-None-Match`, CORS only for webflow.io / sestek.com.
- [ ] `POST` rejects missing/wrong bearer (401), bad shape (422); accepted body is what GET returns next (`kv`).
- [ ] Workflow: nightly crawl completes for all sitemap URLs, POST 200, fallback JSON committed when changed.
- [ ] A page added to the sitemap is searchable by the next morning with no deploy.
- [ ] Published site: ⌘K palette lists real results from the endpoint (checked by the maintainer).
