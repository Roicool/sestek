/*
 * Curated seeds — hand-maintained boosts merged into the crawled index.
 * `priority` 0–100 lifts a page in the ranking (product hubs 100, products
 * 90, solutions/industries 85, stories/resources 40–70). `keywords` are
 * synonyms/aliases the page copy may not contain. Paths must match the NEW
 * site's sitemap (rc-sestek.webflow.io → www.sestek.com at launch).
 *
 * A seed only needs `path`; title/summary/kind are taken from the crawl unless
 * given here (given values win — use that to fix a clumsy H1).
 */

import type { SearchDoc } from "../lib/search/types";

export type Seed = Partial<SearchDoc> & { path: string };

export const SEEDS: Seed[] = [
  /* ── Product hubs (EN) ─────────────────────────────────────── */
  { path: "/agentic-ai", priority: 100, keywords: ["agentic", "ai agent", "autonomous agent", "voice agent", "knovvu"] },
  { path: "/agent-copilot", priority: 100, keywords: ["copilot", "agent assist", "real-time guidance", "live translation", "summaries"] },
  { path: "/conversational-intelligence", priority: 95, keywords: ["speech analytics", "conversation analytics", "interaction analytics", "quality", "insights"] },

  /* ── Products (EN) ─────────────────────────────────────────── */
  { path: "/products/ai-agents", priority: 95, keywords: ["virtual agent", "voicebot", "chatbot", "ivr", "self-service"] },
  { path: "/products/agent-assist", priority: 90, keywords: ["agent assist", "next best action", "real-time guidance"] },
  { path: "/products/analytics", priority: 90, keywords: ["speech analytics", "conversation analytics", "call analytics", "compliance"] },
  { path: "/products/aqm", priority: 85, keywords: ["automated quality management", "quality management", "qa", "scorecard"] },
  { path: "/products/coaching", priority: 80, keywords: ["agent coaching", "performance", "training"] },
  { path: "/products/speech-recognition", priority: 90, keywords: ["asr", "stt", "speech to text", "transcription"] },
  { path: "/products/text-to-speech", priority: 90, keywords: ["tts", "voice synthesis", "synthetic voice", "voices"] },
  { path: "/products/virtual-translator", priority: 80, keywords: ["translation", "multilingual", "live translation"] },

  /* ── Solutions & industries (EN) ───────────────────────────── */
  { path: "/solutions/customer-care", priority: 85, keywords: ["customer service", "support", "self-service"] },
  { path: "/solutions/collection", priority: 85, keywords: ["debt collection", "collections", "payment reminder"] },
  { path: "/solutions/technical-support", priority: 80, keywords: ["helpdesk", "troubleshooting"] },
  { path: "/solutions/appointment-scheduling", priority: 80, keywords: ["appointment", "scheduling", "booking"] },
  { path: "/solutions/lead-qualification", priority: 80, keywords: ["sales", "leads", "qualification"] },
  { path: "/solutions/damage-claim-intake", priority: 80, keywords: ["claims", "insurance claim", "fnol"] },
  { path: "/industries/financial-services", priority: 85, keywords: ["banking", "bank", "finance", "fintech"] },
  { path: "/industries/insurance", priority: 85, keywords: ["insurer", "claims", "policy"] },
  { path: "/industries/telecommunications", priority: 85, keywords: ["telecom", "telco", "operator"] },
  { path: "/industries/retail-e-commerce", priority: 80, keywords: ["retail", "e-commerce", "ecommerce"] },
  { path: "/industries/bpo", priority: 80, keywords: ["outsourcing", "contact center outsourcing"] },
  { path: "/industries/utilities", priority: 75, keywords: ["energy", "utility", "public services"] },

  /* ── Key pages (EN) ────────────────────────────────────────── */
  { path: "/", priority: 60, title: "Home", keywords: ["home", "sestek"] },
  { path: "/about-us", priority: 60, keywords: ["company", "team", "history"] },
  { path: "/why-sestek", priority: 60, keywords: ["about", "why sestek", "company"] },
  { path: "/success-stories", priority: 70, keywords: ["case studies", "customers", "references"] },
  { path: "/cx-insights", priority: 55, keywords: ["insights", "articles", "thought leadership"] },
  { path: "/blog", priority: 50, keywords: ["articles", "news"] },
  { path: "/webinars", priority: 50, keywords: ["webinar", "on-demand", "ebook", "report"] },
  { path: "/podcasts", priority: 45, keywords: ["podcast", "episodes"] },
  { path: "/glossary", priority: 40, keywords: ["terms", "definitions"] },
  { path: "/marketing-collateral", priority: 40, keywords: ["brochure", "datasheet", "collateral"] },
  { path: "/saving-calculators", priority: 50, keywords: ["roi", "calculator", "savings"] },
  { path: "/opus-research-2025-report", priority: 45, keywords: ["report", "opus research", "analyst"] },
  { path: "/request-a-demo", priority: 70, keywords: ["demo", "try", "contact sales"] },
  { path: "/careers", priority: 50, keywords: ["jobs", "open positions", "work at sestek"] },
  { path: "/partners", priority: 50, keywords: ["partner program", "resellers"] },
  { path: "/r-d", priority: 40, keywords: ["research", "r&d", "innovation"] },
  { path: "/compliance-security", priority: 50, keywords: ["gdpr", "kvkk", "iso 27001", "security"] },
  { path: "/privacy-compliance", priority: 40, keywords: ["privacy", "data protection"] },

  /* ── Product hubs & products (TR) ──────────────────────────── */
  { path: "/tr/agentic-ai", priority: 100, keywords: ["agentic", "yapay zeka ajanı", "sesli asistan", "knovvu"] },
  { path: "/tr/agent-copilot", priority: 100, keywords: ["copilot", "temsilci asistanı", "gerçek zamanlı yönlendirme", "özet"] },
  { path: "/tr/conversational-intelligence", priority: 95, keywords: ["konuşma analizi", "konuşma zekası", "etkileşim analizi", "kalite"] },
  { path: "/tr/urunler/ai-agents", priority: 95, keywords: ["sanal asistan", "chatbot", "sesli bot", "self servis", "ivr"] },
  { path: "/tr/urunler/agent-assist", priority: 90, keywords: ["temsilci desteği", "gerçek zamanlı yönlendirme"] },
  { path: "/tr/urunler/analytics", priority: 90, keywords: ["konuşma analizi", "çağrı analizi", "uyumluluk"] },
  { path: "/tr/urunler/aqm", priority: 85, keywords: ["otomatik kalite yönetimi", "kalite"] },
  { path: "/tr/urunler/coaching", priority: 80, keywords: ["koçluk", "temsilci performansı", "eğitim"] },
  { path: "/tr/urunler/speech-recognition", priority: 90, keywords: ["konuşma tanıma", "ses tanıma", "asr", "deşifre"] },
  { path: "/tr/urunler/tts", priority: 90, keywords: ["metin okuma", "tts", "ses sentezi", "text to speech"] },
  { path: "/tr/urunler/virtual-translator", priority: 80, keywords: ["çeviri", "çok dilli", "tercüme"] },

  /* ── Solutions & industries (TR) ───────────────────────────── */
  { path: "/tr/cozumler/musteri-hizmetleri", priority: 85, keywords: ["müşteri hizmetleri", "destek", "self servis"] },
  { path: "/tr/cozumler/tahsilat-hatirlatma", priority: 85, keywords: ["tahsilat", "borç", "ödeme hatırlatma"] },
  { path: "/tr/cozumler/teknik-destek", priority: 80, keywords: ["teknik destek", "arıza"] },
  { path: "/tr/cozumler/randevu-planlama", priority: 80, keywords: ["randevu", "planlama"] },
  { path: "/tr/cozumler/potansiyel-musteri-degerlendirme", priority: 80, keywords: ["satış", "lead", "potansiyel müşteri"] },
  { path: "/tr/cozumler/hasar-tazminati-basvurusu", priority: 80, keywords: ["hasar", "sigorta", "tazminat"] },
  { path: "/tr/sektorler/finansal-servisler", priority: 85, keywords: ["banka", "bankacılık", "finans"] },
  { path: "/tr/sektorler/sigorta", priority: 85, keywords: ["sigortacılık", "poliçe", "hasar"] },
  { path: "/tr/sektorler/telekomunikasyon", priority: 85, keywords: ["telekom", "operatör"] },
  { path: "/tr/sektorler/perakende-ve-e-ticaret", priority: 80, keywords: ["perakende", "e-ticaret"] },
  { path: "/tr/sektorler/outsource-cagri-merkezi", priority: 80, keywords: ["bpo", "dış kaynak", "çağrı merkezi"] },
  { path: "/tr/sektorler/kamu-hizmetleri", priority: 75, keywords: ["kamu", "enerji", "belediye"] },

  /* ── Key pages (TR) ────────────────────────────────────────── */
  { path: "/tr", priority: 60, title: "Ana sayfa", keywords: ["ana sayfa", "sestek"] },
  { path: "/tr/hakkimizda", priority: 60, keywords: ["şirket", "ekip", "tarihçe"] },
  { path: "/tr/neden-sestek", priority: 60, keywords: ["hakkında", "neden sestek"] },
  { path: "/tr/basari-oykuleri", priority: 70, keywords: ["referanslar", "müşteriler", "vaka"] },
  { path: "/tr/cx-icgoruleri", priority: 55, keywords: ["içgörü", "makale"] },
  { path: "/tr/blog", priority: 50, keywords: ["yazılar", "haberler"] },
  { path: "/tr/webinarlar", priority: 50, keywords: ["webinar", "e-kitap", "rapor"] },
  { path: "/tr/podcastler", priority: 45, keywords: ["podcast", "bölüm"] },
  { path: "/tr/sozluk", priority: 40, keywords: ["terimler", "tanımlar"] },
  { path: "/tr/tanitim-dosyalari", priority: 40, keywords: ["broşür", "tanıtım", "doküman"] },
  { path: "/tr/maliyet-tasarrufu-hesaplama", priority: 50, keywords: ["roi", "hesaplama", "tasarruf"] },
  { path: "/tr/opus-research-2025-raporu", priority: 45, keywords: ["rapor", "opus research"] },
  { path: "/tr/demo-isteyin", priority: 70, keywords: ["demo", "deneyin", "satış"] },
  { path: "/tr/kariyer", priority: 50, keywords: ["iş ilanları", "açık pozisyonlar"] },
  { path: "/tr/is-ortaklari", priority: 50, keywords: ["partner", "iş ortağı"] },
  { path: "/tr/ar-ge", priority: 40, keywords: ["arge", "araştırma"] },
  { path: "/tr/uyumluluk-ve-guvenlik", priority: 50, keywords: ["kvkk", "gdpr", "güvenlik"] },
  { path: "/tr/gizlilik-ve-uyum", priority: 40, keywords: ["gizlilik", "veri koruma"] },
];
