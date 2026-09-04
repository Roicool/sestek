# Sunucu Agent'ı — 2. Tur İş Emri

> Birinci turda S-01…S-07 ve S-10 bitti, S-08 ve S-09 kapsam dışına çıktı.
> Bu dosya **kalan üç işi** anlatır. Kendi başına ayakta durur; birinci
> turdaki dosyaları tekrar okumana gerek yok, gerekli bağlam burada.
>
> Repo: `waelkhatibsestek/sestek-webflow-demo-app` (Webflow Cloud app,
> Next.js App Router, Cloudflare Workers).
>
> Sözleşmeler (site reposu public, doğrudan okuyabilirsin):
> - https://raw.githubusercontent.com/roicool/sestek/main/docs/outbound-demo-api.md
> - https://raw.githubusercontent.com/roicool/sestek/main/docs/CRM-LEAD-API-SPEC.md
>
> Site tarafı bu üç iş için **hazır ve yayında**. Site reposuna dokunma.
> Yanıt sözleşmesini (status kodu + `error` / `reason` alanı) tek taraflı
> değiştirme; istemci o kodlara göre ziyaretçiye mesaj basıyor. Yeni bir
> duruma ihtiyaç olursa uygulamadan önce sor.

---

## Ortak kurallar

Birinci turdakiyle aynı, kısaca hatırlatma:

1. Secret hiçbir yere yazılmaz. Her gizli değer Webflow Cloud env'i olur,
   lokalde `.dev.vars`.
2. Ziyaretçi verisi (isim, telefon, e-posta) loglanmaz.
3. Upstream hata gövdesi istemciye sızdırılmaz.
4. Gerçek istemci IP'si yalnız `CF-Connecting-IP`.
5. Env yoksa 501; gömülü varsayılan adres veya kimlik eklenmez.
6. Her görev kendi commit'i olur.

Öncelik sırası: **S-12 → S-13 → S-11**. S-12 şu an canlıda kırık bir akış
üretiyor, diğerleri üretmiyor.

---

## S-12 · Outbound: uluslararası numarayı kabul et (E.164)

**Öncelik: Yüksek. Şu an canlıda kırık.**

Sitedeki outbound formu artık ülke kodu seçici taşıyor ve ziyaretçi herhangi
bir ülkeyi seçebiliyor. Arama servisinin her ülkeyi arayabildiği teyit
edildi, yani kısıt bizim tarafımızda kaldı.

Sunucu şu an `/^05\d{9}$/` ile yalnız TR mobil numara kabul ediyor.
Yurt dışı numarası giren ziyaretçi `400 invalid_phone` alıyor.

Gövdedeki `phone` iki biçimde gelebilir:

| Ülke | Gelen biçim | Örnek |
|---|---|---|
| Türkiye | ulusal | `05314072845` |
| Diğer | E.164 | `+447911123456` |

TR için eski biçim bilerek korundu ki mevcut form kırılmasın. Sen E.164'ü
kabul etmeye başlayınca site tarafı TR'yi de E.164'e geçirecek ve bu ayrım
kalkacak; o yüzden **ikisini de kabul eden** bir doğrulama yaz.

**Yapılacak**

- `phone` hem `05XXXXXXXXX` hem `+…` biçiminde kabul edilsin.
- Doğrulama elle regex ile değil kütüphaneyle yapılsın; `libphonenumber-js`
  sunucuda da çalışıyor (site tarafı da onu kullanıyor, aynı veri).
- Arama servisine giden değer tek biçim olsun; hangisinin gönderileceğini
  servis dokümanına göre seç ve commit mesajında belirt.

**Bunu atlarsan limit delinir:** numara başına rate limit anahtarı
**normalize edilmiş** numara olmalı. Aksi halde `05314072845` ve
`+905314072845` iki ayrı numara sayılır, aynı kişi limiti ikiye katlar.

**Kabul kriteri**

- TR numarası her iki biçimde de kabul ediliyor ve tek arama başlatıyor.
- `+44…` gibi bir numara 400 almıyor, arama başlıyor.
- Aynı numara iki farklı biçimde art arda gönderildiğinde ikincisi 429
  alıyor.

---

## S-13 · Outbound: `email` alanını kabul et ve politikadan geçir

**Öncelik: Orta**

Outbound formu artık kurumsal e-posta da topluyor ve gövdede `email`
alanıyla gönderiyor. Sunucu bu alanı okumuyor, değer kayboluyor. Arama
servisine giden gövdede `endUser.email` hâlâ sabit boş string.

**Yapılacak**

- `email` gövdeden okunsun ve `endUser.email` alanında geçirilsin.
- Alan **boş gelebilir** — istemcide zorunlu, opsiyonel veya gizli olarak
  ayarlanabiliyor. Boşsa isteği REDDETME.
- Doluysa S-05'te kurduğun e-posta politikasının **aynısını** uygula, ikinci
  bir liste tutma:
  - geçersiz biçim → `400 {"ok":false,"error":"invalid_email"}`
  - tek kullanımlık → `400 {"ok":false,"error":"disposable_email"}`
  - ücretsiz sağlayıcı → `400 {"ok":false,"error":"free_email"}`

İstemci bu üç kodu kendi mesajına çeviriyor, kod adlarını değiştirme.

**Kabul kriteri**

- `email` boş gönderilen istek eskisi gibi çalışıyor.
- `@gmail.com` ile gönderilen istek `400 free_email` alıyor, telefon çalmıyor.
- Kurumsal bir adresle gönderilen istekte adres arama servisine ulaşıyor.

---

## S-11 · Turnstile jetonunun `hostname`'ini de doğrula

**Öncelik: Orta**

S-04'te `siteverify` yanıtının yalnız `success` alanına bakılıyor. Yanıt,
jetonun hangi alan adı için üretildiğini `hostname` alanında da döndürüyor;
bu kontrol edilmiyor.

Site key herkese açık bir değerdir ve öyle olması normaldir. Kötüye
kullanımı Cloudflare panelindeki allowed hostnames listesi engelliyor. Ama o
liste tek savunma hattı olarak kalıyor: bir dashboard ayarı, yanlışlıkla
genişletilebilir. Sunucu tarafında da bakarsak aynı hata iki kez yakalanır.

**Yapılacak**

- `siteverify` yanıtındaki `hostname`, S-02'de tuttuğun Origin
  allowlist'inin alan adlarından biri değilse `captcha_failed` dön.
- Aynı listeyi kullan, ikinci bir allowlist tanımlama.
- `hostname` yanıtta hiç yoksa isteği reddetme, yalnız `success` ile karar
  ver.

**Kabul kriteri**

- Sitenin kendi formundan gönderim çalışmaya devam ediyor.
- Allowlist dışında bir hostname taşıyan jeton reddediliyor.

---

## S-14 · Ziyaretçinin ülkesini dönen küçük bir uç

**Öncelik: Düşük. Formlar bu uç olmadan da çalışır.**

Telefon alanındaki ülke seçici, ziyaretçinin ülkesini önceden seçmeye
çalışıyor. Şu an tarayıcının dil ayarından tahmin ediyor, çünkü istemci IP'yi
göremiyor. Dil ayarı konum değildir: Almanya'daki bir ziyaretçi tarayıcısını
İngilizce kullanıyorsa yanlış ülke seçilir.

Doğru bilgi zaten sende: Cloudflare Workers her isteğe ülke bilgisini
ekliyor, ek bir servise veya ücretli bir GeoIP sağlayıcısına gerek yok.

**Yapılacak**

- `GET /demos/api/geo` → `200 {"country":"TR"}` dönen bir uç ekle.
- Değer Cloudflare'ın istekle verdiği ülke kodu olsun (iki harfli ISO).
  Bilinmiyorsa `{"country":""}` dön, hata dönme.
- **IP'yi yanıta koyma ve loglama.** Yalnız ülke kodu dönsün.
- Yanıt kısa süre önbelleklenebilir ama **ziyaretçiye özel** olduğu için
  paylaşımlı önbelleğe alınmamalı: `Cache-Control: private, max-age=600`.
- Bu uç kişisel veri döndürmediği için rate limit şart değil, ama mevcut IP
  limitini uygulamak istersen zararsız.

**Kabul kriteri**

- `curl` ile çağrıldığında iki harfli bir ülke kodu dönüyor.
- Yanıt gövdesinde veya loglarda IP geçmiyor.

Uç yayına girince site tarafına haber ver: Designer'da `Geo endpoint`
alanına `/demos/api/geo` yazılacak. Alan boş kaldığı sürece istemci hiç ağ
isteği atmaz, dil tahminiyle devam eder.

---

## Doğrulanmamış kalan bir kabul kriteri

Birinci turda S-01 ve S-03'ün ikinci yarısı canlıda test edilmedi:
**429 alınan bir pencerede yeni bir deploy alınıp aynı numara tekrar
denendiğinde hâlâ 429 dönmeli.** KV sayacının deploy'u atlattığını ancak bu
gösterir. Bu turdaki deploy'lardan birinde bunu ölç ve sonucu raporla; 200
dönüyorsa sayaç kalıcı değil demektir ve S-01/S-03 yeniden açılır.

---

## Test ederken

- Test telefonu: **+90 531 407 28 45**. Başka numaraya gerçek arama gitmesin.
- Her başarılı outbound testi gerçekten telefon çaldırır; doğrulama için
  gereken en az sayıda istek at.
- CRM'e test kaydı düşürürken e-postayı `qatest+<konu>@…` biçiminde ver.
- Testten sonra hangi kayıtların kaldığını yaz; temizlik Sestek tarafında.

## Rapor

Her görev için tek satır: S-xx, yapıldı mı, kabul kriteri **nasıl**
doğrulandı (ne çalıştırdın, ne çıktı aldın), kalan varsa ne. Yapamadığın bir
şey olursa atla ve nedenini yaz, sessizce kapsam daraltma.
