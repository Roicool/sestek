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
      defaultValue: "Sizi Arayalım",
    }),
    description: props.Text({
      name: "Caption",
      group: "Content",
      defaultValue:
        "Numaranızı bırakın, Knovvu sesli asistanı saniyeler içinde " +
        "arasın — gerçek bir görüşmede dinleyin.",
      tooltip: "Sol alttaki kısa açıklama",
    }),
    chip1: props.Text({
      name: "Chip 1",
      group: "Content",
      defaultValue: "Gerçek arama",
    }),
    chip2: props.Text({
      name: "Chip 2",
      group: "Content",
      defaultValue: "Doğal ses",
    }),
    chip3: props.Text({
      name: "Chip 3",
      group: "Content",
      defaultValue: "Saniyeler içinde",
      tooltip: "Sağ alttaki çipler; boş bırakılan gizlenir",
    }),
    agentName: props.Text({
      name: "Agent name",
      group: "Content",
      defaultValue: "Knovvu Sesli Asistan",
      tooltip: "Aranıyor sahnesinde görünür",
    }),
    nameLabel: props.Text({
      name: "Name placeholder",
      group: "Form",
      defaultValue: "Adınız",
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
      name: "Success caption",
      group: "Form",
      defaultValue:
        "Telefonunuz birazdan çalacak — açtığınızda Knovvu'nun doğal " +
        "sesiyle karşılaşacaksınız.",
      tooltip: "Aranıyor sahnesinde sol alt caption'ın yerini alır",
    }),
    sideTitle: props.Text({
      name: "Side title",
      group: "Side",
      defaultValue: "Hemen deneyin",
      tooltip: "Sağ form kartının başlığı",
    }),
    sideIntro: props.Text({
      name: "Side intro",
      group: "Side",
      defaultValue:
        "Adınızı ve numaranızı bırakın — başka hiçbir bilgi istemiyoruz.",
      tooltip: "Form alanlarının üstündeki kısa açıklama",
    }),
    sideCaption: props.Text({
      name: "Side caption",
      group: "Side",
      defaultValue:
        "Numaranız yalnız bu demo araması için kullanılır, kayıt tutulmaz.",
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
