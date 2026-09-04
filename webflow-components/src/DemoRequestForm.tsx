/**
 * DemoRequestForm — Request a Demo sayfasının CRM'e DOĞRUDAN yazan formu.
 *
 * OutboundCallDemo (ana sayfa) ile aynı görsel dil: bol beyaz boşluk,
 * hairline çizgiler, pill input'lar, Soft/Deep theme, RC token köprüleri
 * (var(--token, fallback)), font sayfadan miras. CTA ve vurgular marka
 * rengindedir: --interactive--color-primary-base (= brand-primary--600).
 *
 * Düzen: solda eyebrow + H2 + iki paragraf + özellik listesi + (opsiyonel,
 * URL boşsa gizli) görsel; sağda form kartı. Mobilde alt alta.
 * Input'lar floating-label'lıdır: placeholder yazmaya başlayınca küçülüp
 * üst kenara çıkar.
 *
 * Layout variant:
 *   Single — tüm alanlar tek ekranda
 *   Steps  — 3 adımlı sihirbaz (kimlik → iletişim → mesaj+onay), ilerleme
 *            çubuğu + adım sayacı, her adım kendi alanlarını doğrular
 *
 * Native Webflow formu DEĞİLDİR — submit'i kendisi alır ve
 * CRMFORMSREPORT.md sözleşmesiyle lead endpoint'ine POST eder:
 *   { formType, firstname, lastname, companyname, emailaddress1,
 *     mobilephone, description, pageUrl, utm, hp }
 * UTM'ler sticky-utms.js'in sessionStorage'a yazdığı "sestek_utms"
 * anahtarından okunur. Privacy onayı zorunludur (client-side; CRM'e
 * gönderilmez) ve iki ayrı linke (örn. KVKK + GDPR) bağlanabilir.
 * Honeypot doluysa istek hiç çıkmaz ama başarı gösterilir.
 */
import * as React from "react";
import { classifyEmail } from "./emailPolicy";
import { createTurnstile } from "./turnstile";
import { errorCode } from "./apiError";
import {
  CountryPicker, PHONE_CSS, readPhone, useAutoCountry, type CountryCode,
} from "./PhoneField";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";
type Layout = "Single" | "Steps";

export interface DemoRequestFormProps {
  theme?: Theme;
  layout?: Layout;
  tagline?: string;
  heading?: string;
  description?: string;
  description2?: string;
  bullet1?: string;
  bullet2?: string;
  bullet3?: string;
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
  consentLink2Text?: string;
  consentLink2Url?: string;
  buttonText?: string;
  sendingText?: string;
  nextText?: string;
  backText?: string;
  successTitle?: string;
  successText?: string;
  formCaption?: string;
  endpoint?: string;
  formType?: string;
  freeEmail?: "Block" | "Allow";
  phoneCountry?: string;
  phoneCountries?: string;
  phonePreferred?: string;
  phoneAutoCountry?: "On" | "Off";
  geoEndpoint?: string;
  turnstileSiteKey?: string;
  turnstileWidget?: "Visible" | "Invisible";
  lang?: Lang;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_firstname: "Lütfen adınızı girin.",
    invalid_lastname: "Lütfen soyadınızı girin.",
    invalid_company: "Lütfen şirket adınızı girin.",
    invalid_email: "Lütfen geçerli bir kurumsal e-posta girin.",
    free_email: "Lütfen kurumsal e-posta adresinizi kullanın.",
    disposable_email: "Geçici e-posta adresleri kabul edilmiyor.",
    invalid_phone: "Lütfen geçerli bir telefon numarası girin.",
    country_label: "Ülke kodu",
    country_search: "Ülke ara",
    country_empty: "Eşleşen ülke yok",
    country_preferred: "Sık kullanılan",
    country_all: "Tüm ülkeler",
    invalid_message: "Lütfen kısaca ihtiyacınızı yazın.",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    captcha_failed: "Güvenlik doğrulaması tamamlanamadı — lütfen tekrar deneyin.",
    captcha_unavailable: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin, sorun sürerse bizimle iletişime geçin.",
    rate_limited: "Kısa süre önce bir istek gönderdiniz — lütfen biraz sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin.",
    step: "Adım",
  },
  EN: {
    invalid_firstname: "Please enter your first name.",
    invalid_lastname: "Please enter your last name.",
    invalid_company: "Please enter your company name.",
    invalid_email: "Please enter a valid business email.",
    free_email: "Please use your work email address.",
    disposable_email: "Temporary email addresses aren't accepted.",
    invalid_phone: "Please enter a valid phone number.",
    country_label: "Country code",
    country_search: "Search country",
    country_empty: "No matching country",
    country_preferred: "Popular",
    country_all: "All countries",
    invalid_message: "Please tell us briefly what you need.",
    consent_required: "Please tick the consent box to continue.",
    captcha_failed: "Security check could not be completed — please try again.",
    captcha_unavailable: "The security check could not be completed. Please refresh and try again, and contact us if it keeps happening.",
    rate_limited: "You just sent a request — please try again in a few minutes.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
    step: "Step",
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
/* Telefon doğrulaması artık libphonenumber verisiyle, seçilen ülkeye göre
 * (bkz. PhoneField). Alan ZORUNLU DEĞİL: boşsa geçerli sayılır, doluysa o
 * ülke için gerçekten geçerli olmalı. */

const CSS = `
.sdrf{--x-card:#ffffff;--x-line:rgba(20,18,30,.08);
  --x-text:var(--color-text--base,#17151f);--x-muted:var(--color-text--muted,#8b8894);
  --x-field:#ffffff;--x-field-line:rgba(20,18,30,.12);--x-neg:#c9463a;
  --x-acc:var(--interactive--color-primary-base,var(--brand-primary--600,#6f5fe6));
  --x-acc-h:var(--interactive--color-primary-hover,var(--brand-primary--700,#5c4ed0));
  --x-acc-soft:color-mix(in oklab,var(--x-acc) 10%,transparent);
  max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--6,1.5rem);color:var(--x-text);font:inherit}
.sdrf.is-deep{--x-card:#191627;--x-line:rgba(255,255,255,.09);
  --x-text:#f4f2fb;--x-muted:#a09aba;--x-field:#211d33;
  --x-field-line:rgba(255,255,255,.13);--x-neg:#ff8274;
  --x-acc:var(--brand-primary--400,#9d90f0);
  --x-acc-h:var(--brand-primary--300,#b3a8f5)}
.sdrf.is-deep .sdrf-cta{color:#17151f}
.sdrf.is-deep .sdrf-spin{border-color:rgba(20,18,30,.3);border-top-color:#17151f}
.sdrf *{box-sizing:border-box}

.sdrf-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);
  gap:clamp(1.75rem,4vw,3.5rem);align-items:stretch}

/* ── Sol: eyebrow + başlık + açıklama + özellikler + görsel ──── */
.sdrf-copy{display:flex;flex-direction:column;min-width:0;
  padding-top:var(--spacing--4,1rem)}
.sdrf-eyebrow{display:inline-flex;align-items:center;gap:.5em;
  align-self:flex-start;margin-bottom:var(--spacing--4,1rem);
  padding:.35em .9em;border-radius:var(--radius--full,9999px);
  font-size:var(--text--xs,.75rem);font-weight:500;letter-spacing:.04em;
  text-transform:uppercase;color:var(--x-acc);background:var(--x-acc-soft)}
.sdrf-eyebrow::before{content:"";width:.45em;height:.45em;border-radius:50%;
  background:currentColor;animation:sdrf-pulse 2.4s ease-in-out infinite}
@keyframes sdrf-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.sdrf-h{margin:0;font-size:clamp(2rem,3.4vw,var(--text--5xl,3rem));
  font-weight:500;line-height:1.08;letter-spacing:-.02em}
.sdrf-d{margin:var(--spacing--4,1rem) 0 0;max-width:36em;
  font-size:var(--text--base,1rem);line-height:1.65;color:var(--x-muted)}

.sdrf-feats{display:grid;gap:var(--spacing--3,.75rem);
  margin:var(--spacing--7,1.75rem) 0 0;padding:0;list-style:none}
.sdrf-feats li{display:flex;align-items:center;gap:.7em;
  font-size:var(--text--sm,.875rem);line-height:1.4}
.sdrf-feats i{flex:none;width:1.5rem;height:1.5rem;border-radius:50%;
  display:grid;place-items:center;font-style:normal;
  color:var(--x-acc);background:var(--x-acc-soft)}
.sdrf-feats svg{width:.7rem;height:.7rem}

/* Görsel, metnin altında kalan boşluğu doldurur → sol sütun form
 * kartıyla AYNI HİZADA biter (taşan kısım kırpılır). Dar ekranda
 * (alt alta) sabit banda döner. */
.sdrf-img{flex:1 1 0;min-height:6rem;
  margin-top:var(--spacing--8,2rem);
  border-radius:var(--radius--3xl,24px);overflow:hidden;
  box-shadow:inset 0 0 0 1px var(--x-line)}
.sdrf-img img{display:block;width:100%;height:100%;object-fit:cover}

/* ── Sağ: form kartı ───────────────────────────────────────── */
.sdrf-card{border-radius:var(--radius--3xl,24px);background:var(--x-card);
  box-shadow:inset 0 0 0 1px var(--x-line),0 24px 60px -36px rgba(20,18,30,.18);
  padding:var(--spacing--8,2rem) var(--spacing--7,1.75rem)}
.sdrf-t{margin:0 0 var(--spacing--1-5,.375rem);
  font-size:var(--text--2xl,1.5rem);font-weight:500;letter-spacing:-.01em}
.sdrf-intro{margin:0 0 var(--spacing--5,1.25rem);
  font-size:var(--text--sm,.875rem);line-height:1.5;color:var(--x-muted)}

/* Adım ilerlemesi */
.sdrf-prog{display:flex;align-items:center;gap:var(--spacing--3,.75rem);
  margin-bottom:var(--spacing--5,1.25rem)}
.sdrf-prog-bar{flex:1;height:3px;border-radius:999px;
  background:color-mix(in oklab,var(--x-text) 8%,transparent);overflow:hidden}
.sdrf-prog-bar b{display:block;height:100%;border-radius:999px;
  background:var(--x-acc);
  transition:width .45s cubic-bezier(.22,1,.36,1)}
.sdrf-prog span{font-size:var(--text--xs,.75rem);color:var(--x-muted);
  font-variant-numeric:tabular-nums;white-space:nowrap}

.sdrf-form{display:grid;gap:var(--spacing--3,.75rem)}
.sdrf-stepin{display:grid;gap:var(--spacing--3,.75rem);
  animation:sdrf-in .4s cubic-bezier(.22,1,.36,1)}
.sdrf-row{display:grid;grid-template-columns:1fr 1fr;
  gap:var(--spacing--3,.75rem)}
.sdrf-field{position:relative}

/* Floating label: placeholder=" " hilesi — dolu ya da odaklıyken label
 * küçülüp üst kenara çıkar (compositor-dostu, JS'siz). */
.sdrf-input{width:100%;font:inherit;font-size:var(--text--base,1rem);
  color:var(--x-text);background:var(--x-field);
  border:1px solid var(--x-field-line);
  border-radius:var(--radius--full,9999px);outline:none;
  padding:.82em 1.3em;transition:border-color .2s,box-shadow .2s}
.sdrf-input:focus{border-color:var(--x-acc);
  box-shadow:0 0 0 3px var(--x-acc-soft)}
textarea.sdrf-input{border-radius:var(--radius--2xl,20px);
  min-height:6.5em;resize:vertical;line-height:1.5}
.sdrf-field.is-invalid .sdrf-input{border-color:var(--x-neg);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--x-neg) 14%,transparent)}
.sdrf-lab{position:absolute;left:1.15em;top:50%;transform:translateY(-50%);
  max-width:calc(100% - 2.2em);overflow:hidden;white-space:nowrap;
  text-overflow:ellipsis;
  font-size:var(--text--base,1rem);color:var(--x-muted);pointer-events:none;
  transition:top .18s,font-size .18s,color .18s,padding .18s,background .18s}
.sdrf-field--area .sdrf-lab{top:1.35em}
.sdrf-input:focus~.sdrf-lab,
.sdrf-input:not(:placeholder-shown)~.sdrf-lab{top:0;
  font-size:.72rem;font-weight:500;letter-spacing:.01em;
  padding:.1em .55em;border-radius:var(--radius--full,9999px);
  background:var(--x-field);box-shadow:inset 0 0 0 1px var(--x-line)}
.sdrf-input:focus~.sdrf-lab{color:var(--x-acc)}
.sdrf-field.is-invalid .sdrf-lab{color:var(--x-neg)}

.sdrf-consent{display:flex;gap:.55em;align-items:flex-start;cursor:pointer;
  padding:.15em .4em;font-size:var(--text--xs,.75rem);line-height:1.45;
  color:var(--x-muted)}
.sdrf-consent input{flex:none;width:1.05em;height:1.05em;margin-top:.2em;
  accent-color:var(--x-acc);cursor:pointer}
.sdrf-consent.is-invalid{color:var(--x-neg)}
.sdrf-consent a{color:inherit;text-decoration:underline;
  text-underline-offset:2px}
.sdrf-consent a:hover{color:var(--x-text)}
.sdrf-err{padding:0 .5em;font-size:var(--text--xs,.75rem);line-height:1.5;
  color:var(--x-neg)}

/* Butonlar — marka rengi */
.sdrf-cta{font:inherit;font-size:var(--text--base,1rem);font-weight:500;
  color:#fff;width:100%;border:0;cursor:pointer;
  display:inline-flex;justify-content:center;align-items:center;gap:.55em;
  padding:.82em 1.5em;border-radius:var(--radius--full,9999px);
  background:var(--x-acc);transition:background .2s,transform .2s}
.sdrf-cta:hover{background:var(--x-acc-h);transform:translateY(-1px)}
.sdrf-cta:active{transform:none}
.sdrf-cta:disabled{cursor:default;opacity:.7;transform:none}
.sdrf-nav{display:grid;grid-template-columns:auto 1fr;
  gap:var(--spacing--3,.75rem)}
.sdrf-nav:not(:has(.sdrf-back)){grid-template-columns:1fr}
.sdrf-back{font:inherit;font-size:var(--text--base,1rem);font-weight:500;
  color:var(--x-text);border:1px solid var(--x-field-line);cursor:pointer;
  background:transparent;padding:.82em 1.5em;
  border-radius:var(--radius--full,9999px);
  transition:border-color .2s,background .2s}
.sdrf-back:hover{border-color:var(--x-text)}
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
  color:var(--x-acc);background:var(--x-acc-soft)}
.sdrf-check svg{width:1.3rem;height:1.3rem}
.sdrf-done b{display:block;font-weight:500;
  font-size:var(--text--lg,1.125rem)}
.sdrf-done p{margin:var(--spacing--2-5,.625rem) auto 0;max-width:22em;
  font-size:var(--text--sm,.875rem);line-height:1.55;color:var(--x-muted)}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:991px){
  .sdrf-grid{grid-template-columns:1fr}
  .sdrf-copy{padding-top:0}
  .sdrf-img{flex:none;aspect-ratio:16/7}
}
@media (max-width:479px){
  .sdrf-row{grid-template-columns:1fr}
  .sdrf-card{padding:var(--spacing--6,1.5rem) var(--spacing--5,1.25rem)}
}
@media (prefers-reduced-motion:reduce){
  .sdrf-spin,.sdrf-eyebrow::before{animation:none}
  .sdrf-done,.sdrf-stepin{animation:none}
  .sdrf-prog-bar b{transition:none}
}
` + PHONE_CSS + `
.sdrf-field--phone{display:flex;align-items:stretch}
/* Etiket input'a göre konumlansın, yoksa ülke çipinin üstüne biner. */
.sdrf-phonein{position:relative;flex:1 1 auto;min-width:0;display:flex}
.sdrf-field--phone .sdrf-input{padding-left:.75em;border-left:0;
  border-top-left-radius:0;border-bottom-left-radius:0}
.sdrf-field--phone .sdrf-lab{left:.85em}
.sdrf-cc{display:flex;align-items:center;padding:0 .15em 0 .5em;
  background:var(--x-field);border:1px solid var(--x-field-line);border-right:0;
  border-radius:var(--radius--full,9999px) 0 0 var(--radius--full,9999px);
  font-size:var(--text--sm,.875rem);color:var(--x-text)}
.sdrf-field--phone:focus-within .sdrf-cc{border-color:var(--x-acc)}
.sdrf-field--phone.is-invalid .sdrf-cc{border-color:var(--x-neg)}
.sdrf-cc .spf-panel{--spf-bg:var(--x-card,#fff);--spf-fg:var(--x-text,#101014)}
.sdrf-ts{margin-top:var(--spacing--3,.75rem)}
.sdrf-ts:empty{display:none;margin:0}
`;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Adım → alan grupları (Steps layout) */
const STEP_FIELDS: string[][] = [
  ["firstname", "lastname", "company"],
  ["email", "phone"],
  ["message", "consent"],
];

export function DemoRequestForm({
  theme = "Soft",
  layout = "Single",
  tagline = "Live demo",
  heading = "Request a Demo",
  description = "See how SESTEK helps you elevate the customer experience with AI-powered solutions, analyzing 100% of customer conversations, and providing deeper insights and better results for your business.",
  description2 = "Support your agents more efficiently and help them solve customer problems in a heartbeat, with our market-leading speech recognition accuracy (>97%).",
  bullet1 = "100% of customer conversations analyzed",
  bullet2 = ">97% speech recognition accuracy",
  bullet3 = "Personalized demo for your industry",
  imageUrl = "",
  imageAlt = "",
  formTitle = "Tell us about yourself",
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
  consentLink2Text = "KVKK",
  consentLink2Url = "",
  buttonText = "Request demo",
  sendingText = "Sending…",
  nextText = "Continue",
  backText = "Back",
  successTitle = "Request received",
  successText = "Thanks — our team will reach out shortly to schedule your demo.",
  formCaption = "Your details are used only to respond to this request.",
  endpoint = "/demos/api/crm/lead",
  formType = "frm-demo",
  freeEmail = "Block",
  phoneCountry = "TR",
  phoneCountries = "",
  phonePreferred = "TR,GB,US,DE,FR,NL",
  phoneAutoCountry = "On",
  geoEndpoint = "",
  turnstileSiteKey = "",
  turnstileWidget = "Visible",
  lang = "EN",
}: DemoRequestFormProps) {
  /* Turnstile — site key boşsa hiçbir şey olmaz (script bile yüklenmez). */
  const ts = createTurnstile(React, turnstileSiteKey, turnstileWidget !== "Invisible");

  const [firstname, setFirstname] = React.useState("");
  const [lastname, setLastname] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [country, setCountry] = React.useState<CountryCode>(
    (phoneCountry || "TR").toUpperCase() as CountryCode
  );
  /* Ziyaretçinin ülkesi mount'tan sonra tahmin edilip uygulanır. */
  const touchedCountry = useAutoCountry(
    React, phoneAutoCountry !== "Off", geoEndpoint, phoneCountries, setCountry
  );

  const phoneInfo = readPhone(phone, country);
  const [message, setMessage] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<string | null>(null);

  /* Newsletter pill'inin Demo modu e-postayı ?email=… ile getirir —
   * Business email alanını önceden doldur. */
  React.useEffect(() => {
    try {
      const pre = new URLSearchParams(location.search).get("email");
      if (pre && pre.length <= 254) setEmail(pre);
    } catch { /* URL okunamadıysa boş kalır */ }
  }, []);

  const stepped = layout === "Steps";
  const t = MESSAGES[lang] || MESSAGES.EN;
  const msg = (code: string) => t[code] || t.generic;

  function fail(code: string, field: string | null = null) {
    setInvalid(field);
    setError(msg(code));
    return false;
  }
  function clearErr() {
    setInvalid(null);
    setError(null);
  }

  /* Verilen alan listesini doğrular; ilk hatada durur. */
  function validate(fields: string[]): boolean {
    for (const f of fields) {
      if (f === "firstname" && firstname.trim().length < 2)
        return fail("invalid_firstname", "firstname");
      if (f === "lastname" && lastname.trim().length < 2)
        return fail("invalid_lastname", "lastname");
      if (f === "company" && company.trim().length < 2)
        return fail("invalid_company", "company");
      if (f === "email") {
        const verdict = classifyEmail(email, freeEmail === "Allow");
        if (verdict === "invalid") return fail("invalid_email", "email");
        if (verdict === "disposable") return fail("disposable_email", "email");
        if (verdict === "free") return fail("free_email", "email");
      }
      if (f === "phone" && phone.trim() && !phoneInfo.valid)
        return fail("invalid_phone", "phone");
      if (f === "message" && message.trim().length < 2)
        return fail("invalid_message", "message");
      if (f === "consent" && !consent)
        return fail("consent_required", "consent");
    }
    return true;
  }

  function next() {
    clearErr();
    if (!validate(STEP_FIELDS[step])) return;
    setStep((s) => Math.min(s + 1, STEP_FIELDS.length - 1));
  }
  function back() {
    clearErr();
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    clearErr();

    /* Steps'te son adımdan önce Enter'a basılırsa "ilerle" say. */
    if (stepped && step < STEP_FIELDS.length - 1) return next();

    const fields = stepped ? STEP_FIELDS[step] : STEP_FIELDS.flat();
    if (!validate(fields)) return;

    /* Honeypot doluysa (bot) istek atmadan başarı göster. */
    if (hp) {
      setDone(true);
      return;
    }

    const payload: Record<string, unknown> = {
      formType,
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      companyname: company.trim(),
      emailaddress1: email.trim().toLowerCase(),
      mobilephone: phoneInfo.e164 || phone.trim(),
      description: message.trim(),
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
          fail("rate_limited");
        } else {
          fail(errorCode(body));
        }
      })
      .catch(() => fail("network"))
      .finally(() => {
        setSending(false);
        ts.reset(); // jetonlar tek kullanımlık
      });
  }

  const field = (key: string, extra = "") =>
    "sdrf-field" + extra + (invalid === key ? " is-invalid" : "");

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
        className="sdrf-input"
        type={type}
        inputMode={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
        autoComplete={autoComplete}
        placeholder=" "
        aria-label={label}
        value={value}
        onChange={(e) => { set(e.target.value); clearErr(); }}
      />
      <span className="sdrf-lab">{label}</span>
    </div>
  );

  const consentRow = (
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
  );

  const submitBtn = (label: string) => (
    <button className="sdrf-cta" type="submit" disabled={sending}>
      {sending && <span className="sdrf-spin" aria-hidden="true" />}
      {sending ? sendingText : label}
    </button>
  );

  const bullets = [bullet1, bullet2, bullet3].filter(Boolean);
  const lastStep = step === STEP_FIELDS.length - 1;

  return (
    <section className={"sdrf" + (theme === "Deep" ? " is-deep" : "")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sdrf-grid">
        <div className="sdrf-copy">
          {tagline && <span className="sdrf-eyebrow">{tagline}</span>}
          <h2 className="sdrf-h">{heading}</h2>
          {description && <p className="sdrf-d">{description}</p>}
          {description2 && <p className="sdrf-d">{description2}</p>}
          {bullets.length > 0 && (
            <ul className="sdrf-feats">
              {bullets.map((b, i) => (
                <li key={i}><i><CheckIcon /></i>{b}</li>
              ))}
            </ul>
          )}
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

              {stepped && (
                <div className="sdrf-prog" aria-hidden="true">
                  <div className="sdrf-prog-bar">
                    <b style={{ width: `${((step + 1) / STEP_FIELDS.length) * 100}%` }} />
                  </div>
                  <span>{t.step} {step + 1} / {STEP_FIELDS.length}</span>
                </div>
              )}

              {(!stepped || step === 0) && (
                <div className="sdrf-stepin" key="s0">
                  <div className="sdrf-row">
                    {textInput("firstname", firstNameLabel, firstname, setFirstname, "text", "given-name")}
                    {textInput("lastname", lastNameLabel, lastname, setLastname, "text", "family-name")}
                  </div>
                  {textInput("company", companyLabel, company, setCompany, "text", "organization")}
                </div>
              )}
              {(!stepped || step === 1) && (
                <div className="sdrf-stepin" key="s1">
                  {textInput("email", emailLabel, email, setEmail, "email", "email")}
                  <div className={field("phone", " sdrf-field--phone")}>
                    <span className="sdrf-cc">
                      <CountryPicker
                        country={country}
                        onChange={(c) => { touchedCountry.current = true; setCountry(c); clearErr(); }}
                        allowed={phoneCountries}
                        preferred={phonePreferred}
                        locale={lang === "TR" ? "tr" : "en"}
                        preferredLabel={t.country_preferred}
                        allLabel={t.country_all}
                        ariaLabel={t.country_label}
                      />
                    </span>
                    <span className="sdrf-phonein">
                      <input
                        className="sdrf-input"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel-national"
                        placeholder=" "
                        aria-label={phoneLabel}
                        value={phoneInfo.national}
                        onChange={(e) => { setPhone(e.target.value); clearErr(); }}
                      />
                      <span className="sdrf-lab">{phoneLabel}</span>
                    </span>
                  </div>
                </div>
              )}
              {(!stepped || step === 2) && (
                <div className="sdrf-stepin" key="s2">
                  <div className={field("message", " sdrf-field--area")}>
                    <textarea
                      className="sdrf-input"
                      placeholder=" "
                      aria-label={messageLabel}
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); clearErr(); }}
                    />
                    <span className="sdrf-lab">{messageLabel}</span>
                  </div>
                  {consentRow}
                </div>
              )}

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

              {error && <div className="sdrf-err" role="alert">{error}</div>}
              {/* Turnstile — appearance interaction-only, yalnız meydan okuma
                  gerektiğinde görünür; aksi halde yer kaplamaz. */}
              {ts.enabled && <div className="sdrf-ts" ref={ts.slotRef} />}
              {ts.failed && <div className="sdrf-err" role="alert">{t.captcha_unavailable}</div>}

              {!stepped ? (
                submitBtn(buttonText)
              ) : (
                <div className="sdrf-nav">
                  {step > 0 && (
                    <button className="sdrf-back" type="button" onClick={back}>
                      {backText}
                    </button>
                  )}
                  {lastStep ? (
                    submitBtn(buttonText)
                  ) : (
                    <button className="sdrf-cta" type="button" onClick={next}>
                      {nextText}
                    </button>
                  )}
                </div>
              )}
              {formCaption && <div className="sdrf-cap">{formCaption}</div>}
            </form>
          ) : (
            <div className="sdrf-done" role="status">
              <span className="sdrf-check" aria-hidden="true"><CheckIcon /></span>
              <b>{successTitle}</b>
              <p>{successText}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
