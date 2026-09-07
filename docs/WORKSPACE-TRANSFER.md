# Site Transfer — Roicool workspace → SESTEK workspace

> rc-sestek Webflow sitesi müşterinin workspace'ine taşındığında kopacak
> bağlantılar ve sırasıyla yapılacaklar. Üç dağıtım kanalı var
> (`docs/WEBFLOW-APPS.md`): **CDN (jsDelivr)**, **Code Components (DevLink
> library)**, **Cloud App (`/demos`)**. Transfer bunların her birine farklı
> dokunur. Aşağıdaki liste "ne kopar → neden → ne yapılır" mantığıyla
> yazıldı; kutucukları taşınma günü tek tek işaretle.

---

## 0) Taşımadan ÖNCE (Roicool tarafında, 1 gün önce)

- [ ] **Siteyi Duplicate et** (Roicool workspace'inde yedek kalsın). Taşıma
      geri alınamaz; library/Cloud app kopmasında kıyaslama için lazım.
- [ ] **Site export** (Site settings → Export code) — zip'i sakla.
- [ ] Şu değerleri bir yere yaz (taşıma sonrası kıyaslayacaksın):
  - Site ID: `6a15f6e39b139e2c81103be6`
  - Cloud app ID: `f9536c67-23bb-47d7-a5cb-eb3ce6dbeeb1` (app adı **sestek-demos**, mount `/demos`, root `./webflow-cloud-app`)
  - DevLink library id: `sestek-code-components` (`webflow-components/webflow.json`)
  - Site settings → Custom code **head** ve **footer** bloklarının tam kopyası
    (transfer taşır ama diff için elde olsun)
  - Site settings → Publishing → **301 redirects** listesi (CSV export)
  - Site settings → Forms → bildirim e-postaları, reCAPTCHA durumu
  - Site settings → Integrations → GA4 / GTM / Search Console kayıtları
  - Localization: TR locale ayarları (`/tr` subdirectory, locale display name)
  - Custom domain listesi + hangisi default (`www.sestek.com`)
- [ ] **CDN kütüphanesini tag'le**: `git tag v2.1.0 && git push --tags`.
      Head'deki tüm jsDelivr URL'leri bu tag'e sabitle. Transfer sonrası
      head'i düzenlerken hareketli hedef olmasın.
- [ ] Cloud app **Environment variables** panelinin ekran görüntüsü / listesi
      (değerler değil, hangi anahtarların tanımlı olduğu):
      `WEBFLOW_CMS_TOKEN`, `SESTEK_TTS_URL`, `SESTEK_TTS_API_KEY`,
      `SESTEK_SR_URL`, `SESTEK_SR_API_KEY`, `TURNSTILE_SECRET`,
      `KNOVVU_CLIENT_ID`, `KNOVVU_CLIENT_SECRET`, `KNOVVU_IDENTITY_URL`,
      `KNOVVU_OUTBOUND_URL`, `KNOVVU_PROJECT_NAME_TR`, `KNOVVU_PROJECT_NAME_EN`,
      `KNOVVU_SCOPE` (ops.), CRM: `CRM_BASE_URL`, `CRM_TENANT_ID`,
      `CRM_CLIENT_ID`, `CRM_CLIENT_SECRET`. Değerlerin gerçek kaynağı
      Sestek/Knovvu ekibi; secret'lar Roicool'da 1Password'da olmalı.
- [ ] Müşteri workspace'inde **Hosting planı + Localization add-on** satın
      alınmış olsun. Transfer edilen site plansız gelir; hosting ve
      Localization (TR) yeniden satın alınmadan `/tr` yayınlanamaz.
- [ ] Müşteri workspace'inde bir **admin kullanıcı** Roicool'dan biri olsun
      (geçici). Library yayını, Cloud app kurulumu, token üretimi bu
      hesapla yapılacak; iş bitince kaldırılır.

---

## 1) Transfer günü — Webflow site ayarları

Transfer: Site settings → General → **Transfer site** → hedef workspace.
Kabul edildikten sonra sırayla:

- [ ] **Hosting planı** siteye bağlandı (müşteri kartı).
- [ ] **Custom domain** yeniden bağlandı: `sestek.com`, `www.sestek.com`,
      default `www`. DNS zaten Webflow'a bakıyorsa değişmez; SSL'in yeşil
      olduğunu bekle (5–30 dk).
- [ ] **Localization**: add-on aktif, TR locale `/tr` subdirectory, "Publish
      locale" açık. Locale switch (`locale-switch.js`) `hreflang` linklerini
      DOM'dan okur, ek ayar yok.
- [ ] **301 redirects** yerinde mi (transfer taşır; sayıyı export'la kıyasla).
- [ ] **Forms**: bildirim e-postası müşteri adresine; reCAPTCHA kapalı kalsın
      (formlar Turnstile kullanıyor).
- [ ] **Integrations**: GA4 / GTM ID'leri duruyor mu. GTM container
      Roicool'un hesabındaysa müşteriye **transfer et** (GTM → Admin → Export
      / kullanıcı ekle). Cookie Consent component'i `gtag('consent',…)` ile
      GTM'e konuşur, container ID değişirse head'i güncelle.
- [ ] **Fonts**: Google Fonts entegrasyonu kaldırılmış, Montserrat custom font
      olarak yüklü olmalı (LCP notu — bkz. bu repo, "font block"). Transfer
      custom fontları taşır; yine de Designer'da font listesini kontrol et.
- [ ] **Site-level Apps** (Designer → Apps): kurulu app'ler workspace'e
      bağlıdır, **hepsi yeniden kurulur**. Bizim için kritik olan:
      Webflow MCP / Claude bağlantısı (yalnız Roicool'un çalışma aracı,
      müşteri için şart değil).
- [ ] **Workspace members / Editor**: müşteri ekibini davet et; Roicool
      geçici admin hesabı kalıyor.
- [ ] **Backups**: Site settings → Backups listesi taşınır; en az bir
      "before transfer" yedeği olduğunu doğrula.

---

## 2) Code Components — DevLink library (KOPAR, yeniden yayın gerekir)

Library **workspace'e** aittir; site başka workspace'e gidince siteye
kurulu "Sestek Code Components" kütüphanesi **artık o workspace'te yok**.
Sayfalardaki component örnekleri (Hero, Scroll Tabs, Stack Panels, Site
Search, Top Bar, Cookie Consent, Voice Orbs, Circle Diagram, Logo Marquee,
Horizontal Scroll Cards, TTS/STT Demo, Not Found Page, 4 form, gradient
BG'ler) yayında çalışmaya devam eder ama Designer'da **güncellenemez** ve
yeni sürüm alamaz.

Yapılacaklar:

1. [ ] Müşteri workspace'inde (geçici admin hesabıyla) **workspace API
       token** üret: Workspace settings → Apps & integrations → API access.
       Scope: **Components: Read + Write** (site token OLMAZ — bkz.
       `docs/WEBFLOW-APPS.md` "invalid or not authorized").
2. [ ] GitHub → `roicool/sestek` → Settings → Secrets → **`WEBFLOW_API_TOKEN`**
       değerini bu yeni token'la değiştir.
3. [ ] İlk yayını lokalde yap (CLI interaktif sorar, CI soramaz):
       ```bash
       cd webflow-components
       npx webflow auth login        # müşteri workspace'i seç
       npx webflow devlink import    # "create new library" → onayla
       ```
       CLI `webflow.json → library.id`'yi yeni değerle yazar. **Commit'le ve
       main'e push'la**; aksi hâlde CI her push'ta yeni library açar.
4. [ ] Designer → Libraries → "Sestek Code Components" → **Install** (yeni
       workspace'in kütüphanesi).
5. [ ] **Sayfa sayfa kontrol**: yeni library'nin component'leri **yeni ID'lerle**
       gelir. Mevcut örnekler eski library'ye bağlı görünür ("library
       unavailable" / kilitli). Her sayfada eski örneği yenisiyle **değiştir
       ve prop'ları yeniden gir**. Prop değerleri sayfanın HTML'inde
       `data-props` olarak duruyor (view-source), kopyalamak için oradan al.
       Etkilenen sayfalar: Ana sayfa (Top Bar, Site Search ×2, Hero,
       Scroll Tabs, Outbound Call Demo, Voice Orbs, Circle Diagram, Stack
       Panels, Newsletter Form, Cookie Consent), /demos hub ve TTS/STT
       sayfaları, Request a demo, Why SESTEK (Horizontal Scroll Cards),
       404 (Not Found Page), rapor indirme sayfaları (Report Download Form),
       Navbar/Footer symbol'leri (Site Search, Newsletter, Cookie Consent —
       symbol'de bir kez değiştirmek yeter).
       > Bu adım en uzun süren iş. Taşımadan önce staging'de dene: siteyi
       > duplicate edip başka bir test workspace'ine transfer ederek
       > component örneklerinin ne olduğunu gör; ID'ler korunuyorsa 5. adım
       > düşer.
6. [ ] Değişiklik sonrası CI'ı doğrula: `webflow-components/` altında küçük bir
       commit → Actions → "Publish Webflow Code Components" yeşil ve
       Designer'da library sürümü artıyor.

---

## 3) Cloud App — `/demos` (KOPAR, yeniden kurulum gerekir)

Webflow Cloud projesi siteye **ve** workspace'in GitHub bağlantısına
bağlıdır. Transfer sonrası dashboard'da app görünmeyebilir ya da "deploy
disabled" olur; `/demos/*` 404 dönene kadar formlar (`/demos/api/crm/lead`),
outbound demo, footer linkleri, site araması (`/demos/api/search/index`) ve
geo (`/demos/api/geo`) **çalışmaz**.

1. [ ] Müşteri workspace'inde **GitHub entegrasyonunu** kur (Workspace →
       Integrations → GitHub). Repo `roicool/sestek` ise Roicool GitHub
       org'unun bu workspace'e yetki vermesi gerekir; repo ayrı bir
       depodaysa (cloud app'in kendi repo'su) o repo'ya yetki ver.
       Alternatif: cloud app repo'sunu müşterinin GitHub org'una fork/transfer
       et — uzun vadede doğru olan bu.
2. [ ] Site → Webflow Cloud → **Create project**: framework Next.js, branch
       `main`, root directory `./webflow-cloud-app` (ayrı repo'da `./`),
       mount path **`/demos`** (bütün endpoint'ler bu path'i varsayıyor;
       değişirse Site Search `indexUrl`, form `endpoint` prop'ları,
       Outbound demo `endpoint`, `geoEndpoint` hepsi Designer'da güncellenir).
3. [ ] Yeni `app_id` gelir → `webflow-cloud-app/webflow.json → cloud.app_id`
       güncelle, `siteId` aynı kalır (site ID transferde değişmez). Commit.
4. [ ] **Environment variables** — hepsini yeniden gir (0. adımdaki liste),
       secret işaretle. `WEBFLOW_CMS_TOKEN` için **yeni site token** üret
       (müşteri workspace'i, CMS: Read); eski token transferle geçersiz olur.
5. [ ] "Deploy latest commit" → Deployments yeşil.
6. [ ] Duman testi:
       - `GET /demos/api/footer-links` → JSON, kolonlar dolu
       - `GET /demos/api/search/index` → JSON, `items` > 0
       - `GET /demos/api/geo` → ülke kodu
       - Ana sayfa Newsletter → gerçek e-posta ile submit → CRM'de lead
       - Request a demo formu → CRM'de lead
       - Outbound Call Demo → telefon çalıyor (Knovvu env'leri doğruysa)
       - /demos, /demos/tts, /demos/speech-recognition sayfaları açılıyor
       - ⌘K arama sonuç getiriyor

---

## 4) Cloudflare Turnstile (site key HTML'de, secret cloud app'te)

Anahtarlar **Roicool'un Cloudflare hesabında** (`outbound-demo-api.md`).
Site key `0x4AAAAAAEk0PQM8KwJSbVxO` head'de `window.SESTEK_TURNSTILE_SITE_KEY`
ve Outbound/Report/Demo formlarının `turnstileSiteKey` prop'unda.

- [ ] Kısa vade: Cloudflare → Turnstile widget → **Allowed hostnames**'e
      `www.sestek.com`, `sestek.com` ve staging `*.webflow.io` ekli mi.
- [ ] Doğru çözüm: müşterinin Cloudflare hesabında yeni widget → yeni site
      key + secret. Head'deki `SESTEK_TURNSTILE_SITE_KEY`, Designer'daki
      form `turnstileSiteKey` prop'ları ve cloud app `TURNSTILE_SECRET`
      güncellenir. Secret değişmeden site key değişirse tüm formlar 403.

---

## 5) CDN kütüphanesi — jsDelivr (KOPMAZ, karar gerekir)

`https://cdn.jsdelivr.net/gh/roicool/sestek@<tag>/…` linkleri repo public
kaldığı sürece çalışır. İki seçenek:

- **A) Repo Roicool'da kalır** (bakım anlaşması varsa): hiçbir link
  değişmez. Head'i `v2.1.0` tag'ine sabitle; `@main` link bırakma.
- **B) Repo müşteriye transfer edilir** (`github.com/<sestek-org>/sestek`):
  jsDelivr eski path'i **redirect etmez**. Head/footer'daki tüm
  `gh/roicool/sestek` → `gh/<sestek-org>/sestek` olarak değiştirilir
  (ana head'de 4 CSS + ~15 JS satırı, sayfa bazlı custom code'larda da ara).
  Cloud app `site-runtime.tsx` ve `layout.tsx`'teki CDN linkleri de aynı.
  Transfer sonrası GitHub Actions secret'ları (`WEBFLOW_API_TOKEN`) yeni
  org'da yeniden girilir.

- [ ] Karar verildi: A / B
- [ ] Head'de `@main` kalmış satır yok (`grep -n "sestek@main"` mantığıyla
      Designer'da ara).

---

## 6) Diğer kopma noktaları

- [ ] **Webflow API token'ları**: Roicool workspace'inde üretilmiş her token
      (MCP, CI, cloud app CMS) bu siteye erişemez olur. Kullanımda olanlar:
      `WEBFLOW_API_TOKEN` (CI), `WEBFLOW_CMS_TOKEN` (cloud app), Claude/MCP
      bağlantısı. Üçü de müşteri workspace'inden yeniden.
- [ ] **Search index** cloud app tarafında CMS'ten üretiliyor → token
      yenilenince otomatik düzelir; index boş dönüyorsa ilk şüpheli token.
- [ ] **Site Search `siteHost`** prop'u `www.sestek.com` — domain değişmiyorsa
      dokunma.
- [ ] **Cookie Consent `policyUrl`** ve **Top Bar linkleri** relative, domain
      bağımsız.
- [ ] **Google Search Console / GA4 mülkleri** Roicool hesabındaysa
      müşteriyi owner yap.
- [ ] **Sitemap / robots**: Webflow üretir, değişmez. `sitemap.xml`'deki
      eski `savings-calculator-*` URL'leri 301 listesinde olmalı.
- [ ] **E-posta gönderen adres** (form bildirimleri) müşteri domain'inde
      SPF/DKIM — Webflow "Forms" e-postası noreply@webflow.com'dan gider,
      ek ayar yok.

---

## 7) Son kontrol (yayın sonrası, canlı domain)

- [ ] `https://www.sestek.com` ve `/tr` açılıyor, SSL geçerli
- [ ] Lighthouse mobil: CLS 0, LCP < 2.5 s (font düzeltmesi yapıldıysa)
- [ ] Ana sayfa: Hero scroll animasyonu, Scroll Tabs videoları, Voice Orbs
      sesleri (`sestek.roicool.com/Voices/*.wav` — **bu host Roicool'da**,
      ses dosyalarını Webflow Assets'e ya da müşteri CDN'ine taşı ve Voice
      Orbs `vNAudio` prop'larını güncelle), Circle Diagram, Stack Panels
- [ ] Top Bar × ile kapanıp cookie'yle hatırlanıyor
- [ ] Cookie Consent: kabul → GTM `cookie_consent_update` event'i düşüyor
- [ ] 404: rastgele URL → Not Found Page, scroll yok
- [ ] Console'da `[Sestek]` uyarısı yok (`initX atlandı` görürsen CDN linki
      kopmuş demektir)

---

## Sorumluluk / erişim özeti (taşıma sonrası kimde ne kalıyor)

| Varlık | Şimdi | Sonra | Not |
|---|---|---|---|
| Webflow site | Roicool ws | SESTEK ws | Roicool geçici admin |
| Code Components library | Roicool ws | SESTEK ws'te **yeniden** | `library.id` değişir |
| Cloud app (`/demos`) | Roicool ws | SESTEK ws'te **yeniden** | `app_id` değişir, env'ler yeniden |
| GitHub `roicool/sestek` | Roicool org | karar (A/B) | jsDelivr path'i buna bağlı |
| Cloudflare Turnstile | Roicool CF | SESTEK CF'ye taşı | site key + secret birlikte |
| GTM / GA4 / GSC | ? | SESTEK owner | |
| Voice Orbs ses dosyaları | `sestek.roicool.com` | Webflow Assets | prop güncelle |
| Knovvu / CRM / TTS / SR anahtarları | Sestek'ten alınmış | aynı | yalnız env'e yeniden gir |
