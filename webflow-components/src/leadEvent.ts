/**
 * leadEvent — form başarıyla CRM'e yazıldığında dataLayer'a dönüşüm event'i.
 *
 * Yalnız GERÇEK başarıda çağrılır (sunucu ok döndükten sonra). Honeypot
 * dolu (bot) gönderimlerde ve hata durumlarında event ÇIKMAZ.
 *
 *   dataLayer.push({ lead: null })   // önceki gönderimden kalan veriyi temizler
 *   dataLayer.push({
 *     event: "form_submit_success",
 *     form_type,                      // "frm-demo" | "frm-contact" | "frm-newsletter" | …
 *     event_id,                       // Google Ads orderId + OpenAI tekilleştirme
 *     page_url,
 *     lead: { email, phone, first_name, last_name, country }
 *   })
 *
 * lead içindeki alanlar formda yoksa (ör. newsletter yalnız e-posta) ya da
 * boşsa anahtar hiç eklenmez — GTM'de boş string yerine undefined görülür.
 * phone yalnız geçerli E.164 ise eklenir (+905XXXXXXXXX).
 */

export interface LeadData {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  country?: string;
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      return crypto.randomUUID();
  } catch {
    /* güvenli olmayan bağlam — aşağıdaki yedeğe düş */
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function pushLeadEvent(formType: string, lead: LeadData): void {
  if (typeof window === "undefined") return;
  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];

    const clean: LeadData = {};
    (Object.keys(lead) as (keyof LeadData)[]).forEach((k) => {
      const v = (lead[k] || "").trim();
      if (v) clean[k] = v;
    });

    w.dataLayer.push({ lead: null });
    w.dataLayer.push({
      event: "form_submit_success",
      form_type: formType,
      event_id: uuid(),
      page_url: location.href,
      lead: clean,
    });
  } catch {
    /* izleme hatası formun başarı akışını asla bozmamalı */
  }
}
