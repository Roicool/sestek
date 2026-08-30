/**
 * DemoRequestForm — Request a Demo sayfasının CRM'e DOĞRUDAN yazan formu.
 *
 * OutboundCallDemo (ana sayfa) ile aynı görsel dil: bol beyaz boşluk,
 * hairline çizgiler, pill input'lar, siyah pill CTA, Soft/Deep theme,
 * RC token köprüleri (var(--token, fallback)), font sayfadan miras.
 *
 * Düzen: solda H2 başlık + açıklama + (opsiyonel, URL boşsa gizli) görsel;
 * sağda form kartı. Mobilde alt alta.
 *
 * Native Webflow formu DEĞİLDİR — submit'i kendisi alır ve
 * CRMFORMSREPORT.md sözleşmesiyle lead endpoint'ine POST eder:
 *   { formType, firstname, lastname, companyname, emailaddress1,
 *     mobilephone, description, pageUrl, utm, hp }
 * UTM'ler sticky-utms.js'in sessionStorage'a yazdığı "sestek_utms"
 * anahtarından okunur. Privacy onayı zorunludur (client-side; CRM'e
 * gönderilmez). Honeypot doluysa istek hiç çıkmaz ama başarı gösterilir.
 */
import * as React from "react";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";

export interface DemoRequestFormProps {
  theme?: Theme;
  heading?: string;
  description?: string;
  imageUrl?: string;
  imageAlt?: string;
  formTitle?: string;
  formIntro?: string;
  firstNameLabel?: string;
  lastNameLabel?: string;
  companyLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  messageLabel?: string;
  consentText?: string;
  consentLinkText?: string;
  consentLinkUrl?: string;
  buttonText?: string;
  sendingText?: string;
  successTitle?: string;
  successText?: string;
  formCaption?: string;
  endpoint?: string;
  formType?: string;
  lang?: Lang;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_firstname: "Lütfen adınızı girin.",
    invalid_lastname: "Lütfen soyadınızı girin.",
    invalid_company: "Lütfen şirket adınızı girin.",
    invalid_email: "Lütfen geçerli bir kurumsal e-posta girin.",
    invalid_phone: "Lütfen geçerli bir telefon numarası girin.",
    invalid_message: "Lütfen kısaca ihtiyacınızı yazın.",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    rate_limited: "Kısa süre önce bir istek gönderdiniz — lütfen biraz sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin.",
  },
  EN: {
    invalid_firstname: "Please enter your first name.",
    invalid_lastname: "Please enter your last name.",
    invalid_company: "Please enter your company name.",
    invalid_email: "Please enter a valid business email.",
    invalid_phone: "Please enter a valid phone number.",
    invalid_message: "Please tell us briefly what you need.",
    consent_required: "Please tick the consent box to continue.",
    rate_limited: "You just sent a request — please try again in a few minutes.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
  },
};

/* sticky-utms.js'in yazdığı anahtar — js/components/sticky-utms.js ile aynı */
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
/* Telefon serbest biçim (uluslararası ziyaretçi olabilir) — yalnız
 * "gerçekten numara mı" kontrolü: en az 7 rakam. */
function phoneOk(raw: string): boolean {
  return (raw.replace(/\D/g, "") || "").length >= 7;
}

const CSS = `
.sdrf{--x-card:#ffffff;--x-line:rgba(20,18,30,.08);
  --x-text:var(--color-text--base,#17151f);--x-muted:var(--color-text--muted,#8b8894);
  --x-field:#ffffff;--x-field-line:rgba(20,18,30,.12);
  --x-ink:#17151f;--x-ink-hover:#2a2736;--x-neg:#c9463a;
  max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--6,1.5rem);color:var(--x-text);font:inherit}
.sdrf.is-deep{--x-card:#191627;--x-line:rgba(255,255,255,.09);
  --x-text:#f4f2fb;--x-muted:#a09aba;--x-field:#211d33;
  --x-field-line:rgba(255,255,255,.13);--x-ink:#f4f2fb;--x-ink-hover:#ffffff;
  --x-neg:#ff8274}
.sdrf.is-deep .sdrf-cta{color:#17151f}
.sdrf.is-deep .sdrf-spin{border-color:rgba(20,18,30,.3);border-top-color:#17151f}
.sdrf *{box-sizing:border-box}

.sdrf-grid{display:grid;grid-template-columns:1fr 1.05fr;
  gap:var(--spacing--10,2.5rem);align-items:start}

/* ── Sol: başlık + açıklama + opsiyonel görsel ─────────────── */
.sdrf-copy{display:flex;flex-direction:column;
  padding-top:var(--spacing--6,1.5rem)}
.sdrf-h{margin:0;font-size:var(--text--5xl,3rem);font-weight:500;
  line-height:1.08;letter-spacing:-.02em;max-width:12em}
.sdrf-d{margin:var(--spacing--5,1.25rem) 0 0;max-width:32em;
  font-size:var(--text--lg,1.125rem);line-height:1.6;color:var(--x-muted)}
.sdrf-img{margin-top:var(--spacing--8,2rem);
  border-radius:var(--radius--3xl,24px);overflow:hidden;
  box-shadow:inset 0 0 0 1px var(--x-line)}
.sdrf-img img{display:block;width:100%;height:auto}

/* ── Sağ: form kartı ───────────────────────────────────────── */
.sdrf-card{border-radius:var(--radius--3xl,24px);background:var(--x-card);
  box-shadow:inset 0 0 0 1px var(--x-line);
  padding:var(--spacing--8,2rem) var(--spacing--7,1.75rem)}
.sdrf-t{margin:0 0 var(--spacing--1-5,.375rem);
  font-size:var(--text--2xl,1.5rem);font-weight:500;letter-spacing:-.01em}
.sdrf-intro{margin:0 0 var(--spacing--5,1.25rem);
  font-size:var(--text--sm,.875rem);line-height:1.5;color:var(--x-muted)}

.sdrf-form{display:grid;gap:var(--spacing--2-5,.625rem)}
.sdrf-row{display:grid;grid-template-columns:1fr 1fr;
  gap:var(--spacing--2-5,.625rem)}
.sdrf-field{position:relative}
.sdrf-input{width:100%;font:inherit;font-size:var(--text--base,1rem);
  color:var(--x-text);background:var(--x-field);
  border:1px solid var(--x-field-line);
  border-radius:var(--radius--full,9999px);outline:none;
  padding:.78em 1.25em;transition:border-color .2s,box-shadow .2s}
.sdrf-input::placeholder{color:var(--x-muted)}
.sdrf-input:focus{border-color:var(--x-text);
  box-shadow:0 0 0 3px rgba(20,18,30,.07)}
textarea.sdrf-input{border-radius:var(--radius--2xl,20px);
  min-height:6.5em;resize:vertical;line-height:1.5}
.sdrf-field.is-invalid .sdrf-input{border-color:var(--x-neg);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--x-neg) 14%,transparent)}

.sdrf-consent{display:flex;gap:.55em;align-items:flex-start;cursor:pointer;
  padding:.15em .4em;font-size:var(--text--xs,.75rem);line-height:1.45;
  color:var(--x-muted)}
.sdrf-consent input{flex:none;width:1.05em;height:1.05em;margin-top:.2em;
  accent-color:var(--x-ink);cursor:pointer}
.sdrf-consent.is-invalid{color:var(--x-neg)}
.sdrf-consent a{color:inherit;text-decoration:underline;
  text-underline-offset:2px}
.sdrf-consent a:hover{color:var(--x-text)}
.sdrf-err{padding:0 .5em;font-size:var(--text--xs,.75rem);line-height:1.5;
  color:var(--x-neg)}
.sdrf-cta{font:inherit;font-size:var(--text--base,1rem);font-weight:500;
  color:#fff;width:100%;border:0;cursor:pointer;
  display:inline-flex;justify-content:center;align-items:center;gap:.55em;
  padding:.82em 1.5em;border-radius:var(--radius--full,9999px);
  background:var(--x-ink);transition:background .2s,transform .2s}
.sdrf-cta:hover{background:var(--x-ink-hover);transform:translateY(-1px)}
.sdrf-cta:active{transform:none}
.sdrf-cta:disabled{cursor:default;opacity:.7;transform:none}
.sdrf-spin{width:1em;height:1em;flex:none;border-radius:50%;
  border:2px solid rgba(255,255,255,.35);border-top-color:#fff;
  animation:sdrf-rot .7s linear infinite}
@keyframes sdrf-rot{to{transform:rotate(360deg)}}
.sdrf-cap{margin-top:var(--spacing--4,1rem);
  font-size:var(--text--xs,.75rem);line-height:1.5;color:var(--x-muted);
  opacity:.85}

/* ── Başarı sahnesi ────────────────────────────────────────── */
.sdrf-done{text-align:center;
  padding:var(--spacing--10,2.5rem) var(--spacing--4,1rem);
  animation:sdrf-in .5s cubic-bezier(.22,1,.36,1)}
@keyframes sdrf-in{from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}}
.sdrf-check{width:3rem;height:3rem;margin:0 auto var(--spacing--4,1rem);
  border-radius:50%;display:grid;place-items:center;
  background:color-mix(in oklab,var(--x-text) 6%,transparent)}
.sdrf-check svg{width:1.3rem;height:1.3rem}
.sdrf-done b{display:block;font-weight:500;
  font-size:var(--text--lg,1.125rem)}
.sdrf-done p{margin:var(--spacing--2-5,.625rem) auto 0;max-width:22em;
  font-size:var(--text--sm,.875rem);line-height:1.55;color:var(--x-muted)}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:991px){
  .sdrf-grid{grid-template-columns:1fr;gap:var(--spacing--7,1.75rem)}
  .sdrf-copy{padding-top:0}
  .sdrf-h{font-size:var(--text--4xl,2.25rem)}
}
@media (max-width:479px){
  .sdrf-row{grid-template-columns:1fr}
  .sdrf-card{padding:var(--spacing--6,1.5rem) var(--spacing--5,1.25rem)}
}
@media (prefers-reduced-motion:reduce){
  .sdrf-spin{animation:none}
  .sdrf-done{animation:none}
}
`;

export function DemoRequestForm({
  theme = "Soft",
  heading = "See Knovvu in action",
  description = "Tell us a little about yourself and our team will set up a personalized demo — real use cases, your industry, your language.",
  imageUrl = "",
  imageAlt = "",
  formTitle = "Request a demo",
  formIntro = "We'll get back to you within one business day.",
  firstNameLabel = "First name",
  lastNameLabel = "Last name",
  companyLabel = "Company",
  emailLabel = "Business email",
  phoneLabel = "Phone number",
  messageLabel = "What would you like to see?",
  consentText = "I consent to my personal data being processed to respond to my demo request.",
  consentLinkText = "Privacy Policy",
  consentLinkUrl = "",
  buttonText = "Request demo",
  sendingText = "Sending…",
  successTitle = "Request received",
  successText = "Thanks — our team will reach out shortly to schedule your demo.",
  formCaption = "Your details are used only to respond to this request.",
  endpoint = "/demos/api/crm/lead",
  formType = "frm-demo",
  lang = "EN",
}: DemoRequestFormProps) {
  const [firstname, setFirstname] = React.useState("");
  const [lastname, setLastname] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<string | null>(null);

  const t = MESSAGES[lang] || MESSAGES.EN;
  const msg = (code: string) => t[code] || t.generic;

  function fail(code: string, field: string | null = null) {
    setInvalid(field);
    setError(msg(code));
  }
  function clearErr() {
    setInvalid(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    clearErr();

    const v = {
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      companyname: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
    };
    if (v.firstname.length < 2) return fail("invalid_firstname", "firstname");
    if (v.lastname.length < 2) return fail("invalid_lastname", "lastname");
    if (v.companyname.length < 2) return fail("invalid_company", "company");
    if (!EMAIL_RE.test(v.email)) return fail("invalid_email", "email");
    if (!phoneOk(v.phone)) return fail("invalid_phone", "phone");
    if (v.message.length < 2) return fail("invalid_message", "message");
    if (!consent) return fail("consent_required", "consent");

    /* Honeypot doluysa (bot) istek atmadan başarı göster. */
    if (hp) {
      setDone(true);
      return;
    }

    const payload: Record<string, unknown> = {
      formType,
      firstname: v.firstname,
      lastname: v.lastname,
      companyname: v.companyname,
      emailaddress1: v.email.toLowerCase(),
      mobilephone: v.phone,
      description: v.message,
      pageUrl: location.href,
      hp: "",
    };
    const utms = readUtms();
    if (utms) payload.utm = utms;

    setSending(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.ok !== false) {
          setDone(true);
        } else if (res.status === 429) {
          fail("rate_limited");
        } else {
          fail(body?.error || "generic");
        }
      })
      .catch(() => fail("network"))
      .finally(() => setSending(false));
  }

  const field = (key: string) =>
    "sdrf-field" + (invalid === key ? " is-invalid" : "");

  return (
    <section className={"sdrf" + (theme === "Deep" ? " is-deep" : "")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sdrf-grid">
        <div className="sdrf-copy">
          <h2 className="sdrf-h">{heading}</h2>
          {description && <p className="sdrf-d">{description}</p>}
          {imageUrl && (
            <div className="sdrf-img">
              <img src={imageUrl} alt={imageAlt} loading="lazy" />
            </div>
          )}
        </div>

        <div className="sdrf-card">
          {!done ? (
            <form className="sdrf-form" onSubmit={submit} noValidate aria-busy={sending}>
              {formTitle && <h3 className="sdrf-t">{formTitle}</h3>}
              {formIntro && <p className="sdrf-intro">{formIntro}</p>}
              <div className="sdrf-row">
                <div className={field("firstname")}>
                  <input
                    className="sdrf-input"
                    type="text"
                    autoComplete="given-name"
                    placeholder={firstNameLabel}
                    aria-label={firstNameLabel}
                    value={firstname}
                    onChange={(e) => { setFirstname(e.target.value); clearErr(); }}
                  />
                </div>
                <div className={field("lastname")}>
                  <input
                    className="sdrf-input"
                    type="text"
                    autoComplete="family-name"
                    placeholder={lastNameLabel}
                    aria-label={lastNameLabel}
                    value={lastname}
                    onChange={(e) => { setLastname(e.target.value); clearErr(); }}
                  />
                </div>
              </div>
              <div className={field("company")}>
                <input
                  className="sdrf-input"
                  type="text"
                  autoComplete="organization"
                  placeholder={companyLabel}
                  aria-label={companyLabel}
                  value={company}
                  onChange={(e) => { setCompany(e.target.value); clearErr(); }}
                />
              </div>
              <div className={field("email")}>
                <input
                  className="sdrf-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={emailLabel}
                  aria-label={emailLabel}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearErr(); }}
                />
              </div>
              <div className={field("phone")}>
                <input
                  className="sdrf-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={phoneLabel}
                  aria-label={phoneLabel}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearErr(); }}
                />
              </div>
              <div className={field("message")}>
                <textarea
                  className="sdrf-input"
                  placeholder={messageLabel}
                  aria-label={messageLabel}
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); clearErr(); }}
                />
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
              <label className={"sdrf-consent" + (invalid === "consent" ? " is-invalid" : "")}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); clearErr(); }}
                />
                <span>
                  {consentText}
                  {consentLinkText && consentLinkUrl && (
                    <>
                      {" "}
                      <a
                        href={consentLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {consentLinkText}
                      </a>
                    </>
                  )}
                </span>
              </label>
              {error && <div className="sdrf-err" role="alert">{error}</div>}
              <button className="sdrf-cta" type="submit" disabled={sending}>
                {sending && <span className="sdrf-spin" aria-hidden="true" />}
                {sending ? sendingText : buttonText}
              </button>
              {formCaption && <div className="sdrf-cap">{formCaption}</div>}
            </form>
          ) : (
            <div className="sdrf-done" role="status">
              <span className="sdrf-check" aria-hidden="true">
                <svg viewBox="0 0 16 16">
                  <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <b>{successTitle}</b>
              <p>{successText}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
