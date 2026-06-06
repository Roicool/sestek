# CDN Links

All files are served via **jsDelivr** from the `roicool/sestek` GitHub repository.  
Use `@main` for development. Pin to a tag (e.g. `@v1.0.0`) in production.

> **PageSpeed 90+ Rule — always `defer`**  
> Every `<script src>` tag must carry the `defer` attribute.  
> Inline `<script>` blocks do **not** support `defer` — put init code in
> `DOMContentLoaded` callback instead (see Webflow patterns below).  
> Add `<link rel="preconnect" href="https://cdn.jsdelivr.net">` in `<head>` to cut DNS + TLS latency.

> **Webflow IX2 kapatma (opsiyonel ama önerilir)**  
> Sestek animasyonları GSAP ile yönetir. Webflow'un yerleşik Interactions (IX2)
> motorunu kullanmıyorsan, `<head>`'in en üstüne (defer'den önce) aşağıdaki
> inline snippet'i koy — body oluşur oluşmaz `data-wf-ix-vacation="1"` basıp
> Webflow'un animasyonlarının araya girip flash/çakışma yapmasını engeller.
> Tam snippet ve açıklama: [`PROJECT.md` → Getting Started (Webflow)](./PROJECT.md#getting-started-webflow).
> (Designer'da native IX2 interaction KULLANIYORSAN ekleme.)

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
  components/  hero.js, hero-slider.js, marquee.js, scroll-tabs.js, video-modal.js,
               card-marquee.js, section-title.js, text-rotator.js, story.js,
               accordion.js, blog-utils.js, site-utils.js
  effects/     grain.js, btn-glow.js
  animations/  height-reveal.js, reveal.js, color-shift.js
css/
  core/        nav.css, nav-full.css
  components/  hero.css, hero-slider.css, marquee.css, scroll-tabs.css, video-modal.css,
               card-marquee.css, section-title.css, text-rotator.css, story.css,
               accordion.css
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
| `js/animations/color-shift.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/color-shift.js` |
| `css/animations/reveal.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/animations/reveal.css` |

### Color Shift

Scroll'a bağlı background + metin rengi geçişi — aynı timeline'da, `scrub` ile birebir scroll pozisyonuna kilitli.

```html
<!-- in <head> -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/color-shift.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initColorShift();
  });
</script>
```

DOM:

```html
<!--
  Section attributes:
    data-color-shift              trigger olarak işaretler — zorunlu
    data-cs-bg-from   renk        arka plan başlangıç rengi
    data-cs-bg-to     renk        arka plan bitiş rengi
    data-cs-target    selector    bg'yi kimin üzerinde değiştireceği — örn "body"
                                  (default: section'ın kendisi)
    data-cs-start     string      ScrollTrigger start   (default "top 75%")
    data-cs-end       string      ScrollTrigger end     (default "bottom 25%")
    data-cs-scrub     number      scrub süresi sn       (default 0.8)
    data-cs-once      flag        scroll'a kilitlemek yerine girişte bir kerelik oynat
    data-cs-duration  number      once modunda oynatma süresi sn (default 0.8)
    data-cs-ease      string      once modunda GSAP ease (default power2.out)
    data-cs-disable-mobile flag   768px altında animasyonu kapat, bitiş rengine snap et
-->
<section
  data-color-shift
  data-cs-bg-from="#ffffff"
  data-cs-bg-to="#0a0a0f"
>
  <!--
    data-cs-text      section içinde renk değiştirecek metin elementleri
    data-cs-from      başlangıç metin rengi
    data-cs-to        bitiş metin rengi
    (background ile aynı timeline'da — lockstep değişir)
  -->
  <h2 data-cs-text data-cs-from="#111111" data-cs-to="#ffffff">Başlık</h2>
  <p  data-cs-text data-cs-from="#444444" data-cs-to="#aaaaaa">Açıklama</p>
</section>
```

**Tam sayfa background değişimi** (`body`'nin arka planı değişsin):

```html
<section
  data-color-shift
  data-cs-target="body"
  data-cs-bg-from="#ffffff"
  data-cs-bg-to="#0a0a0f"
  data-cs-start="top 60%"
  data-cs-end="top 20%"
>
```

**Renk değerleri — hex VEYA CSS variable:**

Literal renk de, RC Structure token'ı da kabul edilir. Token verirsen computed
değerine çözülüp öyle tween edilir (GSAP ham `var()` interpolate edemez, bu yüzden
script çözer). Üç form da geçerli:

```html
<!-- literal -->
<section data-color-shift data-cs-bg-from="#ffffff" data-cs-bg-to="#0a0a0f">

<!-- bare token -->
<section data-color-shift data-cs-bg-from="--neutral--050" data-cs-bg-to="--neutral--900">

<!-- var() wrapper -->
<h2 data-cs-text data-cs-from="var(--color-text--900)" data-cs-to="var(--neutral--050)">…</h2>
```

> Token, uygulandığı elementin computed style'ından okunur — bir parent'ta
> override edilmiş değişken doğru scope'tan çözülür. PROJECT.md'nin "raw hex
> kullanma" kuralına uymak için token formunu tercih et.

**Girişte kısa animasyon (scrub modu):** `start`/`end` penceresini girişe yakın
ve dar tut — animasyon o kısa scroll aralığında oynayıp biter:

```html
<section data-color-shift
  data-cs-bg-from="--neutral--050" data-cs-bg-to="--neutral--900"
  data-cs-start="top 90%"   <!-- ucu görünür görünmez başla -->
  data-cs-end="top 65%"     <!-- kısa pencerede bitir -->
  data-cs-scrub="0.4">      <!-- daha çevik -->
```

**Bir kerelik oynat (once modu):** Scroll'a kilitlemeden, girişte sabit süreli
oynayıp biten animasyon. Mobil için en hafif seçenek (`once:true` → asla tekrar oynamaz):

```html
<section data-color-shift
  data-cs-bg-from="--neutral--050" data-cs-bg-to="--neutral--900"
  data-cs-once
  data-cs-duration="0.8"
  data-cs-ease="power2.out"
  data-cs-start="top 80%">
```

**Notlar**
- Background değişimi paint-only operasyon — layout recalc yok, PageSpeed'e etkisi sıfır.
- Birden fazla section'a eklenebilir; her biri bağımsız ScrollTrigger'a sahip olur.
- `prefers-reduced-motion`: animasyon yapılmaz, bitiş rengi anında uygulanır.
- `data-cs-scrub="0"` → scroll pozisyonuna 1-to-1 kilitli (lag yok). `0.8` → hafif yumuşatılmış.
- `data-cs-disable-mobile` → 768px altında animasyon çalışmaz, bitiş rengine snap eder.
  Tüm sayfa (`data-cs-target="body"`) bg'sini scrub'larken düşük seviye telefonlarda
  her frame repaint maliyetini sıfırlamak için kullan.
- `refreshPriority: -1` — hero (2) ve scroll-tabs (1) pinlendikten sonra refresh eder, pin sıraları bozulmaz.

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
| `js/components/card-marquee.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/card-marquee.js` |
| `css/components/card-marquee.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/card-marquee.css` |
| `js/components/blog-utils.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/blog-utils.js` |
| `js/components/accordion.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/accordion.js` |
| `css/components/accordion.css` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/accordion.css` |
| `js/components/site-utils.js` | `https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/site-utils.js` |

### Accordion

Erişilebilir akordeon (SSS / disclosure blokları). ARIA, klavye navigasyonu
(Enter/Space + ok tuşları), GSAP height animasyonu. Tek-açık ya da çoklu-açık.

```html
<!-- in <head> -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/sestek@main/css/components/accordion.css">
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/accordion.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initAccordion(); // tüm [data-accordion] gruplarını başlatır
  });
</script>
```

DOM:

```html
<!--
  Kök:
    data-accordion
    data-accordion-multiple="false"   "true" → birden fazla panel açık kalabilir
    data-accordion-duration="0.4"     aç/kapa süresi sn
    data-accordion-ease="power2.inOut"
-->
<div data-accordion data-accordion-multiple="false">

  <!-- data-accordion-open → bu item açık başlar -->
  <div data-accordion-item data-accordion-open>
    <button data-accordion-trigger>
      Soru başlığı
      <svg data-accordion-icon width="16" height="16"><path d="M4 6l4 4 4-4"/></svg>
    </button>
    <div data-accordion-panel>
      <div data-accordion-content>Cevap metni…</div>
    </div>
  </div>

  <div data-accordion-item>
    <button data-accordion-trigger>
      İkinci soru
      <svg data-accordion-icon width="16" height="16"><path d="M4 6l4 4 4-4"/></svg>
    </button>
    <div data-accordion-panel>
      <div data-accordion-content>İkinci cevap…</div>
    </div>
  </div>

</div>
```

**Notlar**
- ARIA otomatik bağlanır: `aria-expanded`, `aria-controls`, `aria-hidden`, `role="region"`.
- Klavye: Enter/Space açıp kapatır; ↑/↓/Home/End başlıklar arasında gezer.
- `[data-accordion-icon]` varsa açık item'da CSS ile 180° döner (rotate).
- Açık item'a ve trigger'ına `is-open` class'ı eklenir — Designer'dan aktif stil verebilirsin.
- `prefers-reduced-motion`: animasyon yerine anında açılır/kapanır.
- `Sestek.initAccordion()` her gruba bir controller döndürür.

### Site Utils

Site geneli küçük profesyonellik yardımcısı — bağımlılık yok. Otomatik footer yılı.
(CSS dosyası yok — sadece JS.)

```html
<!-- in <head> — CSS bağımlılığı yok -->
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/site-utils.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initSiteUtils(); // footer yılı
    // ya da doğrudan:
    // Sestek.initFooterYear();
  });
</script>
```

DOM:

```html
<!-- Footer yılı — boş bırak → "2026" -->
<span data-current-year></span>

<!-- ya da template: {year} değişkenle değişir -->
<span data-current-year="© {year} Sestek. Tüm hakları saklıdır."></span>
```

**Footer yılı**
- `new Date().getFullYear()` ile her sayfa yüklemesinde güncellenir.

### Blog Utils

Üç bağımsız blog utility tek dosyada — AI özet, sosyal paylaşım, içindekiler.
Bağımlılık yok; her utility ayrı ayrı da çağrılabilir.

```html
<!-- in <head> — CSS bağımlılığı yok -->
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/blog-utils.js" defer></script>
```

Webflow `</body>` öncesi:

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    Sestek.initBlogUtils(); // üçünü birden başlatır
    // ya da ayrı ayrı:
    // Sestek.initAiSummarize();
    // Sestek.initSocialShare();
    // Sestek.initToc();
  });
</script>
```

> Lenis sayfada kuruluysa (`Sestek.initLenis()`) TOC scroll'u otomatik
> olarak `Sestek.scrollTo` üzerinden çalışır — ekstra bir şey yapmana gerek yok.

---

#### 1. AI Summarize

Sayfanın URL'ini ve başlığını AI prompt'una gömerek doğrudan AI platformuna gönderir.

```html
<!-- Sayfa başlığında ya da herhangi bir gizli elementte brand adı -->
<span data-brand="Sestek" style="display:none"></span>

<!-- Butonlar / linkler -->
<a data-ai-summarize="chatgpt">ChatGPT'de Oku</a>
<a data-ai-summarize="claude">Claude'da Oku</a>
<a data-ai-summarize="perplexity">Perplexity'de Oku</a>
<a data-ai-summarize="grok">Grok'ta Oku</a>
<a data-ai-summarize="google">Google AI'da Oku</a>
```

- `<a>` ise `href`/`target` atanır. Başka bir element (`<button>`, `<div>`) ise `click` listener eklenir.
- `[data-brand]` yoksa prompt'ta brand boş geçer; sorun olmaz.

---

#### 2. Social Share

Mevcut sayfayı sosyal platformlara paylaşır veya linki panoya kopyalar.

```html
<a data-share="twitter">Twitter</a>
<a data-share="linkedin">LinkedIn</a>
<a data-share="facebook">Facebook</a>
<a data-share="whatsapp">WhatsApp</a>
<a data-share="telegram">Telegram</a>
<a data-share="reddit">Reddit</a>
<a data-share="email">E-posta ile Gönder</a>
<button data-share="copy">Linki Kopyala</button>
```

- `copy` / `copy-link` → `navigator.clipboard` kullanır; eski tarayıcılarda `execCommand` fallback'i var. Kopyalanınca altta toast mesajı görünür.
- `email` → aynı sekmede açılır; diğerleri yeni sekme.

---

#### 3. Table of Contents

`[data-toc-source]` içindeki başlıkları okuyup otomatik ID atar, TOC listesini oluşturur.
Tıklamada Lenis (varsa) veya native smooth scroll ile hedef başlığa gider.

```html
<!-- Kaynak alan — blog içerik wrapper'ı -->
<div data-toc-source class="blog-content">
  <h2>Birinci Bölüm</h2>
  <h2>İkinci Bölüm</h2>
  <h3>Alt Başlık</h3>
</div>

<!--
  TOC container
    data-toc-offset      sticky nav yüksekliği kadar px boşluk (default 80)
    data-toc-headings    hangi tag'leri indeksle (default "h2")
-->
<nav data-toc data-toc-offset="100" data-toc-headings="h2,h3">

  <!--
    data-toc-template  → bu element her başlık için klonlanır (Webflow için).
    Webflow Designer'da istediğin class / style'ı ver; JS sadece href ve
    metni doldurur. Yoksa sade <a data-toc-item> oluşturur.
  -->
  <a data-toc-template href="#">
    <span data-toc-text></span>
  </a>

  <!-- Oluşturulan item'lar buraya eklenir -->
  <div data-toc-list></div>

</nav>
```

- Başlığın zaten `id`'si varsa dokunulmaz; yoksa slug'dan üretilir (Türkçe karakter desteği var).
- Hiç başlık bulunamazsa container'a `data-toc-empty="true"` eklenir — Webflow'da `display:none` koşulu için kullanılabilir.
- Birden fazla `[data-toc]` container'ı desteklenir (sidebar + mobile ayrı TOC gibi).
- `data-toc-headings` ilk container'dan okunur; tüm container'lara uygulanır.

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
