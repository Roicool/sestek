/*!
 * ShaderGradientBg — Sestek shader-gradient background for Webflow.
 *
 * Wraps @shadergradient/react (three.js bundled in the package) with:
 *   • lazy-mount: the WebGL canvas + shader chunks load only when the section
 *     nears the viewport (rootMargin 300px) — zero cost on initial page load
 *   • soft Sestek pastel presets (Mist/Water/Silk/Halo) + a vivid Deep
 *     variant + fully Custom mode
 *   • colours ALWAYS win: Color 1-3 override the preset's palette whenever a
 *     valid hex is entered; left empty, the preset's own palette is used
 *   • prop changes force a clean remount (keyed) so the scene reliably
 *     reflects Designer edits — ShaderGradient does not hot-update all props
 *   • prefers-reduced-motion: renders a single static frame
 *   • CSS-gradient fallback while loading / without WebGL, from the same
 *     effective colours
 *
 * Fills its parent (100% × 100%); size the wrapper in Webflow or use the
 * minHeight prop as a floor.
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

/* "#abc" / "abc123" / "#AABBCC" → "#aabbcc"; geçersiz/boş → null */
function normalizeHex(v: string | undefined | null): string | null {
  if (!v) return null;
  const t = v.trim().replace(/^#/, "");
  if (/^[0-9a-f]{6}$/i.test(t)) return "#" + t.toLowerCase();
  if (/^[0-9a-f]{3}$/i.test(t)) {
    return (
      "#" +
      t
        .toLowerCase()
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return null;
}

/* Scene values tuned per preset.
 * "Soft *" ailesi: yumuşatılmış Sestek pastelleri, düşük strength/density,
 * yavaş hız, yüksek brightness → minimal ve soft görünüm (açık temaya uygun).
 * "Sestek Deep": koyu section'lar için canlı/derin varyant.
 * Not: lightType hep "3d" — "env" modu dış HDR texture ister, Webflow
 * canvas'ında güvenilir değildir. */
const SOFT = {
  shader: "defaults",
  uFrequency: 5.5,
  positionX: -1.4,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 10,
  rotationZ: 50,
  cAzimuthAngle: 180,
  cPolarAngle: 95,
  cDistance: 3.6,
  cameraZoom: 1,
  lightType: "3d",
  envPreset: "city",
  reflection: 0.1,
  wireframe: false,
  brightness: 1.2,
};

type Scene = Record<string, unknown> & {
  color1: string;
  color2: string;
  color3: string;
  uSpeed: number;
};

const PRESETS: Record<string, Scene> = {
  "Soft Mist": {
    /* en hafif: nefes alan pastel sis */
    ...SOFT,
    type: "plane",
    color1: "#9fe8e0",
    color2: "#b4b6df",
    color3: "#f7abd1",
    uSpeed: 0.08,
    uStrength: 0.9,
    uDensity: 1.0,
    brightness: 1.25,
  },
  "Soft Water": {
    /* yumuşak su yüzeyi — pastel turkuaz ağırlıklı */
    ...SOFT,
    type: "waterPlane",
    color1: "#8fe8de",
    color2: "#a7a9d6",
    color3: "#f489c1",
    uSpeed: 0.12,
    uStrength: 1.6,
    uDensity: 1.2,
  },
  "Soft Silk": {
    /* lila ağırlıklı, çok yavaş çapraz akış */
    ...SOFT,
    type: "plane",
    color1: "#c9cae8",
    color2: "#9fd8d2",
    color3: "#f4a9cf",
    uSpeed: 0.06,
    uStrength: 1.2,
    uDensity: 0.8,
    rotationZ: 35,
    brightness: 1.25,
  },
  "Soft Halo": {
    /* kürede sakin pastel ışıltı */
    ...SOFT,
    type: "sphere",
    color1: "#f489c1",
    color2: "#a7a9d6",
    color3: "#8fe8de",
    uSpeed: 0.1,
    uStrength: 0.25,
    uDensity: 0.7,
    uAmplitude: 2.4,
    positionX: -0.1,
    rotationY: 130,
    rotationZ: 70,
    cAzimuthAngle: 270,
    cPolarAngle: 180,
    cDistance: 0.5,
    cameraZoom: 15.1,
    reflection: 0.35,
    brightness: 1.1,
  },
  "Sestek Deep": {
    /* koyu section'lar için canlı marka varyantı */
    ...SOFT,
    type: "waterPlane",
    color1: "#0e9488",
    color2: "#565978",
    color3: "#8f0a58",
    uSpeed: 0.15,
    uStrength: 2.4,
    uDensity: 1.4,
    cDistance: 3.4,
    brightness: 1.1,
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
function useNearViewport(ref: React.RefObject<HTMLDivElement | null>): boolean {
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
  preset = "Soft Mist",
  gradientType = "waterPlane",
  color1 = "",
  color2 = "",
  color3 = "",
  speed = 1,
  grain = false,
  brightness = 0,
  animate = true,
  pixelDensity = 1,
  minHeight = 480,
}: ShaderGradientBgProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const near = useNearViewport(ref);

  /* 1) Sahne: preset motion/kamera değerleri (Custom → Soft Water tabanı +
   *    seçilen tür). 2) Renkler: geçerli hex girilen her prop, preset
   *    rengini ezer — hangi preset seçili olursa olsun. */
  const base = PRESETS[preset];
  const scene: Scene = base ?? {
    ...PRESETS["Soft Water"],
    type: ["plane", "sphere", "waterPlane"].includes(gradientType)
      ? gradientType
      : "waterPlane",
  };

  const c1 = normalizeHex(color1) ?? scene.color1;
  const c2 = normalizeHex(color2) ?? scene.color2;
  const c3 = normalizeHex(color3) ?? scene.color3;

  const safeSpeed = Math.max(0, Math.min(speed, 10));
  const safePixelDensity = Math.max(0.5, Math.min(pixelDensity, 2));

  const gradient = {
    control: "props",
    ...scene,
    color1: c1,
    color2: c2,
    color3: c3,
    animate: animate && !reduced ? "on" : "off",
    uSpeed: scene.uSpeed * safeSpeed,
    grain: grain ? "on" : "off",
    /* 0 = preset'in kendi brightness'ı; >0 girilirse override */
    ...(brightness > 0 ? { brightness } : {}),
    enableTransition: false,
  };

  const canvas = {
    style: { position: "absolute", inset: 0, width: "100%", height: "100%" },
    pixelDensity: safePixelDensity,
    pointerEvents: "none" as const,
    fov: 45,
    /* Kütüphanenin kendi lazyLoad'ı TOGGLE'dır: section viewport'tan çıkınca
     * canvas'ı unmount eder, girince yeniden kurar — her girişte shader
     * yeniden derlenir ve animasyon saati sıfırlanır (görünür "atlama").
     * Lazy'liği zaten dışarıda tek seferlik yapıyoruz (useNearViewport,
     * 300px, disconnect) — içerideki kapalı: canvas bir kez kurulur, kalır. */
    lazyLoad: false,
  };

  /* ShaderGradient bazı prop'ları canlı güncellemez — herhangi bir ayar
   * değişiminde temiz bir remount, sahnenin Designer'daki düzenlemeyi
   * güvenilir şekilde yansıtmasını garanti eder. */
  const sceneKey = [
    preset,
    scene.type,
    c1,
    c2,
    c3,
    safeSpeed,
    grain,
    brightness,
    animate,
    reduced,
    safePixelDensity,
  ].join("|");

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
      {/* CSS fallback: shader yüklenene dek ve WebGL olmayan cihazlarda —
          efektif renklerden üretilir, geçiş yumuşak olur */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            `radial-gradient(120% 120% at 15% 20%, ${c1} 0%, transparent 55%),` +
            `radial-gradient(120% 120% at 85% 25%, ${c2} 0%, transparent 55%),` +
            `radial-gradient(140% 140% at 50% 95%, ${c3} 0%, transparent 60%)`,
        }}
      />
      {near && (
        <React.Suspense fallback={null}>
          <LazyGradient key={sceneKey} canvas={canvas} gradient={gradient} />
        </React.Suspense>
      )}
    </div>
  );
}

export default ShaderGradientBg;
