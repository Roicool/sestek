/**
 * PhoneField — ülke kodu seçicili telefon alanı (formlar için ortak).
 *
 * Neden kütüphane: ülke kodu, numara uzunluğu ve biçim her ülkede farklı ve
 * sürekli değişiyor. Elle liste tutmak bakım borcu. `libphonenumber-js`
 * Google'ın libphonenumber verisini taşır; buradan `min` metadata sürümü
 * kullanılıyor (en küçüğü, doğrulama için yeterli).
 *
 * Ülke ADLARI kütüphaneden gelmez ve biz de liste taşımıyoruz: tarayıcının
 * `Intl.DisplayNames` desteğinden okunuyor, böylece ziyaretçi ülkeyi kendi
 * dilinde görüyor. Desteklemeyen tarayıcıda ISO kodu gösterilir.
 *
 * Bayrak, ISO kodundan regional indicator karakterlerine çevrilerek üretilir;
 * görsel dosyası yok. Windows'ta bayrak yerine "TR" gibi harfler görünür,
 * bilinçli kabul edildi — yanında zaten arama kodu yazıyor.
 *
 * Liste SUNUCUDA ÜRETİLMEZ, panel ilk kez açıldığında kurulur. Sebebi:
 * `Intl.DisplayNames` sunucudaki Node ile tarayıcının ICU verisi aynı
 * olmadığı için farklı adlar döndürebiliyor (ör. sunucu "Falkland Islands",
 * Chrome "Falkland Islands (Islas Malvinas)"). 245 satırın tamamı sunucu
 * HTML'ine basılırsa React hydration'da uyuşmazlık görüp ağacı atıyor ve
 * yeniden kuruyor; bu sırada seçim state'i sıfırlanıyor ve ziyaretçi
 * "tıklıyorum ama ülke değişmiyor" yaşıyor. Kapalı panelde hiçbir satır
 * çizilmediği için sunucu ve tarayıcı aynı şeyi üretiyor. Yan fayda: her
 * formda 245 satırlık DOM baştan kurulmuyor.
 *
 * Sayfada Lenis smooth scroll çalışıyor (`js/core/lenis-init.js`). Lenis
 * tekerlek olayını belge seviyesinde yakalayıp `preventDefault` ediyor ve
 * kaydırmayı kendisi canlandırıyor; bu yüzden içerideki kaydırılabilir bir
 * alan `overflow-y:auto` ve `overscroll-behavior` olsa bile kaymıyor, sayfa
 * kayıyor. Lenis'in bir alanı kendi haline bırakması için `data-lenis-prevent`
 * işaretini görmesi gerekiyor — panelin tamamına konuyor ki dokunmatikte de
 * çalışsın. Bu bir CSS meselesi değil, olay yakalama meselesi.
 *
 * Liste varsayılan olarak TÜM ülkeleri gösterir; `allowed` ile daraltılabilir
 * (örn. tek pazara açılan bir kampanya sayfası). `preferred` ile sık seçilen
 * birkaç ülke başa alınır, çünkü 200 satırlık alfabetik listede Türkiye'ye
 * kadar kaydırmak kimsenin işine yaramıyor.
 */

import * as React from "react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";

export type { CountryCode };

/* ── Ülke adı ve bayrak ──────────────────────────────────────────── */

let displayNames: Intl.DisplayNames | null | undefined;

function countryName(code: string, locale: string): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames([locale], { type: "region" });
    } catch {
      displayNames = null;
    }
  }
  try {
    return displayNames?.of(code) || code;
  } catch {
    return code;
  }
}

/** ISO 3166 kodunu bayrak emojisine çevirir (TR → 🇹🇷). */
function flag(code: string): string {
  if (code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0))
  );
}

/**
 * Gösterilecek ülkeler. `allowed` boş veya "All" ise hepsi, değilse yalnız
 * verilen ISO kodları (virgül veya boşlukla ayrılmış, sıra korunur).
 */
export function countryList(allowed: string, locale: string, preferred = "") {
  const wanted = (allowed || "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((c) => c.length === 2);

  const all = getCountries();
  const codes =
    wanted.length > 0
      ? wanted.filter((c) => all.indexOf(c as CountryCode) !== -1)
      : [...all];

  const rows = codes.map((c) => ({
    code: c as CountryCode,
    dial: "+" + getCountryCallingCode(c as CountryCode),
    name: countryName(c, locale),
    flag: flag(c),
  }));

  // Kısıtlı listede yazılan sıra korunur; tam listede ada göre sıralanır.
  if (wanted.length > 0) return rows;
  rows.sort((a, b) => a.name.localeCompare(b.name, locale));

  /* Sık kullanılanlar başa. 200 ülkelik alfabetik listede Türkiye'ye kadar
   * kaydırmak kimsenin işine yaramıyor. */
  const top = (preferred || "")
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter((c) => c.length === 2);
  if (top.length === 0) return rows;

  const hoisted = top
    .map((c) => rows.find((r) => r.code === c))
    .filter(Boolean) as typeof rows;
  const seen = new Set(hoisted.map((r) => r.code));
  return [...hoisted, ...rows.filter((r) => !seen.has(r.code))];
}

/* ── Ziyaretçinin ülkesini tahmin et ─────────────────────────────── */

const GEO_CACHE_KEY = "sestek_geo_country";

function readCache(): string {
  try {
    return sessionStorage.getItem(GEO_CACHE_KEY) || "";
  } catch {
    return "";
  }
}
function writeCache(code: string) {
  try {
    sessionStorage.setItem(GEO_CACHE_KEY, code);
  } catch {
    /* private mode — önemli değil, sadece her sayfada tekrar sorulur */
  }
}

/** `navigator.language` içindeki bölge eki: "tr-TR" → "TR". */
function countryFromLanguage(): string {
  if (typeof navigator === "undefined") return "";
  const list = (navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language]) as string[];
  for (const tag of list) {
    const m = /[-_]([A-Za-z]{2})$/.exec(tag || "");
    if (m) return m[1].toUpperCase();
  }
  return "";
}

/**
 * Ziyaretçinin ülkesini bulmaya çalışır. Sırayla:
 *
 *   1. `window.SESTEK_GEO_COUNTRY` — sayfa kendi biliyorsa (ör. sunucu
 *      tarafında basılan tek satır). Ağ isteği yok, en hızlısı.
 *   2. `endpoint` verilmişse oradan `{ country: "TR" }`. Asıl doğru yöntem
 *      budur: IP'yi yalnız sunucu görür. Cloudflare Workers'ta ülke bilgisi
 *      istekle birlikte hazır gelir, ek servis gerekmez.
 *   3. `navigator.language` bölge eki. Ağ isteği yok ama KONUM DEĞİL dil
 *      ayarıdır; Almanya'daki bir ziyaretçi tarayıcısını İngilizce
 *      kullanıyorsa yanlış tahmin eder. Yalnızca son çare.
 *
 * Sonuç oturum boyunca saklanır; her form her sayfada tekrar sormaz.
 * Başarısızlık sessizdir: null döner ve varsayılan ülke kalır.
 */
export async function detectCountry(endpoint = ""): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const cached = readCache();
  if (cached) return cached;

  const g = (window as unknown as { SESTEK_GEO_COUNTRY?: unknown })
    .SESTEK_GEO_COUNTRY;
  if (typeof g === "string" && /^[A-Za-z]{2}$/.test(g)) {
    const code = g.toUpperCase();
    writeCache(code);
    return code;
  }

  if (endpoint) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(endpoint, {
        signal: ctrl.signal,
        credentials: "omit",
      });
      clearTimeout(timer);
      const body = (await res.json().catch(() => ({}))) as { country?: unknown };
      if (typeof body.country === "string" && /^[A-Za-z]{2}$/.test(body.country)) {
        const code = body.country.toUpperCase();
        writeCache(code);
        return code;
      }
    } catch {
      /* ağ yok, zaman aşımı, uç tanımsız — dile düş */
    }
  }

  const lang = countryFromLanguage();
  if (lang) {
    writeCache(lang);
    return lang;
  }
  return null;
}

/**
 * Ülkeyi mount'tan SONRA tespit edip uygular. Render sırasında değil, çünkü
 * sunucu ile tarayıcının farklı sonuç üretmesi hydration'ı kırar.
 * Ziyaretçi seçiciye dokunduysa bir daha üzerine yazmaz.
 */
export function useAutoCountry(
  React: typeof import("react"),
  enabled: boolean,
  endpoint: string,
  allowed: string,
  apply: (c: CountryCode) => void
) {
  const touched = React.useRef(false);
  React.useEffect(() => {
    if (!enabled) return;
    let dead = false;
    detectCountry(endpoint).then((code) => {
      if (dead || !code || touched.current) return;
      const list = (allowed || "").toUpperCase().split(/[^A-Z]+/)
        .filter((c) => c.length === 2);
      if (list.length > 0 && list.indexOf(code) === -1) return;
      if (getCountries().indexOf(code as CountryCode) === -1) return;
      apply(code as CountryCode);
    });
    return () => {
      dead = true;
    };
    // apply/allowed değişmiyor; tespit sayfa başına bir kez koşar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, endpoint]);
  return touched;
}

/* ── Numara mantığı ──────────────────────────────────────────────── */

/** Ülkeye göre yazarken biçimlendirir ("531 407 28 45"). */
export function formatNational(raw: string, country: CountryCode): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  return new AsYouType(country).input(digits);
}

export type PhoneValue = {
  /** Ziyaretçinin gördüğü, biçimlenmiş ulusal numara */
  national: string;
  /** Sunucuya gidecek uluslararası biçim ("+905314072845"), geçersizse "" */
  e164: string;
  valid: boolean;
};

export function readPhone(raw: string, country: CountryCode): PhoneValue {
  const national = formatNational(raw, country);
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return { national, e164: "", valid: false };

  const parsed = parsePhoneNumberFromString(digits, country);
  const valid = !!parsed && parsed.isValid();
  return { national, e164: valid ? parsed!.number : "", valid };
}

/* ── Ülke seçici ─────────────────────────────────────────────────── */

export const PHONE_CSS = `
.spf{position:relative;display:flex;align-items:center;flex:0 0 auto}
.spf-btn{display:flex;align-items:center;gap:.35em;border:0;background:none;
  padding:.35em .5em;margin:0;border-radius:999px;cursor:pointer;
  font:inherit;font-size:.95em;line-height:1;color:inherit;
  transition:background-color .16s ease}
.spf-btn:hover{background:color-mix(in oklab,currentColor 8%,transparent)}
.spf-btn:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.spf-flag{font-size:1.15em;line-height:1}
.spf-dial{font-variant-numeric:tabular-nums;opacity:.85}
.spf-caret{width:.5em;height:.5em;flex:0 0 auto;opacity:.5;
  transition:transform .16s ease}
.spf.is-open .spf-caret{transform:rotate(180deg)}

.spf-panel{position:absolute;z-index:40;top:calc(100% + .5rem);left:0;
  width:min(20rem,78vw);max-height:17rem;display:flex;flex-direction:column;
  border-radius:var(--radius--xl,14px);overflow:hidden;
  background:var(--spf-bg,#fff);color:var(--spf-fg,#101014);
  box-shadow:0 1px 0 0 rgba(0,0,0,.06) inset,0 16px 40px -12px rgba(0,0,0,.28),
    0 0 0 1px rgba(0,0,0,.08);
  opacity:0;transform:translateY(-.35rem);pointer-events:none;
  visibility:hidden;transition:opacity .16s ease,transform .16s ease,
    visibility 0s linear .16s}
.spf.is-open .spf-panel{opacity:1;transform:none;pointer-events:auto;
  visibility:visible;transition:opacity .16s ease,transform .16s ease,
    visibility 0s}
/* Altta yer yoksa yukarı açılır — panel ekranın dışında kalmasın. */
.spf.is-up .spf-panel{top:auto;bottom:calc(100% + .5rem);
  transform:translateY(.35rem)}
.spf.is-up.is-open .spf-panel{transform:none}

.spf-search{flex:0 0 auto;border:0;border-bottom:1px solid
  color-mix(in oklab,currentColor 12%,transparent);
  background:none;color:inherit;font:inherit;font-size:.9em;
  padding:.7em .9em;outline:none}
.spf-search::placeholder{opacity:.5}

/* min-height:0 ŞART: flex öğesinin varsayılan min-height'ı "auto" olduğu
 * için liste kendi içeriği kadar uzuyor, panelin max-height'ı içinde
 * küçülmüyor ve overflow-y hiç devreye girmiyordu. Sonuç: tekerlek listeye
 * değil sayfaya gidiyordu. */
.spf-list{flex:1 1 auto;min-height:0;overflow-y:auto;
  overscroll-behavior:contain;margin:0;padding:.3em;list-style:none;
  -webkit-overflow-scrolling:touch}
.spf-opt{display:flex;align-items:center;gap:.55em;width:100%;border:0;
  background:none;color:inherit;font:inherit;font-size:.9em;text-align:left;
  padding:.5em .6em;border-radius:var(--radius--md,8px);cursor:pointer}
.spf-opt:hover,.spf-opt.is-active{background:color-mix(in oklab,currentColor 9%,transparent)}
.spf-opt[aria-selected="true"]{font-weight:600}
.spf-name{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap}
.spf-opt .spf-dial{flex:0 0 auto;font-size:.95em}
.spf-empty{padding:.9em;font-size:.85em;opacity:.6}

@media (prefers-reduced-motion:reduce){
  .spf-panel,.spf-caret{transition-duration:.01ms}
}
`;

type PickerProps = {
  country: CountryCode;
  onChange: (c: CountryCode) => void;
  /** Boş veya "All" → tüm ülkeler; "TR" / "TR,GB,DE" → yalnız bunlar */
  allowed?: string;
  preferred?: string;
  locale?: string;
  searchLabel?: string;
  emptyLabel?: string;
  ariaLabel?: string;
};

export function CountryPicker({
  country,
  onChange,
  allowed = "",
  preferred = "",
  locale = "en",
  searchLabel = "Search",
  emptyLabel = "No match",
  ariaLabel = "Country code",
}: PickerProps) {
  /* Panel bir kez açılana kadar liste kurulmaz (yukarıdaki hydration notu). */
  const [built, setBuilt] = React.useState(false);
  const rows = React.useMemo(
    () => (built ? countryList(allowed, locale, preferred) : []),
    [built, allowed, locale, preferred]
  );
  const [open, setOpen] = React.useState(false);
  const [up, setUp] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootEl = React.useRef<HTMLDivElement>(null);
  const searchEl = React.useRef<HTMLInputElement>(null);

  const shown = React.useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^\+/, "");
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.code.toLowerCase().includes(needle) ||
        r.dial.slice(1).startsWith(needle)
    );
  }, [rows, q]);

  /* Tetikleyicinin etiketi listeden BAĞIMSIZ hesaplanır: yalnız seçili
   * ülkenin bayrağı ve arama kodu gerekir, ülke adı gerekmez. Böylece kapalı
   * panelde de doğru görünür ve sunucu ile tarayıcı aynı şeyi üretir. */
  const codes = React.useMemo(
    () => (allowed || "").toUpperCase().split(/[^A-Z]+/)
      .filter((c) => c.length === 2),
    [allowed]
  );
  const current = React.useMemo(() => {
    const code = (codes.length > 0 && codes.indexOf(country) === -1
      ? codes[0]
      : country) as CountryCode;
    try {
      return { code, dial: "+" + getCountryCallingCode(code), flag: flag(code) };
    } catch {
      return null;
    }
  }, [country, codes]);

  /* Tek ülkeye kısıtlıysa seçilecek bir şey yok — düz etiket göster. */
  const single = codes.length === 1;

  React.useEffect(() => {
    if (!open) return;

    /* Panel yüksekliği kadar yer var mı? Yoksa yukarı aç. */
    const btn = rootEl.current?.getBoundingClientRect();
    if (btn) {
      const panelH = 17 * 16 + 8;                 // max-height + boşluk
      const below = window.innerHeight - btn.bottom;
      setUp(below < panelH && btn.top > below);
    }

    searchEl.current?.focus();
    setActive(0);
    const onDocDown = (e: MouseEvent) => {
      if (!rootEl.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!current) return null;

  const pick = (c: CountryCode) => {
    onChange(c);
    setOpen(false);
    setQ("");
  };

  const label = (
    <>
      <span className="spf-flag" aria-hidden="true">{current.flag}</span>
      <span className="spf-dial">{current.dial}</span>
    </>
  );

  if (single) {
    return (
      <div className="spf">
        <span className="spf-btn" aria-hidden="true">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={"spf" + (open ? " is-open" : "") + (up ? " is-up" : "")}
      ref={rootEl}
    >
      <button
        type="button"
        className="spf-btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setBuilt(true); setOpen((v) => !v); }}
      >
        {label}
        <svg className="spf-caret" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="spf-panel" data-lenis-prevent>
        <input
          ref={searchEl}
          className="spf-search"
          type="text"
          value={q}
          placeholder={searchLabel}
          aria-label={searchLabel}
          onChange={(e) => { setQ(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, shown.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (shown[active]) pick(shown[active].code);
            }
          }}
        />
        <ul
          className="spf-list"
          role="listbox"
          aria-label={ariaLabel}
          data-lenis-prevent
        >
          {shown.map((r, i) => (
            <li key={r.code}>
              <button
                type="button"
                role="option"
                aria-selected={r.code === country}
                className={"spf-opt" + (i === active ? " is-active" : "")}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(r.code)}
              >
                <span className="spf-flag" aria-hidden="true">{r.flag}</span>
                <span className="spf-name">{r.name}</span>
                <span className="spf-dial">{r.dial}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="spf-empty">{emptyLabel}</li>}
        </ul>
      </div>
    </div>
  );
}
