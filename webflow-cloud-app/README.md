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
