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
| **Voice Orbs** | `src/VoiceOrbs.webflow.tsx` | Ses örneği orb carousel'i — `voice-orbs.js` v3.4 + `voice-orbs.css` v2.7'nin React hali, iki artıyla: **(1) sesler Designer'dan manuel** — Voice 1–10 prop grupları (ad, açıklama, ses URL, opsiyonel görsel ve renkler; boş ad = gizli; gerekirse grup sayısı artırılır); **(2) kart görünümü ve Sagitone orb görselleri component'in içinde** (sitedeki tasarımla birebir; aktif orb WebGL ile canlı ve ses-reaktif), ayrıca opsiyonel **Procedural** mod: görselsiz, 3 renkli paletten shader ile üretilen orb'lar (küresel gölgeleme, highlight, film greni; tek WebGL context). Sonsuz döngü, transform-only geçişler, double-buffer audio + AnalyserNode, ilerleme halkası, play/pause, ‹ › ve ←/→. Sıfır bağımlılık. Bkz. [Voice Orbs](#voice-orbs--designer-propları). |
| **Site Search** | `src/SiteSearch.webflow.tsx` | ⌘K **tam sayfa site araması**. Nav'a bırakılan tetikleyici buton (ikon + etiket + ⌘K rozeti; Pill / Icon only) ve body'ye açılan iki sütunlu palet: solda hızlı erişim/sonuçlar, sağda metin önizleme kartı (görselsiz; Sestek stili, shadow root ile izole). Index'i **Webflow Cloud app**'ten alır (`GET /demos/api/search/index`, bkz. `docs/sestek-site-search-server-spec.md`); sıralama, TR/EN, önizleme tarayıcıda — tuş başına ağ isteği yok. ⌘K / Ctrl+K, `/`, sayfadaki `[data-site-search-trigger]` elemanları; ↑↓ Enter Esc, focus trap. Asistan yok; boş durumda Demo + İletişim. Motor `/site-search` paketinin kopyası (`src/site-search/`). Bkz. [Site Search](#site-search--designer-propları). |
| **Circle Diagram** | `src/CircleDiagram.webflow.tsx` | Dönen halka diyagramı — `circle-diagram.js` v2.2 + `circle-diagram.css` v1.5.1'in React hali ("The conversational lifecycle"). Solda halkaya eşit dağılmış ikonlu chip'ler, sağda üst üste tıklanabilir kartlar; conic-gradient uç sabit hızla döner, geçtiği item aktifleşir ve kart listesi ona kayar. Hover/tık/klavye ucu o node'a süpürür, liste üstünde mouse ve klavye odağı dönüşü durdurur, yalnız viewport'tayken döner. Item'lar **Item 1–8** prop gruplarından (label, 15 ikonluk set, kart başlığı/metni). **Mobilde chip'ler viewport'u taşırmaz** (etiketler sarar, halka chip payı bırakır). GSAP sitenin global'inden, yoksa CSS transition. Bkz. [Circle Diagram](#circle-diagram--designer-propları). |
| **Top Bar** | `src/TopBar.webflow.tsx` | Navbar'ın **üstünde** duyuru çubuğu. Metin + link (+ emoji), × ile kapatma; kapatılınca **cookie** ile hatırlanır (`sestek_topbar=<Campaign id>`, `Remember (days)`, varsayılan 1 gün), hiçbir sayfada bir daha çıkmaz — yeni duyuru için Campaign id'yi değiştirmek yeter. Sabit navbar'ı (`[data-nav]`) bar yüksekliği kadar aşağı iter, `--topbar-h` değişkenini `<html>`'e yazar. **Sticky** (en üstte sabit) ya da **Scrolls away** (sayfayla kayar, nav yerine döner). Mobilde göster/gizle. Brand / Dark / Light / Custom renk. Bkz. [Top Bar](#top-bar--designer-propları). |
| **Cookie Consent** | `src/CookieConsent.webflow.tsx` | Minimal Sestek çerez banner'ı, **gerçekten çalışan**: seçim `sestek_consent` cookie'sinde (180 gün, Policy version değişince yeniden sorar); **Google Consent Mode v2** (`gtag('consent','update')` + `dataLayer` `cookie_consent_update` event'i, her sayfa yüklemesinde sessizce de); `type="text/plain" data-consent="analytics|marketing"` script'leri ve `data-src`'li iframe'ler yalnız izinle açılır; footer'daki `[data-cookie-settings]` tercihleri yeniden açar; GPC sinyali. Zorunlu / Analitik / Pazarlama (+ Tercihler) kategorileri, EN/TR otomatik, sol altta küçük kart, mobilde alt sheet, opsiyonel engelleyici mod. Bkz. [Cookie Consent](#cookie-consent--designer-propları). |
| **Horizontal Scroll Cards** | `src/HScroll.webflow.tsx` | "Why SESTEK" yatay kart şeridi — `h-scroll.js` v2.2.4 + `hover-reveal.js` v1.0'ın React hali, **Swiper'sız**. ≥ 992px (gerçek fare, motion açık, sayfada gsap + ScrollTrigger): bölüm bir ekran boyu pinlenir, dikey scroll kartları 1px = 1px sola sürükler (`Speed` çarpanı), kart kenarlarına snap, altta **ilerleme çizgisi + sayaç**. Tablet/mobil, dokunmatik cihaz, reduced-motion ya da gsap yoksa aynı DOM **native scroll-snap karusel**: ok + kart başına nokta, tablet 1.4 / mobil 1.1 kart (peek). Kart genişlikleri saf CSS — eski `zoom` + Swiper ölçümü çakışmasından gelen **mobil hizalama kayması yok**. Başlık normal akışta, kartların üstüne binmez. Opsiyonel **hover reveal**: imlecin girdiği noktadan renk dalgası (CSS clip-path), çıkış noktasına doğru kapanır; dokunmatikte tap, klavye odağında da. Item 1–6 (**Rich Text içerik**: H3 başlık + paragraf tek alanda, ikon görseli; ikon yoksa 01, 02… numarası). Dark / Light tema + token override. Bkz. [Horizontal Scroll Cards](#horizontal-scroll-cards--designer-propları). |
| **Stack Panels** | `src/StackPanels.webflow.tsx` | Ana sayfa "Why global brands are choosing SESTEK" — **üst üste binen panel scrollytelling'i**, `stack-panels.js` v1.4.0 + `stack-panels.css`'in React hali. Her panel (sonuncu hariç) pinlenir; sonraki üstüne kayarken alttaki bekler (Hold), küçülür (0.5), solar, bulanır ve yukarı süzülür; uzun paneller önce içerik kaydırır. Solda başlık + renkli vurgu + açıklama (`**kalın**` işareti) + **stagger "Request a demo" butonu** (panel başına stil), sağda **sabit oranlı kare video** (Cloudflare Stream mp4 + thumbnail poster). GSAP sitenin global'inden; yoksa, reduced-motion'da, ata elemanda transform varsa ya da **telefonda (≤ 767px)** paneller düz akışta. **Mobil kayma düzeltmesi:** medya kutusu sabit oranlı — video geç gelince panel boyu değişmez, pin ölçümleri bayatlamaz; videolar `muted` attribute + property, `playsinline`, viewport'a yaklaşınca yüklenir, yalnız görünürken oynar, hata olursa poster kalır. Başlık düz metin (`**kalın**`, `|` satır kırma, SESTEK'te marka parıltısı), görünüme girince yumuşak belirme. Hiçbir alan Rich Text değil; 3 panel. Bkz. [Stack Panels](#stack-panels--designer-propları). |
| **TTS Demo** | `src/TtsDemo.webflow.tsx` | Text-to-Speech & Voice Cloning demo iframe'i (`tts-cloning-demo.sestek.com`), Webflow'daki iki onaylı embed + boyutlandırma script'inin React hali (gövde `src/DemoEmbed.tsx`, preset `tts`). **Side by side** (/demos): solda eyebrow + başlık + açıklama + 2 stagger buton (sitenin butonları), sağda panel — büyük ekran 593px panel / 728px iframe, kısa masaüstü (≤ 700px yükseklik) 760×728 @ zoom .648 ortalı, telefonda alt alta tam genişlik 840px. **Full width** (/demos/tts): yalnız iframe, 960×649 tabanından genişlik ve yüksekliğe göre ölçekli, ortalı. iframe mantıksal boyutunu korur, CSS `zoom` ile ölçeklenir (embed'lerle aynı); viewport'a yaklaşınca yüklenir, yüklenene dek spinner; dil sayfadan (tr → tr-TR). Bkz. [TTS Demo](#tts-demo--designer-propları). |
| **STT Demo** | `src/SttDemo.webflow.tsx` | Speech Recognition (speech-to-text) demo iframe'i (`sr-demo-performance.sestek.com`, 600×600, kamera + mikrofon) — TTS Demo ile **aynı gövde** (`src/DemoEmbed.tsx`, preset `stt`). Side by side: solda eyebrow + başlık + açıklama + 2 stagger buton, sağda 600px kare panel; kısa masaüstünde zoom .78; **telefonda alt alta, kare, ekran genişliğine ölçekli** (uygulama mantıksal 600px genişliğini korur). Full width: yalnız iframe, ortalı, ölçekli. Dil sayfadan (tr → `lang=tr`). Bkz. [STT Demo](#stt-demo--designer-propları). |
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
kalır). Sesler **Voice 1–10** prop gruplarından manuel girilir: ad, açıklama,
ses URL'i, orb görseli URL'i (Image modunda; varsayılanlar sitedeki Sagitone
gradient'ler) ve opsiyonel `#hex,#hex,#hex` renkler (Procedural modda; boşsa
palet sırayla atanır). Boş ad = ses gizli. Kart zemini ve radius component'in
içinde (sitenin `--surface--light` / `--radius--lg` değişkenleri).
Daha fazla ses gerekirse grup sayısı artırılır.

Ses dosyaları ve (Image modunda) orb görselleri **CORS'lu** servis edilmeli —
AnalyserNode ve WebGL dokusu buna bağlı.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Orb style | Look | Variant | `Image` | `Image`: sitedeki Sagitone gradient görselleri, aktif orb'da canlı WebGL warp · `Procedural`: görsel gerekmez, shader paletten üretir |
| Card background | Look | Boolean | `On` | Açık lila zemin + radius (`--surface--light`, `--radius--lg`); Off = şeffaf |
| Sizes (px) | Look | Text | `220,150,104` | Orb çapları merkezden dışa (`data-vo-sizes`) |
| Fit width (px) | Look | Number | `760` | Merdivenin tam ölçek genişliği (`data-vo-fit`) |
| Min scale | Look | Number | `0.42` | Küçülme alt sınırı (`data-vo-min-scale`) |
| Gap (px) | Look | Number | `64` | `--vo-gap` |
| Caption width (px) | Look | Number | `280` | `--vo-caption-w` |
| Arrow offset (px) | Look | Number | `230` | `--vo-nav-offset` |
| Start index | Look | Number | `0` | Açılışta ortadaki ses |
| Voice N › Name / Description / Audio URL / Orb image URL / Colors | Voice 1–10 | Text ×5 | Chloe, Debbie, James (English) · Derya, Aysu, Emre (Turkish) · Charlotte (French) · Rima (Arabic MSA) · Lujain (Arabic Najdi) — `sestek.roicool.com/Voices/*.wav`, Sagitone görselleri sırayla | Name boş = ses gizli; Colors yalnız Procedural modda |

## Site Search — Designer prop'ları

Kurulum: component'i **Navbar**'a (ikonun yerine) bırak; palet body'ye kendi
shadow root'uyla açıldığı için nav'ın transform/autohide'ından etkilenmez.
Paleti dışarıdan açmak isteyen bir eleman varsa ona `data-site-search-trigger`
ver (Bind page triggers). `data-search-trigger` **kullanma**: o attribute
`search.js`'in (blog/CMS araması) tetikleyicisidir, palet ona bağlanmaz. Palet açılışta boş değildir: arama çubuğunun altında "Deneyin" sorgu
chip'leri, solda gruplu hızlı erişim **kutucukları** (2 sütun, tür rengi +
başlık + kısa özet; component'in içinde, index'e bağlı değil), sağda görsel
(türü gösteren chip görselin üstünde) + önizleme kartı. Sonuç satırlarında tür
rozeti türe göre renklenir (ürün magenta, çözüm mor, öykü yeşil-mavi, kaynak
amber). Açıkken sayfa scroll'u kilitlenir: html/body overflow + sitenin
Lenis'i (`Sestek.stopScroll` / `startScroll`), host'ta `data-lenis-prevent`.
Index'i Cloud app servis eder; endpoint hazır değilken hızlı erişim çalışır,
yazınca "yükleniyor"/boş durumu görünür, sayfa etkilenmez. Palet yazı tipini
sitenin `--font--primary` değişkeninden (yoksa body fontundan) alır; arkadaki
sayfa blur'lanır. Sunucu tarafı bu repoda
**değil**: sözleşme `docs/sestek-site-search-server-spec.md`.

`src/site-search/` klasörü `/site-search` paketindeki motor + paletin
kopyasıdır (DevLink bundler yalnız bu paketi görür); motoru değiştirirken
ikisini birlikte güncelle (`/site-search` testli kaynak).

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Index URL | Data | Text | `/demos/api/search/index` | Cloud app index endpoint'i (same-origin); staging'de tam URL |
| Locale | Data | Variant | `Auto` | `Auto`: `/tr` yolu ya da `<html lang>` · `en` · `tr` |
| Site host | Data | Text | `www.sestek.com` | Önizlemede URL'nin başı |
| Demo link | Empty state | Text | boş | Boş = `/request-a-demo` (TR: `/tr/demo-isteyin`) |
| Contact link | Empty state | Text | boş | Boş = ikinci CTA ve hızlı erişimdeki İletişim satırı yok |
| Quick links (EN) / (TR) | Quick access | Text | boş | Yazmadan önce solda listelenen gruplu sayfalar. Boş = hazır liste (Products · Solutions · Resources · Company / Ürünler · Çözümler · Kaynaklar · Kurumsal, 22 sayfa). Format, `;` ile ayrılmış kayıtlar: `Grup \| Başlık \| /yol \| özet \| görsel URL` (son ikisi opsiyonel), `{contact}` = Contact link |
| Show trigger button | Trigger | Boolean | `On` | Off = yalnız kısayol + sayfa tetikleyicileri |
| Button style | Trigger | Variant | `Chip` | `Chip` = nav'daki locale switch chip'iyle birebir (2rem, #e1e1e1 → #d7d7d7, 13px/500) · `Pill` · `Icon only` |
| Button label | Trigger | Text | `Search` | Boş = locale'e göre Search / Ara |
| Show ⌘K badge | Trigger | Boolean | `Off` | Mac'te ⌘ K, diğerlerinde Ctrl K |
| Bind page triggers | Trigger | Boolean | `On` | `[data-site-search-trigger]` / `[data-site-search-open]` tıklamaları (search.js'in `data-search-trigger`'ı hariç) |
| Keyboard shortcuts | Trigger | Boolean | `On` | ⌘K / Ctrl+K, `/` (bir alanda yazmıyorken) |

JS API: `window.__sestekSiteSearch.open() / close() / toggle()`.

## Circle Diagram — Designer prop'ları

Kurulum: Webflow'daki `[data-circle-diagram]` bloğunu (ve `circle-diagram.js` /
`.css` linklerini, init script'ini) kaldır; component'i bölüm başlığının altına
bırak. Item'lar **Item 1–8** gruplarından girilir, boş Label = gizli; halkaya
otomatik eşit dağılır (ilk item tepede). Kartlar item sırasıyla eşleşir.
Renkler sitenin değişkenlerinden (`--brand-primary--500`, `--surface--base`,
`--color-text--muted`, `--border--color-border-base`), font `--font--primary`.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Spin (s / revolution) | Motion | Number | `14` | Bir tam tur süresi; N item'da adım = spin/N sn. `0` = döngü kapalı |
| Resume after (s) | Motion | Number | `3` | Tık / klavye / hover sonrası dönüşün devam gecikmesi |
| Start index | Motion | Number | `0` | Açılışta aktif item |
| Card list | Cards | Boolean | `On` | Off = yalnız halka (tek kolon) |
| Visible cards | Cards | Number | `3` | Listede görünen kart sayısı; aktif kart ortaya kayar |
| Card text align | Cards | Variant | `Center` | `Left` = eski sola dayalı hâl |
| Item N › Label / Icon / Card title / Card text | Item 1–8 | Text · Variant · Text · Text | 6 item dolu (Agentic AI, Human Agent, Agent Copilot, Conversational Intelligence, Insights, Customer) | Icon: None · mic · chat · headset · sparkle · chart · target · check · zap · search · user · clock · shield · bulb · cycle · arrow. Card title boş = Label |

## Top Bar — Designer prop'ları

Kurulum: component'i sayfanın (ya da Navbar component'inin) **en üstüne,
Navbar'dan önce** yerleştir. Navbar `position:fixed` olduğu için bar
görünürken nav'a inline `top: <bar yüksekliği>` basılır, kapanınca sıfırlanır;
başka bir eleman da `top: var(--topbar-h, 0)` ile hizalanabilir. Kapatma
cookie'si tüm site için geçerlidir (`path=/`); test için konsolda
`__sestekTopBar.reset()` cookie'yi siler.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Text | Content | Text | `Sestek is now part of Unifonic.` | Duyuru metni |
| Emoji / prefix | Content | Text | boş | Metnin başına işaret, örn. 🎉 |
| Link label / Link URL | Content | Text | `Read more` / `/blog` | Boş label = link yok; site içi yol ya da tam URL |
| Open in new tab | Content | Boolean | `Off` | |
| Campaign id | Dismiss | Text | `default` | Cookie'de saklanan kimlik; değiştirince önceki barı kapatanlar yenisini görür |
| Dismissible | Dismiss | Boolean | `On` | Off = × yok |
| Remember (days) | Dismiss | Number | `1` | `0` = yalnız bu oturum |
| Show on mobile | Layout | Boolean | `On` | Off = 768px altında gizli, nav itilmez |
| Behavior | Layout | Variant | `Sticky` | `Scrolls away` = sayfayla kayar |
| Push fixed navbar | Layout | Boolean | `On` | `[data-nav]`'a inline top |
| Navbar selector | Layout | Text | `[data-nav]` | |
| Theme | Look | Variant | `Brand` | `Dark` · `Light` · `Custom` |
| Custom background / text color | Look | Text | boş | Theme = Custom |

## Horizontal Scroll Cards — Designer prop'ları

Kurulum: Webflow'daki `.section__hscroll` bloğunu (`[data-hscroll]`,
`h-scroll.js` / `.css`, `hover-reveal.js` / `.css` linklerini, Swiper script'ini
ve `Sestek.initHScroll()` / `initHoverReveal()` çağrılarını) kaldır; component'i
aynı yere bırak. Bölüm kendi arka planını, başlığını ve kartlarını çizer.
Gutter sitenin `--view--px` / `--container--2xl` değişkenlerinden, renkler
`--brand-secondary--900/700/800/600` (Dark) ya da `--surface--base` /
`--neutral--*` / `--brand-primary--500` (Light) token'larından, font
`--font--primary`.

**Pin kuralı:** component'in üstündeki hiçbir Webflow elemanında
`transform`, `filter`, `perspective`, `will-change: transform` olmamalı —
ScrollTrigger'ın pin'i `position: fixed` kullanır, aksi hâlde viewport yerine
o elemana yapışır. Sayfada gsap + ScrollTrigger yoksa (ya da reduced-motion,
dokunmatik cihaz) masaüstünde de karusel modu çalışır; hiçbir şey kırılmaz.
Aynı sayfada birden fazla pin varsa üstteki için `Refresh priority`'yi daha
yüksek ver.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Eyebrow / Title / Subtitle | Header | Text | boş / `Why SESTEK` / `Support built to hold up…` | Boş bırakılan satır çizilmez |
| Align | Header | Variant | `Center` | `Left` = başlık gutter'a dayalı |
| Item N › Visible / Content / Icon | Item 1–6 | Visibility · RichText · Image | 5 item dolu (Technology we own, Hybrid by design, Proven before production, Enterprise-grade, Connected intelligence) | Visible Off = kart gizli (içerik durur). **Başlık + gövde tek Rich Text:** H3 başlık, altında paragraf(lar); liste, link, kalın da olur. Boş = kart gizli. Icon boşsa kartta `01`, `02`… numarası |
| Card width (px) | Layout | Number | `420` | Masaüstü kart genişliği |
| Gap (px) | Layout | Number | `32` | Kartlar arası boşluk |
| Cards per view (tablet / mobile) | Layout | Number | `1.4` / `1.1` | ≤ 991px / < 768px; küsurat = sıradaki kart kenardan görünür. Tam sayı (2) = peek yok |
| Arrows + dots | Layout | Boolean | `On` | Karusel modunda; tek kartta gizlenir |
| Progress line | Layout | Boolean | `On` | Pin modunda kartların altında `01 / 05` + çizgi |
| Scrub (s) | Motion | Number | `0.5` | Scroll'u takip gecikmesi |
| Speed | Motion | Number | `1` | Scroll mesafesi çarpanı: >1 yavaş / uzun, <1 hızlı |
| Snap to cards | Motion | Boolean | `On` | |
| Refresh priority | Motion | Number | `1` | ScrollTrigger `refreshPriority` |
| Hover reveal | Hover reveal | Boolean | `On` | Off = kartlar statik, odaklanamaz |
| Reveal colour | Hover reveal | Text | boş | Token (`--brand-secondary--600`), `var()` ya da renk; boş = temanın rengi |
| Text colour on reveal | Hover reveal | Text | boş | Boş = Dark'ta yazı rengi değişmez, Light'ta beyaz |
| Duration (s) | Hover reveal | Number | `0.7` | |
| Theme | Look | Variant | `Dark` | `Light` = beyaz zemin, açık kart, brand-primary reveal |
| Controls colour | Look | Variant | `Auto` | Nokta, ok, ilerleme çizgisi + sayaç rengi. `Auto` = yazı rengi · `Light` = beyaz · `Dark` = koyu |
| Controls custom colour | Look | Text | boş | Token ya da renk; doluysa Controls colour'ı ezer |
| Section background / Card background / Card border | Look | Text | boş | Token ya da renk; boş = tema |

## Stack Panels — Designer prop'ları

Kurulum: ana sayfadaki `.section__sticky-slides` bloğunu (`[data-stack-panels]`,
`stack-panels.js` / `.css` linklerini, `Sestek.initStackPanels()` çağrısını,
başlıktaki `data-reveal` / `data-heading-mask` ve butonlardaki stagger
script'ini) kaldır; component'i aynı yere bırak. Bölüm kendi arka planını,
başlığını, panellerini ve butonlarını çizer. Renkler `--surface--base`,
`--surface--light`, `--surface--accent`, `--brand-primary/secondary--500`,
`--color-teritary--700`, `--radius--lg`, `--gap--2xl`, `--section--py-2`,
`--view--px`, `--container--2xl/md` token'larından, font `--font--primary`.

**Videolar:** her panelde `Video URL` (Cloudflare Stream
`…/downloads/default.mp4`) + `Poster URL` (`…/thumbnails/thumbnail.jpg?…`)
ya da Webflow `Image`. Medya kutusu her zaman `Media ratio` oranında (varsayılan
1:1) sabit yükseklikte — telefonlardaki kaymanın sebebi videonun geç gelip
paneli büyütmesiydi (ScrollTrigger pin ölçümleri bayat kalıyor, sayfa
zıplıyordu); artık panel boyu medyadan bağımsız. Video `muted` (attribute +
property, iOS autoplay için), `playsinline`, döngü, `preload="metadata"`;
`src` viewport'a 1.2 ekran kala yazılır, yalnız görünürken oynar, yüklenemezse
poster kalır.

**Pin kuralı:** component'in üstündeki hiçbir Webflow elemanında
`transform`, `filter`, `perspective`, `will-change: transform` olmamalı;
varsa ~12 sn izlenir (giriş animasyonu bitince pinler kurulur), kalıcıysa
düz akışta kalınır. Üstte pinli hero varsa `Refresh priority` onun altında
kalmalı (varsayılan 0 yeterli). Font geç gelirse ve panel boyu değişirse
(ResizeObserver + `document.fonts.ready`) refresh otomatik.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Title | Header | Text | `Why **global** brands are \| choosing SESTEK` | `**kalın**` işareti, `\|` satır kırar |
| Shine word | Header | Text | `SESTEK` | Başlıkta marka parıltısı (turkuaz → lila → magenta süpürme) alan kelime |
| Subtitle | Header | Text | boş | Opsiyonel alt metin |
| Title reveal | Header | Boolean | `On` | Görünüme girince yumuşak belirme (1.2 s, scale 1.03 → 1) |
| Brand shine | Header | Boolean | `On` | |
| Button label / URL / Open in new tab | Button | Text · Text · Boolean | `Request a demo` / `/request-a-demo` / `Off` | Tüm paneller; boş label = buton yok. Harf harf stagger hover |
| Panel N › Heading / Heading accent | Panel 1–4 | Text · Text | 3 panel dolu, 4. boş (doldurulunca görünür) | Başlık + renkli devamı (örn. "Market-leading performance," + "engineered in-house."). Üçü de boşsa panel gizli |
| Panel N › Accent colour | Panel 1–4 | Text | tertiary-700 / secondary-500 / primary-500 | Renkli kısmın rengi; token ya da renk |
| Panel N › Body | Panel 1–4 | Text | dolu | Açıklama; kalın için `**iki yıldız**` |
| Panel N › Video URL / Poster URL / Image | Panel 1–4 | Text · Text · Image | Cloudflare linkleri | Poster URL boşsa Image poster olur; video yoksa Image/Poster medya |
| Panel N › Button style | Panel 1–4 | Variant | `Auto` | `Auto` = sırayla White / Brand secondary / Dark · `Brand primary` · `None` |
| Panel N › Media side | Panel 1–4 | Variant | `Right` | `Left` = video solda (tablet/mobilde hep altta) |
| Media ratio | Media | Variant | `1:1` | `4:3` · `16:10` · `16:9` · `3:2` — tüm paneller |
| Media fit | Media | Variant | `Cover` | `Contain` = letterbox |
| Hold | Motion | Number | `0.5` | Pinli scroll'un bu kadarında panel tam okunur kalır |
| End scale | Motion | Number | `0.5` | Giden panelin son ölçeği |
| Blur (px) | Motion | Number | `4` | `0` = kapalı |
| Lift (px) | Motion | Number | `24` | Yukarı süzülme, `0` = kapalı |
| Mid fade | Motion | Number | `0.5` | Küçülme sonundaki opaklık |
| Fade portion | Motion | Number | `0.1` | Son hızlı solmanın payı (gelen panel kısaysa otomatik genişler) |
| Scrub (s) | Motion | Number | `0` | `0` = doğrudan, `0.3–1` = yumuşatma |
| Refresh priority | Motion | Number | `0` | İlk panelin `refreshPriority`'si, sonrakiler birer eksik |
| Effect on phones | Motion | Boolean | `Off` | On = ≤ 767px'te de pin/dissolve (önerilmez) |
| Background image | Look | Image | boş | Section arka planı (cover) |
| Bottom fade | Look | Boolean | `On` | Alt kenarda zemine karışma maskesi |
| Section background / Panel background | Look | Text | boş | Token ya da renk; boş = `--surface--base`. Panel zemini opak olmalı |

## TTS Demo — Designer prop'ları

Kurulum: /demos sayfasındaki `article#tts` içindeki `.dp-live__panel` embed'ini
ve boyutlandırma `<script>`'ini, /demos/tts sayfasındaki `.dp-detail__panel`
embed'ini ve script'ini kaldır; component'i aynı yere bırak (Layout'u sayfaya
göre seç). Metin ve linkler prop'lardan; iframe `allow="microphone"` ile gelir.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Layout | Layout | Variant | `Side by side` | `Full width` = yalnız iframe (detay sayfası) |
| Text side | Layout | Variant | `Left` | Metin sütunu solda / sağda |
| Frame border | Layout | Boolean | `On` | Panel çerçevesi + köşe yuvarlağı |
| Mobile height (px) | Layout | Number | `840` | ≤ 767px'te iframe yüksekliği |
| Bottom margin (px) | Layout | Number | `80` | Full width'te alt boşluk |
| Eyebrow / Title / Description | Text | Text | `Text to speech` / `Text to Speech & Voice Cloning` / hazır metin | Boş satır çizilmez |
| Link 1 label / URL / style / new tab | Links | Text · Text · Variant · Boolean | `Open the full page` / `https://rc-sestek.webflow.io/demos/tts` / `Dark` / `Off` | Sitenin stagger butonu (Dark · White · Brand secondary · Brand primary). Boş label = buton yok |
| Link 2 label / URL / style / new tab | Links | Text · Text · Variant · Boolean | `All voices and languages` / docs.sestek.com TTS sayfası / `White` / `On` | |
| Demo URL | Demo | Text | `…/Demo.aspx?lang={lang}&embed=1` | `{lang}` seçilen dille değişir |
| Language | Demo | Variant | `Auto` | `en-US` · `tr-TR`; Auto = /tr ya da `<html lang>` tr ise tr-TR |

## STT Demo — Designer prop'ları

TTS Demo ile aynı prop'lar (Layout, Text side, Frame border, Bottom margin,
Eyebrow / Title / Description, Link 1–2 label / URL / style / new tab, Demo
URL, Language). Farklar: iframe 600×600, `allow="camera;microphone"`,
Language seçenekleri `Auto · en · tr`, telefonda "Mobile height" yerine kare
ölçekleme (yükseklik genişliği takip eder). Varsayılan metin: "Speech to text"
/ "Speech Recognition" / "Real-time speech to text. Speak into your
microphone or upload an audio file of up to 100MB…", butonlar "Open the full
page" (`https://rc-sestek.webflow.io/demos/stt`) ve "All languages and models"
(`https://docs.sestek.com/docs/stt-supported-languages-and-models`) — iki URL'yi
sayfaya göre düzelt.

## Cookie Consent — Designer prop'ları

Kurulum (3 adım):

1. Component'i her sayfada olan bir yere bırak (Navbar ya da Footer
   component'inin içine). Konumu CSS'ten bağımsız, `position:fixed`.
2. **Consent Mode default'u** Site Settings → Custom Code → **Head**'e, GTM
   snippet'inden ÖNCE:
   ```html
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){ dataLayer.push(arguments); }
     gtag('consent', 'default', {
       ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
       analytics_storage: 'denied', functionality_storage: 'denied',
       personalization_storage: 'denied', security_storage: 'granted', wait_for_update: 500
     });
   </script>
   ```
   Component her sayfada (kayıtlı seçim varsa sessizce) `gtag('consent','update', …)`
   çağırır ve `dataLayer`'a `cookie_consent_update` event'ini basar; GTM'de
   analitik/pazarlama tag'lerini bu event'e ya da Consent Mode'a bağla.
3. GTM dışında doğrudan yüklenen script'leri kilitle: `<script>` yerine
   `<script type="text/plain" data-consent="analytics" src="…">` (ya da inline).
   İzin verilince component onları çalıştırır. YouTube/HubSpot gibi
   iframe'ler: `<iframe data-consent="marketing" data-src="…">`.

Footer'a "Cookie settings" linki: herhangi bir elemana `data-cookie-settings`
attribute'u ver. JS: `__sestekConsent.get()` seçimi döner,
`__sestekConsent.open()` tercihleri açar, `__sestekConsent.reset()` test için
cookie'yi siler. `window` üzerinde `sestek:consent` event'i de fırlatılır.

| Prop | Grup | Tip | Varsayılan | Açıklama |
|---|---|---|---|---|
| Locale | Content | Variant | `Auto` | `/tr` yolu ya da `<html lang>` |
| Title / Text (EN, TR) | Content | Text | boş = hazır metin | Kısa tut; buton ve kategori metinleri sabit |
| Policy URL (EN / TR) | Content | Text | `/legal/cookie-policy` / `/tr/yasal/cerez-politikasi` | |
| Policy version | Consent | Text | `1` | Değiştirince herkese yeniden sorulur |
| Remember (days) | Consent | Number | `180` | |
| Reject button | Consent | Boolean | `On` | Kabul ile eşit ağırlıkta tek tıkla Reddet |
| Preferences category | Consent | Boolean | `Off` | On = 4. kategori (functionality/personalization_storage ayrı) |
| Respect GPC | Consent | Boolean | `On` | Global Privacy Control varsa kategoriler kapalı başlar |
| Position | Look | Variant | `Bottom left` | `Bottom right` · `Bottom center` · `Bottom bar` (masaüstünde tam genişlik tek satır); mobilde hepsi alt sheet |
| Theme | Look | Variant | `Light` | `Dark` |
| Blocking | Look | Boolean | `Off` | On = karartma, seçim yapılana dek sayfa kullanılamaz |
| Show after (ms) | Look | Number | `600` | |

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
