import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { SttDemo } from "./SttDemo";

export default declareComponent(SttDemo, {
  name: "STT Demo",
  description:
    "Speech Recognition (speech-to-text) demo iframe'i (sr-demo-performance.sestek.com, 600×600), TTS Demo ile aynı yapı. " +
    "Side by side: solda eyebrow + başlık + açıklama + 2 stagger buton, sağda demo paneli (büyük ekran 600px kare; " +
    "kısa masaüstü zoom .78; telefonda alt alta, kare, ekran genişliğine ölçekli). Full width: yalnız iframe, ortalı, 600×600 tabanından " +
    "genişlik + yüksekliğe göre ölçekli. Dil sayfadan otomatik (tr → tr). iframe viewport'a yaklaşınca yüklenir, kamera + mikrofon izni açık.",
  group: "Sestek",
  props: {
    layout: props.Variant({ name: "Layout", group: "Layout", options: ["Side by side", "Full width"], defaultValue: "Side by side", tooltip: "Side by side = /demos genel sayfası (metin + panel) · Full width = /demos/tts detay sayfası (yalnız iframe)" }),
    textSide: props.Variant({ name: "Text side", group: "Layout", options: ["Left", "Right"], defaultValue: "Left" }),
    framed: props.Boolean({ name: "Frame border", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Panel etrafında ince çerçeve + köşe yuvarlağı" }),
    
    bottomMargin: props.Number({ name: "Bottom margin (px)", group: "Layout", defaultValue: 80, tooltip: "Full width'te panelin alt boşluğu" }),

    eyebrow: props.Text({ name: "Eyebrow", group: "Text", defaultValue: "Speech to text" }),
    title: props.Text({ name: "Title", group: "Text", defaultValue: "Speech Recognition" }),
    description: props.Text({ name: "Description", group: "Text", defaultValue: "Real-time speech to text. Speak into your microphone or upload an audio file of up to 100MB and see every word land as you talk." }),

    link1Label: props.Text({ name: "Link 1 label", group: "Links", defaultValue: "Open the full page", tooltip: "Boş = link yok" }),
    link1Url: props.Text({ name: "Link 1 URL", group: "Links", defaultValue: "https://rc-sestek.webflow.io/demos/stt" }),
    link1Style: props.Variant({ name: "Link 1 style", group: "Links", options: ["Dark", "White", "Brand secondary", "Brand primary"], defaultValue: "Dark", tooltip: "Sitenin stagger butonu (harf harf hover)" }),
    link1NewTab: props.Boolean({ name: "Link 1 new tab", group: "Links", defaultValue: false, trueLabel: "On", falseLabel: "Off" }),
    link2Label: props.Text({ name: "Link 2 label", group: "Links", defaultValue: "All languages and models" }),
    link2Url: props.Text({ name: "Link 2 URL", group: "Links", defaultValue: "https://docs.sestek.com/docs/stt-supported-languages-and-models" }),
    link2Style: props.Variant({ name: "Link 2 style", group: "Links", options: ["Dark", "White", "Brand secondary", "Brand primary"], defaultValue: "White" }),
    link2NewTab: props.Boolean({ name: "Link 2 new tab", group: "Links", defaultValue: true, trueLabel: "On", falseLabel: "Off" }),

    iframeSrc: props.Text({ name: "Demo URL", group: "Demo", defaultValue: "https://sr-demo-performance.sestek.com/index.html?lang={lang}&embed&env=demo", tooltip: "{lang} yerine seçilen dil yazılır (en / tr)" }),
    lang: props.Variant({ name: "Language", group: "Demo", options: ["Auto", "en", "tr"], defaultValue: "Auto", tooltip: "Auto = /tr ya da <html lang> tr ise tr, değilse en" }),
  },
  options: { ssr: true },
});
