import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { VoiceOrbs } from "./VoiceOrbs";

const AUDIO = "https://sestek.roicool.com/EN/";
function voice(n: number, d: { name: string; desc: string; file: string; colors: string }) {
  const g = "Voice " + n;
  return {
    ["v" + n + "Name"]: props.Text({ name: "Name", group: g, defaultValue: d.name, tooltip: "Boş = ses gizli. Slot doluysa bu grup yok sayılır" }),
    ["v" + n + "Desc"]: props.Text({ name: "Description", group: g, defaultValue: d.desc }),
    ["v" + n + "Audio"]: props.Text({ name: "Audio URL", group: g, defaultValue: d.file ? AUDIO + d.file : "", tooltip: "wav/mp3 — CORS'lu servis edilmeli (analyser için)" }),
    ["v" + n + "Image"]: props.Image({ name: "Orb image", group: g, tooltip: "Sadece Orb style = Image'da kullanılır" }),
    ["v" + n + "Colors"]: props.Text({ name: "Colors (3 hex)", group: g, defaultValue: d.colors, tooltip: "#hex,#hex,#hex — boşsa palet sırayla atanır" }),
  };
}

export default declareComponent(VoiceOrbs, {
  name: "Voice Orbs",
  description:
    "Ses örneği orb carousel'i — voice-orbs.js v3.4'ün React hali. Sınırsız " +
    "ses: 'Voices' slot'una Collection List bırak (item'da data-vo-name / " +
    "data-vo-desc / data-vo-src attribute'ları CMS'e bağlı). Orb'lar görsel " +
    "yerine prosedürel WebGL fluid-gradient (paletten üretilir); aktif orb " +
    "canlı + ses-reaktif, diğerleri aynı shader'dan statik kare. Sonsuz döngü, " +
    "play/pause, ilerleme halkası, ‹ › ve ←/→. Sıfır bağımlılık.",
  group: "Sestek",
  props: {
    voices: props.Slot({
      name: "Voices",
      group: "Voices",
      tooltip:
        "Collection List bırak. Her item'a custom attribute: data-vo-name (ad), " +
        "data-vo-desc (açıklama), data-vo-src (ses URL), opsiyonel data-vo-colors " +
        "(#hex,#hex,#hex) ve Orb style=Image için bir Image elemanı. Attribute " +
        "yoksa: ilk görsel, ilk iki metin, ilk link okunur.",
    }),
    orbStyle: props.Variant({
      name: "Orb style",
      group: "Look",
      options: ["Procedural", "Image"],
      defaultValue: "Procedural",
      tooltip: "Procedural: görsel gerekmez, WebGL shader paletten üretir · Image: eski davranış, orb görseli doku olarak",
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

    ...voice(1, { name: "Alloy", desc: "English (American)", file: "af_alloy__en-US.wav", colors: "#f9d6ec,#8c78eb,#c9dbfa" }),
    ...voice(2, { name: "Echo", desc: "English (American)", file: "am_echo__en-US.wav", colors: "#9ee6e0,#4d8cf2,#dbf0fa" }),
    ...voice(3, { name: "Liam", desc: "English (American)", file: "am_liam__en-US.wav", colors: "#fdccb3,#ed739e,#fdebd1" }),
    ...voice(4, { name: "River", desc: "English (American)", file: "af_river__en-US.wav", colors: "#cce0b3,#5cb39a,#edf7e0" }),
    ...voice(5, { name: "", desc: "", file: "", colors: "" }),
    ...voice(6, { name: "", desc: "", file: "", colors: "" }),
  },
  options: {
    /* WebGL + Web Audio + slot DOM — client-only */
    ssr: false,
  },
});
