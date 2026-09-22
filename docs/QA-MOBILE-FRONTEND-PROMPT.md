# QA agent prompt — mobil öncelikli ön yüz denetimi (tüm site)

> Bloğu olduğu gibi tarayıcı kullanabilen bir ajana ver (Claude in Chrome,
> Playwright MCP, Browser Use vb.). Ajanın DevTools cihaz emülasyonu açması,
> konsola kod yapıştırması ve ekran görüntüsü alması gerekir. Gerçek iPhone
> varsa en sonda iki sayfa gerçek cihazda da doğrulanır.

---

```
Sen bir ön yüz QA mühendisisin. Görevin: SESTEK sitesinin TÜM sayfalarını
MOBİL ÖNCELİKLİ tarayıp görsel ve etkileşim hatalarını tek bir Markdown
raporda toplamak. Tahmin yürütme; her bulguyu sayfa URL'si, cihaz ölçüsü,
yazı boyutu, ekran görüntüsü ve tekrar adımlarıyla ver. Emin olmadığını
"kontrol edilmeli" diye ayrı listele. Bir bulguyu "düzeltmeye" çalışma,
yalnız raporla.

## Ortam
- Site: https://www.sestek.com (staging: https://rc-sestek.webflow.io — hangisini taradığını yaz)
- Sayfa listesi: {site}/sitemap.xml (alt sitemap'ler dahil). Sitemap'te olmayan
  ama navbar/footer'dan linklenen sayfaları da ekle. 404 sayfasını
  ({site}/olmayan-bir-sayfa) ve /tr/ karşılıklarını unutma.
- Her sayfayı en az iki dilde aç: EN kök, TR /tr/ altında. TR metin daha uzun
  olduğu için taşma çoğu zaman önce TR'de çıkar.
- Hız: saniyede en fazla 2 sayfa; User-Agent'a "RoicoolQA" ekle.

## Cihaz matrisi (DevTools emülasyonu, sabit cihaz seç, responsive modda kalma)
| Ad | Ölçü | Not |
|---|---|---|
| iPhone SE | 375×667 | en dar ve en kısa |
| iPhone 14 Pro | 393×852 | ana mobil |
| iPhone 16 Pro | 402×874 | müşteri cihazı |
| Android orta | 360×800 | |
| iPad dikey | 768×1024 | tablet kırılımı |
| iPad yatay | 1024×768 | 992–1024 aralığı: hamburger menü olmalı |
| Masaüstü | 1280×800 | yalnız regresyon, öncelik değil |

Her sayfayı 393×852'de tam tara; diğer ölçülerde yalnız hero, navbar,
footer, formlar ve bulgu çıkan bölümleri tekrar kontrol et.

## Yazı boyutu matrisi (kritik — müşteri büyük yazı tipi kullanıyor)
Her sayfada, 393×852'de, üç yazı boyutunda bak: normal, %150, %175.
Konsolda kök yazı tipini değiştir (yakınlaştırma DEĞİL, o farklı şey):
  document.documentElement.style.fontSize = '24px'   // %150
  document.documentElement.style.fontSize = '28px'   // %175
  document.documentElement.style.fontSize = ''       // geri al
Gerçek iPhone'da: Safari adres çubuğu → aA → metin boyutu %150.

## Konsol tarayıcı (her sayfada, 393×852'de bir kez çalıştır, çıktıyı rapora koy)
Aşağıdaki blok kök yazı tipini 16/20/24/28 yapar, shadow DOM dahil bütün
kutuları ölçer ve yalnız TABANA GÖRE ARTAN kırpma/taşma ile kelime içinden
kırılan buton etiketlerini raporlar, sonra eski hâline döner:

(async () => {
  const SIZES=[16,20,24,28], ESIK=4, root=document.documentElement, geri=root.style.fontSize;
  const bekle=(ms)=>new Promise(r=>setTimeout(r,ms));
  function* gez(k){ for(const el of k.querySelectorAll('*')){ yield el; if(el.shadowRoot) yield* gez(el.shadowRoot);} }
  const kirpma=(el)=>{ const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden') return null;
    if(cs.webkitLineClamp&&cs.webkitLineClamp!=='none') return null;
    if(el.closest&&el.closest('[data-marquee],[data-logo-slider]')) return null;
    const dy=/hidden|clip/.test(cs.overflowY), dx=/hidden|clip/.test(cs.overflowX);
    if(!dy&&!dx) return null; if(!el.clientHeight||!el.clientWidth) return null;
    return { y: dy? el.scrollHeight-el.clientHeight:0, x: dx? el.scrollWidth-el.clientWidth:0 }; };
  const etiket=(el)=>{ const sec=el.closest&&el.closest('section,footer,header,main,[class*="section"]');
    const sinif=typeof el.className==='string'? el.className.trim().split(/\s+/).slice(0,2).join('.'):'';
    return { bölüm: sec? ((typeof sec.className==='string'&&sec.className)? sec.className.split(/\s+/)[0]: sec.tagName.toLowerCase()):'(shadow)',
             eleman: el.tagName.toLowerCase()+(sinif?'.'+sinif:''), metin:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,45) }; };
  // kelime içinden kırılan etiket: aynı kelimenin harf kutuları farklı satırlarda
  const kelimeKirik=()=>{ const out=[]; for(const el of gez(document)){
    if(!(el.matches&&el.matches('[stagger-btn-text],.btn-text,.sh-stg-txt,.tts_stg-t'))) continue;
    const harfler=[...el.querySelectorAll('*')].filter(d=>!d.children.length&&d.textContent.trim().length===1);
    if(harfler.length<2) continue;
    const kelimeler=(el.textContent||'').replace(/\s+/g,' ').trim().split(' '); let i=0;
    for(const w of kelimeler){ const t=new Set(); for(const _ of w){ const h=harfler[i++]; if(h) t.add(Math.round(h.getBoundingClientRect().top)); }
      if(t.size>1) out.push({ eleman:'buton etiketi', metin:(el.textContent||'').trim().slice(0,45), kelime:w }); } }
    return out; };
  root.style.fontSize=SIZES[0]+'px'; await bekle(600);
  const taban=new Map(); for(const el of gez(document)){ const k=kirpma(el); if(k) taban.set(el,k); }
  const yatayTaban=root.scrollWidth-innerWidth; const bulgular=[];
  for(const px of SIZES.slice(1)){ root.style.fontSize=px+'px'; await bekle(700);
    for(const el of gez(document)){ const k=kirpma(el); if(!k) continue; const t=taban.get(el)||{x:0,y:0};
      if(k.y-t.y>ESIK||k.x-t.x>ESIK) bulgular.push({'kök yazı':px+'px',...etiket(el),'dikey taşma':Math.round(k.y),'yatay taşma':Math.round(k.x)}); }
    const yatay=root.scrollWidth-innerWidth;
    if(yatay>yatayTaban+2) bulgular.push({'kök yazı':px+'px',bölüm:'SAYFA',eleman:'yatay kaydırma',metin:'','dikey taşma':0,'yatay taşma':Math.round(yatay)});
    for(const k of kelimeKirik()) bulgular.push({'kök yazı':px+'px',bölüm:'buton',...k,'dikey taşma':0,'yatay taşma':0}); }
  root.style.fontSize=geri; await bekle(300);
  if(!bulgular.length) console.log('%c✅ Taşma yok — '+location.pathname,'color:#0a0;font-weight:700');
  else { bulgular.sort((a,b)=>(b['dikey taşma']+b['yatay taşma'])-(a['dikey taşma']+a['yatay taşma']));
    console.log('%c❌ '+bulgular.length+' bulgu — '+location.pathname,'color:#c00;font-weight:700'); console.table(bulgular.slice(0,40)); }
})();

Not: bu blok kırpma, taşma ve kelime kırılmasını görür; üst üste binmeyi,
kesik görselleri ve dokunma hedeflerini GÖRMEZ. Onlar gözle ve aşağıdaki
kontrol listesiyle bulunur.

## Kontrol listesi — her sayfa, 393×852, üç yazı boyutu
A. Düzen
   - Yatay kaydırma var mı (sayfa sağa kayıyor mu)? Hangi eleman taşırıyor?
   - Sabit navbar'ın altında kalan içerik: sayfa başındaki başlık, ilk bölüm,
     Top Bar açıkken ve kapatıldıktan sonra (× ile kapat, tekrar bak).
   - Metin metnin üstüne biniyor mu, buton altındaki satıra taşıyor mu,
     kelime ortasından kırılan etiket var mı ("Request a de / mo" gibi).
   - Sabit yükseklikli bölümler (ekran boyu hero, 404 sayfası, pinlenen
     bölümler): büyük yazıda içerik kırpılıyor mu?
   - Görseller: ezilmiş/uzamış, kesik, boş kutu, yanlış oran, lazy görsel
     yerinde boşluk.
   - Kart ızgaraları tek sütuna düşüyor mu, kart yükseklikleri eşit mi.
   - Footer: kolonlar alt alta mı, e-posta kutusu ve buton ölçüleri normal mi.
B. Navbar
   - Hamburger açılıyor, alt paneller (Products → Agentic AI vb.) kayıyor,
     "Back" çalışıyor, kapat çalışıyor, arka sayfa kaymıyor (scroll kilidi).
   - Menü açıkken büyük yazıda alt bar (EN, Search, Request a demo) sığıyor mu.
   - 1024×768'de hamburger görünmeli, masaüstü menüsü görünmemeli.
   - Dil değiştirici çalışıyor, etiket "EN/TR" düzgün.
C. Etkileşim ve dokunma
   - Dokunma hedefleri en az 44×44 px (linkler, ikon butonlar, ok/nokta
     butonları, kapat ×). Küçük olanları listele.
   - Odak görünür mü (klavye/Tab ile bir tur at).
   - Form alanı yazı boyutu 16px'in altında mı (iOS'ta odaklanınca sayfa
     zoom yapar; bulgu).
   - Sticky/fixed elemanlar içeriği kapatıyor mu (leadgen slide-in, cookie
     kartı, chat/ask-ai butonu). Cookie kartı butonları örtüyor mu.
   - Modal/arama paleti (⌘K / Search) mobilde açılıyor, kapanıyor, klavye
     açılınca liste görünür kalıyor mu.
D. Code component'ler (shadow DOM'da; her biri için ayrıca bak)
   - Hero: normal + %150 + %175 yazı, Top Bar açık/kapalı; başlık navbar'ın
     altında mı, "Trusted by" bandı görünüyor mu, logo bandı akıyor mu.
   - Scroll Tabs, Stack Panels, Circle Diagram (chip'ler taşıyor mu, ikonlar
     1070px altında gizli mi), Voice Orbs, Horizontal Scroll Cards (mobilde
     native kaydırma + oklar + noktalar), Outbound Call Demo, Newsletter,
     Demo Request formu, Report Download formu, TTS ve STT demo iframe'leri
     (kutu içinde tam görünüyor mu, iOS'ta sağda boşluk var mı), Not Found
     Page (100svh, kaydırılmıyor, büyük yazıda kırpılıyor mu), Cookie
     Consent (alt sheet), Site Search (tam ekran palet), Top Bar.
E. Yükleme davranışı (her sayfada bir kez, önbelleksiz yükle)
   - İlk boyamadan sonra zıplayan eleman var mı (navbar, dropdown, dil
     etiketi, hero, marquee)? Lighthouse mobil CLS değerini not et.
   - Yazı tipi geç gelince satır sayısı değişip düzeni kaydırıyor mu.
   - Konsolda hata ("[Sestek" önekli uyarılar dahil; aynen kopyala).
F. Yatay mod (iPhone 14 Pro yatay, 852×393): hero, navbar, formlar, 404.
G. Safe area: çentikli cihazda alt sabit elemanlar home göstergesine
   yapışıyor mu (Cookie kartı, leadgen slide-in).

## Gerçek cihaz (varsa, en sonda)
iPhone'da Safari: aA → metin boyutu %150. Ana sayfa, /demos, /request-a-demo,
/tr/ ana sayfa ve bir blog yazısı. Emülasyonla farkı varsa yaz.

## Rapor (Markdown, Türkçe) — dosya adı: sestek-mobile-qa-{tarih}.md
1. Özet: taranan sayfa sayısı (EN/TR), cihaz ve yazı boyutu matrisi, toplam
   bulgu, ciddiyete göre dağılım.
   - Kritik: içerik okunamıyor/ulaşılamıyor, yatay kaydırma, form
     kullanılamıyor, menü açılmıyor.
   - Yüksek: üst üste binme, kırpılan metin, kelime içinden kırılma, navbar
     altında kalan başlık.
   - Orta: dokunma hedefi küçük, iOS input zoom, CLS > 0.1, kesik görsel.
   - Düşük: hizalama, boşluk, yazı boyutu tutarsızlığı.
2. Bulgu tablosu: | # | Sayfa (URL, dil) | Cihaz | Yazı boyutu | Bölüm | Bulgu | Ciddiyet | Ekran görüntüsü | Tekrar adımları |
3. Sayfa bazlı konsol tarayıcı çıktıları (yalnız bulgu çıkanlar; tabloyu
   aynen yapıştır).
4. Code component bazlı özet (D listesi; her biri için "temiz" ya da bulgu).
5. Yükleme/CLS gözlemleri ve konsol hataları (sayfa başına).
6. Aynı hatanın tekrar ettiği yerler: bir kere yaz, sayfa listesini ekle.
7. "Kontrol edilmeli" listesi.
8. Ek: taranan URL listesi ve her biri için hangi cihaz/yazı kombinasyonunun
   denendiği (CSV blok).

Kurallar: form gönderme (menü, sekme, modal açmak serbest); yakınlaştırma
ile yazı boyutunu karıştırma; her ekran görüntüsünü sayfa-cihaz-yazı boyutu
ile adlandır (ör. tr-demo-isteyin_393x852_24px.png); aynı hatayı her
sayfada tekrar yazmak yerine grupla; hiçbir bulguyu yumuşatma.
```
