# Sunucu Agent'ı için Devir Dosyası

> Bu dosya, sunucu reposunda (`waelkhatibsestek/sestek-webflow-demo-app`)
> çalışacak agent'a verilecek metinleri içerir. Kopyala-yapıştır için
> hazırlandı: önce **ana prompt**, sonra istersen görev başına ayrı prompt.
>
> İş emri: [`SUNUCU-GOREVLERI.md`](./SUNUCU-GOREVLERI.md) — her görevin
> gerekçesi ve kabul kriteri orada, burada tekrar edilmiyor.

---

## 1. Durum: ne bitti, ne bekliyor

**Site tarafında (bu repo) biten ve sunucudan karşılık bekleyen işler:**

| Ne | Sunucudan beklenen |
|---|---|
| Dört form component'i CRM lead endpoint'ine JSON POST ediyor | S-01 rate limit, S-05 e-posta politikası |
| Her form `turnstileToken` alanını gönderiyor | **S-04** doğrulama. Alan şu an sunucuda okunmuyor bile |
| Outbound formu `lang: "TR" \| "EN"` gönderiyor | **S-10** dile göre Knovvu projesi seçimi |
| Honeypot (`hp`) her formda var | Doluysa sessiz 200, upstream'e gitmeme |
| UTM'ler `utm` objesiyle gidiyor | Dynamics'e yazılması |
| İstemci cooldown'ı (60 sn genel, 600 sn numara başına) | S-03 kalıcı sayaç. İstemci tarafı yalnızca UX'tir, güvenlik değildir |

**Site tarafında yapılacak bir şey kalmadı.** Aşağıdaki hiçbir görev için
site reposuna dokunulmaz. İstemci sözleşmeye göre yazıldı ve yayında.

**Bende kalan ama sunucuya bağımlı işler** (sunucu bitince yapılacak):

- Designer'a Turnstile site key'inin girilmesi — **S-04 yayına çıktıktan
  sonra**. Ters sırada formlar 403 alır.
- Turnstile'ın gerçek anahtarla uçtan uca teyidi — yayında.
- EN telefon formatı — Knovvu'nun yurt dışı numara cevabı bekleniyor
  (S-10'un altındaki açık soru).

---

## 2. Ana prompt

Agent'a ilk verilecek metin budur. Tek başına yeterlidir; alttaki görev
prompt'ları yalnızca tek bir işi ayrıca vermek istersen gerekir.

```
Sen `waelkhatibsestek/sestek-webflow-demo-app` reposunda çalışacaksın.
Webflow Cloud app, Next.js App Router, Cloudflare Workers üzerinde koşuyor.

Önce şu üç dosyayı oku:

  https://raw.githubusercontent.com/roicool/sestek/main/docs/SUNUCU-GOREVLERI.md
  https://raw.githubusercontent.com/roicool/sestek/main/docs/CRM-LEAD-API-SPEC.md
  https://raw.githubusercontent.com/roicool/sestek/main/docs/outbound-demo-api.md

Birincisi iş emri: S-01'den S-10'a kadar görevler, öncelik sırasıyla, her
birinin gerekçesi ve kabul kriteri yazılı. Diğer ikisi endpoint sözleşmeleri.

Site tarafı bu sözleşmelere göre yazıldı ve yayında. Yanıt sözleşmesini
(status kodu ve error/reason alanı) DEĞİŞTİRME — istemci o kodlara göre
kullanıcıya mesaj basıyor. Yeni bir duruma ihtiyacın olursa uygulamadan
önce sor. Site reposuna hiçbir görevde dokunma.

S-01'den başla, sırayla ilerle. S-01, S-02, S-04 ve S-10 canlıda gerçek
risk taşıyor, ötelenmez.

Her görev için:
  1. Mevcut kodu oku, sözleşmeyle karşılaştır, ne eksik onu tespit et.
  2. En küçük değişikliği yap, görev kapsamı dışına çıkma.
  3. Kabul kriterini gerçekten çalıştırarak doğrula. "Yaptım" demen yetmez,
     ne çalıştırdığını ve ne çıktı aldığını yaz.
  4. Ne yaptığını ve nedenini anlatan tek bir commit at.

Bu kurallar hepsine uygulanır:
  - Hiçbir secret repoya, loga, hata gövdesine yazılmaz. Her gizli değer
    Webflow Cloud environment variable'ı olur, lokalde .dev.vars.
  - Ziyaretçi verisi (isim, telefon, e-posta) loglanmaz.
  - Upstream (Knovvu, Dynamics) hata gövdesi istemciye sızdırılmaz.
  - Gerçek istemci IP'si yalnız CF-Connecting-IP'den alınır. X-Forwarded-For
    ve X-Real-IP istemci tarafından yazılabilir, limit anahtarı olamaz.
  - Modül seviyesi Map kalıcı sayaç değildir; Workers isolate'ı değişince
    sıfırlanır. Rate limit için KV, Durable Objects veya Workers Rate
    Limiting binding kullan.
  - Env yoksa 501 dön, gömülü varsayılan adres veya kimlik ekleme.

Test ederken: test telefonu +90 531 407 28 45, başka numaraya gerçek arama
gitmesin. Her başarılı outbound testi gerçekten telefon çaldırır, en az
sayıda istek at. CRM'e test kaydı düşürürken e-postayı qatest+<konu>@ ile
ver. Testten sonra hangi kayıtların kaldığını yaz, temizlik Sestek'te.

Bir görevi yapamıyorsan (erişim yok, karar gerekiyor, sözleşme yetersiz) o
görevi atla, neden atladığını yaz ve sonrakine geç. Sessizce kapsam daraltma.

Bitirdiğinde her görev için tek satır rapor ver: S-xx, yapıldı mı, kabul
kriteri nasıl doğrulandı, kalan varsa ne.
```

---

## 3. Görev başına prompt

Ana prompt'u verdiysen bunlara gerek yok. Tek bir işi ayrıca vermek ya da
bir görevi tekrar ettirmek istersen kullan. Hepsi iş emrindeki kabul
kriterine bağlanır.

### S-01 · CRM rate limit

```
`POST /demos/api/crm/lead` üzerinde şu an hiçbir hız sınırı yok. Dış ekibin
güvenlik testinde ardışık 10 isteğin 10'u da CRM'e düştü ve Dynamics'te
~11-12 çöp kayıt bıraktı.

IP başına (öneri 10/dakika, 60/saat) ve e-posta adresi başına (öneri aynı
adres 10 dakikada 1) sınır ekle. Sayaç KALICI depoda olsun — Workers KV,
Durable Objects veya Workers Rate Limiting binding. Modül seviyesi Map
kullanma, isolate değişince sıfırlanıyor.

Aşımda 429 {"ok":false,"reason":"rate limited"}.

Doğrulama: aynı IP'den 15 istek at, ilk 10'u geçsin kalanı 429 alsın. Sonra
deploy al ve TEKRAR dene — sayaç hâlâ tutuyorsa iş bitmiştir, sıfırlandıysa
kalıcı depoya geçmemişsin demektir. 429 alan isteğin Dynamics'te kayıt
oluşturmadığını da doğrula.
```

### S-02 · Content-Type ve Origin

```
`POST /demos/api/demos/outbound-call` şu an `Content-Type: text/plain` ile
de kabul ediyor. Bu bir CORS "simple request"tir, tarayıcı preflight
göndermez. CORS yalnız yanıtın OKUNMASINI engeller, isteğin gitmesini değil.
Yani başka bir sitedeki gizli bir form, ziyaretçinin tarayıcısından gerçek
bir telefon araması tetikleyebilir; saldırgan yanıtı okuyamasa da istediği
şey zaten olmuştur.

Content-Type application/json değilse 415 (veya 400) dön, işleme alma.
Origin header'ı varsa allowlist dışındaysa 403 — allowlist: canlı alan adı,
www varyantı, staging alan adları, lokal dev origin'leri. Origin header'ı
HİÇ yoksa engelleme, bazı tarayıcı/proxy kombinasyonları göndermiyor.

Aynı iki kontrolü CRM lead endpoint'ine de uygula.

Doğrulama: text/plain ile curl → 415/400 ve telefon çalmıyor. Yabancı Origin
ile curl → 403 ve telefon çalmıyor. Sitenin kendi formundan normal gönderim
çalışmaya devam ediyor — bu regresyon testini atlama.
```

### S-03 · Outbound sayaçlarını kalıcı depoya taşı

```
Outbound'da numara başına 10 dakikalık ve IP başına saatlik limitler VAR ve
çalışıyor (testte 429 retryAfter: 457 alındı), ama modül seviyesi Map'te
tutuluyor. Isolate değişince sıfırlanıyor, yani limit "çoğunlukla" çalışıyor.

Sayaçları S-01'de kurduğun kalıcı depoya taşı ve aynı yardımcıyı kullan;
iki ayrı rate limit implementasyonu kalmasın. retryAfter gerçek kalan saniye
olarak dönmeye devam etsin.

Doğrulama: aynı numaraya art arda iki istek, ikincisi 429 ve retryAfter dolu.
Deploy al, aynı numarayı tekrar dene — hâlâ 429 alıyorsa tamamdır.
```

### S-04 · Turnstile doğrulaması

```
Site tarafı Cloudflare Turnstile jetonunu gövdede `turnstileToken` alanıyla
ZATEN gönderiyor (dört React form component'i ve crm-forms.js köprüsü).
Sunucu bu alanı şu an okumuyor bile, yani koruma fiilen kapalı.

Tam sözleşme: docs/outbound-demo-api.md §4 ve docs/CRM-LEAD-API-SPEC.md §6.
Örnek verifyTurnstile fonksiyonu orada hazır.

TURNSTILE_SECRET environment variable'ını ekle (secret key ayrı ve güvenli
bir kanaldan gelecek, repoya veya Postman koleksiyonuna YAZILMAYACAK).
Doğrulamayı her iki endpoint'te yap: honeypot kontrolünden SONRA, Knovvu
veya Azure AD'ye dokunmadan ÖNCE.

Kritik davranış: TURNSTILE_SECRET tanımlı DEĞİLSE alanı yok say ve normal
çalış. Bu kasıtlı bir tasarım — site kodu anahtar girilmeden de sorunsuz
çalışsın diye kademeli açılış kuruldu. Tanımlıysa jeton yoksa veya
siteverify success:false dönerse 403 captcha_failed, upstream'e hiç gitme.
remoteip olarak yalnız CF-Connecting-IP gönder.

Doğrulama: secret tanımsızken jetonsuz istek eskisi gibi çalışıyor. Secret
tanımlıyken jetonsuz curl → 403 captcha_failed, telefon çalmıyor ve CRM'e
kayıt düşmüyor. Aynı jeton ikinci kez gönderilince reddediliyor.

UYARI: Turnstile rate limit'in yerine geçmez. Jeton çözebilen bir bot yine
ardışık arama tetikleyebilir. S-01 ve S-03 bu iş bitse de yapılacak.
```

### S-10 · Dile göre Knovvu projesi

```
Knovvu ekibi 02.09'da netleştirdi: Türkçe sitede TR, İngilizce sitede EN
demosu çalışacak. İstemci `lang` alanını zaten "TR" veya "EN" olarak
gönderiyor; sunucu bunu şu an yalnız Language parametresine yazıyor.

Eksik olan şu: PROJE ADI DA DEĞİŞİYOR. Knovvu'nun gönderdiği EN örneğinde
projectName EN_ önekli, TR'dekinden farklı bir proje. Yani TR ve EN ayrı
Knovvu projeleri.

Tek KNOVVU_PROJECT_NAME env'ini ikiye ayır: KNOVVU_PROJECT_NAME_TR ve
KNOVVU_PROJECT_NAME_EN. Gerçek değerler env'de, repoda değil. lang === "EN"
ise EN projesi, aksi halde TR. Gövdedeki projectName ile parameters
içindeki ProjectName AYNI değer olmalı, ikisi de seçilen projeye göre
dolsun. Bilinmeyen bir lang gelirse TR'ye düş, 400 dönme. Env-gate
kontrolüne iki değişkeni de ekle.

Tam sözleşme docs/outbound-demo-api.md §2 "Dil: proje adı lang'e göre
DEĞİŞİR" başlığında.

Doğrulama: lang:"EN" ile giden gövdede hem projectName hem ProjectName EN
projesi ve Language "EN". lang:"TR" ile ve lang hiç gönderilmemiş hâlde TR
projesi. Gerçek bir EN araması yap ve karşı tarafın İngilizce konuştuğunu
teyit et.

Not: Bu görevde telefon doğrulamasına DOKUNMA. Knovvu'nun EN örneğinde
telefon hâlâ TR mobil formatında (05444390406) ve yurt dışı numara desteği
onlara ayrıca soruldu. Cevap gelene kadar /^05\d{9}$/ olduğu gibi kalacak.
```

### S-05 · E-posta politikası

```
Kurumsal e-posta politikası istemcide uygulanıyor ama istemci kontrolü curl
ile atlanır. Aynı kontrol sunucuda da olmalı. Liste ve hata kodları
docs/CRM-LEAD-API-SPEC.md §2.1'de.

Ücretsiz tüketici sağlayıcıları (gmail, hotmail, yandex…) frm-contact,
frm-demo ve frm-opus-report tiplerinde reddedilir → 400 free_email.
frm-newsletter MUAFTIR, orada ücretsiz sağlayıcı serbest; huninin en üstü,
gmail'i engellemek abone kaybettirir. Tek kullanımlık adresler (mailinator,
yopmail…) HER tipte reddedilir → 400 disposable_email.

Liste deploy gerektirmeden güncellenebilmeli (env veya KV) — yeni bir
disposable domain için yayın beklemeyelim.

Doğrulama: frm-demo + gmail → 400 free_email ve CRM'e yazılmıyor.
frm-newsletter + gmail → 200 ve yazılıyor. Her tip + mailinator.com → 400
disposable_email. foo.mailinator.com gibi alt alan adları da yakalanıyor.
```

### S-06 · Günlük arama tavanı

```
Numara ve IP limitleri dağıtık kötüye kullanımı durdurmaz: bin farklı IP ve
bin farklı numara, her biri limit içinde kalarak bin arama başlatır.
Faturayı Sestek öder.

Günlük toplam arama sayısına tavan koy (başlangıç önerisi 200/gün, sayı
env'den ayarlanabilsin). Tavan aşılınca route 503 veya 429 dönsün ve
Knovvu'ya hiç gitmesin. Sayaç kalıcı depoda olsun ve gün dönümünde
sıfırlansın.

Doğrulama: tavanı test için 2'ye indir, üçüncü isteğin Knovvu'ya
ulaşmadığını gör, sonra gerçek değere geri al.
```

### S-07 · Saatlik sayaç ve alarm

```
Anormalliği fatura geldiğinde değil, olurken görmek istiyoruz.

Saatlik arama sayacı tut, eşik aşılınca bildirim gönder (e-posta, Slack
veya webhook — mevcut altyapıda en kolayı hangisiyse). Eşik env'den
ayarlanabilsin. Bildirim metninde ziyaretçi verisi OLMAYACAK: sayı, saat ve
endpoint yeterli.

Doğrulama: eşiği test için 1'e indir, bildirimin gerçekten ulaştığını gör,
sonra gerçek değere geri al.
```

### S-08 · x-opennext header'ı

```
Yanıtlarda dönen x-opennext header'ı altyapı bilgisi sızdırıyor. Tek başına
zafiyet değil ama saldırgana ücretsiz bilgi vermenin gereği yok. Kaldır.

Doğrulama: curl -I ile yanıt header'larında x-opennext görünmüyor.
```

### S-09 · CSV formül enjeksiyonu

```
Lead verisi CSV'ye aktarılıp Excel'de açılırsa, =, +, -, @ ile başlayan bir
hücre formül olarak çalışır. Forma bu karakterle başlayan bir ad yazan biri,
dosyayı açan çalışanın makinesinde komut çalıştırabilir.

Export sırasında bu dört karakterden biriyle başlayan hücrelerin başına tek
tırnak koy veya hücreyi metin olarak işaretle. Sanitizasyon EXPORT ANINDA
yapılsın, kayıt anında değil — CRM'deki veri bozulmasın.

Doğrulama: adı "=1+1" olan bir kayıt içeren export Excel'de formül olarak
çalışmıyor.
```

---

## 4. Bende yapılamayanlar ve nedenleri

Bunlar site reposunda kod işi olmadığı için burada duruyor.

| İş | Neden bende bitmedi | Ne zaman yapılabilir |
|---|---|---|
| Turnstile'ın gerçek anahtarla uçtan uca testi | Geliştirme ortamından `challenges.cloudflare.com` kapalı. Stub'lanmış Turnstile API'siyle test ettim: anahtarla iki widget render oluyor, jeton payload'a giriyor, gönderim başına bir reset; anahtarsız hiç script yüklenmiyor | S-04 yayına çıkınca, canlıda |
| Designer'a site key girilmesi | Webflow Designer işi, kod değil | S-04 yayına çıktıktan sonra |
| Dört formun sayfalara yerleştirilmesi | Webflow Designer işi | Şimdi yapılabilir, Turnstile'dan bağımsız |
| EN telefon formatı (E.164) | Knovvu'nun EN örneğinde telefon hâlâ TR formatında geldi; yurt dışı numara desteği soruldu, cevap yok | Cevap gelince, ~10 satırlık iş |
| `crm-forms.js` köprüsünde jeton beklemesi | Webflow'un kendi submit'i senkron, jeton o anda hazır olmak zorunda. Widget init'te çizildiği için sıradan ziyaretçide sorun yok; gerçekten meydan okuma çıkarsa CRM kopyası 8 sn bekleyip düşer, Webflow gönderimi etkilenmez | Köprüye düşen formlar kritikleşirse çözüm onları da React component'e taşımak |
