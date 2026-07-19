/*!
 * SoftGradientBg — minimal, zero-dependency soft gradient background.
 *
 * A single tiny fragment shader (no three.js — the whole component is a few
 * KB) renders 2-3 brand-coloured light sources drifting over a base tone.
 * Four preset characters:
 *   • Mist — soft blobs wandering slowly (classic mesh-gradient feel)
 *   • Flow — horizontally stretched waves gliding sideways
 *   • Silk — smooth diagonal bands drifting like fabric
 *   • Halo — a calm radial glow breathing around the centre
 *
 * Performance/behaviour:
 *   • starts only when near the viewport (IntersectionObserver), pauses
 *     offscreen, DPR capped at 1.5
 *   • prefers-reduced-motion → renders a single static frame
 *   • WebGL unavailable → CSS radial-gradient fallback from the same colours
 *   • fills its parent (100% × 100%); size the wrapper in Webflow
 */

import * as React from "react";

export interface SoftGradientBgProps {
  preset?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  baseColor?: string;
  speed?: number;
  softness?: number;
  animate?: boolean;
  minHeight?: number;
}

const PRESET_IDS: Record<string, number> = { Mist: 0, Flow: 1, Silk: 2, Halo: 3 };

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2  u_res;
uniform float u_time;
uniform int   u_preset;
uniform vec3  u_c1, u_c2, u_c3, u_base;
uniform float u_soft;

/* smooth inverse-square falloff — the "soft" heart of the look */
float glow(vec2 uv, vec2 src, float r){
  float d = length(uv - src) / r;
  return exp(-d * d);
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = u_time;
  float r = 0.55 * u_soft;

  vec2 s1, s2, s3;
  float w1, w2, w3;

  if (u_preset == 1) {
    /* Flow — sources ride a slow horizontal current, falloff stretched wide */
    s1 = vec2(aspect * (0.5 + 0.45 * sin(t * 0.30)),        0.62 + 0.10 * sin(t * 0.50));
    s2 = vec2(aspect * (0.5 + 0.45 * sin(t * 0.22 + 2.5)),  0.38 + 0.10 * cos(t * 0.40));
    s3 = vec2(aspect * (0.5 + 0.45 * sin(t * 0.17 + 4.6)),  0.50 + 0.12 * sin(t * 0.33 + 1.2));
    vec2 st = vec2(0.55, 1.6); /* stretch x → wave feel */
    w1 = glow(p * st, s1 * st, r); w2 = glow(p * st, s2 * st, r); w3 = glow(p * st, s3 * st, r);
  } else if (u_preset == 2) {
    /* Silk — soft diagonal bands drifting like fabric */
    float d1 = dot(p, normalize(vec2( 0.8, 0.6)));
    float d2 = dot(p, normalize(vec2( 0.6,-0.8)));
    w1 = exp(-pow((d1 - (0.45 + 0.25 * sin(t * 0.26)))        / (0.34 * u_soft), 2.0));
    w2 = exp(-pow((d2 - (0.15 + 0.25 * sin(t * 0.19 + 2.1)))  / (0.38 * u_soft), 2.0));
    w3 = exp(-pow((d1 - (0.95 + 0.22 * cos(t * 0.23 + 4.0)))  / (0.42 * u_soft), 2.0));
  } else if (u_preset == 3) {
    /* Halo — glows breathing in a tight orbit around the centre */
    vec2 c = vec2(aspect * 0.5, 0.5);
    float o = 0.14 + 0.05 * sin(t * 0.35);
    s1 = c + o * vec2(cos(t * 0.28),        sin(t * 0.28));
    s2 = c + o * vec2(cos(t * 0.28 + 2.09), sin(t * 0.28 + 2.09));
    s3 = c + o * vec2(cos(t * 0.28 + 4.18), sin(t * 0.28 + 4.18));
    float rr = r * (1.15 + 0.12 * sin(t * 0.5));
    w1 = glow(p, s1, rr); w2 = glow(p, s2, rr); w3 = glow(p, s3, rr);
  } else {
    /* Mist — blobs wandering on slow lissajous paths */
    s1 = vec2(aspect * (0.30 + 0.22 * sin(t * 0.21)),        0.70 + 0.18 * sin(t * 0.17 + 1.0));
    s2 = vec2(aspect * (0.72 + 0.20 * sin(t * 0.16 + 2.3)),  0.30 + 0.20 * cos(t * 0.19));
    s3 = vec2(aspect * (0.52 + 0.26 * cos(t * 0.13 + 4.1)),  0.55 + 0.24 * sin(t * 0.23 + 3.2));
    w1 = glow(p, s1, r); w2 = glow(p, s2, r); w3 = glow(p, s3, r);
  }

  /* soft-mix the three colours over the base tone */
  vec3 col = u_base;
  col = mix(col, u_c1, clamp(w1, 0.0, 1.0) * 0.85);
  col = mix(col, u_c2, clamp(w2, 0.0, 1.0) * 0.80);
  col = mix(col, u_c3, clamp(w3, 0.0, 1.0) * 0.75);

  /* tiny dither kills banding on subtle ramps */
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (dither - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) {
    const s = /^#?([0-9a-f]{3})$/i.exec(hex.trim());
    if (!s) return fallback;
    const h = s[1];
    return [
      parseInt(h[0] + h[0], 16) / 255,
      parseInt(h[1] + h[1], 16) / 255,
      parseInt(h[2] + h[2], 16) / 255,
    ];
  }
  const h = m[1];
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function SoftGradientBg({
  preset = "Mist",
  color1 = "#00d5c8",
  color2 = "#a7a9d6",
  color3 = "#f489c1",
  baseColor = "#f7f7f9",
  speed = 1,
  softness = 1,
  animate = true,
  minHeight = 480,
}: SoftGradientBgProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [webglOk, setWebglOk] = React.useState(true);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const gl =
      canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) {
      setWebglOk(false);
      return;
    }

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setWebglOk(false);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = U("u_res");
    const uTime = U("u_time");
    gl.uniform1i(U("u_preset"), PRESET_IDS[preset] ?? 0);
    gl.uniform3fv(U("u_c1"), hexToRgb(color1, [0, 0.84, 0.78]));
    gl.uniform3fv(U("u_c2"), hexToRgb(color2, [0.65, 0.66, 0.84]));
    gl.uniform3fv(U("u_c3"), hexToRgb(color3, [0.96, 0.54, 0.76]));
    gl.uniform3fv(U("u_base"), hexToRgb(baseColor, [0.97, 0.97, 0.98]));
    gl.uniform1f(U("u_soft"), Math.max(0.2, softness));

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const running = animate && !reduced;

    let raf = 0;
    let visible = false;
    let start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const draw = () => {
      resize();
      gl.uniform1f(uTime, ((performance.now() - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = () => {
      if (!visible) return;
      draw();
      if (running) raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => {
      if (!running && visible) draw(); /* static frame follows resizes too */
    });
    ro.observe(wrap);

    const io = new IntersectionObserver(
      (entries) => {
        const on = entries.some((e) => e.isIntersecting);
        if (on && !visible) {
          visible = true;
          loop();
        } else if (!on && visible) {
          visible = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: "120px" }
    );
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [preset, color1, color2, color3, baseColor, speed, softness, animate]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: minHeight > 0 ? minHeight : undefined,
        overflow: "hidden",
        /* CSS fallback — also paints first frame before GL boots */
        background: webglOk
          ? baseColor
          : `radial-gradient(90% 90% at 20% 25%, ${color1} 0%, transparent 60%),` +
            `radial-gradient(90% 90% at 80% 30%, ${color2} 0%, transparent 60%),` +
            `radial-gradient(110% 110% at 50% 90%, ${color3} 0%, transparent 65%), ${baseColor}`,
      }}
    >
      {webglOk && (
        <canvas
          ref={canvasRef}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
        />
      )}
    </div>
  );
}

export default SoftGradientBg;
