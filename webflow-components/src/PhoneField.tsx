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

/**
 * Canlıda konsoldan okunabilen sürüm damgası:
 *   document.querySelector("[data-spf-v]").dataset.spfV
 * Paket sürümüyle birlikte artırılır. "Eski sürüm mü test ediliyor"
 * belirsizliğini bitirmek için var.
 */
export const PHONE_FIELD_VERSION = "1.11.0";

/**
 * NEDEN NATİVE <select>:
 * Özel açılır panel canlı Webflow sayfasında üç ayrı kez kırıldı (Lenis'in
 * tekerleği yutması, sunucu/tarayıcı ICU farkından hydration uyuşmazlığı, ve
 * yerinde teşhis edilemeyen bir üçüncü sebep). Her düzeltme yeni bir yayın
 * döngüsü ve yeni bir "hâlâ çalışmıyor" üretti.
 *
 * Tarayıcının kendi <select>'i bunların hiçbirine maruz kalmaz: açılır liste
 * işletim sistemi tarafından çizilir, sayfanın kaydırma kütüphanesi, z-index
 * bağlamı, dış tıklama dinleyicisi veya Webflow etkileşimleri ona dokunamaz.
 * Klavye, ekran okuyucu ve mobil destek bedavaya gelir. Yazarak arama (type
 * ahead) tarayıcıda hazırdır.
 *
 * Görünüm: ziyaretçi bizim çizdiğimiz bayrak + arama kodu çipini görür;
 * şeffaf <select> onun ÜSTÜNDE oturur ve tıklamayı alır. Stripe ve benzeri
 * ödeme formlarının kullandığı kalıp.
 *
 * Seçenekler mount'tan SONRA kurulur (aşağıdaki hydration notu): sunucu boş
 * bir <select> basar, tarayıcı da ilk render'da boş basar, sonra effect
 * doldurur. Böylece ülke adlarının sunucu/tarayıcı farkı hydration'a hiç
 * girmez.
 */

export const PHONE_CSS = `
.spf{position:relative;display:inline-flex;align-items:center;flex:0 0 auto}
.spf-btn{display:flex;align-items:center;gap:.35em;border:0;background:none;
  padding:.35em .5em;margin:0;border-radius:999px;
  font:inherit;font-size:.95em;line-height:1;color:inherit;
  transition:background-color .16s ease;pointer-events:none}
.spf:hover .spf-btn{background:color-mix(in oklab,currentColor 8%,transparent)}
.spf:focus-within .spf-btn{outline:2px solid currentColor;outline-offset:2px}
.spf-flag{font-size:1.15em;line-height:1}
.spf-dial{font-variant-numeric:tabular-nums;opacity:.85}
.spf-caret{width:.5em;height:.5em;flex:0 0 auto;opacity:.5}
/* Şeffaf native select çipin üstünde: tıklamayı o alır, görüntüyü çip verir. */
.spf-select{position:absolute;inset:0;width:100%;height:100%;margin:0;
  padding:0;border:0;opacity:0;cursor:pointer;font:inherit;
  -webkit-appearance:none;appearance:none}
.spf-select:disabled{cursor:default}
`;

type PickerProps = {
  country: CountryCode;
  onChange: (c: CountryCode) => void;
  /** Boş → tüm ülkeler; "TR" / "TR,GB,DE" → yalnız bunlar */
  allowed?: string;
  preferred?: string;
  locale?: string;
  /** Tercih edilenler grubunun başlığı (optgroup) */
  preferredLabel?: string;
  /** Diğer ülkeler grubunun başlığı (optgroup) */
  allLabel?: string;
  ariaLabel?: string;
  /** Geriye uyumluluk — artık kullanılmıyor (native select'te arama tarayıcıda) */
  searchLabel?: string;
  emptyLabel?: string;
};

function parseCodes(v: string): string[] {
  return (v || "").toUpperCase().split(/[^A-Z]+/).filter((c) => c.length === 2);
}

export function CountryPicker({
  country,
  onChange,
  allowed = "",
  preferred = "",
  locale = "en",
  preferredLabel = "",
  allLabel = "",
  ariaLabel = "Country code",
}: PickerProps) {
  /* Seçenekler mount'tan sonra kurulur — sunucu ve ilk tarayıcı render'ı
   * boş bir <select> üretir, hydration uyuşmazlığı imkânsız hale gelir. */
  const [built, setBuilt] = React.useState(false);
  React.useEffect(() => {
    setBuilt(true);
  }, []);

  const codes = React.useMemo(() => parseCodes(allowed), [allowed]);
  const single = codes.length === 1;

  const rows = React.useMemo(
    () => (built ? countryList(allowed, locale, preferred) : []),
    [built, allowed, locale, preferred]
  );
  const prefCodes = React.useMemo(() => parseCodes(preferred), [preferred]);
  const top = codes.length === 0 ? rows.filter((r) => prefCodes.indexOf(r.code) !== -1) : [];
  const rest = codes.length === 0 ? rows.filter((r) => prefCodes.indexOf(r.code) === -1) : rows;

  /* Çip, listeden BAĞIMSIZ: yalnız seçili ülkenin bayrağı + kodu. */
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

  if (!current) return null;

  const option = (r: { code: CountryCode; name: string; dial: string; flag: string }) => (
    <option key={r.code} value={r.code}>
      {r.flag} {r.name} ({r.dial})
    </option>
  );

  return (
    <div className="spf" data-spf-v={PHONE_FIELD_VERSION}>
      <span className="spf-btn" aria-hidden="true">
        <span className="spf-flag">{current.flag}</span>
        <span className="spf-dial">{current.dial}</span>
        {!single && (
          <svg className="spf-caret" viewBox="0 0 10 6" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor"
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {!single && (
        <select
          className="spf-select"
          aria-label={ariaLabel}
          value={built ? current.code : ""}
          onChange={(e) => {
            const v = e.target.value as CountryCode;
            if (v) onChange(v);
          }}
        >
          {/* Mount öncesi tek boş seçenek: value="" ile eşleşir, uyarı çıkmaz */}
          {!built && <option value="" />}
          {built && top.length > 0 && (
            preferredLabel
              ? <optgroup label={preferredLabel}>{top.map(option)}</optgroup>
              : top.map(option)
          )}
          {built && (
            allLabel && top.length > 0
              ? <optgroup label={allLabel}>{rest.map(option)}</optgroup>
              : rest.map(option)
          )}
        </select>
      )}
    </div>
  );
}
