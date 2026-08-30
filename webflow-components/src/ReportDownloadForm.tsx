/**
 * ReportDownloadForm — lead-magnet indirme formu (Opus Report vb.).
 *
 * Tek kompakt kart: ad+soyad, şirket, kurumsal e-posta (floating label
 * pill'ler), zorunlu privacy onayı (iki linkli), honeypot, marka renkli
 * CTA. Demo Request Form ile aynı görsel dil; font sayfadan miras.
 *
 * Gönderim başarılı olunca kart onay sahnesine döner ve fileUrl doluysa
 * "Download the report" butonu çıkar (yeni sekmede açılır) — teslimat
 * kararı: success'te indirme butonu.
 *
 * CRM'e DOĞRUDAN gönderir (CRMFORMSREPORT.md, formType frm-opus-report;
 * rapor başına farklı tip için formType prop'u değiştirilir):
 *   { formType, firstname, lastname, companyname, emailaddress1,
 *     pageUrl, utm, hp }
 * UTM'ler sticky-utms'in "sestek_utms" sessionStorage anahtarından
 * okunur. Honeypot doluysa istek çıkmaz ama başarı gösterilir (indirme
 * butonu dahil — bot ayrımı ziyaretçiye belli edilmez).
 */
import * as React from "react";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";

export interface ReportDownloadFormProps {
  theme?: Theme;
  formTitle?: string;
  formIntro?: string;
  firstNameLabel?: string;
  lastNameLabel?: string;
  companyLabel?: string;
  emailLabel?: string;
  consentText?: string;
  consentLinkText?: string;
  consentLinkUrl?: string;
  consentLink2Text?: string;
  consentLink2Url?: string;
  buttonText?: string;
  sendingText?: string;
  successTitle?: string;
  successText?: string;
  downloadText?: string;
  fileUrl?: string;
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
    consent_required: "Please tick the consent box to continue.",
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
.srpf{--r-card:#ffffff;--r-line:rgba(20,18,30,.08);
  --r-text:var(--color-text--base,#17151f);--r-muted:var(--color-text--muted,#8b8894);
  --r-field:#ffffff;--r-field-line:rgba(20,18,30,.12);--r-neg:#c9463a;
  --r-acc:var(--interactive--color-primary-base,var(--brand-primary--600,#EC008C));
  --r-acc-h:var(--interactive--color-primary-hover,var(--brand-primary--700,#d3007d));
  --r-acc-soft:color-mix(in oklab,var(--r-acc) 10%,transparent);
  color:var(--r-text);font:inherit;max-width:30rem}
.srpf.is-deep{--r-card:#191627;--r-line:rgba(255,255,255,.09);
  --r-text:#f4f2fb;--r-muted:#a09aba;--r-field:#211d33;
  --r-field-line:rgba(255,255,255,.13);--r-neg:#ff8274}
.srpf *{box-sizing:border-box}

.srpf-card{border-radius:var(--radius--3xl,24px);background:var(--r-card);
  box-shadow:inset 0 0 0 1px var(--r-line),0 24px 60px -36px rgba(20,18,30,.18);
  padding:var(--spacing--7,1.75rem) var(--spacing--6,1.5rem)}
.srpf-t{margin:0 0 var(--spacing--1-5,.375rem);
  font-size:var(--text--xl,1.25rem);font-weight:500;letter-spacing:-.01em}
.srpf-intro{margin:0 0 var(--spacing--4,1rem);
  font-size:var(--text--sm,.875rem);line-height:1.5;color:var(--r-muted)}

.srpf-form{display:grid;gap:var(--spacing--2-5,.625rem)}
.srpf-row{display:grid;grid-template-columns:1fr 1fr;
  gap:var(--spacing--2-5,.625rem)}
.srpf-field{position:relative}
.srpf-input{width:100%;font:inherit;font-size:var(--text--sm,.9375rem);
  color:var(--r-text);background:var(--r-field);
  border:1px solid var(--r-field-line);
  border-radius:var(--radius--full,9999px);outline:none;
  padding:.75em 1.2em;transition:border-color .2s,box-shadow .2s}
.srpf-input:focus{border-color:var(--r-acc);
  box-shadow:0 0 0 3px var(--r-acc-soft)}
.srpf-field.is-invalid .srpf-input{border-color:var(--r-neg);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--r-neg) 14%,transparent)}
.srpf-lab{position:absolute;left:1.1em;top:50%;transform:translateY(-50%);
  max-width:calc(100% - 2.2em);overflow:hidden;white-space:nowrap;
  text-overflow:ellipsis;
  font-size:var(--text--sm,.9375rem);color:var(--r-muted);pointer-events:none;
  transition:top .18s,font-size .18s,color .18s,padding .18s,background .18s}
.srpf-input:focus~.srpf-lab,
.srpf-input:not(:placeholder-shown)~.srpf-lab{top:0;
  font-size:.7rem;font-weight:500;letter-spacing:.01em;
  padding:.1em .5em;border-radius:var(--radius--full,9999px);
  background:var(--r-field);box-shadow:inset 0 0 0 1px var(--r-line)}
.srpf-input:focus~.srpf-lab{color:var(--r-acc)}
.srpf-field.is-invalid .srpf-lab{color:var(--r-neg)}

.srpf-consent{display:flex;gap:.55em;align-items:flex-start;cursor:pointer;
  padding:.15em .35em;font-size:var(--text--xs,.75rem);line-height:1.45;
  color:var(--r-muted)}
.srpf-consent input{flex:none;width:1.05em;height:1.05em;margin-top:.2em;
  accent-color:var(--r-acc);cursor:pointer}
.srpf-consent.is-invalid{color:var(--r-neg)}
.srpf-consent a{color:inherit;text-decoration:underline;
  text-underline-offset:2px}
.srpf-consent a:hover{color:var(--r-text)}
.srpf-err{padding:0 .45em;font-size:var(--text--xs,.75rem);line-height:1.5;
  color:var(--r-neg)}
.srpf-cta{font:inherit;font-size:var(--text--sm,.9375rem);font-weight:500;
  color:#fff;width:100%;border:0;cursor:pointer;
  display:inline-flex;justify-content:center;align-items:center;gap:.55em;
  padding:.78em 1.4em;border-radius:var(--radius--full,9999px);
  background:var(--r-acc);transition:background .2s,transform .2s;
  text-decoration:none}
.srpf-cta:hover{background:var(--r-acc-h);transform:translateY(-1px)}
.srpf-cta:active{transform:none}
.srpf-cta:disabled{cursor:default;opacity:.7;transform:none}
.srpf-cta svg{width:1em;height:1em;flex:none}
.srpf-spin{width:1em;height:1em;flex:none;border-radius:50%;
  border:2px solid rgba(255,255,255,.35);border-top-color:#fff;
  animation:srpf-rot .7s linear infinite}
@keyframes srpf-rot{to{transform:rotate(360deg)}}

/* ── Başarı: onay + indirme butonu ─────────────────────────── */
.srpf-done{text-align:center;
  padding:var(--spacing--6,1.5rem) var(--spacing--2,.5rem);
  animation:srpf-in .5s cubic-bezier(.22,1,.36,1)}
@keyframes srpf-in{from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:none}}
.srpf-check{width:2.75rem;height:2.75rem;
  margin:0 auto var(--spacing--3,.75rem);
  border-radius:50%;display:grid;place-items:center;
  color:var(--r-acc);background:var(--r-acc-soft)}
.srpf-check svg{width:1.2rem;height:1.2rem}
.srpf-done b{display:block;font-weight:500;
  font-size:var(--text--lg,1.125rem)}
.srpf-done p{margin:var(--spacing--2,.5rem) auto var(--spacing--5,1.25rem);
  max-width:20em;font-size:var(--text--sm,.875rem);line-height:1.55;
  color:var(--r-muted)}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:479px){
  .srpf{max-width:none}
  .srpf-row{grid-template-columns:1fr}
  .srpf-card{padding:var(--spacing--6,1.5rem) var(--spacing--5,1.25rem)}
}
@media (prefers-reduced-motion:reduce){
  .srpf-spin{animation:none}
  .srpf-done{animation:none}
}
`;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 2v8m0 0 3.2-3.2M8 10 4.8 6.8M3 13h10" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" />
  </svg>
);

export function ReportDownloadForm({
  theme = "Soft",
  formTitle = "Get the Opus Report",
  formIntro = "Fill in your details and the report is yours instantly.",
  firstNameLabel = "First name",
  lastNameLabel = "Last name",
  companyLabel = "Company",
  emailLabel = "Business email",
  consentText = "I consent to my personal data being processed to receive this report.",
  consentLinkText = "Privacy Policy",
  consentLinkUrl = "",
  consentLink2Text = "KVKK",
  consentLink2Url = "",
  buttonText = "Get the report",
  sendingText = "Sending…",
  successTitle = "Enjoy the read",
  successText = "Your copy is ready — download it below.",
  downloadText = "Download the report",
  fileUrl = "",
  endpoint = "/demos/api/crm/lead",
  formType = "frm-opus-report",
  lang = "EN",
}: ReportDownloadFormProps) {
  const [firstname, setFirstname] = React.useState("");
  const [lastname, setLastname] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
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
    };
    if (v.firstname.length < 2) return fail("invalid_firstname", "firstname");
    if (v.lastname.length < 2) return fail("invalid_lastname", "lastname");
    if (v.companyname.length < 2) return fail("invalid_company", "company");
    if (!EMAIL_RE.test(v.email)) return fail("invalid_email", "email");
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
    "srpf-field" + (invalid === key ? " is-invalid" : "");

  const textInput = (
    key: string,
    label: string,
    value: string,
    set: (v: string) => void,
    type = "text",
    autoComplete = "off"
  ) => (
    <div className={field(key)}>
      <input
        className="srpf-input"
        type={type}
        inputMode={type === "email" ? "email" : undefined}
        autoComplete={autoComplete}
        placeholder=" "
        aria-label={label}
        value={value}
        onChange={(e) => { set(e.target.value); clearErr(); }}
      />
      <span className="srpf-lab">{label}</span>
    </div>
  );

  return (
    <div className={"srpf" + (theme === "Deep" ? " is-deep" : "")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="srpf-card">
        {!done ? (
          <form className="srpf-form" onSubmit={submit} noValidate aria-busy={sending}>
            {formTitle && <h3 className="srpf-t">{formTitle}</h3>}
            {formIntro && <p className="srpf-intro">{formIntro}</p>}
            <div className="srpf-row">
              {textInput("firstname", firstNameLabel, firstname, setFirstname, "text", "given-name")}
              {textInput("lastname", lastNameLabel, lastname, setLastname, "text", "family-name")}
            </div>
            {textInput("company", companyLabel, company, setCompany, "text", "organization")}
            {textInput("email", emailLabel, email, setEmail, "email", "email")}
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
            <label className={"srpf-consent" + (invalid === "consent" ? " is-invalid" : "")}>
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
                    <a href={consentLinkUrl} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}>{consentLinkText}</a>
                  </>
                )}
                {consentLink2Text && consentLink2Url && (
                  <>
                    {consentLinkText && consentLinkUrl ? " · " : " "}
                    <a href={consentLink2Url} target="_blank" rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}>{consentLink2Text}</a>
                  </>
                )}
              </span>
            </label>
            {error && <div className="srpf-err" role="alert">{error}</div>}
            <button className="srpf-cta" type="submit" disabled={sending}>
              {sending && <span className="srpf-spin" aria-hidden="true" />}
              {sending ? sendingText : buttonText}
            </button>
          </form>
        ) : (
          <div className="srpf-done" role="status">
            <span className="srpf-check" aria-hidden="true"><CheckIcon /></span>
            <b>{successTitle}</b>
            <p>{successText}</p>
            {fileUrl && (
              <a className="srpf-cta" href={fileUrl} target="_blank"
                rel="noopener noreferrer">
                <DownloadIcon />
                {downloadText}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
