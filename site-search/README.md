# Sestek Site Search — frontend package (drop-in for the cloud app)

Tam sayfa ⌘K site araması: **sıralama motoru + React paleti + kendi kendine
mount olan embed**. Bu klasör tek başına test edilip bundle'lanır; sunucu
tarafı (index API, KV, crawler'ın CI'da çalışması) **Webflow Cloud app
repo'sunda** yapılır — bkz. `docs/sestek-site-search-spec.md`.

```
site-search/
  src/lib/search/      normalize.ts (TR-duyarlı), rank.ts, kinds.ts, messages.ts, types.ts, rank.test.ts
  src/data/            search-seeds.ts — elle bakılan öncelik + eş anlamlılar
  src/components/SiteSearch/
                       SiteSearch.tsx (tam sayfa palet), useSearch.ts, styles.ts, embed.tsx (IIFE giriş)
  scripts/             bundle-search.mjs (esbuild, Preact alias → dist/site-search.v1.js)
                       build-search-index.ts (sitemap crawler — cloud app repo'sundaki CI'da çalışır)
  fixtures-search-index.json   sitemap'ten üretilmiş GEÇİCİ index (başlıklar slug'dan) — sadece test için
```

## Komutlar

```bash
cd site-search && npm install
npm test               # 10 node:test — TR normalizasyon, sıralama, tür kuralları, 500 doküman < 16ms
npm run typecheck
npm run bundle         # dist/site-search.v1.js (~35 KB min, Preact)
npm run index:sitemap  # ../sitemap.xml'den geçici index (sayfa çekmeden)
npm run index -- --site https://www.sestek.com   # gerçek tarama (ağ erişimi olan yerde)
```

## Cloud app repo'suna taşıma (diğer agent için)

1. `src/lib/search`, `src/data`, `src/components/SiteSearch` klasörlerini aynı
   yollara kopyala; `scripts/` ikisini `scripts/` altına koy.
2. `package.json`'a: `"searchVersion": "1.0.0"`, devDeps `esbuild`, `tsx`,
   `preact`; script'ler `search:test`, `search:bundle`, `search:index`,
   `prebuild: node scripts/bundle-search.mjs`. `bundle-search.mjs` içindeki
   çıktı yolunu `public/site-search.v${major}.js` yap.
3. `GET/POST /demos/api/search/index` route'unu, KV binding'ini ve gece
   çalışan crawl workflow'unu spec'e göre yaz (bu paketin dışında).
4. Webflow → Site Settings → Custom Code → Footer:
   `<script defer src="https://www.sestek.com/demos/site-search.v1.js"></script>`;
   nav'daki arama ikonuna `data-search-trigger`.

## Tasarım

Tam sayfa overlay (blur'lu zemin), panel: üstte eyebrow + magenta çerçeveli
büyük arama çubuğu + Esc; gövde iki sütun — solda sonuç listesi (tür rozeti,
`TÜR · /yol` üst satırı, başlıkta vurgulu eşleşme, özet; aktif satır lavanta
zemin + sol magenta çizgi), sağda aktif sonucun önizlemesi (tür chip'i, büyük
başlık, özet, URL, **Sayfayı aç** butonu, yumuşak Sestek gradient'i); altta
klavye ipuçları. 768px altında tek sütun, önizleme gizli. Renk/yarıçap/boşluk
sitenin CSS değişkenlerinden (`--brand-primary--500`, `--surface--light`,
`--radius--lg` …), font sayfadan miras. Asistan yok; boş durumda **Demo
isteyin** + **Bize ulaşın**.

## Davranış

- Açma: `[data-search-trigger]` / `[data-search-open]` tıklaması, ⌘K / Ctrl+K,
  bir alanda yazmıyorken `/`.
- `role=dialog aria-modal`, focus trap, Esc kapatır, odak açan elemana döner,
  sayfa scroll'u kilitlenir, kapanınca sorgu temizlenir.
- Combobox + listbox: ↑↓ döngüsel, Home/End, Enter açar, hover aktif yapar,
  ⌘/Ctrl-tık yeni sekme davranışını korur.
- Index bir kez çekilir (sessionStorage 1 saat); tuş başına ağ isteği yok;
  60ms debounce.
- Locale: `/tr` yolu ya da `<html lang="tr">` → TR metinler ve yalnız TR sonuçlar.
- `prefers-reduced-motion`: açılış animasyonu yok.

## Sıralama (özet)

Başlık tam eşleşme 100 · başlıkta tam sorgu 60 · token başlık başında 40 ·
kelime başında 30 · başlıkta 20 · keyword tam 30 / içinde 12 · özet 8 · yol 6
· tüm token'lar eşleşti +20 · `priority × 0.6` · tür boost (ürün 12, çözüm 10,
öykü 6, kaynak 4, sayfa 3, blog 0). TR katlama: `ç→c ğ→g ı/İ/I→i ö→o ş→s ü→u`
hem sorguya hem dokümanlara.
