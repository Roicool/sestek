# Sestek — Project Overview

> Premium feel, maximum performance. Every interaction is intentional.

---

## Tech Stack

| Layer | Library / Tool | Version | Notes |
|---|---|---|---|
| Smooth Scroll | [Lenis](https://github.com/darkroomengineering/lenis) | ^1.1.x | Frame-perfect smooth scroll |
| Animation | [GSAP](https://gsap.com) | ^3.12.x | Industry-standard animation engine |
| Scroll Trigger | [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | ^3.12.x | Scroll-driven animations, pinning |
| Bundler | Vanilla / CDN | — | No build step required, CDN-first |

---

## Architecture

```
sestek/
├── js/
│   ├── core/        # Foundation — utils.js, lenis-init.js, nav.js
│   ├── components/  # UI — hero.js, hero-slider.js, marquee.js, scroll-tabs.js,
│   │                #      video-modal.js, video-inline.js, webinar-player.js,
│   │                #      card-marquee.js, section-title.js, text-rotator.js,
│   │                #      story.js, accordion.js, blog-utils.js, site-utils.js,
│   │                #      sticky-utms.js, search.js, badge-swap.js, logo-marquee.js,
│   │                #      process-flow.js, h-scroll.js
│   ├── effects/     # Visual effects — grain.js, btn-glow.js
│   └── animations/  # Reusable presets — height-reveal.js, reveal.js, color-shift.js, orbit.js, count-up.js
├── css/
│   ├── core/        # nav.css, nav-full.css
│   ├── components/  # per-component behavioural CSS (hero, marquee, scroll-tabs,
│   │                #   video-modal, card-marquee, section-title, text-rotator,
│   │                #   story, hero-slider, accordion, search, badge-swap,
│   │                #   logo-marquee, process-flow, h-scroll)
│   ├── effects/     # grain.css, btn-glow.css
│   └── animations/  # reveal.css
├── webflow-components/  # Webflow Code Components (React → Designer, DevLink import)
│                        #   kendi package.json'ı var, CDN'den SERVİS EDİLMEZ
├── webflow-cloud-app/   # Webflow Cloud app (Next.js, /demos mount'u)
│                        #   kendi package.json'ı var, CDN'den SERVİS EDİLMEZ
├── .github/workflows/   # CI: code-components otomatik yayın + cloud manuel yedek
└── docs/            # PROJECT.md, CDN-LINKS.md, fluted-glass.md, gsap-svg.md,
                     #   RC-STRUCTURE-REFERENCE.css
```

---

## CSS Convention — RC Structure Reference

All CSS written in this project **must** use the utility classes and CSS variables defined in  
[`docs/RC-STRUCTURE-REFERENCE.css`](./RC-STRUCTURE-REFERENCE.css) wherever applicable.

### Rules

- **Spacing** → always use `--spacing--*` variables or `.m-*` / `.p-*` / `.gap-*` utility classes. No hardcoded pixel/rem values.
- **Typography** → use `--text--*` scale variables or `.text-*` / `.h*-style` / `.display-*` classes. No arbitrary font sizes.
- **Colors** → use `--brand-primary--*`, `--brand-secondary--*`, `--neutral--*` or semantic tokens (`--surface--*`, `--color-text--*`). No raw hex/rgb values.
- **Border radius** → use `--radius--*` variables or `.rounded-*` classes.
- **Layout** → use `.container-*`, `.grid-*col`, `.col-span-*`, `.flex`, `.stack`, `.row` classes.
- **New custom CSS** → only write it when no existing utility class covers the need. Keep it minimal.

> **Reference file:** `docs/RC-STRUCTURE-REFERENCE.css`  
> Webflow Site ID: `6a15b02be7e45b4ce963410c` · Variable Collection: Base collection  
> All values are fluid `clamp()` based (fluid-min=20rem → fluid-max=90rem)

---

## Versioning

All files follow **Semantic Versioning** (`MAJOR.MINOR.PATCH`).  
Version is declared in the file header comment and bumped on every release.

| Bump | When |
|---|---|
| `PATCH` | Bug fix, minor tweak |
| `MINOR` | New feature, backward-compatible |
| `MAJOR` | Breaking change |

---

## Core Principles

1. **Performance first** — 60fps always. No jank, no layout thrash. Target: PageSpeed 90+.
2. **Premium feel** — Smooth easing curves, intentional timing.
3. **Zero render-blocking scripts** — Every `<script src>` tag must use `defer`. No exceptions.
4. **Zero dependencies beyond declared stack** — Lenis + GSAP only.
5. **CDN-first** — Every file is consumable via jsDelivr without a build step.
6. **RC Structure first** — Always reach for `RC-STRUCTURE-REFERENCE.css` classes and variables before writing custom CSS.

---

## Getting Started (Webflow)

Webflow'da yerel dosya yolu (`/js/init.js`) yoktur. Init kodu Webflow'un Custom Code alanlarına yazılır.

### Page Settings → Custom Code → `<head>` bölümü

```html
<!--
  Webflow IX2 (native Interactions) kapatma — en üste, defer'DEN ÖNCE.
  Sestek animasyonları GSAP ile yönetir; Webflow'un kendi interaction'larının
  araya girip flash/çakışma yapmasını engellemek için body oluşur oluşmaz
  data-wf-ix-vacation="1" basıp gözlemciyi kapatır. (Webflow IX2 KULLANMIYORSAN
  ekle; Designer'da native interaction kullanıyorsan EKLEME.)
-->
<script>
  (function () {
    var mo = new MutationObserver(function (m, obs) {
      if (document.body) {
        document.body.setAttribute("data-wf-ix-vacation", "1");
        obs.disconnect();
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  })();
</script>

<!-- DNS + TLS pre-warm -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- Tüm scriptler defer — render blocking sıfır -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/lenis-init.js" defer></script>
<!-- Kullanılan component scriptleri buraya eklenir -->
```

> **`data-wf-ix-vacation` nedir?** Webflow'un yerleşik IX2 Interactions motorunu
> "tatile" çıkarır (devre dışı bırakır). Inline ve `defer`'den önce çalışması
> şart — yoksa Webflow animasyonu bir kare oynayıp flash yapabilir. Bu satır
> bir MutationObserver ile body'yi bekler, attribute'u basar, kendini kapatır.

### Page Settings → Custom Code → `</body>` öncesi bölümü

```html
<script>
  /*
   * DOMContentLoaded, deferred script'ler bittikten SONRA ateşlenir (spec gereği).
   * Bu yüzden init kodu buraya — inline olmasına rağmen deferred script'lere
   * erişim garantilidir. /js/init.js'e gerek yok.
   */
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initLenis(); // ayarlanmış default feel (duration 1.05, cubic-out)
    // Sestek.initHero(); // hero componenti varsa
  });
</script>
```

> **Neden çalışır?** Inline `<script>` HTML parse edilirken çalışır (deferred'dan önce),
> ama içindeki `addEventListener` callback'i DOMContentLoaded'da çalışır —
> bu event spec gereği deferred script'lerin tamamlanmasını bekler.

---

## ScrollTrigger — Pinli Bölüm Kuralları (ÖNEMLİ)

> Aynı sayfada **birden fazla pinli (`pin: true`) ScrollTrigger** varsa
> (örn. hero + scroll-tabs), bu kurallar **zorunludur**. Aksi halde pinli
> bölümler birbirinin üstüne çöker (pin-spacing yanlış hesaplanır).

### Kural 1 — `refreshPriority` sayfa sırasına göre verilir

`ScrollTrigger.refresh()` çalışırken trigger'lar **`refreshPriority` sırasına**
göre işlenir (yüksek olan önce). Sayfada **üstte** olan pin, kendi pin-spacing'ini
**önce** eklemeli ki altındaki bölümler start/end değerlerini gerçek (pin sonrası)
doküman yüksekliğine göre ölçsün. Bu yüzden: **sayfada üstte = en yüksek priority.**

> İnit çağrılarının **sırası bunu çözmez** — sorun init anında değil, refresh
> anındaki öncelik sırasındadır. Doğru olan yer `refreshPriority`'dir, init sırası değil.

#### refreshPriority Kayıt Tablosu

Yeni bir pinli/scroll-tetikli component eklerken priority'sini sayfadaki
dikey konumuna göre bu tablodan seç (üstteki büyük, alttaki küçük):

| Component | Sayfadaki konum | `refreshPriority` |
|---|---|---|
| `hero.js` (pin) | En üst | `2` |
| `scroll-tabs.js` (pin) | Orta | `1` |
| `h-scroll.js` (pin, sadece desktop) | Sayfaya göre değişir | `data-hscroll-priority` ile ver (default `1`) |
| `reveal.js` (pin değil) | Her yerde | `-1` |

> Yeni bir pin hero ile scroll-tabs arasına girerse `2` ile `1` arasına
> **kesirli değil**, mevcut değerleri yeniden numaralandırarak yerleştir
> (örn. hero=3, yeni=2, scroll-tabs=1). Reveal her zaman en düşük kalsın.

### Kural 2 — Tüm pinler kurulduktan sonra TEK bir refresh

ScrollTrigger, `window.load` (font/görsel/CMS yüklendikten sonra) otomatik bir
refresh tetikler ve o refresh'te tüm trigger'lar `refreshPriority`'ye göre
yeniden sıralanır. `reveal.js` ayrıca kendi `window.load` refresh'ini çağırır.
**Init sırasına güvenme** — priority'ler doğruysa bir tek refresh her şeyi
doğru hizalar. Init bloğunda manuel `ScrollTrigger.refresh()` çağırma
**gerekmez** ve yanlış zamanda çağrılırsa (örn. tüm pinler kurulmadan)
**zarar verir**.

### Kural 3 — Pinli bölümün hiçbir ANCESTOR'ında transform olmasın

ScrollTrigger pin için `position: fixed` kullanır. Pinli elementin herhangi bir
üst elementinde (ancestor) `transform`, `filter`, `perspective` veya
`will-change: transform` varsa, `position: fixed` o ancestor'a göre konumlanır →
pin kayar, bölümler üst üste biner. Pinli `[data-hero]` / `[data-scroll-tabs]`
zincirinde bu özellikleri **kullanma** (Webflow page wrapper'larına dikkat).

DevTools'ta hızlı kontrol:

```js
let el = document.querySelector('[data-scroll-tabs]').parentElement;
while (el) {
  const s = getComputedStyle(el);
  if (s.transform !== 'none' || s.filter !== 'none' ||
      s.perspective !== 'none' || s.willChange.includes('transform'))
    console.warn('PIN KIRAN ANCESTOR:', el);
  el = el.parentElement;
}
```

---

## Webflow Code Components — `webflow-components/`

React componentlerini **Webflow Designer'a** sokan pipeline (DevLink import).
Ana kütüphaneden bağımsız bir npm paketidir; CDN ile ilgisi yoktur.

### Nasıl çalışır

- Component çifti: `src/Foo.tsx` (React) + `src/Foo.webflow.tsx`
  (`declareComponent` ile prop tanımları — `@webflow/data-types`'ın
  `props.Text/Number/Boolean/Variant/...` constructor'ları).
- `webflow.json` → library manifest'i (`id: sestek-code-components` —
  ilk interaktif import'ta CLI yazdı, silme).
- Yayın: `npx webflow devlink import` (lokal) **veya otomatik CI**.
- Designer tarafı: Add panel → Libraries → "Sestek Code Components" →
  Install. Library güncellemeleri sitelere otomatik YANSIMAZ — Libraries
  panelinde "update" onayı gerekir (bilinçli Webflow davranışı).

### CI — otomatik yayın

`.github/workflows/webflow-components-publish.yml`:
`webflow-components/**` değişen her **main push'unda** library'yi yayınlar.
Gerekli secret: `WEBFLOW_API_TOKEN` (workspace token, **Components:
Read+Write** scope'u). Token workspace-level olmalı — site token'ları
`devlink import` için ÇALIŞMAZ.

### Mevcut componentler

| Component | Ne | Notlar |
|---|---|---|
| Shader Gradient BG | Animasyonlu WebGL gradient arka planı (`@shadergradient/react`) | Sestek Brand / Deep / Halo / Custom preset'leri; IntersectionObserver + `React.lazy` ile three.js chunk'ı (~1MB) viewport'a yaklaşana dek inmez (giriş ~12KB); `prefers-reduced-motion`'da statik kare; `ssr: false` |

> Tuzak: `@shadergradient/react`, `three` ve `@react-three/fiber`'ı peer
> olarak BİLDİRMEZ ama import eder — package.json'da tutulmaları şart.

---

## Webflow Cloud App — `webflow-cloud-app/`

Siteye **`/demos`** path'inden mount edilen **Next.js 16 (App Router) +
React 19** uygulaması (Cloudflare Workers, OpenNext). Demo sayfaları ve
özel servisler (API route'ları) burada yaşar.

### Deploy

- **Otomatik:** Webflow Cloud'un kendi GitHub entegrasyonu — dashboard'da
  app `sestek-demos`, branch `main`, root directory `./webflow-cloud-app`,
  mount `/demos`. Klasöre dokunan her main push'unda Webflow kendisi
  build + deploy eder.
- **Manuel/yedek:** `npm run deploy` (= `webflow cloud deploy`; Node 22+
  gerekir) veya Actions'taki manuel "Deploy Webflow Cloud App" workflow'u
  (token'da Cloud apps scope'u ister).
- `basePath`'i **elle yazma** — deploy, mount path'ten kendisi enjekte
  eder. `next.config.ts` bilinçli olarak boştur.
- `webflow.json` içindeki `cloud.app_id` / `siteId` commit'lidir; CLI'ın
  build sırasında bıraktığı `wrangler.json`, `next.config.webflow.ts` vb.
  geçici dosyalar `.gitignore`'dadır.

### Site görünümü entegrasyonu

- **Navbar:** Webflow'dan **DevLink export** ile geldi (`webflow/`
  klasörü; `npx webflow devlink export`, filtre `[Nn]av|[Ff]ooter`,
  style isolation açık). Davranış + görünüm CDN kütüphanesinden:
  `css/core/nav.css`, gsap, `js/core/nav.js` → `Sestek.initNav()`
  (bkz. `src/app/site-runtime.tsx`). Designer'da navbar değişirse
  export'u yeniden çalıştır + push.
- **Footer:** DevLink footer'ı kullanılmıyor (Collection List + grid
  utility boşlukları yüzünden kırık render oldu). Yerine
  `src/components/site-footer.tsx` — basit, kendi CSS'li
  (`.sfooter`), CMS kolonları server-side.
- **Değişkenler:** export'un `webflow/css/variables.css`'i sitenin GERÇEK
  token'larını içerir. `docs/RC-STRUCTURE-REFERENCE.css`'i runtime'da
  YÜKLEME — placeholder paletleri gerçek değerleri ezer (o dosya
  blueprint/dokümantasyondur).
- `data-underline` hover efekti: `css/effects/link-underline.css` +
  `js/effects/link-underline.js` (CDN, site-runtime yükler).

### Demolar (sestek.com/demos'un yeniden inşası)

Araştırma sonucu gerçek sayfa "Knovvu Demos": Speech Recognition
(mikrofon + 100MB dosya), Text-to-Speech, Knovvu Virtual Agent avatar.
**Halka açık anahtarsız API yok** → provider-abstraksiyonu: bugün
tarayıcı-native fallback, env girilince gerçek API (component'e dokunmadan).

| Route | Component | Fallback → Gerçek |
|---|---|---|
| `/demos/speech-recognition` | `speech-recognition-demo.tsx` | Web Speech API (Chrome/Edge) → `SESTEK_SR_URL` + `SESTEK_SR_API_KEY` (`/api/demos/transcribe` proxy) |
| `/demos/tts` | `text-to-speech-demo.tsx` | `speechSynthesis` ("önizleme" etiketli) → `SESTEK_TTS_URL` + `SESTEK_TTS_API_KEY` (`/api/demos/tts` proxy, 501 → fallback) |
| Virtual Agent | — Yakında | Knovvu webchat script'i (`va.<region>.knovvu.com/webchat-plugin/chat.min.js`) — Sestek'ten `integrationId` bekleniyor |

Mock yanıtlar HER ZAMAN "simüle/önizleme" olarak etiketlenir — gerçek
doğruluk iddiası taklit edilmez.

### Ortam değişkenleri (dashboard → sestek-demos → Environment variables)

| Değişken | Ne için |
|---|---|
| `WEBFLOW_CMS_TOKEN` | Footer CMS kolonları (site token, **CMS: Read**) |
| `SESTEK_TTS_URL` / `SESTEK_TTS_API_KEY` | Gerçek TTS proxy'si |
| `SESTEK_SR_URL` / `SESTEK_SR_API_KEY` | Gerçek SR dosya transkripsiyon proxy'si |

Env değişikliği yeni deploy ile aktifleşir ("Deploy latest commit").

### Yeni demo ekleme

`src/app/<slug>/page.tsx` (DemoShell ile) + gerekirse
`src/components/demos/<slug>-demo.tsx` (`"use client"`) +
`src/app/api/demos/<slug>/route.ts`. Hub kartı: `src/app/page.tsx`
içindeki `DEMOS` dizisi. Tema **açık renk**; token'lar
`src/app/globals.css` `:root` bloğunda.

---

## Changelog

See individual file headers for per-file version history.
