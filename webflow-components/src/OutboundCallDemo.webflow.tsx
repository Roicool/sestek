import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { OutboundCallDemo } from "./OutboundCallDemo";

export default declareComponent(OutboundCallDemo, {
  name: "Outbound Call Demo",
  description:
    "'Sizi arayalım' canlı demo sahnesi — solda içerik + cam adım kartları, " +
    "sağda CSS ile çizilmiş GERÇEKÇİ TELEFON: Dynamic Island, gerçek saatli " +
    "status bar, ekranda bottom-sheet form (canlı WebGL asistan orb'u, +90 " +
    "çipli canlı biçimlenen telefon girişi). Başarıda ekran arama ekranına " +
    "döner (Aranıyor + halkalı orb). Knovvu outbound proxy'sine gönderir " +
    "(docs/outbound-demo-api.md); doğrulama + KVKK + honeypot + kalıcı " +
    "cooldown içerir. Font sayfadan miras alınır.",
  group: "Sestek",
  props: {
    theme: props.Variant({
      name: "Theme",
      options: ["Deep", "Soft"],
      defaultValue: "Deep",
      tooltip: "Deep: koyu premium sahne · Soft: açık pastel",
    }),
    eyebrow: props.Text({
      name: "Eyebrow",
      group: "Content",
      defaultValue: "Canlı Demo",
    }),
    heading: props.Text({
      name: "Heading",
      group: "Content",
      defaultValue: "Knovvu sizi arasın,",
    }),
    headingAccent: props.Text({
      name: "Heading accent",
      group: "Content",
      defaultValue: "kendiniz deneyimleyin",
      tooltip: "Gradient renkli vurgu kısmı",
    }),
    description: props.Text({
      name: "Description",
      group: "Content",
      defaultValue:
        "Numaranızı bırakın; yapay zekâ destekli sesli asistanımız sizi " +
        "saniyeler içinde arasın, gerçek bir görüşmede dinleyin.",
    }),
    step1: props.Text({
      name: "Step 1",
      group: "Content",
      defaultValue: "Numaranı bırak",
    }),
    step2: props.Text({
      name: "Step 2",
      group: "Content",
      defaultValue: "Telefonun çalsın",
    }),
    step3: props.Text({
      name: "Step 3",
      group: "Content",
      defaultValue: "Knovvu ile konuş",
      tooltip: "Boş bırakılan adımlar gizlenir",
    }),
    agentName: props.Text({
      name: "Agent name",
      group: "Content",
      defaultValue: "Knovvu Sesli Asistan",
    }),
    agentStatus: props.Text({
      name: "Agent status",
      group: "Content",
      defaultValue: "Çevrimiçi",
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
    sendingText: props.Text({
      name: "Sending text",
      group: "Form",
      defaultValue: "Bağlanıyor…",
    }),
    successTitle: props.Text({
      name: "Success title",
      group: "Form",
      defaultValue: "Aranıyor",
    }),
    successText: props.Text({
      name: "Success text",
      group: "Form",
      defaultValue:
        "Telefonunuz birazdan çalacak — açtığınızda Knovvu'nun doğal " +
        "sesiyle karşılaşacaksınız.",
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
