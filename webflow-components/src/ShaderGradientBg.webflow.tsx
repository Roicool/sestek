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
      options: ["Sestek Brand", "Sestek Deep", "Halo", "Custom"],
      defaultValue: "Sestek Brand",
      tooltip: "Hazır Sestek sahneleri; Custom seçince tür ve renkler aşağıdan ayarlanır",
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
      defaultValue: "#00ffeb",
      tooltip: "Hex renk — sadece Preset = Custom iken kullanılır",
    }),
    color2: props.Text({
      name: "Color 2 (Custom)",
      group: "Custom",
      defaultValue: "#7f81ae",
    }),
    color3: props.Text({
      name: "Color 3 (Custom)",
      group: "Custom",
      defaultValue: "#ec008c",
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
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
    }),
    brightness: props.Number({
      name: "Brightness",
      defaultValue: 1.2,
      min: 0,
      max: 3,
      decimals: 2,
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
