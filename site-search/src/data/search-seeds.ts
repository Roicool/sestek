/*
 * Curated seeds — hand-maintained boosts merged into the crawled index.
 * `priority` 0–100 lifts a page in the ranking (products 100, key solutions
 * 90, stories/resources 40–60). `keywords` are synonyms/aliases the page copy
 * may not contain. Paths must match the sitemap exactly.
 *
 * A seed only needs `path`; title/summary/kind are taken from the crawl unless
 * given here (given values win — use that to fix a clumsy H1).
 */

import type { SearchDoc } from "../lib/search/types";

export type Seed = Partial<SearchDoc> & { path: string };

export const SEEDS: Seed[] = [
  /* ── Products (EN) ─────────────────────────────────────────── */
  { path: "/agentic-ai", priority: 100, keywords: ["agentic", "ai agent", "autonomous agent", "voice agent", "knovvu"] },
  { path: "/knovvu-agent-copilot", priority: 100, keywords: ["copilot", "agent assist", "real-time guidance", "live translation"] },
  { path: "/knovvu-copilot", priority: 90, keywords: ["copilot"] },
  { path: "/virtual-agent", priority: 100, keywords: ["virtual assistant", "chatbot", "voicebot", "ivr bot", "self-service"] },
  { path: "/conversational-ivr", priority: 95, keywords: ["ivr", "voice ivr", "natural language ivr", "self service"] },
  { path: "/speech-analytics", priority: 95, keywords: ["call analytics", "conversation intelligence", "quality", "compliance"] },
  { path: "/speech-analytics-knovvu", priority: 90, keywords: ["knovvu analytics"] },
  { path: "/conversational-analytics", priority: 90, keywords: ["conversation analytics", "interaction analytics"] },
  { path: "/conversation-analytics-knovvu", priority: 85 },
  { path: "/interaction-analytics", priority: 85 },
  { path: "/speech-recognition", priority: 95, keywords: ["asr", "stt", "speech to text", "transcription"] },
  { path: "/speech-recognition-knovvu", priority: 85 },
  { path: "/voice-biometrics", priority: 95, keywords: ["voiceprint", "authentication", "caller verification", "fraud"] },
  { path: "/voice-biometrics-knovvu", priority: 85 },
  { path: "/real-time-guidance-knovvu", priority: 85, keywords: ["agent guidance", "next best action"] },
  { path: "/scheduling-agent-knovvu", priority: 80, keywords: ["appointment", "scheduling"] },
  { path: "/collection-ai-agent", priority: 85, keywords: ["debt collection", "collections", "payment reminder"] },
  { path: "/banking-bot", priority: 80, keywords: ["banking chatbot", "bank bot"] },
  { path: "/virtual-translator", priority: 80, keywords: ["translation", "multilingual"] },
  { path: "/whatsapp-customer-service", priority: 80, keywords: ["whatsapp", "messaging", "whatsapp business"] },
  { path: "/aqm", priority: 85, keywords: ["automated quality management", "quality management", "qa"] },
  { path: "/knovvu-aqm", priority: 80 },
  { path: "/wfm", priority: 80, keywords: ["workforce management", "scheduling", "forecasting"] },

  /* ── Solutions (EN) ────────────────────────────────────────── */
  { path: "/solutions-for-banking", priority: 90, keywords: ["bank", "finance", "fintech"] },
  { path: "/solutions-for-insurance", priority: 90, keywords: ["insurer", "claims"] },

  /* ── Key pages (EN) ────────────────────────────────────────── */
  { path: "/whysestek", priority: 60, keywords: ["about", "why sestek", "company"] },
  { path: "/about-us", priority: 60, keywords: ["company", "team", "history"] },
  { path: "/success-stories", priority: 70, keywords: ["case studies", "customers", "references"] },
  { path: "/careers", priority: 50, keywords: ["jobs", "open positions", "work at sestek"] },
  { path: "/compliance-security", priority: 50, keywords: ["gdpr", "kvkk", "iso 27001", "security"] },
  { path: "/glossary", priority: 40, keywords: ["terms", "definitions"] },
  { path: "/webinars-resources", priority: 50, keywords: ["webinar", "resources", "ebook", "report"] },
  { path: "/savings-calculators", priority: 50, keywords: ["roi", "calculator", "savings"] },
  { path: "/demos", priority: 70, keywords: ["demo", "try", "live demo", "tts demo", "speech recognition demo"] },
  { path: "/sestek-vs-nice", priority: 40, keywords: ["nice", "comparison", "alternative"] },
  { path: "/sestek-vs-verint", priority: 40, keywords: ["verint", "comparison", "alternative"] },
  { path: "/sestek-vs-callminer", priority: 40, keywords: ["callminer", "comparison", "alternative"] },

  /* ── Products & pages (TR) ─────────────────────────────────── */
  { path: "/tr/agentic-ai", priority: 100, keywords: ["agentic", "yapay zeka ajanı", "sesli asistan", "knovvu"] },
  { path: "/tr/agent-copilot", priority: 100, keywords: ["copilot", "temsilci asistanı", "gerçek zamanlı yönlendirme"] },
  { path: "/tr/agent-assist", priority: 85 },
  { path: "/tr/virtual-agent", priority: 100, keywords: ["sanal asistan", "chatbot", "sesli bot", "self servis"] },
  { path: "/tr/speech-analytics", priority: 95, keywords: ["konuşma analizi", "çağrı analizi", "kalite", "uyumluluk"] },
  { path: "/tr/speech-recognition-knovvu", priority: 90, keywords: ["konuşma tanıma", "ses tanıma", "asr"] },
  { path: "/tr/text-to-speech", priority: 90, keywords: ["metin okuma", "tts", "ses sentezi"] },
  { path: "/tr/voice-biometrics", priority: 90, keywords: ["ses biyometrisi", "kimlik doğrulama"] },
  { path: "/tr/knovvu-biometrics", priority: 85 },
  { path: "/tr/musteri-dogrulama", priority: 80, keywords: ["müşteri doğrulama", "kimlik"] },
  { path: "/tr/temsilci-kimlik-dogrulama", priority: 75 },
  { path: "/tr/scheduling-ai-agent", priority: 75, keywords: ["randevu"] },
  { path: "/tr/bankacilik-botu", priority: 80, keywords: ["banka botu", "bankacılık chatbot"] },
  { path: "/tr/aqm", priority: 85, keywords: ["otomatik kalite yönetimi", "kalite"] },
  { path: "/tr/knovvu-aqm", priority: 80 },
  { path: "/tr/bankalar-icin-cozumler", priority: 90, keywords: ["banka", "finans"] },
  { path: "/tr/telekom-icin-cozumler", priority: 90, keywords: ["telekom", "operatör"] },
  { path: "/tr/iletisim-merkezi-performansi-icin-konusma-zekasi-cozumleri", priority: 80, keywords: ["çağrı merkezi", "iletişim merkezi", "konuşma zekası"] },
  { path: "/tr/basari-oykuleri", priority: 70, keywords: ["referanslar", "müşteriler", "vaka"] },
  { path: "/tr/demo-isteyin", priority: 70, keywords: ["demo", "deneyin"] },
  { path: "/tr/kariyer", priority: 50, keywords: ["iş ilanları", "açık pozisyonlar"] },
  { path: "/tr/uyumluluk-ve-guvenlik", priority: 50, keywords: ["kvkk", "gdpr", "güvenlik"] },
  { path: "/tr/is-ortaklari", priority: 50, keywords: ["partner", "iş ortağı"] },
  { path: "/tr/ar-ge", priority: 40, keywords: ["arge", "araştırma"] },
  { path: "/tr/maliyet-tasarrufu-hesaplama", priority: 50, keywords: ["roi", "hesaplama", "tasarruf"] },
  { path: "/tr/sanal-asistan-icin-tasarruf-hesaplama", priority: 45 },
  { path: "/tr/tum-blog-yazilari-kaynaklar", priority: 45, keywords: ["blog", "kaynaklar"] },
  { path: "/tr/opus-research-2025-raporu", priority: 45, keywords: ["rapor", "opus research"] },
];
