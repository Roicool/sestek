# GSAP × SVG — Kullanım Kılavuzu

> Sestek projesinde SVG animasyonları için kapsamlı başvuru belgesi.  
> GSAP 3.12.x — CDN-first yaklaşım.

---

## İçindekiler

1. [Genel Bakış](#1-genel-bakış)
2. [Plugin Lisans Durumu](#2-plugin-lisans-durumu)
3. [SVG Dosyası Nasıl Hazırlanmalı](#3-svg-dosyası-nasıl-hazırlanmalı)
4. [Transform Tuzakları — fill-box ve svgOrigin](#4-transform-tuzakları--fill-box-ve-svgorigin)
5. [DrawSVGPlugin — Stroke Çizim Animasyonu](#5-drawsvgplugin--stroke-çizim-animasyonu)
6. [MorphSVGPlugin — Şekil Morphing](#6-morphsvgplugin--şekil-morphing)
7. [MotionPathPlugin — Path Üzerinde Hareket](#7-motionpathplugin--path-üzerinde-hareket)
8. [Mask ve ClipPath Animasyonu](#8-mask-ve-clippath-animasyonu)
9. [Performans Kuralları](#9-performans-kuralları)
10. [CDN Link'leri — Sestek Entegrasyonu](#10-cdn-linkleri--sestek-entegrasyonu)

---

## 1. Genel Bakış

GSAP, SVG elementlerini DOM'da doğrudan manipüle eder. SVG elementleri DOM'da yaşadığı için tüm GSAP API'si (pause, reverse, seek, timeline, scrub) SVG'lerde aynen çalışır.

**GSAP'ın SVG'de animate edebildikleri:**

| Kategori | Örnekler |
|---|---|
| Transform | `x`, `y`, `rotation`, `scale`, `skewX/Y` |
| Görünüm | `opacity`, `fill`, `stroke`, `strokeWidth` |
| Path verisi | `d` attribute (MorphSVGPlugin ile) |
| Stroke çizimi | `stroke-dasharray`, `stroke-dashoffset` (DrawSVGPlugin ile) |
| Path üzerinde hareket | `motionPath` (MotionPathPlugin ile) |
| Filtre parametreleri | `feGaussianBlur > stdDeviation`, vb. |
| ViewBox | `attr: { viewBox: "..." }` |
| ClipPath / Mask | clip içindeki elementlerin transform'ları |

---

## 2. Plugin Lisans Durumu

**Webflow'un GSAP'a sponsor olması ile birlikte** tüm premium plugin'ler **ücretsiz** erişime açıldı.

| Plugin | Eski Durum | Güncel Durum |
|---|---|---|
| DrawSVGPlugin | Club GreenSock | **Ücretsiz** |
| MorphSVGPlugin | Club GreenSock | **Ücretsiz** |
| MotionPathPlugin | Club GreenSock | **Ücretsiz** |
| SplitText | Club GreenSock | **Ücretsiz** |
| ScrollTrigger | Ücretsiz | Ücretsiz |

> **Not:** MorphSVGPlugin CodePen'de özel bir versiyonla çalışır; production için indirip kendi asset'in olarak sunman gerekir (veya npm paketi). DrawSVGPlugin ve MotionPathPlugin cdnjs/jsDelivr üzerinden direkt kullanılabilir.

---

## 3. SVG Dosyası Nasıl Hazırlanmalı

### 3.1 — viewBox Zorunlu

`viewBox` olmayan SVG'lerde koordinat sistemi belirsizleşir, animasyonlar yanlış konumlara gidebilir.

```svg
<!-- ✗ Kötü -->
<svg width="400" height="300">

<!-- ✓ İyi -->
<svg viewBox="0 0 400 300" width="400" height="300">

<!-- ✓ Responsive için -->
<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
```

### 3.2 — Her Elemana `id` ver

GSAP selector ile hedef almak için id şart değil ama büyük SVG'lerde çok pratik:

```svg
<path id="logoMark" d="M10 20..."/>
<circle id="dot" cx="50" cy="50" r="10"/>
```

### 3.3 — SVGO ile Optimize Et

Tasarım araçları (Figma, Illustrator) gereksiz metadata, boş `<g>` grupları ve fazladan attribute üretir. GSAP animasyonu daha temiz SVG'de daha iyi çalışır.

- Figma → Export → SVG → "Include id attribute" işaretli tut
- SVGO CLI: `npx svgo input.svg -o output.svg`
- **Kaldırılması gerekenler:** `sodipodi:*`, `inkscape:*`, boş `<g>`, inline style'lar

### 3.4 — Hangi SVG Elementleri Animate Edilebilir?

| Element | Direkt Morph | DrawSVG | MotionPath | convertToPath |
|---|---|---|---|---|
| `<path>` | ✓ | ✓ | ✓ (target olarak) | — |
| `<circle>` | ✗ | ✓ | ✗ | ✓ → path |
| `<rect>` | ✗ | ✓ | ✗ | ✓ → path |
| `<ellipse>` | ✗ | ✓ | ✗ | ✓ → path |
| `<line>` | ✗ | ✓ | ✗ | ✓ → path |
| `<polyline>` | ✓ | ✓ | ✗ | ✓ → path |
| `<polygon>` | ✓ | ✓ | ✗ | ✓ → path |
| `<text>` | ✗ | ✗ | ✗ | ✗ |

> **Kural:** Morphing ve MotionPath target olarak kullanmak istediğin tüm şekilleri `<path>`'e çevir — ya Figma/Illustrator'da "Outline Stroke" / "Object to Path" ile ya da `MorphSVGPlugin.convertToPath()` ile.

---

## 4. Transform Tuzakları — fill-box ve svgOrigin

SVG'de transform davranışı HTML'den farklıdır. Bu en çok karşılaşılan sorun kaynağıdır.

### 4.1 — transform-box: fill-box

SVG elementleri varsayılan olarak **SVG koordinat sistemini** transform-origin olarak kullanır — elementin kendi merkezini değil. Sonuç: `rotation` beklenmedik bir noktadan döner.

**Çözüm — CSS:**
```css
svg * {
  transform-box: fill-box;
  transform-origin: center;
}
```

Bu tek kural ile tüm SVG child elementleri kendi bounding box'larını transform referansı olarak kullanır.

### 4.2 — GSAP `transformOrigin` vs `svgOrigin`

| Property | Koordinat sistemi | Kullanım |
|---|---|---|
| `transformOrigin` | Element bounding box (%) | `transformOrigin: "50% 50%"` — elementin merkezi |
| `svgOrigin` | SVG canvas koordinatları (px) | `svgOrigin: "200 150"` — SVG'nin (200,150) noktası |

```javascript
// Element kendi merkezinden dönsün
gsap.to("#gear", { rotation: 360, transformOrigin: "50% 50%", repeat: -1 });

// SVG canvas'ında belirli bir noktadan dönsün
gsap.to("#needle", { rotation: 45, svgOrigin: "0 100" });
```

### 4.3 — Firefox / Safari Uyumluluk

- Firefox: %-tabanlı `transform-origin` SVG'de desteklenmiyordu (artık büyük ölçüde düzeltildi ama `fill-box` CSS kuralı güvence altına alır)
- Safari: Eski sürümlerde %-tabanlı ve px-tabanlı origin arasında senkron kayması
- **Güvenli yol:** CSS'de `transform-box: fill-box` + GSAP'ta `transformOrigin: "50% 50%"` kombinasyonu

---

## 5. DrawSVGPlugin — Stroke Çizim Animasyonu

### 5.1 — Ne Yapar?

`stroke-dasharray` ve `stroke-dashoffset` CSS özelliklerini kontrol ederek bir SVG stroke'unu **aşamalı olarak çizer veya siler**. Fill'i etkilemez — sadece stroke.

### 5.2 — SVG Hazırlığı

```svg
<!-- stroke tanımlı olmalı, fill opsiyonel -->
<path
  id="line"
  d="M10 50 Q 50 10 90 50"
  stroke="#EC008C"
  stroke-width="2"
  fill="none"
/>
```

> CSS veya inline attribute ile `stroke` ve `stroke-width` verilmiş olmalı. `fill: none` yoksa şekil dolu görünür.

### 5.3 — Temel Kullanım

```javascript
gsap.registerPlugin(DrawSVGPlugin);

// Sıfırdan tüm path'i çiz
gsap.from("#line", { drawSVG: 0, duration: 2 });

// Belirli segmenti göster: %20 ile %80 arası
gsap.to("#line", { drawSVG: "20% 80%", duration: 1.5 });

// Ortadan dışa doğru açılsın
gsap.fromTo("#line",
  { drawSVG: "50% 50%" },
  { drawSVG: "0% 100%", duration: 2, ease: "power2.out" }
);
```

### 5.4 — Değer Formatları

| Format | Sonuç |
|---|---|
| `0` | Tamamen gizli |
| `"100%"` | Tamamen görünür |
| `"30%"` | Baştan %30'u görünür |
| `"20% 80%"` | %20–%80 arası segment görünür |
| `"50% 50%"` | Ortada sıfır uzunluk (başlangıç noktası) |
| `"20% 70% live"` | Live mode: resize'da otomatik yeniden hesapla |

### 5.5 — ScrollTrigger ile

```javascript
gsap.from("#path", {
  drawSVG: 0,
  duration: 1,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: "#path",
    start: "top 80%",
    end: "bottom 20%",
    scrub: 1,
  }
});
```

### 5.6 — Çoklu Path — Stagger

```javascript
gsap.from(".stroke-line", {
  drawSVG: 0,
  duration: 1.5,
  stagger: 0.1,
  ease: "power3.out",
});
```

---

## 6. MorphSVGPlugin — Şekil Morphing

### 6.1 — Ne Yapar?

Bir SVG şeklini başka bir SVG şekline dönüştürür. **Nokta sayısının eşleşmesi gerekmez** — bu GSAP'ın en büyük avantajlarından biri.

### 6.2 — Temel Kural: Her şey `<path>` olmalı

```javascript
// Önce primitive elementleri path'e çevir
MorphSVGPlugin.convertToPath("circle, rect, ellipse, line, polygon, polyline");

// Sonra morph et
gsap.to("#circle", {
  morphSVG: "#star",
  duration: 1.5,
  ease: "power2.inOut"
});
```

`convertToPath()` elementin `id`'sini korur — hedeflemeye devam edebilirsin.

### 6.3 — Morph Hedefi: 3 Farklı Yöntem

```javascript
// 1. Selector ile
gsap.to("#shape", { morphSVG: "#targetShape" });

// 2. Raw path data ile
gsap.to("#shape", { morphSVG: "M10 80 Q 95 10 180 80" });

// 3. DOM elementi ile
gsap.to("#shape", { morphSVG: document.querySelector("#targetShape") });
```

### 6.4 — Konfigürasyon Seçenekleri

```javascript
gsap.to("#shape", {
  morphSVG: {
    shape: "#target",
    shapeIndex: "auto",  // veya sayı / sayı dizisi
    type: "rotational",  // "linear" (default) | "rotational"
    origin: "50% 50%",
    smooth: true,
    curveMode: false,    // true → kinksizleştirir ama bazı şekillerde kötü görünebilir
  },
  duration: 2,
  ease: "power2.inOut",
});
```

| Seçenek | Açıklama |
|---|---|
| `shapeIndex` | Başlangıç noktası hizalaması. `"auto"` genellikle en iyi sonucu verir. Kötü görünen morphlarda `0`'dan başlayıp test et |
| `type: "rotational"` | Noktalar doğrusal değil dönel interpolasyonla hareket eder — organik his |
| `smooth: true` | Curve handle'larını smooth tutar, kink oluşmaz |
| `curveMode: true` | Kink'leri önler ama nokta mesafeleri yakınsa kötü görünebilir — test et |
| `origin` | Morphing'in referans aldığı merkez nokta |

### 6.5 — Döngüsel Morph (A → B → C → A)

```javascript
var shapes = ["#circle", "#star", "#blob", "#circle"];
var current = 0;

function morph() {
  current++;
  gsap.to(shapes[0], {
    morphSVG: shapes[current % shapes.length],
    duration: 1.5,
    ease: "power2.inOut",
    onComplete: morph,
  });
}
morph();
```

### 6.6 — MorphSVG için Figma'dan Export

1. Her şekli ayrı frame'de veya group'ta tut
2. Tüm stroke'ları "Outline Stroke" yap
3. Boolean operasyonlar varsa flatten et
4. Export → SVG → her şekil tek `<path>` olsun
5. Karmaşık compound path'ler tek `<path>` olarak export edilmeli

---

## 7. MotionPathPlugin — Path Üzerinde Hareket

### 7.1 — Ne Yapar?

Bir HTML veya SVG elementini, tanımladığın SVG `<path>` boyunca hareket ettirir.

### 7.2 — Temel Kullanım

```html
<svg viewBox="0 0 500 300">
  <path id="track" d="M50,150 C150,50 350,50 450,150" fill="none"/>
</svg>
<div id="ball"></div>
```

```javascript
gsap.registerPlugin(MotionPathPlugin);

gsap.to("#ball", {
  motionPath: {
    path: "#track",
    align: "#track",        // koordinat sistemlerini hizala
    alignOrigin: [0.5, 0.5], // elementin hangi noktası path üzerinde olsun
    autoRotate: true,        // hareket yönüne otomatik dönsün
  },
  duration: 4,
  ease: "power1.inOut",
  repeat: -1,
});
```

### 7.3 — align Zorunluluğu

HTML element SVG içinde değilse koordinat sistemleri farklıdır. `align` bunu otomatik çözer:

```javascript
motionPath: {
  path: "#svgPath",
  align: "#svgPath",   // zorunlu: farklı koordinat sistemlerini köprüler
}
```

### 7.4 — Konfigürasyon

| Seçenek | Tip | Açıklama |
|---|---|---|
| `path` | string / element | Takip edilecek SVG path |
| `align` | string / element | Koordinat sistemi hizalaması |
| `alignOrigin` | `[0-1, 0-1]` | `[0.5, 0.5]` = merkez, `[0, 0]` = sol üst |
| `autoRotate` | boolean / number | `true` = path yönünde dönsün. Sayı = offset derece ekle |
| `start` | 0–1 | Path'in hangi noktasından başlansın |
| `end` | 0–1 | Path'in hangi noktasında durulsun |
| `offsetX` / `offsetY` | number | Path'ten px cinsinden offset |

### 7.5 — ScrollTrigger + MotionPath

```javascript
gsap.to("#element", {
  motionPath: {
    path: "#curve",
    align: "#curve",
    alignOrigin: [0.5, 0.5],
    autoRotate: true,
  },
  ease: "none",
  scrollTrigger: {
    trigger: ".section",
    start: "top top",
    end: "bottom bottom",
    scrub: 1,
  },
});
```

### 7.6 — Sadece Koordinat Dizisiyle (SVG'siz)

```javascript
gsap.to("#element", {
  motionPath: {
    path: [
      { x: 0,   y: 0   },
      { x: 200, y: -80 },
      { x: 400, y: 0   },
    ],
    type: "cubic",   // "cubic" | "thru" (smooth curve through points)
    curviness: 1.5,
  },
  duration: 3,
});
```

---

## 8. Mask ve ClipPath Animasyonu

### 8.1 — ClipPath

Element bir şekil tarafından maskelenir; şekil dışına çıkan alan görünmez.

```html
<svg viewBox="0 0 400 400">
  <defs>
    <clipPath id="reveal">
      <rect id="clipRect" x="0" y="400" width="400" height="400"/>
    </clipPath>
  </defs>
  <image clip-path="url(#reveal)" href="photo.jpg" width="400" height="400"/>
</svg>
```

```javascript
// Aşağıdan yukarı reveal
gsap.to("#clipRect", {
  y: 0,
  duration: 1.2,
  ease: "power3.out",
  scrollTrigger: { trigger: "svg", start: "top 75%" }
});
```

### 8.2 — SVG Mask (Alpha destekli)

Mask, alpha kanalını kullanır — clipPath sadece sınır keser, mask opaklık gradyanları uygulayabilir.

```html
<svg viewBox="0 0 400 400">
  <defs>
    <mask id="fadeMask">
      <!-- Beyaz = tam görünür, Siyah = tam gizli -->
      <rect width="400" height="400" fill="white"/>
      <rect id="maskBlock" y="0" width="400" height="0" fill="black"/>
    </mask>
  </defs>
  <image mask="url(#fadeMask)" href="photo.jpg" width="400" height="400"/>
</svg>
```

```javascript
gsap.to("#maskBlock", { height: 400, duration: 1.5, ease: "power2.inOut" });
```

### 8.3 — CSS clip-path (SVG'siz, HTML elementleri için)

```javascript
// Daire reveal
gsap.from(".card", {
  clipPath: "circle(0% at 50% 50%)",
  duration: 0.8,
  ease: "power2.out",
  stagger: 0.1,
});
// to:
// clipPath: "circle(150% at 50% 50%)"
```

> `clip-path` CSS property HTML elementlere de uygulanır — SVG şekli olmak zorunda değil.

---

## 9. Performans Kuralları

### 9.1 — GPU Compositeable Properties

Sadece bunları animate et — layout recalc tetiklemez:

| ✓ GPU | ✗ Layout Trigger |
|---|---|
| `transform` (x, y, scale, rotation) | `width`, `height` |
| `opacity` | `top`, `left`, `margin` |
| `fill` (renk) | `padding` |
| `stroke-dashoffset` | `font-size` |

### 9.2 — will-change

```css
.animated-path {
  will-change: transform, opacity;
}
```

> Aşırı kullanma — her element için değil, sadece sürekli animate edilenler için.

### 9.3 — quickTo — Sık Tetiklenen Animasyonlar

Mouse takibi gibi her frame'de çalışan animasyonlar için `gsap.to()` değil `quickTo()`:

```javascript
var moveX = gsap.quickTo("#dot", "x", { duration: 0.3, ease: "power2.out" });
var moveY = gsap.quickTo("#dot", "y", { duration: 0.3, ease: "power2.out" });

document.addEventListener("mousemove", function(e) {
  moveX(e.clientX);
  moveY(e.clientY);
});
```

### 9.4 — SVG Karmaşıklığı

| Element sayısı | Öneri |
|---|---|
| < 50 | Sorunsuz |
| 50–200 | `will-change` ekle, filter/mask dikkatli kullan |
| > 200 | Canvas'a taşımayı düşün |

### 9.5 — Filter Performansı

`feGaussianBlur`, `feColorMatrix` gibi SVG filtreleri GPU yerine CPU'da çalışır — büyük elementlerde dikkatli kullan.

### 9.6 — IntersectionObserver ile Pause

```javascript
var anim = gsap.to("#el", { rotation: 360, repeat: -1, paused: true });

var io = new IntersectionObserver(function(entries) {
  entries[0].isIntersecting ? anim.play() : anim.pause();
});
io.observe(document.querySelector("#el"));
```

---

## 10. CDN Link'leri — Sestek Entegrasyonu

### GSAP Core + Plugin'ler

```html
<!-- head'e -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">

<!-- Defer — render blocking sıfır -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/DrawSVGPlugin.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/MotionPathPlugin.min.js" defer></script>
```

> **MorphSVGPlugin** cdnjs üzerinden dağıtılmıyor — npm'den indir, kendi CDN'ine koy ya da Sestek repo'suna ekle.

### DOMContentLoaded Init

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
    // MorphSVGPlugin varsa: gsap.registerPlugin(MorphSVGPlugin);

    // Primitive shape'leri path'e çevir (morph için)
    // MorphSVGPlugin.convertToPath("circle, rect, ellipse");
  });
</script>
```

### CSS — Global SVG Kuralı

Tüm SVG elementlerinde transform'ların doğru çalışması için bu kuralı global CSS'e ekle:

```css
svg * {
  transform-box: fill-box;
  transform-origin: center center;
}
```

---

## Özet — Hızlı Karar Ağacı

```
Ne yapmak istiyorum?
│
├── Stroke'u çizmek / silmek
│     └── DrawSVGPlugin
│           • SVG'de stroke + fill:none olsun
│           • drawSVG: "0% 100%" ile animate et
│
├── Bir şekli başka şekle dönüştürmek
│     └── MorphSVGPlugin
│           • Her iki şekil <path> olsun
│           • convertToPath() ile primitive'leri çevir
│           • shapeIndex:"auto" ile başla
│
├── Bir elementi yol boyunca hareket ettirmek
│     └── MotionPathPlugin
│           • Path SVG'de <path> olarak tanımlanmış olsun
│           • align ile koordinat sistemini hizala
│           • autoRotate:true ekle
│
├── İçeriği maske ile reveal etmek
│     └── SVG clipPath veya mask
│           • clip içindeki <rect> / <circle>'ı GSAP ile animate et
│
└── Basit hareket / transform
      └── Vanilla GSAP (plugin gereksiz)
            • transform-box: fill-box CSS'te olsun
            • transformOrigin: "50% 50%" kullan
```
