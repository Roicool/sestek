import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { VoiceOrbs } from "./VoiceOrbs";

const AUDIO = "https://sestek.roicool.com/Voices/";
function voice(n: number, d: { name: string; desc: string; file: string; colors: string }) {
  const g = "Voice " + n;
  return {
    ["v" + n + "Name"]: props.Text({ name: "Name", group: g, defaultValue: d.name, tooltip: "Boş = ses gizli" }),
    ["v" + n + "Desc"]: props.Text({ name: "Description", group: g, defaultValue: d.desc }),
    ["v" + n + "Audio"]: props.Text({ name: "Audio URL", group: g, defaultValue: d.file ? AUDIO + d.file : "", tooltip: "wav/mp3 — CORS'lu servis edilmeli (analyser için)" }),
    ["v" + n + "Colors"]: props.Text({ name: "Colors (3 hex)", group: g, defaultValue: d.colors, tooltip: "Shader renkleri; boşsa palet sırayla atanır" }),
  };
}

export default declareComponent(VoiceOrbs, {
  name: "Voice Orbs",
  description:
    "Ses örneği orb carousel'i — voice-orbs.js v3.4'ün React hali. Sesler " +
    "Voice 1–10 gruplarından manuel girilir (ad, açıklama, ses URL, renkler; " +
    "boş ad = gizli). Orb'lar görselsiz: 3 renkli paletten WebGL shader ile " +
    "üretilir, aktif orb canlı + ses-reaktif akar. Sonsuz döngü, " +
    "play/pause, ilerleme halkası, ‹ › ve ←/→. Sıfır bağımlılık.",
  group: "Sestek",
  props: {
    card: props.Boolean({
      name: "Card background",
      group: "Look",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Açık lila zemin + radius (--surface--light / --radius--lg). Off = şeffaf, zemini Webflow'da ver",
    }),
    sizes: props.Text({
      name: "Sizes (px)",
      group: "Look",
      defaultValue: "220,150,104",
      tooltip: "Orb çapları merkezden dışa (data-vo-sizes)",
    }),
    fit: props.Number({ name: "Fit width (px)", group: "Look", defaultValue: 760, min: 320, max: 1600, tooltip: "Merdivenin tam ölçek genişliği; darda oransal küçülür" }),
    minScale: props.Number({ name: "Min scale", group: "Look", defaultValue: 0.42, min: 0.2, max: 1, decimals: 2 }),
    gap: props.Number({ name: "Gap (px)", group: "Look", defaultValue: 64, min: 0, max: 200 }),
    captionWidth: props.Number({ name: "Caption width (px)", group: "Look", defaultValue: 280, min: 120, max: 600 }),
    navOffset: props.Number({ name: "Arrow offset (px)", group: "Look", defaultValue: 230, min: 60, max: 600, tooltip: "‹ › oklarının merkezden uzaklığı" }),
    initial: props.Number({ name: "Start index", group: "Look", defaultValue: 0, min: 0, max: 50 }),

    ...voice(1, { name: "Chloe", desc: "English", file: "Chloe_Premium__en-US.wav", colors: "#fccc40,#29387a,#faf5eb" }),
    ...voice(2, { name: "Debbie", desc: "English", file: "Debbie_Premium__en-US.wav", colors: "#fa8c5c,#fdf2eb,#f06b4d" }),
    ...voice(3, { name: "James", desc: "English", file: "James_Premium__en-US.wav", colors: "#5cb8f2,#fa9e4d,#fcd14d" }),
    ...voice(4, { name: "Derya", desc: "Turkish", file: "Derya_Premium__tr-TR.wav", colors: "#6b66c7,#fcc74d,#80c7f5" }),
    ...voice(5, { name: "Aysu", desc: "Turkish", file: "Aysu_Premium__tr-TR.wav", colors: "#fccc40,#29387a,#faf5eb" }),
    ...voice(6, { name: "Emre", desc: "Turkish", file: "Emre_Premium__tr-TR.wav", colors: "#fa8c5c,#fdf2eb,#f06b4d" }),
    ...voice(7, { name: "Charlotte", desc: "French", file: "Charlotte_Premium__fr-FR.wav", colors: "#5cb8f2,#fa9e4d,#fcd14d" }),
    ...voice(8, { name: "Rima", desc: "Arabic (MSA)", file: "Rima_Premium__ar-SA.wav", colors: "#6b66c7,#fcc74d,#80c7f5" }),
    ...voice(9, { name: "Lujain", desc: "Arabic (Najdi)", file: "Lujain_Premium__ar-NJ.wav", colors: "#fccc40,#29387a,#faf5eb" }),
    ...voice(10, { name: "", desc: "", file: "", colors: "" }),
  },
  options: {
    /* Server-renderable: the orb zone height is reserved from CSS (container
       units) at render time; WebGL + Web Audio + layout run only in effects. */
    ssr: true,
  },
});
