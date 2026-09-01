# CRM Form Entegrasyonu — Site Tarafı Raporu

> Danışmandan gelen bilgiye göre CRM'e (Microsoft Dynamics) bağlanacak
> formların envanteri, alan tasarımı, Dynamics eşlemesi ve site tarafındaki
> client-side çözümün tamamı. Server-side endpoint (`/demos/api/crm/lead`)
> ayrı repoya çekilen Webflow Cloud app'te **yazıldı**; buradaki her şey o
> endpoint'in sözleşmesine göre kurgulanmıştır (bkz. `CRM-LEAD-API-SPEC.md`).

---

## 1. Form envanteri — 4 form tipi

Danışmanın listesinden çıkan tablo. `formType` değeri hem endpoint'e giden
JSON'daki alan hem de Dynamics'teki `ses_formtype` değeridir; danışman örneği
`frm-contact` biçimini kullandığı için hepsi `frm-` önekiyle adlandırıldı.

| # | Form | `formType` | Nerede |
|---|---|---|---|
| 1 | **Bize Ulaşın** | `frm-contact` | İletişim sayfası |
| 2 | **Demo İsteyin** | `frm-demo` | Demo talep sayfası / demo section'ları |
| 3 | **Newsletter Kayıt** | `frm-newsletter` | Site geneli (footer/blog CTA'ları, örn. `/newsletter-sestek-update-q3-23-blog` benzeri sayfalar) |
| 4 | **Opus Report Download** (lead magnet indirme) | `frm-opus-report` | Rapor indirme landing'i |

> Not: Danışman "Lead Magnet İndirme kastın bu alan mıdır?" diye sormuş —
> Opus Report'un genel bir lead-magnet şablonu olup olmadığı teyit edilmeli.
> Başka rapor/indirme formları eklenirse aynı alan setiyle yeni bir
> `formType` değeri (örn. `frm-<rapor-adı>`) tanımlamak yeterli; JS'te kod
> değişikliği gerekmez, endpoint'in whitelist'ine değerin eklenmesi gerekir.

### 1.1 Form bazında alanlar

`*` = zorunlu (danışman listesindeki yıldızlar). "input `name`" sütunu,
Webflow Designer'da input'lara verilecek **name attribute**'udur — client-side
JS eşlemeyi bu isimlerden yapar.

**1) Bize Ulaşın (`frm-contact`)**

| Alan | Zorunlu | input `name` |
|---|---|---|
| Ad | ✔ | `firstname` |
| Soyadı | ✔ | `lastname` |
| Şirket Adı | ✔ | `companyname` |
| Kurumsal E-posta | ✔ | `email` |
| Telefon Numarası | ✔ | `phone` |
| Mesajınız | ✔ | `message` |

**2) Demo İsteyin (`frm-demo`)** — alan seti Bize Ulaşın ile birebir aynı:
`firstname`, `lastname`, `companyname`, `email`, `phone`, `message` (hepsi zorunlu).
İki formu ayıran tek şey `data-crm-form` attribute'undaki tip değeridir.

**3) Newsletter Kayıt (`frm-newsletter`)** — tek alan:

| Alan | Zorunlu | input `name` |
|---|---|---|
| Email | ✔ | `email` |

**4) Opus Report Download (`frm-opus-report`)** — mesaj ve telefon yok:

| Alan | Zorunlu | input `name` |
|---|---|---|
| Ad | ✔ | `firstname` |
| Soyadı | ✔ | `lastname` |
| Şirket Adı | ✔ | `companyname` |
| Kurumsal E-posta | ✔ | `email` |

> Danışman örneğinde `jobtitle` (Ünvan) alanı da var ama hiçbir formun
> alan listesinde görünmüyor. JS eşlemesi `jobtitle` name'li bir input'u
> otomatik destekler — ileride bir forma "Ünvan" alanı eklenirse başka
> değişiklik gerekmez.

---

## 2. Formlar şu anda nasıl çalışıyor?

- Tüm formlar **native Webflow formu**: submit'i Webflow alır, kaydı Webflow
  form inbox'ına yazar, e-posta bildirimi ve success/error mesajlarını
  (`.w-form-done` / `.w-form-fail`) Webflow yönetir.
- CRM'e giden hiçbir şey yok; kayıtlar yalnızca Webflow'da birikiyor.
- Sitede formlara dokunan mevcut script'ler:
  - `js/components/demo-form.js` — "Try Live Demo" section'ı: KVKK
    checkbox'ını geo'ya göre gösterir, submit sonrası Lottie animasyonu
    oynatır. Formu **native bırakır**, submit'e karışmaz.
  - `js/components/sticky-utms.js` — landing URL'indeki UTM parametrelerini
    sessionStorage'da tutar (`Sestek.initStickyUtms`). CRM entegrasyonunda
    lead kaynağı bilgisi buradan okunacak.
- Yani mevcut davranış bozulmadan üstüne eklenecek: **Webflow submit'i aynen
  kalır**, CRM gönderimi ona paralel ikinci bir kanal olur.

---

## 3. Dynamics eşlemesi

Endpoint, gelen JSON'u danışmanın verdiği lead şemasına çevirip
`POST {CRM_BASE_URL}/api/data/v9.2/leads`'e yazar. Site JS'inin ürettiği
istek gövdesi → Dynamics alanı eşlemesi:

| Site JS'in gönderdiği (JSON) | Dynamics lead alanı | Kaynak |
|---|---|---|
| `formType` | `ses_formtype` | `data-crm-form` attribute'u |
| — | `subject` | Endpoint üretir: `"Web form lead — {formType}"` |
| `firstname` | `firstname` | input `name="firstname"` |
| `lastname` | `lastname` | input `name="lastname"` |
| `emailaddress1` | `emailaddress1` | input `name="email"` (trim + lowercase) |
| `mobilephone` | `mobilephone` | input `name="phone"` |
| `companyname` | `companyname` | input `name="companyname"` |
| `jobtitle` | `jobtitle` | input `name="jobtitle"` (şu an hiçbir formda yok, hazır) |
| `description` | `description` | input `name="message"`; endpoint altına sayfa URL'i + UTM'leri ekler |
| `pageUrl` | `description` içine satır olarak | `location.href` |
| `utm.*` | `description` içine satır satır | sessionStorage (sticky-utms) |
| `hp` | — (honeypot, CRM'e gitmez) | gizli input |

Boş/eksik alanlar JSON'a hiç konmaz; endpoint de boş string'i Dynamics'e
göndermez. Böylece newsletter gibi tek alanlı formlar sorunsuz çalışır.

### Form tipi → taşınan alanlar özeti

| `formType` | firstname | lastname | companyname | emailaddress1 | mobilephone | description |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| `frm-contact` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `frm-demo` | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| `frm-newsletter` | — | — | — | ✔ | — | — |
| `frm-opus-report` | ✔ | ✔ | ✔ | ✔ | — | — |

(`ses_formtype` ve `subject` her zaman; `description`'a sayfa URL'i + UTM
bağlamı her tipte eklenir, mesaj alanı olmasa bile.)

---

## 4. Client-side tasarım

### 4.1 Yaklaşım

- **Tek script, site geneli:** `js/components/crm-forms.js`. Diğer
  component'ler gibi CDN'den yüklenir, vanilla JS, bağımlılığı yok.
- **Opt-in:** Yalnızca `data-crm-form="<formType>"` attribute'u taşıyan
  formlar CRM'e gönderilir. Attribute'suz formlar (arama kutusu vb.) hiç
  dokunulmaz.
- **Paralel gönderim (fire-and-forget):** Webflow'un kendi submit'i aynen
  çalışır; script submit anında alanları toplayıp endpoint'e `fetch` atar ve
  sonucu **beklemez**. CRM'e ulaşılamazsa ziyaretçi hiçbir şey fark etmez —
  kayıt en kötü ihtimalle Webflow inbox'ında durur (yedek).
  Sekme kapanırken bile gitmesi için `keepalive: true` kullanılır.
- **Çift gönderim koruması:** Aynı form aynı sayfa görüntülemesinde bir kez
  gönderilir (Webflow success sonrası tekrar submit tetiklenirse yenisi
  atılmaz).
- **Honeypot:** Forma gizli bir `name="hp_field"` input'u eklenir; dolu
  gelirse JS istek atmaz (endpoint de ayrıca kontrol eder).
- **Validasyonu Webflow yapar:** Zorunlu alanlar Designer'da `required`
  işaretlenir; tarayıcı doğrulaması geçmeden submit event'i zaten ateşlenmez,
  JS ek doğrulama yapmaz (e-posta biçim kontrolü endpoint'te de var).

### 4.2 Designer'da yapılacaklar (form başına)

1. Form element'ine attribute: `data-crm-form="frm-contact"` (tipine göre).
2. Input `name`'lerini §1.1 tablosuna göre ayarla
   (`firstname`, `lastname`, `companyname`, `email`, `phone`, `message`).
3. Zorunlu alanları `required` işaretle.
4. Forma gizli honeypot input'u ekle:
   `<input type="text" name="hp_field" tabindex="-1" autocomplete="off">`
   ve CSS ile görünmez yap (embed ile eklenebilir; `display:none` yeterli).
5. Sayfada script yüklü olsun: `crm-forms.js` (CDN, `defer`).

### 4.3 `js/components/crm-forms.js` — tam kod

Proje konvansiyonunda (IIFE, `Sestek` namespace, attribute ile konfigürasyon):

```js
/*!
 * crm-forms.js v1.0.0
 * Site-wide CRM bridge. Webflow forms stay NATIVE (Webflow owns submit,
 * validation, notifications, success message); on submit this script also
 * fires the collected fields to our server-side lead endpoint, which talks
 * to Microsoft Dynamics. Fire-and-forget: a CRM failure never affects the
 * visitor's flow — the submission is still captured by Webflow.
 *
 * Opt-in per form:
 *   <form data-crm-form="frm-contact"> …
 * Known types: frm-contact, frm-demo, frm-newsletter, frm-opus-report.
 *
 * Field mapping (input name → payload key):
 *   firstname → firstname      lastname  → lastname
 *   companyname → companyname  email     → emailaddress1
 *   phone → mobilephone        jobtitle  → jobtitle
 *   message → description      hp_field  → hp (honeypot)
 *
 * Configuration (optional, on <body> or any ancestor):
 *   data-crm-endpoint="/demos/api/crm/lead"   override endpoint path
 *
 * UTM context: reads the session UTMs persisted by sticky-utms.js
 * (sessionStorage) and sends them under `utm` so the endpoint can append
 * them to the lead description.
 *
 * API:
 *   Sestek.initCrmForms()   — wire everything up (call once per page)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ENDPOINT_DEFAULT = "/demos/api/crm/lead";
  var UTM_STORAGE_KEY = "sestek_utms"; // sticky-utms.js'in yazdığı anahtar

  var FIELD_MAP = {
    firstname: "firstname",
    lastname: "lastname",
    companyname: "companyname",
    email: "emailaddress1",
    phone: "mobilephone",
    jobtitle: "jobtitle",
    message: "description",
  };

  function readUtms() {
    try {
      var raw = sessionStorage.getItem(UTM_STORAGE_KEY);
      var utms = raw ? JSON.parse(raw) : null;
      return utms && typeof utms === "object" ? utms : null;
    } catch (_) {
      return null;
    }
  }

  function buildPayload(form) {
    var payload = {
      formType: form.getAttribute("data-crm-form"),
      pageUrl: location.href,
      hp: "",
    };

    var fields = form.querySelectorAll("input, textarea, select");
    for (var i = 0; i < fields.length; i++) {
      var el = fields[i];
      var name = el.name;
      if (!name) continue;
      if (name === "hp_field") {
        payload.hp = el.value || "";
        continue;
      }
      var key = FIELD_MAP[name];
      if (!key) continue; // eşlenmeyen alanlar (checkbox'lar vb.) gitmez
      var value = String(el.value || "").trim();
      if (value) payload[key] = value;
    }

    var utms = readUtms();
    if (utms) payload.utm = utms;

    return payload;
  }

  function send(endpoint, payload) {
    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true, // sayfa yönlense bile istek tamamlanır
      }).catch(function () {
        /* fire-and-forget: CRM hatası ziyaretçiyi ilgilendirmez */
      });
    } catch (_) {
      /* fetch yoksa / CSP engellerse sessizce vazgeç — Webflow kaydı yedek */
    }
  }

  function initCrmForms() {
    var forms = document.querySelectorAll("form[data-crm-form]");
    if (!forms.length) return;

    var configHost = document.body.closest("[data-crm-endpoint]") ||
      document.querySelector("[data-crm-endpoint]");
    var endpoint = (configHost && configHost.getAttribute("data-crm-endpoint")) ||
      ENDPOINT_DEFAULT;

    forms.forEach(function (form) {
      var sent = false;
      form.addEventListener("submit", function () {
        // Bu event yalnızca tarayıcı validasyonu (required, type=email)
        // geçtikten sonra ateşlenir — Webflow native submit'iyle aynı an.
        if (sent) return;
        sent = true;
        send(endpoint, buildPayload(form));
      });
    });
  }

  var Sestek = global.Sestek || (global.Sestek = {});
  Sestek.initCrmForms = initCrmForms;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCrmForms);
  } else {
    initCrmForms();
  }
})(window);
```

> `UTM_STORAGE_KEY` değeri, `sticky-utms.js`'in sessionStorage'a yazdığı
> gerçek anahtarla eşitlenmeli (implementasyon sırasında dosyadan teyit
> edilecek; farklıysa tek sabit değişir).

### 4.4 İstek örnekleri

**`frm-contact`** (tüm alanlar dolu):

```json
{
  "formType": "frm-contact",
  "firstname": "Ali",
  "lastname": "Akarsu",
  "companyname": "Sestek",
  "emailaddress1": "ali@example.com",
  "mobilephone": "+905xxxxxxxxx",
  "description": "Lead açıklaması",
  "pageUrl": "https://www.sestek.com/contact",
  "utm": { "utm_source": "google", "utm_medium": "cpc" },
  "hp": ""
}
```

**`frm-newsletter`** (yalnızca e-posta):

```json
{
  "formType": "frm-newsletter",
  "emailaddress1": "ali@example.com",
  "pageUrl": "https://www.sestek.com/newsletter-sestek-update-q3-23-blog",
  "hp": ""
}
```

---

## 5. Açık noktalar / teyit gerektirenler

1. **Opus Report kapsamı** — danışmanın sorusu yanıtsız: `frm-opus-report`
   tek bir rapora mı özel, yoksa tüm lead-magnet indirmeleri için tek tip mi?
   Rapor bazında ayrım istenirse tip değeri raporu kodlar
   (`frm-opus-report`, `frm-x-report`…), altyapı aynı kalır.
2. **Newsletter → lead mi?** Şema newsletter'ı da lead olarak açıyor. CRM
   tarafında newsletter kayıtlarının lead havuzunu şişirmesi istenmiyorsa
   danışmandan ayrı bir entity/marketing list hedefi istenebilir; yalnızca
   endpoint'te o tipin hedefi değişir, site JS'i etkilenmez.
3. **`ses_formtype` değerleri** — `frm-contact` danışman örneğinden; diğer üç
   değer bizim önerimiz. CRM'de bu alan bir option set ise dört değerin
   Dynamics tarafında tanımlı olduğu teyit edilmeli.
4. **KVKK onayı** — `demo-form.js` TR ziyaretçilere KVKK checkbox'ı
   gösteriyor. Onay bilgisinin CRM'e taşınması gerekiyorsa (`description`'a
   satır olarak ya da özel alan) danışmanla netleştirilmeli.
5. **Ünvan (`jobtitle`)** — şemada var, hiçbir formda yok. Forma eklenecekse
   Designer'da `name="jobtitle"` input'u yeterli.

---

## 6. E-posta bildirimi (newsletter — opsiyonel)

Newsletter gönderimi **Dynamics'e başarıyla düştüğünde** belirlenen adrese
bildirim e-postası atılacak. Tamamen server-side bir özellik — site JS'inde
hiçbir değişiklik gerektirmez. Detaylı tasarım `CRM-LEAD-API-SPEC.md` §8'de:

- Alıcı adres env'den (`NOTIFY_EMAIL_TO`) — kod değişmeden panelden
  güncellenir; hangi form tiplerinde açık olduğu da env'den
  (`NOTIFY_FORM_TYPES=frm-newsletter`).
- Mail ancak lead oluştuktan sonra denenir; mail hatası lead akışını bozmaz.
- **Gönderen için karar gerekiyor:** (A) Microsoft Graph `sendMail` —
  mevcut Azure app'ine `Mail.Send` izni + bir kurumsal kutu (danışman/BT
  onayı gerekir, ek servis yok, önerilen) veya (B) Resend/SendGrid gibi
  bir servis — API key + domain doğrulaması (DNS kayıtları) gerekir.

## 7. Yapılacaklar özeti

- [x] Server-side endpoint (`/demos/api/crm/lead`) — **ayrı repoda yazıldı**
- [ ] Secret'ların Webflow Cloud env'ine girilmesi (danışmandan gelince)
- [ ] `js/components/crm-forms.js`'in bu repoya eklenmesi (kod §4.3'te hazır)
- [ ] Designer: 4 forma `data-crm-form` + input `name`'leri + honeypot
- [ ] `ses_formtype` değerlerinin ve açık noktaların (§5) danışmanla teyidi
- [ ] Uçtan uca test: her form tipi → Dynamics'te lead doğrulama
- [ ] Newsletter mail bildirimi: gönderen yöntemi kararı (Graph vs. servis),
      alıcı adresin `NOTIFY_EMAIL_TO`'ya girilmesi, app repoda implementasyon
