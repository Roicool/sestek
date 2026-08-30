# Sestek Icon Library — v2.0.0

> Mega menu (Products + Company) ve ürün kartları için **SESTEK'e özel** ikon seti.
> Kaynak: `svg/icons/` · Önizleme: `demo/icon-library/index.html`

Set hazır bir kütüphanenin (lucide, Feather vb.) kopyası **değil**; repodaki
`svg/orbit/` yörünge dili ve voice-orbs/waveline bileşenlerinden türetilmiş
üç ilkeye dayanıyor:

| İlke | Ne demek |
|---|---|
| **Ses genliği barları** | Yuvarlak uçlu, farklı boylardaki dikey barlar — markanın "sesi". Ürün ikonlarının çoğunda çekirdek eleman. |
| **Açık kontur** | Hiçbir kapalı form tam kapanmaz; halkada, kalkanda, balonda daima bir "nefes" boşluğu var (orbit koleksiyonundaki açık yaylarla aynı dil). |
| **Node noktaları** | Yörüngedeki/rotadaki duraklar — nokta olarak. |

Bu üç eleman **iki farklı kalınlıkta** çizilir; ikonlara duotone bir ritim veren
ve onları jenerik outline setlerden ayıran şey bu:

| Katman | Kalınlık | Ne çizer | Sınıf |
|---|---|---|---|
| **Yapı** | `1.5` | Konturlar, yaylar, çerçeveler | — |
| **Aksan** | `2.5` | Ses barları ve node'lar | `.sst-icon__accent` |

Aksan katmanı ayrı bir `<g>` içinde olduğu için **markanın rengini** taşıyabilir:

```css
.sst-icon__accent { stroke: var(--sst-icon-accent, currentColor); }
.menu-item__icon  { --sst-icon-accent: #ec008c; }   /* aksanlar marka pembesi */
```

---

## Tasarım kuralları (yeni ikon eklerken uy)

| Kural | Değer |
|---|---|
| viewBox | `0 0 24 24` |
| Yapı çizgisi | `stroke-width="1.5"` |
| Aksan çizgisi | `stroke-width="2.5"`, `<g class="sst-icon__accent">` içinde |
| Uç / köşe | `stroke-linecap="round"`, `stroke-linejoin="round"` |
| Dolgu | `fill="none"` |
| Renk | `stroke="currentColor"`; aksanlar `--sst-icon-accent` ile ayrılabilir |
| Bar ritmi | Barlar **3 birim** aralıklı, boylar kısa-uzun-orta; asla eşit boy değil |
| Node | `<path d="M12 12h.01"/>` — yuvarlak uçlu nokta |
| Kapalı form | Yok. Her halka/kalkan/çerçevede görünür bir açıklık bırak |
| Yaşayan alan | 24×24 içinde 20×20 |
| Detay | Maks. 3–4 yapı + 4 aksan elemanı; 16px'te okunmayan detay girmez |

---

## Set (23 ikon)

| İkon | Dosya | Yer | Kurgu |
|---|---|---|---|
| Agentic AI | `svg/icons/agentic-ai.svg` | Products — kategori | Açık yörünge + ses çekirdeği |
| Agent Copilot | `svg/icons/agent-copilot.svg` | Products — kategori | Eşlik eden iki yay + puls |
| Conversation Intelligence | `svg/icons/conversation-intelligence.svg` | Products — kategori | Analiz halkası içinde ses barları |
| Text to Speech | `svg/icons/text-to-speech.svg` | Agentic AI | “A” harfi → yükselen ses barları |
| Speech Recognition | `svg/icons/speech-recognition.svg` | Agentic AI | Ses barlarından kurulu mikrofon |
| Virtual Translator | `svg/icons/virtual-translator.svg` | Agent Copilot | İki ses grubu + değişim okları |
| Agent Assist | `svg/icons/agent-assist.svg` | Agent Copilot | Açık konuşma balonu + canlı ses |
| Coaching | `svg/icons/coaching.svg` | Conversation Intelligence | Yükselen rota + üç ilerleme node’u |
| AQM | `svg/icons/aqm.svg` | Conversation Intelligence | Skor göstergesi + ibre |
| Analytics | `svg/icons/analytics.svg` | Conversation Intelligence | Ses barları + konuşma tabanı |
| Company | `svg/icons/company.svg` | Company — kategori | Bina + accent pencereler |
| About Us | `svg/icons/about-us.svg` | Company | İki node + açık omuz yayı |
| R&D | `svg/icons/rnd.svg` | Company | Çift yörünge + çekirdek node |
| Compliance & Security | `svg/icons/compliance-security.svg` | Company | Açık kalkan + kilit |
| Partners | `svg/icons/partners.svg` | Company | İç içe iki halka + ortak node |
| Careers | `svg/icons/careers.svg` | Company | Yükselen basamaklar + hedef node |
| Support | `svg/icons/support.svg` | Company | Kulaklık bandı + accent kulaklıklar |
| Virtual Agent | `svg/icons/virtual-agent.svg` | Yedek | Açık bot gövdesi + ses gözleri |
| Voice Biometrics | `svg/icons/voice-biometrics.svg` | Yedek | Kalkan + ses imzası |
| Knowledge Base | `svg/icons/knowledge-base.svg` | Yedek | Açık kitap + accent satırlar |
| Contact | `svg/icons/contact.svg` | Yedek | Açık zarf |
| Newsroom | `svg/icons/newsroom.svg` | Yedek | Haber sayfası + kolon barları |
| Events | `svg/icons/events.svg` | Yedek | Takvim + gün node’ları |

---

## Kullanım — Webflow (HTML Embed)

```html
<div class="menu-item__icon">
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--text-to-speech" aria-hidden="true">
    <path d="M3.5 16.25 7 7.75l3.5 8.5"/>
    <path d="M4.9 12.9h4.2"/>
    <g class="sst-icon__accent" stroke-width="2.5">
      <path d="M14.75 10.5v3"/>
      <path d="M17.75 8.5v7"/>
      <path d="M20.75 10.75v2.5"/>
    </g>
  </svg>
</div>
```

```css
.menu-item__icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #f0f0f6;
  display: grid;
  place-items: center;
  color: #14141c;                    /* yapı çizgileri */
  --sst-icon-accent: #14141c;        /* aksan barları — istersen #ec008c */
}
.menu-item__icon .sst-icon { width: 22px; height: 22px; }
.sst-icon__accent { stroke: var(--sst-icon-accent, currentColor); }

.menu-item:hover .menu-item__icon {
  background: #ec008c14;
  color: #14141c;
  --sst-icon-accent: #ec008c;        /* hover'da sadece ses barları renklenir */
}
```

Tek bir ikonu ayrıca hedeflemen gerekirse her ikonun `sst-icon--<isim>`
sınıfı var:

```css
.sst-icon--virtual-translator { transform: translateY(.5px); }
```

## Kullanım — CDN (jsDelivr)

```
https://cdn.jsdelivr.net/gh/roicool/sestek@main/svg/icons/<isim>.svg
```

`<img>` ile çağırırsan ne `currentColor` ne de `--sst-icon-accent` çalışır —
renk gerektiren her yerde **inline embed** kullan.

---

## İkonlar — kopyala/yapıştır kod

### Products — kategori başlıkları

#### Agentic AI — `agentic-ai`

Açık yörünge + ses çekirdeği

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agentic-ai" aria-hidden="true">
  <path d="M15.9 5.3A7.75 7.75 0 1 0 18.7 15.9"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9 11v2"/>
    <path d="M12 9.25v5.5"/>
    <path d="M15 11v2"/>
  </g>
</svg>
```

#### Agent Copilot — `agent-copilot`

Eşlik eden iki yay + puls

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agent-copilot" aria-hidden="true">
  <path d="M9.5 4.5a8 8 0 0 0 0 15"/>
  <path d="M14.25 6.75a5.75 5.75 0 0 0 0 10.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M19 10.25v3.5"/>
  </g>
</svg>
```

#### Conversation Intelligence — `conversation-intelligence`

Analiz halkası içinde ses barları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--conversation-intelligence" aria-hidden="true">
  <path d="M12 20.5A8.5 8.5 0 1 1 20.5 12"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9 14.5v-2.5"/>
    <path d="M12 14.5v-5"/>
    <path d="M15 14.5v-3.5"/>
  </g>
</svg>
```

### Agentic AI

#### Text to Speech — `text-to-speech`

“A” harfi → yükselen ses barları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--text-to-speech" aria-hidden="true">
  <path d="M3.5 16.25 7 7.75l3.5 8.5"/>
  <path d="M4.9 12.9h4.2"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M14.75 10.5v3"/>
    <path d="M17.75 8.5v7"/>
    <path d="M20.75 10.75v2.5"/>
  </g>
</svg>
```

#### Speech Recognition — `speech-recognition`

Ses barlarından kurulu mikrofon

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--speech-recognition" aria-hidden="true">
  <path d="M6.5 13.25a5.5 5.5 0 0 0 11 0"/>
  <path d="M12 18.75v2.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9 7.25v5.5"/>
    <path d="M12 4.75v10.5"/>
    <path d="M15 7.25v5.5"/>
  </g>
</svg>
```

### Agent Copilot

#### Virtual Translator — `virtual-translator`

İki ses grubu + değişim okları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--virtual-translator" aria-hidden="true">
  <path d="M9.5 9.5h5.25"/>
  <path d="m13 7.75 1.75 1.75L13 11.25"/>
  <path d="M14.5 14.5H9.25"/>
  <path d="m11 12.75-1.75 1.75L11 16.25"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M3.75 9.75v4.5"/>
    <path d="M6.75 11.25v1.5"/>
    <path d="M17.25 11.25v1.5"/>
    <path d="M20.25 9.75v4.5"/>
  </g>
</svg>
```

#### Agent Assist — `agent-assist`

Açık konuşma balonu + canlı ses

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--agent-assist" aria-hidden="true">
  <path d="M15 4.5h1.5A3.5 3.5 0 0 1 20 8v5.5a3.5 3.5 0 0 1-3.5 3.5H9l-4.5 3.5V8A3.5 3.5 0 0 1 8 4.5h3.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9.5 9.75v2.5"/>
    <path d="M12.5 8.25v5.5"/>
    <path d="M15.5 10.25v1.5"/>
  </g>
</svg>
```

### Conversation Intelligence

#### Coaching — `coaching`

Yükselen rota + üç ilerleme node’u

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--coaching" aria-hidden="true">
  <path d="M5 19c3-.5 5.5-2.5 7-5.5S17 8 19 7.25"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M5 19h.01"/>
    <path d="M12 13.5h.01"/>
    <path d="M19 7.25h.01"/>
  </g>
</svg>
```

#### AQM — `aqm`

Skor göstergesi + ibre

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--aqm" aria-hidden="true">
  <path d="M6.2 17.8A8.25 8.25 0 1 1 17.8 17.8"/>
  <path d="m12 12.75 4-4.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M12 12.75h.01"/>
    <path d="M6.2 17.8A8.25 8.25 0 0 1 8.9 6"/>
  </g>
</svg>
```

#### Analytics — `analytics`

Ses barları + konuşma tabanı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--analytics" aria-hidden="true">
  <path d="M3.5 20.25c5 1.75 12 1.75 17 0"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M5.75 17v-3.5"/>
    <path d="M9.9 17v-7"/>
    <path d="M14.1 17v-4.5"/>
    <path d="M18.25 17v-9.5"/>
  </g>
</svg>
```

### Company

#### Company — `company`

Bina + accent pencereler

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--company" aria-hidden="true">
  <path d="M4.5 20.5V6.75A2.25 2.25 0 0 1 6.75 4.5h4.5a2.25 2.25 0 0 1 2.25 2.25V20.5"/>
  <path d="M13.5 11.5h3.75a2.25 2.25 0 0 1 2.25 2.25V20.5"/>
  <path d="M3 20.5h18"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M8 9v2"/>
    <path d="M8 14.5v2"/>
    <path d="M16.5 15.5v2"/>
  </g>
</svg>
```

#### About Us — `about-us`

İki node + açık omuz yayı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--about-us" aria-hidden="true">
  <path d="M3.75 18.75a4.25 4.25 0 0 1 8.5 0"/>
  <path d="M11.75 18.75a4.25 4.25 0 0 1 8.5 0"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M8 11h.01"/>
    <path d="M16 11h.01"/>
  </g>
</svg>
```

#### R&D — `rnd`

Çift yörünge + çekirdek node

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--rnd" aria-hidden="true">
  <ellipse cx="12" cy="12" rx="8.75" ry="4" transform="rotate(45 12 12)"/>
  <ellipse cx="12" cy="12" rx="8.75" ry="4" transform="rotate(-45 12 12)"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M12 12h.01"/>
  </g>
</svg>
```

#### Compliance & Security — `compliance-security`

Açık kalkan + kilit

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--compliance-security" aria-hidden="true">
  <path d="M12 3.25 5.25 5.9v6.35c0 4.55 4.4 7.35 6.75 8.5 2.35-1.15 6.75-3.95 6.75-8.5V5.9l-4.25-1.65"/>
  <path d="M10.4 12.4v-1.15a1.6 1.6 0 0 1 3.2 0v1.15"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M12 13.75v2.25"/>
  </g>
</svg>
```

#### Partners — `partners`

İç içe iki halka + ortak node

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--partners" aria-hidden="true">
  <circle cx="9.5" cy="12" r="5.25"/>
  <path d="M18.52 8.63A5.25 5.25 0 1 0 18.52 15.37"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M12 12h.01"/>
  </g>
</svg>
```

#### Careers — `careers`

Yükselen basamaklar + hedef node

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--careers" aria-hidden="true">
  <path d="M4 19.5h4.5V15H13v-4.5h4.5V8"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M17.5 5.9h.01"/>
  </g>
</svg>
```

#### Support — `support`

Kulaklık bandı + accent kulaklıklar

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--support" aria-hidden="true">
  <path d="M5 13.75V12a7 7 0 0 1 14 0v1.75"/>
  <path d="M19 17.5v.75a2.75 2.75 0 0 1-2.75 2.75H13.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M5 13.5v3.25"/>
    <path d="M19 13.5v3.25"/>
  </g>
</svg>
```

### Yedek — menü büyürse

#### Virtual Agent — `virtual-agent`

Açık bot gövdesi + ses gözleri

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--virtual-agent" aria-hidden="true">
  <path d="M12 6.5h4A3.5 3.5 0 0 1 19.5 10v4a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 14v-4A3.5 3.5 0 0 1 8 6.5h1"/>
  <path d="M12 3.5v3"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9.5 11v2"/>
    <path d="M14.5 11v2"/>
  </g>
</svg>
```

#### Voice Biometrics — `voice-biometrics`

Kalkan + ses imzası

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--voice-biometrics" aria-hidden="true">
  <path d="M12 3.25 5.25 5.9v6.35c0 4.55 4.4 7.35 6.75 8.5 2.35-1.15 6.75-3.95 6.75-8.5V5.9l-4.25-1.65"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9.25 11v2.5"/>
    <path d="M12 9v6.5"/>
    <path d="M14.75 11v2.5"/>
  </g>
</svg>
```

#### Knowledge Base — `knowledge-base`

Açık kitap + accent satırlar

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--knowledge-base" aria-hidden="true">
  <path d="M8 4.5h9.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8"/>
  <path d="M8 4.5A3.5 3.5 0 0 0 4.5 8v8A3.5 3.5 0 0 0 8 19.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M11 9.5h5.5"/>
    <path d="M11 13h3.5"/>
  </g>
</svg>
```

#### Contact — `contact`

Açık zarf

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--contact" aria-hidden="true">
  <path d="M9 5.5h8.5A3 3 0 0 1 20.5 8.5v7a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3H7"/>
  <path d="m5 8.5 5.6 4.4a2.25 2.25 0 0 0 2.8 0L19 8.5"/>
</svg>
```

#### Newsroom — `newsroom`

Haber sayfası + kolon barları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--newsroom" aria-hidden="true">
  <path d="M8 4.5h11.5v13a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5V8H8V4.5"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M8 9.5v4"/>
    <path d="M11.5 9.5v4"/>
    <path d="M15 9.5v4"/>
    <path d="M8 17h7"/>
  </g>
</svg>
```

#### Events — `events`

Takvim + gün node’ları

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sst-icon sst-icon--events" aria-hidden="true">
  <path d="M8 5.5h8a3.5 3.5 0 0 1 3.5 3.5v8a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 17V9A3.5 3.5 0 0 1 8 5.5"/>
  <path d="M8 3.5v4"/>
  <path d="M16 3.5v4"/>
  <g class="sst-icon__accent" stroke-width="2.5">
    <path d="M9 13h.01"/>
    <path d="M12 13h.01"/>
    <path d="M15 13h.01"/>
    <path d="M9 16.5h.01"/>
  </g>
</svg>
```

---

## Yeni ikon eklerken

1. Önce metaforu üç ilkeye çevir: hangi eleman **ses barı**, hangisi **açık kontur**,
   nerede **node** var? Hiçbiri yoksa ikon bu setin parçası değildir.
2. Yapıyı 1.5px, aksanı `<g class="sst-icon__accent" stroke-width="2.5">` içinde çiz.
3. `svg/icons/<kebab-case-isim>.svg` olarak kaydet, `class="sst-icon sst-icon--<isim>"` ver.
4. `demo/icon-library/index.html` içinde **22px ve 16px**'te kontrol et.
5. Bu dosyadaki tabloya + kod bloğuna ekle; CDN cache'i için sürüm etiketini güncelle.
