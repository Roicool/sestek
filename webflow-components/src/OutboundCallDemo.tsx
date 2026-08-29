/**
 * OutboundCallDemo — "Sizi arayalım" canlı demo section'ı.
 *
 * Solda içerik (eyebrow + başlık + açıklama + maddeler), sağda cam-beyaz bir
 * form kartı; mobilde tek kolona düşer. container-2xl genişliğine oturur.
 * Görsel dil RC token'larına bağlıdır (var(--token, fallback)) — Webflow
 * sayfasında gerçek marka değerleri otomatik kaskadlanır, fallback'ler
 * Sestek pastel paletidir.
 *
 * Davranış js/components/outbound-demo.js ile birebir aynı sözleşmededir
 * (docs/outbound-demo-api.md): TR telefon normalizasyonu, KVKK onayı,
 * honeypot, JSON POST, sunucu hata kodları, localStorage'da kalıcı cooldown
 * (AYNI "sestek-od" anahtarı — vanilla formla limiti paylaşır).
 */
import * as React from "react";

type Lang = "TR" | "EN";

export interface OutboundCallDemoProps {
  eyebrow?: string;
  heading?: string;
  description?: string;
  bullet1?: string;
  bullet2?: string;
  bullet3?: string;
  nameLabel?: string;
  phoneLabel?: string;
  consentText?: string;
  buttonText?: string;
  successTitle?: string;
  successText?: string;
  endpoint?: string;
  lang?: Lang;
  cooldownSeconds?: number;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_name: "Lütfen adınızı girin.",
    invalid_phone: "Lütfen geçerli bir cep telefonu girin (05XX XXX XX XX).",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    rate_limited: "Kısa süre önce bir arama istediniz — lütfen biraz sonra tekrar deneyin.",
    not_configured: "Demo şu an kullanılamıyor, lütfen daha sonra deneyin.",
    upstream: "Arama başlatılamadı, lütfen daha sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin.",
  },
  EN: {
    invalid_name: "Please enter your name.",
    invalid_phone: "Please enter a valid mobile number (05XX XXX XX XX).",
    consent_required: "Please tick the consent box to continue.",
    rate_limited: "You requested a call just now — please try again in a few minutes.",
    not_configured: "The demo is unavailable right now, please try again later.",
    upstream: "We couldn't start the call, please try again later.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
  },
};

/** TR cep numarasını "05XXXXXXXXX" biçimine normalize eder; olmuyorsa null. */
function normalizePhone(raw: string): string | null {
  let d = (raw || "").replace(/[\s().-]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("5") && d.length === 10) d = "0" + d;
  return /^05\d{9}$/.test(d) ? d : null;
}

/* Kalıcı gönderim kaydı — vanilla outbound-demo.js ile AYNI anahtar. */
const STORE_KEY = "sestek-od";
type Store = { last?: number; phones?: Record<string, number> };
function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* storage kapalı */
  }
  return {};
}
function recordSubmit(phone: string) {
  const s = readStore();
  const now = Date.now();
  s.last = now;
  s.phones = s.phones || {};
  s.phones[phone] = now;
  for (const k of Object.keys(s.phones)) {
    if (now - s.phones[k] > 86400000) delete s.phones[k];
  }
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage kapalı */
  }
}
function cooldownLeft(phone: string, perPhoneMs: number): number {
  const s = readStore();
  const now = Date.now();
  let left = Math.max(0, (s.last || 0) + 60000 - now);
  const t = s.phones?.[phone];
  if (t) left = Math.max(left, t + perPhoneMs - now);
  return left;
}

const CSS = `
.sodc{max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--6,1.5rem);font:inherit;color:var(--color-text--base,#17161f)}
.sodc *{box-sizing:border-box}
.sodc-card{position:relative;isolation:isolate;overflow:hidden;
  border-radius:var(--radius--3xl,24px);
  background:
    radial-gradient(52rem 30rem at 8% 0%,color-mix(in oklab,var(--brand-primary--300,#c9b8ff) 34%,transparent),transparent 62%),
    radial-gradient(46rem 30rem at 100% 100%,color-mix(in oklab,var(--brand-secondary--300,#a8d8ff) 30%,transparent),transparent 60%),
    var(--surface--muted,#f5f3f7);
  box-shadow:inset 0 0 0 1px color-mix(in oklab,var(--color-text--base,#000) 6%,transparent);
  display:grid;grid-template-columns:1.05fr 1fr;
  gap:var(--spacing--12,3rem);align-items:center;
  padding:var(--spacing--16,4rem) var(--spacing--14,3.5rem)}
.sodc-copy{max-width:36rem}
.sodc-eyebrow{display:inline-flex;align-items:center;gap:.5em;
  font-size:var(--text--sm,.875rem);font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;color:var(--color-text--accent,#5b4ee5);
  background:var(--surface--base,#fff);border-radius:var(--radius--full,9999px);
  padding:.45em 1em;box-shadow:0 1px 6px rgba(0,0,0,.06)}
.sodc-dot{width:.5em;height:.5em;border-radius:50%;
  background:var(--interactive--color-accent-base,#e5654e);
  animation:sodc-pulse 1.6s ease-in-out infinite}
@keyframes sodc-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.35);opacity:.55}}
.sodc-h{margin:var(--spacing--6,1.5rem) 0 0;
  font-size:var(--heading--h2,var(--text--4xl,2.25rem));font-weight:600;
  line-height:1.12;letter-spacing:-.02em}
.sodc-p{margin:var(--spacing--5,1.25rem) 0 0;
  font-size:var(--text--lg,1.125rem);line-height:1.6;
  color:var(--color-text--muted,#5f5c6b)}
.sodc-list{list-style:none;margin:var(--spacing--8,2rem) 0 0;padding:0;
  display:grid;gap:var(--spacing--4,1rem)}
.sodc-list li{display:flex;gap:.75em;align-items:flex-start;
  font-size:var(--text--base,1rem);line-height:1.5}
.sodc-check{flex:none;width:1.35em;height:1.35em;margin-top:.05em;
  border-radius:50%;display:grid;place-items:center;
  background:color-mix(in oklab,var(--interactive--color-primary-base,#5b4ee5) 14%,transparent);
  color:var(--interactive--color-primary-base,#5b4ee5)}
.sodc-form-wrap{position:relative}
.sodc-form{background:var(--surface--base,#fff);
  border-radius:var(--radius--2xl,16px);
  padding:var(--spacing--10,2.5rem);
  box-shadow:0 24px 60px -24px rgba(23,22,31,.18),0 0 0 1px rgba(23,22,31,.05);
  display:grid;gap:var(--spacing--5,1.25rem)}
.sodc-field{display:grid;gap:var(--spacing--2,.5rem)}
.sodc-label{font-size:var(--text--sm,.875rem);font-weight:600}
.sodc-input{width:100%;font:inherit;font-size:var(--text--base,1rem);
  padding:.85em 1.1em;border-radius:var(--radius--xl,12px);
  border:1px solid color-mix(in oklab,var(--color-text--base,#000) 14%,transparent);
  background:var(--surface--muted,#faf9fc);color:inherit;outline:none;
  transition:border-color .2s,box-shadow .2s,background .2s}
.sodc-input:focus{border-color:var(--interactive--color-primary-base,#5b4ee5);
  background:var(--surface--base,#fff);
  box-shadow:0 0 0 4px color-mix(in oklab,var(--interactive--color-primary-base,#5b4ee5) 16%,transparent)}
.sodc-input.is-invalid{border-color:var(--color-text--negative,#d34a3a);
  box-shadow:0 0 0 4px color-mix(in oklab,var(--color-text--negative,#d34a3a) 14%,transparent)}
.sodc-consent{display:flex;gap:.7em;align-items:flex-start;cursor:pointer;
  font-size:var(--text--sm,.875rem);line-height:1.45;
  color:var(--color-text--muted,#5f5c6b)}
.sodc-consent input{flex:none;width:1.15em;height:1.15em;margin-top:.12em;
  accent-color:var(--interactive--color-primary-base,#5b4ee5);cursor:pointer}
.sodc-consent.is-invalid{color:var(--color-text--negative,#d34a3a)}
.sodc-btn{font:inherit;font-size:var(--text--base,1rem);font-weight:600;
  display:inline-flex;justify-content:center;align-items:center;gap:.6em;
  width:100%;padding:.95em 1.5em;border:0;cursor:pointer;
  border-radius:var(--radius--full,9999px);
  color:var(--color-text--inverted,#fff);
  background:var(--interactive--color-primary-base,#5b4ee5);
  transition:background .2s,transform .2s,box-shadow .2s;
  box-shadow:0 10px 24px -10px color-mix(in oklab,var(--interactive--color-primary-base,#5b4ee5) 55%,transparent)}
.sodc-btn:hover{background:var(--interactive--color-primary-hover,#4a3fd1);transform:translateY(-1px)}
.sodc-btn:active{transform:translateY(0)}
.sodc-btn:disabled{opacity:.65;cursor:default;transform:none}
.sodc-spin{width:1.1em;height:1.1em;border-radius:50%;flex:none;
  border:2px solid color-mix(in oklab,currentColor 35%,transparent);
  border-top-color:currentColor;animation:sodc-rot .7s linear infinite}
@keyframes sodc-rot{to{transform:rotate(360deg)}}
.sodc-error{font-size:var(--text--sm,.875rem);line-height:1.45;
  color:var(--color-text--negative,#d34a3a);
  background:color-mix(in oklab,var(--color-text--negative,#d34a3a) 9%,transparent);
  border-radius:var(--radius--lg,8px);padding:.7em 1em}
.sodc-success{position:absolute;inset:0;display:grid;place-content:center;
  text-align:center;gap:var(--spacing--4,1rem);
  background:var(--surface--base,#fff);border-radius:var(--radius--2xl,16px);
  padding:var(--spacing--10,2.5rem);
  box-shadow:0 24px 60px -24px rgba(23,22,31,.18),0 0 0 1px rgba(23,22,31,.05);
  animation:sodc-in .45s cubic-bezier(.22,1,.36,1)}
@keyframes sodc-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sodc-success-ic{width:3.5rem;height:3.5rem;margin-inline:auto;border-radius:50%;
  display:grid;place-items:center;color:#fff;
  background:var(--interactive--color-primary-base,#5b4ee5)}
.sodc-success-t{font-size:var(--text--2xl,1.5rem);font-weight:600}
.sodc-success-x{font-size:var(--text--base,1rem);
  color:var(--color-text--muted,#5f5c6b);max-width:26rem}
.sodc-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
@media (max-width:991px){
  .sodc-card{grid-template-columns:1fr;gap:var(--spacing--10,2.5rem);
    padding:var(--spacing--10,2.5rem) var(--spacing--6,1.5rem)}
  .sodc-copy{max-width:none}
}
@media (prefers-reduced-motion:reduce){
  .sodc-dot,.sodc-success{animation:none}
}
`;

const Check = () => (
  <span className="sodc-check" aria-hidden="true">
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M1.5 5.2 4 7.6 8.5 2.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

export function OutboundCallDemo({
  eyebrow = "Canlı Demo",
  heading = "Knovvu sizi arasın, kendiniz deneyimleyin",
  description = "Numaranızı bırakın; yapay zekâ destekli sesli asistanımız sizi saniyeler içinde arasın, gerçek bir görüşmede dinleyin.",
  bullet1 = "Gerçek zamanlı, insan gibi konuşan sesli asistan",
  bullet2 = "Saniyeler içinde telefonunuz çalar",
  bullet3 = "Kaydolmadan, ücretsiz deneyin",
  nameLabel = "Adınız",
  phoneLabel = "Cep telefonunuz",
  consentText = "Kişisel verilerimin demo araması için işlenmesine onay veriyorum.",
  buttonText = "Beni ara",
  successTitle = "Aramanız yolda!",
  successText = "Telefonunuz birazdan çalacak — Knovvu sesli asistanı sizi arıyor.",
  endpoint = "/demos/api/demos/outbound-call",
  lang = "TR",
  cooldownSeconds = 600,
}: OutboundCallDemoProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<"name" | "phone" | "consent" | null>(null);

  const t = MESSAGES[lang] || MESSAGES.TR;
  const msg = (code: string) => t[code] || t.generic;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    setError(null);
    setInvalid(null);

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setInvalid("name");
      return setError(msg("invalid_name"));
    }
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) {
      setInvalid("phone");
      return setError(msg("invalid_phone"));
    }
    if (!consent) {
      setInvalid("consent");
      return setError(msg("consent_required"));
    }
    if (cooldownLeft(cleanPhone, cooldownSeconds * 1000) > 0) {
      return setError(msg("rate_limited")); // kalıcı cooldown — istek hiç çıkmaz
    }

    setSending(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, phone: cleanPhone, consent: true, lang, hp }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 200 && body?.ok) {
          recordSubmit(cleanPhone);
          setDone(true);
        } else {
          setError(msg(body?.error || "generic"));
        }
      })
      .catch(() => setError(msg("network")))
      .finally(() => setSending(false));
  }

  return (
    <section className="sodc">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sodc-card">
        <div className="sodc-copy">
          <span className="sodc-eyebrow">
            <span className="sodc-dot" aria-hidden="true" />
            {eyebrow}
          </span>
          <h2 className="sodc-h">{heading}</h2>
          <p className="sodc-p">{description}</p>
          <ul className="sodc-list">
            {[bullet1, bullet2, bullet3].filter(Boolean).map((b, i) => (
              <li key={i}>
                <Check />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sodc-form-wrap">
          <form className="sodc-form" onSubmit={submit} noValidate aria-busy={sending}>
            <div className="sodc-field">
              <label className="sodc-label" htmlFor="sodc-name">{nameLabel}</label>
              <input
                id="sodc-name"
                className={"sodc-input" + (invalid === "name" ? " is-invalid" : "")}
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => { setName(e.target.value); setInvalid(null); setError(null); }}
              />
            </div>
            <div className="sodc-field">
              <label className="sodc-label" htmlFor="sodc-phone">{phoneLabel}</label>
              <input
                id="sodc-phone"
                className={"sodc-input" + (invalid === "phone" ? " is-invalid" : "")}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="05XX XXX XX XX"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setInvalid(null); setError(null); }}
              />
            </div>
            {/* honeypot — görünmez, botlar doldurur */}
            <input
              className="sodc-hp"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
            />
            <label className={"sodc-consent" + (invalid === "consent" ? " is-invalid" : "")}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => { setConsent(e.target.checked); setInvalid(null); setError(null); }}
              />
              <span>{consentText}</span>
            </label>
            {error && <div className="sodc-error" role="alert">{error}</div>}
            <button className="sodc-btn" type="submit" disabled={sending}>
              {sending && <span className="sodc-spin" aria-hidden="true" />}
              {buttonText}
            </button>
          </form>

          {done && (
            <div className="sodc-success" role="status">
              <span className="sodc-success-ic" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 22 22">
                  <path d="M4 11.5 9 16.5 18 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="sodc-success-t">{successTitle}</div>
              <div className="sodc-success-x">{successText}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
