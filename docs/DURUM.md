# Durum ve Yapılacaklar

> Çalışma günlüğü. Her iş bittiğinde "Tamamlananlar"a commit'iyle taşınır,
> yeni çıkan iş "Sırada"ya eklenir. Amaç: neyin bizde, neyin sunucu
> repo'sunda, neyin Sestek'te beklediğini tek bakışta görmek.
>
> Repolar:
> - Site (bu repo, public): `roicool/sestek`
> - Sunucu / Webflow Cloud app: `waelkhatibsestek/sestek-webflow-demo-app`
>
> Sunucu işlerinin iş emri: [`docs/SUNUCU-GOREVLERI.md`](./SUNUCU-GOREVLERI.md)

---

## Sırada

Öncelik sırasıyla. "Kim" sütunu işin hangi tarafta olduğunu söyler.

**Sunucu repo'sundaki işler ayrı bir iş emrinde:**
[`docs/SUNUCU-GOREVLERI.md`](./SUNUCU-GOREVLERI.md). Orası kendi başına
ayakta durur — her görevin gerekçesi ve kabul kriteri var — ve doğrudan bir
agent'a verilebilir. Burada sunucu işleri yalnız **S-xx** kimliği ve tek
satırlık özetiyle anılır; ayrıntı iki yerde tutulmuyor.

| # | İş | Kim | Not |
|---|---|---|---|
| S-01 | CRM lead endpoint'ine kalıcı rate limit | Sunucu repo | Yüksek. Şu an hiç limit yok, 10/10 istek geçti |
| S-02 | Outbound + CRM: `Content-Type` zorunluluğu ve Origin allowlist | Sunucu repo | Yüksek. `text/plain` preflight'sız geçiyor, cross-site arama tetiklenebiliyor |
| S-03 | Outbound numara/IP sayacını kalıcı depoya taşı | Sunucu repo | Yüksek. Limit var ve çalışıyor ama isolate değişince sıfırlanıyor |
| S-04 | Turnstile doğrulaması (`TURNSTILE_SECRET` + siteverify) | Sunucu repo | Yüksek. İstemci tarafı BİTTİ, jeton zaten gönderiliyor |
| S-10 | Outbound: dile göre Knovvu proje seçimi (`KNOVVU_PROJECT_NAME_TR` / `_EN`) | Sunucu repo | Yüksek. Knovvu 02.09 cevabı: EN'de proje adı da değişiyor, yalnız `Language` değil |
| S-05 | E-posta politikasının sunucuda uygulanması | Sunucu repo | Orta |
| S-06 | Günlük toplam arama tavanı + devre kesici | Sunucu repo | Orta. Dağıtık kötüye kullanımda fatura koruması |
| S-07 | Saatlik arama sayacı + eşik alarmı | Sunucu repo | Orta |
| S-08 | `x-opennext` header'ının kaldırılması | Sunucu repo | Bilgi seviyesi |
| S-09 | CSV export'ta formül enjeksiyonu sanitizasyonu | Sunucu repo | Düşük |
| B-01 | Designer: 4 formun bağlanması, `data-crm-form` + input `name`'leri | Bizde | React component'ler hazır, sayfalara yerleştirilecek |
| B-02 | EN telefon formatı (E.164 / uluslararası) | Bizde | Knovvu dil cevabında telefon hâlâ TR formatında geldi; yurt dışı numara desteği ayrıca soruldu, cevap beklenirken doğrulama gevşetilmeyecek |
| B-03 | Designer'da site key'in girilmesi (4 component + `data-crm-turnstile`) | Bizde | S-04 bittikten SONRA; sıra tersine dönerse formlar 403 alır |
| B-04 | Turnstile'ın gerçek anahtarla uçtan uca teyidi | Bizde | Geliştirme ortamından Cloudflare kapalı, stub ile test edildi; gerçeği yayında |
| B-05 | Turnstile anahtarlarının Sestek Cloudflare hesabına devri | Bizde + Sestek | Site key + secret key AYNI ANDA değişir |

### Sestek / danışman tarafında bekleyenler

| İş | Neden |
|---|---|
| Knovvu client secret rotasyonu | Postman koleksiyonu içinde canlı secret dolaştı |
| Turnstile anahtarlarının Sestek hesabına devri | Geçici olarak ajans hesabında açılıyor, sonra devredilecek (aşağıdaki karara bak) |
| Knovvu tarafında proje bazlı günlük/saatlik arama kotası | Bizden bağımsız son emniyet hattı |
| CRM'deki QATEST kayıtlarının temizlenmesi | Güvenlik testinden ~11-12 kayıt kaldı |
| Honeypot teyidi: `hp` dolu istekte telefon çalmadı mı, CRM'e kayıt düştü mü | Dışarıdan ölçülemiyor |
| Mass assignment teyidi: `ownerid`/`statuscode` alanları Dynamics'e geçti mi | Dışarıdan ölçülemiyor |
| `ses_formtype` option-set değerleri (4 tip) Dynamics'te tanımlı mı | Lead yazımı buna bağlı |
| EN demoda yurt dışı telefon numarası kabul ediliyor mu (E.164) | Dil cevabındaki örnek hâlâ TR mobil formatında, EN ziyaretçinin numarası TR olmayacak |
| Opus Report kapsamı: tek rapora mı özel, genel lead-magnet mi | Ek raporlarda tip adlandırması |
| Newsletter CRM'de lead mi olacak, ayrı liste mi | Lead havuzunu şişirmemek için |
| KVKK onayının CRM'e taşınması gerekiyor mu | Şu an onay yalnız istemcide tutuluyor |

---

## Tamamlananlar

### Güvenlik

| Tarih | İş | Commit |
|---|---|---|
| 02.09 | Turnstile istemci tarafı: 4 React component'te `Turnstile site key` prop'u, `outbound-demo.js` v1.2.0 ve `crm-forms.js` v1.2.0'da `data-*-turnstile`. Jeton `turnstileToken` olarak gider, her denemeden sonra reset edilir. Sunucu doğrulaması iki spec'e yazıldı | `b6432d6` |
| 02.09 | Public repodaki altyapı kimlikleri temizlendi (tenant id, org URL, Knovvu client id, proje adı); referans koddan gömülü fallback'ler kaldırıldı | `5685ba7` |
| 02.09 | Kurumsal e-posta politikası: ücretsiz sağlayıcılar B2B formlarında engelli, newsletter'da serbest; tek kullanımlık adresler her yerde engelli. Sunucu spec'ine de yazıldı | `59b5cb7` |
| 02.09 | Güvenlik ve kısıt testi yapıldı (dış ekip), rapor alındı: kimlik sızıntısı yok, CRM rate limit yok, outbound beklenenden sağlam | — |

### Component'ler

| Tarih | İş | Commit |
|---|---|---|
| 02.09 | `locale-switch` v1.2.0 / css v1.3.0: Webflow Locales listesini saran dil seçici; stacking context sorunu, hizalama ve açık renk chip | `6a8516f` |
| 02.09 | Report Download Form hero düzeni: iki ayrı kart, sol içerik + sağ form | `b1e9622` |
| 02.09 | Newsletter Form: tek e-posta pill'i, SESTEK paleti, Subscribe/Demo tipi | `9d55169` |
| 02.09 | Demo Request Form: marka renkli butonlar, floating label, Steps varyantı | `15efbd9` |
| 02.09 | 10 eski branch main'e alındı, hiçbir dosya eskiye gitmedi | `63eea09` |
| — | Outbound Call Demo (React) + `outbound-demo.js` v1.1.0 + sunucu spec'i | — |
| — | `voice-orbs` v3.4.0 / css v2.7.0 | `a58be9a` |

---

## Verilmiş kararlar

- **Opus Report teslimatı:** başarı ekranında indirme butonu (e-posta ile
  gönderim veya thank-you sayfası değil).
- **Newsletter e-posta politikası:** ücretsiz sağlayıcılar serbest. Huninin
  en üstü, gmail'i engellemek abone kaybettirir.
- **Turnstile devreye alma sırası:** ÖNCE sunucuya `TURNSTILE_SECRET` girilir,
  SONRA Designer'da site key'ler girilir. Ters sırada jeton gönderilir ama
  doğrulanmaz (zararsız); doğru sırada da kısa bir süre secret tanımlıyken
  jeton boş gelir, o yüzden secret girildikten hemen sonra site key girilmeli.
  Anahtar BOŞKEN hiçbir script yüklenmez ve davranış birebir eskisi gibidir —
  yayınlamak risksiz, geri almak tek alanı silmek kadar kolay.
- **Turnstile:** ilk turda ertelenmişti, güvenlik testinden sonra sıraya alındı.
  Anahtarlar **geçici olarak ajans Cloudflare hesabında** açılıyor ki iş
  beklemesin; Sestek'e yazılı bildirilecek ve devredilecek. Bu yüzden **site
  key koda gömülmez, Designer prop'u olur** — devir kod değişikliği ve yeniden
  yayın gerektirmesin. Secret key yalnız Webflow Cloud env'inde durur.
  Widget hostname listesine staging ve canlı alan adlarının hepsi eklenir.
  Devirde iki anahtar AYNI ANDA değişmeli, aksi halde doğrulama kırılır.
- **Formlar:** demo/contact/newsletter/opus-report React component olarak;
  `crm-forms.js` kalan native Webflow formları için köprü olarak duruyor.
- **`crm-forms.js` köprüsünde Turnstile'ın sınırı kabul edildi:** Webflow'un
  kendi submit'i senkron olduğundan jeton o anda hazır olmak zorunda. Widget
  init'te çizildiği için sıradan ziyaretçide sorun çıkmaz, ama ziyaretçi
  gerçekten meydan okumaya düşerse CRM kopyası 8 saniye bekleyip sessizce
  düşer. Webflow'un kendi gönderimi bundan hiç etkilenmez (kayıt inbox'ta,
  bildirim maili gider). Dört ana formda bu sorun yok, çünkü React
  component'ler jetonu bekleyebiliyor. Köprüye düşen formların kritikliği
  artarsa çözüm onları da component'e taşımak.
- **Outbound EN dili:** sayfa bazlı, dil seçici yok. Knovvu 02.09'da netleştirdi:
  TR ve EN **ayrı Knovvu projeleri**, proje adı da dile göre değişiyor. İstemci
  `lang` göndermeye devam ediyor, seçimi sunucu yapıyor (S-10).

## Notlar

- Bu repo **public** (jsDelivr `gh/roicool/sestek` üzerinden servis ediliyor).
  Gerçek kimlik bilgisi, tenant id, org adresi buraya yazılmaz.
- İstemci tarafındaki hiçbir kontrol (cooldown, e-posta politikası, honeypot)
  güvenlik sınırı değildir; hepsi curl ile atlanır. Asıl kontrol sunucuda.
