# Sestek Orbit Collection — v1.0.0

> `svg/orbit/` altındaki animasyona hazır, marka gradyanlı yörünge (orbit) SVG seti.
> Tamamı `js/animations/orbit.js` ile uyumludur: sayfaya inline gömüp
> `Sestek.initOrbit()` çağırmak yeterli — halkalar scroll'da çizilir,
> `data-orbit-track` halkasında kuyruklu yıldız döner.

---

## Varyantlar

| Dosya | viewBox | preserveAspectRatio | Kullanım yeri |
|---|---|---|---|
| `orbit-edge-left.svg` | 491×271 | `xMinYMid slice` | Section/body **sol kenar** dekoru |
| `orbit-edge-right.svg` | 491×271 | `xMaxYMid slice` | Sol varyantın ayna ikizi — **sağ kenar** |
| `orbit-hero.svg` | 1440×600 | `xMidYMid slice` | Hero / tam genişlik bant arkaplanı (ufuk yayları) |
| `orbit-divider.svg` | 1440×200 | `xMidYMid slice` | Section geçişleri — sığ yay bandı |
| `orbit-corner.svg` | 480×480 | `xMaxYMin slice` | Kart / component **sağ üst köşe** çeyrek yayları |
| `orbit-corner-bl.svg` | 480×480 | `xMinYMax slice` | Corner'ın ikizi — **sol alt köşe** |
| `orbit-ring.svg` | 480×480 | `xMidYMid meet` | Tamamı görünür atom halkaları — ikon, kart merkezi |
| `orbit-edge-top.svg` | 1440×260 | `xMidYMid slice` | Divider'ın ikizi — **üst kenardan** sarkan sığ yaylar |
| `orbit-planet.svg` | 1440×720 | `xMidYMid slice` | Sık aralıklı gezegen ufku — footer üstü / CTA bandı |
| `orbit-weave.svg` | 1440×600 | `xMidYMid slice` | İki ayna yelpazenin ortada kesişmesi — geniş bant |
| `orbit-side-tall-left.svg` | 420×900 | `xMinYMid slice` | Dikey panel yelpazesi — uzun section **sol** kolonu |
| `orbit-side-tall-right.svg` | 420×900 | `xMaxYMid slice` | Ayna ikizi — **sağ** kolon |
| `orbit-halo.svg` | 480×480 | `xMidYMid meet` | Sakin eş merkezli halkalar — portre/görsel çerçevesi |
| `orbit-vortex.svg` | 480×480 | `xMidYMid meet` | Yarım tur yelpaze — giyoşe çiçeği, kart merkezi |
| `orbit-badge.svg` | 240×240 | `xMidYMid meet` | Mini üç halkalı atom — küçük ikon/rozet |

Ortak DNA: marka gradyanı (`#EC008C → #7F81AE → #00FFEB`), kılcal stroke
(0.75–1px), tek uzak merkezden yayılan elips yayları. Kenar ve hero
varyantlarında halkaların büyük kısmı canvas dışındadır (`slice` kırpar) —
kuyruklu yıldız bu yüzden "geçip giden" bir kuyruklu yıldız gibi okunur.

## Teknik kararlar (yeni SVG türetirken uy)

1. **Halkalar transform'suz `<path>`** (iki eliptik arc, koordinatlar gömülü).
   `transform="rotate(…)"` KULLANMA: `userSpaceOnUse` gradyan, elementin
   transform'undan da geçer — döndürülmüş halkada görünür yay gradyanın tek
   ucuna düşer ve tek renk görünür.
2. **Gradyan `gradientUnits="userSpaceOnUse"`**, viewBox köşegenine yayılır
   (sol-alt pembe → sağ-üst turkuaz; sağ varyantta ayna). Böylece üç renk de
   her zaman görünür — `objectBoundingBox` dev halka bbox'larında rengi yutar.
3. **Gradyan id'leri varyant başına benzersizdir** (`sogEdgeL`, `sogHero`…).
   AYNI varyantı bir sayfada iki kez kullanacaksan ikinci kopyada id'yi ve
   `url(#…)` referanslarını yeniden adlandır — id çakışmasında DOM'daki ilk
   tanım kazanır; o kopya `display:none` ise stroke'lar görünmez olur.
4. **Kök öznitelikler:** `data-orbit` + `viewBox` + `fill="none"` +
   `preserveAspectRatio` — `width/height` verme (responsive, CSS belirler).
5. Kuyruklu yıldız halkasını `data-orbit-track` ile seç; canvas'ı kesen bir
   halka olsun (orbit.js kesmezse en görünür halkaya düşer ve console'a uyarı
   basar).
6. Kenar/dikey panellerde `rx`, merkezden canvas'ın en uzak köşesine olan
   mesafeden BÜYÜK olmalı — elipsin sivri ucu (major eksen tepesi) canvas
   içine düşerse yay ortasında keskin bir kırık görünür.

## Webflow kullanımı

SVG **inline gömülmelidir** (Embed elementi) — `<img src>` ile orbit.js
elementlere erişemez, animasyon çalışmaz.

1. `svg/orbit/<varyant>.svg` içeriğini kopyala → sayfada bir **Embed**
   elementine yapıştır.
2. Embed'i saran div'e konumunu ver (ör. sağ kenar dekoru):

```html
<!-- section'a: position:relative; overflow:hidden -->
<div style="position:absolute; inset:0; pointer-events:none;">
  <!-- Embed buraya; svg'ye CSS: position:absolute; right:0; top:0; height:100%; width:auto; -->
</div>
```

3. Head'e script'ler (bkz. `docs/PROJECT.md` — hepsi `defer`):

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/DrawSVGPlugin.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/MotionPathPlugin.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/animations/orbit.js" defer></script>
```

4. Body sonu init'ine ekle:

```js
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin);
Sestek.initOrbit();
```

Davranışı `data-orbit-*` öznitelikleriyle ayarla (hız, nokta rengi/boyu,
derinlik efekti…) — tam liste `js/animations/orbit.js` başlığında.

## Demo

```bash
python3 -m http.server   # repo kökünde
# → http://localhost:8000/demo/orbit-collection/
```

`demo/orbit-collection/index.html` altı varyantı da gerçek yerleşim
örnekleriyle (kenar, hero, köşe, divider) canlı gösterir.
