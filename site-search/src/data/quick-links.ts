/*
 * Quick links — what the palette shows BEFORE the visitor types anything.
 * Curated, grouped hub pages (products, solutions, resources, company), so
 * the search never opens empty — even while the index is still loading or
 * the index endpoint is not deployed yet. Paths match the NEW site's sitemap
 * (rc-sestek.webflow.io → www.sestek.com), see ../../sitemap.staging.paths.txt.
 *
 * Override from the Designer with one entry per link, entries separated by a
 * newline or ";" (Designer Text props are single-line):
 *   Group | Title | /path | short summary (optional) | image URL (optional)
 * Entries starting with "#" are ignored. Same group label ⇒ same section.
 */

import type { SearchDoc, SearchLocale } from "../lib/search/types";
import { kindForPath } from "../lib/search/kinds";

export interface QuickGroup {
  label: string;
  items: SearchDoc[];
}

const CDN = "https://cdn.prod.website-files.com/6a15f6e39b139e2c81103be6/";
/** Default preview visual (Sagitone gradient already hosted on the site). */
export const DEFAULT_PREVIEW_IMAGE = CDN + "6a9089e4cfa09edf607d5721_02.%20Sagitone%20Gradient-01.jpg";

const CONTACT_TOKEN = "{contact}";

export const QUICK_LINKS_TEXT: Record<SearchLocale, string> = {
  en: `
Products | Agentic AI | /agentic-ai | Voice-first AI agents that understand, act and resolve requests in real time.
Products | Agent Copilot | /agent-copilot | Real-time guidance, summaries and translation for human agents.
Products | Conversational Intelligence | /conversational-intelligence | Analytics, quality and coaching from 100% of interactions.
Products | AI Agents | /products/ai-agents | Voice and chat agents for self-service across every channel.
Products | Analytics | /products/analytics | Speech and conversation analytics for quality, compliance and insight.
Products | Speech Recognition | /products/speech-recognition | Accurate, multilingual speech-to-text for calls and apps.
Products | Text to Speech | /products/text-to-speech | Natural, expressive synthetic voices in many languages.
Solutions | Customer care | /solutions/customer-care | Resolve routine requests automatically, escalate the rest.
Solutions | Collection | /solutions/collection | Proactive, compliant payment reminders and collection calls.
Solutions | Technical support | /solutions/technical-support | Guided troubleshooting without the queue.
Solutions | Financial services | /industries/financial-services | Conversational AI for banks and fintechs.
Solutions | Insurance | /industries/insurance | Claims, policies and service automation for insurers.
Solutions | Telecommunications | /industries/telecommunications | Scale support for operators and subscribers.
Resources | Success stories | /success-stories | How customers deploy Sestek and what they gained.
Resources | CX Insights | /cx-insights | Short reads on AI, customer experience and what's next.
Resources | Blog | /blog | Articles on conversational AI, CX and speech technology.
Resources | Webinars | /webinars | On-demand webinars, e-books and reports.
Resources | Podcasts | /podcasts | Conversations with industry leaders.
Resources | Glossary | /glossary | Key terms in conversational AI, explained.
Company | About us | /about-us | Who we are, our story and our team.
Company | Why Sestek | /why-sestek | 25 years of speech and conversational AI expertise.
Company | Careers | /careers | Open positions and life at Sestek.
Company | Partners | /partners | Partner program and ecosystem.
Company | Request a demo | /request-a-demo | See the platform live with our team.
Company | Contact | {contact} | Talk to us about your project.
`,
  tr: `
Ürünler | Agentic AI | /tr/agentic-ai | Talepleri gerçek zamanlı anlayan, harekete geçen ve çözen sesli yapay zeka ajanları.
Ürünler | Agent Copilot | /tr/agent-copilot | Temsilciler için gerçek zamanlı yönlendirme, özet ve çeviri.
Ürünler | Conversational Intelligence | /tr/conversational-intelligence | Tüm görüşmelerden analiz, kalite ve koçluk.
Ürünler | AI Agents | /tr/urunler/ai-agents | Her kanalda self-servis için sesli ve yazılı yapay zeka ajanları.
Ürünler | Analytics | /tr/urunler/analytics | Kalite, uyum ve içgörü için konuşma analizi.
Ürünler | Speech Recognition | /tr/urunler/speech-recognition | Çağrı ve uygulamalar için çok dilli konuşma tanıma.
Ürünler | Text to Speech | /tr/urunler/tts | Doğal ve akıcı sentetik sesler.
Çözümler | Müşteri hizmetleri | /tr/cozumler/musteri-hizmetleri | Rutin talepleri otomatik çözün, gerekeni temsilciye aktarın.
Çözümler | Tahsilat | /tr/cozumler/tahsilat-hatirlatma | Proaktif ve uyumlu ödeme hatırlatma aramaları.
Çözümler | Teknik destek | /tr/cozumler/teknik-destek | Kuyruksuz, yönlendirmeli arıza çözümü.
Çözümler | Finansal servisler | /tr/sektorler/finansal-servisler | Bankalar ve fintech'ler için konuşma tabanlı yapay zeka.
Çözümler | Sigorta | /tr/sektorler/sigorta | Sigorta şirketleri için hasar, poliçe ve hizmet otomasyonu.
Çözümler | Telekomünikasyon | /tr/sektorler/telekomunikasyon | Operatörler için ölçeklenebilir müşteri desteği.
Kaynaklar | Başarı öyküleri | /tr/basari-oykuleri | Müşterilerimiz Sestek'i nasıl kullanıyor, ne kazandı.
Kaynaklar | CX İçgörüleri | /tr/cx-icgoruleri | Yapay zeka ve müşteri deneyimi üzerine kısa okumalar.
Kaynaklar | Blog | /tr/blog | Konuşma tabanlı yapay zeka ve müşteri deneyimi yazıları.
Kaynaklar | Webinarlar | /tr/webinarlar | Webinar kayıtları, e-kitaplar ve raporlar.
Kaynaklar | Podcastler | /tr/podcastler | Sektör liderleriyle sohbetler.
Kaynaklar | Sözlük | /tr/sozluk | Konuşma tabanlı yapay zeka terimleri.
Kurumsal | Hakkımızda | /tr/hakkimizda | Biz kimiz, hikâyemiz ve ekibimiz.
Kurumsal | Neden Sestek | /tr/neden-sestek | 25 yıllık konuşma teknolojisi ve yapay zeka deneyimi.
Kurumsal | Kariyer | /tr/kariyer | Açık pozisyonlar ve Sestek'te çalışmak.
Kurumsal | İş ortakları | /tr/is-ortaklari | İş ortaklığı programı ve ekosistem.
Kurumsal | Demo isteyin | /tr/demo-isteyin | Platformu ekibimizle canlı görün.
Kurumsal | İletişim | {contact} | Projenizi konuşalım.
`,
};

/**
 * Parse "Group | Title | /path | summary | image" lines into groups.
 * `{contact}` resolves to `contactHref`; the line is dropped when it is empty.
 */
export function parseQuickLinks(text: string, locale: SearchLocale, contactHref?: string): QuickGroup[] {
  const groups: QuickGroup[] = [];
  const byLabel = new Map<string, QuickGroup>();
  for (const raw of text.split(/\r?\n|;/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [label = "", title = "", pathRaw = "", summary = "", image = ""] = line.split("|").map((s) => s.trim());
    let path = pathRaw;
    if (path === CONTACT_TOKEN) { if (!contactHref) continue; path = contactHref; }
    if (!title || !path) continue;
    const doc: SearchDoc = {
      path,
      title,
      summary,
      kind: kindForPath(path.startsWith("/") ? path : "/"),
      locale,
      ...(image ? { image } : {}),
    };
    let g = byLabel.get(label);
    if (!g) { g = { label, items: [] }; byLabel.set(label, g); groups.push(g); }
    g.items.push(doc);
  }
  return groups;
}

export function defaultQuickLinks(locale: SearchLocale, contactHref?: string): QuickGroup[] {
  return parseQuickLinks(QUICK_LINKS_TEXT[locale] || QUICK_LINKS_TEXT.en, locale, contactHref);
}
