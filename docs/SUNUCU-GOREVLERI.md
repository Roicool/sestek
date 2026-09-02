# Sunucu Tarafı Görev Listesi

> Bu dosya, **`waelkhatibsestek/sestek-webflow-demo-app`** (Webflow Cloud app)
> reposunda yapılacak işlerin iş emridir. Site tarafı (`roicool/sestek`)
> hazırdır; burada listelenen hiçbir iş site reposunda yapılmaz.
>
> Her görevin **kabul kriteri** vardır. Bir görev, kriterin tamamı sağlanana
> kadar "bitti" sayılmaz. Sıra öncelik sırasıdır; S-01 ve S-02 canlıda para
> ve itibar riski taşır, önce onlar.
>
> Sözleşmeler:
> - CRM lead endpoint'i: [`docs/CRM-LEAD-API-SPEC.md`](./CRM-LEAD-API-SPEC.md)
> - Outbound call endpoint'i: [`docs/outbound-demo-api.md`](./outbound-demo-api.md)
>
> Bu iki dosya **istemcinin ne gönderdiğini ve ne beklediğini** tanımlar.
> Yanıt sözleşmesini (status kodu + `error` / `reason` alanı) değiştirme;
> istemci bu kodlara göre mesaj basar. Yeni bir duruma ihtiyaç olursa önce
> site tarafına haber ver.

---

## Ortak kurallar

Bunlar her göreve uygulanır, tek tek tekrar edilmez.

1. **Secret hiçbir yere yazılmaz.** Ne repoya, ne loga, ne hata gövdesine, ne
   de bu dosyaya. Her gizli değer Webflow Cloud environment variable'ı olur.
   Lokalde `.dev.vars` (gitignore'da).
2. **Ziyaretçi verisi loglanmaz.** İsim, telefon, e-posta hiçbir log satırına
   düşmez. Sayaç ve durum kodu logla, kişiyi loglama.
3. **Upstream hata gövdesi istemciye sızdırılmaz.** Knovvu veya Dynamics ne
   döndürürse dönsün, istemciye yalnız sözleşmedeki kod gider.
4. **Gerçek istemci IP'si yalnız `CF-Connecting-IP`.** `X-Forwarded-For` ve
   `X-Real-IP` istemci tarafından yazılabilir, rate limit anahtarı olarak
   kullanılırsa limit tek satırla atlanır.
5. **Modül seviyesi `Map` kalıcı sayaç değildir.** Workers isolate'ı her an
   değişir ve sayaç sıfırlanır. Güvenlik testinde CRM'e ardışık 10 isteğin
   10'u da geçti. Kalıcı sayaç: Workers KV, Durable Objects veya Workers
   Rate Limiting binding.
6. **Env yoksa 501.** Mevcut route'lardaki env-gate kalıbı korunur; gömülü
   varsayılan adres/kimlik eklenmez.
7. Her görev kendi commit'i olur, mesajı ne yaptığını ve nedenini yazar.

---

## S-01 · CRM lead endpoint'ine kalıcı rate limit

**Öncelik:** Yüksek · **Kaynak:** güvenlik testi bulgusu B-01

Şu anda `POST /demos/api/crm/lead` üzerinde **hiçbir hız sınırı yok**. Dış
ekibin testinde ardışık 10 isteğin 10'u da CRM'e düştü; CRM'de ~11-12 QATEST
kaydı kaldı. Bu, lead havuzunu çöple doldurmak için yeterli.

**Yapılacak**

- IP başına sınır (öneri: 10 istek / dakika, 60 istek / saat).
- E-posta adresi başına sınır (öneri: aynı adres 10 dakikada 1 lead).
- Sayaç **kalıcı depoda** (KV / DO / Rate Limiting binding), modül `Map`'inde
  değil.
- Aşımda `429 {"ok":false,"reason":"rate limited"}`.

**Kabul kriteri**

- Aynı IP'den arka arkaya 15 istek atıldığında ilk 10'u geçer, kalanı 429
  alır — **ve deploy'dan sonra tekrar denendiğinde de aynı sonuç çıkar**
  (isolate değişimi sayacı sıfırlamıyor).
- Farklı IP'lerden gelen istekler birbirini etkilemez.
- 429 alan istek CRM'e hiç ulaşmaz (Dynamics'te kayıt oluşmaz).

---

## S-02 · Outbound: Content-Type zorunluluğu + Origin allowlist

**Öncelik:** Yüksek · **Kaynak:** güvenlik testi bulgusu B-03

`POST /demos/api/demos/outbound-call` şu an `Content-Type: text/plain` ile de
kabul ediyor. Bu bir CORS "simple request"tir: tarayıcı **preflight
göndermez**. CORS yalnız yanıtın *okunmasını* engeller, isteğin gitmesini
değil — yani başka bir sitedeki gizli bir form, ziyaretçinin tarayıcısından
gerçek bir telefon araması tetikleyebilir. Yanıtı okuyamaması saldırganın
umurunda değil, çünkü istediği şey (arama) zaten olmuştur.

**Yapılacak**

- `Content-Type` `application/json` değilse `415` (veya `400`) dön, işleme
  alma. Bu tek başına preflight zorunluluğu getirir.
- `Origin` header'ı varsa allowlist dışındaysa `403`. Allowlist: canlı alan
  adı, `www` varyantı, staging alan adları ve lokal dev origin'leri.
  **Header hiç yoksa engelleme** — bazı tarayıcı/proxy kombinasyonları
  göndermez, meşru trafiği kesmeyelim.
- Aynı iki kontrol CRM lead endpoint'ine de uygulanır.

**Kabul kriteri**

- `curl -H "Content-Type: text/plain" -d '{…}'` → 415/400, telefon çalmaz.
- `curl -H "Content-Type: application/json" -H "Origin: https://evil.example"`
  → 403, telefon çalmaz.
- Sitenin kendi formundan normal gönderim çalışmaya devam eder (bu regresyon
  testi atlanmayacak).

---

## S-03 · Outbound numara/IP sayacını kalıcı depoya taşı

**Öncelik:** Yüksek

Numara başına 10 dakikalık ve IP başına saatlik limitler **var ve çalışıyor**
(testte `429 retryAfter: 457` alındı), ama modül seviyesi `Map`'te tutuluyor.
Isolate değişince sıfırlanıyor, yani limit "çoğunlukla" çalışıyor.

**Yapılacak**

- Numara ve IP sayaçlarını S-01'deki kalıcı depoya taşı, aynı yardımcıyı
  kullan (iki ayrı rate limit implementasyonu kalmasın).
- `retryAfter` gerçek kalan saniye olarak dönmeye devam etsin.

**Kabul kriteri**

- Aynı numaraya art arda iki istek: ikincisi 429 ve `retryAfter` dolu.
- Deploy'dan hemen sonra aynı numara tekrar denendiğinde hâlâ 429 (sayaç
  deploy'u atlatıyor).

---

## S-04 · Cloudflare Turnstile doğrulaması

**Öncelik:** Yüksek · **İstemci tarafı BİTTİ, sunucu bekliyor**

Site tarafı jetonu gövdede `turnstileToken` alanıyla **zaten gönderiyor**
(dört React form component'i ve `crm-forms.js` köprüsü). Sunucu şu an bu
alanı yok sayıyor, yani koruma fiilen kapalı.

Tam sözleşme: `docs/outbound-demo-api.md` §4 ve `docs/CRM-LEAD-API-SPEC.md`
§6. Örnek `verifyTurnstile` fonksiyonu orada hazır.

**Yapılacak**

- `TURNSTILE_SECRET` environment variable'ı ekle. Secret key ayrı ve güvenli
  bir kanaldan gelecek; **bu dosyaya, repoya veya Postman koleksiyonuna
  yazılmayacak.**
- Her iki endpoint'te doğrulama yap: honeypot kontrolünden **sonra**,
  upstream'e (Knovvu / Azure AD) dokunmadan **önce**.
- `TURNSTILE_SECRET` tanımlı DEĞİLSE alanı yok say ve normal çalış. Bu
  kasıtlıdır: site kodu anahtar girilmeden de sorunsuz çalışsın diye
  kademeli açılış tasarlandı.
- Tanımlıysa: jeton yoksa veya `siteverify` `success:false` dönerse
  `403 captcha_failed`, upstream'e hiç gitme.
- `remoteip` olarak yalnız `CF-Connecting-IP` gönder.

**Kabul kriteri**

- Secret tanımlı değilken jetonsuz istek eskisi gibi çalışır.
- Secret tanımlıyken jetonsuz `curl` → `403 captcha_failed`, telefon çalmaz /
  CRM'e kayıt düşmez.
- Secret tanımlıyken sitenin kendi formundan gönderim çalışır.
- Aynı jeton ikinci kez gönderildiğinde reddedilir (jetonlar tek kullanımlık).

**Uyarı:** Turnstile rate limit'in yerine geçmez. Jeton çözebilen bir bot
yine ardışık arama tetikleyebilir. S-01 ve S-03 bu görev bitse de yapılacak.

---

## S-05 · E-posta politikasının sunucuda uygulanması

**Öncelik:** Orta

İstemci tarafı hazır ama istemci kontrolü curl ile atlanır. Liste ve hata
kodları `docs/CRM-LEAD-API-SPEC.md` §2.1'de.

**Yapılacak**

- Ücretsiz tüketici sağlayıcıları (gmail, hotmail, yandex…) `frm-contact`,
  `frm-demo`, `frm-opus-report` tiplerinde reddedilir → `400 free_email`.
- **`frm-newsletter` muaftır** — orada ücretsiz sağlayıcı serbest. Huninin
  en üstü, gmail'i engellemek abone kaybettirir.
- Tek kullanımlık adresler (mailinator, yopmail…) **her tipte** reddedilir →
  `400 disposable_email`.
- Liste **deploy gerektirmeden güncellenebilmeli** (env veya KV). Yeni bir
  disposable domain için yayın beklemeyelim.

**Kabul kriteri**

- `frm-demo` + `@gmail.com` → 400 `free_email`, CRM'e yazılmaz.
- `frm-newsletter` + `@gmail.com` → 200, CRM'e yazılır.
- Her tip + `@mailinator.com` → 400 `disposable_email`.
- `foo.mailinator.com` gibi alt alan adları da yakalanır.

---

## S-06 · Günlük toplam arama tavanı + devre kesici

**Öncelik:** Orta

Numara ve IP limitleri **dağıtık** kötüye kullanımı durdurmaz: bin farklı IP
ve bin farklı numara, her biri limit içinde kalarak bin arama başlatır.
Faturayı ödeyen Sestek.

**Yapılacak**

- Günlük toplam arama sayısına tavan (başlangıç önerisi: 200/gün, sayı
  env'den ayarlanabilir olsun).
- Tavan aşılınca route `503` veya `429` döner ve Knovvu'ya hiç gitmez
  (devre kesici).
- Tavana yaklaşıldığında ve tavan devreye girdiğinde uyarı üret (S-07).

**Kabul kriteri**

- Sayaç kalıcı depoda ve gün dönümünde sıfırlanıyor.
- Tavan env'den değiştirilebiliyor, deploy gerekmiyor.
- Devre kesici açıkken hiçbir istek Knovvu'ya ulaşmıyor.

---

## S-07 · Saatlik arama sayacı + eşik alarmı

**Öncelik:** Orta

Anormalliği fatura geldiğinde değil, olurken görmek için.

**Yapılacak**

- Saatlik arama sayacı tut.
- Eşik aşılınca bildirim gönder (e-posta / Slack / webhook — mevcut altyapıya
  göre en kolayı).
- Bildirim metninde ziyaretçi verisi **olmayacak**: sayı, saat ve endpoint
  yeterli.

**Kabul kriteri**

- Eşik env'den ayarlanabiliyor.
- Test amaçlı düşük bir eşikle bildirimin gerçekten ulaştığı görüldü.

---

## S-08 · `x-opennext` header'ının kaldırılması

**Öncelik:** Bilgi · **Kaynak:** güvenlik testi bulgusu B-04

Yanıtlarda dönen `x-opennext` header'ı altyapı bilgisi sızdırıyor. Tek başına
zafiyet değil, ama saldırgana ücretsiz bilgi vermenin gereği yok.

**Kabul kriteri:** yanıt header'larında `x-opennext` görünmüyor.

---

## S-09 · CSV export'ta formül enjeksiyonu sanitizasyonu

**Öncelik:** Düşük · **Kaynak:** güvenlik testi bulgusu B-05

Lead verisi CSV'ye aktarılıp Excel'de açılırsa, `=`, `+`, `-`, `@` ile
başlayan bir hücre formül olarak çalışır. Forma bu karakterle başlayan bir
ad yazan biri, dosyayı açan çalışanın makinesinde komut çalıştırabilir.

**Yapılacak**

- Export sırasında bu dört karakterden biriyle başlayan hücrelerin başına
  tek tırnak koy (veya hücreyi metin olarak işaretle).
- Sanitizasyon **export anında** yapılır, kayıt anında değil — CRM'deki veri
  bozulmasın.

**Kabul kriteri:** `=1+1` ile başlayan bir ad içeren export Excel'de formül
olarak çalışmıyor.

---

## S-10 · Outbound: dile göre Knovvu proje seçimi

**Öncelik:** Yüksek · **Kaynak:** Knovvu ekibinin 02.09 tarihli cevabı

Türkçe sitede TR, İngilizce sitede EN demosu çalışacak. İstemci `lang` alanını
zaten `"TR"` veya `"EN"` olarak gönderiyor, sunucu şu an bunu yalnız
`Language` parametresine yazıyor. **Eksik olan: proje adı da değişiyor.**
EN için gelen örnekte proje adı `EN_` önekli, TR'dekinden farklı bir proje.

Tam sözleşme `docs/outbound-demo-api.md` §2 "Dil: proje adı `lang`'e göre
DEĞİŞİR" başlığında.

**Yapılacak**

- Tek `KNOVVU_PROJECT_NAME` env'ini ikiye ayır: `KNOVVU_PROJECT_NAME_TR` ve
  `KNOVVU_PROJECT_NAME_EN`. Gerçek değerler env'de, repoda değil.
- `lang === "EN"` ise EN projesi, aksi halde TR projesi kullanılır.
- Gövdedeki `projectName` ile `parameters` içindeki `ProjectName` **aynı
  değer** olmalı; ikisi de seçilen projeye göre dolar.
- Bilinmeyen bir `lang` gelirse TR'ye düş, 400 dönme.
- Env-gate kontrolüne iki değişken de eklenir (biri eksikse 501).

**Kabul kriteri**

- `lang: "EN"` ile gönderilen istekte Knovvu'ya giden gövdede hem
  `projectName` hem `ProjectName` EN projesi, `Language` ise `"EN"`.
- `lang: "TR"` ve `lang` hiç gönderilmemiş hâlde TR projesi kullanılır.
- Gerçek bir EN araması yapıldı ve karşı taraf İngilizce konuştu (test
  numarası aşağıda).

**Açık soru — Sestek'e sorulacak:** EN örneğinde telefon hâlâ TR mobil
formatında (`05444390406`). İngilizce siteye gelen ziyaretçinin numarası
büyük ihtimalle TR olmayacak. Knovvu yurt dışı numara çevirebiliyor mu, E.164
(`+44…`) kabul ediyor mu? Cevap gelene kadar sunucudaki `/^05\d{9}$/`
doğrulaması **olduğu gibi kalsın**; gevşetme.

---

## Sestek / danışman tarafında bekleyenler (sunucu agent'ının işi değil)

Bunlar bilgi olsun diye burada; kod işi değil, teyit veya erişim işi.

| İş | Neden |
|---|---|
| Knovvu client secret rotasyonu | Postman koleksiyonu içinde canlı secret dolaştı |
| Knovvu tarafında proje bazlı günlük/saatlik arama kotası | Bizden bağımsız son emniyet hattı |
| CRM'deki QATEST kayıtlarının temizlenmesi | Güvenlik testinden ~11-12 kayıt kaldı |
| Honeypot teyidi: `hp` dolu istekte telefon çalmadı mı, CRM'e kayıt düştü mü | Dışarıdan ölçülemiyor |
| Mass assignment teyidi: `ownerid`/`statuscode` alanları Dynamics'e geçti mi | Dışarıdan ölçülemiyor |
| `ses_formtype` option-set değerleri (4 tip) Dynamics'te tanımlı mı | Lead yazımı buna bağlı |
| Turnstile anahtarlarının Sestek Cloudflare hesabına devri | Geçici olarak ajans hesabında |

---

## Test ederken

- Test telefonu: **+90 531 407 28 45**. Başka numaraya gerçek arama gitmesin.
- Her başarılı outbound testi **gerçek bir telefon çaldırır**. Doğrulama için
  gereken en az sayıda istek at.
- CRM'e test kaydı düşürürken e-postayı `qatest+<konu>@…` biçiminde ver ki
  sonradan toplu temizlenebilsin.
- Testten sonra hangi kayıtların kaldığını yaz; temizlik Sestek tarafında
  yapılıyor.
