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
