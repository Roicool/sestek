/*!
 * ShaderGradientBg — Sestek shader-gradient background for Webflow.
 *
 * Wraps @shadergradient/react (three.js is bundled inside the package) with:
 *   • lazy-mount: the WebGL canvas + shader chunks load only when the section
 *     nears the viewport (rootMargin 300px) — zero cost on initial page load
 *   • prefers-reduced-motion: renders a single static frame, no animation
 *   • Sestek presets: brand-coloured scenes tuned per gradient type, with a
 *     Custom mode that exposes every knob to the Designer
 *   • CSS-gradient fallback: shown while the shader loads and wherever WebGL
 *     is unavailable, built from the same three colours
 *
 * The component fills its parent (100% × 100%). Give the wrapper div in
 * Webflow a size, or use the minHeight prop as a floor.
 */

import * as React from "react";

const LazyGradient = React.lazy(async () => {
  const m = await import("@shadergradient/react");
  function Gradient({ canvas, gradient }: { canvas: any; gradient: any }) {
    return (
      <m.ShaderGradientCanvas {...canvas}>
        <m.ShaderGradient {...gradient} />
      </m.ShaderGradientCanvas>
    );
  }
  return { default: Gradient };
});

export interface ShaderGradientBgProps {
  preset?: string;
  gradientType?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  grain?: boolean;
  brightness?: number;
  animate?: boolean;
  pixelDensity?: number;
  minHeight?: number;
}

/* Scene values tuned per preset — colours are Sestek brand tokens. */
const PRESETS: Record<string, Record<string, unknown>> = {
  "Sestek Brand": {
    type: "waterPlane",
    color1: "#00ffeb",
    color2: "#7f81ae",
    color3: "#ec008c",
    uSpeed: 0.2,
    uStrength: 3,
    uDensity: 1.6,
    uFrequency: 5.5,
    positionX: -1.4,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 10,
    rotationZ: 50,
    cAzimuthAngle: 180,
    cPolarAngle: 90,
    cDistance: 3.2,
    cameraZoom: 1,
    lightType: "3d",
    envPreset: "city",
    reflection: 0.1,
  },
  "Sestek Deep": {
    type: "waterPlane",
    color1: "#0e9488",
    color2: "#565978",
    color3: "#8f0a58",
    uSpeed: 0.15,
    uStrength: 2.4,
    uDensity: 1.4,
    uFrequency: 5.5,
    positionX: -1.4,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 10,
    rotationZ: 50,
    cAzimuthAngle: 180,
    cPolarAngle: 95,
    cDistance: 3.4,
    cameraZoom: 1,
    lightType: "3d",
    envPreset: "city",
    reflection: 0.1,
  },
  Halo: {
    type: "sphere",
    color1: "#ec008c",
    color2: "#7f81ae",
    color3: "#00ffeb",
    uSpeed: 0.25,
    uStrength: 0.3,
    uDensity: 0.8,
    uFrequency: 5.5,
    uAmplitude: 3.2,
    positionX: -0.1,
    positionY: 0,
    positionZ: 0,
    rotationX: 0,
    rotationY: 130,
    rotationZ: 70,
    cAzimuthAngle: 270,
    cPolarAngle: 180,
    cDistance: 0.5,
    cameraZoom: 15.1,
    lightType: "env",
    envPreset: "city",
    reflection: 0.4,
  },
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* Mount the heavy shader only once the wrapper nears the viewport. */
function useNearViewport(ref: React.RefObject<HTMLElement | null>): boolean {
  const [near, setNear] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, near]);
  return near;
}

export function ShaderGradientBg({
  preset = "Sestek Brand",
  gradientType = "waterPlane",
  color1 = "#00ffeb",
  color2 = "#7f81ae",
  color3 = "#ec008c",
  speed = 1,
  grain = true,
  brightness = 1.2,
  animate = true,
  pixelDensity = 1,
  minHeight = 480,
}: ShaderGradientBgProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const near = useNearViewport(ref);

  const scene = PRESETS[preset] ?? {
    ...PRESETS["Sestek Brand"],
    type: gradientType,
    color1,
    color2,
    color3,
  };

  const gradient = {
    control: "props",
    ...scene,
    animate: animate && !reduced ? "on" : "off",
    uSpeed: (scene.uSpeed as number) * speed,
    grain: grain ? "on" : "off",
    brightness,
    enableTransition: false,
  };

  const canvas = {
    style: { position: "absolute", inset: 0, width: "100%", height: "100%" },
    pixelDensity,
    pointerEvents: "none" as const,
    /* Extra guard inside the package on top of our own observer */
    lazyLoad: true,
    rootMargin: "300px",
  };

  const c1 = (scene.color1 as string) ?? color1;
  const c2 = (scene.color2 as string) ?? color2;
  const c3 = (scene.color3 as string) ?? color3;

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: minHeight > 0 ? minHeight : undefined,
        overflow: "hidden",
      }}
    >
      {/* CSS fallback: visible until the shader paints, and wherever WebGL is unavailable */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            `radial-gradient(120% 120% at 0% 0%, ${c1} 0%, transparent 55%),` +
            `radial-gradient(120% 120% at 100% 0%, ${c2} 0%, transparent 55%),` +
            `radial-gradient(140% 140% at 50% 100%, ${c3} 0%, transparent 60%)`,
          filter: "saturate(1.1)",
        }}
      />
      {near && (
        <React.Suspense fallback={null}>
          <LazyGradient canvas={canvas} gradient={gradient} />
        </React.Suspense>
      )}
    </div>
  );
}

export default ShaderGradientBg;
