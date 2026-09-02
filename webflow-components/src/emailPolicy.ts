/**
 * emailPolicy — kurumsal e-posta politikası (CRM formları için ortak).
 *
 * İki ayrı liste var, ikisi farklı amaca hizmet eder:
 *
 *   FREE       ücretsiz tüketici sağlayıcıları (gmail, hotmail, yandex…).
 *              B2B niyetli formlarda (Bize Ulaşın, Demo, Opus Report)
 *              engellenir; Newsletter'da SERBEST bırakılır, çünkü orası
 *              huninin en üstü ve gmail ile abone olan çoktur.
 *   DISPOSABLE tek kullanımlık / geçici adresler (mailinator, yopmail…).
 *              HER formda engellenir, hiçbir formda karşılığı yok.
 *
 * Bu bir KALİTE FİLTRESİDİR, güvenlik kontrolü değil: kendi alan adını alan
 * biri listeyi kolayca aşar. Kötüye kullanım için rate limit ve Turnstile
 * gerekir. Ayrıca istemci tarafı doğrulaması curl ile atlanır, bu yüzden
 * AYNI kontrol sunucuda da uygulanmalıdır (bkz. docs/CRM-LEAD-API-SPEC.md).
 */

export type EmailVerdict = "ok" | "invalid" | "free" | "disposable";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* Ücretsiz tüketici sağlayıcıları. Liste kısa tutuldu: en yaygın olanlar
 * artı TR'de sık görülenler. Asıl/güncel liste sunucuda tutulur. */
const FREE = new Set([
  "gmail.com", "googlemail.com",
  "hotmail.com", "hotmail.co.uk", "hotmail.com.tr", "hotmail.fr", "hotmail.it",
  "outlook.com", "outlook.com.tr", "outlook.fr", "outlook.de",
  "live.com", "live.com.tr", "live.co.uk", "msn.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.com.tr", "yahoo.fr", "ymail.com",
  "rocketmail.com",
  "icloud.com", "me.com", "mac.com",
  "aol.com",
  "proton.me", "protonmail.com", "pm.me",
  "gmx.com", "gmx.net", "gmx.de", "mail.com",
  "zoho.com", "zoho.eu",
  "yandex.com", "yandex.ru", "yandex.com.tr",
  "mail.ru", "inbox.ru", "list.ru", "bk.ru",
  "qq.com", "163.com", "126.com", "naver.com", "daum.net", "hanmail.net",
  "web.de", "t-online.de", "freenet.de",
  "orange.fr", "free.fr", "laposte.net", "wanadoo.fr",
  "libero.it", "virgilio.it", "tiscali.it", "alice.it",
  "seznam.cz", "wp.pl", "o2.pl", "interia.pl", "onet.pl", "abv.bg",
  "sapo.pt", "terra.com.br", "uol.com.br", "bol.com.br",
  "rediffmail.com", "fastmail.com", "hushmail.com",
  "mynet.com", "e-kolay.net", "yaani.com", "ttmail.com",
]);

/* Tek kullanımlık adresler. Alt alan adlarını da yakalamak için ayrıca
 * sonek kontrolü yapılır (ör. foo.mailinator.com). */
const DISPOSABLE = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "guerrillamail.info",
  "sharklasers.com", "grr.la", "spam4.me",
  "10minutemail.com", "10minutemail.net", "tempmail.com", "temp-mail.org",
  "temp-mail.io", "tempr.email", "mytemp.email", "emailondeck.com",
  "throwawaymail.com", "trashmail.com", "dispostable.com", "maildrop.cc",
  "mailnesia.com", "fakeinbox.com", "tempinbox.com", "spamgourmet.com",
  "getnada.com", "nada.email", "moakt.com", "mohmal.com", "discard.email",
  "mailcatch.com", "inboxkitten.com", "harakirimail.com", "mailsac.com",
  "burnermail.io", "luxusmail.org", "vomoto.com", "byom.de",
]);

function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

function isDisposable(domain: string): boolean {
  if (DISPOSABLE.has(domain)) return true;
  for (const d of DISPOSABLE) {
    if (domain.endsWith("." + d)) return true;
  }
  return false;
}

/**
 * E-postayı sınıflandırır.
 * @param raw       kullanıcının girdiği değer
 * @param allowFree Newsletter gibi formlarda true; ücretsiz sağlayıcı serbest
 */
export function classifyEmail(raw: string, allowFree: boolean): EmailVerdict {
  const email = (raw || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return "invalid";

  const domain = domainOf(email);
  if (isDisposable(domain)) return "disposable";
  if (!allowFree && FREE.has(domain)) return "free";
  return "ok";
}
