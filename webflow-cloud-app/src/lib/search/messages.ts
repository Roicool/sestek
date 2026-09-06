/* UI strings — EN default (site's primary locale), TR for /tr pages. */

export type Messages = {
  placeholder: string;
  hint: string;
  suggestions: string;
  results: string;
  empty: string;
  emptyHint: string;
  contact: string;
  assistant: string;
  close: string;
  open: string;
  kinds: Record<string, string>;
};

export const MESSAGES: Record<"en" | "tr", Messages> = {
  en: {
    placeholder: "Search products, solutions, stories…",
    hint: "Type to search · ↑↓ to move · Enter to open · Esc to close",
    suggestions: "Popular",
    results: "Results",
    empty: "We couldn't find a matching page.",
    emptyHint: "Try a product name like “Agent Copilot” or a topic like “speech analytics”.",
    contact: "Contact us",
    assistant: "Ask the assistant",
    close: "Close search",
    open: "Search",
    kinds: { product: "Product", solution: "Solution", "case-study": "Customer story", blog: "Blog", resource: "Resource", career: "Careers", page: "Page" },
  },
  tr: {
    placeholder: "Ürün, çözüm, başarı öyküsü ara…",
    hint: "Yazarak ara · ↑↓ gez · Enter aç · Esc kapat",
    suggestions: "Popüler",
    results: "Sonuçlar",
    empty: "Eşleşen bir sayfa bulamadık.",
    emptyHint: "“Agent Copilot” gibi bir ürün adı ya da “konuşma analizi” gibi bir konu deneyin.",
    contact: "Bize ulaşın",
    assistant: "Asistana sor",
    close: "Aramayı kapat",
    open: "Ara",
    kinds: { product: "Ürün", solution: "Çözüm", "case-study": "Başarı öyküsü", blog: "Blog", resource: "Kaynak", career: "Kariyer", page: "Sayfa" },
  },
};
