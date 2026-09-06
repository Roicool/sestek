# Savings Calculators — Webflow CMS

Bu klasör, SESTEK sitesindeki **Calculators** CMS koleksiyonuna girilen 5 hesaplayıcının
canlı içeriğinin birebir kopyasıdır. Dosyalar Webflow Data API'den çekilmiştir; CMS'te ne
varsa burada odur (elle düzenlenmemiştir).

> Bir hesaplayıcıyı güncellerken önce buradaki dosyayı düzenle, sonra aynı içeriği CMS'teki
> ilgili alana yapıştır. Tersi de geçerli: CMS'te değişiklik yapıldıysa buradaki dosyayı
> yeniden dışa aktar.

---

## Webflow referansları

| | |
|---|---|
| Site | `sestek` · `6a15f6e39b139e2c81103be6` |
| Collection | `Calculators` · `6a81ddcf7f98b8be675e33e9` |
| Template page | `Calculators Template` · `6a81ddd07f98b8be675e33f0` |
| Yayın yolu | `/calculators/<slug>` |

### Koleksiyon alanları

| Alan | Slug | Tip | Not |
|---|---|---|---|
| Calculator Code | `calculator-code` | RichText | HTML + CSS + JS embed (`*.calculator-code.html`) |
| Heading | `heading` | PlainText | Hero H1 |
| Description | `description` | PlainText | Hero paragrafı |
| Glossary | `glossary` | RichText | Terimler embed'i (`*.glossary.html`) |
| Glossary Title | `glossary-title` | PlainText | Tümünde `Calculator glossary` |
| Navbar description | `navbar-description` | PlainText | Menüdeki kısa açıklama |
| Meta title | `meta-title` | PlainText | **45–60 karakter zorunlu** |
| Meta Description | `meta-description` | PlainText | **140–155 karakter zorunlu** |

Template bağlantı sırası: hero (Heading + Description) → `section__calculator`
(Calculator Code) → `section__glossary-calculator` (Glossary Title + Glossary) → `main-cta`.

### Item'lar

| Ad | Slug | Item ID |
|---|---|---|
| Speech Analytics | `speech-analytics` | `6a81df5525f6e04430154a2e` |
| Automated Quality Management | `automated-quality-management` | `6a96db6ee41dad5215d6e842` |
| Conversational IVR | `conversational-ivr` | `6a96dbb519228721b53abeb4` |
| Virtual Agent | `virtual-agent` | `6a96dc022089425b1fbe7e80` |
| Voice Biometrics | `voice-biometrics` | `6a96dc3b19228721b53af53a` |

---

## Embed yapısı

Her `calculator-code` alanı tek bir `<div data-rt-embed-type='true'>` içinde
**self-contained** üç parçadan oluşur:

1. **Markup** — `.sroi` iki panelli layout. Sol panel açık gri kart, kullanıcı input'ları;
   sağ panel koyu lacivert (`--navy:#16183c`) sonuç paneli, magenta (`--magenta:#EC009C`)
   vurgu. Yıllık tasarruf rakamı `container-type:inline-size` + `cqi` birimiyle panele göre
   ölçeklenir, tek satırda kalır.
2. **`<style>`** — `.sroi` blokları. 5 item'da birebir aynıdır.
3. **`<script>`** — `calculate_roi()` + `number_format()`. **Sestek'in orijinal sayfa JS'i
   ile birebir aynıdır, değiştirilmemiştir.** jQuery'ye (`$`) bağlıdır; Webflow bunu zaten
   yüklüyor.

CSS ve `number_format` bilinçli olarak her item'da tekrarlanır — böylece bir hesaplayıcı
tek başına taşınabilir/kopyalanabilir kalır.

### Sabit varsayımlar `<input type="hidden">` olarak durur

Hesaplama JS'i bu değerleri DOM'dan `parseFloat` ile okur, o yüzden `%` işaretiyle birlikte
string olarak yazılmalıdır (`parseFloat("10%") === 10`).

| Slug | Hidden input | Değer |
|---|---|---|
| `speech-analytics` | `decrease_after` | `10%` |
| `automated-quality-management` | `time_saved` | `40%` |
| `conversational-ivr` | `cost_per_call` | `20%` |
| `virtual-agent` | `perc_inquiries` | `25%` |
| `voice-biometrics` | `decrease_after` | `8%` |

---

## Formüllerdeki tuzaklar

- **Conversational IVR** — `cost_per_call` input'u aslında *cost per call* değil,
  "Increase in Calls Handled after Conversational IVR" (%20) tutar. İsim yanıltıcıdır ama
  orijinal JS bu ada göre okuduğu için **değiştirilemez**.
  `decrease_after = (1 + 20/100) × 30 = %36`, tasarruf `300.000 × (36−30)/100`.
- **AQM** — `number_of_agents` değiştiğinde team leader (`agents/10`) ve QM evaluator
  (`agents/50`) alanları `Math.ceil` ile otomatik güncellenir. FTE tek ondalıkla yazılır
  (`number_format(saving_fte, 1)`); diğer 4 hesaplayıcıda 0 ondalıktır.
- **`number_format` regex'i** — `/\B(?=(?:\d{3})+(?!\d))/g`. Tek ters bölü. CMS'e yazarken
  çift ters bölüye (`\\B`) kaçarsa binlik ayracı sessizce çalışmaz; `$300000` gibi görünür.
  Değişiklikten sonra mutlaka `verify.js` ile doğrula.

---

## Varsayılan değerlerle beklenen çıktılar

`verify.js` çıktısı (CMS'te kayıtlı JS gerçekten çalıştırılarak üretildi):

| Calculator | Monthly | Annual | FTE |
|---|---|---|---|
| Speech Analytics | $30,000 | $360,000 | 10 |
| Automated Quality Management | $6,800 | $81,600 | 1.7 |
| Conversational IVR | $18,000 | $216,000 | 6 |
| Virtual Agent | $75,000 | $900,000 | 25 |
| Voice Biometrics | $24,000 | $288,000 | 8 |

> Eski sestek.com sayfalarındaki AQM (`$25,000`) ve Virtual Agent (`$20,000`) örnek
> rakamları formüllerle tutmuyordu — statik placeholder'lardı. Yukarıdaki değerler
> formüllerin gerçek çıktısıdır.

### Doğrulama

```bash
node demo/savings-calculator/cms/verify.js
```

Basit bir jQuery shim'i ile embed'in içindeki `<script>` bloğunu çalıştırır, varsayılan
input değerleriyle tüm sonuç alanlarını yazdırır. Embed'e dokunan her değişiklikten sonra
çalıştır.

---

## Eski URL'ler (301 gerekiyor)

Yönlendirmeler bu depo kapsamında değil; referans olması için liste:

| Eski | Yeni |
|---|---|
| `/savings-calculator-for-speech-analytics` | `/calculators/speech-analytics` |
| `/savings-calculator-for-automated-quality-management` | `/calculators/automated-quality-management` |
| `/savings-calculator-for-conversational-ivr` | `/calculators/conversational-ivr` |
| `/savings-calculator-for-virtual-agent` | `/calculators/virtual-agent` |
| `/savings-calculator-for-voice-biometrics` | `/calculators/voice-biometrics` |
| `/savings-calculators` | (liste sayfası — henüz yok) |

## Açık işler

- Template'teki `main-cta` component'i hâlâ Careers metnini taşıyor
  ("Want to work on AI technologies with talented?"). Calculator sayfalarına uygun bir
  CTA ile override edilmeli.
- `/savings-calculators` karşılığı bir liste sayfası sitede yok.
