import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { TtsDemo } from "./TtsDemo";

export default declareComponent(TtsDemo, {
  name: "TTS Demo",
  description:
    "Text-to-Speech & Voice Cloning demo iframe'i (tts-cloning-demo.sestek.com), Webflow'daki iki onaylı embed'in React hali. " +
    "Side by side: solda eyebrow + başlık + açıklama + 2 stagger buton, sağda demo paneli (büyük ekran 593px panel / 728px iframe; " +
    "kısa masaüstü 760×728 @ zoom .648; telefonda alt alta, tam genişlik 840px). Full width: yalnız iframe, ortalı, 960×649 tabanından " +
    "genişlik + yüksekliğe göre ölçekli. Dil sayfadan otomatik (tr → tr-TR). iframe viewport'a yaklaşınca yüklenir, mikrofon izni açık.",
  group: "Sestek",
  props: {
    layout: props.Variant({ name: "Layout", group: "Layout", options: ["Side by side", "Full width"], defaultValue: "Side by side", tooltip: "Side by side = /demos genel sayfası (metin + panel) · Full width = /demos/tts detay sayfası (yalnız iframe)" }),
    textSide: props.Variant({ name: "Text side", group: "Layout", options: ["Left", "Right"], defaultValue: "Left" }),
    framed: props.Boolean({ name: "Frame border", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Panel etrafında ince çerçeve + köşe yuvarlağı" }),
    mobileHeight: props.Number({ name: "Mobile height (px)", group: "Layout", defaultValue: 840, tooltip: "≤767px'te iframe yüksekliği" }),
    bottomMargin: props.Number({ name: "Bottom margin (px)", group: "Layout", defaultValue: 80, tooltip: "Full width'te panelin alt boşluğu" }),

    eyebrow: props.Text({ name: "Eyebrow", group: "Text", defaultValue: "Text to speech" }),
    title: props.Text({ name: "Title", group: "Text", defaultValue: "Text to Speech & Voice Cloning" }),
    description: props.Text({ name: "Description", group: "Text", defaultValue: "Type any sentence, pick a language and a voice, and hear it spoken back with a natural, human-like tone. You can also clone a voice from a short recording and generate speech with it." }),

    link1Label: props.Text({ name: "Link 1 label", group: "Links", defaultValue: "Open the full page", tooltip: "Boş = link yok" }),
    link1Url: props.Text({ name: "Link 1 URL", group: "Links", defaultValue: "https://rc-sestek.webflow.io/demos/tts" }),
    link1Style: props.Variant({ name: "Link 1 style", group: "Links", options: ["Dark", "White", "Brand secondary", "Brand primary"], defaultValue: "Dark", tooltip: "Sitenin stagger butonu (harf harf hover)" }),
    link1NewTab: props.Boolean({ name: "Link 1 new tab", group: "Links", defaultValue: false, trueLabel: "On", falseLabel: "Off" }),
    link2Label: props.Text({ name: "Link 2 label", group: "Links", defaultValue: "All voices and languages" }),
    link2Url: props.Text({ name: "Link 2 URL", group: "Links", defaultValue: "https://docs.sestek.com/docs/tts-supported-languages-and-voices" }),
    link2Style: props.Variant({ name: "Link 2 style", group: "Links", options: ["Dark", "White", "Brand secondary", "Brand primary"], defaultValue: "White" }),
    link2NewTab: props.Boolean({ name: "Link 2 new tab", group: "Links", defaultValue: true, trueLabel: "On", falseLabel: "Off" }),

    iframeSrc: props.Text({ name: "Demo URL", group: "Demo", defaultValue: "https://tts-cloning-demo.sestek.com:12443/Demo.aspx?lang={lang}&embed=1", tooltip: "{lang} yerine seçilen dil yazılır" }),
    lang: props.Variant({ name: "Language", group: "Demo", options: ["Auto", "en-US", "tr-TR"], defaultValue: "Auto", tooltip: "Auto = /tr ya da <html lang> tr ise tr-TR, değilse en-US" }),
  },
  options: { ssr: false },
});
