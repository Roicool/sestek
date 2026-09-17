/*
 * Turkish-aware text normalisation.
 *
 * Plain `toLowerCase()` + NFD folding gets Turkish wrong in both directions:
 * "I".toLowerCase() → "i" (should be "ı"), and "İ" decomposes into "i" + U+0307.
 * We fold explicitly so "saglik" finds "Sağlık", "Musteri" finds "Müşteri" and
 * "İLETİŞİM" finds "iletisim". Every doc field AND the query go through the same
 * function, so the two sides always agree.
 */

/* Written with \u escapes on purpose: the embed bundle must survive being
   served without a charset header. */
const TR_MAP: Record<string, string> = {
  "\u00e7": "c", "\u00c7": "c",   // ç Ç
  "\u011f": "g", "\u011e": "g",   // ğ Ğ
  "\u0131": "i", "I": "i",         // ı I
  "\u0130": "i", "i\u0307": "i",  // İ  i̇
  "\u00f6": "o", "\u00d6": "o",   // ö Ö
  "\u015f": "s", "\u015e": "s",   // ş Ş
  "\u00fc": "u", "\u00dc": "u",   // ü Ü
};

const TR_RE = /[\u00e7\u00c7\u011f\u011e\u0131I\u0130\u00f6\u00d6\u015f\u015e\u00fc\u00dc]|i\u0307/g;

/*
 * HTML entity decoding.
 *
 * The index is built by stripping tags from the published pages, so any entity
 * the CMS emitted survives as literal text: Webflow writes apostrophes as the
 * HEX reference `&#x27;`, which the old decimal-only decoder left untouched and
 * the palette then printed verbatim ("SESTEK&#x27;s AI Capabilities"). Decoded
 * here, at index load, so ranking, highlight ranges and the rendered text all
 * see the same string — a stale index already on the CDN is fixed too.
 *
 * `&amp;` is decoded LAST: doing it first would turn `&amp;#x27;` (an escaped,
 * literal entity in the copy) into an apostrophe.
 */
const NAMED_ENTITIES: Record<string, string> = {
  lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0",
  rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d",
  sbquo: "\u201a", bdquo: "\u201e", prime: "\u2032",
  ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", bull: "\u2022", middot: "\u00b7",
  trade: "\u2122", reg: "\u00ae", copy: "\u00a9", deg: "\u00b0", euro: "\u20ac", pound: "\u00a3",
  laquo: "\u00ab", raquo: "\u00bb", shy: "", zwj: "\u200d", zwnj: "\u200c",
};

const codePoint = (n: number, raw: string): string =>
  n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : raw;

/*
 * Everything in a page that is markup-shaped but is NOT page content: HTML
 * comments, <script> and <style> blocks. The index builder must drop these
 * before it looks for the <h1>/<title>, because a stylesheet may *mention* a
 * tag in a comment — a Code Component's inline CSS carried the words
 * "the <h1> mirrors the site's h1-style", and the builder's `<h1[^>]*>` then
 * matched there and captured everything up to the real closing </h1>, so the
 * two demo pages were indexed under a title made of CSS source.
 */
export function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ");
}

export function decodeEntities(s: string): string {
  if (!s || s.indexOf("&") < 0) return s;
  return s
    .replace(/&#x([0-9a-f]+);/gi, (raw, hex) => codePoint(parseInt(hex, 16), raw))
    .replace(/&#(\d+);/g, (raw, dec) => codePoint(parseInt(dec, 10), raw))
    .replace(/&([a-z]+);/gi, (raw, name) => {
      const v = NAMED_ENTITIES[String(name).toLowerCase()];
      return v === undefined ? raw : v;
    })
    .replace(/&amp;/gi, "&");
}

export function normalizeText(s: string): string {
  if (!s) return "";
  return s
    .replace(TR_RE, (ch) => TR_MAP[ch] ?? ch)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")     // remaining combining marks (é, â, …)
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split a query into search tokens; drops 1-char tokens and pure punctuation. */
export function tokenize(q: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  normalizeText(q)
    .split(/[^a-z0-9+#]+/)
    .forEach((t) => {
      if (t.length < 2 || seen.has(t)) return;
      seen.add(t);
      out.push(t);
    });
  return out;
}
