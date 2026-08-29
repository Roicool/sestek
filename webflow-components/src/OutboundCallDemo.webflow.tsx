import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { OutboundCallDemo } from "./OutboundCallDemo";

export default declareComponent(OutboundCallDemo, {
  name: "Outbound Call Demo",
  description:
    "'Sizi arayalım' canlı demo — ikili kart: solda dev canlı orb'lu " +
    "vitrin kartı (telefon butonu sağdaki forma odaklar, altta caption + " +
    "çipler), sağda HER ZAMAN AÇIK form kartı (pill input'lar, +90 çipli " +
    "canlı biçimlenen numara, KVKK, siyah CTA). Gönderince sağ panel " +
    "'Aranıyor' olur, soldaki orb hızlanıp halkalanır. Knovvu outbound " +
    "proxy'sine gönderir (docs/outbound-demo-api.md); doğrulama + honeypot " +
    "+ kalıcı cooldown içerir. Font sayfadan miras alınır.",
  group: "Sestek",
  props: {
    theme: props.Variant({
      name: "Theme",
      options: ["Soft", "Deep"],
      defaultValue: "Soft",
      tooltip: "Soft: açık minimal (referans görünüm) · Deep: koyu hali",
    }),
    heading: props.Text({
      name: "Heading",
      group: "Content",
      defaultValue: "Let Us Call You",
    }),
    description: props.Text({
      name: "Caption",
      group: "Content",
      defaultValue:
        "Leave your number and Knovvu's voice agent will call you within " +
        "seconds — hear it in a real conversation.",
      tooltip: "Sol alttaki kısa açıklama",
    }),
    chip1: props.Text({
      name: "Chip 1",
      group: "Content",
      defaultValue: "Real phone call",
    }),
    chip2: props.Text({
      name: "Chip 2",
      group: "Content",
      defaultValue: "Natural voice",
    }),
    chip3: props.Text({
      name: "Chip 3",
      group: "Content",
      defaultValue: "Within seconds",
      tooltip: "Sağ alttaki çipler; boş bırakılan gizlenir",
    }),
    agentName: props.Text({
      name: "Agent name",
      group: "Content",
      defaultValue: "Knovvu Voice Agent",
      tooltip: "Aranıyor sahnesinde görünür",
    }),
    nameLabel: props.Text({
      name: "Name placeholder",
      group: "Form",
      defaultValue: "Your name",
    }),
    phoneLabel: props.Text({
      name: "Phone placeholder",
      group: "Form",
      defaultValue: "5XX XXX XX XX",
    }),
    consentText: props.Text({
      name: "Consent text",
      group: "Form",
      defaultValue:
        "I consent to my personal data being processed for this demo call.",
    }),
    consentLinkText: props.Text({
      name: "Consent link text",
      group: "Form",
      defaultValue: "Privacy Policy",
      tooltip: "Consent cümlesinin sonuna eklenen link metni",
    }),
    consentLinkUrl: props.Text({
      name: "Consent link URL",
      group: "Form",
      defaultValue: "",
      tooltip: "KVKK / Privacy Policy sayfası (boşsa link görünmez)",
    }),
    buttonText: props.Text({
      name: "Button text",
      group: "Form",
      defaultValue: "Call me",
    }),
    sendingText: props.Text({
      name: "Sending text",
      group: "Form",
      defaultValue: "Connecting…",
    }),
    successTitle: props.Text({
      name: "Success title",
      group: "Form",
      defaultValue: "Calling",
    }),
    successText: props.Text({
      name: "Success caption",
      group: "Form",
      defaultValue:
        "Your phone will ring in a moment — pick up and meet Knovvu's " +
        "natural voice.",
      tooltip: "Aranıyor sahnesinde sol alt caption'ın yerini alır",
    }),
    sideTitle: props.Text({
      name: "Side title",
      group: "Side",
      defaultValue: "Try it now",
      tooltip: "Sağ form kartının başlığı",
    }),
    sideIntro: props.Text({
      name: "Side intro",
      group: "Side",
      defaultValue:
        "Just your name and number — we don't ask for anything else.",
      tooltip: "Form alanlarının üstündeki kısa açıklama",
    }),
    sideCaption: props.Text({
      name: "Side caption",
      group: "Side",
      defaultValue:
        "Your number is used only for this demo call and never stored.",
      tooltip: "Sağ kartın en altındaki güven notu",
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
      defaultValue: "EN",
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
