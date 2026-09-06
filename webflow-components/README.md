# Sestek Webflow Code Components

Webflow Designer'a **DevLink (Code Components)** ile import edilen React
componentleri. Ana kütüphaneden (js/, css/) tamamen bağımsız bir pakettir —
kendi `package.json`'ı vardır, CDN üzerinden servis edilmez; Webflow CLI ile
workspace'e yayınlanır ve Designer'da native component gibi kullanılır.

## İçerik

| Component | Dosya | Ne yapar |
|---|---|---|
| **Soft Gradient BG** ⭐ | `src/SoftGradientBg.webflow.tsx` | **Önerilen.** Minimal (~11KB, sıfır bağımlılık) saf WebGL soft gradient. 4 karakter: Mist (gezinen lekeler), Flow (yatay dalgalar), Silk (çapraz bantlar), Halo (merkez ışıltı). Yumuşak Sestek renkleri varsayılan; base rengi değiştirerek koyu temaya uyar. Viewport dışında durur, reduced-motion'da statik kare, WebGL yoksa CSS fallback. |
| **Hero** | `src/HeroTablet.webflow.tsx` | Ana sayfa hero'su, **tüm kırılımlar tek component'te**. **≥ 992px:** `hero.js` v1.9'un birebir React hali — sitenin global `gsap` + `ScrollTrigger`'ı ile pin (refreshPriority 2) + scrub timeline; fullscreen video ifadenin içindeki slot'a morph olur, kelimeler / açıklama / istatistikler stagger ile gelir, `[data-nav]`'a `nav--on-light` basılır, sayaçlar ilk açılışta döner; film greni (`grain.js`) ve buton 1'in harf stagger hover'ı (`stagger-button.js`) da içeride. Bundle'a GSAP eklenmez; sayfada gsap yoksa scene 2 statik gösterilir. **≤ 991px:** statik dikey akış — 100svh video bloğu + H1 + 2 CTA + "Trusted by" + **Logos slot'u** (içine Collection List; marquee gömülü), vurgulu ifade + açıklama, görünüme girince sayan istatistikler. Bkz. [Hero](#hero--designer-propları). |
| **Logo Marquee** | `src/LogoMarquee.webflow.tsx` | **CMS'e bağlı** sonsuz logo bandı — `js/components/marquee.js`'in React hali. **Logos slot'una bir Collection List** (Clients → Logo image) bırakılır; component slot'taki `<img>`'leri okuyup gereken sayıda kopya üretir ve kesintisiz kaydırır. Hız, yön, logo boyutu, boşluk; hover'da yumuşak duraklama; drag + momentum (mouse/touch); kenar fade; reduced-motion'da statik. Sıfır bağımlılık. Bkz. [Logo Marquee](#logo-marquee--designer-propları). |
| **Scroll Tabs** | `src/ScrollTabs.webflow.tsx` | "Agentic CX Suite" scroll-tab bölümü — **masaüstü + tablet/mobil tek component'te**, `scroll-list.js`/`.css`'in React hali, sıfır bağımlılık. ≥ 992px: solda sticky başlık + akordeon sekmeler, sağda kare video panelleri; viewport ortasından geçen panel aktif, sekmeye tıklayınca panel ortaya kayar. ≤ 991px: tek sütun, her sekme başlık + açıklama + buton + kendi videosu. Play/pause, restart, mute kontrolleri (hover'da, dokunmatikte hep görünür). 4 sekmeye kadar. Bkz. [Scroll Tabs](#scroll-tabs--designer-propları). |
| **Voice Orbs** | `src/VoiceOrbs.webflow.tsx` | Ses örneği orb carousel'i — `voice-orbs.js` v3.4 + `voice-orbs.css` v2.7'nin React hali, iki artıyla: **(1) sınırsız ses** — "Voices" slot'una Collection List bırakılır, her item bir orb (`data-vo-name` / `data-vo-desc` / `data-vo-src` attribute'ları CMS'e bağlı; slot boşsa 6 sese kadar prop'tan); **(2) görselsiz prosedürel WebGL orb'lar** — aynı fluid-gradient shader her orb'u 3 renkli paletten üretir (küresel gölgeleme, highlight, film greni); aktif orb canlı ve ses-reaktif, diğerleri aynı shader'dan tek karelik statik görüntü (tek WebGL context). Sonsuz döngü, transform-only geçişler, double-buffer audio + AnalyserNode, ilerleme halkası, play/pause, ‹ › ve ←/→. Sıfır bağımlılık. Bkz. [Voice Orbs](#voice-orbs--designer-propları). |
| **Shader Gradient BG** | `src/ShaderGradientBg.webflow.tsx` | [ShaderGradient](https://www.shadergradient.co) tabanlı zengin 3D gradient (three.js, ~1MB lazy chunk — viewport'a yaklaşana dek inmez). Soft Sestek pastel preset'leri: **Soft Mist** (nefes alan sis) · **Soft Water** (yumuşak su yüzeyi) · **Soft Silk** (yavaş çapraz akış) · **Soft Halo** (kürede ışıltı) · **Sestek Deep** (koyu section'lar için canlı) · **Custom** (tür + 3 renk serbest). `prefers-reduced-motion` desteği, WebGL yoksa CSS fallback. |

## Yayınlama (ilk kez)

```bash
cd webflow-components
npm install
npx webflow auth login          # tarayıcıda Webflow OAuth açılır
npx webflow devlink import      # bundle'lar + workspace'e yayınlar
```

İlk `devlink import` çalıştığında CLI interaktif olarak **"create new library"**
sorar — onaylayınca library'yi workspace'inde oluşturur ve `webflow.json`'a
`library.id` alanını kendisi yazar (bu değişikliği commit'le). Sonraki
yayınlarda soru sormadan aynı library'yi günceller.

Yayın sonrası: Webflow Designer → sağ panel **Libraries** → "Sestek Code
Components" → siteye **Install**. Component, Add panel'de "Sestek" grubunda
görünür; canvas'a sürükle, boyutu parent div'den ver.

## Güncelleme yayını

```bash
npx webflow devlink import      # değişiklikleri yeniden yayınlar
```

Sadece yerel build almak için (yayınlamadan): `npx webflow devlink bundle`
(çıktı `dist/`, git'e girmez).

## Otomatik yayın (CI)

`.github/workflows/webflow-components-publish.yml` — `webflow-components/`
klasörüne dokunan her **main** push'unda library'yi otomatik yayınlar.
Aktifleşmesi için iki tek seferlik adım:

1. **İlk yayını lokalde yap** (yukarıdaki "Yayınlama" bölümü) ve CLI'ın
   `webflow.json`'a yazdığı `library.id` alanını **commit'le** — CI,
   interaktif soru soramadığı için id'nin hazır olmasına ihtiyaç duyar.
2. **Workspace API token'ı ekle:** Webflow dashboard → Workspace settings →
   API access → token oluştur; GitHub repo → Settings → Secrets and
   variables → Actions → `WEBFLOW_API_TOKEN` adıyla kaydet.

İkisi tamamlanana kadar workflow uyarı verip sessizce geçer (build'i
kırmaz). Sonrasında akış tamamen otomatiktir: component'i düzenle → main'e
push'la → library workspace'te güncellenir → Designer'da library güncellemesi
olarak görünür.

## Shader Gradient BG — Designer prop'ları

| Prop | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| Preset | Variant | `Sestek Brand` | `Sestek Brand` / `Sestek Deep` / `Halo` / `Custom` |
| Type (Custom) | Variant | `waterPlane` | Sadece Preset=Custom: `waterPlane` / `plane` / `sphere` |
| Color 1-3 (Custom) | Text | marka renkleri | Sadece Preset=Custom: hex renkler |
| Speed | Number | `1` | Hız çarpanı (0–5, 1 = preset hızı) |
| Grain | Boolean | `On` | Film greni dokusu |
| Brightness | Number | `1.2` | Parlaklık (0–3) |
| Animate | Boolean | `On` | Off = tek statik kare |
| Pixel density | Number | `1` | 0.5–2; düşür = akıcı, yükselt = keskin |
| Min height (px) | Number | `480` | Parent'ın yüksekliği yoksa taban; 0 = tamamen parent'a uy |

## Hero — Designer prop'ları

Sayfaya kurulum: mevcut masaüstü hero section'ını ve `hero.js` / `hero.css`
linklerini kaldır, bu component'i koy. Her iki kırılımı kendi içinde çözer,
Designer'da görünürlük ayarı gerekmez. Masaüstü animasyonu sayfanın zaten
yüklediği global `gsap` + `ScrollTrigger`'ı kullanır (component'e bundle
edilmez); `Sestek.refreshScroll` varsa rebuild'ler onun üzerinden gider.
Component sitenin CSS değişkenlerini (`--surface--base`, `--color-text--*`,
`--brand-primary--500`, `--text--6xl`, `--spacing--*`, `--container--*`,
`--view--px`, `--section--py-2`, `--neutral--050`) shadow root içinden miras
alır; font sayfadan gelir.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Video URL (mp4) | Video | Text | Cloudflare Stream `downloads/default.mp4` | Boşsa sadece poster gösterilir |
| Poster URL | Video | Text | Stream thumbnail | Video yüklenene kadar görünen kare |
| Dark overlay | Video | Boolean | `On` | Masaüstünde 0.06–0.28 arasında sönen, mobilde sabit gradient |
| Title (H1) | Headline | Text | "New chapter begins for\|AI-first…" | `\|` = satır kır |
| Subtitle | Headline | Text | … | |
| Button 1 label / link | Buttons | Text / Link | "Read success stories" | Boş label = buton gizli |
| Button 2 label / link | Buttons | Text / Link | "Request a demo" | Ok ikonlu birincil buton |
| Trusted by text | Trusted by | Text | "Trusted by\|700+ companies" | Boş = etiket gizli |
| Logos | Trusted by | Slot | — | **Doğrudan bir Collection List bırak** (Clients → Logo image). Marquee hero'nun içinde çalışır (LogoMarquee gömülü), ayrı component gerekmez; eski `data-marquee` bloğu bırakılsa bile görselleri okur. Masaüstünde scene 1'in altında, mobilde video bloğunun altında |
| Marquee speed / logo size / gap | Trusted by | Number | `60` / `6.25` / `3` | Gömülü marquee ayarları (px/s, rem, rem) |
| Phrase | Statement | Text | "Every interaction, [video]\|better \*than the last\*" | `\|` = satır kır — masaüstünde her satır tek parça, kelimeler satır değiştirmez; `*…*` marka renginde; `[video]` slot (mobilde yok sayılır) |
| Description | Statement | Text | … | |
| Background image | Statement | Image | — | Scene 2 arka planı (masaüstünde `overlay__hero` gradient'i ile) |
| Stat 1–4 value / suffix / label | Stats | Number / Text / Text | 700+, 100%, 98%, 25+ | Value boşsa o stat gizlenir; label'da `\|` satır kırar |
| Animate | Motion | Boolean | `On` | Masaüstü scroll timeline + mobil fade-up + sayaçlar; reduced-motion'da kapanır |
| Scroll distance (× viewport) | Motion | Number | `2.5` | Masaüstünde pin mesafesi (`hero.js`: `+=250%`) |
| Film grain | Effects | Boolean | `On` | `grain.js` v3.1'in film greni overlay'i video üstünde (her iki kırılımda); SVG feTurbulence dokusu, CSS `steps()` ile kayar, CPU maliyeti yok. Reduced-motion'da gizli |
| Grain intensity / size / speed | Effects | Number | `0.08` / `0.3` / `800` | Sitedeki hero'nun `data-grain-*` değerleri (size 0.3–0.9'a kırpılır) |
| Stagger button | Effects | Boolean | `On` | Buton 1'de `stagger-button.js` hover efekti: harfler yukarı kayıp solar, klon alttan gelir (0.5s power3.inOut, 0.03s stagger). SplitText'e ihtiyaç yok, saf CSS |

## Logo Marquee — Designer prop'ları

Kurulum: component'i canvas'a sürükle → **Logos** slot'una bir **Collection
List** ekle (Clients koleksiyonu) → item içine **Image** elemanı koyup Logo
alanına bağla. Başka bir şey (link, metin) koyma; yalnız `<img>` okunur.
Slot'ta hiç görsel yoksa slot içeriği olduğu gibi gösterilir (Designer'da
boş durum). Hero Tablet'in Logos slot'una da aynı şekilde bırakılır.

| Prop | Tip | Varsayılan | Açıklama |
|---|---|---|---|
| Logos | Slot | — | Collection List (Clients → Logo image) |
| Speed (px/s) | Number | `60` | `data-marquee-speed` karşılığı |
| Direction | Variant | `Left` | `Left` / `Right` |
| Logo size (rem) | Number | `6.25` | Kare logo kutusu (marquee.css ile aynı) |
| Gap (rem) | Number | `3` | Logolar arası boşluk |
| Pause on hover | Boolean | `On` | |
| Drag | Boolean | `On` | Off = sadece kayar |
| Fade edges | Boolean | `On` | mask-image kenar geçişi |
| Min height (px) | Number | `0` | 0 = içeriğe göre |

## Scroll Tabs — Designer prop'ları

Sayfaya kurulum: mevcut `.section__scroll-tabs` section'ını (ve `scroll-list.js`
+ `scroll-list.css` linklerini) kaldırıp bu component'i koy. Her iki kırılımı
kendi içinde çözer; Designer'da görünürlük ayarı gerekmez. Tab 4'ün başlığı
boş bırakılırsa sekme gizlenir (3 sekmeli düzen).

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Heading (H2) | Section | Text | "Agentic CX\|Suite" | `\|` = satır kır |
| Sticky top (px) | Section | Number | `0` | Sol sütunun yapıştığı üst mesafe; 0 = `--_nav---nav-height × 1.5` |
| Panel ratio | Section | Variant | `1 / 1` | `1 / 1` / `4 / 3` / `16 / 9` |
| Autoplay active video | Section | Boolean | `On` | Aktif panel sessiz oynar; reduced-motion'da kapalı |
| Tab N › Title | Tab 1–4 | Text | Agentic AI / Agent Copilot / Conversational Intelligence / — | Boş = sekme gizli |
| Tab N › Description | Tab 1–4 | Text | … | |
| Tab N › Button label / link | Tab 1–4 | Text / Link | "Explore" | Boş label = buton gizli |
| Tab N › Video URL (mp4) | Tab 1–4 | Text | Stream `downloads/default.mp4` | Boşsa poster tek başına gösterilir |
| Tab N › Poster URL | Tab 1–4 | Text | Stream thumbnail | |

## Voice Orbs — Designer prop'ları

Kurulum: mevcut `[data-voice-orbs]` kartını ve `voice-orbs.js` / `voice-orbs.css`
linklerini kaldır; component'i kartın yerine koy (bölüm başlığı Webflow'da
kalır). **Voices** slot'una bir Collection List ekle; item'a custom
attribute'lar ver ve CMS alanlarına bağla: `data-vo-name`, `data-vo-desc`,
`data-vo-src` (ses dosyası URL'i), opsiyonel `data-vo-colors` (`#hex,#hex,#hex`).
Orb style = Image kullanılacaksa item'a bir Image elemanı da koy. Attribute
yoksa ilk görsel, ilk iki metin ve ilk link okunur. Slot boşsa Voice 1–6
prop'ları kullanılır (varsayılan: Alloy, Echo, Liam, River).

Ses dosyaları ve (Image modunda) orb görselleri **CORS'lu** servis edilmeli —
AnalyserNode ve WebGL dokusu buna bağlı.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Voices | Voices | Slot | — | Collection List (yukarıdaki attribute'larla) |
| Orb style | Look | Variant | `Procedural` | `Procedural`: görsel gerekmez, shader paletten üretir · `Image`: orb görseli doku (eski davranış) |
| Sizes (px) | Look | Text | `220,150,104` | Orb çapları merkezden dışa (`data-vo-sizes`) |
| Fit width (px) | Look | Number | `760` | Merdivenin tam ölçek genişliği (`data-vo-fit`) |
| Min scale | Look | Number | `0.42` | Küçülme alt sınırı (`data-vo-min-scale`) |
| Gap (px) | Look | Number | `64` | `--vo-gap` |
| Caption width (px) | Look | Number | `280` | `--vo-caption-w` |
| Arrow offset (px) | Look | Number | `230` | `--vo-nav-offset` |
| Start index | Look | Number | `0` | Açılışta ortadaki ses |
| Voice N › Name / Description / Audio URL / Orb image / Colors | Voice 1–6 | Text / Text / Text / Image / Text | Alloy, Echo, Liam, River | Slot doluysa yok sayılır; Name boş = ses gizli |

## Performans notları

- Component girişi ~12 KB; three.js + shader içeren ~1 MB'lık (gzip ~%75
  küçülür) chunk **ayrı bir async parça** — section viewport'a 300px
  yaklaşana kadar tarayıcıya inmez (IntersectionObserver + `React.lazy`).
  Above-the-fold dışındaki kullanımlarda PageSpeed etkisi pratikte sıfırdır.
- Hero/LCP alanında kullanacaksan yayın sonrası Lighthouse ile ölç.
- `prefers-reduced-motion` açık kullanıcılarda animasyon otomatik durur
  (statik kare). Shader yüklenene kadar aynı renklerden CSS gradient görünür.

## Yeni component ekleme

1. `src/Foo.tsx` — normal React componenti.
2. `src/Foo.webflow.tsx` — `declareComponent(Foo, { name, props, … })`
   default export; prop tipleri `@webflow/data-types`'ın `props.*`
   constructor'larıyla tanımlanır (Text, Number, Boolean, Variant, Slot…).
3. `npx webflow devlink import`.

`webflow.json`'daki glob (`src/**/*.webflow.tsx`) yeni dosyayı otomatik alır.
