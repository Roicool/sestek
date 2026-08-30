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
    align: props.Variant({
      name: "Align",
      options: ["Left", "Center"],
      defaultValue: "Left",
      tooltip: "Pill + caption hizası (Center: blok ortalanır)",
    }),
    accent: props.Variant({
      name: "Accent",
      options: ["Brand", "Lime", "Ink"],
      defaultValue: "Brand",
      tooltip:
        "Buton rengi — Brand: site birincil rengi · Lime: fosforlu sarı " +
        "· Ink: siyah",
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
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "EN",
      tooltip: "Doğrulama/hata mesajlarının dili",
    }),
  },
});
