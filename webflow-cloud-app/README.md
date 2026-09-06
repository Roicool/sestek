# Sestek Cloud App

Webflow sitesine mount edilen **Webflow Cloud** uygulaması — demo sayfaları ve
özel servisler (API endpoint'leri, form işleme, hesaplayıcılar…) için.
**Next.js 16 (App Router) + React 19**, Cloudflare Workers üzerinde çalışır;
ana kütüphaneden (js/, css/) ve `webflow-components/` paketinden tamamen
bağımsızdır.

Mount path: **`/demos`** → yayında `https://<site-domain>/demos` altında
yaşar. `basePath`/`assetPrefix`'i **elle ayarlama** — `webflow cloud deploy`
mount path'ten kendisi enjekte ediyor.

> Node **22.12+** gerekir (hem Next 16 hem Webflow CLI için).

## İçerik

| Route | Ne |
|---|---|
| `/demos/` | Demo hub ana sayfası (server-side render) |
| `/demos/api/hello` | Örnek JSON API endpoint'i |

## Lokal geliştirme

```bash
cd webflow-cloud-app
npm install
npm run dev        # localhost:3000 (lokalde basePath yok)
```

## Deploy

CLI daha önce `webflow auth login` ile yetkilendirildiyse ekstra giriş gerekmez.

```bash
cd webflow-cloud-app
npm run deploy     # = webflow cloud deploy
```

İlk çalıştırmada CLI sorar: **Attach to an existing Webflow site** →
site: rc-sestek → app: mevcut **sestek-app**'i seç (yoksa oluştur) →
environment: main → mount path: **`/demos`**. Site publish sorusuna Yes de
(mount'un aktifleşmesi için gerekli; `--auto-publish` bayrağı da var).

Deploy sonrası CLI `webflow.json`'a `cloud.site_id` / `app_id` /
`environment_id` yazarsa onları **commit'le** — sonraki deploy'lar sorusuz
geçer.

> Not: Dashboard'daki "New app" GitHub akışını **kullanmıyoruz** — o akış repo
> kökünde framework projesi bekler; bizim app alt klasörde olduğu için deploy
> CLI üzerinden yapılır. İstenirse components'taki gibi bir GitHub Action ile
> otomatikleştirilebilir.

## Yeni demo sayfası ekleme

`src/app/` altına klasör + `page.tsx` koy — route otomatik oluşur:

- `src/app/voice-demo/page.tsx` → `/demos/voice-demo`
- `src/app/api/lead/route.ts` → `/demos/api/lead` (GET/POST handler'lı servis)

Client-side interaktivite gereken component'lere `"use client"` direktifi
ekle; varsayılan her şey server component'tir.

## Ortam değişkenleri / secret'lar

```bash
npx webflow apps env-vars list
npx webflow apps env-vars set MY_KEY value
npx webflow apps env-vars set API_SECRET --secret   # gizli değer, prompt'tan
```

## Veri saklama

Webflow Cloud, SQLite / KV / Object Storage binding'leri sunar — ihtiyaç
olduğunda binding tanımlayıp route handler'larda Cloudflare env üzerinden
erişilir (bkz. Webflow Cloud docs → Storage).

## Site Search (⌘K)

Tüm siteyi (EN + `/tr`) kapsayan komut paleti araması. İki parçadan oluşur:

| Parça | Nerede | Ne yapar |
|---|---|---|
| Embed | `public/site-search.v1.js` (kaynak `src/components/SiteSearch/embed.tsx`) | Webflow sitesine tek `<script>` ile eklenir; `<body>`'ye shadow root ile mount olur, ⌘K / Ctrl+K ve `[data-search-trigger]` / `[data-search-open]` elemanlarını bağlar. React yerine Preact ile ~35 KB. |
| Index API | `src/app/api/search/index/route.ts` → `GET/POST /demos/api/search/index` | Index JSON'unu servis eder (KV varsa ondan, yoksa build'e gömülü `public/search-index.json`). POST ile KV'deki index yenilenir. |
| Motor | `src/lib/search/` | TR-duyarlı normalizasyon (`saglik` → Sağlık), kendi sıralama algoritmamız (Fuse/Lunr yok), `kinds.ts` path → tür sınıflandırması. `npm run search:test`. |
| Crawler | `scripts/build-search-index.ts` | Sitemap'teki her sayfayı çekip H1 / meta description / dil çıkarır, `src/data/search-seeds.ts` içindeki elle bakılan öncelik ve eş anlamlıları ekler, `public/search-index.json` yazar. |

### Webflow'a ekleme

Site Settings → Custom Code → **Footer**:

```html
<script defer src="https://www.sestek.com/demos/site-search.v1.js"></script>
```

Nav'daki arama ikonuna `data-search-trigger` attribute'u yeter (mevcut `search.js`
tetikleyicisiyle aynı attribute; eski `search.js` bloğu ve overlay'i kaldırılır).
İsteğe bağlı script attribute'ları: `data-index` (index URL), `data-contact`,
`data-assistant` (boş sonuç CTA'ları), `data-locale` (`en`/`tr`, varsayılan
`/tr` yolundan ya da `<html lang>`'den algılanır).

Staging'de (`rc-sestek.webflow.io`) app ayrı origin'de olduğu için script
`https://www.sestek.com/demos/...` üzerinden yüklenir; index isteği CORS'lu
(webflow.io origin'lerine izin verilir).

### Index güncelliği (sitemap değişince ne olur?)

Index, deploy'dan bağımsız olarak yenilenir:

1. `.github/workflows/search-index.yml` her gece (02:17 UTC), elle
   (workflow_dispatch) veya `repository_dispatch: site-published` ile çalışır:
   canlı siteyi sitemap'ten tarar → `POST /demos/api/search/index` ile KV'ye
   yazar → değişen `public/search-index.json`'u commit'ler (deploy fallback'i).
2. `GET` her zaman KV'deki en yeni index'i döner; KV boşsa build'e gömülü JSON.
   `ETag = version`, tarayıcı 5 dk, edge 1 gün + stale-while-revalidate.

Tek seferlik kurulum:

```bash
# 1) KV binding'i wrangler.json'da tanımlı (SEARCH_INDEX) — deploy'da Webflow Cloud sağlar.
#    wrangler.json normalde .gitignore'da (CLI üretir); binding kaybolmasın diye zorla
#    commit'lendi. `webflow cloud deploy` dosyayı yeniden yazarsa binding'i geri ekle.
# 2) app secret'ı
npx webflow apps env-vars set SEARCH_INDEX_SECRET --secret
# 3) GitHub → Settings → Secrets → Actions → SEARCH_INDEX_SECRET (aynı değer)
# 4) ilk gerçek index (lokalde, ağ erişimi olan yerde) ve deploy
npm run search:index && npm run deploy
```

Elle komutlar: `npm run search:index` (canlı siteyi tara), `npm run
search:index:sitemap` (sadece sitemap'ten geçici index, sayfa çekmeden),
`npm run search:bundle` (embed'i derle; `prebuild` ile deploy'da otomatik),
`npm run search:test`.

Yeni bir sayfa türü eklendiğinde `src/lib/search/kinds.ts`'e kural, öne
çıkarılacak sayfalara `src/data/search-seeds.ts`'e `priority`/`keywords`
girilir. Sürüm: `package.json → searchVersion`; major değişince dosya adı
(`site-search.v2.js`) değişir, rollback = script tag'ini eski dosyaya çevirmek.
