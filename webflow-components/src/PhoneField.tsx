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

.spf-search{flex:0 0 auto;border:0;border-bottom:1px solid
  color-mix(in oklab,currentColor 12%,transparent);
  background:none;color:inherit;font:inherit;font-size:.9em;
  padding:.7em .9em;outline:none}
.spf-search::placeholder{opacity:.5}

.spf-list{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;
  margin:0;padding:.3em;list-style:none}
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
  const rows = React.useMemo(
    () => countryList(allowed, locale, preferred),
    [allowed, locale, preferred]
  );
  const [open, setOpen] = React.useState(false);
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

  /* Tek ülke varsa seçilecek bir şey yok — düz etiket göster. */
  const single = rows.length <= 1;
  const current = rows.find((r) => r.code === country) || rows[0];

  React.useEffect(() => {
    if (!open) return;
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
    <div className={"spf" + (open ? " is-open" : "")} ref={rootEl}>
      <button
        type="button"
        className="spf-btn"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <svg className="spf-caret" viewBox="0 0 10 6" aria-hidden="true">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="spf-panel">
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
        <ul className="spf-list" role="listbox" aria-label={ariaLabel}>
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
