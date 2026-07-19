import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ShaderGradientBg } from "./ShaderGradientBg";

export default declareComponent(ShaderGradientBg, {
  name: "Shader Gradient BG",
  description:
    "Animated WebGL shader-gradient background (Sestek brand presets). " +
    "Fills its parent element; loads lazily near the viewport and respects " +
    "prefers-reduced-motion.",
  group: "Sestek",
  props: {
    preset: props.Variant({
      name: "Preset",
      options: ["Soft Mist", "Soft Water", "Soft Silk", "Soft Halo", "Sestek Deep", "Custom"],
      defaultValue: "Soft Mist",
      tooltip:
        "Soft Mist: nefes alan pastel sis · Soft Water: yumuşak su yüzeyi · " +
        "Soft Silk: yavaş çapraz akış · Soft Halo: kürede sakin ışıltı · " +
        "Sestek Deep: koyu section'lar için canlı · Custom: tür + renkler aşağıdan",
    }),
    gradientType: props.Variant({
      name: "Type (Custom)",
      group: "Custom",
      options: ["waterPlane", "plane", "sphere"],
      defaultValue: "waterPlane",
      tooltip: "Sadece Preset = Custom iken kullanılır",
    }),
    color1: props.Text({
      name: "Color 1 (Custom)",
      group: "Custom",
      defaultValue: "#8fe8de",
      tooltip: "Hex renk — sadece Preset = Custom iken kullanılır",
    }),
    color2: props.Text({
      name: "Color 2 (Custom)",
      group: "Custom",
      defaultValue: "#a7a9d6",
    }),
    color3: props.Text({
      name: "Color 3 (Custom)",
      group: "Custom",
      defaultValue: "#f489c1",
    }),
    speed: props.Number({
      name: "Speed",
      defaultValue: 1,
      min: 0,
      max: 5,
      decimals: 2,
      tooltip: "Animasyon hız çarpanı (1 = preset hızı)",
    }),
    grain: props.Boolean({
      name: "Grain",
      defaultValue: false,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Film greni dokusu — soft görünüm için varsayılan kapalı",
    }),
    brightness: props.Number({
      name: "Brightness",
      defaultValue: 0,
      min: 0,
      max: 3,
      decimals: 2,
      tooltip: "0 = preset'in kendi parlaklığı; başka değer girersen onu ezer",
    }),
    animate: props.Boolean({
      name: "Animate",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Off = tek statik kare (reduced-motion'da otomatik kapanır)",
    }),
    pixelDensity: props.Number({
      name: "Pixel density",
      defaultValue: 1,
      min: 0.5,
      max: 2,
      decimals: 1,
      tooltip: "Düşür = daha akıcı, yükselt = daha keskin",
    }),
    minHeight: props.Number({
      name: "Min height (px)",
      defaultValue: 480,
      min: 0,
      max: 2000,
      tooltip: "Parent'ın yüksekliği yoksa taban yükseklik; 0 = tamamen parent'a uy",
    }),
  },
  options: {
    /* WebGL canvas — client-only, no server prerender */
    ssr: false,
  },
});
