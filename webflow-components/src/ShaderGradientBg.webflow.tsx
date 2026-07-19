import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ShaderGradientBg } from "./ShaderGradientBg";

export default declareComponent(ShaderGradientBg, {
  name: "Shader Gradient BG",
  description:
    "Animated 3D shader-gradient background (ShaderGradient/three.js). Soft " +
    "Sestek pastel presets; Color 1-3 override the preset palette on ANY " +
    "preset when filled. Mounts eagerly with a soft fade-in (optional lazy), " +
    "respects prefers-reduced-motion, CSS fallback without WebGL. Fills its parent.",
  group: "Sestek",
  props: {
    preset: props.Variant({
      name: "Preset",
      options: ["Soft Mist", "Soft Water", "Soft Silk", "Soft Halo", "Sestek Deep", "Custom"],
      defaultValue: "Soft Mist",
      tooltip:
        "Soft Mist: nefes alan pastel sis · Soft Water: yumuşak su yüzeyi · " +
        "Soft Silk: yavaş çapraz akış · Soft Halo: kürede sakin ışıltı · " +
        "Sestek Deep: koyu section'lar için canlı · Custom: türü aşağıdan seç",
    }),
    gradientType: props.Variant({
      name: "Type (Custom)",
      group: "Custom",
      options: ["waterPlane", "plane", "sphere"],
      defaultValue: "waterPlane",
      tooltip: "Sadece Preset = Custom iken kullanılır",
    }),
    color1: props.Text({
      name: "Color 1",
      group: "Colors",
      defaultValue: "",
      tooltip:
        "Hex renk (örn. #8fe8de). BOŞ bırak = preset'in kendi rengi; " +
        "doldurursan HER preset'te preset rengini ezer",
    }),
    color2: props.Text({
      name: "Color 2",
      group: "Colors",
      defaultValue: "",
      tooltip: "Hex renk — boş = preset rengi",
    }),
    color3: props.Text({
      name: "Color 3",
      group: "Colors",
      defaultValue: "",
      tooltip: "Hex renk — boş = preset rengi",
    }),
    speed: props.Number({
      name: "Speed",
      defaultValue: 1,
      min: 0,
      max: 5,
      decimals: 2,
      tooltip: "Animasyon hız çarpanı (1 = preset hızı, 0 = durgun)",
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
    lazy: props.Boolean({
      name: "Lazy load",
      defaultValue: false,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip:
        "Off (önerilen) = shader sayfa yüklenirken kurulur, fade ile girer. " +
        "On = viewport'a yaklaşınca kurulur — pinli/sticky section'ların " +
        "olduğu sayfalarda kurulum anı görünür 'atlama' yapabilir",
    }),
  },
  options: {
    /* WebGL canvas — client-only, no server prerender */
    ssr: false,
  },
});
