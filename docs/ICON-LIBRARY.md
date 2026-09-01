# Sestek Icon Library — v3.0.0

> Mega menu (Products + Company) ve ürün kartları için markalı ikon seti.
> Kaynak: `svg/icons/` · Önizleme: `demo/icon-library/index.html`

Set **dolgu tabanlı ve gradyanlı**; hazır outline kütüphanelerinden (lucide,
Feather, Heroicons) ayrılmasının sebebi de bu. Her ikon üç katmandan kurulur:

| Katman | Sınıf | Renk | Ne çizer |
|---|---|---|---|
| **Soft** | `.sst-icon__soft` | `currentColor` @ `.22` | Gövde / kütle — balon, kalkan, plaka, halka |
| **Solid** | `.sst-icon__solid` | `currentColor` | Anlamı taşıyan net detay — metin satırı, onay işareti, node |
| **Accent** | `.sst-icon__accent` | **marka gradyanı** | "Ses" olan her şey — barlar, dalga, skor yayı, parıltı |

Gradyan repodaki orbit koleksiyonuyla aynı: `#EC008C → #7F81AE → #00FFEB`,
sol alttan sağ üste. Her ikon kendi `<linearGradient>` tanımını taşır
(`id="sstg-<isim>"`), yani sayfaya tek başına gömülür, harici bir defs
dosyasına bağımlı değildir.

**Kural:** bir ikonda gradyan yoksa o ikon bu setin parçası değildir. Gradyan,
ürünün "ses" tarafını işaret eder — ikonun neyi vurguladığını da bu belirler.

---

## Renkleri değiştirme

Gradyan durakları CSS değişkenlerinden okunur, hard-code değildir:

```css
.menu-item__icon {
  color: #14141c;          /* soft + solid katmanları */
  --sst-c1: #EC008C;       /* gradyan başlangıcı  (varsayılan) */
  --sst-c2: #7F81AE;       /* orta durak */
  --sst-c3: #00FFEB;       /* bitiş */
}
```

**Mono varyant** — gradyanı tamamen kapatmak için (tek renkli bağlamlar,
baskı, e-posta imzası):

```css
.sst-icon--mono .sst-icon__accent { fill: currentColor; stroke: currentColor; }
```

**Koyu zemin** — soft ve solid `currentColor`'dan geldiği için zemin
değiştiğinde ayrıca bir şey yapmanız gerekmez; `color` beyaza döner, gradyan
aynı kalır ve koyu zeminde daha da parlar.

---

## Tasarım kuralları (yeni ikon eklerken uy)

| Kural | Değer |
|---|---|
| viewBox | `0 0 24 24` |
| Yaşayan alan | 24×24 içinde 20×20 |
| Soft opaklık | `.22` — grup düzeyinde, eleman düzeyinde değil (üst üste binen şekiller koyulaşmasın) |
| Bar geometrisi | `rx` = genişliğin yarısı (tam yuvarlak uç), genişlik `2.2`, aralık `2.9` |
| Bar ritmi | Boylar kısa-uzun-orta; asla eşit değil |
| Kontur | Sadece halka/yay gibi zorunlu yerlerde, `stroke-width` 2–3, yuvarlak uç |
| Solid kullanımı | Az; sadece okunurluk için gereken net detayda. Havada duran siyah parça bırakma — gövdeye ait her şey soft |
| Gradyan | Her ikonda **bir** gradyan grubu; ikonun ana mesajını taşıyan eleman |
| Detay | Maks. 2 soft + 3 solid + 4 accent eleman; 16px'te okunmayan detay girmez |

---

## Set (23 ikon)

| İkon | Dosya | Yer | Kurgu |
|---|---|---|---|
| Agentic AI | `svg/icons/agentic-ai.svg` | Products — kategori | Çip gövde + gradyan yörünge + çekirdek |
| Agent Copilot | `svg/icons/agent-copilot.svg` | Products — kategori | Temsilci + gradyan AI parıltısı |
| Conversation Intelligence | `svg/icons/conversation-intelligence.svg` | Products — kategori | Konuşma balonu + gradyan içgörü çizgisi |
| Text to Speech | `svg/icons/text-to-speech.svg` | Agentic AI | “A” harfi + iki gradyan ses barı |
| Speech Recognition | `svg/icons/speech-recognition.svg` | Agentic AI | Gradyan mikrofon kapsülü + dinleme kasesi |
| Virtual Translator | `svg/icons/virtual-translator.svg` | Agent Copilot | Karşılıklı iki ses kümesi — biri gradyan |
| Agent Assist | `svg/icons/agent-assist.svg` | Agent Copilot | Konuşma balonu + gradyan canlı ses |
| Coaching | `svg/icons/coaching.svg` | Conversation Intelligence | Rota + duraklar, hedef gradyan |
| AQM | `svg/icons/aqm.svg` | Conversation Intelligence | Skor halkası + gradyan skor yayı + onay |
| Analytics | `svg/icons/analytics.svg` | Conversation Intelligence | Yükselen barlar, son ikisi gradyan |
| Company | `svg/icons/company.svg` | Company — kategori | İki blok + gradyan pencereler |
| About Us | `svg/icons/about-us.svg` | Company | İki figür — biri gradyan |
| R&D | `svg/icons/rnd.svg` | Company | Yörünge halkası + gradyan çekirdek |
| Compliance & Security | `svg/icons/compliance-security.svg` | Company | Kalkan + gradyan onay |
| Partners | `svg/icons/partners.svg` | Company | İç içe iki halka — biri gradyan |
| Careers | `svg/icons/careers.svg` | Company | Figür + gradyan artı (katıl) |
| Support | `svg/icons/support.svg` | Company | Kulaklık + gradyan kulaklıklar |
| Virtual Agent | `svg/icons/virtual-agent.svg` | Yedek | Bot gövdesi + gradyan ses gözleri |
| Voice Biometrics | `svg/icons/voice-biometrics.svg` | Yedek | Kalkan + gradyan ses imzası |
| Knowledge Base | `svg/icons/knowledge-base.svg` | Yedek | Kitap + gradyan sırt |
| Contact | `svg/icons/contact.svg` | Yedek | Zarf + gradyan kapak |
| Newsroom | `svg/icons/newsroom.svg` | Yedek | Haber kartı + gradyan görsel bloğu |
| Events | `svg/icons/events.svg` | Yedek | Takvim + gradyan gün bloğu |

---

## Kullanım — Webflow (HTML Embed)

```html
<div class="menu-item__icon">
  <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--speech-recognition" aria-hidden="true">
    <defs>
      <linearGradient id="sstg-speech-recognition" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
        <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
        <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
      </linearGradient>
    </defs>
    <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
      <path d="M6 12.2a6 6 0 0 0 12 0" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="11.1" y="17.4" width="1.8" height="4" rx="0.9" stroke="none"/>
    </g>
    <g class="sst-icon__accent" fill="url(#sstg-speech-recognition)" stroke="url(#sstg-speech-recognition)">
      <rect x="9.4" y="2.5" width="5.2" height="10.6" rx="2.6" stroke="none"/>
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
  color: #14141c;
}
.menu-item__icon .sst-icon { width: 22px; height: 22px; }

.menu-item:hover .menu-item__icon { background: #ec008c14; }
```

Hover'da gradyanı değiştirmek istersen `--sst-c1/2/3`'ü hover üzerinde
yeniden tanımlaman yeterli — SVG'ye dokunmadan.

> **Not:** Aynı ikonu bir sayfada iki kez gömerseniz gradyan `id`'si tekrar
> eder. Tarayıcı ilk tanımı kullanır ve ikisi birebir aynı olduğu için görsel
> bir fark oluşmaz; yine de bir sayfada aynı ikonu tekrarlıyorsanız
> `id`/`url(#…)` çiftine bir sonek eklemek en temizi.

## Kullanım — CDN (jsDelivr)

```
https://cdn.jsdelivr.net/gh/roicool/sestek@main/svg/icons/<isim>.svg
```

`<img>` ile çağrıldığında gradyan görünür (SVG'nin içinde tanımlı) ama
`currentColor` çalışmaz — soft/solid katmanlar siyaha düşer. Renk uyumu
gereken her yerde **inline embed** kullanın.

---

## İkonlar — kopyala/yapıştır kod

### Products — kategori başlıkları

#### Agentic AI — `agentic-ai`

Çip gövde + gradyan yörünge + çekirdek

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--agentic-ai" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-agentic-ai" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5.6" stroke="none"/>
  </g>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <circle cx="12" cy="12" r="1.9" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-agentic-ai)" stroke="url(#sstg-agentic-ai)">
    <path d="M12 6.2a5.8 5.8 0 1 1-4.1 1.7" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

#### Agent Copilot — `agent-copilot`

Temsilci + gradyan AI parıltısı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--agent-copilot" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-agent-copilot" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <circle cx="9.4" cy="9.6" r="3.5" stroke="none"/>
    <path d="M2.9 20.6a6.5 6.5 0 0 1 13 0Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-agent-copilot)" stroke="url(#sstg-agent-copilot)">
    <path d="M18.2 3.6c.55 2.9 1.75 4.1 4.65 4.65-2.9.55-4.1 1.75-4.65 4.65-.55-2.9-1.75-4.1-4.65-4.65 2.9-.55 4.1-1.75 4.65-4.65Z" stroke="none"/>
  </g>
</svg>
```

#### Conversation Intelligence — `conversation-intelligence`

Konuşma balonu + gradyan içgörü çizgisi

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--conversation-intelligence" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-conversation-intelligence" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M6.5 3.8h11a4 4 0 0 1 4 4v6.4a4 4 0 0 1-4 4h-7.2l-4.4 3.6a1 1 0 0 1-1.6-.8V7.8a4 4 0 0 1 4-4Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-conversation-intelligence)" stroke="url(#sstg-conversation-intelligence)">
    <path d="m7.6 12.6 3-3.2 2.6 2.6 3.6-4.4" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

### Agentic AI

#### Text to Speech — `text-to-speech`

“A” harfi + iki gradyan ses barı

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--text-to-speech" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-text-to-speech" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <path d="M3.4 17 7.3 6.9 11.2 17" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5 13.4h4.6" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-text-to-speech)" stroke="url(#sstg-text-to-speech)">
    <rect x="15.2" y="9.2" width="3" height="5.6" rx="1.5" stroke="none"/>
    <rect x="19" y="6.8" width="3" height="10.4" rx="1.5" stroke="none"/>
  </g>
</svg>
```

#### Speech Recognition — `speech-recognition`

Gradyan mikrofon kapsülü + dinleme kasesi

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--speech-recognition" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-speech-recognition" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M6 12.2a6 6 0 0 0 12 0" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="11.1" y="17.4" width="1.8" height="4" rx="0.9" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-speech-recognition)" stroke="url(#sstg-speech-recognition)">
    <rect x="9.4" y="2.5" width="5.2" height="10.6" rx="2.6" stroke="none"/>
  </g>
</svg>
```

### Agent Copilot

#### Virtual Translator — `virtual-translator`

Karşılıklı iki ses kümesi — biri gradyan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--virtual-translator" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-virtual-translator" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="14.4" y="9.8" width="2.8" height="4.4" rx="1.4" stroke="none"/>
    <rect x="18.2" y="7.4" width="2.8" height="9.2" rx="1.4" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-virtual-translator)" stroke="url(#sstg-virtual-translator)">
    <rect x="3" y="7.4" width="2.8" height="9.2" rx="1.4" stroke="none"/>
    <rect x="6.8" y="9.8" width="2.8" height="4.4" rx="1.4" stroke="none"/>
  </g>
</svg>
```

#### Agent Assist — `agent-assist`

Konuşma balonu + gradyan canlı ses

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--agent-assist" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-agent-assist" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M6.5 3.8h11a4 4 0 0 1 4 4v6.4a4 4 0 0 1-4 4h-7.2l-4.4 3.6a1 1 0 0 1-1.6-.8V7.8a4 4 0 0 1 4-4Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-agent-assist)" stroke="url(#sstg-agent-assist)">
    <rect x="8" y="8.1" width="2.5" height="4.8" rx="1.25" stroke="none"/>
    <rect x="11.1" y="6.6" width="2.5" height="7.8" rx="1.25" stroke="none"/>
    <rect x="14.2" y="8.9" width="2.5" height="3.2" rx="1.25" stroke="none"/>
  </g>
</svg>
```

### Conversation Intelligence

#### Coaching — `coaching`

Rota + duraklar, hedef gradyan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--coaching" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-coaching" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M4.8 18.4c3.2-.4 5.8-2.4 7.3-5.5S16.9 7.6 19.4 6.9" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <circle cx="4.9" cy="18.4" r="1.5" stroke="none"/>
    <circle cx="11.9" cy="13.1" r="1.5" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-coaching)" stroke="url(#sstg-coaching)">
    <circle cx="19.4" cy="6.9" r="2.1" stroke="none"/>
  </g>
</svg>
```

#### AQM — `aqm`

Skor halkası + gradyan skor yayı + onay

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--aqm" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-aqm" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M12 4a8 8 0 1 1-5.6 13.7" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <path d="m9.2 12.1 2 2 3.6-4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-aqm)" stroke="url(#sstg-aqm)">
    <path d="M6.4 17.7A8 8 0 0 1 12 4" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

#### Analytics — `analytics`

Yükselen barlar, son ikisi gradyan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--analytics" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-analytics" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3.4" y="14" width="3.6" height="6.4" rx="1.8" stroke="none"/>
    <rect x="8.2" y="11" width="3.6" height="9.4" rx="1.8" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-analytics)" stroke="url(#sstg-analytics)">
    <rect x="13" y="8" width="3.6" height="12.4" rx="1.8" stroke="none"/>
    <rect x="17.8" y="4.6" width="3.6" height="15.8" rx="1.8" stroke="none"/>
  </g>
</svg>
```

### Company

#### Company — `company`

İki blok + gradyan pencereler

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--company" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-company" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3.4" y="4.6" width="8.6" height="15.8" rx="2.6" stroke="none"/>
    <rect x="12.6" y="10.4" width="8" height="10" rx="2.6" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-company)" stroke="url(#sstg-company)">
    <rect x="6" y="8.2" width="3.8" height="2.4" rx="1.2" stroke="none"/>
    <rect x="6" y="12.6" width="3.8" height="2.4" rx="1.2" stroke="none"/>
    <rect x="14.8" y="14" width="3.6" height="2.4" rx="1.2" stroke="none"/>
  </g>
</svg>
```

#### About Us — `about-us`

İki figür — biri gradyan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--about-us" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-about-us" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <circle cx="8.4" cy="8.6" r="3.3" stroke="none"/>
    <path d="M2.6 20.6a5.8 5.8 0 0 1 11.6 0Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-about-us)" stroke="url(#sstg-about-us)">
    <circle cx="16.6" cy="9.6" r="2.7" stroke="none"/>
    <path d="M11.8 20.6a4.8 4.8 0 0 1 9.6 0Z" stroke="none"/>
  </g>
</svg>
```

#### R&D — `rnd`

Yörünge halkası + gradyan çekirdek

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--rnd" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-rnd" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <ellipse cx="12" cy="12" rx="9" ry="4.4" transform="rotate(-28 12 12)" fill="none" stroke-width="2.4"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-rnd)" stroke="url(#sstg-rnd)">
    <circle cx="12" cy="12" r="3.4" stroke="none"/>
  </g>
</svg>
```

#### Compliance & Security — `compliance-security`

Kalkan + gradyan onay

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--compliance-security" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-compliance-security" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M12 2.6 4.6 5.5v6.6c0 4.8 4.6 7.7 7.4 8.9 2.8-1.2 7.4-4.1 7.4-8.9V5.5Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-compliance-security)" stroke="url(#sstg-compliance-security)">
    <path d="m8.7 12 2.4 2.4 4.5-4.8" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

#### Partners — `partners`

İç içe iki halka — biri gradyan

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--partners" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-partners" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <circle cx="9.2" cy="12" r="5.2" fill="none" stroke-width="2.6"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-partners)" stroke="url(#sstg-partners)">
    <circle cx="14.8" cy="12" r="5.2" fill="none" stroke-width="2.6"/>
  </g>
</svg>
```

#### Careers — `careers`

Figür + gradyan artı (katıl)

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--careers" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-careers" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <circle cx="9.6" cy="8.2" r="3.3" stroke="none"/>
    <path d="M3.8 20.4a5.8 5.8 0 0 1 11.6 0Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-careers)" stroke="url(#sstg-careers)">
    <rect x="17.3" y="12.6" width="2" height="7.4" rx="1" stroke="none"/>
    <rect x="14.8" y="15.1" width="7" height="2" rx="1" stroke="none"/>
  </g>
</svg>
```

#### Support — `support`

Kulaklık + gradyan kulaklıklar

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--support" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-support" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M4.8 13.6V11a7.2 7.2 0 0 1 14.4 0v2.6" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M19.2 18.6v.5a2.6 2.6 0 0 1-2.6 2.6h-2.4" fill="none" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-support)" stroke="url(#sstg-support)">
    <rect x="3" y="12.4" width="3.8" height="6.4" rx="1.9" stroke="none"/>
    <rect x="17.2" y="12.4" width="3.8" height="6.4" rx="1.9" stroke="none"/>
  </g>
</svg>
```

### Yedek — menü büyürse

#### Virtual Agent — `virtual-agent`

Bot gövdesi + gradyan ses gözleri

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--virtual-agent" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-virtual-agent" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3.6" y="6.4" width="16.8" height="13.2" rx="4.6" stroke="none"/>
    <rect x="11.1" y="2.6" width="1.8" height="3.8" rx="0.9" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-virtual-agent)" stroke="url(#sstg-virtual-agent)">
    <rect x="8.3" y="10.8" width="2.2" height="4.4" rx="1.1" stroke="none"/>
    <rect x="13.5" y="10.8" width="2.2" height="4.4" rx="1.1" stroke="none"/>
  </g>
</svg>
```

#### Voice Biometrics — `voice-biometrics`

Kalkan + gradyan ses imzası

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--voice-biometrics" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-voice-biometrics" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <path d="M12 2.6 4.6 5.5v6.6c0 4.8 4.6 7.7 7.4 8.9 2.8-1.2 7.4-4.1 7.4-8.9V5.5Z" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-voice-biometrics)" stroke="url(#sstg-voice-biometrics)">
    <rect x="8.5" y="10.3" width="2.3" height="4.4" rx="1.15" stroke="none"/>
    <rect x="10.9" y="8.2" width="2.3" height="8.6" rx="1.15" stroke="none"/>
    <rect x="13.3" y="10.3" width="2.3" height="4.4" rx="1.15" stroke="none"/>
  </g>
</svg>
```

#### Knowledge Base — `knowledge-base`

Kitap + gradyan sırt

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--knowledge-base" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-knowledge-base" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="5.2" y="3.6" width="15" height="16.8" rx="3" stroke="none"/>
  </g>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <rect x="8.8" y="8.4" width="7.4" height="1.7" rx="0.85" stroke="none"/>
    <rect x="8.8" y="11.8" width="5" height="1.7" rx="0.85" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-knowledge-base)" stroke="url(#sstg-knowledge-base)">
    <rect x="3.2" y="3.6" width="3.6" height="16.8" rx="1.8" stroke="none"/>
  </g>
</svg>
```

#### Contact — `contact`

Zarf + gradyan kapak

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--contact" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-contact" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="2.4" y="5" width="19.2" height="14" rx="3.4" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-contact)" stroke="url(#sstg-contact)">
    <path d="m4.4 8.2 6.2 4.9a2.3 2.3 0 0 0 2.8 0l6.2-4.9" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
```

#### Newsroom — `newsroom`

Haber kartı + gradyan görsel bloğu

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--newsroom" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-newsroom" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3" y="4.4" width="18" height="15.2" rx="3.2" stroke="none"/>
  </g>
  <g class="sst-icon__solid" fill="currentColor" stroke="currentColor">
    <rect x="13.2" y="9" width="5" height="1.9" rx="0.95" stroke="none"/>
    <rect x="13.2" y="12.4" width="5" height="1.9" rx="0.95" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-newsroom)" stroke="url(#sstg-newsroom)">
    <rect x="5.8" y="8" width="5.6" height="6.4" rx="1.8" stroke="none"/>
  </g>
</svg>
```

#### Events — `events`

Takvim + gradyan gün bloğu

```html
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" class="sst-icon sst-icon--events" aria-hidden="true">
  <defs>
    <linearGradient id="sstg-events" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="var(--sst-c1, #EC008C)"/>
      <stop offset=".5" stop-color="var(--sst-c2, #7F81AE)"/>
      <stop offset="1" stop-color="var(--sst-c3, #00FFEB)"/>
    </linearGradient>
  </defs>
  <g class="sst-icon__soft" fill="currentColor" stroke="currentColor" opacity=".22">
    <rect x="3" y="5.4" width="18" height="15" rx="3.4" stroke="none"/>
    <rect x="7.2" y="2.6" width="1.8" height="4.2" rx="0.9" stroke="none"/>
    <rect x="15" y="2.6" width="1.8" height="4.2" rx="0.9" stroke="none"/>
  </g>
  <g class="sst-icon__accent" fill="url(#sstg-events)" stroke="url(#sstg-events)">
    <rect x="7.4" y="11.8" width="4.2" height="4.2" rx="1.4" stroke="none"/>
  </g>
</svg>
```

---

## Yeni ikon eklerken

1. Metaforu üç katmana böl: **soft** ne olacak (gövde), **solid** ne olacak
   (net detay), **accent** ne olacak (ürünün sesi/özü). Accent'e koyacak bir
   şey bulamıyorsan metaforu değiştir.
2. Barları ve node'ları hazır ölçülerle çiz: bar genişliği `2.2`, aralık
   `2.9`, `rx` = 1.1; node yarıçapı `1.5–2.6`.
3. Gradyanı `id="sstg-<isim>"` ile tanımla, accent grubunda
   `fill="url(#sstg-<isim>)"` kullan.
4. `svg/icons/<kebab-case-isim>.svg` olarak kaydet,
   `class="sst-icon sst-icon--<isim>"` ver.
5. `demo/icon-library/index.html` içinde **22px, mono ve koyu zemin**
   varyantlarında kontrol et.
6. Bu dosyadaki tabloya + kod bloğuna ekle.
