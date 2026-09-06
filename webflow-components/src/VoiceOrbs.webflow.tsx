import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { VoiceOrbs } from "./VoiceOrbs";

const AUDIO = "https://sestek.roicool.com/EN/";
const IMG = "https://cdn.prod.website-files.com/6a15f6e39b139e2c81103be6/";
function voice(n: number, d: { name: string; desc: string; file: string; img: string; colors: string }) {
  const g = "Voice " + n;
  return {
    ["v" + n + "Name"]: props.Text({ name: "Name", group: g, defaultValue: d.name, tooltip: "Boş = ses gizli" }),
    ["v" + n + "Desc"]: props.Text({ name: "Description", group: g, defaultValue: d.desc }),
    ["v" + n + "Audio"]: props.Text({ name: "Audio URL", group: g, defaultValue: d.file ? AUDIO + d.file : "", tooltip: "wav/mp3 — CORS'lu servis edilmeli (analyser için)" }),
    ["v" + n + "Image"]: props.Text({ name: "Orb image URL", group: g, defaultValue: d.img ? IMG + d.img : "", tooltip: "Orb style = Image'da gösterilir (Sagitone gradient). Webflow asset URL'i; CORS'lu olmalı" }),
    ["v" + n + "Colors"]: props.Text({ name: "Colors (3 hex)", group: g, defaultValue: d.colors, tooltip: "Orb style = Procedural'da shader renkleri; boşsa palet sırayla atanır" }),
  };
}

export default declareComponent(VoiceOrbs, {
  name: "Voice Orbs",
  description:
    "Ses örneği orb carousel'i — voice-orbs.js v3.4'ün React hali. Sesler " +
    "Voice 1–6 gruplarından manuel girilir (ad, açıklama, ses URL, renkler; " +
    "boş ad = gizli). Kart zemini + Sagitone gradient orb görselleri sitedeki " +
    "gibi; aktif orb WebGL ile canlı + ses-reaktif akar. İstersen Procedural " +
    "modda görselsiz, paletten üretilen shader orb'lar. Sonsuz döngü, " +
    "play/pause, ilerleme halkası, ‹ › ve ←/→. Sıfır bağımlılık.",
  group: "Sestek",
  props: {
    orbStyle: props.Variant({
      name: "Orb style",
      group: "Look",
      options: ["Image", "Procedural"],
      defaultValue: "Image",
      tooltip: "Image: sitedeki gibi Sagitone gradient görselleri (aktif orb'da canlı WebGL warp) · Procedural: görsel gerekmez, shader paletten üretir",
    }),
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

    ...voice(1, { name: "Alloy", desc: "English (American)", file: "af_alloy__en-US.wav", img: "6a9089e4cfa09edf607d5721_02.%20Sagitone%20Gradient-01.jpg", colors: "#fccc40,#29387a,#faf5eb" }),
    ...voice(2, { name: "Echo", desc: "English (American)", file: "am_echo__en-US.wav", img: "6a9089e49a80bcb5f3fec3ce_05.%20Sagitone%20Gradient-01.jpg", colors: "#fa8c5c,#fdf2eb,#f06b4d" }),
    ...voice(3, { name: "Liam", desc: "English (American)", file: "am_liam__en-US.wav", img: "6a9089e41644751f6f293fd2_06.%20Sagitone%20Gradient-01.jpg", colors: "#5cb8f2,#fa9e4d,#fcd14d" }),
    ...voice(4, { name: "River", desc: "English (American)", file: "af_river__en-US.wav", img: "6a9089e31644751f6f293fa7_10.%20Sagitone%20Gradient-01.jpg", colors: "#6b66c7,#fcc74d,#80c7f5" }),
    ...voice(5, { name: "", desc: "", file: "", img: "", colors: "" }),
    ...voice(6, { name: "", desc: "", file: "", img: "", colors: "" }),
  },
  options: {
    /* WebGL + Web Audio — client-only */
    ssr: false,
  },
});
