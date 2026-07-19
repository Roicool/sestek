# Sestek Webflow Code Components

Webflow Designer'a **DevLink (Code Components)** ile import edilen React
componentleri. Ana kütüphaneden (js/, css/) tamamen bağımsız bir pakettir —
kendi `package.json`'ı vardır, CDN üzerinden servis edilmez; Webflow CLI ile
workspace'e yayınlanır ve Designer'da native component gibi kullanılır.

## İçerik

| Component | Dosya | Ne yapar |
|---|---|---|
| **Soft Gradient BG** ⭐ | `src/SoftGradientBg.webflow.tsx` | **Önerilen.** Minimal (~11KB, sıfır bağımlılık) saf WebGL soft gradient. 4 karakter: Mist (gezinen lekeler), Flow (yatay dalgalar), Silk (çapraz bantlar), Halo (merkez ışıltı). Yumuşak Sestek renkleri varsayılan; base rengi değiştirerek koyu temaya uyar. Viewport dışında durur, reduced-motion'da statik kare, WebGL yoksa CSS fallback. |
| **Shader Gradient BG** | `src/ShaderGradientBg.webflow.tsx` | [ShaderGradient](https://www.shadergradient.co) tabanlı zengin 3D gradient (three.js, ~1MB lazy chunk). Görsel olarak daha katmanlı ama ağır — hero dışı, tek seferlik vitrin kullanımları için. Sestek marka preset'leri, lazy-mount, `prefers-reduced-motion` desteği. |

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
