# QA agent prompt — CRM formları + Outbound Call Demo (canlı site)

> Aşağıdaki bloğu olduğu gibi bir tarayıcı-kullanabilen ajana (Claude in Chrome,
> Playwright MCP, Browser Use vb.) ver. Ajanın ağ isteklerini görebilmesi
> (DevTools/Network) ve `curl` ya da `fetch` çalıştırabilmesi gerekir.

---

```
Sen bir QA mühendisisin. Görevin: SESTEK canlı web sitesindeki tüm lead
formlarını ve "Outbound Call Demo" bileşenini uçtan uca test edip tek bir
rapor çıkarmak. Hiçbir şeyi tahmin etme; her sonucu gerçekten gözlemle
(ekran, Network paneli, yanıt gövdesi). Test edemediğin bir şey varsa
"TEST EDİLEMEDİ + sebep" yaz, "geçti" yazma.

## Ortam
- Site: https://www.sestek.com  (staging'de çalışıyorsan: https://rc-sestek.webflow.io — hangisini kullandığını rapora yaz)
- Diller: EN (kök) ve TR (/tr/...). Her formu İKİ dilde de dene.
- API tabanı: {site}/demos/api/...  (Webflow Cloud app, mount /demos)
- Tarayıcı: masaüstü Chrome. Ek olarak her formu bir kez 390px mobil görünümde doldur (yalnız görsel + submit; API testlerini tekrarlama).

## Test verisi (HER submit'te aynen bunlar)
- First name: QATEST
- Last name: Semih Bayindir
- Full name alanı varsa: QATEST Semih Bayindir
- Company: Roicool QA
- Email: semih.bayindir@roicool.com
- Phone: +90 531 407 29 45  (telefon alanı ülke seçiciliyse TR / +90 seç, yerel kısmı 531 407 29 45 yaz)
- Message / description varsa: "This is a QA test for the live website — please ignore. Roicool QA, {tarih saat, ISO}"
- Newsletter için yalnız e-posta.
Rıza/KVKK kutusu varsa işaretle. Başka hiçbir gerçek kişi verisi kullanma.

## Test edilecek formlar (hepsi React code component, shadow DOM içinde — elemanları shadow root'a girerek bul)
1. Newsletter Form — footer'da, her sayfada. Endpoint POST /demos/api/crm/lead, formType "frm-newsletter". Ana sayfa (EN) ve /tr ana sayfa (TR) footer'ından gönder.
2. Demo Request Form — /request-a-demo ve /tr/demo-isteyin. Endpoint POST /demos/api/crm/lead, formType "frm-demo".
3. Contact formu varsa (/contact ya da /tr/iletisim) — formType "frm-contact". Sayfa yoksa "yok" yaz.
4. Report Download Form — /opus-research-2025-report ve /tr/opus-research-2025-raporu. Endpoint POST /demos/api/crm/lead, formType "frm-opus-report". Başarı sonrası rapor linki/indirme geliyor mu, kontrol et.
5. Outbound Call Demo — ana sayfa "Let us call you / Seni arayalım" bölümü. Endpoint POST /demos/api/demos/outbound-call. Başarı = telefon gerçekten çalar; test telefonu +90 531 407 29 45 elde tutan kişi teyit edecek. Aramanın geldiği saati rapora yaz.

## Her form için yapılacaklar (sırayla)
A. Görsel/işlevsel
   - Form ilk yüklemede kaymadan (CLS) geliyor mu; alanlar, placeholder'lar, buton metni doğru dilde mi.
   - Turnstile: widget görünür mü, görünmez mi (varsayılan Invisible olmalı)? Shadow root içinde .cf-turnstile ya da challenges.cloudflare.com iframe'i var mı? Bir "Turnstile hatası" mesajı görünüyor mu?
   - Zorunlu alan boş bırakıp submit: istemci hatası çıkıyor mu, hangi metinle (EN/TR)? Sunucuya istek gitmemeli.
   - Geçersiz e-posta ("abc@") ve geçersiz telefon ("123") ile: istemci doğrulaması ve hata metinleri.
B. Mutlu yol (test verisiyle gerçek submit)
   - Network'te isteği yakala: URL, method, Content-Type, gönderilen JSON (turnstileToken alanı dolu mu, formType doğru mu, telefon E.164 formatında mı — +905314072945).
   - Yanıt: HTTP status + gövde (ok:true bekleniyor). Süre (ms).
   - Ekranda başarı durumu: mesaj, dil, formun yüksekliği değişti mi (kayma), buton devre dışı kaldı mı.
   - Aynı formu 10 sn içinde ikinci kez gönder: istemci cooldown mesajı ya da sunucu 429 — hangisi olduğunu yaz.
C. Politika testleri (yalnız ilgili formlarda)
   - Demo / Contact / Report formuna gmail.com adresiyle submit → beklenen 400 {"ok":false,"error":"free_email"} ve ekranda "kurumsal e-posta" uyarısı. Newsletter'da gmail KABUL edilmeli (200).
   - Tek kullanımlık adres (örn. test@mailinator.com) → 400 disposable_email.
D. Turnstile sunucu doğrulaması (curl/fetch ile, tarayıcı dışından)
   Aynı JSON'u turnstileToken OLMADAN gönder:
     curl -i -X POST {site}/demos/api/crm/lead -H "Content-Type: application/json" -H "Origin: https://www.sestek.com" -d '{"formType":"frm-newsletter","emailaddress1":"semih.bayindir@roicool.com"}'
   Beklenen: 403 {"ok":false,"reason":"captcha_failed"}. 200 dönerse KRİTİK BULGU (Turnstile sunucuda kapalı).
   Aynısını Origin header'ı olmadan ve Origin: https://evil.example ile gönder → 403 bekleniyor.
   Content-Type: text/plain ile gönder → 415 bekleniyor.
   formType "frm-xyz" ile → 400.
E. Outbound Call Demo'ya özel
   - Rıza kutusu işaretsiz submit → 400 consent_required (ya da istemci engeli).
   - Geçersiz numara → 400 invalid_phone.
   - Mutlu yol → 200 {"ok":true}; ekranda "Aranıyor / Calling" durumu, orb animasyonu; telefon çaldı mı (saat, kaç saniye sonra, aramada Türkçe mi İngilizce mi konuştu — EN sayfadan EN, /tr'den TR bekleniyor).
   - Aynı numarayla 10 dk içinde tekrar → 429 rate_limited, retryAfter değeri; ekrandaki mesaj.
   - curl ile turnstileToken'sız → 403 captcha_failed.
F. Cloudflare Turnstile durumu
   - Network'te challenges.cloudflare.com/turnstile/v0/api.js yükleniyor mu, ne zaman (sayfa açılışında mı, forma yaklaşınca mı)?
   - Konsolda "[Sestek Turnstile]" önekli uyarı/hata var mı (anahtar/hostname hatası buradan görünür). Varsa aynen kopyala.

## CRM doğrulaması (erişimin varsa)
Dynamics 365'te "Web form lead — {formType}" konulu lead'ler oluştu mu: ad "QATEST Semih Bayindir", ses_formtype alanı doğru mu, telefon/şirket/mesaj alanları eşleşiyor mu. Erişimin yoksa "CRM tarafı doğrulanmadı" yaz, lead ID'leri Roicool'a sor.

## Rapor formatı (Markdown, Türkçe)
1. Özet: kaç test, kaç geçti/kaldı, KRİTİK bulgular ilk sırada.
2. Tablo — her satır bir test:
   | # | Sayfa (URL, dil) | Form | Senaryo | Gönderilen (kısa) | HTTP | Yanıt gövdesi | Ekran mesajı | Süre | Sonuç (GEÇTİ / KALDI / TEST EDİLEMEDİ) | Not |
3. Turnstile bölümü: her formda widget modu, token üretildi mi, sunucu reddi çalışıyor mu.
4. Rate limit / cooldown gözlemleri.
5. Outbound: arama geldi mi, saat, dil, gecikme.
6. Görsel bulgular (ekran görüntüsü dosya adlarıyla): mobil 390px ve masaüstü, EN ve TR.
7. Konsol hataları (tam metin).
8. Öneriler (varsa), ciddiyet sırasıyla.

Kurallar: gerçek müşteri verisi girme; her submit'te mesaj alanına QA notunu koy ki CRM'de ayıklanabilsin; bir test kalınca bir kez tekrar dene ve iki sonucu da yaz; hiçbir bulguyu yumuşatma.
```
