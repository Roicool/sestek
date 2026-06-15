# CDN Links

All files are served via **jsDelivr** from the `roicool/sestek` GitHub repository.  
Use `@main` for development. Pin to a tag (e.g. `@v1.0.0`) in production.

> **PageSpeed 90+ Rule — always `defer`**  
> Every `<script src>` tag must carry the `defer` attribute.  
> Inline `<script>` blocks do **not** support `defer` — put init code in
> `DOMContentLoaded` callback instead (see Webflow patterns below).  
> Add `<link rel="preconnect" href="https://cdn.jsdelivr.net">` in `<head>` to cut DNS + TLS latency.

> **⚠️ Birden fazla pinli bölüm (hero + scroll-tabs) varsa**  
> Init çağrılarının **sırası önemsizdir** — hepsini tek `DOMContentLoaded`
> bloğunda istediğin sırayla çağırabilirsin. Pinli bölümlerin üst üste
> binmemesi `refreshPriority` ile sağlanır (kod içinde tanımlı: hero `2` >
> scroll-tabs `1` > reveal `-1`), init sırasıyla **değil**. Detay ve yeni
> component eklerken uyulacak kurallar:
> [`PROJECT.md` → ScrollTrigger — Pinli Bölüm Kuralları](./PROJECT.md#scrolltrigger--pinli-bölüm-kuralları-önemli).  
> Init bloğunda manuel `ScrollTrigger.refresh()` çağırma — gerekmez ve yanlış
> zamanda çağrılırsa pinleri bozar.

---

## Format

```
https://cdn.jsdelivr.net/gh/roicool/sestek@<tag-or-branch>/<path>
```

---

## Folder Structure

```
js/
  core/        lenis-init.js, nav.js
  components/  hero.js, marquee.js, scroll-tabs.js, video-modal.js, video-inline.js,
               webinar-player.js, card-marquee.js
  effects/     grain.js, btn-glow.js
  animations/  height-reveal.js, reveal.js
css/
  core/        nav.css, nav-full.css
  components/  hero.css, marquee.css, scroll-tabs.css, video-modal.css, card-marquee.css
  effects/     grain.css, btn-glow.css
  animations/  reveal.css
```

---

## Core

| File | CDN (`@main`) |
|---|---|
| `js/core/lenis-init.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/lenis-init.js` |
| `js/core/nav.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/nav.js` |
| `css/core/nav.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/core/nav.css` |
| `css/core/nav-full.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/core/nav-full.css` |

### Lenis only — Webflow `<head>`

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/lenis-init.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initLenis(); // ayarlanmış default feel (duration 1.05, cubic-out)
  });
</script>
```

### Lenis + GSAP ScrollTrigger — Webflow `<head>`

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/lenis-init.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initLenis(); // ayarlanmış default feel (duration 1.05, cubic-out)
  });
</script>
```

> `DOMContentLoaded` deferred script'ler bittikten sonra ateşlenir —
> inline script olmasına rağmen bu callback güvenle tüm kütüphanelere erişir.

### Nav

```html
<!-- in <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/core/nav.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/nav.js" defer></script>
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

## Animations

| File | CDN (`@main`) |
|---|---|
| `js/animations/height-reveal.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/height-reveal.js` |
| `js/animations/reveal.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/reveal.js` |
| `css/animations/reveal.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/animations/reveal.css` |

### Size Reveal

"Webflow tarzı" giriş animasyonu — element ekrana girerken **kendi boyutunu**
0'dan CSS'te tanımladığın değere doğru büyütüyormuş gibi açılır (eski WordPress
"kenardan kaydır" tarzı **değil**). `left`/`right` → genişlik, `top`/`bottom` →
yükseklik büyür. Animasyon `clip-path` ile yapılır: layout'a dokunmaz (reflow yok,
içerik ezilmez, komşular zıplamaz), GPU'da çalışır, 60fps.

```html
<!-- in <head> — anti-flash guard'ı CSS'ten ÖNCE arm et (above-the-fold için) -->
<script>document.documentElement.classList.add('reveal-armed')</script>

<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/animations/reveal.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/reveal.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initReveal(); // tüm [data-reveal] elementlerini başlatır
  });
</script>
```

> **Anti-flash:** `<head>`'e eklenen tek satırlık `reveal-armed` script'i, ekranın
> üst kısmındaki (above-the-fold) elementlerin JS yüklenmeden bir kare tam boyutta
> görünmesini (flash) engeller. JS de bu sınıfı ekler — script çalışmazsa element
> normal görünür (graceful no-JS fallback). Ekranın altındaki elementler için bu
> satır şart değildir.

DOM (Webflow — herhangi bir elemente attribute ekle):

```html
<!--
  data-reveal              "left" | "right" → genişlik büyür
                           "top"  | "bottom" → yükseklik büyür   (default "left")
  data-reveal-duration     reveal süresi sn — hız                (default 1.1)
  data-reveal-delay        başlama gecikmesi sn                  (default 0)
  data-reveal-ease         GSAP ease                             (default "expo.out")
  data-reveal-scale        opsiyonel zoom-settle (örn 1.08 → 1)  (default 1, kapalı)
  data-reveal-start        ScrollTrigger tetik noktası           (default "top 85%")
  data-reveal-once         "false" → geri scroll'da tekrar oynar (default true)
-->
<div class="card" data-reveal="left" data-reveal-delay="0.1" data-reveal-duration="1.2">…</div>

<!-- yukarıdan yüksekliği büyüyerek açılan bir panel -->
<div class="panel" data-reveal="top" data-reveal-ease="power4.out">…</div>

<!-- ekstra premium derinlik için hafif zoom-settle -->
<img src="hero.jpg" data-reveal="right" data-reveal-scale="1.08" data-reveal-duration="1.4">
```

**Notlar**
- `left`/`right` → element CSS'teki **genişliğine**, `top`/`bottom` → CSS'teki
  **yüksekliğine** doğru, seçtiğin kenardan sabitlenip büyüyerek açılır.
- Birden çok elemente sırayla stagger için her birine artan `data-reveal-delay` ver.
- Programatik: `Sestek.reveal(el, { direction:"top", duration:1.2, delay:0.2 })`.
- `prefers-reduced-motion`: animasyon yapılmaz, element anında tam boyutta gösterilir.

### Height Reveal

Yeniden kullanılabilir "Webflow tarzı" height takası — bir element `height → 0`
inerken diğeri `0 → auto` yükselir. Site genelinde içerik takası için tek kaynak.

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/height-reveal.js" defer></script>
```

İki kullanım şekli var:

#### 1) Programatik — `Sestek.heightReveal()`

```js
// outEl height→0 + fade-out, inEl 0→auto + fade-in (aynı timeline'da)
var tl = Sestek.heightReveal(outEl, inEl, {
  duration: 0.5,
  ease: "power2.inOut",
  inHeight: "auto",   // scrub'lı timeline'larda ölçülen px vermek önerilir
});
```

#### 2) Declarative — `data-attribute` ile (init gerekir)

Hiç JS yazmadan, sadece data-attribute'larla tıkla/otomatik resim-içerik takası.

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initHeightReveal(); // tüm [data-height-reveal] gruplarını başlatır
  });
</script>
```

DOM yapısı:

```html
<!--
  Grup — data-attribute'larla yönetilir:
    data-height-reveal
    data-hr-duration="0.5"          takas süresi sn (default 0.5)
    data-hr-ease="power2.inOut"     ease (default power2.inOut)
    data-hr-trigger="click"         "click" | "auto" (default click)
    data-hr-interval="4000"         auto modda ms (default 4000)
-->
<div data-height-reveal data-hr-trigger="click" class="reveal">

  <!-- Tetikleyiciler (tab/buton) — data-hr-to="i" ile item'a geçer.
       Aktif item'ın index'iyle eşleşen tetikleyiciye is-active eklenir. -->
  <div class="reveal__tabs">
    <button data-hr-to="0" class="reveal__tab is-active">Bir</button>
    <button data-hr-to="1" class="reveal__tab">İki</button>
    <button data-hr-to="2" class="reveal__tab">Üç</button>
  </div>

  <!-- Item'lar (üst üste; biri görünür). Başlangıç için is-active ver. -->
  <div class="reveal__stage">
    <div data-hr-item class="reveal__item is-active"><img src="1.jpg" alt=""></div>
    <div data-hr-item class="reveal__item"><img src="2.jpg" alt=""></div>
    <div data-hr-item class="reveal__item"><img src="3.jpg" alt=""></div>
  </div>

</div>
```

**Notlar**
- `[data-hr-item]` sayısı ≥ 2 olmalı; biri `is-active` ile başlar (yoksa ilki).
- `[data-hr-to="i"]` tetikleyicileri **grubun içinde** olmalı (grup elementinin altında).
- `data-hr-trigger="auto"` → `data-hr-interval` ms'de bir otomatik döner.
- `is-active` class'ı hem aktif item'a hem eşleşen tetikleyiciye eklenir — Designer'dan
  aktif tab/aktif item stilini bu class'a verebilirsin.
- Item'lara JS `overflow:hidden` uygular; height takası temiz kırpılır.
- `prefers-reduced-motion`: animasyon yerine anında geçiş yapar.
- `Sestek.initHeightReveal()` her gruba bir API döndürür: `{ el, to(idx), stop() }`.

---

## Components

| File | CDN (`@main`) |
|---|---|
| `js/components/hero.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/hero.js` |
| `css/components/hero.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/hero.css` |
| `js/components/marquee.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/marquee.js` |
| `css/components/marquee.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/marquee.css` |
| `js/components/scroll-tabs.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/scroll-tabs.js` |
| `css/components/scroll-tabs.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/scroll-tabs.css` |
| `js/components/video-modal.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/video-modal.js` |
| `css/components/video-modal.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/video-modal.css` |
| `js/components/video-inline.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/video-inline.js` |
| `js/components/webinar-player.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/webinar-player.js` |
| `css/components/webinar-player.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/webinar-player.css` |
| `js/components/card-marquee.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/card-marquee.js` |
| `css/components/card-marquee.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/card-marquee.css` |
| `js/components/search.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/search.js` |
| `css/components/search.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/search.css` |
| `js/components/dropdown.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/dropdown.js` |
| `css/components/dropdown.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/dropdown.css` |

### Hero

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/hero.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/hero.js" defer></script>
```

### Marquee

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/marquee.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/marquee.js" defer></script>
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

### Scroll Tabs

Apollo tarzı pinli, scroll-driven sekme bölümü:
1. Büyük kartlar yukarıda ince bir tab bar'a çöker
2. Section pinlenir
3. Scroll ilerledikçe aktif sekme değişir; her panel `height-reveal` ile takas olur

```html
<!-- in <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/scroll-tabs.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/height-reveal.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/scroll-tabs.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initLenis(); // ayarlanmış default feel (duration 1.05, cubic-out)
    Sestek.initScrollTabs(); // [data-scroll-tabs] elementini başlatır
  });
</script>
```

> Sekme tıklamasında akıcı scroll için Lenis (`Sestek.initLenis`) önerilir;
> yoksa native `window.scrollTo({behavior:"smooth"})`'a düşer.

#### DOM yapısı

```html
<!--
  Kök — tüm animasyon data-attribute'larla yönetilir:
    data-scroll-tabs
    data-stabs-end="400%"      pin scroll mesafesi (default "400%")
    data-stabs-scrub="1"       scrub gecikmesi sn (default 1)
    data-stabs-collapse="1"    çöküş fazı uzunluğu, birim (default 1)
    data-stabs-reveal="1"      panel takası uzunluğu, birim (default 1)
    data-stabs-dwell="1.5"     sekme bekleme uzunluğu, birim (default 1.5)
    data-stabs-snap="true"     sekmelere snap (default true)
    data-stabs-ease="power2.inOut"  çöküş + takas ease'i
-->
<section data-scroll-tabs class="stabs">

  <!-- Kartlar → tab bar'a çöken katman -->
  <div data-stabs-bar class="stabs__bar">

    <!-- data-stabs-tab="i" ile data-stabs-panel="i" eşleşir -->
    <button data-stabs-tab="0" class="stabs__card is-active">
      <span data-stabs-icon class="stabs__icon"><!-- icon svg --></span>
      <span class="stabs__title">Outbound</span>
      <span data-stabs-desc class="stabs__desc">Book more meetings faster…</span>
    </button>

    <button data-stabs-tab="1" class="stabs__card">
      <span data-stabs-icon class="stabs__icon"><!-- icon --></span>
      <span class="stabs__title">Inbound</span>
      <span data-stabs-desc class="stabs__desc">Capture, qualify, route…</span>
    </button>
    <!-- Tab 2, 3… (data-stabs-tab="2"/"3") -->

  </div>

  <!-- Sekme başına içerik panelleri -->
  <div class="stabs__stage">

    <div data-stabs-panel="0" class="stabs__panel">
      <div class="stabs__panel-inner">
        <div class="stabs__col-text"><!-- başlık + butonlar + maddeler --></div>
        <div class="stabs__col-media"><!-- görsel / video --></div>
      </div>
    </div>

    <div data-stabs-panel="1" class="stabs__panel">
      <div class="stabs__panel-inner"> … </div>
    </div>
    <!-- Panel 2, 3… -->

  </div>
</section>
```

#### Notlar

- `data-stabs-tab="i"` ile `data-stabs-panel="i"` **sayıları eşit** olmalı (i = 0-tabanlı).
- Birim (`collapse`/`reveal`/`dwell`) değerleri **göreceli**dir; toplam scroll
  mesafesi `data-stabs-end` ile sabittir, birimler bu mesafeyi paylaştırır.
- `--stabs-cols` CSS değişkeni ile kart sütun sayısı ayarlanır (default 4).
- `--stabs-tab-speed` ile aktif sekme highlight geçiş hızı ayarlanır (default 0.3s).
- Renk/font/spacing'i Webflow Designer'dan ver; scroll-tabs.css yalnızca
  davranışsal CSS içerir (panel `overflow:hidden`, grid, collapse state).
- `prefers-reduced-motion`: pin/animasyon kapanır, sekmeler tıklamayla anında
  panel değiştirir.

### Video Modal

Drop-in lightbox video oynatıcı. Herhangi bir elemente `data-video-modal="<url>"`
eklersin — tıklayınca ortada 16:9 bir player açılır. YouTube, Vimeo, Cloudflare
Stream (iframe) ve direkt dosyaları (`.mp4` vb. → `<video>`) destekler.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/video-modal.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/video-modal.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initVideoModal(); // tek overlay'i kurar, [data-video-modal] click'lerini dinler
  });
</script>
```

Tetikleyici (herhangi bir element — buton, link, kapak görseli):

```html
<button data-video-modal="https://youtu.be/XXXXXXXX"
        data-video-modal-title="Tanıtım videosu">
  ▶ İzle
</button>
```

- **`data-video-modal`** — video URL'i (zorunlu).
- **`data-video-modal-title`** — erişilebilirlik etiketi (opsiyonel, ekran okuyucu).
- GSAP varsa overlay fade + container scale-in animasyonu; yoksa CSS fade fallback.
- Açıkken: body scroll kilidi (scrollbar genişliği telafi edilir → yatay kayma yok),
  focus trap, ESC / backdrop / kapat butonu ile kapanır.
- Kapanışta iframe/video anında DOM'dan silinir → arka planda ses kalmaz.
- `Sestek.initVideoModal()` bir API döner: `.open(url, title)` ve `.close()` ile
  programatik kontrol edilebilir.

### Video Inline

Self-hosted `<video>` dosyaları için lazy-load, poster crossfade,
hover-to-play, scroll-in-play ve tamamen özel play/pause kontrolleri sunan
sıfır bağımlılıklı kütüphane. YouTube/Vimeo lightbox için `video-modal.js`,
inline custom-controls YouTube player için `webinar-player.js` kullan.

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/video-inline.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initVideoInline(); // tüm [data-video] elementlerini başlatır
  });
</script>
```

DOM yapısı:

```html
<div data-video-trigger="clip-1">          <!-- sadece hover-play için gerekli -->
  <picture data-video-picture="clip-1">    <!-- opsiyonel poster, crossfade'li -->
    <img src="poster.jpg" alt="">
  </picture>

  <video data-video="clip-1" muted playsinline>
    <source data-src="https://cdn.example.com/clip.mp4" type="video/mp4">
  </video>

  <button data-video-playback="play"  data-video="clip-1">▶</button>
  <button data-video-playback="pause" data-video="clip-1">⏸</button>
</div>
```

Attribute'lar (hepsi `<video data-video="…">` üzerinde):

- **`data-video`** — benzersiz id, her parçayı birbirine bağlar (zorunlu).
- **`data-video-hover="true"`** — mouse-enter'da oynat, mouse-leave'de durdur
  + posteri geri getir (`[data-video-trigger]` gerekir).
- **`data-video-scroll-in-play="true"`** — viewport'a ≥%50 girince oynat,
  çıkınca durdur + posteri geri getir.
- **`data-video-desktop-only="true"`** — 991px altında video + kontrolleri gizler.

Yukarıdakilerin hiçbiri yoksa video lazy-load olur ve yüklenince otomatik oynar.

> Kaynak `<source>` mutlaka `data-src` kullanmalı (NOT `src`) — dosya ancak
> viewport'a yaklaşınca çekilir, bu PageSpeed'i korur:
> `<source data-src="clip.mp4" type="video/mp4">`

`prefers-reduced-motion` aktifse: hiçbir otomatik/hover/scroll tetiklemeli
oynatma olmaz, videolar posterinde duraklamış kalır.

### Webinar Player

YouTube embed'lerini **Sestek tarzı, kendi kendini kuran tam bir controller** ile
sunan inline player — YouTube'un kendi arayüzü/click-through'u yok. Script tüm
UI'ı kendisi inject eder; sen buton wire ETMEZSİN:

- Ortada büyük play butonu (duraklatılmışken / başlamadan önce görünür)
- Oynayınca altta premium kontrol barı: play/pause, scrubber (ilerleme +
  buffered dolgu), geçen/toplam süre, ses, tam ekran
- Oynarken fare hareketsizse kontroller otomatik gizlenir, hareket/hover'da gelir
- Poster oynayınca crossfade ile kaybolur

YouTube IFrame Player API'sini ihtiyaç anında lazy-load eder.

```html
<!-- CSS controller skin'i + JS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/webinar-player.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/webinar-player.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initWebinarPlayer(); // tüm [data-webinar] elementlerini başlatır
  });
</script>
```

DOM yapısı (minimal — kontrolleri script ekler):

```html
<div data-webinar="session-1" data-webinar-video-id="dQw4w9WgXcQ" class="webinar">
  <img data-webinar-picture="session-1" src="poster.jpg" alt="">  <!-- opsiyonel -->
  <div data-webinar-frame="session-1"></div>                      <!-- BOŞ div -->
</div>
```

> ⚠️ `data-webinar-frame` **boş bir `<div>` olmalı** — Webflow'un YouTube Video
> embed elementi DEĞİL. (Yanlışlıkla iframe koyarsan script otomatik boş div'e
> çevirir ama temiz kullanım boş Div Block'tur.) Buton koymana gerek yok.

Attribute'lar (hepsi `[data-webinar]` wrapper'ı üzerinde):

- **`data-webinar`** — benzersiz id, parçaları birbirine bağlar (zorunlu).
- **`data-webinar-video-id`** — YouTube video id'si (zorunlu); tam bir
  watch/share/embed URL'i de kabul edilir, id otomatik çıkarılır.
- **`data-webinar-autoplay="true"`** — player hazır olur olmaz oynatmaya başlar.
- **`data-webinar-loop="true"`** — tek videoyu sonsuz döngüde oynatır.
- **`data-webinar-accent="#EC008C"`** — controller vurgu rengi (CSS var token'ı
  ya da hex); varsayılan `--interactive--color-primary-base`.
- **`data-webinar-desktop-only="true"`** — 991px altında player'ı gizler.

Player'lar lazy-load olur: YouTube IFrame API ve iframe yalnızca wrapper
viewport'a yaklaşınca oluşturulur (`IntersectionObserver`, `rootMargin: 300px`)
— bu PageSpeed'i korur.

`prefers-reduced-motion` aktifse: `data-webinar-autoplay` yok sayılır,
player'lar tıklanana kadar posterinde bekler.

### Card Marquee

İki sıralı, scroll ile kayan kart marquee'si — Webflow CMS için. Bazı kartlar
parlak (öne çıkan), bazıları soluk (derinlik hissi); dönebilir kartlar tıklayınca
3D döner ve ekstra detay gösterir; dönebilir kartın üzerinde özel bir "flip"
cursor'u belirir.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/card-marquee.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/card-marquee.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initCardMarquee(); // tüm [data-card-marquee] bölümlerini başlatır
  });
</script>
```

#### Webflow CMS yapısı

```html
<!-- Collection List Wrapper — custom attribute: data-card-marquee -->
<div data-card-marquee data-card-marquee-speed="50" class="cardm">

  <!-- Collection List -->
  <div role="list" class="cardm__track">

    <!-- Collection Item -->
    <div role="listitem" class="cardm__item" data-card-featured="[CMS Featured switch]">
      <div class="cardm__inner">

        <!-- Ön yüz: her zaman görünür (logo + büyük stat) -->
        <div class="cardm__front">
          <img src="[CMS logo]" alt="[CMS name]">
          <div>[CMS stat]</div>
        </div>

        <!--
          Arka yüz: SADECE dönebilir kartlarda olmalı.
          Webflow Conditional Visibility ile "Flippable" switch açıkken göster.
          Bu element varsa JS o kartı dönebilir sayar (data-card-flip ekler).
        -->
        <div class="cardm__back">
          <div>[CMS detay alanları]</div>
        </div>

      </div>
    </div>

  </div>
</div>
```

- **`data-card-marquee-speed`** — piksel/saniye otomatik kayma hızı (default `50`).
- **`data-card-featured`** — CMS "Featured" switch'ine bağla. `true/yes/on/1` → parlak;
  değilse soluk (opacity ~0.5). JS değeri normalize eder.
- **Dönebilirlik** — ayrı bir attribute gerekmez; kartta `.cardm__back` varsa dönebilir
  sayılır. Webflow'da arka yüzü **Conditional Visibility** ("Flippable" switch açıkken)
  ile koşulla — dönebilir olmayan kartlarda arka yüz hiç render olmaz.
- **Etkileşim** — hover'da durur; sürükle (sağa/sola) + momentum; dönebilir karta
  tıkla → 3D döner (tek seferde bir kart açık); mouse ayrılıp scroll devam edince
  açık kartlar otomatik kapanır.
- **Özel cursor** — sadece hover destekli (fine pointer) cihazlarda; dönebilir kartın
  üzerinde native cursor gizlenir, dönme ikonlu bir cursor belirir.
- CMS item sayısı **tek** ise JS 2 satır düzeninin sorunsuz dönmesi için repeat
  birimini otomatik ikiye katlar — yine de **çift sayı** önerilir.

### Search

Tüm site arkası bulanıklaşan (frosted) tam ekran arama overlay'i. Bir veya
birden fazla `[data-search-trigger]`'a tıklanınca açılır; yazarken blog
postlarını **client-side** (API çağrısı yok) filtreler — görsel + başlık
kartları halinde, eşleşen kısım vurgulanmış (`<mark>`) olarak gösterir.

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/search.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/search.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initSearch(); // [data-search] bloğunu başlatır
  });
</script>
```

#### DOM yapısı

```html
<div data-search data-search-limit="8" data-search-min-chars="2">

  <!-- tetikleyici(ler) — nav içinde dahil, sayfada herhangi bir yerde olabilir -->
  <button data-search-trigger aria-label="Search">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.3-4.3"></path>
    </svg>
  </button>

  <div data-search-overlay>
    <div data-search-panel role="dialog" aria-modal="true">
      <div data-search-bar>
        <input data-search-input type="text" placeholder="Search…" autocomplete="off">
        <button data-search-close aria-label="Close">×</button>
      </div>
      <!-- opsiyonel başlık, sonuç varken görünür (örn. "Blog" / "Resources") -->
      <p data-search-results-label hidden>Blog</p>
      <div data-search-results></div>
      <p data-search-empty hidden>No results found.</p>
    </div>
  </div>

  <!-- Collection List Wrapper — blog postları -->
  <div data-search-source>
    <!-- Collection Item — link block -->
    <a data-search-item href="[CMS post link]" data-search-title="[CMS post title]">
      <img data-search-image src="[CMS post image]" alt="">
    </a>
    <!-- … -->
  </div>

</div>
```

- **`data-search-limit`** — gösterilecek max sonuç sayısı (varsayılan `8`).
- **`data-search-min-chars`** — filtrelemenin başlaması için yazılması gereken
  min. karakter (varsayılan `2`).
- **`data-search-title`** — eşleşen ve vurgulanan metin; yoksa elementin
  `textContent`'i kullanılır.
- **`[data-search-item]`** — `href` veya `data-search-url` zorunlu (sonuç
  kartının linki); içindeki `[data-search-image]` thumbnail olarak kullanılır.
- **`[data-search-results-label]`** — opsiyonel; sonuç listesinin üstünde
  gösterilen başlık (örn. "Blog" / "Resources"). Sonuç varken otomatik
  görünür, sonuç yokken/sorgu kısayken `hidden` olur.
- **`[data-search-source]`** — search.js bunu **sadece okur**, gizlemez/değiştirmez.
  Sayfada zaten görünen blog listesini (mevcut Collection List) kullanabilirsin —
  her Collection Item'a `data-search-item` + `data-search-title` ekleyip
  içindeki görsele `data-search-image` koyman yeterli. Ayrı/gizli bir liste
  istersen kendin `display:none` (Webflow "Hide" ayarı) ile gizle.
  > 💡 Sayfada **birden fazla** `[data-search-source]` olabilir (örn. farklı
  > kategoriler için ayrı Collection List'ler) — hepsi tek bir indekste
  > birleştirilir, nerede olduklarının önemi yok.
  > ⚠️ Webflow Collection List **sayfalama (pagination)** kullanıyorsa, sadece
  > o sayfada render edilen postlar arama indeksine girer — site genelinde
  > arama için listenin tamamını (limit'i yüksek tutarak) tek sayfada render et.

Eşleştirme Türkçe karakter duyarsız (ş/ç/ğ/ö/ü/ı/İ → düz ASCII'ye katlanır),
büyük/küçük harf duyarsızdır; sorguyla **başlayan** başlıklar, sadece
**içeren** başlıkların önüne sıralanır.

**Davranış (v1.4.0):**
- Trigger'a tekrar basınca overlay **toggle** olur (aç/kapa).
- Sayfadaki **tüm** `[data-search-source]` blokları (kaç adet olursa olsun)
  okunup tek bir indekste birleştirilir.
- İndeks **her açılışta yeniden kurulur** ve `[data-search-source]` taze
  sorgulanır — lazy-load / CMS / Finsweet "load more" ile sonradan gelen
  postlar da otomatik aranır.
- Arka plana tıklayınca kapanır, ama **sadece** tıklama hem arka planda
  başlayıp hem arka planda biterse — açılış tıklaması, panel içinden
  sıçrayan tıklama veya metin seçip arka plana bırakma yanlışlıkla
  kapatmaz.
- **Erişilebilir:** açıkken Tab panel içinde hapsolur (focus trap), ESC
  kapatır, **↑/↓** ile sonuçlar arasında gezinilir, **Enter** seçili sonuca
  gider; trigger'larda `aria-expanded`, overlay'de `aria-hidden` güncellenir.

**Görsel (v1.3.0 — Ramp-tarzı):** Eşleşen metin artık renkli "chip" yerine
sadece **bold** gösteriliyor (`<mark>` arka planı yok); kapatma butonu ve
klavye-seçili sonuç çerçevesi Sestek pembesini (`#EC008C` /
`--color-text--accent`) kullanıyor. Renkler `--brand-primary--100/600` ve
`--color-text--accent` Webflow değişkenlerinden geliyor — bu değişkenleri
Designer'da tanımlamadıysan CSS'teki pembe fallback'ler devreye girer.

Açıkken sayfa scroll'u kilitlenir (Lenis varsa `Sestek.stopScroll`/
`startScroll`, yoksa `html.search-lock { overflow: hidden }` fallback'i).
Finsweet filtreleri (kategori vb.) ile birlikte kullanılabilir — bu
component sadece metin arama/sonuç render'ını yönetir. Beklenen bir element
eksikse konsola `[Sestek.search]` ön ekiyle uyarı basar (sessizce ölmez).

### Dropdown

Basit bir "disclosure" dropdown: bir buton ("Explore categories" gibi) tıklanınca
altında bir link listesi paneli açılır (Ramp-tarzı kategori menüsü).

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/dropdown.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/dropdown.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initDropdown(); // sayfadaki tüm [data-dropdown] bloklarını başlatır
  });
</script>
```

#### DOM yapısı

```html
<div data-dropdown>
  <button data-dropdown-trigger aria-haspopup="true" aria-expanded="false">
    Explore categories
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m6 9 6 6 6-6"></path>
    </svg>
  </button>
  <div data-dropdown-panel role="menu">
    <a class="dropdown__item" role="menuitem" href="/blog/category/ai">AI</a>
    <a class="dropdown__item" role="menuitem" href="/blog/category/accounting">Accounting</a>
    <!-- … diğer kategori linkleri … -->
  </div>
</div>
```

- **`[data-dropdown-trigger]`** — butona basınca panel açılır/kapanır
  (toggle). `aria-expanded` otomatik güncellenir.
- **`[data-dropdown-panel]`** — link listesini tutan kart; `.dropdown__item`
  class'lı `<a>` etiketleri kategori linkleridir.
- Sayfada birden fazla `[data-dropdown]` olabilir — biri açılınca diğer
  açık olan otomatik kapanır.
- **CMS Collection List ile:** `[data-dropdown-panel]` doğrudan bir
  Collection List Wrapper olabilir; her Collection Item link block'una
  `dropdown__item` class'ını eklemen yeterli — başka bir attribute gerekmez.

**Davranış (v1.1.0):**
- Trigger tıklaması paneli **toggle** eder; dışarı tıklama veya bir linke
  tıklama paneli kapatır.
- `.dropdown__item` elemanları **her açılışta yeniden taranır** — Finsweet/
  "load more"/filtreleme ile sonradan eklenen CMS item'ları da otomatik
  klavye navigasyonu ve tıklama-ile-kapanma alır (ekstra kurulum gerekmez).
- **↑/↓** linkler arasında gezinir (kenarlarda wrap eder), **Home/End**
  ilk/son linke atlar, **ESC** kapatır ve focus'u trigger'a döndürür.
- Trigger'da `aria-haspopup`/`aria-expanded`, panelde `aria-hidden`
  güncellenir.
- **Responsive:** panel viewport'un sağından taşacaksa otomatik olarak
  trigger'ın sağ kenarına hizalanır (`is-align-right` class'ı), pencere
  yeniden boyutlandırıldığında da güncellenir. Mobilde (`≤599px`) panel
  genişliği `100vw - 2rem` ile sınırlanır ve uzun kategori adları satır
  kaydırır.

**Görsel (v1.1.0):** Trigger beyaz, ince border, `0.75rem` köşe; açıkken
border + ok ikonu Sestek pembesine (`#EC008C`) döner. Panel beyaz kart,
`0.75rem` köşe, gölgeli; linkler hover/aktifken pembe (`--brand-primary--100`)
arka plan + pembe metin alır — search sonuç kartlarıyla aynı tonlar.

---

## Effects

| File | CDN (`@main`) |
|---|---|
| `js/effects/grain.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/effects/grain.js` |
| `css/effects/grain.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/effects/grain.css` |
| `js/effects/btn-glow.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/effects/btn-glow.js` |
| `css/effects/btn-glow.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/effects/btn-glow.css` |

### Grain

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/effects/grain.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/effects/grain.js" defer></script>
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

### Btn Glow

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/effects/btn-glow.css">
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/effects/btn-glow.js" defer></script>
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
