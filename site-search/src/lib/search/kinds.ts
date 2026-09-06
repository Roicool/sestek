/*
 * Path → kind classification for the Sestek site. Ordered: first match wins.
 * Used by the index builder (and as a fallback when a page carries no hints).
 * Extend the lists when new page types appear.
 */

import type { SearchKind } from "./types";

const RULES: Array<[RegExp, SearchKind]> = [
  [/-blog$/i, "blog"],
  [/^\/(tr\/)?(solutions-for-|.*-icin-cozumler$)/i, "solution"],
  [/^\/(tr\/)?(success-stories|basari-oykuleri)$/i, "resource"],
  [/^\/(tr\/)?(all-blog-posts-resources|tum-blog-yazilari-kaynaklar|webinars-resources|glossary|savings-calculators?|.*-hesaplama$|.*-raporu$|.*-report$|.*-webinar$|.*-ebook$|.*-whitepaper$)/i, "resource"],
  [/^\/(tr\/)?(careers|kariyer|.*-engineer(-.*)?$|.*-manager$|product-owner|.*internship.*|.*-specialist$|.*-developer$)/i, "career"],
  [/^\/(tr\/)?(sestek-vs-|about-us|hakkimizda|whysestek|contact|iletisim|demos|request-a-demo|demo-isteyin|is-ortaklari|partners|ar-ge|.*-policy$|.*-politikasi$|cookie-policy|kullanim-kosullari|terms|compliance-security|uyumluluk-ve-guvenlik|security|data-subject-application-form)/i, "page"],
  // customer stories: "<brand> ... with/ile ..." style slugs
  [/^\/(tr\/)?[a-z0-9-]*(-with-|-ile-|increased|automated|automates|elevated|strengthened|slices|boosted|nasil-|-artirdi|-dusurdu|-hizlandirdi|-tasidi|-guclendiriyor)[a-z0-9-]*$/i, "case-study"],
  // products: Knovvu family + core capabilities
  [/^\/(tr\/)?(knovvu|.*-knovvu$|agentic-ai|agent-copilot|agent-assist|virtual-agent|virtual-translator|banking-bot|bankacilik-botu|collection-ai-agent|scheduling-ai-agent|conversational-ivr|conversational-analytics|conversation-analytics|interaction-analytics|speech-analytics|speech-recognition|text-to-speech|voice-biometrics|musteri-dogrulama|temsilci-kimlik-dogrulama|real-time-guidance|whatsapp-customer-service|aqm|wfm|.*-analytics$)/i, "product"],
];

export function kindForPath(path: string): SearchKind {
  for (const [re, kind] of RULES) if (re.test(path)) return kind;
  return "page";
}

export function localeForPath(path: string): "en" | "tr" {
  return /^\/tr(\/|$)/i.test(path) ? "tr" : "en";
}

/** "/tr/knovvu-agent-copilot" → "Knovvu Agent Copilot" (provisional titles) */
export function titleFromSlug(path: string): string {
  const slug = path.replace(/^\/tr\//, "/").replace(/^\//, "").replace(/-blog$/, "");
  if (!slug) return "Home";
  return slug
    .split("-")
    .map((w) => (/^(ai|ivr|aqm|wfm|tts|sr|crm|api|kvkk|gdpr|qnb|ing|tr|msa)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
