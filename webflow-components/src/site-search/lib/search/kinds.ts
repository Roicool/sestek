/*
 * Path → kind classification for the NEW sestek site (rc-sestek.webflow.io,
 * www.sestek.com after launch). The site is folder-based, so kinds follow the
 * first path segment; TR pages sit under /tr/<turkish-folder>/. Ordered:
 * first match wins. Extend the lists when new folders appear.
 *
 *   /products/*        /tr/urunler/*           product
 *   /agentic-ai, /agent-copilot, /conversational-intelligence (+ /tr/…)  product hubs
 *   /solutions/*       /tr/cozumler/*          solution
 *   /industries/*      /tr/sektorler/*         solution
 *   /success-stories/* /tr/basari-oykuleri/*   case-study   (the hub itself: resource)
 *   /blog/*            /tr/blog/*              blog
 *   /cx-insights/*     /tr/cx-insights/*       blog
 *   /blog-categories/* /tr/blog-kategorileri/* blog         (category hubs)
 *   /webinars/* /podcasts/* /calculators/* /tr/webinarlar/* /tr/podcastler/* /tr/hesaplayicilar/*  resource
 *   /glossary /marketing-collateral /saving-calculators /opus-research-* (+ TR)  resource
 *   /careers/*         /tr/kariyer/*           career
 *   /compares/* /legal/* /authors/* /tr/karsilastirmalar/* /tr/yasal/* /tr/yazarlar/*  page
 *   everything else (about, partners, r-d, home, search …)                        page
 */

import type { SearchKind } from "./types";

const RULES: Array<[RegExp, SearchKind]> = [
  [/^\/(tr\/)?(products|urunler)\//i, "product"],
  [/^\/(tr\/)?(agentic-ai|agent-copilot|conversational-intelligence)$/i, "product"],
  [/^\/(tr\/)?(solutions|cozumler|industries|sektorler)\//i, "solution"],
  [/^\/(tr\/)?(success-stories|basari-oykuleri)\//i, "case-study"],
  [/^\/(tr\/)?(blog|cx-insights|blog-categories|blog-kategorileri)\//i, "blog"],
  [/^\/(tr\/)?(webinars|webinarlar|podcasts|podcastler|calculators|hesaplayicilar)\//i, "resource"],
  [/^\/(tr\/)?(success-stories|basari-oykuleri|blog|cx-insights|cx-icgoruleri|webinars|webinarlar|podcasts|podcastler|glossary|sozluk|marketing-collateral|tanitim-dosyalari|saving-calculators|maliyet-tasarrufu-hesaplama|opus-research-2025-report|opus-research-2025-raporu)$/i, "resource"],
  [/^\/(tr\/)?(careers|kariyer)\//i, "career"],
  [/^\/(tr\/)?(careers|kariyer)$/i, "page"],
  /* legacy flat slugs (old site) — harmless to keep while both structures exist */
  [/-blog$/i, "blog"],
  [/^\/(tr\/)?(solutions-for-|.*-icin-cozumler$)/i, "solution"],
  [/^\/(tr\/)?(knovvu|.*-knovvu$|virtual-agent|virtual-translator|speech-analytics|speech-recognition|text-to-speech|voice-biometrics|aqm|wfm)$/i, "product"],
];

export function kindForPath(path: string): SearchKind {
  for (const [re, kind] of RULES) if (re.test(path)) return kind;
  return "page";
}

export function localeForPath(path: string): "en" | "tr" {
  return /^\/tr(\/|$)/i.test(path) ? "tr" : "en";
}

/** "/tr/urunler/agent-assist" → "Agent Assist" (provisional titles, last segment) */
export function titleFromSlug(path: string): string {
  const clean = path.replace(/^\/tr(\/|$)/, "/").replace(/\/+$/, "");
  const slug = (clean.split("/").pop() || "").replace(/-blog$/, "");
  if (!slug) return "Home";
  return slug
    .split("-")
    .map((w) => (/^(ai|ivr|aqm|wfm|tts|sr|crm|api|kvkk|gdpr|qnb|ing|tr|msa|bpo|cx|r|d|llm|llms)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}
