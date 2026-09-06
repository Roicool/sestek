import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { HScroll, DEFAULT_ITEMS } from "./HScroll";

function item(n: number) {
  const g = "Item " + n;
  const d = DEFAULT_ITEMS[n - 1];
  return {
    ["i" + n + "Content"]: props.RichText({ name: "Content", group: g, defaultValue: d ? d.html : "", tooltip: "Başlık + gövde tek Rich Text: H3 başlık, altına paragraf(lar). Boş = kart gizli" }),
    ["i" + n + "Icon"]: props.Image({ name: "Icon", group: g, tooltip: "Kartın üst ikonu (opsiyonel). Boş = 01, 02… numarası" }),
  };
}

export default declareComponent(HScroll, {
  name: "Horizontal Scroll Cards",
  description:
    "Yatay kart şeridi (h-scroll.js v2.2.4 + hover-reveal.js'in React hali, Swiper'sız). " +
    "Masaüstünde bölüm bir ekran boyu pinlenir, dikey scroll kartları sola sürükler (GSAP ScrollTrigger sitenin global'inden), " +
    "kart kenarlarına snap, altta ilerleme çizgisi + sayaç. Tablet/mobil, dokunmatik cihaz, reduced-motion ya da GSAP yoksa " +
    "aynı DOM native scroll-snap karusel olur: ok + nokta, tablet 1.4 / mobil 1.1 kart. Kart genişlikleri saf CSS — " +
    "mobilde kayma yok. Opsiyonel hover reveal: imlecin girdiği noktadan renk dalgası (dokunmatikte tap). " +
    "UYARI: pin için component'in üstündeki hiçbir elemanda transform / filter / will-change:transform olmamalı.",
  group: "Sestek",
  props: {
    eyebrow: props.Text({ name: "Eyebrow", group: "Header", defaultValue: "", tooltip: "Başlığın üstünde küçük etiket (opsiyonel)" }),
    title: props.Text({ name: "Title", group: "Header", defaultValue: "Why SESTEK" }),
    subtitle: props.Text({ name: "Subtitle", group: "Header", defaultValue: "Support built to hold up in production, not just in a sales demo." }),
    headerAlign: props.Variant({ name: "Align", group: "Header", options: ["Center", "Left"], defaultValue: "Center" }),

    ...item(1), ...item(2), ...item(3), ...item(4), ...item(5), ...item(6), ...item(7), ...item(8),

    cardWidth: props.Number({ name: "Card width (px)", group: "Layout", defaultValue: 420, tooltip: "Masaüstü kart genişliği" }),
    gap: props.Number({ name: "Gap (px)", group: "Layout", defaultValue: 32, tooltip: "Kartlar arası boşluk" }),
    spvTablet: props.Number({ name: "Cards per view (tablet)", group: "Layout", defaultValue: 1.4, tooltip: "≤991px. Küsurat = sıradaki kart kenardan görünür (peek)" }),
    spvMobile: props.Number({ name: "Cards per view (mobile)", group: "Layout", defaultValue: 1.1, tooltip: "<768px" }),
    showNav: props.Boolean({ name: "Arrows + dots", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Karusel modunda" }),
    showProgress: props.Boolean({ name: "Progress line", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Pin modunda kartların altında sayaç + çizgi" }),

    scrub: props.Number({ name: "Scrub (s)", group: "Motion", defaultValue: 0.5, tooltip: "Scroll'u takip gecikmesi" }),
    speed: props.Number({ name: "Speed", group: "Motion", defaultValue: 1, tooltip: "Scroll mesafesi çarpanı: >1 daha yavaş / uzun, <1 daha hızlı" }),
    snap: props.Boolean({ name: "Snap to cards", group: "Motion", defaultValue: true, trueLabel: "On", falseLabel: "Off" }),
    priority: props.Number({ name: "Refresh priority", group: "Motion", defaultValue: 1, tooltip: "ScrollTrigger refreshPriority — sayfada üstteki pin daha yüksek" }),

    hoverReveal: props.Boolean({ name: "Hover reveal", group: "Hover reveal", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "İmlecin girdiği noktadan renk dalgası; dokunmatikte tap" }),
    revealBg: props.Text({ name: "Reveal colour", group: "Hover reveal", defaultValue: "", tooltip: "Token (--brand-secondary--600), var() ya da renk. Boş = temanın rengi" }),
    revealText: props.Text({ name: "Text colour on reveal", group: "Hover reveal", defaultValue: "", tooltip: "Boş = yazı rengi değişmez (Light temada beyaz)" }),
    revealDuration: props.Number({ name: "Duration (s)", group: "Hover reveal", defaultValue: 0.7 }),

    theme: props.Variant({ name: "Theme", group: "Look", options: ["Dark", "Light"], defaultValue: "Dark", tooltip: "Dark = secondary-900 zemin, secondary-700 kart · Light = beyaz zemin, açık kart" }),
    controls: props.Variant({ name: "Controls colour", group: "Look", options: ["Auto", "Light", "Dark"], defaultValue: "Auto", tooltip: "Nokta, ok, ilerleme çizgisi ve sayaç rengi. Auto = yazı rengi · Light = beyaz · Dark = koyu" }),
    controlsColor: props.Text({ name: "Controls custom colour", group: "Look", defaultValue: "", tooltip: "Token / renk; doluysa Controls colour'ı ezer" }),
    sectionBg: props.Text({ name: "Section background", group: "Look", defaultValue: "", tooltip: "Token / renk. Boş = tema" }),
    cardBg: props.Text({ name: "Card background", group: "Look", defaultValue: "" }),
    cardBorder: props.Text({ name: "Card border", group: "Look", defaultValue: "" }),
  },
  options: { ssr: false },
});
