# CRM Lead API — Uygulama Tarafı Spesifikasyonu

> Bu doküman, sestek.com formlarını Microsoft Dynamics CRM'e bağlayacak
> **server-side endpoint'in** spesifikasyonudur. Endpoint, ayrı repoya çekilen
> **Webflow Cloud uygulamasında** (Next.js App Router, Cloudflare Workers)
> geliştirilecek. Site tarafındaki vanilla JS (bu repoda yaşayacak olan
> `js/components/crm-forms.js`) yalnızca bu endpoint ile konuşur — bu yüzden
> buradaki istek/yanıt sözleşmesine birebir uyulmalıdır.

---

## 1. Neden server-side?

CRM erişimi OAuth2 **client_credentials** akışıyla yapılıyor; token almak için
`client_secret` gerekiyor. Secret tarayıcıya inen hiçbir dosyada bulunamaz.
Ayrıca Azure AD token endpoint'i tarayıcı CORS isteklerini kabul etmez.
Dolayısıyla:

```
Ziyaretçi tarayıcısı (vanilla JS)
        │  POST /demos/api/crm/lead   (yalnızca form verisi, secret yok)
        ▼
Webflow Cloud app — bu endpoint          ← SECRET'LAR YALNIZCA BURADA (env)
        │  1) Azure AD'den token (cache'li)
        │  2) Dynamics'e lead POST
        ▼
Microsoft Dynamics ({CRM_BASE_URL})
```

Tarayıcı hiçbir zaman Azure AD veya Dynamics ile doğrudan konuşmaz.

---

## 2. Environment variable'lar

Değerler repoya **asla** girmez. Lokalde `.dev.vars` (gitignore'da), canlıda
Webflow Cloud environment ayarlarından tanımlanır. Client id/secret danışmandan
ayrı bir kanalla gelecek.

| Değişken | Örnek / açıklama |
|---|---|
| `CRM_TENANT_ID` | Azure AD directory (tenant) id — gerçek değer env'de |
| `CRM_CLIENT_ID` | Azure AD app registration client id |
| `CRM_CLIENT_SECRET` | Azure AD client secret |
| `CRM_BASE_URL` | Dynamics org adresi, `https://<org>.crm<n>.dynamics.com` |

> ⚠️ **Bu dosya public bir repoda duruyor.** Tenant id, org adresi, client id
> gibi gerçek değerler buraya YAZILMAZ; yalnızca Webflow Cloud environment
> değişkenlerinde ve ekip içi güvenli kanalda tutulur. Tablodaki her satır
> yalnızca değişkenin ne olduğunu tarif eder.

Türetilen sabitler (koda yazılabilir, env gerekmez):

- Token URL: `https://login.microsoftonline.com/{CRM_TENANT_ID}/oauth2/v2.0/token`
- Scope: `{CRM_BASE_URL}/.default`
- Lead endpoint: `{CRM_BASE_URL}/api/data/v9.2/leads`

**Env eksikse** endpoint `501` + `{"ok":false,"reason":"CRM is not configured"}`
döner (mevcut TTS proxy'sindeki desenle aynı). Böylece kod, secret'lar gelmeden
deploy edilebilir; site tarafı 501'i sessizce yutar.

---

## 3. Endpoint sözleşmesi (site JS'inin beklediği)

### `POST /demos/api/crm/lead`

- App `/demos` mount path'iyle siteye bağlı olduğu için canlı URL
  `https://www.sestek.com/demos/api/crm/lead` olur. Route dosyası:
  `src/app/api/crm/lead/route.ts` (basePath'i Webflow CLI enjekte eder,
  koda `/demos` yazılmaz).
- İstek gövdesi `application/json`.

```jsonc
{
  "formType": "frm-contact",          // ZORUNLU — bkz. §5 form tipleri
  "firstname": "Ali",
  "lastname": "Akarsu",
  "emailaddress1": "ali@example.com", // ZORUNLU (tüm form tiplerinde var)
  "mobilephone": "+905xxxxxxxxx",
  "companyname": "Sestek",
  "jobtitle": "Ünvan",
  "description": "Mesaj metni",
  "pageUrl": "https://www.sestek.com/contact",  // formun gönderildiği sayfa
  "utm": {                            // opsiyonel — sticky-utms'ten gelir
    "utm_source": "…", "utm_medium": "…", "utm_campaign": "…",
    "utm_term": "…", "utm_content": "…"
  },
  "hp": ""                            // honeypot — bkz. §6
}
```

Zorunlu alanlar: `formType` (bilinen bir tip olmalı) ve geçerli biçimli
`emailaddress1`. Diğer alanlar form tipine göre boş gelebilir; boş/eksik
alanlar Dynamics payload'ına **hiç konmaz** (boş string gönderilmez).

### Yanıtlar

| Durum | Gövde | Ne zaman |
|---|---|---|
| `200` | `{"ok":true}` | Lead oluştu |
| `400` | `{"ok":false,"reason":"…"}` | Eksik/geçersiz alan, bilinmeyen formType, JSON parse hatası |
| `403` | `{"ok":false}` | Origin kontrolü geçemedi (bkz. §6) |
| `429` | `{"ok":false,"reason":"rate limited"}` | Rate limit |
| `501` | `{"ok":false,"reason":"CRM is not configured"}` | Env tanımsız |
| `502` | `{"ok":false,"reason":"upstream <status>"}` | Azure AD veya Dynamics hatası |

- Honeypot dolu gelirse **`200` dön ama CRM'e yazma** (bota hata gösterilmez).
- Dynamics'ten dönen hata gövdesini **istemciye sızdırma**; yalnızca status
  kodunu logla/ilet. Ziyaretçi PII'ı da loglara yazılmamalı.
- App siteyle aynı domain'de mount olduğundan CORS header'ı gerekmez;
  yine de lokal geliştirme için `OPTIONS` isteğine 204 dönmek zararsızdır.

---

## 4. Azure AD token akışı

`POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` —
gövde `application/x-www-form-urlencoded`:

```
client_id=…&client_secret=…&grant_type=client_credentials&scope={CRM_BASE_URL}/.default
```

Yanıt: `{ "access_token": "…", "expires_in": 3599, … }`

**Token cache:** her form gönderiminde token istenmez. Module-scope bir
değişkende `{ token, expiresAt }` tutulur; `expiresAt`'e 5 dk güvenlik payı
bırakılır (`now + (expires_in - 300) * 1000`). Cloudflare Workers isolate'leri
kalıcı olmadığından cache "best effort"tır — isolate tazelendiğinde yeniden
token alınır, bu normaldir. Token isteği 4xx/5xx dönerse cache'e yazma, `502`
dön.

---

## 5. Dynamics'e lead yazma ve form tipleri

```
POST {CRM_BASE_URL}/api/data/v9.2/leads
Authorization: Bearer <token>
Content-Type: application/json
OData-MaxVersion: 4.0
OData-Version: 4.0
Accept: application/json
```

Başarı: `204 No Content` (header'da `OData-EntityId`). `2xx` dışı → `502`.
Token expire yarışına karşı: Dynamics `401` dönerse cache'i boşalt, **bir kez**
taze token alıp yeniden dene; ikinci `401` → `502`.

### Payload eşlemesi

| Dynamics alanı | Kaynak |
|---|---|
| `subject` | `"Web form lead — {formType}"` (örn. `Web form lead — frm-contact`) |
| `firstname` / `lastname` | istekten |
| `emailaddress1` | istekten (trim + lowercase) |
| `mobilephone` | istekten |
| `companyname` | istekten |
| `jobtitle` | istekten |
| `ses_formtype` | `formType` değeri aynen |
| `description` | mesaj + ek bağlam (aşağıda) |

`description` alanı, ziyaretçi mesajının altına satır satır bağlam eklenerek
kurulur (yalnızca mevcut olanlar):

```
<mesaj metni>

---
Page: https://www.sestek.com/contact
utm_source: google
utm_medium: cpc
utm_campaign: q3-brand
```

### Form tipleri ve alanları

`formType` şu dört değerden biri olmalı; başkası `400`:

| `formType` | Form | Beklenen alanlar |
|---|---|---|
| `frm-contact` | Bize Ulaşın | firstname, lastname, companyname, emailaddress1, mobilephone, description |
| `frm-demo` | Demo İsteyin | firstname, lastname, companyname, emailaddress1, mobilephone, description |
| `frm-newsletter` | Newsletter kayıt | yalnızca emailaddress1 |
| `frm-opus-report` | Opus Report / lead magnet indirme | firstname, lastname, companyname, emailaddress1 |

Newsletter'da isim yoktur; `subject` ve `ses_formtype` yine yazılır, boş alanlar
payload'a konmaz. (Danışman newsletter'ın da lead olarak açılmasını bu şemayla
öngörmüş; farklı bir entity istenirse yalnızca bu tipin hedefi değişir.)

---

## 6. Güvenlik ve kötüye kullanım

- **Honeypot:** İstekteki `hp` alanı boş olmalı. Doluysa sessizce `200` dön,
  CRM'e yazma. (Site JS'i forma gizli bir input koyup değerini `hp` olarak
  yollayacak.)
- **Origin kontrolü:** `Origin`/`Referer` header'ı varsa `sestek.com` /
  `www.sestek.com` (ve lokal dev origin'leri) dışındaysa `403`. Header hiç
  yoksa engelleme (bazı tarayıcı/proxy kombinasyonları göndermez).
- **Rate limit:** IP başına basit sınır (örn. 10 istek/dk). Workers'ta
  module-scope `Map` ile best-effort yeterli; Webflow Cloud KV/DO sunuyorsa
  o da kullanılabilir. Aşımda `429`.
- **Boyut sınırı:** description ≤ 4000, diğer string alanlar ≤ 250 karakter;
  fazlası kırpılır. Gövde ≥ 32 KB ise `400`.
- **Sanitizasyon:** Alanlar string'e zorlanır (`String(v).trim()`); obje/dizi
  gelen alan yok sayılır. OData injection riski yok (JSON body), yine de
  yalnızca whitelist'teki alanlar payload'a kopyalanır — istemciden gelen
  rastgele key'ler Dynamics'e geçirilmez.
- Secret'lar hiçbir log satırına, hata mesajına veya yanıta yazılmaz.

---

## 7. Referans implementasyon iskeleti

Cloud app'te aynı desenin çalışan örneği var: **TTS proxy route'u**
(`src/app/api/demos/tts/route.ts`) — env-gated 501 davranışı, upstream fetch,
hata sarmalama oradan alınabilir. Lead route'u için iskelet:

```ts
// src/app/api/crm/lead/route.ts
export const dynamic = "force-dynamic";

const FORM_TYPES = new Set([
  "frm-contact", "frm-demo", "frm-newsletter", "frm-opus-report",
]);

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(env: {
  tenantId: string; clientId: string; clientSecret: string; baseUrl: string;
}): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;
  const res = await fetch(
    `https://login.microsoftonline.com/${env.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        grant_type: "client_credentials",
        scope: `${env.baseUrl}/.default`,
      }),
    }
  );
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 300) * 1000,
  };
  return cachedToken.token;
}

export async function POST(req: Request) {
  const { CRM_TENANT_ID, CRM_CLIENT_ID, CRM_CLIENT_SECRET, CRM_BASE_URL } =
    process.env;
  if (!CRM_TENANT_ID || !CRM_CLIENT_ID || !CRM_CLIENT_SECRET || !CRM_BASE_URL) {
    return Response.json(
      { ok: false, reason: "CRM is not configured" },
      { status: 501 }
    );
  }
  // … origin kontrolü, rate limit, JSON parse, validasyon (§3, §6) …
  // … honeypot doluysa: return Response.json({ ok: true }) …
  // … §5'teki eşlemeyle payload kur, getToken() + leads POST, 401'de bir retry …
}
```

---

## 8. Test / doğrulama

1. **Env yokken:** `POST /api/crm/lead` → `501` `CRM is not configured`.
2. **Geçersiz istek:** `formType` yok / bilinmeyen / e-posta bozuk → `400`.
3. **Honeypot:** `hp:"x"` → `200`, upstream'e istek atılmadığı doğrulanır.
4. **Mutlu yol (secret'lar gelince):** curl ile `frm-newsletter` (yalnız
   email) ve `frm-contact` (tüm alanlar) gönder; Dynamics'te lead'in
   `ses_formtype` dahil doğru alanlarla oluştuğunu CRM arayüzünden doğrula.
5. **Token cache:** ardışık iki istekte Azure AD'ye tek token isteği gittiği
   loglardan doğrulanır.

---

## 9. Bu repoda kalan karşı parça (bilgi amaçlı)

Site tarafı `js/components/crm-forms.js` olarak burada geliştirilecek:
Webflow formları **native kalır** (Webflow submit + e-posta bildirimi + success
mesajı aynen çalışır); script yalnızca submit anında alanları toplayıp bu
endpoint'e paralel, fire-and-forget `fetch` atar. Form tipi Designer'da
`data-crm-form="frm-contact"` gibi tek attribute ile işaretlenir. Endpoint bu
sözleşmeyi değiştirirse iki taraf birlikte güncellenmelidir.
