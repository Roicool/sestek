import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { LogoMarquee } from "./LogoMarquee";

export default declareComponent(LogoMarquee, {
  name: "Logo Marquee",
  description:
    "CMS'e bağlı sonsuz logo bandı — marquee.js'in React hali. 'Logos' " +
    "slot'una bir Collection List (Clients → Logo image) bırak; component " +
    "içindeki görselleri okuyup kopyalayarak kesintisiz kaydırır. Hover'da " +
    "yumuşak duraklama, drag + momentum (mouse/touch), kenar fade, " +
    "prefers-reduced-motion'da statik. Sıfır bağımlılık.",
  group: "Sestek",
  props: {
    logos: props.Slot({
      name: "Logos",
      tooltip:
        "Buraya bir Collection List bırak (Clients koleksiyonu, item içinde " +
        "Logo image). Sadece <img> okunur; link/metin taşınmaz.",
    }),
    speed: props.Number({
      name: "Speed (px/s)",
      defaultValue: 60,
      min: 0,
      max: 400,
      tooltip: "Kayma hızı — yavaş = premium, hızlı = enerjik",
    }),
    direction: props.Variant({
      name: "Direction",
      options: ["Left", "Right"],
      defaultValue: "Left",
      tooltip: "Bandın aktığı yön; drag ve hover buna göre çalışır",
    }),
    logoSize: props.Number({
      name: "Logo size (rem)",
      defaultValue: 6.25,
      min: 2,
      max: 16,
      decimals: 2,
      tooltip: "Logo kutusu (kare) — masaüstü marquee.css'te 6.25rem",
    }),
    gap: props.Number({
      name: "Gap (rem)",
      defaultValue: 3,
      min: 0,
      max: 12,
      decimals: 2,
      tooltip: "Logolar arası boşluk",
    }),
    pauseOnHover: props.Boolean({
      name: "Pause on hover",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
    }),
    drag: props.Boolean({
      name: "Drag",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Off = sürükleme yok, sadece kayar",
    }),
    fadeEdges: props.Boolean({
      name: "Fade edges",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Sol/sağ kenarda saydamlığa geçiş (mask-image)",
    }),
    minHeight: props.Number({
      name: "Min height (px)",
      defaultValue: 0,
      min: 0,
      max: 600,
      tooltip: "0 = içeriğe göre",
    }),
  },
  options: {
    /* reads slotted DOM + runs a rAF ticker — client-only */
    ssr: false,
  },
});
