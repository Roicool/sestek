# Webflow Apps — Code Components & Cloud App Rehberi

> Bu doküman, sestek reposundaki iki Webflow entegrasyon sisteminin —
> **Code Components** (`webflow-components/`) ve **Cloud App**
> (`webflow-cloud-app/`) — tam kullanım rehberidir: kurulum, günlük akış,
> mimari kararlar ve bilinen tuzaklar. Kısa özet için `PROJECT.md`'ye,
> CDN kütüphanesi için `CDN-LINKS.md`'ye bak.

---

## Büyük Resim

Repo'da üç ayrı dağıtım kanalı yaşar — birbirine karışmaz:

| Kanal | Klasör | Nereye gider | Nasıl |
|---|---|---|---|
| **CDN kütüphanesi** | `js/`, `css/` | Webflow custom code (jsDelivr) | main'e merge = yayın |
| **Code Components** | `webflow-components/` | Webflow **Designer** (canvas'a sürüklenen React componentleri) | main push → GitHub Action → DevLink import |
| **Cloud App** | `webflow-cloud-app/` | Yayındaki sitenin `/demos` path'i (Next.js, SSR) | main push → Webflow Cloud GitHub entegrasyonu |

```
┌────────────────────── github.com/Roicool/sestek (main) ──────────────────────┐
│                                                                              │
│  js/ css/ ────────────► jsDelivr CDN ────────► Webflow custom code           │
│                                                                              │
│  webflow-components/ ─► GitHub Action ───────► Workspace Library             │
│                         (devlink import)       └─► Designer'da Install       │
│                                                                              │
│  webflow-cloud-app/ ──► Webflow Cloud build ─► rc-sestek.webflow.io/demos    │
│                         (GitHub entegrasyonu)                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 1) Code Components — `webflow-components/`

React componentlerini Webflow Designer'a native component gibi sokar
(DevLink **import**). Tasarımcı canvas'a sürükler, prop'ları sağ panelden
ayarlar.

### Dosya yapısı

```
webflow-components/
├── webflow.json          # library manifest — id: sestek-code-components (SİLME)
├── package.json          # bağımsız paket
└── src/
    ├── Foo.tsx           # normal React componenti
    └── Foo.webflow.tsx   # declareComponent tanımı (default export)
```

### Yeni component ekleme

1. `src/Bar.tsx` — React componenti (React 18, client-side).
2. `src/Bar.webflow.tsx`:

```tsx
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { Bar } from "./Bar";

export default declareComponent(Bar, {
  name: "Bar",
  group: "Sestek",
  props: {
    title: props.Text({ name: "Title", defaultValue: "..." }),
    count: props.Number({ name: "Count", defaultValue: 3, min: 1, max: 10 }),
    on:    props.Boolean({ name: "Enabled", defaultValue: true }),
    style: props.Variant({ name: "Style", options: ["A", "B"] }),
  },
  options: { ssr: false },   // WebGL/canvas gibi client-only işlerde
});
```

3. main'e push — `webflow.json`'daki glob (`src/**/*.webflow.tsx`) yeni
   dosyayı otomatik alır, CI yayınlar.

Prop tipleri: `Text/String, Number, Boolean, Variant, Link, Image, Slot,
RichText, TextNode, Id, Visibility, Attributes` (renk tipi YOK — hex için
Text kullan).

### Yayın akışı

- **Otomatik (normal yol):** `webflow-components/**` değişen her main
  push'unda `.github/workflows/webflow-components-publish.yml` çalışır →
  `webflow devlink import`. Secret: `WEBFLOW_API_TOKEN`.
- **Manuel:** `cd webflow-components && npm install && npx webflow auth
  login && npx webflow devlink import`.
- **Designer tarafı:** library güncellemesi sitelere otomatik yansıMAZ —
  Add panel → Libraries → "Sestek Code Components" → **update** onayı
  gerekir. (Bilinçli Webflow davranışı: yayındaki site habersiz değişmez.)

### Mevcut componentler

**Shader Gradient BG** — animasyonlu WebGL gradient arka planı.
Preset'ler: Sestek Brand / Sestek Deep / Halo / Custom (tür + 3 hex renk).
Diğer prop'lar: Speed, Grain, Brightness, Animate, Pixel density,
Min height. Performans: giriş chunk'ı ~12KB; three.js içeren ~1MB'lık
parça IntersectionObserver + `React.lazy` ile ancak viewport'a 300px
yaklaşınca iner. `prefers-reduced-motion` → statik kare.

### Tuzaklar (yaşandı, doğrulandı)

- **Workspace token şart.** Site token'ları `devlink import`'ta
  "invalid or not authorized" verir. Token: Webflow dashboard →
  *Workspace* settings → API access → **Components: Read+Write** scope'u.
  (Arayüzde kategori adı "Components"tır, "Code components" değil;
  "DevLink Export" ayrı ve bu iş için gereksizdir.)
- **`webflow.json` → `library.id`'yi silme.** CI interaktif soru
  soramaz; id yoksa yayın atlanır. İlk id, ilk lokal interaktif import'ta
  CLI tarafından yazıldı.
- **`@shadergradient/react` gizli bağımlılık:** `three` ve
  `@react-three/fiber`'ı peer olarak bildirmez ama import eder —
  package.json'dan kaldırma, build patlar.
- Node 20 çalışır ama CLI resmi olarak 22+ ister (EBADENGINE uyarısı
  zararsız).

---

## 2) Cloud App — `webflow-cloud-app/`

Sitenin `/demos` path'ine mount edilmiş **Next.js 16 (App Router) +
React 19** uygulaması. Cloudflare Workers üzerinde SSR (OpenNext). Demo
sayfaları + API servisleri burada.

### Canlı adresler

| Ne | URL |
|---|---|
| Demo hub | https://rc-sestek.webflow.io/demos |
| Speech Recognition | https://rc-sestek.webflow.io/demos/speech-recognition |
| Text-to-Speech | https://rc-sestek.webflow.io/demos/tts |
| Footer CMS API | https://rc-sestek.webflow.io/demos/api/footer-links |

### Deploy

- **Otomatik (normal yol):** Webflow Cloud'un GitHub entegrasyonu —
  dashboard'da app **sestek-demos**: branch `main`, **root directory
  `./webflow-cloud-app`**, mount `/demos`. Klasöre dokunan her main
  push'unda Webflow kendi sunucusunda build + deploy eder. Durum:
  dashboard → rc-sestek → Webflow Cloud → sestek-demos → Deployments.
- **Manuel yedek:** `cd webflow-cloud-app && npm run deploy`
  (Node **22.12+** şart — `brew install node@22`) veya Actions'taki
  manuel "Deploy Webflow Cloud App" workflow'u (token'da **Cloud apps:
  Read+Write** scope'u ister).
- **`basePath`'i elle yazma** — `next.config.ts` bilinçli boştur; deploy
  mount path'ten kendisi enjekte eder. Mount değişecekse dashboard'dan
  değiştirilir.
- CLI'ın build artıkları (`wrangler.json`, `next.config.webflow.ts`,
  `open-next.config.ts`…) `.gitignore`'dadır — commit'leme.

### Dosya yapısı (önemli kısımlar)

```
webflow-cloud-app/
├── webflow.json                    # cloud.app_id + siteId (commit'li)
├── webflow/                        # DevLink EXPORT çıktısı (navbar vb.)
│   ├── Navbar.tsx                  #   Designer'daki gerçek navbar → React
│   └── css/variables.css          #   sitenin GERÇEK design token'ları
└── src/
    ├── app/
    │   ├── layout.tsx              # Navbar + SiteFooter + CDN css linkleri
    │   ├── site-runtime.tsx        # gsap + nav.js + link-underline yükleyici
    │   ├── page.tsx                # demo hub (kart listesi: DEMOS dizisi)
    │   ├── tts/  speech-recognition/   # demo sayfaları
    │   └── api/                    # footer-links, demos/tts, demos/transcribe
    ├── components/
    │   ├── site-footer.tsx         # basit custom footer (server component)
    │   └── demos/                  # DemoShell + demo componentleri
    └── lib/                        # footer-links.ts, demo-config.ts
```

### Site görünümü nasıl sağlanıyor

Dört katman:

1. **DevLink export** (`webflow/`): Designer'daki gerçek Navbar (+ sitenin
   gerçek CSS değişkenleri ve sınıfları, `@scope` ile izole). Designer'da
   navbar değişirse: `npx webflow devlink export` → commit → push.
   (Export filtresi `webflow.json → devlink-export` bölümünde kayıtlı.)
2. **CDN runtime** (`site-runtime.tsx`): gsap + `js/core/nav.js`
   (`Sestek.initNav()` — mega-menü/hamburger/autohide) +
   `js/effects/link-underline.js`; CSS olarak `css/core/nav.css` ve
   `css/effects/link-underline.css` layout'ta `<link>` ile.
3. **Custom footer** (`site-footer.tsx` + `.sfooter` stilleri): DevLink
   footer'ı Collection List + grid utility boşlukları yüzünden kırık
   render olduğundan kullanılmıyor. CMS kolonları server-side çekilir.
4. **Tema**: açık renk; token'lar `globals.css → :root`.

> ⚠️ **`docs/RC-STRUCTURE-REFERENCE.css`'i runtime'da ASLA yükleme.**
> O dosya şablon/blueprint'tir — placeholder gri paletleri, export'la
> gelen gerçek marka değerlerini ezer. Gerçek token'lar
> `webflow/css/variables.css`'te zaten var.

### Demolar — provider mimarisi

Araştırma sonucu (sestek.com/demos = "Knovvu Demos"): Sestek'in halka
açık anahtarsız API'si yok. Bu yüzden her demo iki katmanlı:

```
Component → kendi API route'umuz (env-gated proxy) → Sestek API
                └─ env yoksa → tarayıcı-native fallback (etiketli)
```

| Demo | Fallback (bugün) | Gerçek (env girilince) |
|---|---|---|
| TTS | `speechSynthesis` — "önizleme" etiketli | `/api/demos/tts` → `SESTEK_TTS_URL` + `SESTEK_TTS_API_KEY` |
| SR mikrofon | Web Speech API (Chrome/Edge) | WebSocket SR (protokol Sestek'ten beklenecek) |
| SR dosya | "Simüle" etiketli örnek yanıt | `/api/demos/transcribe` → `SESTEK_SR_URL` + `SESTEK_SR_API_KEY` |
| Virtual Agent | "Yakında" kartı | Knovvu webchat script'i — `integrationId` + region gerekli |

Kural: mock çıktı **her zaman** simülasyon/önizleme olarak etiketlenir.

### Yeni demo ekleme (tarif)

1. `src/app/<slug>/page.tsx` — `DemoShell` ile sayfa.
2. `src/components/demos/<slug>-demo.tsx` — `"use client"` etkileşim
   componenti (stiller `globals.css`'teki `demo-*` sınıfları).
3. Gerekirse `src/app/api/demos/<slug>/route.ts` — env-gated proxy.
4. `src/app/page.tsx → DEMOS` dizisine hub kartı ekle.
5. Push → otomatik deploy.

### Ortam değişkenleri

Dashboard → sestek-demos → **Environment variables** (secret işaretle);
değişiklik "**Deploy latest commit**" ile aktifleşir.

| Değişken | Ne için | Kaynak |
|---|---|---|
| `WEBFLOW_CMS_TOKEN` | Footer CMS kolonları | rc-sestek **site** token'ı, CMS: Read |
| `SESTEK_TTS_URL` / `SESTEK_TTS_API_KEY` | Gerçek TTS | Sestek/Knovvu ekibi |
| `SESTEK_SR_URL` / `SESTEK_SR_API_KEY` | Gerçek SR (dosya) | Sestek/Knovvu ekibi |

### Lokal geliştirme

```bash
cd webflow-cloud-app
npm install
npm run dev          # localhost:3000 (basePath'siz)
npm run build        # prod build kontrolü
```

---

## 3) Sorun Giderme

| Belirti | Sebep / Çözüm |
|---|---|
| CI "yayın atlandı" uyarısı | `WEBFLOW_API_TOKEN` secret'ı yok veya `library.id` silinmiş |
| `devlink import`: "invalid or not authorized" | Site token kullanılmış → **workspace** token üret (Components R+W) |
| Cloud deploy: "Astro/Next requires Node 22" | Lokal Node eski → `brew install node@22` + PATH |
| Deploy sonrası sayfa CSS'siz/bozuk | Mount path ≠ beklenen — dashboard'da `/demos` olduğunu doğrula |
| Footer kolonları boş | `WEBFLOW_CMS_TOKEN` girilmemiş veya koleksiyon slug'ları `src/lib/footer-links.ts → SLUG_HINTS` ile eşleşmiyor |
| Navbar menüleri açılmıyor | CDN erişimi/script hatası — console'da `[SiteRuntime]` uyarısına bak |
| Sayfa griye döndü / renkler bozuldu | Birisi RC-STRUCTURE-REFERENCE.css'i runtime'a eklemiş — kaldır |
| Demo "simüle/önizleme" diyor | Normal — gerçek API env'leri girilmemiş (bkz. Ortam değişkenleri) |

---

## 4) Bekleyen İşler

- [ ] Sestek'ten TTS/SR API credential'ları → env'lere gir, istek/yanıt
      şemasını gerçek API ile doğrula, etiketleri kaldır
- [ ] Sestek'ten Knovvu webchat `integrationId` + region → Virtual Agent
      demosu (hazır script embed sarmalayıcısı yazılacak)
- [ ] Gerçek sestek.com/demos ekran görüntüsüyle düzen/kopya birebir
      eşleme (mevcut sayfa araştırmadan rekonstrüksiyon)
- [ ] Videolar bölümü (ürün videoları — kaynak listesi bekleniyor)
- [ ] Sohbette paylaşılmış workspace token'ının rotasyonu (yenisi sadece
      GitHub secret'ta yaşamalı)
