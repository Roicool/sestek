# Sestek Cloud App

Webflow sitesine mount edilen **Webflow Cloud** uygulaması — demo sayfaları ve
özel servisler (API endpoint'leri, form işleme, hesaplayıcılar…) için.
Astro + React + Cloudflare Workers üzerinde çalışır; ana kütüphaneden (js/,
css/) ve `webflow-components/` paketinden tamamen bağımsızdır.

Mount path: **`/demos`** → yayında `https://<site-domain>/demos` altında yaşar.
(Path'i değiştirirsen `astro.config.mjs`'teki fallback'i de güncelle — ikisi
aynı olmalı.)

## İçerik

| Route | Ne |
|---|---|
| `/demos/` | Demo hub ana sayfası (server-side render) |
| `/demos/api/hello` | Örnek JSON API endpoint'i |

## Lokal geliştirme

```bash
cd webflow-cloud-app
npm install
npm run dev        # Astro dev server (hızlı, hot reload)
npm run preview    # Gerçek Workers runtime'ında build + önizleme (wrangler dev)
```

## İlk deploy (tek seferlik, interaktif)

CLI daha önce `webflow auth login` ile yetkilendirildiyse ekstra giriş gerekmez.

```bash
cd webflow-cloud-app
npm run deploy     # = webflow cloud deploy
```

CLI interaktif olarak soracak:

1. **Workspace** → Roicool
2. **App** → yeni app oluştur (isim: `sestek-demos` gibi) ve **siteye bağla**
   (rc-sestek) — "new domain" değil, site-attached seç
3. **Mount path** → `/demos`
4. Onay → build + upload + deploy

Mount path'in sitede aktifleşmesi için Webflow **sitesinin publish edilmesi**
gerekir (CLI `--auto-publish` bayrağıyla bunu kendisi de yapabilir:
`npx webflow cloud deploy --auto-publish`).

Deploy sonrası `webflow.json`'a `cloud.app_id` / `cloud.environment_id`
alanları yazılırsa onları commit'le — sonraki deploy'lar sorusuz geçer.

## Güncelleme deploy'u

```bash
cd webflow-cloud-app
npm run deploy
```

> Not: Dashboard'daki "New app" GitHub akışını **kullanmıyoruz** — o akış repo
> kökünde framework projesi bekler; bizim app alt klasörde olduğu için deploy
> CLI üzerinden yapılır. İstenirse components'taki gibi bir GitHub Action ile
> otomatikleştirilebilir.

## Yeni demo sayfası ekleme

`src/pages/` altına dosya koy — route otomatik oluşur:

- `src/pages/voice-demo.astro` → `/demos/voice-demo`
- `src/pages/api/lead.ts` → `/demos/api/lead` (POST/GET handler'lı servis)

React island gerekiyorsa component'i `src/components/` altına yaz ve `.astro`
sayfasında `client:load` / `client:visible` direktifiyle kullan.

## Ortam değişkenleri / secret'lar

```bash
npx webflow apps env-vars list
npx webflow apps env-vars set MY_KEY value
npx webflow apps env-vars set API_SECRET --secret   # gizli değer, prompt'tan
```

## Veri saklama

Webflow Cloud, SQLite / KV / Object Storage binding'leri sunar — ihtiyaç
olduğunda `wrangler.json`'a binding ekleyip Astro tarafında
`Astro.locals.runtime.env` üzerinden erişilir (bkz. Webflow Cloud docs →
Storage).
