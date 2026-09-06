import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { StackPanels, DEFAULT_ITEMS } from "./StackPanels";

function item(n: number) {
  const g = "Panel " + n;
  const d = DEFAULT_ITEMS[n - 1];
  return {
    ["i" + n + "Content"]: props.RichText({ name: "Content", group: g, defaultValue: d ? d.html : "", tooltip: "Başlık + gövde tek Rich Text: H3 başlık, altına paragraf(lar). Boş = panel gizli" }),
    ["i" + n + "Image"]: props.Image({ name: "Image", group: g, tooltip: "Panel görseli. Video varsa poster (ilk kare) olarak kullanılır" }),
    ["i" + n + "Video"]: props.Text({ name: "Video URL", group: g, defaultValue: "", tooltip: "mp4 / webm linki. Sessiz, döngülü, yalnız görünürken oynar; viewport'a yaklaşınca yüklenir. Boş = yalnız görsel" }),
    ["i" + n + "Side"]: props.Variant({ name: "Media side", group: g, options: ["Auto", "Right", "Left"], defaultValue: "Auto", tooltip: "Auto = sırayla sağ / sol (1. sağ, 2. sol…)" }),
  };
}

export default declareComponent(StackPanels, {
  name: "Stack Panels",
  description:
    "Üst üste binen panel scrollytelling'i (stack-panels.js v1.4.0 + text-fill başlığın React hali). " +
    "Her panel (sonuncu hariç) pinlenir; sonraki üstüne kayarken alttaki bekler, küçülür, solar, bulanır ve yukarı süzülür. " +
    "GSAP ScrollTrigger sitenin global'inden; yoksa, reduced-motion'da ya da TELEFONDA (≤767px, v1.4.0 gibi) paneller düz akışta okunur. " +
    "Medya kutusu SABİT en-boy oranlı: video/görsel geç gelince panel boyu değişmez — mobildeki kaymanın kaynağı buydu. " +
    "Videolar sessiz, playsinline, döngülü, yalnız görünürken oynar ve viewport'a yaklaşınca yüklenir. " +
    "UYARI: pin için component'in üstündeki hiçbir elemanda transform / filter / perspective olmamalı.",
  group: "Sestek",
  props: {
    eyebrow: props.Text({ name: "Eyebrow", group: "Header", defaultValue: "" }),
    title: props.Text({ name: "Title", group: "Header", defaultValue: "Built to resolve, not just respond" }),
    subtitle: props.Text({ name: "Subtitle", group: "Header", defaultValue: "Every capability works toward finishing the request, not just answering the question." }),
    titleFill: props.Boolean({ name: "Title word fill", group: "Header", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Başlık kelime kelime dolar (scroll'a bağlı)" }),

    ...item(1), ...item(2), ...item(3), ...item(4), ...item(5), ...item(6),

    mediaRatio: props.Variant({ name: "Media ratio", group: "Media", options: ["4:3", "16:10", "16:9", "3:2", "1:1"], defaultValue: "4:3", tooltip: "Medya kutusunun sabit en-boy oranı (tüm paneller)" }),
    mediaFit: props.Variant({ name: "Media fit", group: "Media", options: ["Cover", "Contain"], defaultValue: "Cover" }),

    hold: props.Number({ name: "Hold", group: "Motion", defaultValue: 0.5, tooltip: "Pinli scroll'un ne kadarında panel tam okunur kalır (0–0.95)" }),
    scale: props.Number({ name: "End scale", group: "Motion", defaultValue: 0.7, tooltip: "Giden panelin son ölçeği" }),
    blur: props.Number({ name: "Blur (px)", group: "Motion", defaultValue: 4, tooltip: "Giden panelin bulanıklığı; 0 = kapalı" }),
    lift: props.Number({ name: "Lift (px)", group: "Motion", defaultValue: 24, tooltip: "Giden panelin yukarı süzülmesi; 0 = kapalı" }),
    midFade: props.Number({ name: "Mid fade", group: "Motion", defaultValue: 0.5, tooltip: "Küçülme bitince ulaşılan opaklık" }),
    fadePortion: props.Number({ name: "Fade portion", group: "Motion", defaultValue: 0.1, tooltip: "Son hızlı solmanın payı" }),
    scrub: props.Number({ name: "Scrub (s)", group: "Motion", defaultValue: 0, tooltip: "0 = doğrudan scroll'a bağlı; 0.3–1 = yumuşatma" }),
    priorityStart: props.Number({ name: "Refresh priority", group: "Motion", defaultValue: 0, tooltip: "İlk panelin ScrollTrigger refreshPriority'si; üstte pinli hero varsa onun altında kalmalı" }),
    mobileEffect: props.Boolean({ name: "Effect on phones", group: "Motion", defaultValue: false, trueLabel: "On", falseLabel: "Off", tooltip: "Off = ≤767px'te paneller düz akışta (önerilen)" }),

    bgImage: props.Image({ name: "Background image", group: "Look", tooltip: "Section arka plan görseli (cover)" }),
    bottomFade: props.Boolean({ name: "Bottom fade", group: "Look", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Alt kenarda zemine karışma maskesi" }),
    sectionBg: props.Text({ name: "Section background", group: "Look", defaultValue: "", tooltip: "Token / renk. Boş = --surface--base" }),
    cardBg: props.Text({ name: "Panel background", group: "Look", defaultValue: "", tooltip: "Token / renk. Boş = --surface--base (opak olmalı)" }),
  },
  options: { ssr: false },
});
