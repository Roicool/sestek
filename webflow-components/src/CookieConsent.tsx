/*!
 * CookieConsent (Code Component) — minimal, working cookie banner for sestek.com.
 *
 * What "working" means here (not just a banner that disappears):
 *  1. Remembers the choice in a first-party cookie `sestek_consent`
 *     (JSON: {v, t, analytics, marketing, preferences}) for `Remember (days)`.
 *     A new Policy version re-asks everyone.
 *  2. Google Consent Mode v2: on every page load (silently, if a choice is
 *     stored) and on every decision it calls
 *     gtag('consent','update',{analytics_storage, ad_storage, ad_user_data,
 *     ad_personalization, functionality_storage, personalization_storage})
 *     and pushes {event:'cookie_consent_update', consent:{…}} to dataLayer,
 *     so GTM tags can fire on that event. Put the Consent Mode DEFAULT
 *     (all denied) in the site's <head> before GTM — see README.
 *  3. Script gating: any <script type="text/plain" data-consent="analytics">
 *     (or "marketing" / "preferences") in the page is activated only when
 *     that category is granted; <iframe data-consent="marketing" data-src=…>
 *     gets its src the same way. Necessary scripts stay as normal <script>s.
 *  4. Re-open: any [data-cookie-settings] element (footer link) opens the
 *     preferences; window.__sestekConsent.{open,get,acceptAll,rejectAll}.
 *     A `sestek:consent` CustomEvent fires on window with the decision.
 *  5. Global Privacy Control (navigator.globalPrivacyControl): non-essential
 *     categories are pre-set OFF in the preferences (the banner still asks).
 *
 * Design: small card bottom-left (bottom sheet under 768px), Sestek
 * surfaces (--surface--base, --radius--lg, magenta primary), no overlay by
 * default (page stays usable), optional blocking mode. EN/TR from /tr or
 * <html lang>; copy editable from the Designer.
 */

import * as React from "react";

export interface CookieConsentProps {
  locale?: string;                 // Auto | en | tr
  policyVersion?: string;
  rememberDays?: number;
  delay?: number;                  // ms before the banner shows
  position?: string;               // "Bottom left" | "Bottom right" | "Bottom center"
  theme?: string;                  // "Light" | "Dark"
  blocking?: boolean;              // backdrop + page not usable until a choice
  showReject?: boolean;
  preferencesCategory?: boolean;   // add a 4th "Preferences" category
  respectGpc?: boolean;
  titleEn?: string; textEn?: string; policyUrlEn?: string;
  titleTr?: string; textTr?: string; policyUrlTr?: string;
}

type Cats = { analytics: boolean; marketing: boolean; preferences: boolean };
type Stored = Cats & { v: string; t: number };
const COOKIE = "sestek_consent";
const DEFAULT_CATS: Cats = { analytics: false, marketing: false, preferences: false };

const MSG = {
  en: {
    title: "We use cookies",
    text: "We use cookies to keep the site running and, with your permission, to understand how it is used and to show relevant content.",
    policy: "Cookie policy",
    accept: "Accept all",
    reject: "Reject",
    manage: "Manage",
    save: "Save choices",
    back: "Back",
    close: "Close",
    always: "Always on",
    cats: {
      necessary: ["Necessary", "Required for the site to work: security, load balancing, your cookie choice."],
      analytics: ["Analytics", "Helps us understand which pages are used and how, so we can improve the site."],
      marketing: ["Marketing", "Used to show relevant content and measure campaigns across sites."],
      preferences: ["Preferences", "Remembers choices such as language or region."],
    },
  },
  tr: {
    title: "Çerez kullanıyoruz",
    text: "Sitenin çalışması için çerez kullanıyoruz; izninizle sitenin nasıl kullanıldığını anlamak ve ilgili içerik göstermek için de.",
    policy: "Çerez politikası",
    accept: "Tümünü kabul et",
    reject: "Reddet",
    manage: "Yönet",
    save: "Seçimleri kaydet",
    back: "Geri",
    close: "Kapat",
    always: "Her zaman açık",
    cats: {
      necessary: ["Zorunlu", "Sitenin çalışması için gerekli: güvenlik, yük dengeleme, çerez tercihiniz."],
      analytics: ["Analitik", "Hangi sayfaların nasıl kullanıldığını anlamamızı ve siteyi iyileştirmemizi sağlar."],
      marketing: ["Pazarlama", "İlgili içerik göstermek ve kampanyaları ölçmek için kullanılır."],
      preferences: ["Tercihler", "Dil ya da bölge gibi seçimlerinizi hatırlar."],
    },
  },
};

/* ── storage ─────────────────────────────────────────────────── */
function readStored(): Stored | null {
  try {
    const m = document.cookie.match(/(?:^|; )sestek_consent=([^;]*)/);
    if (!m) return null;
    const o = JSON.parse(decodeURIComponent(m[1]));
    if (!o || typeof o !== "object" || typeof o.v !== "string") return null;
    return { v: o.v, t: Number(o.t) || 0, analytics: !!o.analytics, marketing: !!o.marketing, preferences: !!o.preferences };
  } catch { return null; }
}
function writeStored(s: Stored, days: number) {
  try {
    const v = encodeURIComponent(JSON.stringify(s));
    document.cookie = COOKIE + "=" + v + "; max-age=" + Math.round(Math.max(1, days) * 86400) + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  } catch { /* cookies blocked */ }
}
function clearStored() { try { document.cookie = COOKIE + "=; max-age=0; path=/; SameSite=Lax"; } catch { /* noop */ } }

/* ── apply: Consent Mode + dataLayer + gated scripts ──────────── */
const activated = new WeakSet<Element>();
function applyConsent(c: Cats) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  const g = (b: boolean) => (b ? "granted" : "denied");
  const update = {
    analytics_storage: g(c.analytics),
    ad_storage: g(c.marketing),
    ad_user_data: g(c.marketing),
    ad_personalization: g(c.marketing),
    functionality_storage: g(c.preferences),
    personalization_storage: g(c.preferences),
    security_storage: "granted",
  };
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag === "function") w.gtag("consent", "update", update);
  else w.dataLayer.push(["consent", "update", update]);   // gtag() shim pushes `arguments` — same shape
  w.dataLayer.push({ event: "cookie_consent_update", consent: { necessary: true, analytics: c.analytics, marketing: c.marketing, preferences: c.preferences } });

  /* gated scripts / iframes */
  const granted = (cat: string) => cat === "necessary" || (c as unknown as Record<string, boolean>)[cat] === true;
  document.querySelectorAll<HTMLScriptElement>('script[type="text/plain"][data-consent]').forEach((s) => {
    if (activated.has(s) || !granted(s.getAttribute("data-consent") || "")) return;
    activated.add(s);
    const n = document.createElement("script");
    Array.from(s.attributes).forEach((a) => { if (a.name !== "type" && a.name !== "data-consent") n.setAttribute(a.name, a.value); });
    n.type = "text/javascript";
    if (!s.src) n.textContent = s.textContent;
    s.parentNode?.insertBefore(n, s.nextSibling);
  });
  document.querySelectorAll<HTMLIFrameElement>("iframe[data-consent][data-src]").forEach((f) => {
    if (activated.has(f) || !granted(f.getAttribute("data-consent") || "")) return;
    activated.add(f);
    f.src = f.getAttribute("data-src") || "";
  });
  window.dispatchEvent(new CustomEvent("sestek:consent", { detail: { necessary: true, analytics: c.analytics, marketing: c.marketing, preferences: c.preferences } }));
}

/* ── styles ──────────────────────────────────────────────────── */
const CSS = `
:host{all:initial;font-family:inherit}
*,*::before,*::after{box-sizing:border-box}
.cc{
  --cc-bg:var(--surface--base,#fff);
  --cc-fg:var(--color-text--base,#17151f);
  --cc-muted:var(--color-text--muted,#6f6f7c);
  --cc-line:var(--border--color-border-page,#e6e5ef);
  --cc-soft:var(--surface--light,#eeebf8);
  --cc-accent:var(--brand-primary--500,#e5007d);
  --cc-r:var(--radius--lg,20px);
  --cc-font:var(--font--primary,var(--font--body,inherit));
  position:fixed;z-index:2147482000;left:clamp(12px,2vw,28px);bottom:clamp(12px,2vw,28px);width:min(400px,calc(100vw - 2*clamp(12px,2vw,28px)));
  font-family:var(--cc-font);color:var(--cc-fg);
  animation:cc-in .36s cubic-bezier(.22,1,.36,1) both;
}
.cc[data-pos="right"]{left:auto;right:clamp(12px,2vw,28px)}
.cc[data-pos="center"]{left:50%;transform:translateX(-50%)}
.cc[data-theme="dark"]{--cc-bg:var(--neutral--950,#17151f);--cc-fg:#fff;--cc-muted:rgba(255,255,255,.6);--cc-line:rgba(255,255,255,.12);--cc-soft:rgba(255,255,255,.08)}
.cc_card{background:var(--cc-bg);border:1px solid var(--cc-line);border-radius:var(--cc-r);box-shadow:0 30px 70px -30px rgba(20,10,50,.35),0 2px 10px -6px rgba(20,10,50,.12);padding:20px 20px 18px;overflow:hidden}
.cc_head{display:flex;align-items:center;gap:10px;margin:0 0 8px}
.cc_dot{width:10px;height:10px;border-radius:2px;background:var(--cc-accent);transform:rotate(45deg) scale(.8);flex:none}
.cc_title{margin:0;font-size:15px;font-weight:var(--font-weight--semibold,600);letter-spacing:-.005em}
.cc_text{margin:0;font-size:13.5px;line-height:1.5;color:var(--cc-muted)}
.cc_text a{color:var(--cc-fg);text-decoration:underline;text-underline-offset:.18em;text-decoration-thickness:1px}
.cc_actions{display:flex;align-items:center;gap:8px;margin-top:16px;flex-wrap:wrap}
.cc_btn{font:inherit;font-family:var(--cc-font);font-size:13.5px;font-weight:600;line-height:1;padding:11px 16px;border-radius:var(--radius--full,999px);border:1px solid transparent;cursor:pointer;transition:transform .15s,filter .2s,background .2s,border-color .2s;-webkit-tap-highlight-color:transparent}
.cc_btn:active{transform:scale(.98)}
.cc_btn:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px}
.cc_btn--primary{background:var(--cc-accent);color:#fff}
.cc_btn--primary:hover{filter:brightness(1.06)}
.cc_btn--ghost{background:transparent;color:var(--cc-fg);border-color:var(--cc-line)}
.cc_btn--ghost:hover{background:var(--cc-soft)}
.cc_link{margin-left:auto;font:inherit;font-family:var(--cc-font);font-size:13px;font-weight:600;color:var(--cc-muted);background:none;border:0;padding:8px 2px;cursor:pointer;text-decoration:underline;text-underline-offset:.18em;text-decoration-thickness:1px}
.cc_link:hover{color:var(--cc-fg)}
.cc_link:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px;border-radius:4px}
/* preferences */
.cc_cats{display:flex;flex-direction:column;margin:14px 0 4px;border-top:1px solid var(--cc-line)}
.cc_cat{display:grid;grid-template-columns:1fr auto;gap:2px 14px;align-items:center;padding:11px 0;border-bottom:1px solid var(--cc-line)}
.cc_cat-name{grid-column:1;grid-row:1;font-size:13.5px;font-weight:600}
.cc_cat-desc{grid-column:1;grid-row:2;font-size:12.5px;line-height:1.45;color:var(--cc-muted)}
.cc_cat-always{grid-column:2;grid-row:1/3;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--cc-muted);font-weight:600}
.cc_sw{grid-column:2;grid-row:1/3;position:relative;width:38px;height:22px;border-radius:999px;background:var(--cc-line);border:0;cursor:pointer;transition:background .2s;flex:none;padding:0}
.cc_sw::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .2s}
.cc_sw[aria-checked="true"]{background:var(--cc-accent)}
.cc_sw[aria-checked="true"]::after{transform:translateX(16px)}
.cc_sw:focus-visible{outline:2px solid var(--cc-accent);outline-offset:2px}
.cc_backdrop{position:fixed;inset:0;z-index:2147481999;background:rgba(14,10,30,.35);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:cc-fade .3s ease both}
@keyframes cc-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.cc[data-pos="center"]{animation-name:cc-in-c}
@keyframes cc-in-c{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@keyframes cc-fade{from{opacity:0}to{opacity:1}}
@media (max-width:767px){
  .cc,.cc[data-pos="right"],.cc[data-pos="center"]{left:8px;right:8px;bottom:8px;width:auto;transform:none;animation-name:cc-in}
  .cc_card{padding:18px 16px 16px;border-radius:var(--radius--md,14px)}
  .cc_actions{gap:8px}
  .cc_btn{flex:1 1 auto;text-align:center}
  .cc_link{margin-left:0;flex-basis:100%;text-align:center;padding-top:4px}
}
@media (prefers-reduced-motion:reduce){.cc,.cc_backdrop{animation:none}}
`;

export function CookieConsent({
  locale = "Auto",
  policyVersion = "1",
  rememberDays = 180,
  delay = 600,
  position = "Bottom left",
  theme = "Light",
  blocking = false,
  showReject = true,
  preferencesCategory = false,
  respectGpc = true,
  titleEn = "", textEn = "", policyUrlEn = "/legal/cookie-policy",
  titleTr = "", textTr = "", policyUrlTr = "/tr/yasal/cerez-politikasi",
}: CookieConsentProps) {
  const loc = locale === "tr" || locale === "en" ? locale
    : (typeof location !== "undefined" && /^\/tr(\/|$)/.test(location.pathname)) || (typeof document !== "undefined" && (document.documentElement.lang || "").toLowerCase().startsWith("tr")) ? "tr" : "en";
  const t = MSG[loc];
  const title = (loc === "tr" ? titleTr : titleEn) || t.title;
  const text = (loc === "tr" ? textTr : textEn) || t.text;
  const policyUrl = loc === "tr" ? policyUrlTr : policyUrlEn;

  const [open, setOpen] = React.useState(false);
  const [manage, setManage] = React.useState(false);
  const [cats, setCats] = React.useState<Cats>(DEFAULT_CATS);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const version = String(policyVersion || "1");

  const decide = React.useCallback((c: Cats) => {
    const stored: Stored = { v: version, t: Date.now(), ...c, preferences: preferencesCategory ? c.preferences : c.analytics };
    writeStored(stored, Number(rememberDays) || 180);
    applyConsent(stored);
    setCats(stored);
    setOpen(false); setManage(false);
  }, [version, rememberDays, preferencesCategory]);

  const acceptAll = React.useCallback(() => decide({ analytics: true, marketing: true, preferences: true }), [decide]);
  const rejectAll = React.useCallback(() => decide({ analytics: false, marketing: false, preferences: false }), [decide]);
  const openPrefs = React.useCallback(() => { setManage(true); setOpen(true); }, []);

  /* first load: stored choice → apply silently; else show after `delay` */
  React.useEffect(() => {
    const s = readStored();
    if (s && s.v === version) { setCats(s); applyConsent(s); return; }
    const gpc = respectGpc && (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    setCats(gpc ? DEFAULT_CATS : DEFAULT_CATS);
    const id = window.setTimeout(() => setOpen(true), Math.max(0, Number(delay) || 0));
    return () => clearTimeout(id);
  }, [version, delay, respectGpc]);

  /* re-open triggers + JS API */
  React.useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-cookie-settings]"));
    const onClick = (e: Event) => { e.preventDefault(); const s = readStored(); if (s) setCats(s); openPrefs(); };
    els.forEach((el) => el.addEventListener("click", onClick));
    (window as unknown as { __sestekConsent?: unknown }).__sestekConsent = {
      open: openPrefs, acceptAll, rejectAll,
      get: () => { const s = readStored(); return s ? { necessary: true, analytics: s.analytics, marketing: s.marketing, preferences: s.preferences, version: s.v } : null; },
      reset: () => { clearStored(); setCats(DEFAULT_CATS); setManage(false); setOpen(true); },
    };
    return () => els.forEach((el) => el.removeEventListener("click", onClick));
  }, [openPrefs, acceptAll, rejectAll]);

  /* blocking mode: focus + Esc does nothing; non-blocking: Esc closes (no decision) */
  React.useEffect(() => {
    if (!open) return;
    if (blocking) cardRef.current?.querySelector<HTMLElement>(".cc_btn--primary")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !blocking) setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, blocking]);

  if (!open) return <style dangerouslySetInnerHTML={{ __html: CSS }} />;

  const pos = position === "Bottom right" ? "right" : position === "Bottom center" ? "center" : "left";
  const catKeys: Array<keyof typeof t.cats> = ["necessary", "analytics", "marketing", ...(preferencesCategory ? (["preferences"] as const) : [])];
  const toggle = (k: keyof Cats) => setCats((c) => ({ ...c, [k]: !c[k] }));

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {blocking && <div className="cc_backdrop" aria-hidden="true" />}
      <div className="cc" data-pos={pos} data-theme={theme === "Dark" ? "dark" : "light"} role={blocking ? "dialog" : "region"} aria-modal={blocking || undefined} aria-label={title}>
        <div ref={cardRef} className="cc_card">
          <div className="cc_head"><span className="cc_dot" aria-hidden="true" /><h2 className="cc_title">{title}</h2></div>
          <p className="cc_text">{text} {policyUrl && <a href={policyUrl}>{t.policy}</a>}</p>

          {manage && (
            <div className="cc_cats">
              {catKeys.map((k) => (
                <div key={k} className="cc_cat">
                  <span className="cc_cat-name" id={"cc-" + k}>{t.cats[k][0]}</span>
                  {k === "necessary"
                    ? <span className="cc_cat-always">{t.always}</span>
                    : <button type="button" role="switch" aria-checked={cats[k as keyof Cats]} aria-labelledby={"cc-" + k} className="cc_sw" onClick={() => toggle(k as keyof Cats)} />}
                  <span className="cc_cat-desc">{t.cats[k][1]}</span>
                </div>
              ))}
            </div>
          )}

          <div className="cc_actions">
            {manage ? (
              <>
                <button type="button" className="cc_btn cc_btn--primary" onClick={() => decide(cats)}>{t.save}</button>
                <button type="button" className="cc_btn cc_btn--ghost" onClick={acceptAll}>{t.accept}</button>
                <button type="button" className="cc_link" onClick={() => setManage(false)}>{t.back}</button>
              </>
            ) : (
              <>
                <button type="button" className="cc_btn cc_btn--primary" onClick={acceptAll}>{t.accept}</button>
                {showReject && <button type="button" className="cc_btn cc_btn--ghost" onClick={rejectAll}>{t.reject}</button>}
                <button type="button" className="cc_link" onClick={() => setManage(true)}>{t.manage}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
