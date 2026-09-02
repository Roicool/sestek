# Durum ve Yapılacaklar

> Çalışma günlüğü. Her iş bittiğinde "Tamamlananlar"a commit'iyle taşınır,
> yeni çıkan iş "Sırada"ya eklenir. Amaç: neyin bizde, neyin sunucu
> repo'sunda, neyin Sestek'te beklediğini tek bakışta görmek.
>
> Repolar:
> - Site (bu repo, public): `roicool/sestek`
> - Sunucu / Webflow Cloud app: `waelkhatibsestek/sestek-webflow-demo-app`

---

## Sırada

Öncelik sırasıyla. "Kim" sütunu işin hangi tarafta olduğunu söyler.

| # | İş | Kim | Not |
|---|---|---|---|
| 1 | CRM lead endpoint'ine kalıcı rate limit (KV / Durable Objects) | Sunucu repo | Güvenlik testi B-01, Yüksek. Şu an hiç limit yok, 10/10 istek geçti |
| 2 | Outbound: `Content-Type: application/json` zorunluluğu + Origin allowlist | Sunucu repo | B-03. `text/plain` preflight'sız geçiyor, cross-site arama tetiklenebiliyor |
| 3 | Outbound numara/IP sayacını bellekten kalıcı depoya taşı | Sunucu repo | Şu an modül seviyesi `Map`; isolate değişince sıfırlanır |
| 4 | Turnstile doğrulaması (`TURNSTILE_SECRET` + siteverify) | Sunucu repo | İstemci tarafı BİTTİ; spec `docs/outbound-demo-api.md` §4 ve `docs/CRM-LEAD-API-SPEC.md` §6'da |
| 5 | E-posta politikasının sunucuda uygulanması | Sunucu repo | Liste ve hata kodları `docs/CRM-LEAD-API-SPEC.md` §2.1'de |
| 6 | Günlük toplam arama tavanı + devre kesici | Sunucu repo | Dağıtık kötüye kullanımda fatura koruması |
| 7 | Saatlik arama sayacı + eşik alarmı | Sunucu repo | Anormalliği erken görmek için |
| 8 | `x-opennext` header'ının kaldırılması | Sunucu repo | B-04, Bilgi seviyesi |
| 9 | Formül enjeksiyonu sanitizasyonu (`=`, `+`, `-`, `@` öneki) | Sunucu repo | B-05, CSV export güvenliği |
| 10 | Designer: 4 formun bağlanması, `data-crm-form` + input `name`'leri | Bizde | React component'ler hazır, sayfalara yerleştirilecek |
| 11 | EN telefon formatı (E.164 / uluslararası) | Bizde | Knovvu cevabı bekleniyor, ~10 satırlık iş |
| 12 | Turnstile anahtarlarının Sestek Cloudflare hesabına devri | Bizde + Sestek | Site key + secret key aynı anda değişir, sonrasında test gönderimi |
| 13 | Designer'da 4 component'e ve `data-crm-turnstile`'a site key'in girilmesi | Bizde | Sunucu `TURNSTILE_SECRET`'ı aldıktan SONRA; sıra tersine dönerse hiçbir form gönderilemez |

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
- **Outbound EN dili:** sayfa bazlı, dil seçici yok.

## Notlar

- Bu repo **public** (jsDelivr `gh/roicool/sestek` üzerinden servis ediliyor).
  Gerçek kimlik bilgisi, tenant id, org adresi buraya yazılmaz.
- İstemci tarafındaki hiçbir kontrol (cooldown, e-posta politikası, honeypot)
  güvenlik sınırı değildir; hepsi curl ile atlanır. Asıl kontrol sunucuda.
