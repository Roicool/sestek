# Sestek Site Search — Implementation Spec (for the cloud-app agent)

> **Goal:** Ship a ⌘K **full-page** site search for sestek.com, built in the
> **Sestek Webflow Cloud app repo** (Next.js 16 on Cloudflare via OpenNext) as
> (1) an index API + refresh pipeline and (2) an embeddable React palette
> loaded on the Webflow marketing site. Client-side ranked index; **no
> assistant, no chatbot fallback, no analytics** — search only.
>
> Reference UI: a two-column full-page palette (results left, live preview of
> the highlighted result right). Rebuild it in Sestek's visual language — do
> not copy any third-party code or assets.

Audience: the implementing agent working in the cloud-app repository. This
document is the source of truth. Where a decision is marked **(default)**,
take it and note it in the PR. Items marked **ASK** need the maintainer
(mahmud.filoglu@roicool.com) before wiring.

---

## 0. Facts about the target (verified)

- Cloud app: Next.js **16** App Router, `@opennextjs/cloudflare`, deployed by
  `webflow cloud deploy`, **mounted at `/demos`**. Consequences:
  - A route file `src/app/api/search/index/route.ts` is served at
    **`https://www.sestek.com/demos/api/search/index`** (basePath is injected
    by the deploy — never hard-code it in `next.config`).
  - The published site and the app share the origin → the embed's index
    fetch is **same-origin, no CORS**. Only staging (`rc-sestek.webflow.io`)
    needs an `Access-Control-Allow-Origin` header.
  - Do **not** use `export const runtime = "edge"`; OpenNext-Cloudflare runs
    the Node runtime (`nodejs_compat`). Plain route handlers only.
  - Bindings (KV) are declared in the app's `wrangler.json` (the Webflow CLI
    may regenerate this file — keep the binding in a place the deploy keeps,
    **ASK** how the maintainer wants it tracked).
- Marketing site: **English primary**, Turkish under **`/tr/...`**. The
  sitemap (`https://www.sestek.com/sitemap.xml`) lists **549 URLs, 213 TR**.
  URL patterns: blog posts end in `-blog`; solutions `solutions-for-*` /
  `*-icin-cozumler`; products are Knovvu family + capability slugs; customer
  stories are `<brand>-…-with-…` / `…-ile-…` slugs; careers are role slugs.
- Site nav already has a search icon wired for the old `search.js`
  (`[data-search-trigger]`). Reuse that attribute as the trigger.
- Site CSS custom properties (available to the embed even inside a shadow
  root — custom properties inherit across the boundary):
  `--brand-primary--500` (magenta accent), `--surface--base` (page bg),
  `--surface--light` (lavender card), `--surface--muted`, `--color-text--base`,
  `--color-text--muted`, `--color-text--inverted`, `--border--color-border-page`,
  `--radius--md` (8px), `--radius--lg`, `--radius--full`, `--spacing--*`,
  `--text--sm/base/lg/6xl`, `--heading--h2/h3`, `--font-weight--medium/semibold`,
  `--leading--tight/snug/relaxed`, `--container--lg/2xl`, `--view--px`.
  Font-family is inherited from the page (Montserrat-style sans).
- Nav autohide uses `transform` → the palette must **not** live inside the
  nav (fixed positioning breaks). Mount on `<body>`.

---

## 1. Architecture

```
┌── Webflow site (published) ────────────────────────────────────────────┐
│  nav [data-search-trigger]  ──►  <SiteSearch/> full-page palette         │
│  ⌘K / Ctrl+K / "/"                 │  ranks locally (no per-keystroke net) │
│                                    ▼                                     │
│                    in-memory index, fetched once (sessionStorage 1h)     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     ▼   same origin
      Webflow Cloud app  (/demos)
        GET  /demos/api/search/index   → SearchIndex JSON  (KV → bundled fallback)
        POST /demos/api/search/index   → replace KV copy   (Bearer secret)
                                     ▲
        GitHub Actions (nightly / manual / on publish): crawl sitemap → POST
```

**Phase 1 (ship):** everything above. **No phase 2/3** (no server ranking,
no semantic search, no assistant, no logging).

---

## 2. Data model

```ts
export type SearchKind = "product" | "solution" | "case-study" | "blog" | "resource" | "career" | "page";
export type SearchLocale = "en" | "tr";

export interface SearchDoc {
  path: string;        // "/agentic-ai" | "/tr/agentic-ai"
  title: string;       // page H1 (fallback <title> minus " | Sestek")
  summary: string;     // meta description → og:description → first <p>; ≤ 200 chars
  kind: SearchKind;
  locale: SearchLocale;
  keywords?: string[]; // curated aliases (boost recall)
  priority?: number;   // 0–100 curated boost, default 0
}

export interface SearchIndex {
  version: string;     // "2026-09-06T12:00Z" — cache-bust / ETag
  generatedAt: string;
  source: "crawl" | "sitemap";   // "sitemap" = provisional (no page fetch)
  docs: SearchDoc[];   // ~550
}
```

---

## 3. Index build (crawl the whole site)

`scripts/build-search-index.ts` (run with `tsx`; zero deps, regex extraction
is enough for Webflow HTML):

1. Load the sitemap (`--site https://www.sestek.com` default, or
   `--sitemap <file>`); collect unique paths; `/tr/` → `/tr`.
2. Fetch every page, concurrency 6, UA `SestekSearchIndexer/1.0`. Extract:
   `<h1>` (else `<title>` minus `| Sestek`), `meta[name=description]` →
   `og:description` → first `<p>` outside nav/header/footer (strip tags,
   decode entities, clip 200), `<html lang>` (tr → locale tr; else from path).
   A failed fetch falls back to the sitemap-derived doc (title from slug).
3. `kind` = `kindForPath(path)` (rules in §3.1).
4. Merge curated seeds (`src/data/search-seeds.ts`, §3.2): seed fields win,
   keywords are unioned; a seed whose path is missing from the sitemap is
   still added.
5. Write `public/search-index.json`; log counts per kind.
6. `--sitemap-only` writes a provisional index without fetching (titles from
   slugs) — useful for local dev.

### 3.1 Path → kind rules (first match wins)

| Pattern | kind |
|---|---|
| `-blog$` | blog |
| `^/(tr/)?(solutions-for-|.*-icin-cozumler$)` | solution |
| `success-stories`, `basari-oykuleri`, `all-blog-posts-resources`, `tum-blog-yazilari-kaynaklar`, `webinars-resources`, `glossary`, `savings-calculator(s)`, `*-hesaplama`, `*-raporu`, `*-report`, `*-webinar`, `*-ebook`, `*-whitepaper` | resource |
| `careers`, `kariyer`, `*-engineer*`, `*-manager`, `product-owner`, `*internship*`, `*-specialist`, `*-developer` | career |
| `sestek-vs-*`, `about-us`, `whysestek`, `contact`, `iletisim`, `demos`, `request-a-demo`, `demo-isteyin`, `is-ortaklari`, `ar-ge`, `*-policy`, `*-politikasi`, `cookie-policy`, `kullanim-kosullari`, `compliance-security`, `uyumluluk-ve-guvenlik`, `security`, `data-subject-application-form` | page |
| slug contains `-with-`, `-ile-`, `increased`, `automated`, `automates`, `elevated`, `strengthened`, `slices`, `boosted`, `nasil-`, `-artirdi`, `-dusurdu`, `-hizlandirdi`, `-tasidi`, `-guclendiriyor` | case-study |
| `knovvu*`, `*-knovvu`, `agentic-ai`, `agent-copilot`, `agent-assist`, `virtual-agent`, `virtual-translator`, `banking-bot`, `bankacilik-botu`, `collection-ai-agent`, `scheduling-ai-agent`, `conversational-ivr`, `conversational-analytics`, `conversation-analytics`, `interaction-analytics`, `speech-analytics`, `speech-recognition`, `text-to-speech`, `voice-biometrics`, `musteri-dogrulama`, `temsilci-kimlik-dogrulama`, `real-time-guidance`, `whatsapp-customer-service`, `aqm`, `wfm`, `*-analytics` | product |
| anything else | page |

Verified against the current sitemap: 56 product, 8 solution, 42 case-study,
323 blog, 20 resource, 7 career, 93 page.

### 3.2 Curated seeds (starting set — extend)

`priority` 100 = flagship products, 90–95 core products/solutions, 60–70 key
pages, 40–50 resources. Keywords are aliases the page copy may lack.

```
/agentic-ai 100 [agentic, ai agent, autonomous agent, voice agent, knovvu]
/knovvu-agent-copilot 100 [copilot, agent assist, real-time guidance, live translation]
/virtual-agent 100 [virtual assistant, chatbot, voicebot, self-service]
/conversational-ivr 95 [ivr, natural language ivr]
/speech-analytics 95 [call analytics, conversation intelligence, quality, compliance]
/speech-recognition 95 [asr, stt, speech to text, transcription]
/voice-biometrics 95 [voiceprint, authentication, caller verification, fraud]
/conversational-analytics 90 · /interaction-analytics 85 · /speech-analytics-knovvu 90
/speech-recognition-knovvu 85 · /voice-biometrics-knovvu 85 · /real-time-guidance-knovvu 85
/collection-ai-agent 85 [debt collection] · /aqm 85 [automated quality management]
/wfm 80 [workforce management] · /banking-bot 80 · /virtual-translator 80 · /whatsapp-customer-service 80
/solutions-for-banking 90 [bank, finance] · /solutions-for-insurance 90 [insurer, claims]
/success-stories 70 [case studies, customers, references] · /demos 70 [demo, try]
/whysestek 60 · /about-us 60 · /careers 50 · /compliance-security 50 [gdpr, kvkk, iso 27001]
/webinars-resources 50 · /savings-calculators 50 [roi] · /glossary 40 · /sestek-vs-{nice,verint,callminer} 40
TR mirrors: /tr/agentic-ai 100, /tr/agent-copilot 100, /tr/virtual-agent 100 [sanal asistan, chatbot],
/tr/speech-analytics 95 [konuşma analizi], /tr/speech-recognition-knovvu 90 [konuşma tanıma],
/tr/text-to-speech 90 [metin okuma, tts], /tr/voice-biometrics 90 [ses biyometrisi],
/tr/musteri-dogrulama 80, /tr/bankacilik-botu 80, /tr/aqm 85, /tr/bankalar-icin-cozumler 90,
/tr/telekom-icin-cozumler 90, /tr/basari-oykuleri 70, /tr/demo-isteyin 70, /tr/kariyer 50,
/tr/uyumluluk-ve-guvenlik 50 [kvkk], /tr/is-ortaklari 50, /tr/maliyet-tasarrufu-hesaplama 50
```

---

## 4. Index API (cloud app)

`src/app/api/search/index/route.ts`

- **GET** → freshest index: KV binding `SEARCH_INDEX`, key `index` → else the
  JSON bundled at build time (`import bundled from "…/public/search-index.json"`).
  Headers: `Content-Type: application/json; charset=utf-8`,
  `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`,
  `ETag: "<version>"` (honour `If-None-Match` → 304),
  `X-Search-Index-Source: kv|bundled`. CORS header only for
  `https://*.webflow.io` and `https://(www.)sestek.com` origins.
- **POST** → body = `SearchIndex`, `Authorization: Bearer <SEARCH_INDEX_SECRET>`.
  Validate shape (`version` string, non-empty `docs`, every `path` starts with
  `/`), `kv.put("index", body)`. 401 / 422 / 503 (no binding or secret).
- **OPTIONS** → 204 with the CORS headers.
- `export const dynamic = "force-dynamic"`; read env via
  `getCloudflareContext().env` from `@opennextjs/cloudflare`.
- Secret: `npx webflow apps env-vars set SEARCH_INDEX_SECRET --secret`.
  KV: `wrangler.json → kv_namespaces: [{ binding: "SEARCH_INDEX", id: … }]`
  (**ASK** for the namespace id / how Webflow Cloud provisions it).

### 4.1 Freshness pipeline (answers "what happens when the sitemap changes")

`.github/workflows/search-index.yml` in the cloud-app repo:

- Triggers: `schedule` nightly (e.g. `17 2 * * *`), `workflow_dispatch`,
  `repository_dispatch: site-published` (a Webflow site-publish webhook can
  call the GitHub dispatch endpoint if a token is provided — optional).
- Steps: `npm ci` → `tsx scripts/build-search-index.ts --site $SEARCH_SITE`
  → `curl -X POST $SEARCH_INDEX_URL -H "Authorization: Bearer $SECRET"
  --data-binary @public/search-index.json` → commit the refreshed
  `public/search-index.json` if changed (keeps the bundled fallback fresh
  for the next deploy).
- Secrets/vars: `SEARCH_INDEX_SECRET`; optional `SEARCH_SITE`,
  `SEARCH_INDEX_URL` (defaults to the production URLs).
- Result: the live index updates **without a redeploy**; GET serves the KV
  copy, caches bust via the new `version`.

---

## 5. Ranking (client-side, own code — no Fuse/Lunr/Algolia)

`src/lib/search/normalize.ts`

- `normalizeText(s)`: Turkish-aware folding **before** lowercasing —
  `ç→c ğ→g ı→i I→i İ→i i̇→i ö→o ş→s ü→u` — then `toLowerCase()`, NFD, strip
  `̀–ͯ`, normalise curly quotes, collapse whitespace. Write the map
  with `\u` escapes so the bundle survives being served without a charset.
  Apply the **same** function to every doc field and to the query.
- `tokenize(q)`: split on non `[a-z0-9+#]`, drop tokens < 2 chars, dedupe.

`src/lib/search/rank.ts` — `prepare(docs)` once per load (normalised title,
title words, summary, path words, keywords), then `rankPrepared(prepared, q,
{ limit: 10, locale })` on each debounced keystroke.

| Match | Weight |
|---|---|
| whole normalised query === title | +100 |
| title contains the whole query (len ≥ 3) | +60 |
| token starts the title | +40 |
| token starts a word in the title | +30 |
| token anywhere in title | +20 |
| token === a keyword | +30 |
| token inside a keyword | +12 |
| token in summary | +8 |
| token in path | +6 |
| every token matched (≥ 2 tokens) | +20 |
| `priority` | + priority × 0.6 |
| kind boost | product 12 · solution 10 · case-study 6 · resource 4 · page 3 · blog 0 · career 0 |

Per token only the best location counts; a doc needs ≥ 1 token hit; results
sorted by score then title; tie-break stable. Return highlight ranges for the
title (compute on the normalised string; only when normalisation preserved
string length, which the Turkish 1:1 map does). Debounce **60 ms**; ranking
500 docs takes < 1 ms.

Idle state ("Quick access"): top-6 docs of the active locale by `priority`.

Unit tests (`node --test` via tsx) must cover: TR folding both ways
(`Sağlık`/`saglik`, `İLETİŞİM`→`iletisim`, `ILIK`→`ilik`), curated product
outranking a blog post that contains the phrase, keyword recall (`voice
agent` → /agentic-ai, `bank` → /solutions-for-banking), locale filter,
highlight ranges, garbage query → 0 results, 500-doc rank < 16 ms, and the
kind rules of §3.1.

---

## 6. UX — full-page palette in Sestek style

Layout (reference: the two-column full-page search from the screenshot, re-skinned):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ▸ SESTEK · SITE SEARCH                                                   │
│ ┌──────────────────────────────────────────────────────────────┐ [Esc]   │
│ │ 🔍  Search products, solutions, stories…                       │        │
│ └──────────────────────────────────────────────────────────────┘        │
├───────────────────────────────────────┬──────────────────────────────────┤
│ QUICK ACCESS / RESULTS                │  (preview of highlighted result) │
│ Go straight to key products…          │   [KIND CHIP]                    │
│ ┌─────────────────────────────────┐   │   Title                          │
│ │ [PR] PRODUCT · /AGENTIC-AI      │   │   Summary                        │
│ │      Agentic AI                 │   │   www.sestek.com/agentic-ai      │
│ │      Autonomous AI agents…      │   │   [ Open page ↗ ]                │
│ └─────────────────────────────────┘   │                                  │
│  … 10 results, active row accented …  │  brand illustration / gradient   │
├───────────────────────────────────────┴──────────────────────────────────┤
│ [↑↓] navigate  [↵] open  [Esc] close                         Sestek      │
└──────────────────────────────────────────────────────────────────────────┘
```

Behaviour

- Opens **full-page** (fixed inset 0, `z-index` above the nav), backdrop =
  page blurred + darkened (`backdrop-filter: blur(14px)`), panel fills the
  viewport with `max-width: var(--container--2xl)` and margin, rounded
  `var(--radius--lg)`. Mobile (< 768px): single column, preview hidden,
  results full width, panel edge-to-edge with 12px margin, `100dvh`.
- Trigger: `[data-search-trigger]` / `[data-search-open]` click; **⌘K /
  Ctrl+K** anywhere; **`/`** when focus is not in an editable field.
- Dialog a11y: `role="dialog" aria-modal="true" aria-label`, focus trap
  (Tab cycles input → Esc button → CTA links), **Esc closes**, focus
  restored to the opener, page scroll locked while open, query cleared on
  close.
- Input: `type="search" role="combobox" aria-autocomplete="list"
  aria-expanded aria-controls aria-activedescendant autocomplete=off
  spellcheck=false maxlength=160`, autofocus on open.
- Results: `role="listbox"` / `role="option" aria-selected`, **↑/↓** wrap,
  **Home/End**, **Enter** navigates (`location.assign(path)`), mouse hover
  sets active, click navigates; ⌘/Ctrl-click keeps native new-tab. Each row:
  kind chip (2–3 letters in a rounded square, magenta on lavender), eyebrow
  `KIND · /PATH` (uppercase, letter-spaced, muted), title with matched
  substrings in `--brand-primary--500`, summary (1 line, ellipsis), "↗" on
  the active row. Active row: lavender fill (`--surface--light`) + 3px
  magenta left bar.
- Preview column (≥ 768px): mirrors the active result — kind chip, large
  title (`--heading--h2`), summary, host + path in muted text, primary button
  **"Open page ↗"** (magenta fill, white text, `--radius--full`). Background:
  soft Sestek gradient (lavender → white) or the Soft Gradient BG brand
  treatment; no stock imagery required.
- States: **idle** (Quick access: top-priority pages of the locale),
  **loading** (skeleton rows), **results**, **empty**: "We couldn't find a
  matching page." + hint + CTAs **Request a demo** (`/request-a-demo`,
  TR `/tr/demo-isteyin`) and **Contact** (`/contact` — **ASK** exact path).
  **No assistant CTA.**
- Locale: `/tr` prefix or `<html lang="tr">` → TR strings + TR-only results;
  otherwise EN. Strings in a small `messages` map (EN default).
- `prefers-reduced-motion`: no scale/blur animation, instant open.
- Styling: shadow root, class prefix `sst-search-*`, colours/spacing/radius
  from the site variables listed in §0 with neutral fallbacks; font inherited.

Strings (EN / TR): placeholder "Search products, solutions, stories…" /
"Ürün, çözüm, başarı öyküsü ara…"; idle label "Quick access" / "Hızlı
erişim"; results "Results" / "Sonuçlar"; empty "We couldn't find a matching
page." / "Eşleşen bir sayfa bulamadık."; button "Open page" / "Sayfayı aç";
footer hints "navigate · open · close" / "gezin · aç · kapat"; kinds Product/
Ürün, Solution/Çözüm, Customer story/Başarı öyküsü, Blog, Resource/Kaynak,
Careers/Kariyer, Page/Sayfa.

---

## 7. Frontend delivery

> **The frontend is already written and tested** in the sestek repo:
> `roicool/sestek → site-search/` (engine + tests, full-page palette, embed,
> esbuild bundle script, sitemap crawler, fixture index). Copy it as-is per
> `site-search/README.md`; this section describes what it does and how it
> is wired. Only the API/KV/workflow (§4) remain to be built here.

- Write once: `src/components/SiteSearch/{SiteSearch.tsx, useSearch.ts,
  styles.ts, embed.tsx}`; engine in `src/lib/search/` shared with the API.
- **Embed (primary):** `embed.tsx` → esbuild IIFE →
  `public/site-search.v<major>.js` (+ sourcemap, not committed). Self-mounts
  a `<div data-site-search-host>` on `<body>` with an open shadow root,
  injects `styles.ts`, binds triggers + hotkeys, exposes
  `window.__sestekSiteSearch = { open, close, toggle, version }`. Config via
  script `data-*`: `data-index`, `data-contact`, `data-demo`, `data-locale`.
  **Alias React → Preact** in the esbuild config (`react`, `react-dom`,
  `react-dom/client`, `react/jsx-runtime` → `preact/compat*`): ~35 KB min
  instead of ~205 KB. Add `"prebuild": "node scripts/bundle-search.mjs"` so
  every deploy rebuilds it. Version in `package.json.searchVersion`; bump the
  major to change the filename (rollback = point the tag at the old file).
- **App surface (secondary):** export `<SiteSearch/>` for Next pages with
  `inlineCss` (renders `<style>` inline). No DevLink export — `devlink-export`
  pulls Webflow components INTO the app, it does not push React to Designer.
- **Webflow wiring** (site Custom Code → footer):
  `<script defer src="https://www.sestek.com/demos/site-search.v1.js"></script>`
  and `data-search-trigger` on the nav search icon; remove the old
  `search.js` overlay block. Staging loads the script from the production
  origin (the index fetch is CORS-enabled for webflow.io).

---

## 8. File layout (cloud-app repo)

```
src/app/api/search/index/route.ts        GET / POST / OPTIONS
src/components/SiteSearch/SiteSearch.tsx  dialog + combobox + listbox + preview
src/components/SiteSearch/useSearch.ts    fetch-once (sessionStorage 1h), debounce, rank
src/components/SiteSearch/styles.ts       SEARCH_CSS string (shadow root + inline)
src/components/SiteSearch/embed.tsx       IIFE entry
src/lib/search/{types,normalize,rank,kinds,messages}.ts + rank.test.ts
src/data/search-seeds.ts
scripts/build-search-index.ts             crawler
scripts/bundle-search.mjs                 esbuild IIFE (Preact alias)
public/search-index.json                  committed fallback (refreshed by CI)
public/site-search.v1.js                  built by prebuild
wrangler.json                             KV binding SEARCH_INDEX
.github/workflows/search-index.yml        nightly crawl → POST → commit
package.json: searchVersion; scripts search:index, search:index:sitemap, search:bundle, search:test, prebuild
devDependencies: esbuild, tsx, preact
```

---

## 9. Acceptance criteria

- [ ] ⌘K / Ctrl+K and the nav icon open the full-page palette on every published page; `/` opens when not typing.
- [ ] Index fetched once per session; no network per keystroke; ranking < 16 ms for 550 docs.
- [ ] TR queries match with/without diacritics; `/tr` pages show TR-only results with TR strings.
- [ ] Curated products/solutions rank above blog posts for head terms ("agentic ai", "speech analytics", "voice biometrics", "konuşma analizi").
- [ ] Full keyboard support (↑↓ Home End Enter Esc Tab-trap), focus restored, scroll locked, axe clean.
- [ ] Preview column follows the active result; "Open page" navigates; mobile single-column.
- [ ] Empty state shows Request a demo + Contact only (no assistant).
- [ ] Shadow-root isolated; uses site CSS variables; matches Sestek brand (magenta accent, lavender surfaces, rounded-lg).
- [ ] `GET /demos/api/search/index` serves KV when present (`X-Search-Index-Source: kv`), bundled otherwise; ETag/304 works; CORS only for webflow.io.
- [ ] Nightly workflow crawls the sitemap, POSTs to KV and commits the fallback; a new page appears in search by the next morning without a deploy.
- [ ] Versioned embed filename; rollback by changing the script tag.

## 10. Rollout

1. Implement engine + tests → crawler → API + KV → palette + embed.
2. Deploy app; run `search:index` once for the first real index (titles from
   H1s, not slugs); wire the secret in the app and in GitHub.
3. Add the script tag on staging (`rc-sestek.webflow.io`), validate EN/TR
   queries and the ranking with the maintainer, then publish to production.
