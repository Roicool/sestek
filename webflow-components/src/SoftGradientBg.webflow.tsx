import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { SoftGradientBg } from "./SoftGradientBg";

export default declareComponent(SoftGradientBg, {
  name: "Soft Gradient BG",
  description:
    "Minimal (~6KB, zero-dependency) soft gradient background in Sestek " +
    "colours — four characters: Mist, Flow, Silk, Halo. Pure WebGL " +
    "fragment shader; lazy near the viewport, pauses offscreen, respects " +
    "prefers-reduced-motion, CSS fallback without WebGL. Fills its parent.",
  group: "Sestek",
  props: {
    preset: props.Variant({
      name: "Preset",
      options: ["Mist", "Flow", "Silk", "Halo"],
      defaultValue: "Mist",
      tooltip:
        "Mist: gezinen yumuşak lekeler · Flow: yatay süzülen dalgalar · " +
        "Silk: çapraz kumaş bantları · Halo: merkezde nefes alan ışıltı",
    }),
    color1: props.Text({
      name: "Color 1",
      defaultValue: "#00d5c8",
      tooltip: "Hex renk (yumuşak turkuaz varsayılan)",
    }),
    color2: props.Text({
      name: "Color 2",
      defaultValue: "#a7a9d6",
      tooltip: "Hex renk (yumuşak lila varsayılan)",
    }),
    color3: props.Text({
      name: "Color 3",
      defaultValue: "#f489c1",
      tooltip: "Hex renk (yumuşak magenta varsayılan)",
    }),
    baseColor: props.Text({
      name: "Base color",
      defaultValue: "#f7f7f9",
      tooltip: "Zemin tonu — koyu tema için #0c0c10 gibi bir değer ver",
    }),
    speed: props.Number({
      name: "Speed",
      defaultValue: 1,
      min: 0,
      max: 4,
      decimals: 2,
      tooltip: "Hareket hız çarpanı (1 = sakin varsayılan)",
    }),
    softness: props.Number({
      name: "Softness",
      defaultValue: 1,
      min: 0.3,
      max: 2.5,
      decimals: 2,
      tooltip: "Geçiş yumuşaklığı — büyüdükçe renkler daha geniş yayılır",
    }),
    animate: props.Boolean({
      name: "Animate",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Off = tek statik kare (reduced-motion'da otomatik)",
    }),
    minHeight: props.Number({
      name: "Min height (px)",
      defaultValue: 480,
      min: 0,
      max: 2000,
      tooltip: "Parent'ın yüksekliği yoksa taban; 0 = tamamen parent'a uy",
    }),
  },
  options: {
    /* WebGL canvas — client-only */
    ssr: false,
  },
});
