# Fluted Glass — Kullanım Kılavuzu

> Webflow Brand Studio'nun WebGL tabanlı "oluklu cam" (fluted glass) shader
> component'i. Arka planda yumuşak renk blob'ları, önünde dikey cam oluklarının
> kırıcı/buzlu (frosted) etkisi. Three.js ile GPU'da çalışır.
>
> Bu belge: **render'ı bloklamayan, PageSpeed'i patlatmayan, şık** bir kullanım
> için kurulum, tüm parametreler ve Sestek stack'iyle uyum kuralları.

---

## İçindekiler

1. [Ne İşe Yarar](#1-ne-i̇şe-yarar)
2. [Kütüphaneler ve Yükleme](#2-kütüphaneler-ve-yükleme)
3. [Performans — Render'ı Bloklamamak](#3-performans--renderı-bloklamamak)
4. [Temel Kullanım](#4-temel-kullanım)
5. [Tüm Data-Attribute'lar](#5-tüm-data-attributelar)
6. [Şık Kullanım Reçeteleri](#6-şık-kullanım-reçeteleri)
7. [Sestek Stack ile Uyum](#7-sestek-stack-ile-uyum)
8. [Erişilebilirlik ve Fallback](#8-erişilebilirlik-ve-fallback)
9. [Hızlı Karar Listesi](#9-hızlı-karar-listesi)

---

## 1. Ne İşe Yarar

`[data-fluted-glass]` attribute'u verdiğin bir container'a, içinde:

- **Arka planda** 1–3 adet animasyonlu, yumuşak renk **blob**'u (gradient kürecikler)
- **Önünde** dikey **cam olukları** (fluted glass) — ışığı kıran, buzlu cam dokusu
- İsteğe bağlı **arka plan görseli** (blur'lanmış texture olarak)

Sonuç: Apple / Webflow Brand sitelerindeki o "premium frosted glass" hissi.
Tamamen prosedürel (görsel asset gerekmez), WebGL shader ile çizilir.

**Nasıl çalışır (özet):**
- Orthographic kamera + tek bir full-viewport plane + fragment shader
- Blob'lar shader içinde Perlin-benzeri noise ile animate edilir
- Cam olukları bir "column lookup" ile dikey distortion olarak uygulanır
- Hover'da blob'lara hafif parallax verilir

---

## 2. Kütüphaneler ve Yükleme

İki script gerekir — **Three.js r128** (WebGL motoru) ve **fluted-glass** component'i:

```html
<!-- Webflow Page/Site Settings → <head> ya da </body> öncesi -->
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/gh/webflow/brand_studio@4f0eb75/global-brand-code/custom-components/fluted-glass.min.js"></script>
```

> **Sıra önemli:** Three.js önce yüklenmeli (component ona bağımlı). İkisi de
> `defer` taşıdığı için belge sırasında çalışır — bu sırayı koru.

**Otomatik başlatma:** Component `window.load`'da kendini başlatır — manuel bir
`init()` çağrısı **gerekmez**. CPU çekirdek sayısına göre 500–800ms gecikmeyle,
`IntersectionObserver` ile lazy (görünür olunca) devreye girer.

> Yani Sestek'in `DOMContentLoaded` init bloğuna bu component için bir şey
> eklemene gerek yok — kendi kendine, en geç ve en güvenli anda kalkar.

---

## 3. Performans — Render'ı Bloklamamak

Three.js r128 **ağır** bir bağımlılıktır (~600KB min / ~155KB gzip). Şık dursun
diye her sayfaya eklemek PageSpeed'i düşürür. Component'in kendisi zaten agresif
şekilde performans için ayarlı; aşağıdaki kurallarla "bedava" gibi kullanılabilir.

### Component'in built-in optimizasyonları (sende kod yok, bilmen iyi)

| Önlem | Değer | Etkisi |
|---|---|---|
| `defer` + `window.load` init | 500–800ms gecikme | Kritik render yolunu bloklamaz |
| `IntersectionObserver` (200px margin) | lazy | Görünmeyen instance hiç çizilmez |
| FPS gate | ~30 FPS (33ms) | rAF'ı doldurmaz; ana thread'e nefes verir |
| Render budget | 40ms üstünü atlar | Yavaş frame'de kendini geri çeker |
| `resolutionScale` | 0.75 | Canvas %75 çözünürlükte çizilip CSS'le büyütülür |
| `maxInstances` | 8 | Aynı anda en çok 8 canvas |
| `prefers-reduced-motion` | animasyon + hover kapanır | Erişilebilirlik + pil |
| Mobil / düşük CPU tespiti | kalite düşürülür | Zayıf cihazda jank yok |

### Senin uyman gereken kurallar

1. **Sadece kullandığın sayfaya yükle.** İki script'i global Site Settings'e
   değil, fluted-glass olan **Page Settings**'e koy. Bloga, footer'a, her yere
   Three.js taşımak en büyük PageSpeed hatası olur.

2. **Instance sayısını az tut.** İdeali sayfa başına **1–2**. `maxInstances: 8`
   bir tavan, hedef değil. Her instance ayrı bir WebGL context + canvas demek.

3. **Container'a sabit boyut ver (CLS koruması).** WebGL canvas async kalkar;
   container'ın yüksekliği baştan belli olmalı ki layout zıplamasın:
   ```css
   .fluted-hero { aspect-ratio: 16 / 9; }   /* veya min-height */
   ```

4. **LCP elementinin arkasına koyma.** Fluted glass'i sayfanın **en büyük
   görseli/başlığı** olarak kullanma — geç kalktığı için LCP'yi geciktirir.
   Dekoratif katman olarak, kritik içeriğin arkasında/yanında kullan.

5. **Büyük alanlarda instance'ı tekleştir.** Tam ekran kullanıyorsan tek bir
   instance bırak ve alanı gereğinden büyük tutma. Canvas zaten içeride %75
   çözünürlükte (`resolutionScale: 0.75`) çizilip CSS'le büyütülür — bu ayar
   component'in içindedir, ekstra bir şey yapman gerekmez.

6. **Hover'ı gerek yoksa kapat.** `data-hover="false"` → mousemove dinleyicisi
   ve parallax hesabı çalışmaz; statik dekoratif kullanımda ücretsiz kazanç.

> **"Çizime engel olmuyor" garantisi:** WebGL render'ı GPU'da, ayrı bir canvas'ta
> olur — DOM layout/paint'i tetiklemez, GSAP/ScrollTrigger animasyonlarını
> bloklamaz. Tek paylaşılan kaynak `requestAnimationFrame`'dir; component zaten
> 30 FPS gate + render budget ile kendini sınırladığı için GSAP'a yer bırakır.
> Yine de aynı viewport'ta 3+ instance + ağır scrub animasyonu üst üste binerse
> dikkatli ol — instance'ı azalt ya da `resolution-scale`'i düşür.

---

## 4. Temel Kullanım

En sade hâli — bir container'a attribute vermek yeterli:

```html
<div data-fluted-glass class="fluted-panel"></div>
```

```css
.fluted-panel {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;   /* CLS'i önlemek için boyutu baştan ver */
  border-radius: 16px;
  overflow: hidden;
}
```

Üzerine içerik koymak için container'ı katman olarak kullan:

```html
<section class="hero">
  <!-- Arka dekoratif cam katmanı -->
  <div data-fluted-glass
       data-color-one="#5983f8"
       data-color-two="#c1ff5b"
       class="hero__glass"></div>

  <!-- Öndeki içerik -->
  <div class="hero__content">
    <h1>Başlık</h1>
    <p>Açıklama</p>
  </div>
</section>
```

```css
.hero { position: relative; isolation: isolate; }
.hero__glass {
  position: absolute; inset: 0; z-index: 0;
}
.hero__content {
  position: relative; z-index: 1;   /* cam katmanının üstünde */
}
```

---

## 5. Tüm Data-Attribute'lar

Hepsi opsiyoneldir; sadece `data-fluted-glass` zorunludur.

### Kolonlar (cam olukları)

| Attribute | Tip | Default | Açıklama |
|---|---|---|---|
| `data-width-preset` | string | — | Hazır kolon düzeni: `minimal` / `balanced` / `extremes` / `dense` |
| `data-columns` | int | — | Dikey kolon sayısı (preset yerine elle) |
| `data-width-variation` | float | — | Kolon genişliği rastgeleliği |
| `data-distortion` | float | — | Kolon kırılma/distortion şiddeti |
| `data-noise` | float | 0.015–0.035 | Yüzey grain/noise miktarı |
| `data-seed` | int | 1234 | Kolon üretimi için rastgele tohum (aynı seed = aynı desen) |

### Blob'lar (arka plan renk küreleri)

| Attribute | Tip | Default | Açıklama |
|---|---|---|---|
| `data-color-one` | hex / CSS var | `#5983f8` | 1. blob rengi |
| `data-color-two` | hex / CSS var | `#c1ff5b` | 2. blob rengi |
| `data-color-three` | hex / CSS var | `#ffff5b` | 3. blob rengi |
| `data-size-one` | float | 0.7 | 1. blob ölçeği |
| `data-size-two` | float | 0.6 | 2. blob ölçeği |
| `data-size-three` | float | 0.65 | 3. blob ölçeği |
| `data-use-blob-one` | bool | true | 1. blob görünür mü |
| `data-use-blob-two` | bool | true | 2. blob görünür mü |
| `data-use-three-color` | bool | false | 3. blob'u etkinleştir |
| `data-shape-type-one` | 0–3 | 0 | Şekil: `0` organik · `1` dikdörtgen · `2` yıldız · `3` üçgen |
| `data-shape-type-two` | 0–3 | 0 | (aynı seçenekler) |
| `data-shape-type-three` | 0–3 | 0 | (aynı seçenekler) |

### Hover / etkileşim

| Attribute | Tip | Default | Açıklama |
|---|---|---|---|
| `data-hover` | bool | true | Hover parallax açık/kapalı |
| `data-hover-intensity` | float | 1.0 | Hover etkisinin çarpanı |
| `data-sensitivity-one` | float | 0.08 | 1. blob hover parallax duyarlılığı |
| `data-sensitivity-two` | float | 0.05 | 2. blob parallax duyarlılığı |
| `data-sensitivity-three` | float | 0.1 | 3. blob parallax duyarlılığı |

### Arka plan / genel

| Attribute | Tip | Default | Açıklama |
|---|---|---|---|
| `data-bg-color` | hex / CSS var | — | Arka plan rengi |
| `data-background-image` | URL | — | Blur'lanıp texture olarak kullanılacak görsel |

> Görseli ayrıca gizli bir `<img class="fluted-glass-image">` ile de
> verebilirsin; geçerliyse `src`'si arka plan olarak alınır.

> **CSS variable desteği:** Renk attribute'ları hex yerine `var(--token)` da
> kabul eder. RC Structure token'larını (`var(--brand-primary--500)` vb.)
> doğrudan verebilirsin — PROJECT.md'nin "raw hex kullanma" kuralına uyar.

---

## 6. Şık Kullanım Reçeteleri

### A) Minimal premium hero arka planı (önerilen başlangıç)

Marka renkleri, az kolon, hover kapalı (statik, en hafif):

```html
<div data-fluted-glass
     data-width-preset="balanced"
     data-color-one="var(--brand-primary--500)"
     data-color-two="var(--brand-secondary--500)"
     data-use-three-color="false"
     data-hover="false"
     data-noise="0.02"
     class="hero__glass"></div>
```

### B) Canlı, etkileşimli kart arka planı

Üç renk, hafif hover parallax — küçük alanda jank riski düşük:

```html
<div data-fluted-glass
     data-width-preset="dense"
     data-use-three-color="true"
     data-color-one="#5983f8"
     data-color-two="#c1ff5b"
     data-color-three="#ffff5b"
     data-hover="true"
     data-hover-intensity="0.8"
     class="card__glass"></div>
```

### C) Bölüm ayırıcı (frosted divider) — tam genişlik, ince şerit

Geniş ama ince bir şeritte, hover kapalı ve tek instance — GPU yükü minimum:

```html
<div data-fluted-glass
     data-width-preset="extremes"
     data-bg-color="var(--neutral--900)"
     data-hover="false"
     class="section-divider"></div>
```

```css
.section-divider { width: 100%; height: 180px; }
```

**Şıklık ipuçları**
- **2 renk genelde 3'ten şık** durur — `data-use-three-color="false"` ile başla.
- `noise`'u **düşük tut** (0.015–0.025); fazlası "kirli" görünür.
- Renkleri marka paletinden, **yakın tonlardan** seç — zıt renkler "disko" etkisi yapar.
- Önündeki metni **okunur tut**: cam katmanının üstüne gerekiyorsa hafif bir
  `backdrop`/overlay ekle ya da metni net bir surface kartına al.

---

## 7. Sestek Stack ile Uyum

- **ScrollTrigger / pin çakışması yok.** Fluted glass bir ScrollTrigger
  değildir; `refreshPriority` sistemine girmez, hero/scroll-tabs pinlerini
  etkilemez. (Bkz. PROJECT.md → Pinli Bölüm Kuralları.)
- **Init sırası dert değil.** Component `window.load`'da kendi başlar; Sestek'in
  `DOMContentLoaded` init bloğuna eklenmez.
- **Lenis ile uyumlu.** WebGL canvas scroll'dan bağımsız çizilir; Lenis smooth
  scroll'u etkilemez, ondan etkilenmez.
- **Pinli bir section'ın İÇİNDE kullanırken dikkat:** Hero gibi `transform`
  uygulanan pinli bir kapsayıcının içine koyarsan, transform'lu ancestor WebGL
  canvas'ın boyutlanmasını etkileyebilir. Dekoratif cam katmanını mümkünse
  pinlenen elementin **kardeşi** olarak konumla, child'ı olarak değil.
- **Three.js'i bir kez yükle.** Sayfada GSAP SVG plugin'leri vb. de varsa sorun
  yok; sadece Three.js'i **tek** script tag'iyle ekle (çift yükleme = çift yük).

---

## 8. Erişilebilirlik ve Fallback

- **`prefers-reduced-motion: reduce`** → component blob animasyonunu ve hover'ı
  otomatik kapatır. Ek bir şey yapman gerekmez.
- **WebGL yoksa / başarısızsa** → canvas çizilmez; container boş kalır. Bu yüzden
  container'a CSS ile **anlamlı bir fallback arka planı** ver (düz renk ya da
  gradient) — JS hiç kalkmasa bile bölüm boş/kırık görünmesin:
  ```css
  .hero__glass {
    background: linear-gradient(135deg,
      var(--brand-primary--500), var(--brand-secondary--500));
  }
  /* WebGL kalkınca canvas bu zemini örter; kalkmazsa zemin görünür */
  ```
- **Dekoratiftir:** Cam katmanı bilgi taşımaz; ekran okuyucu için `aria-hidden`
  veya boş bırakmak uygundur. İçeriği ayrı bir katmana koy.

---

## 9. Hızlı Karar Listesi

```
Fluted glass mı kullanacağım?
│
├── Sadece bu sayfada mı lazım?
│     └── Evet → script'leri Page Settings'e koy (Site'a DEĞİL)
│
├── Kritik LCP içeriği mi?
│     └── Evet → KULLANMA (geç kalkar, LCP'yi geciktirir)
│           Hayır → dekoratif katman olarak kullan
│
├── Kaç instance?
│     ├── 1–2 → ideal
│     └── 3+ → hover kapat ve sayıyı azalt
│
├── Alan büyük mü? (tam ekran / geniş şerit)
│     └── tek instance + data-hover="false" (canvas zaten %75 ölçekte çizilir)
│
├── Hover etkisi gerekli mi?
│     ├── Evet → küçük alanda OK
│     └── Hayır → data-hover="false" (ücretsiz performans)
│
└── Her zaman:
      • Container'a sabit boyut (aspect-ratio / min-height) → CLS yok
      • CSS gradient fallback → WebGL kalkmazsa bölüm boş kalmasın
      • 2 renk + düşük noise → en şık başlangıç
      • Renkler için var(--brand-*) token'ları
```

---

> **CDN sürümü pin'i:** `@4f0eb75` belirli bir commit'e pinli — production'da
> bu iyi (sürpriz değişiklik gelmez). Webflow yeni sürüm yayınlarsa hash'i
> bilerek güncelle. Three.js `r128`'i de sabit tut.
>
> https://github.com/roicool/sestek
