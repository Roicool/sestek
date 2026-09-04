# Sunucu Agent'ı — 3. Tur: Yeni Gelişmeler

> 2. turda S-11, S-12 ve S-13 bitti, teşekkürler. Bu dosya o günden beri site
> tarafında olan ve seni ilgilendiren gelişmeleri toplar; kendi başına ayakta
> durur. Repo yine `waelkhatibsestek/sestek-webflow-demo-app`.
>
> Sözleşmeler (public, doğrudan oku):
> - https://raw.githubusercontent.com/roicool/sestek/main/docs/outbound-demo-api.md
> - https://raw.githubusercontent.com/roicool/sestek/main/docs/CRM-LEAD-API-SPEC.md
>
> Yanıt sözleşmesini tek taraflı değiştirme; yeni bir duruma ihtiyaç olursa
> önce sor. Site reposuna dokunma.

---

## 1. Bilgi: outbound formunun sunucuya gönderdiği şey (değişmedi, teyit)

| Alan | Değer | Not |
|---|---|---|
| `phone` | TR için `05XXXXXXXXX`, diğer ülkeler E.164 (`+44…`) | İkisini de kabul ettiğini S-12'de yazdın. TR'yi de E.164'e geçirmek istiyoruz; **önce bize "hazır" de**, biz o zaman değiştiririz |
| `email` | kurumsal e-posta veya boş | S-13'te ele aldın; boş gelince reddetmediğini varsayıyoruz |
| `lang` | `"TR"` / `"EN"` | S-10, proje seçimi |
| `turnstileToken` | jeton | S-04 + S-11 |
| `hp` | boş | honeypot |

`00` biçimine dönüşümün **yalnız sunucuda** olduğunu notumuza yazdık;
istemci ikinci bir dönüşüm yapmıyor ve yapmayacak.

## 2. Yeni iş: S-14 · Ziyaretçinin ülkesini dönen küçük bir uç

**Öncelik: Düşük. Formlar bu uç olmadan da çalışır.**

Telefon alanı artık ülke kodu seçici taşıyor ve ziyaretçinin ülkesini
önceden seçmeye çalışıyor. Şu an bunu tarayıcının dil ayarından tahmin
ediyor, çünkü istemci IP'yi göremiyor. Dil ayarı konum değil: Almanya'da
tarayıcısını İngilizce kullanan biri yanlış ülke görür.

Doğru bilgi zaten sende. Cloudflare Workers her isteğe ülke bilgisini
ekliyor; ek servis veya ücretli GeoIP gerekmez.

**Yapılacak**

- `GET /demos/api/geo` → `200 {"country":"TR"}`. İki harfli ISO kodu,
  Cloudflare'ın istekle verdiği değer. Bilinmiyorsa `{"country":""}` dön,
  hata dönme.
- **IP'yi yanıta koyma, loglama.** Yalnız ülke kodu.
- Ziyaretçiye özel olduğu için paylaşımlı önbelleğe girmesin:
  `Cache-Control: private, max-age=600`.
- S-02'deki Content-Type/Origin kontrolleri bu uçta gerekmez (GET, gövde yok);
  Origin allowlist'ini uygulamak istersen zararsız.

**Kabul kriteri**

- `curl` ile iki harfli bir ülke kodu dönüyor.
- Yanıt gövdesinde veya loglarda IP geçmiyor.

Uç yayına girince haber ver; Designer'da `Geo endpoint` alanına
`/demos/api/geo` yazılacak. Alan boş kaldığı sürece istemci hiç ağ isteği
atmaz.

## 3. Bilgi: site tarafında ne oldu (senin kodunu etkilemiyor)

Ülke seçici canlıda üç ayrı sebeple kırıldı ve üçü de site tarafında
çözüldü: Lenis smooth scroll tekerleği yutuyordu; ülke adları sunucu ile
tarayıcının ICU verisi farklı olduğu için hydration'ı bozuyordu; ve Webflow
code component'lerinin **Shadow DOM içinde** çizildiği ortaya çıktı, belge
seviyesindeki tıklama dinleyicisi bu yüzden paneli kapatıyordu. Seçici artık
tarayıcının kendi `<select>`'i, bu sorunların hiçbirine maruz kalmıyor.

Bunu yazmamın sebebi: senin tarafında bir sorun yoktu, "istek gelmiyor"
diye bir bulgu görürsen sebebi buydu ve kapandı.

## 4. Hâlâ doğrulanmamış kabul kriteri (1. turdan)

**429 alınan bir pencerede yeni bir deploy alınıp aynı numara tekrar
denendiğinde hâlâ 429 dönmeli.** KV sayacının deploy'u atlattığını yalnız
bu gösterir ve hiç ölçülmedi. S-14 deploy'unda ölç ve raporla. 200 dönerse
sayaç kalıcı değil demektir, S-01/S-03 yeniden açılır.

## 5. Bizden sana sorular

- S-12 sonrası **TR numarasını da E.164 göndermeye geçelim mi?** Sen "evet"
  dersen istemci tek biçime iner, sözleşmedeki geçiş notu kalkar.
- Turnstile anahtarları Sestek'in Cloudflare hesabına devredilecek. O gün
  site key ve secret **aynı anda** değişecek; senin tarafında yalnız
  `TURNSTILE_SECRET` env'i güncellenip deploy alınacak. Tarih belli olunca
  haber vereceğiz, bir şey yapman gerekmiyor, sadece bil.

## Test ederken

- Test telefonu: **+90 531 407 28 45**. Başka numaraya gerçek arama gitmesin.
- CRM'e test kaydı düşürürken e-postayı `qatest+<konu>@…` biçiminde ver.
- Testten sonra hangi kayıtların kaldığını yaz.

## Rapor

Her madde için tek satır: yapıldı mı, kabul kriteri nasıl doğrulandı (ne
çalıştırdın, ne çıktı aldın), kalan varsa ne. Yapamadığını atla ve nedenini
yaz, sessizce kapsam daraltma.
