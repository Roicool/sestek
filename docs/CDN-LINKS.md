# CDN Links

All files are served via **jsDelivr** from the `roicool/sestek` GitHub repository.  
Use `@main` for development. Pin to a tag (e.g. `@v1.0.0`) in production.

> **PageSpeed 90+ Rule — always `defer`**  
> Every `<script src>` tag must carry the `defer` attribute.  
> Inline `<script>` blocks do **not** support `defer` — put init code in
> `DOMContentLoaded` callback instead (see Webflow patterns below).  
> Add `<link rel="preconnect" href="https://cdn.jsdelivr.net">` in `<head>` to cut DNS + TLS latency.

---

## Format

```
https://cdn.jsdelivr.net/gh/roicool/sestek@<tag-or-branch>/<path>
```

---

## Core

| File | CDN (`@main`) |
|---|---|
| `lenis-init.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/core/lenis-init.js` |

### Lenis only — Webflow `<head>`

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/core/lenis-init.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initLenis({ duration: 1.2 });
  });
</script>
```

### Lenis + GSAP ScrollTrigger — Webflow `<head>`

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/core/lenis-init.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initLenis({ duration: 1.2 });
  });
</script>
```

> `DOMContentLoaded` deferred script'ler bittikten sonra ateşlenir —
> inline script olmasına rağmen bu callback güvenle tüm kütüphanelere erişir.

---

## Animations

> Files will be listed here as they are added.

---

## Components

| File | CDN (`@main`) |
|---|---|
| `hero.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/hero.js` |
| `hero.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/hero.css` |
| `btn-glow.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/btn-glow.js` |
| `btn-glow.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/btn-glow.css` |
| `marquee.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/marquee.js` |
| `marquee.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/marquee.css` |
| `grain.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/grain.js` |
| `grain.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/grain.css` |
| `nav.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/nav.js` |
| `nav.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/nav.css` |
| `nav-full.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/nav-full.css` |
| `data-viz.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/data-viz.js` |
| `data-viz.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/data-viz.css` |

### Hero

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/hero.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/hero.js" defer></script>
```

### Marquee

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/marquee.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/marquee.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initMarquee(); // tüm [data-marquee] elementlerini başlatır
  });
</script>
```

#### Webflow CMS yapısı

```html
<!-- Wrapper — custom attribute: data-marquee, data-marquee-speed="60" -->
<div data-marquee data-marquee-speed="60" class="marquee">

  <!--
    Collection List Wrapper
    Webflow class: marquee__track
    Layout: inline-flex (CSS override)
  -->
  <div role="list" class="marquee__track">

    <!--
      Collection Item
      Webflow class: marquee__item
    -->
    <div role="listitem" class="marquee__item">
      <img class="marquee__logo"
           src="[CMS logo field]"
           alt="[CMS name field]"
           loading="eager">
      <!--
        loading="eager" önerilir — lazy-load ile görseller yüklenmeden
        önce track genişliği yanlış ölçülebilir.
      -->
    </div>

  </div>
</div>
```

**`data-marquee-speed`** — piksel/saniye cinsinden hız (varsayılan: `60`).
Daha yavaş → daha premium, daha hızlı → daha enerjik.

### Grain

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/grain.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/grain.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initGrain();
  });
</script>
```

#### Webflow yapısı

```html
<!--
  Video wrapper — custom attributes:
    data-grain
    data-grain-intensity="0.12"   (0.0–1.0, default: 0.12)
    data-grain-size="0.65"        (0.3 kaba → 0.65 default → 0.9 ince)
-->
<div data-grain data-grain-intensity="0.12" data-grain-size="0.65"
     class="video-wrap">
  <video autoplay muted loop playsinline></video>
  <!-- grain__overlay buraya JS tarafından eklenir -->
</div>
```

| `data-grain-intensity` | Görünüm |
|---|---|
| `0.05` | Neredeyse görünmez, çok subtile |
| `0.12` | Premium, sinematik (default) |
| `0.20` | Belirgin grain |
| `0.35` | Heavy / stylized |

| `data-grain-size` | Görünüm |
|---|---|
| `0.35` | Kaba, 16mm film |
| `0.65` | Standard, 35mm film (default) |
| `0.85` | İnce, dijital sensör noise |

### Nav

```html
<!-- in <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/nav.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/nav.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initNav(); // [data-nav] elementini başlatır
  });
</script>
```

#### DOM yapısı

```html
<!-- Root: data-nav -->
<nav data-nav class="nav">

  <!-- Backdrop (frosted glass blur layer) -->
  <div class="nav__backdrop"></div>

  <!-- Bar: data-nav-bar -->
  <div data-nav-bar class="nav__bar">
    <div class="nav__inner">

      <!-- Logo -->
      <a href="/" class="nav__logo">
        <img src="logo.svg" alt="Logo">
      </a>

      <!-- Desktop nav list -->
      <ul class="nav__list">

        <!-- Trigger item (opens mega menu) -->
        <li>
          <button class="nav__trigger" data-nav-trigger="products">
            Products
            <svg class="nav__chevron" width="12" height="12"><path d="M2 4l4 4 4-4"/></svg>
          </button>
        </li>

        <!-- Plain link item (no panel) -->
        <li><a href="/pricing" class="nav__link">Pricing</a></li>

      </ul>

      <!-- Desktop CTAs -->
      <div class="nav__actions">
        <a href="/login" class="nav__link">Log in</a>
        <a href="/signup" class="nav__btn">Get started</a>
      </div>

      <!-- Hamburger (mobile only) -->
      <button class="nav__hamburger" data-nav-hamburger aria-label="Menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

    </div>
  </div>

  <!-- Dropdown wrap + height container -->
  <div class="nav__dropdown-wrap">
    <div data-nav-dropdown class="nav__dropdown">

      <!-- Panel: data-nav-panel="products" matches trigger -->
      <div data-nav-panel="products" class="nav__panel">
        <div class="nav__panel-layout">

          <!-- Body (3 content cols) -->
          <div class="nav__panel-body">
            <div class="nav__panel-rows">

              <!-- Row 1 -->
              <div class="nav__panel-row">

                <!-- Col 1 — icon cards -->
                <div class="nav__col">
                  <span class="nav__col-label">Platform</span>
                  <a href="#" class="nav__item-icon">
                    <div class="nav__item-icon-box">
                      <img src="icon.svg" alt="">
                    </div>
                    <div class="nav__item-icon-text">
                      <span class="nav__item-title">Cards</span>
                      <span class="nav__item-desc">Issue and manage cards</span>
                    </div>
                  </a>
                </div>

                <!-- Col 2 — plain links -->
                <div class="nav__col">
                  <span class="nav__col-label">More</span>
                  <a href="#" class="nav__item-plain">Integrations</a>
                  <a href="#" class="nav__item-plain">Security</a>
                </div>

                <!-- Col 3 — highlight cards -->
                <div class="nav__col">
                  <span class="nav__col-label">Resources</span>
                  <a href="#" class="nav__item-highlight">
                    <span class="nav__item-title">What's new</span>
                    <span class="nav__item-desc">See the latest updates</span>
                  </a>
                </div>

              </div>

              <!-- Optional divider between rows -->
              <hr class="nav__divider">

              <!-- Row 2 -->
              <div class="nav__panel-row">
                <!-- ... more cols ... -->
              </div>

            </div>
          </div>

          <!-- Featured col (4th, rightmost) -->
          <div class="nav__col nav__col--featured">
            <a href="#" class="nav__featured-card">
              <img class="nav__featured-card-image" src="article.jpg" alt="">
              <div class="nav__featured-card-body">
                <span class="nav__item-title">Article title</span>
                <span class="nav__item-desc">Short description here</span>
              </div>
            </a>
          </div>

        </div>
      </div>
      <!-- /panel -->

    </div>
  </div>

  <!-- Dark overlay (behind dropdown, above page) -->
  <div data-nav-overlay class="nav__overlay"></div>

  <!-- Mobile full-screen menu: data-nav-mobile -->
  <div data-nav-mobile class="nav__mobile" aria-hidden="true">

    <!-- Head -->
    <div class="nav__mobile-head">
      <div class="nav__mobile-headleft">
        <!-- Brand logo (visible at level 0) -->
        <a href="/" data-nav-mobile-brand class="nav__mobile-brand">
          <img src="logo.svg" alt="Logo">
        </a>
        <!-- Back button (visible at level 1) -->
        <button data-nav-mobile-back class="nav__mobile-back">
          <svg width="16" height="16"><path d="M10 4l-4 4 4 4"/></svg>
          Back
        </button>
      </div>
      <!-- Close button -->
      <button data-nav-mobile-close class="nav__mobile-close" aria-label="Close">
        <svg width="16" height="16"><path d="M4 4l8 8M12 4l-8 8"/></svg>
      </button>
    </div>

    <!-- Body: 2-screen slider -->
    <div class="nav__mobile-body">
      <div data-nav-mobile-slider class="nav__mobile-slider">

        <!-- Level 0: main list -->
        <div class="nav__mobile-screen">
          <ul class="nav__mobile-list">

            <!-- Item with sub-panel (data-nav-mobile-trigger matches data-nav-panel) -->
            <li class="nav__mobile-item">
              <button class="nav__mobile-trigger-row" data-nav-mobile-trigger="products">
                Products
                <svg class="nav__mobile-chevron" width="12" height="12"><path d="M4 2l4 4-4 4"/></svg>
              </button>
            </li>

            <!-- Plain link item -->
            <li class="nav__mobile-item">
              <a href="/pricing" class="nav__mobile-link">Pricing</a>
            </li>

          </ul>
        </div>

        <!-- Level 1: sub-panel (innerHTML injected by JS from matching data-nav-panel) -->
        <div data-nav-mobile-sub class="nav__mobile-screen nav__mobile-screen--sub"></div>

      </div>
    </div>

    <!-- Foot: pinned CTA bar -->
    <div class="nav__mobile-foot">
      <a href="/login" class="nav__mobile-signin">Log in</a>
      <a href="/signup" class="nav__mobile-cta">Get started</a>
    </div>

  </div>
  <!-- /mobile -->

</nav>
```

### Data Viz

```html
<!-- in <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/data-viz.css">
<script src="https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/components/data-viz.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initDataViz({ container: '[data-viz]' });
  });
</script>
```

#### DOM yapısı

```html
<!--
  Wrapper — data-viz attribute zorunlu.
  height CSS'te tanımlanmalı; canvas %100 doldurur.
-->
<div data-viz style="height: 560px;"></div>
```

#### Seçenekler

| Seçenek | Tip | Default | Açıklama |
|---|---|---|---|
| `container` | `string\|Element` | `'[data-viz]'` | Hedef element |
| `nodeCount` | `number` | `50` | Düğüm sayısı |
| `maxDist` | `number` | `3.2` | Bağlantı mesafe eşiği |
| `spreadX` | `number` | `10` | Yatay yayılım |
| `spreadY` | `number` | `3.5` | Dikey yayılım |
| `spreadZ` | `number` | `5` | Derinlik yayılımı |
| `bgColor` | `number` | `0x04040a` | Arka plan rengi (0x hex) |
| `palette` | `string[]` | beyaz dominant | Hex renk dizisi |

#### destroy()

```js
var viz = Sestek.initDataViz();
// ...
viz.destroy(); // canvas kaldırılır, event'ler temizlenir
```

---

#### Notlar

- `data-nav-trigger="products"` ile `data-nav-panel="products"` eşleşmeli.
- `data-nav-mobile-trigger="products"` ile aynı ID'yi kullan — JS desktop panel içeriğini otomatik klonlar.
- CSS renk, padding, font değerlerini Webflow Designer'dan ver; nav.css yalnızca davranışsal CSS içerir.
- `_destroy()` ile tüm event listener ve GSAP tween'leri temizlenir:
  ```js
  var nav = Sestek.initNav();
  // ...
  nav._destroy();
  ```

---

## Dependency CDNs (External)

### Lenis

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
```

### GSAP + ScrollTrigger

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
```

---

## Version Bump Checklist

When releasing a new version:

1. Update the version comment in the JS/CSS file header (`v1.0.0` → `v1.1.0`)
2. Commit and push to `main`
3. Create a GitHub tag: `git tag v1.1.0 && git push origin v1.1.0`
4. Update this file's table with the new pinned tag link for production use
5. jsDelivr will serve the new tag automatically (may take a few minutes to propagate)
