# Sestek Icon Library — v1.1.0

> Mega menu (Products + Company) ve ürün kartlarında kullanılan **stroke ikon seti**.
> Kaynak dosyalar: `svg/icons/` · Önizleme: `demo/icon-library/index.html`
> Tamamı tek bir çizim dili paylaşır — hepsi yan yana geldiğinde tek elden
> çıkmış gibi durur (mevcut lucide ikonlarıyla da uyumlu).

---

## Tasarım kuralları (yeni ikon eklerken uy)

| Kural | Değer |
|---|---|
| viewBox | `0 0 24 24` (kare grid, başka viewBox kullanma) |
| Çizgi kalınlığı | `stroke-width="2"` — **sabit**, ölçek değişse bile |
| Uç / köşe | `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Dolgu | `fill="none"` — tek istisna yok, hepsi outline |
| Renk | `stroke="currentColor"` — rengi CSS'ten `color` ile ver |
| Yaşayan alan | 24×24 içinde **20×20** (her kenarda 2px nefes payı) |
| Yarıçaplar | 1 / 1.5 / 2 / 2.5 / 3 / 4 — ara değer kullanma |
| Detay | Maks. 3–4 path; 16px'te okunmayan detay eklenmez |
| Erişilebilirlik | Dekoratifse `aria-hidden="true"`, tek başına anlam taşıyorsa `role="img"` + `<title>` |

**Neden `width="100%" height="100%"`:** Webflow embed'lerinde ikon, kapsayıcı
kutunun (40×40 tile) boyutunu alsın diye. Boyutu **kapsayıcıdan** yönet,
SVG'nin kendi `width` değerinden değil.

---

## Set (23 ikon)

| İkon | Dosya | Yer | Metafor |
|---|---|---|---|
| Agentic AI | `svg/icons/agentic-ai.svg` | Products — kategori | Bot yüzü — otonom ajan |
| Agent Copilot | `svg/icons/agent-copilot.svg` | Products — kategori | Çift sparkle — AI yardımcı |
| Conversation Intelligence | `svg/icons/conversation-intelligence.svg` | Products — kategori | Konuşma balonu + trend çizgisi |
| Text to Speech | `svg/icons/text-to-speech.svg` | Agentic AI | Hoparlör + iki ses dalgası |
| Speech Recognition | `svg/icons/speech-recognition.svg` | Agentic AI | Mikrofon + dinleme yayı |
| Virtual Translator | `svg/icons/virtual-translator.svg` | Agent Copilot | Karakter + “A” — çeviri |
| Agent Assist | `svg/icons/agent-assist.svg` | Agent Copilot | Kulaklık + mikrofon kolu |
| Coaching | `svg/icons/coaching.svg` | Conversation Intelligence | Mezuniyet kepi — rehberlik |
| AQM | `svg/icons/aqm.svg` | Conversation Intelligence | Clipboard + onay — kalite skorlama |
| Analytics | `svg/icons/analytics.svg` | Conversation Intelligence | Sütun grafik + eksen |
| Company | `svg/icons/company.svg` | Company — kategori | Bina + ek blok |
| About Us | `svg/icons/about-us.svg` | Company | Ekip — iki figür |
| R&D | `svg/icons/rnd.svg` | Company | Ampul — inovasyon |
| Compliance & Security | `svg/icons/compliance-security.svg` | Company | Kalkan + onay |
| Partners | `svg/icons/partners.svg` | Company | İç içe iki halka — ortaklık |
| Careers | `svg/icons/careers.svg` | Company | Evrak çantası |
| Support | `svg/icons/support.svg` | Company | Can simidi — destek |
| Virtual Agent | `svg/icons/virtual-agent.svg` | Yedek | Konuşma balonu + bot yüzü |
| Voice Biometrics | `svg/icons/voice-biometrics.svg` | Yedek | Kalkan + ses barları |
| Knowledge Base | `svg/icons/knowledge-base.svg` | Yedek | Kitap |
| Contact | `svg/icons/contact.svg` | Yedek | Zarf |
| Newsroom | `svg/icons/newsroom.svg` | Yedek | Haber kartı |
| Events | `svg/icons/events.svg` | Yedek | Takvim |

---

## Kullanım — Webflow (HTML Embed)

Menü satırındaki ikon kutusunun içine yapıştır:

```html
<div class="menu-item__icon">
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--text-to-speech" aria-hidden="true">
    <path d="M7 9.5H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3l4.5 3.5V6z"/>
    <path d="M15 9.5a4 4 0 0 1 0 5"/>
    <path d="M18 7a8 8 0 0 1 0 10"/>
  </svg>
</div>
```

Kutu stilini CSS'ten ver — ikonun kendisine boyut/renk yazma:

```css
.menu-item__icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #f0f0f6;
  display: grid;
  place-items: center;
  color: #14141c;          /* ikon rengi — currentColor buradan gelir */
}
.menu-item__icon .sst-icon { width: 22px; height: 22px; }

.menu-item:hover .menu-item__icon { background: #ec008c14; color: #ec008c; }
```

Her ikonun kendi `sst-icon--<isim>` sınıfı var; tek bir ikonu ayrıca
hedeflemen gerekirse (ör. optik hizalama) onu kullan:

```css
.sst-icon--virtual-translator { transform: translateY(0.5px); }
```

## Kullanım — CDN (jsDelivr)

```
https://cdn.jsdelivr.net/gh/roicool/sestek@main/svg/icons/<isim>.svg
```

`<img>` ile çağırırsan `currentColor` çalışmaz (renk siyah kalır) — renk
değişmesi gereken her yerde **inline embed** kullan.

---

## İkonlar — kopyala/yapıştır kod

### Products — kategori başlıkları

#### Agentic AI — `agentic-ai`

Bot yüzü — otonom ajan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agentic-ai" aria-hidden="true">
  <rect x="5" y="8" width="14" height="12" rx="4"/>
  <path d="M12 5.5V8"/>
  <circle cx="12" cy="4" r="1.5"/>
  <path d="M9.5 13.5v1.5"/>
  <path d="M14.5 13.5v1.5"/>
  <path d="M3 13v2"/>
  <path d="M21 13v2"/>
</svg>
```

#### Agent Copilot — `agent-copilot`

Çift sparkle — AI yardımcı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agent-copilot" aria-hidden="true">
  <path d="M10.5 3.5 12.3 8.2 17 10l-4.7 1.8-1.8 4.7-1.8-4.7L4 10l4.7-1.8Z"/>
  <path d="M17.8 14.7 18.6 17.4 21.3 18.2 18.6 19 17.8 21.7 17 19 14.3 18.2 17 17.4Z"/>
</svg>
```

#### Conversation Intelligence — `conversation-intelligence`

Konuşma balonu + trend çizgisi

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--conversation-intelligence" aria-hidden="true">
  <path d="M20.5 14.5A2.5 2.5 0 0 1 18 17H8.5L4 21V5.5A2.5 2.5 0 0 1 6.5 3H18a2.5 2.5 0 0 1 2.5 2.5Z"/>
  <path d="m8 12.5 3-3 2.5 2.5 3.5-4"/>
</svg>
```

### Agentic AI

#### Text to Speech — `text-to-speech`

Hoparlör + iki ses dalgası

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--text-to-speech" aria-hidden="true">
  <path d="M7 9.5H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3l4.5 3.5V6z"/>
  <path d="M15 9.5a4 4 0 0 1 0 5"/>
  <path d="M18 7a8 8 0 0 1 0 10"/>
</svg>
```

#### Speech Recognition — `speech-recognition`

Mikrofon + dinleme yayı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--speech-recognition" aria-hidden="true">
  <rect x="9" y="2" width="6" height="11" rx="3"/>
  <path d="M18 11v1a6 6 0 0 1-12 0v-1"/>
  <path d="M12 18v3"/>
</svg>
```

### Agent Copilot

#### Virtual Translator — `virtual-translator`

Karakter + “A” — çeviri

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--virtual-translator" aria-hidden="true">
  <path d="M3 5h9"/>
  <path d="M7.5 3v2"/>
  <path d="M10 5c0 4.6-2.9 8.4-7 10"/>
  <path d="M5 10c1.3 2.7 3.4 4.7 6 5.6"/>
  <path d="m12.5 21 4.5-10 4.5 10"/>
  <path d="M14.3 17h5.4"/>
</svg>
```

#### Agent Assist — `agent-assist`

Kulaklık + mikrofon kolu

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agent-assist" aria-hidden="true">
  <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a9 9 0 1 1 18 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>
  <path d="M18 18v1a3 3 0 0 1-3 3h-2.5"/>
</svg>
```

### Conversation Intelligence

#### Coaching — `coaching`

Mezuniyet kepi — rehberlik

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--coaching" aria-hidden="true">
  <path d="m12 3 9.5 4.5L12 12 2.5 7.5Z"/>
  <path d="M6.5 9.8V15c0 1.9 2.5 3.2 5.5 3.2s5.5-1.3 5.5-3.2V9.8"/>
  <path d="M20.5 8v6"/>
</svg>
```

#### AQM — `aqm`

Clipboard + onay — kalite skorlama

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--aqm" aria-hidden="true">
  <rect x="8" y="2" width="8" height="4" rx="1.5"/>
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  <path d="m9 14 2 2 4-4"/>
</svg>
```

#### Analytics — `analytics`

Sütun grafik + eksen

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--analytics" aria-hidden="true">
  <path d="M3 3v16a2 2 0 0 0 2 2h16"/>
  <path d="M8 17v-4"/>
  <path d="M13 17V9"/>
  <path d="M18 17v-6"/>
</svg>
```

### Company

#### Company — `company`

Bina + ek blok

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--company" aria-hidden="true">
  <path d="M3 21V5.5A2.5 2.5 0 0 1 5.5 3h6A2.5 2.5 0 0 1 14 5.5V21"/>
  <path d="M14 11h4.5A2.5 2.5 0 0 1 21 13.5V21"/>
  <path d="M2 21h20"/>
  <path d="M6.5 7.5h4"/>
  <path d="M6.5 12h4"/>
  <path d="M6.5 16.5h4"/>
  <path d="M17 16.5h1.5"/>
</svg>
```

#### About Us — `about-us`

Ekip — iki figür

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--about-us" aria-hidden="true">
  <circle cx="9" cy="7" r="3.5"/>
  <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/>
  <path d="M16.5 3.7a3.5 3.5 0 0 1 0 6.6"/>
  <path d="M22 20v-1.5a4 4 0 0 0-3-3.87"/>
</svg>
```

#### R&D — `rnd`

Ampul — inovasyon

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--rnd" aria-hidden="true">
  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/>
  <path d="M9 18h6"/>
  <path d="M10 21.5h4"/>
</svg>
```

#### Compliance & Security — `compliance-security`

Kalkan + onay

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--compliance-security" aria-hidden="true">
  <path d="M12 22s8-3.5 8-9.5V5.8L12 2.5 4 5.8v6.7C4 18.5 12 22 12 22Z"/>
  <path d="m8.8 12 2.4 2.4 4.4-4.4"/>
</svg>
```

#### Partners — `partners`

İç içe iki halka — ortaklık

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--partners" aria-hidden="true">
  <circle cx="8.5" cy="12" r="5.5"/>
  <circle cx="15.5" cy="12" r="5.5"/>
</svg>
```

#### Careers — `careers`

Evrak çantası

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--careers" aria-hidden="true">
  <rect x="2.5" y="7" width="19" height="13.5" rx="2.5"/>
  <path d="M8.5 7V5.5A2.5 2.5 0 0 1 11 3h2a2.5 2.5 0 0 1 2.5 2.5V7"/>
  <path d="M2.5 12.5h19"/>
</svg>
```

#### Support — `support`

Can simidi — destek

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--support" aria-hidden="true">
  <circle cx="12" cy="12" r="9.5"/>
  <circle cx="12" cy="12" r="4"/>
  <path d="m5.3 5.3 3.9 3.9"/>
  <path d="m14.8 14.8 3.9 3.9"/>
  <path d="m18.7 5.3-3.9 3.9"/>
  <path d="m9.2 14.8-3.9 3.9"/>
</svg>
```

### Yedek — menü büyürse

#### Virtual Agent — `virtual-agent`

Konuşma balonu + bot yüzü

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--virtual-agent" aria-hidden="true">
  <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  <path d="M9.5 11.5h.01"/>
  <path d="M14.5 11.5h.01"/>
</svg>
```

#### Voice Biometrics — `voice-biometrics`

Kalkan + ses barları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--voice-biometrics" aria-hidden="true">
  <path d="M12 22s8-3.5 8-9.5V5.8L12 2.5 4 5.8v6.7C4 18.5 12 22 12 22Z"/>
  <path d="M9 11.5v3"/>
  <path d="M12 9.5v7"/>
  <path d="M15 11.5v3"/>
</svg>
```

#### Knowledge Base — `knowledge-base`

Kitap

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--knowledge-base" aria-hidden="true">
  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>
  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
  <path d="M9 7h6"/>
</svg>
```

#### Contact — `contact`

Zarf

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--contact" aria-hidden="true">
  <rect x="2.5" y="5" width="19" height="14" rx="2.5"/>
  <path d="m3.5 7.5 7.1 5a2.5 2.5 0 0 0 2.8 0l7.1-5"/>
</svg>
```

#### Newsroom — `newsroom`

Haber kartı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--newsroom" aria-hidden="true">
  <rect x="3" y="4.5" width="18" height="15" rx="2.5"/>
  <rect x="6.5" y="8" width="5.5" height="4.5" rx="1"/>
  <path d="M15.5 8.5h2"/>
  <path d="M15.5 12h2"/>
  <path d="M6.5 16h11"/>
</svg>
```

#### Events — `events`

Takvim

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--events" aria-hidden="true">
  <rect x="3" y="5" width="18" height="16" rx="2.5"/>
  <path d="M8 3v4"/>
  <path d="M16 3v4"/>
  <path d="M3 10.5h18"/>
</svg>
```

---

## Yeni ikon eklerken

1. Yukarıdaki tabloya uy — 24×24, 2px stroke, round uç, `fill="none"`.
2. Dosyayı `svg/icons/<kebab-case-isim>.svg` olarak ekle, `class` değerini
   `sst-icon sst-icon--<isim>` yap.
3. `demo/icon-library/index.html` içine kartını ekle ve **16px'te** kontrol et —
   okunmuyorsa detayı azalt, yeni bir ikon çiz.
4. Bu dosyadaki tabloya + kod bloğuna ekle.
5. Mevcut bir ikonun yolunu değiştirdiysen CDN cache'i için sürüm etiketini
   (`@v1.1.1`) güncellemeyi unutma.
