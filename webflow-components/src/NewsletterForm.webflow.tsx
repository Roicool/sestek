import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { NewsletterForm } from "./NewsletterForm";

export default declareComponent(NewsletterForm, {
  name: "Newsletter Form",
  description:
    "Tek alanlı e-posta kayıt pill'i — solda input, içinde renkli buton, " +
    "altta caption. CRM lead endpoint'ine DOĞRUDAN gönderir (formType " +
    "frm-newsletter), UTM'leri sticky-utms'ten ekler, honeypot içerir. " +
    "Sola dayalı/ortalı hizalama ve Brand/Lime/Ink renk varyantları; " +
    "mobilde alt alta. Font sayfadan miras alınır.",
  group: "Sestek",
  props: {
    theme: props.Variant({
      name: "Theme",
      options: ["Soft", "Deep"],
      defaultValue: "Soft",
      tooltip: "Soft: açık zemin · Deep: koyu zemin üzeri",
    }),
    mode: props.Variant({
      name: "Type",
      options: ["Subscribe", "Demo"],
      defaultValue: "Subscribe",
      tooltip:
        "Subscribe: CRM'e newsletter kaydı gönderir · Demo: e-postayı " +
        "alıp Request a Demo sayfasına taşır (Business email önceden " +
        "dolu gelir), kayıt atılmaz",
    }),
    demoUrl: props.Text({
      name: "Demo page URL",
      group: "API",
      defaultValue: "/request-a-demo",
      tooltip: "Type=Demo iken yönlendirilecek sayfa",
    }),
    align: props.Variant({
      name: "Align",
      options: ["Left", "Center"],
      defaultValue: "Left",
      tooltip: "Pill + caption hizası (Center: blok ortalanır)",
    }),
    accent: props.Variant({
      name: "Accent",
      options: ["Magenta", "Lilac", "Turquoise", "Gradient"],
      defaultValue: "Magenta",
      tooltip:
        "SESTEK paleti — Magenta #EC008C · Lilac #7F81AE · Turquoise " +
        "#00FFEB · Gradient: üçünün geçişi",
    }),
    placeholder: props.Text({
      name: "Placeholder",
      group: "Content",
      defaultValue: "What's your work email?",
    }),
    buttonText: props.Text({
      name: "Button text",
      group: "Content",
      defaultValue: "Subscribe",
    }),
    sendingText: props.Text({
      name: "Sending text",
      group: "Content",
      defaultValue: "Sending…",
    }),
    caption: props.Text({
      name: "Caption",
      group: "Content",
      defaultValue:
        "AI-powered CX insights in your inbox — no spam, unsubscribe anytime.",
      tooltip: "Pill'in altındaki küçük metin — boşsa görünmez",
    }),
    successText: props.Text({
      name: "Success text",
      group: "Content",
      defaultValue: "You're in — see you in your inbox.",
      tooltip: "Başarıda pill içeriğinin yerini alır",
    }),
    endpoint: props.Text({
      name: "API endpoint",
      group: "API",
      defaultValue: "/demos/api/crm/lead",
      tooltip: "CRM lead proxy path'i (bkz. CRMFORMSREPORT.md)",
    }),
    formType: props.Text({
      name: "Form type",
      group: "API",
      defaultValue: "frm-newsletter",
      tooltip: "Dynamics ses_formtype değeri",
    }),
    freeEmail: props.Variant({
      name: "Free email",
      group: "API",
      options: ["Block", "Allow"],
      defaultValue: "Allow",
      tooltip:
        "Block: gmail/hotmail gibi ücretsiz sağlayıcılar reddedilir " +
        "(kurumsal e-posta zorunlu) · Allow: kabul edilir. Tek kullanımlık " +
        "adresler her iki durumda da reddedilir.",
    }),
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "EN",
      tooltip: "Doğrulama/hata mesajlarının dili",
    }),
    turnstileSiteKey: props.Text({
      name: "Turnstile site key (ops.)",
      group: "API",
      defaultValue: "",
      tooltip:
        "Cloudflare Turnstile SITE key. Genelde BOŞ bırakılır: anahtar site " +
        "geneli custom code'da tek yerde tanımlanır " +
        "(window.SESTEK_TURNSTILE_SITE_KEY) ve buradan okunur. Yalnız bu " +
        "örneğe özel bir anahtar gerekiyorsa doldur. Site key gizli değildir; " +
        "secret key yalnız sunucunun ortam değişkeninde durur.",
    }),
  },
});
