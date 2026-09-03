/**
 * NewsletterForm — tek alanlı e-posta kayıt pill'i (Newsletter).
 *
 * Referans: tek pill içinde solda e-posta input'u, sağda renkli buton,
 * altta küçük caption. Demo Request Form ile aynı görsel dil (hairline,
 * RC token köprüleri, font sayfadan miras).
 *
 * Variant'lar:
 *   Type   — Subscribe: CRM'e newsletter kaydı gönderir
 *            Demo: e-postayı alıp demoUrl sayfasına ?email=… ile taşır;
 *            Demo Request Form oradaki Business email alanını bununla
 *            önceden doldurur. İstek atılmaz, honeypot/consent gerekmez.
 *   Align  — Left | Center (pill + caption hizası)
 *   Accent — SESTEK marka paleti: Magenta #EC008C | Lilac #7F81AE |
 *            Turquoise #00FFEB | Gradient (üçünün geçişi)
 *   Theme  — Soft | Deep
 *
 * Subscribe modunda CRM'e DOĞRUDAN gönderir (CRMFORMSREPORT.md,
 * formType frm-newsletter):
 *   { formType, emailaddress1, pageUrl, utm, hp }
 * UTM'ler sticky-utms'in "sestek_utms" sessionStorage anahtarından okunur.
 * Honeypot doluysa istek çıkmaz ama başarı gösterilir. Başarıda pill'in
 * içeriği onay mesajına döner.
 */
import * as React from "react";
import { classifyEmail } from "./emailPolicy";
import { createTurnstile } from "./turnstile";
import { errorCode } from "./apiError";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";
type Align = "Left" | "Center";
type Accent = "Magenta" | "Lilac" | "Turquoise" | "Gradient";
type Mode = "Subscribe" | "Demo";

export interface NewsletterFormProps {
  theme?: Theme;
  mode?: Mode;
  align?: Align;
  accent?: Accent;
  demoUrl?: string;
  placeholder?: string;
  buttonText?: string;
  sendingText?: string;
  caption?: string;
  successText?: string;
  endpoint?: string;
  formType?: string;
  freeEmail?: "Block" | "Allow";
  turnstileSiteKey?: string;
  lang?: Lang;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_email: "Lütfen geçerli bir e-posta girin.",
    disposable_email: "Geçici e-posta adresleri kabul edilmiyor.",
    free_email: "Lütfen kurumsal e-posta adresinizi kullanın.",
    captcha_failed: "Güvenlik doğrulaması tamamlanamadı — lütfen tekrar deneyin.",
    rate_limited: "Kısa süre önce bir istek gönderdiniz — lütfen biraz sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin.",
  },
  EN: {
    invalid_email: "Please enter a valid email.",
    disposable_email: "Temporary email addresses aren't accepted.",
    free_email: "Please use your work email address.",
    captcha_failed: "Security check could not be completed — please try again.",
    rate_limited: "You just sent a request — please try again in a few minutes.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
  },
};

/* sticky-utms.js'in yazdığı anahtar */
const UTM_STORAGE_KEY = "sestek_utms";
function readUtms(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    const utms = raw ? JSON.parse(raw) : null;
    return utms && typeof utms === "object" ? utms : null;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CSS = `
.snlf{--n-text:var(--color-text--base,#17151f);
  --n-muted:var(--color-text--muted,#8b8894);
  --n-pill:color-mix(in oklab,var(--n-text) 4%,#fff);
  --n-line:rgba(20,18,30,.08);--n-neg:#c9463a;
  --n-btn:#EC008C;--n-btn-h:#d3007d;--n-btn-fg:#fff;--n-ok:#EC008C;
  color:var(--n-text);font:inherit;max-width:30rem}
.snlf.is-deep{--n-text:#f4f2fb;--n-muted:#a09aba;
  --n-pill:#211d33;--n-line:rgba(255,255,255,.11);--n-neg:#ff8274}
/* SESTEK paleti */
.snlf.ac-lilac{--n-btn:#7F81AE;--n-btn-h:#6f719e;--n-btn-fg:#fff;--n-ok:#7F81AE}
.snlf.ac-turq{--n-btn:#00FFEB;--n-btn-h:#00e8d6;--n-btn-fg:#17151f;--n-ok:#00b5a7}
.snlf.ac-grad{--n-btn-fg:#fff;--n-ok:#EC008C}
.snlf.ac-grad .snlf-btn{
  background:linear-gradient(100deg,#EC008C 0%,#7F81AE 55%,#00FFEB 130%)}
.snlf.ac-grad .snlf-btn:hover{filter:brightness(.94)}
.snlf *{box-sizing:border-box}
.snlf.is-center{margin-inline:auto}

/* ── Pill ──────────────────────────────────────────────────── */
.snlf-pill{display:flex;align-items:stretch;gap:.35rem;
  padding:.3rem;border-radius:var(--radius--full,9999px);
  background:var(--n-pill);box-shadow:inset 0 0 0 1px var(--n-line);
  transition:box-shadow .2s}
.snlf-pill:focus-within{box-shadow:inset 0 0 0 1px var(--n-text)}
.snlf.is-invalid .snlf-pill{box-shadow:inset 0 0 0 1px var(--n-neg)}
.snlf-input{flex:1;min-width:0;font:inherit;
  font-size:var(--text--sm,.875rem);color:var(--n-text);
  background:transparent;border:0;outline:none;
  padding:.5em 0 .5em 1.1em}
.snlf-input::placeholder{color:var(--n-muted)}
.snlf-btn{flex:none;font:inherit;font-size:var(--text--sm,.875rem);
  font-weight:500;color:var(--n-btn-fg);border:0;cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;gap:.5em;
  padding:.55em 1.25em;border-radius:var(--radius--full,9999px);
  background:var(--n-btn);white-space:nowrap;
  transition:background .2s,transform .2s}
.snlf-btn:hover{background:var(--n-btn-h);transform:translateY(-1px)}
.snlf-btn:active{transform:none}
.snlf-btn:disabled{cursor:default;opacity:.7;transform:none}
.snlf-spin{width:1em;height:1em;flex:none;border-radius:50%;
  border:2px solid color-mix(in oklab,var(--n-btn-fg) 35%,transparent);
  border-top-color:var(--n-btn-fg);animation:snlf-rot .7s linear infinite}
@keyframes snlf-rot{to{transform:rotate(360deg)}}

/* ── Başarı: pill içeriği onaya döner ──────────────────────── */
.snlf-ok{display:flex;align-items:center;gap:.6em;flex:1;
  padding:.55em 1.1em;font-size:var(--text--sm,.875rem);
  animation:snlf-in .4s cubic-bezier(.22,1,.36,1)}
@keyframes snlf-in{from{opacity:0;transform:translateY(6px)}
  to{opacity:1;transform:none}}
.snlf-ok svg{flex:none;width:1.05em;height:1.05em;color:var(--n-ok)}

/* ── Alt satırlar ──────────────────────────────────────────── */
.snlf-cap{margin:.6rem .25rem 0;font-size:var(--text--xs,.75rem);
  line-height:1.5;color:var(--n-muted)}
.snlf-err{margin:.55rem .25rem 0;font-size:var(--text--xs,.75rem);
  line-height:1.5;color:var(--n-neg)}
.snlf.is-center .snlf-cap,.snlf.is-center .snlf-err{text-align:center}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:479px){
  .snlf-pill{flex-direction:column;align-items:stretch;gap:.35rem;
    border-radius:var(--radius--2xl,20px)}
  .snlf-input{padding:.6em 1em;text-align:inherit}
  .snlf-btn{width:100%}
  .snlf.is-center .snlf-input{text-align:center}
}
@media (prefers-reduced-motion:reduce){
  .snlf-spin{animation:none}
  .snlf-ok{animation:none}
}
.snlf-ts{margin-top:var(--spacing--3,.75rem)}
.snlf-ts:empty{display:none;margin:0}
`;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function NewsletterForm({
  theme = "Soft",
  mode = "Subscribe",
  align = "Left",
  accent = "Magenta",
  demoUrl = "/request-a-demo",
  placeholder = "What's your work email?",
  buttonText = "Subscribe",
  sendingText = "Sending…",
  caption = "AI-powered CX insights in your inbox — no spam, unsubscribe anytime.",
  successText = "You're in — see you in your inbox.",
  endpoint = "/demos/api/crm/lead",
  formType = "frm-newsletter",
  freeEmail = "Allow",
  turnstileSiteKey = "",
  lang = "EN",
}: NewsletterFormProps) {
  /* Turnstile — site key boşsa hiçbir şey olmaz (script bile yüklenmez). */
  const ts = createTurnstile(React, turnstileSiteKey);

  const [email, setEmail] = React.useState("");
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const t = MESSAGES[lang] || MESSAGES.EN;
  const msg = (code: string) => t[code] || t.generic;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    setError(null);

    const clean = email.trim().toLowerCase();
    /* Newsletter huninin en ustu: ucretsiz saglayicilar SERBEST (freeEmail
     * varsayilani "Allow"), yalnizca tek kullanimlik adresler engellenir. */
    const verdict = classifyEmail(clean, freeEmail === "Allow");
    if (verdict === "invalid") return setError(msg("invalid_email"));
    if (verdict === "disposable") return setError(msg("disposable_email"));
    if (verdict === "free") return setError(msg("free_email"));

    /* Demo modu: kayıt yok — e-postayı demo sayfasına taşı; Demo Request
     * Form ?email parametresini Business email alanına önceden doldurur. */
    if (mode === "Demo") {
      const sep = demoUrl.indexOf("?") === -1 ? "?" : "&";
      location.href = demoUrl + sep + "email=" + encodeURIComponent(clean);
      return;
    }

    /* Honeypot doluysa (bot) istek atmadan başarı göster. */
    if (hp) {
      setDone(true);
      return;
    }

    const payload: Record<string, unknown> = {
      formType,
      emailaddress1: clean,
      pageUrl: location.href,
      hp: "",
    };
    const utms = readUtms();
    if (utms) payload.utm = utms;

    setSending(true);
    /* Turnstile jetonu istekle birlikte gider; anahtar yoksa "" olur ve
     * akış hiç değişmez. Doğrulama sunucuda yapılır. */
    ts.getToken()
      .then((turnstileToken) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, turnstileToken }),
        })
      )
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.ok !== false) {
          setDone(true);
        } else if (res.status === 429) {
          setError(msg("rate_limited"));
        } else {
          setError(msg(errorCode(body)));
        }
      })
      .catch(() => setError(msg("network")))
      .finally(() => {
        setSending(false);
        ts.reset(); // jetonlar tek kullanımlık
      });
  }

  const cls =
    "snlf" +
    (theme === "Deep" ? " is-deep" : "") +
    (align === "Center" ? " is-center" : "") +
    (accent === "Lilac" ? " ac-lilac"
      : accent === "Turquoise" ? " ac-turq"
      : accent === "Gradient" ? " ac-grad" : "") +
    (error ? " is-invalid" : "");

  return (
    <div className={cls}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <form onSubmit={submit} noValidate aria-busy={sending}>
        <div className="snlf-pill">
          {!done ? (
            <>
              <input
                className="snlf-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={placeholder}
                aria-label={placeholder}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
              />
              <button className="snlf-btn" type="submit" disabled={sending}>
                {sending && <span className="snlf-spin" aria-hidden="true" />}
                {sending ? sendingText : buttonText}
              </button>
            </>
          ) : (
            <div className="snlf-ok" role="status">
              <CheckIcon />
              {successText}
            </div>
          )}
        </div>
        {/* honeypot — görünmez, botlar doldurur */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
          value={hp}
          onChange={(e) => setHp(e.target.value)}
        />
        {error && <div className="snlf-err" role="alert">{error}</div>}
        {/* Turnstile — appearance interaction-only, yalnız meydan okuma
            gerektiğinde görünür; aksi halde yer kaplamaz. */}
        {ts.enabled && <div className="snlf-ts" ref={ts.slotRef} />}
        {caption && !done && <div className="snlf-cap">{caption}</div>}
      </form>
    </div>
  );
}
