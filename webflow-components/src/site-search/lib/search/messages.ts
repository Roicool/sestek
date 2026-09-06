/* UI strings — EN default (site's primary locale), TR for /tr pages. */

export type Messages = {
  eyebrow: string;
  placeholder: string;
  quick: string;
  quickHint: string;
  results: string;
  resultsHint: string;
  empty: string;
  emptyHint: string;
  contact: string;
  demo: string;
  openPage: string;
  close: string;
  open: string;
  navigate: string;
  enter: string;
  esc: string;
  loading: string;
  kinds: Record<string, string>;
};

export const MESSAGES: Record<"en" | "tr", Messages> = {
  en: {
    eyebrow: "Sestek · Site search",
    placeholder: "Search products, solutions, customer stories…",
    quick: "Quick access",
    quickHint: "Jump straight to key products, solutions and company pages.",
    results: "Results",
    resultsHint: "Best matches first — products and solutions rank above blog posts.",
    empty: "We couldn't find a matching page.",
    emptyHint: "Try a product name like “Agent Copilot” or a topic like “speech analytics”.",
    contact: "Contact us",
    demo: "Request a demo",
    openPage: "Open page",
    close: "Close search",
    open: "Search",
    navigate: "navigate",
    enter: "open",
    esc: "close",
    loading: "Loading…",
    kinds: { product: "Product", solution: "Solution", "case-study": "Customer story", blog: "Blog", resource: "Resource", career: "Careers", page: "Page" },
  },
  tr: {
    eyebrow: "Sestek · Site araması",
    placeholder: "Ürün, çözüm ve başarı öykülerini ara…",
    quick: "Hızlı erişim",
    quickHint: "Öne çıkan ürün, çözüm ve kurumsal sayfalara doğrudan ulaşın.",
    results: "Sonuçlar",
    resultsHint: "En iyi eşleşmeler önce — ürün ve çözümler blog yazılarının üstünde sıralanır.",
    empty: "Eşleşen bir sayfa bulamadık.",
    emptyHint: "“Agent Copilot” gibi bir ürün adı ya da “konuşma analizi” gibi bir konu deneyin.",
    contact: "Bize ulaşın",
    demo: "Demo isteyin",
    openPage: "Sayfayı aç",
    close: "Aramayı kapat",
    open: "Ara",
    navigate: "gezin",
    enter: "aç",
    esc: "kapat",
    loading: "Yükleniyor…",
    kinds: { product: "Ürün", solution: "Çözüm", "case-study": "Başarı öyküsü", blog: "Blog", resource: "Kaynak", career: "Kariyer", page: "Sayfa" },
  },
};
