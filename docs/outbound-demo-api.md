# Outbound Call Demo — Server-Side Spec

> Web sitesindeki "sizi arayalım" demosu: ziyaretçi adını + telefonunu bırakır,
> Knovvu Outbound Manager onu gerçekten arar. **Client tarafı bu repoda hazır**
> (`js/components/outbound-demo.js`); bu doküman, cloud app repo'sunda
> yazılacak **server-side proxy route'unun** sözleşmesi ve gereksinimleridir.
> Uygulayan agent bu dokümanı tek başına yeterli kabul edebilir.

---

## Neden proxy?

Knovvu token endpoint'i `client_id` + `client_secret` ister. Bu secret'lar
tarayıcıya inerse HERKES Sestek santralinden istediği numaraya gerçek arama
başlatabilir. Bu yüzden:

- Secret'lar YALNIZ cloud app'in environment variable'larında yaşar.
- Tarayıcı yalnız bizim proxy route'umuzu görür.
- Rate limit + doğrulama + honeypot proxy'de zorunludur.

> ⚠️ **Secret rotasyonu:** Mevcut client secret'lar Postman collection'ı
> içinde elden ele dolaştı. Canlıya çıkmadan Knovvu tarafında **yeni secret
> ürettirin**; eskisini kullanmayın.

---

## Route

```
POST {app-base}/api/demos/outbound-call
Content-Type: application/json
```

Client default olarak `/demos/api/demos/outbound-call` yoluna atar (site
`/demos` mount'u + Next.js App Router `src/app/api/demos/outbound-call/route.ts`
kalıbı — mevcut `tts`/`transcribe` route'larıyla aynı düzen). Path farklı
olacaksa Webflow'daki form elementine `data-od-endpoint` verilerek değiştirilir.

### İstek gövdesi (client'ın gönderdiği)

```json
{
  "name": "Betül Uysal",
  "phone": "05444390406",
  "consent": true,
  "lang": "TR",
  "hp": "",
  "turnstileToken": "0.abc…"
}
```

- `phone` client'ta normalize edilir ama **sunucu yine doğrulamalı**:
  `/^05\d{9}$/` (TR mobil). Uymuyorsa 400.
- `name` trim'lenmiş, 2–100 karakter. Uymuyorsa 400.
- `consent !== true` → 400 (KVKK: kullanıcıyı arıyoruz, açık rıza şart).
- `hp` (honeypot) doluysa → bot. **200 `{ok:true}` dön ama Knovvu'ya istek
  ATMA** (bota başarısız olduğunu belli etme).
- `turnstileToken` Cloudflare Turnstile jetonu. `TURNSTILE_SECRET` env'i
  TANIMLIYSA doğrulama **zorunludur**: jeton yoksa veya siteverify başarısızsa
  403 `captcha_failed` dön, Knovvu'ya hiç dokunma. Env tanımlı DEĞİLSE alan
  yok sayılır — bu, anahtar girilene kadar sitenin çalışmaya devam etmesini
  sağlayan kademeli açılıştır. Jetonlar tek kullanımlıktır, tekrar kabul etme.

### Yanıt sözleşmesi (client buna göre mesaj basar — değiştirme)

| Status | Gövde | Ne zaman |
|---|---|---|
| 200 | `{"ok":true}` | Arama isteği Knovvu'ya iletildi (veya honeypot) |
| 400 | `{"ok":false,"error":"invalid_name"}` | Ad geçersiz |
| 400 | `{"ok":false,"error":"invalid_phone"}` | Telefon geçersiz |
| 400 | `{"ok":false,"error":"consent_required"}` | Rıza yok |
| 403 | `{"ok":false,"error":"captcha_failed"}` | Turnstile jetonu yok / doğrulanamadı |
| 403 | `{"ok":false}` | `Origin` allowlist dışında |
| 415 | `{"ok":false,"error":"unsupported_content_type"}` | `Content-Type` `application/json` değil |
| 429 | `{"ok":false,"error":"rate_limited","retryAfter":600}` | Limit aşıldı |
| 501 | `{"ok":false,"error":"not_configured"}` | Env değişkenleri eksik (mevcut route'lardaki env-gate kalıbı) |
| 502 | `{"ok":false,"error":"upstream"}` | Knovvu hata döndü |

Knovvu'nun ham hata gövdesini istemciye SIZDIRMA — logla, `upstream` dön.

---

## Environment variables (Webflow Cloud dashboard → Environment variables)

| Değişken | Değer / Not |
|---|---|
| `KNOVVU_CLIENT_ID` | Knovvu outbound manager client id — gerçek değer env'de |
| `KNOVVU_CLIENT_SECRET` | (rotasyon SONRASI yeni secret) |
| `KNOVVU_IDENTITY_URL` | Knovvu IdentityServer token adresi (bölgeye göre) |
| `KNOVVU_OUTBOUND_URL` | Outbound Manager call-request adresi (bölgeye göre) |
| `KNOVVU_PROJECT_NAME_TR` | Türkçe demo projesinin Knovvu'daki adı — gerçek değer env'de |
| `KNOVVU_PROJECT_NAME_EN` | İngilizce demo projesinin adı (TR'dekinden farklı, `EN_` önekli) |
| `KNOVVU_SCOPE` | Opsiyonel — IdentityServer scope isterse |
| `TURNSTILE_SECRET` | Cloudflare Turnstile SECRET key. Tanımlıysa jeton doğrulaması zorunlu olur; tanımlı değilse alan yok sayılır |

> ⚠️ **Bu dosya public bir repoda duruyor.** Client id, proje adı ve servis
> adresleri dahil hiçbir gerçek değer buraya yazılmaz; hepsi Webflow Cloud
> environment değişkenlerinde tutulur ve ekip içi güvenli kanalda paylaşılır.

Env değişikliği yeni deploy ile aktifleşir ("Deploy latest commit").

---

## Knovvu akışı (proxy'nin yapacakları)

### 1. Token — `POST {KNOVVU_IDENTITY_URL}`

`Content-Type: application/x-www-form-urlencoded`:

```
grant_type=client_credentials
client_id={KNOVVU_CLIENT_ID}
client_secret={KNOVVU_CLIENT_SECRET}
scope={KNOVVU_SCOPE}        ← yalnız env tanımlıysa ekle
```

Yanıt: `{ access_token, expires_in, token_type }`.

- **Cache'le** (module-level `{token, exp}`): `exp = now + (expires_in - 60)sn`.
  Süresi geçmediyse yeniden isteme.
- Call-request **401** dönerse cache'i boşalt, token'ı bir kez yenile, isteği
  bir kez tekrarla; yine olmazsa 502.

### 2. Call request — `POST {KNOVVU_OUTBOUND_URL}`

Header: `Authorization: Bearer {access_token}`, `Content-Type: application/json`

```json
{
  "projectName": "{proje adı — dile göre seçilir, aşağıya bak}",
  "callRequests": [
    {
      "callRequestId": "{crypto.randomUUID()}",
      "channelId": "ivr-external",
      "endUser": { "name": "{name}", "phone": "{phone}", "email": "" },
      "parameters": [
        { "Name": "CustomerName", "Value": "{name}" },
        { "Name": "ProjectName", "Value": "{aynı proje adı}" },
        { "Name": "Language", "Value": "{lang — 'TR' veya 'EN'}" }
      ],
      "locale": ""
    }
  ]
}
```

#### Dil: proje adı `lang`'e göre DEĞİŞİR

Knovvu ekibinin 02.09 tarihli cevabı: Türkçe sitede TR, İngilizce sitede EN
gönderilecek ve sistem ona göre ilgili demoyu çalıştıracak. Ama değişen
yalnız `Language` parametresi değil — **`projectName` de değişiyor.** EN için
gelen örnekte proje adının başına `EN_` öneki geliyor.

Bu yüzden tek bir `KNOVVU_PROJECT_NAME` yetmez, iki ayrı env değişkeni gerekir:

| `lang` | Kullanılacak env | `Language` parametresi |
|---|---|---|
| `TR` (varsayılan) | `KNOVVU_PROJECT_NAME_TR` | `TR` |
| `EN` | `KNOVVU_PROJECT_NAME_EN` | `EN` |

- `projectName` ve `parameters` içindeki `ProjectName` **aynı değer** olmalı.
- Bilinmeyen bir `lang` gelirse TR'ye düş, 400 dönme.
- Proje adlarının gerçek değerleri env'de durur; bu dosya public repoda,
  buraya yazılmaz.

Dikkat:

- `callRequestId` **her istekte yeni UUID** — sabit değer duplicate sayılır.
- Postman örneğindeki gövdede `// unique value` YORUMU vardı; JSON'a yorum
  koyma, aynen gönderilirse 400 alınır.
- 2xx → istemciye `{ok:true}`. Diğer her şey → logla + 502 `upstream`.

### 3. Rate limit (zorunlu — bu route gerçek telefon araması başlatır)

Minimum, module-level `Map` ile (Workers isolate'ında best-effort — demo için
yeterli; kalıcı istersen Cloudflare KV):

- **Numara başına:** aynı `phone` 10 dakikada en fazla 1 istek → 429,
  `retryAfter` kalan saniye.
- **IP başına:** saatte en fazla 5 istek (`CF-Connecting-IP` header'ı) → 429.
- Map'i her istekte süresi geçen kayıtlardan arındır (bellek büyümesin).

### 4. Cloudflare Turnstile (istemci hazır — sunucu doğrulaması bekleniyor)

İstemci jetonu gövdede `turnstileToken` olarak gönderir. Rate limit'ten ÖNCE,
Knovvu'ya dokunmadan doğrula:

```ts
async function verifyTurnstile(token: string, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;          // anahtar girilmemiş → kontrol kapalı
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);  // CF-Connecting-IP — Cloudflare koyar
  const r = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body }
  );
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  return j.success === true;
}
```

Kurallar:

- Başarısızsa 403 `{"ok":false,"error":"captcha_failed"}` — istemci bu kodu
  kendi mesajına çevirir, widget'ı reset eder.
- `remoteip` olarak YALNIZ `CF-Connecting-IP` kullan. `X-Forwarded-For` ve
  `X-Real-IP` istemci tarafından yazılabilir, güvenilmez.
- Jetonlar TEK KULLANIMLIK. Aynı jeton ikinci kez gelirse siteverify zaten
  reddeder; ayrıca kendi tarafında tekrar kullanımı loglamak faydalı.
- Turnstile rate limit'in YERİNE GEÇMEZ. Jeton çözen bir bot yine ardışık
  arama tetikleyebilir; numara/IP limitleri kalıcı depoda ayrıca durmalı.
- Site key gizli değildir (HTML'de görünür), secret key yalnız bu env'de
  durur.

  Site tarafında site key TEK yerden okunur — Webflow Project Settings →
  Custom Code → **Head**'e konan tek satır:

  ```html
  <script>window.SESTEK_TURNSTILE_SITE_KEY="0x4AAA…";</script>
  ```

  Component prop'ları ve `data-crm-turnstile` / `data-od-turnstile`
  attribute'ları bunu ezebilir ama normalde boş bırakılır. Turnstile'ın
  **allowed hostnames** listesi env'den beslenmez, Cloudflare panelindeki
  widget ayarıdır; canlı ve staging alan adlarının hepsi oraya eklenmelidir. Anahtarlar geçici olarak ajans Cloudflare hesabında; Sestek hesabına
  devirde site key ve secret key AYNI ANDA değişmelidir.

---

## Referans implementasyon (Next.js App Router, mevcut route kalıbıyla)

```ts
// src/app/api/demos/outbound-call/route.ts
export const dynamic = "force-dynamic";

let tokenCache: { token: string; exp: number } | null = null;
const phoneHits = new Map<string, number>(); // phone -> son istek (ms)
const ipHits = new Map<string, number[]>();  // ip -> istek zamanları (ms)

const PHONE_COOLDOWN = 10 * 60 * 1000;
const IP_WINDOW = 60 * 60 * 1000;
const IP_MAX = 5;

async function getToken(force = false): Promise<string | null> {
  if (!force && tokenCache && Date.now() < tokenCache.exp) return tokenCache.token;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.KNOVVU_CLIENT_ID!,
    client_secret: process.env.KNOVVU_CLIENT_SECRET!,
  });
  if (process.env.KNOVVU_SCOPE) body.set("scope", process.env.KNOVVU_SCOPE);
  const res = await fetch(
    process.env.KNOVVU_IDENTITY_URL!,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
  );
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!j.access_token) return null;
  tokenCache = { token: j.access_token, exp: Date.now() + ((j.expires_in ?? 300) - 60) * 1000 };
  return tokenCache.token;
}

export async function POST(req: Request) {
  // Gömülü varsayılan YOK: her adres/ad env'den gelir, eksikse 501.
  if (!process.env.KNOVVU_CLIENT_ID || !process.env.KNOVVU_CLIENT_SECRET ||
      !process.env.KNOVVU_IDENTITY_URL || !process.env.KNOVVU_OUTBOUND_URL ||
      !process.env.KNOVVU_PROJECT_NAME_TR || !process.env.KNOVVU_PROJECT_NAME_EN) {
    return Response.json({ ok: false, error: "not_configured" }, { status: 501 });
  }

  const { name, phone, consent, lang, hp, turnstileToken } =
    (await req.json().catch(() => ({}))) as {
      name?: string; phone?: string; consent?: boolean; lang?: string;
      hp?: string; turnstileToken?: string;
    };

  if (hp) return Response.json({ ok: true }); // honeypot: sessiz başarı

  const ip = req.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(turnstileToken ?? "", ip))) {
    return Response.json({ ok: false, error: "captcha_failed" }, { status: 403 });
  }

  const cleanName = (name ?? "").trim();
  if (cleanName.length < 2 || cleanName.length > 100) {
    return Response.json({ ok: false, error: "invalid_name" }, { status: 400 });
  }
  if (!/^05\d{9}$/.test(phone ?? "")) {
    return Response.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }
  if (consent !== true) {
    return Response.json({ ok: false, error: "consent_required" }, { status: 400 });
  }

  // rate limit
  const now = Date.now();
  const last = phoneHits.get(phone!);
  if (last && now - last < PHONE_COOLDOWN) {
    return Response.json(
      { ok: false, error: "rate_limited", retryAfter: Math.ceil((PHONE_COOLDOWN - (now - last)) / 1000) },
      { status: 429 }
    );
  }
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW);
  if (hits.length >= IP_MAX) {
    return Response.json({ ok: false, error: "rate_limited", retryAfter: 3600 }, { status: 429 });
  }

  // Dil projeyi seçer: EN ayrı bir Knovvu projesi, TR varsayılan.
  const isEN = (lang ?? "TR").toUpperCase() === "EN";
  const project = isEN
    ? process.env.KNOVVU_PROJECT_NAME_EN!
    : process.env.KNOVVU_PROJECT_NAME_TR!;
  const payload = {
    projectName: project,
    callRequests: [{
      callRequestId: crypto.randomUUID(),
      channelId: "ivr-external",
      endUser: { name: cleanName, phone, email: "" },
      parameters: [
        { Name: "CustomerName", Value: cleanName },
        { Name: "ProjectName", Value: project },
        { Name: "Language", Value: isEN ? "EN" : "TR" },
      ],
      locale: "",
    }],
  };

  const url = process.env.KNOVVU_OUTBOUND_URL!;

  async function send(token: string) {
    return fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  let token = await getToken();
  if (!token) return Response.json({ ok: false, error: "upstream" }, { status: 502 });
  let upstream = await send(token);
  if (upstream.status === 401) {          // token bayat → bir kez yenile
    token = await getToken(true);
    if (token) upstream = await send(token);
  }
  if (!upstream.ok) {
    console.error("[outbound-call] upstream", upstream.status, await upstream.text().catch(() => ""));
    return Response.json({ ok: false, error: "upstream" }, { status: 502 });
  }

  phoneHits.set(phone!, now);
  ipHits.set(ip, [...hits, now]);
  return Response.json({ ok: true });
}
```

---

## Knovvu/backend ekibine açık sorular

1. Call-request'in **başarı yanıtının şeması** ne? (Şu an her 2xx'i başarı
   sayıyoruz.)
2. Telefon formatı: `05XXXXXXXXX` mi, E.164 (`+905XXXXXXXXX`) mi? Yurt dışı
   numara destekleniyor mu?
3. Token endpoint'i `scope` istiyor mu?
4. `locale` alanının beklenen değerleri ve `Language` parametresiyle ilişkisi?
5. Knovvu tarafında duplicate/rate koruması var mı, yoksa tamamı bizde mi?

---

## Client tarafı (bu repoda hazır — bilgi amaçlı)

- `js/components/outbound-demo.js` → `Sestek.initOutboundDemo()`
- Form: `[data-outbound-demo]` + `[data-od-name]` / `[data-od-phone]` /
  `[data-od-consent]` / `[data-od-hp]` / `[data-od-submit]` /
  `[data-od-success]` / `[data-od-error]`
- Endpoint override: `data-od-endpoint`; arama dili: `data-od-lang`
- Client'ta da doğrulama + 60 sn cooldown var ama **güvenlik sunucununki**.
