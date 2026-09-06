/*
 * Quick links — what the palette shows BEFORE the visitor types anything.
 * Curated, grouped hub pages (products, solutions, resources, company), so
 * the search never opens empty — even while the index is still loading or
 * the index endpoint is not deployed yet. Paths match the sitemap.
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
Products | Agent Copilot | /knovvu-agent-copilot | Real-time guidance, summaries and translation for human agents.
Products | Virtual Agent | /virtual-agent | Conversational virtual assistant for voice and chat self-service.
Products | Speech Analytics | /speech-analytics | Analyze 100% of interactions for quality, compliance and insight.
Products | Voice Biometrics | /voice-biometrics | Passive caller authentication and fraud detection by voiceprint.
Products | Conversational IVR | /conversational-ivr | Natural-language IVR that routes and resolves without menus.
Products | Text to Speech | /text-to-speech | Natural, expressive synthetic voices in many languages.
Solutions | Banking | /solutions-for-banking | Conversational AI for retail and digital banking.
Solutions | Insurance | /solutions-for-insurance | Claims, policies and service automation for insurers.
Solutions | Contact centers | /conversational-ai-for-contact-centers | End-to-end conversational AI for contact center performance.
Resources | Success stories | /success-stories | How customers deploy Sestek and what they gained.
Resources | Webinars | /webinars-resources | On-demand webinars, e-books and reports.
Resources | Blog | /all-blog-posts-resources | Articles on conversational AI, CX and speech technology.
Resources | Podcasts | /podcasts-resources | Conversations with industry leaders.
Resources | Glossary | /glossary | Key terms in conversational AI, explained.
Resources | Demos | /demos | Try speech recognition, text-to-speech and more in the browser.
Company | About us | /about-us | Who we are, our story and our team.
Company | Why Sestek | /whysestek | 25 years of speech and conversational AI expertise.
Company | Careers | /careers | Open positions and life at Sestek.
Company | Partners | /partners | Partner program and ecosystem.
Company | Request a demo | /request-a-demo | See the platform live with our team.
Company | Contact | {contact} | Talk to us about your project.
`,
  tr: `
Ürünler | Agentic AI | /tr/agentic-ai | Talepleri gerçek zamanlı anlayan, harekete geçen ve çözen sesli yapay zeka ajanları.
Ürünler | Agent Copilot | /tr/knovvu-agent-copilot | Temsilciler için gerçek zamanlı yönlendirme, özet ve çeviri.
Ürünler | Virtual Agent | /tr/virtual-agent | Ses ve yazılı kanallarda self-servis için sanal asistan.
Ürünler | Speech Analytics | /tr/speech-analytics | Kalite, uyum ve içgörü için tüm görüşmelerin analizi.
Ürünler | Voice Biometrics | /tr/voice-biometrics | Ses izinden pasif kimlik doğrulama ve dolandırıcılık tespiti.
Ürünler | Text to Speech | /tr/text-to-speech | Doğal ve akıcı sentetik sesler.
Çözümler | Bankacılık | /tr/bankalar-icin-cozumler | Bireysel ve dijital bankacılık için konuşma tabanlı yapay zeka.
Çözümler | Sigortacılık | /tr/sigortacilik-icin-cozumler | Sigorta şirketleri için hasar, poliçe ve hizmet otomasyonu.
Çözümler | Çağrı merkezleri | /tr/cagri-merkezleri-icin-cozumler | Çağrı merkezi performansı için uçtan uca çözümler.
Çözümler | Telekom | /tr/telekom-icin-cozumler | Telekom operatörleri için yapay zeka çözümleri.
Kaynaklar | Başarı öyküleri | /tr/basari-oykuleri | Müşterilerimiz Sestek'i nasıl kullanıyor, ne kazandı.
Kaynaklar | Webinarlar | /tr/webinarlar-kaynaklar | Webinar kayıtları, e-kitaplar ve raporlar.
Kaynaklar | Blog | /tr/tum-blog-yazilari-kaynaklar | Konuşma tabanlı yapay zeka ve müşteri deneyimi yazıları.
Kaynaklar | Podcastler | /tr/podcastler-kaynaklar | Sektör liderleriyle sohbetler.
Kaynaklar | Sözlük | /tr/sozluk | Konuşma tabanlı yapay zeka terimleri.
Kaynaklar | Tanıtım dosyaları | /tr/tanitim-dosyalari | Ürün broşürleri ve tanıtım dokümanları.
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
