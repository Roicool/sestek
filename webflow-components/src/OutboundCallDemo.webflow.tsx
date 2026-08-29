import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { OutboundCallDemo } from "./OutboundCallDemo";

export default declareComponent(OutboundCallDemo, {
  name: "Outbound Call Demo",
  description:
    "'Sizi arayalım' canlı demo section'ı — solda içerik, sağda form; " +
    "container-2xl genişliğinde, RC token'larına bağlı (site renklerini " +
    "otomatik alır), mobilde tek kolon. Form Knovvu outbound proxy'sine " +
    "gönderir (docs/outbound-demo-api.md); TR telefon doğrulama, KVKK onayı, " +
    "honeypot ve kalıcı cooldown içerir.",
  group: "Sestek",
  props: {
    eyebrow: props.Text({
      name: "Eyebrow",
      group: "Content",
      defaultValue: "Canlı Demo",
    }),
    heading: props.Text({
      name: "Heading",
      group: "Content",
      defaultValue: "Knovvu sizi arasın, kendiniz deneyimleyin",
    }),
    description: props.Text({
      name: "Description",
      group: "Content",
      defaultValue:
        "Numaranızı bırakın; yapay zekâ destekli sesli asistanımız sizi " +
        "saniyeler içinde arasın, gerçek bir görüşmede dinleyin.",
    }),
    bullet1: props.Text({
      name: "Bullet 1",
      group: "Content",
      defaultValue: "Gerçek zamanlı, insan gibi konuşan sesli asistan",
    }),
    bullet2: props.Text({
      name: "Bullet 2",
      group: "Content",
      defaultValue: "Saniyeler içinde telefonunuz çalar",
    }),
    bullet3: props.Text({
      name: "Bullet 3",
      group: "Content",
      defaultValue: "Kaydolmadan, ücretsiz deneyin",
      tooltip: "Boş bırakılan maddeler gizlenir",
    }),
    nameLabel: props.Text({
      name: "Name label",
      group: "Form",
      defaultValue: "Adınız",
    }),
    phoneLabel: props.Text({
      name: "Phone label",
      group: "Form",
      defaultValue: "Cep telefonunuz",
    }),
    consentText: props.Text({
      name: "Consent text",
      group: "Form",
      defaultValue:
        "Kişisel verilerimin demo araması için işlenmesine onay veriyorum.",
    }),
    buttonText: props.Text({
      name: "Button text",
      group: "Form",
      defaultValue: "Beni ara",
    }),
    successTitle: props.Text({
      name: "Success title",
      group: "Form",
      defaultValue: "Aramanız yolda!",
    }),
    successText: props.Text({
      name: "Success text",
      group: "Form",
      defaultValue:
        "Telefonunuz birazdan çalacak — Knovvu sesli asistanı sizi arıyor.",
    }),
    endpoint: props.Text({
      name: "API endpoint",
      group: "API",
      defaultValue: "/demos/api/demos/outbound-call",
      tooltip: "Outbound proxy path'i (bkz. docs/outbound-demo-api.md)",
    }),
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "TR",
      tooltip:
        "Hem arama dili (Knovvu Language parametresi) hem doğrulama " +
        "mesajlarının dili",
    }),
    cooldownSeconds: props.Number({
      name: "Cooldown (s)",
      group: "API",
      defaultValue: 600,
      tooltip: "Aynı numaraya tekrar istek için bekleme (client-side)",
    }),
  },
});
