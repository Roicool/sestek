/*!
 * VoiceOrbs — voice-sample orb carousel (React port of voice-orbs.js v3.4 +
 * voice-orbs.css v2.7), with two upgrades:
 *
 *   1. VOICES FROM PROPS. Up to ten voices are entered by hand in the
 *      Designer (Voice 1–10 groups: name, description, audio URL, optional
 *      orb image, optional "#hex,#hex,#hex" colours). An empty name hides
 *      the voice. More voices can be added later by extending the props.
 *
 *   2. PROCEDURAL WEBGL ORBS — no image assets. The same fluid-gradient
 *      shader the old component reserved for the active orb now renders
 *      every orb from a 3-colour palette: fbm domain-warp flow, spherical
 *      rim shading, top-left highlight, film grain. The active orb runs live
 *      (audio-reactive: energy speeds up the flow and brightens it); the
 *      other orbs show a still frame of the same shader, rendered once per
 *      voice into a data-URL and cached, so only ONE WebGL context is ever
 *      alive. Palettes: per-voice data-vo-colors, else a rotating set of
 *      Sagitone-like bold palettes. Orb style = Image (the default, matching
 *      the live site) uses the Sagitone gradient images: neighbours show the
 *      image, the active orb warps it live as a WebGL texture.
 *
 * Behaviour (as v3.4): 5-orb ladder (centre + 2 + 2), infinite loop via
 * FIVE DOM copies and an invisible ±N re-centre (three copies let rapid
 * presses hit the end of the track before the jump), transform-only
 * transitions, click/‹ ›/←→ only navigate, playback only via the play
 * button, double-buffered <audio> + AnalyserNode energy, progress ring,
 * captions only on the active orb, arrows aligned to the active title.
 * Zero dependencies. Works inside Webflow's Code Component shadow root.
 */

import * as React from "react";

export interface VoiceOrbsProps {
  orbStyle?: string;
  sizes?: string;
  fit?: number;
  minScale?: number;
  gap?: number;
  captionWidth?: number;
  navOffset?: number;
  initial?: number;

  card?: boolean;

  v1Name?: string; v1Desc?: string; v1Audio?: string; v1Image?: string; v1Colors?: string;
  v2Name?: string; v2Desc?: string; v2Audio?: string; v2Image?: string; v2Colors?: string;
  v3Name?: string; v3Desc?: string; v3Audio?: string; v3Image?: string; v3Colors?: string;
  v4Name?: string; v4Desc?: string; v4Audio?: string; v4Image?: string; v4Colors?: string;
  v5Name?: string; v5Desc?: string; v5Audio?: string; v5Image?: string; v5Colors?: string;
  v6Name?: string; v6Desc?: string; v6Audio?: string; v6Image?: string; v6Colors?: string;
  v7Name?: string; v7Desc?: string; v7Audio?: string; v7Image?: string; v7Colors?: string;
  v8Name?: string; v8Desc?: string; v8Audio?: string; v8Image?: string; v8Colors?: string;
  v9Name?: string; v9Desc?: string; v9Audio?: string; v9Image?: string; v9Colors?: string;
  v10Name?: string; v10Desc?: string; v10Audio?: string; v10Image?: string; v10Colors?: string;
}

type RGB = [number, number, number];
type Voice = { name: string; desc: string; src: string; img: string; colors: RGB[] | null };

/* ── Palettes ───────────────────────────────────────────────── */
const PALETTES: RGB[][] = [
  [[0.99, 0.80, 0.25], [0.16, 0.22, 0.48], [0.98, 0.96, 0.92]], // saffron · navy · cream   (Sagitone 02)
  [[0.98, 0.55, 0.36], [0.99, 0.95, 0.92], [0.94, 0.42, 0.30]], // coral · white · rust     (Sagitone 05)
  [[0.36, 0.72, 0.95], [0.98, 0.62, 0.30], [0.99, 0.82, 0.30]], // sky · orange · gold      (Sagitone 06)
  [[0.42, 0.40, 0.78], [0.99, 0.78, 0.30], [0.50, 0.78, 0.96]], // violet · gold · blue     (Sagitone 10)
  [[0.93, 0.45, 0.62], [0.99, 0.90, 0.60], [0.55, 0.47, 0.92]], // magenta · lemon · violet
  [[0.30, 0.70, 0.62], [0.99, 0.95, 0.85], [0.16, 0.30, 0.55]], // teal · cream · navy
];

function parseColors(v: string | undefined | null): RGB[] | null {
  if (!v) return null;
  const out: RGB[] = [];
  v.split(",").forEach((h) => {
    const m = h.trim().match(/^#?([0-9a-f]{6})$/i);
    if (m) out.push([parseInt(m[1].slice(0, 2), 16) / 255, parseInt(m[1].slice(2, 4), 16) / 255, parseInt(m[1].slice(4, 6), 16) / 255]);
  });
  return out.length >= 3 ? out.slice(0, 3) : null;
}

/* ── WebGL fluid orb (shader from voice-orbs.js, + spherical shading) ── */
const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";
const FRAG = `
precision highp float;
uniform sampler2D u_tex;uniform sampler2D u_noise;
uniform vec2 u_res;uniform float u_time;uniform float u_energy;uniform float u_hasTex;
uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;
float fbm(vec2 p){float v=0.0,a=0.5;p*=0.045;for(int i=0;i<4;i++){v+=a*texture2D(u_noise,p).r;p=p*2.03+17.1;a*=0.5;}return v;}
// smoother, large-scale field for the procedural colour flow (no confetti)
float soft(vec2 p){float v=0.0,a=0.6;p*=0.016;for(int i=0;i<3;i++){v+=a*texture2D(u_noise,p).r;p=p*1.9+7.3;a*=0.45;}return v/(0.6+0.27+0.1215);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;vec2 c=uv-0.5;float r=length(c)*2.0;
  float mask=1.0-smoothstep(0.98,1.0,r);
  float t=u_time;
  vec2 q=vec2(fbm(uv*2.0+vec2(t*0.30,t*0.18)),fbm(uv*2.0+vec2(4.7,1.3)-vec2(t*0.22,t*0.34)));
  float amp=(0.14+u_energy*0.30)*(1.0-smoothstep(0.80,1.0,r));
  vec2 wuv=uv+(q-0.5)*amp;
  vec3 col;
  if(u_hasTex>0.5){col=texture2D(u_tex,wuv).rgb;}
  else{
    // procedural: three-colour fluid + a slow second layer for depth
    vec2 s1=vec2(soft(uv*2.0+vec2(t*0.20,t*0.12)),soft(uv*2.0+vec2(3.1,5.7)-vec2(t*0.15,t*0.23)));
    vec2 suv=uv+(s1-0.5)*(0.35+u_energy*0.35);
    float k1=smoothstep(0.38,0.62,soft(suv*1.6+vec2(t*0.05,0.0)));
    float k2=smoothstep(0.42,0.66,soft(suv*1.3+vec2(9.2,2.4)-vec2(0.0,t*0.06)));
    col=mix(u_c1,u_c2,k1);col=mix(col,u_c3,k2*0.9);
    float d=soft(wuv*2.2+vec2(-t*0.08,t*0.06));
    col=mix(col,u_c2*0.9+u_c1*0.1,smoothstep(0.55,0.80,d)*0.5);
    // spherical shading: light from top-left, soft terminator, rim
    vec3 n=vec3(c*2.0,sqrt(max(0.0,1.0-r*r)));
    float lit=clamp(dot(n,normalize(vec3(-0.45,0.55,0.70))),0.0,1.0);
    col*=0.72+0.38*lit;
    col+=vec3(0.10)*pow(lit,6.0);
    col+=u_c3*0.18*pow(1.0-n.z,3.0);
  }
  vec2 h=c-vec2(-0.16,0.16);
  col+=vec3(0.08)*exp(-dot(h,h)*7.0);
  col*=1.0-0.16*smoothstep(0.60,1.0,r);
  col+=u_energy*0.12;
  float g=texture2D(u_noise,gl_FragCoord.xy/128.0+fract(vec2(t*3.1,t*5.7))).r;
  col+=(g-0.5)*0.07;
  gl_FragColor=vec4(col,mask);
}`;

type Viz = {
  canvas: HTMLCanvasElement;
  setImage: (img: HTMLImageElement | null) => boolean;
  setColors: (c: RGB[]) => void;
  resize: (side: number) => void;
  draw: (t: number, e: number) => void;
  dispose: () => void;
};

function createViz(canvas: HTMLCanvasElement, preserveDrawingBuffer = false): Viz | null {
  /* preserveDrawingBuffer only for the offscreen thumbnail context (toDataURL
     needs it); the live canvas must not pay for it. */
  const opts = { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer };
  const gl = (canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts)) as WebGLRenderingContext | null;
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn("[VoiceOrbs]", gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const noiseTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, noiseTex);
  const px = new Uint8Array(128 * 128);
  for (let i = 0; i < px.length; i++) px[i] = (Math.random() * 256) | 0;
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 128, 128, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const orbTex = gl.createTexture();

  const uRes = gl.getUniformLocation(prog, "u_res"), uTime = gl.getUniformLocation(prog, "u_time");
  const uEnergy = gl.getUniformLocation(prog, "u_energy"), uHasTex = gl.getUniformLocation(prog, "u_hasTex");
  const uC = [gl.getUniformLocation(prog, "u_c1"), gl.getUniformLocation(prog, "u_c2"), gl.getUniformLocation(prog, "u_c3")];
  gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);
  gl.uniform1i(gl.getUniformLocation(prog, "u_noise"), 1);
  gl.uniform1f(uHasTex, 0);

  return {
    canvas,
    setImage(img) {
      if (!img) { gl.uniform1f(uHasTex, 0); return false; }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, orbTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
      catch (_) { gl.uniform1f(uHasTex, 0); return false; }
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.uniform1f(uHasTex, 1);
      return true;
    },
    setColors(cols) { for (let i = 0; i < 3; i++) gl.uniform3fv(uC[i], cols[i] || PALETTES[0][i]); },
    resize(side) { canvas.width = side; canvas.height = side; gl.viewport(0, 0, side, side); },
    draw(t, e) {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t); gl.uniform1f(uEnergy, e);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); },
  };
}

const PLAY = <svg className="vo-ic-play" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M5.5 3.5v11l9-5.5z" fill="currentColor" /></svg>;
const PAUSE = <svg className="vo-ic-pause" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4.5 3.5h3v11h-3zM10.5 3.5h3v11h-3z" fill="currentColor" /></svg>;
const CHEV_L = <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fillRule="evenodd" d="M9.224 1.553a.5.5 0 0 1 .223.67L6.56 8l2.888 5.776a.5.5 0 1 1-.894.448l-3-6a.5.5 0 0 1 0-.448l3-6a.5.5 0 0 1 .67-.223" /></svg>;
const CHEV_R = <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true"><path fillRule="evenodd" d="M6.776 1.553a.5.5 0 0 1 .671.223l3 6a.5.5 0 0 1 0 .448l-3 6a.5.5 0 1 1-.894-.448L9.44 8 6.553 2.224a.5.5 0 0 1 .223-.671" /></svg>;

const CSS = `
.vo{position:relative;width:100%;box-sizing:border-box;--vo-gap:64px;--vo-caption-w:280px;--vo-nav-offset:230px;--vo-nav-bottom:2.25rem}
.vo *,.vo *::before,.vo *::after{box-sizing:border-box}
.vo.is-card{background:var(--surface--light,#eeebf8);border-radius:var(--radius--lg,1rem)}
.vo-viewport{width:100%;overflow:hidden;padding:var(--spacing--12,3rem) 0;outline:none;border-radius:inherit}
.vo-track{display:flex;align-items:flex-start;gap:var(--vo-gap);width:max-content;will-change:transform;transition:transform .55s cubic-bezier(.22,1,.36,1)}
.vo.vo-no-anim .vo-track,.vo.vo-no-anim .vo-item{transition:none!important}
.vo-item{flex:0 0 auto;transform-origin:50% calc(var(--vo-zone,256px)/2);opacity:.75;transition:transform .55s cubic-bezier(.22,1,.36,1),opacity .55s cubic-bezier(.22,1,.36,1)}
.vo-item.vo-d1{opacity:.9}.vo-item.is-active{opacity:1}
.vo-orb{position:relative;height:var(--vo-zone,256px);cursor:pointer;transition:transform .3s cubic-bezier(.22,1,.36,1)}
.vo-item:not(.is-active):hover .vo-orb{transform:scale(1.05)}
.vo-orb img,.vo-canvas{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:100%;aspect-ratio:1;border-radius:9999px;display:block}
.vo-orb img{object-fit:cover;pointer-events:none}
.vo-canvas{pointer-events:none;opacity:0;transition:opacity .4s;z-index:1}
.vo-item.is-active .vo-canvas{opacity:1}
.vo-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:calc(100% + 18px);aspect-ratio:1;color:var(--color-text--primary,rgba(17,17,17,.45));pointer-events:none;opacity:0;transition:opacity .3s;z-index:2}
.vo-item.is-playing .vo-ring{opacity:1}
.vo-play{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;padding:0;border:0;border-radius:9999px;background:#fff;color:#111;box-shadow:0 2px 14px rgba(0,0,0,.14);cursor:pointer;display:grid;place-items:center;opacity:0;transition:opacity .25s,transform .25s;z-index:2}
.vo-item.is-active .vo-play,.vo-item:hover .vo-play,.vo-play:focus-visible{opacity:1}
.vo-play:hover{transform:translate(-50%,-50%) scale(1.06)}
.vo-play .vo-ic-play{display:block}.vo-play .vo-ic-pause{display:none}
.vo-item.is-playing .vo-play .vo-ic-play{display:none}.vo-item.is-playing .vo-play .vo-ic-pause{display:block}
.vo-caption{position:relative;left:50%;transform:translate(-50%,10px);width:var(--vo-caption-w);margin-top:var(--spacing--6,1.5rem);text-align:center;opacity:0;transition:opacity .4s cubic-bezier(.22,1,.36,1),transform .4s cubic-bezier(.22,1,.36,1);pointer-events:none}
.vo-item.is-active .vo-caption{opacity:1;transform:translate(-50%,0);pointer-events:auto}
.vo-title{color:var(--color-text--secondary,#8f8f8f);transition:color .3s;font-weight:var(--font-weight--medium,500)}
.vo-item.is-active .vo-title{color:var(--color-text--primary,var(--color-text--base,#111))}
.vo-desc{margin-top:.35em;color:var(--color-text--secondary,#9a9a9a);transition:color .3s;font-size:var(--text--sm,.875rem)}
.vo-item.is-active .vo-desc{color:var(--color-text--primary,#444)}
.vo-nav{position:absolute;top:var(--vo-nav-top,auto);bottom:var(--vo-nav-bottom);width:40px;height:40px;padding:0;border:0;border-radius:9999px;background:transparent;color:var(--color-text--secondary,#777);cursor:pointer;z-index:3;transition:color .2s;display:grid;place-items:center}
.vo-nav svg{display:block}.vo-nav:hover{color:var(--color-text--primary,#111)}
.vo-nav--prev{left:max(12px,calc(50% - var(--vo-nav-offset)))}.vo-nav--next{right:max(12px,calc(50% - var(--vo-nav-offset)))}
@media (prefers-reduced-motion:reduce){.vo-track,.vo-item,.vo-play{transition:none}}
`;

let currentlyPlaying: { stop: () => void } | null = null;

export function VoiceOrbs(p: VoiceOrbsProps) {
  const {
    orbStyle = "Image", sizes = "220,150,104", fit = 760, minScale = 0.42,
    gap = 64, captionWidth = 280, navOffset = 230, initial = 0, card = true,
  } = p;

  const rootRef = React.useRef<HTMLDivElement>(null);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [thumbs, setThumbs] = React.useState<Record<number, string>>({});

  /* Voices from the Voice 1–10 props */
  const P = p as Record<string, unknown>;
  const propKey = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [P["v" + n + "Name"], P["v" + n + "Desc"], P["v" + n + "Audio"], P["v" + n + "Image"], P["v" + n + "Colors"]].join("\u0001")).join("\u0002");
  const propVoices = React.useMemo<Voice[]>(() => {
    const g = (n: number): Voice => ({
      name: String(P["v" + n + "Name"] || ""), desc: String(P["v" + n + "Desc"] || ""),
      src: String(P["v" + n + "Audio"] || ""), img: String(P["v" + n + "Image"] || ""),
      colors: parseColors(P["v" + n + "Colors"] as string | undefined),
    });
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(g).filter((v) => v.name || v.src);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propKey]);

  const voices = propVoices;
  const N = voices.length;
  const procedural = orbStyle !== "Image";
  const paletteOf = React.useCallback((i: number): RGB[] => voices[i].colors || PALETTES[i % PALETTES.length], [voices]);

  /* Still frames for the non-active orbs (procedural mode): one shared
     offscreen context renders each voice once at a fixed phase. Deferred
     until the root first nears the viewport, then one voice per frame so the
     work never blocks a single frame. */
  React.useEffect(() => {
    if (!procedural || !N) return;
    const root = rootRef.current;
    if (!root) return;
    let alive = true, raf = 0, i = 0;
    let cv: HTMLCanvasElement | null = null, viz: Viz | null = null;
    const out: Record<number, string> = {};
    const step = () => {
      if (!alive || !viz || !cv) return;
      viz.setImage(null);
      viz.setColors(paletteOf(i));
      viz.draw(1.3 + i * 1.7, 0);
      out[i] = cv.toDataURL("image/png");
      i++;
      if (i < N) { raf = requestAnimationFrame(step); return; }
      setThumbs(out);
      viz.dispose(); viz = null;
    };
    const start = () => {
      if (!alive || viz) return;
      cv = document.createElement("canvas");
      viz = createViz(cv, true);
      if (!viz) return;
      viz.resize(320);
      raf = requestAnimationFrame(step);
    };
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (io) { io.disconnect(); io = null; }
        start();
      }, { rootMargin: "50% 0px" });
      io.observe(root);
    } else start();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (viz) viz.dispose();
    };
  }, [procedural, N, paletteOf]);

  /* ── The carousel engine (port of setup() in voice-orbs.js) ───── */
  React.useEffect(() => {
    const root = rootRef.current, track = trackRef.current, viewport = viewportRef.current;
    if (!root || !track || !viewport || !N) return;
    const ladder = sizes.split(",").map((n) => parseFloat(n) || 0).filter((n) => n > 0);
    if (!ladder.length) ladder.push(220, 150, 104);
    // FIVE copies of the set (voice-orbs.js used three): with two full sets
    // on either side of the middle copy, rapid ‹ › presses can never reach
    // the end of the track before the invisible ±N re-centre catches up.
    const els = Array.from(track.children) as HTMLElement[];   // 5N items
    const MID = 2 * N;
    let pos = MID + Math.min(Math.max(0, initial | 0), N - 1);
    const voiceOf = (i: number) => ((i % N) + N) % N;

    // audio: double-buffer + blob cache + analyser
    const audios = [0, 1].map(() => {
      const a = document.createElement("audio");
      a.preload = "none"; a.crossOrigin = "anonymous"; a.setAttribute("aria-hidden", "true"); a.style.display = "none";
      root.appendChild(a);
      a.addEventListener("ended", stop);
      return a;
    });
    let flip = 0, ac: AudioContext | null = null, analyser: AnalyserNode | null = null, freq: Uint8Array<ArrayBuffer> | null = null;
    const blobCache: Record<string, Promise<string>> = {};
    let playing = false, playSeq = 0;
    const ensureGraph = () => {
      if (ac) return;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      analyser = ac.createAnalyser(); analyser.fftSize = 128;
      freq = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
      audios.forEach((a) => ac!.createMediaElementSource(a).connect(analyser!));
      analyser.connect(ac.destination);
    };
    const loadBlob = (url: string) => {
      if (!blobCache[url]) blobCache[url] = fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }).then((b) => URL.createObjectURL(b)).catch(() => url);
      return blobCache[url];
    };

    // live visualizer canvas (moves to the active orb)
    let canvas: HTMLCanvasElement | null = document.createElement("canvas");
    canvas.className = "vo-canvas"; canvas.setAttribute("aria-hidden", "true");
    const viz = createViz(canvas);
    if (!viz) canvas = null;

    // progress ring
    const NS = "http://www.w3.org/2000/svg";
    const ring = document.createElementNS(NS, "svg");
    ring.setAttribute("class", "vo-ring"); ring.setAttribute("viewBox", "0 0 100 100"); ring.setAttribute("aria-hidden", "true");
    const rc = document.createElementNS(NS, "circle");
    ["cx", "50", "cy", "50", "r", "48.75", "fill", "none", "stroke", "currentColor", "stroke-width", "2.5", "stroke-linecap", "round", "pathLength", "100", "transform", "rotate(-90 50 50)"]
      .reduce<string[]>((acc, v, i, arr) => { if (i % 2 === 0) rc.setAttribute(v, arr[i + 1]); return acc; }, []);
    rc.style.strokeDasharray = "100"; rc.style.strokeDashoffset = "100";
    ring.appendChild(rc);

    const texCache: Record<number, Promise<HTMLImageElement | null>> = {};
    const textureFor = (vi: number) => {
      if (!texCache[vi]) texCache[vi] = new Promise((res) => {
        const s = voices[vi].img;
        if (!procedural && s) { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = s; }
        else res(null);
      });
      return texCache[vi];
    };

    // layout — transform-only
    let L0 = 0, gapNow = 0;
    const scaleNow = () => Math.max(minScale, Math.min(1, (viewport.clientWidth || root.clientWidth) / fit));
    const setStatic = () => {
      const s = scaleNow();
      gapNow = gap * s;
      L0 = Math.round(ladder[0] * s);
      track.style.gap = gapNow.toFixed(1) + "px";
      root.style.setProperty("--vo-zone", L0 + "px");
      els.forEach((el) => { el.style.width = L0 + "px"; });
      if (viz) viz.resize(Math.round(L0 * Math.min(window.devicePixelRatio || 1, 2)));
      updateNavTop();
    };
    const layout = (noAnim: boolean) => {
      const s = scaleNow();
      if (noAnim) root.classList.add("vo-no-anim");
      let x = 0, activeCenter = 0;
      els.forEach((el, i) => {
        const dist = Math.min(Math.abs(i - pos), ladder.length - 1);
        const size = ladder[dist] * s;
        const cVisual = x + size / 2;
        const cStatic = i * (L0 + gapNow) + L0 / 2;
        el.style.transform = "translate3d(" + (cVisual - cStatic).toFixed(1) + "px,0,0) scale(" + (size / L0).toFixed(4) + ")";
        if (i === pos) activeCenter = cVisual;
        x += size + gapNow;
      });
      track.style.transform = "translate3d(" + ((viewport.clientWidth / 2) - activeCenter).toFixed(1) + "px,0,0)";
      if (noAnim) { void track.offsetWidth; root.classList.remove("vo-no-anim"); }
    };
    const updateNavTop = () => {
      const title = els[pos].querySelector(".vo-title") || els[pos].querySelector(".vo-caption");
      if (!title) return;
      const rt = root.getBoundingClientRect().top, tr = title.getBoundingClientRect();
      root.style.setProperty("--vo-nav-top", Math.round(tr.top - rt + tr.height / 2 - 20) + "px");
    };

    let colorSeq = 0;
    const activate = () => {
      els.forEach((el, i) => {
        el.classList.toggle("is-active", i === pos);
        el.classList.toggle("vo-d1", Math.abs(i - pos) === 1);
        if (i !== pos) el.classList.remove("is-playing");
      });
      const orb = els[pos].querySelector(".vo-orb");
      if (orb && ring.parentNode !== orb) { rc.style.strokeDashoffset = "100"; orb.insertBefore(ring, orb.querySelector(".vo-play")); }
      if (!canvas) return;
      if (orb && canvas.parentNode !== orb) orb.insertBefore(canvas, orb.querySelector(".vo-play"));
      const vi = voiceOf(pos), seq = ++colorSeq;
      textureFor(vi).then((im) => {
        if (seq !== colorSeq || !viz) return;
        if (viz.setImage(im)) return;
        viz.setColors(paletteOf(vi));
      });
      textureFor((vi + 1) % N); textureFor((vi + N - 1) % N);
    };

    // rAF — runs only while the root intersects the viewport (IO below);
    // energy drives speed, phase never jumps. Idle (not playing, energy ≈ 0)
    // draws every other frame — phase still advances per tick, so motion
    // speed is unchanged.
    let last = performance.now(), energy = 0, phase = 0, raf = 0, alive = true, inView = true, frame = 0;
    const tick = () => {
      if (!alive || !inView) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      let target = 0;
      if (playing && analyser && freq) {
        analyser.getByteFrequencyData(freq);
        let sum = 0; for (let i = 0; i < freq.length; i++) sum += freq[i];
        target = (sum / freq.length) / 255;
      }
      energy += (target - energy) * 0.18;
      phase += dt * (0.28 + energy * 1.1);
      frame++;
      const idle = !playing && energy < 0.002;
      if (viz && !(idle && (frame & 1))) viz.draw(phase, energy);
      if (playing) {
        if (canvas) canvas.style.transform = "translate(-50%,-50%) scale(" + (1 + energy * 0.06).toFixed(4) + ")";
        const a = audios[flip];
        rc.style.strokeDashoffset = (100 - (a.duration ? a.currentTime / a.duration : 0) * 100).toFixed(2);
      }
      raf = requestAnimationFrame(tick);
    };

    function stop() {
      playing = false;
      els.forEach((el) => el.classList.remove("is-playing"));
      audios.forEach((a) => a.pause());
      if (canvas) canvas.style.transform = "";
    }
    const ctl = { stop };
    const play = () => {
      const v = voices[voiceOf(pos)];
      if (!v.src) return;
      if (currentlyPlaying && currentlyPlaying !== ctl) currentlyPlaying.stop();
      currentlyPlaying = ctl;
      ensureGraph();
      if (ac && ac.state === "suspended") ac.resume();
      const id = ++playSeq;
      const prev = audios[flip]; flip = 1 - flip; const next = audios[flip];
      loadBlob(v.src).then((src) => {
        if (id !== playSeq) return;
        prev.pause();
        if (next.src !== src) next.src = src;
        next.currentTime = 0;
        next.play().catch(() => {});
        playing = true;
        els[pos].classList.add("is-playing");
      });
    };
    const toggle = () => { if (playing) stop(); else play(); };
    /* Re-centre by whole sets WITHOUT disturbing an in-flight slide.
       Every item takes over the CURRENT (mid-transition) transform of the item
       one set away, and the track compensates by one set width, so the frame
       is pixel-identical; then the slide continues from there. This replaces
       the old 620ms timer, which rapid presses kept resetting until the track
       ran out of copies. */
    const mtx = (el: Element) => {
      const m = getComputedStyle(el).transform;
      if (!m || m === "none") return { x: 0, s: 1 };
      const v = m.match(/matrix\(([^)]+)\)/);
      if (!v) return { x: 0, s: 1 };
      const a = v[1].split(",").map(parseFloat);
      return { x: a[4] || 0, s: a[0] || 1 };
    };
    const recenter = (shift: number) => {
      const cur = els.map(mtx);                  // current visuals, mid-flight
      const curTrack = mtx(track).x;
      const oldInline = els.map((el) => el.style.transform);
      const oldTrack = track.style.transform;
      pos += shift;
      activate();
      layout(true);                              // new targets, no transition
      // one-set delta between the new and old item targets (constant)
      const j = Math.max(shift, 0) + MID;         // an index that has a counterpart
      const num = (t: string) => { const m = t.match(/translate3d\((-?[\d.]+)px/); return m ? parseFloat(m[1]) : 0; };
      const D = num(els[j].style.transform) - num(oldInline[j - shift]);
      const newTrack = track.style.transform;
      const T = num(newTrack) - num(oldTrack);
      root.classList.add("vo-no-anim");
      els.forEach((el, i) => {
        const src = cur[i - shift];              // the item whose role we take
        if (src) el.style.transform = "translate3d(" + (src.x + D).toFixed(1) + "px,0,0) scale(" + src.s.toFixed(4) + ")";
      });
      track.style.transform = "translate3d(" + (curTrack + T).toFixed(1) + "px,0,0)";
      void track.offsetWidth;
      root.classList.remove("vo-no-anim");
      layout(false);                             // resume the slide to the new targets
    };
    const goTo = (index: number) => {
      if (index === pos || index < 0 || index >= els.length) return;
      stop();
      // keep pos inside the middle copy: shift by whole sets first
      while (index < MID) { recenter(N); index += N; }
      while (index >= MID + N) { recenter(-N); index -= N; }
      pos = index; activate(); layout(false);
    };

    // wire clicks (delegated, so React re-renders don't matter)
    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      const item = t.closest(".vo-item") as HTMLElement | null;
      if (!item) return;
      const i = els.indexOf(item);
      if (i < 0) return;
      if (t.closest(".vo-play")) { e.stopPropagation(); if (i === pos) toggle(); else { goTo(i); play(); } return; }
      if (t.closest(".vo-orb") && i !== pos) goTo(i);
    };
    track.addEventListener("click", onClick);
    const prevBtn = root.querySelector(".vo-nav--prev"), nextBtn = root.querySelector(".vo-nav--next");
    const onPrev = () => goTo(pos - 1), onNext = () => goTo(pos + 1);
    if (prevBtn) prevBtn.addEventListener("click", onPrev);
    if (nextBtn) nextBtn.addEventListener("click", onNext);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") { goTo(pos - 1); e.preventDefault(); }
      else if (e.key === "ArrowRight") { goTo(pos + 1); e.preventDefault(); }
    };
    root.addEventListener("keydown", onKey);
    let rT = 0;
    const onResize = () => { clearTimeout(rT); rT = window.setTimeout(() => { setStatic(); layout(true); }, 100); };
    window.addEventListener("resize", onResize);

    activate(); setStatic(); layout(true);
    const startLoop = () => { if (!alive || inView) return; inView = true; last = performance.now(); raf = requestAnimationFrame(tick); };
    const stopLoop = () => { inView = false; cancelAnimationFrame(raf); };
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      inView = false;
      io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) startLoop(); else stopLoop(); });
      io.observe(root);
    } else raf = requestAnimationFrame(tick);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (alive) updateNavTop(); }).catch(() => {});

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (io) io.disconnect();
      clearTimeout(rT);
      stop();
      if (currentlyPlaying === ctl) currentlyPlaying = null;
      track.removeEventListener("click", onClick);
      if (prevBtn) prevBtn.removeEventListener("click", onPrev);
      if (nextBtn) nextBtn.removeEventListener("click", onNext);
      root.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      audios.forEach((a) => { a.pause(); a.remove(); });
      if (ac) ac.close().catch(() => {});
      if (viz) viz.dispose();
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
      if (ring.parentNode) ring.parentNode.removeChild(ring);
      els.forEach((el) => { el.style.transform = ""; el.style.width = ""; el.classList.remove("is-active", "vo-d1", "is-playing"); });
    };
  }, [voices, N, procedural, sizes, fit, minScale, gap, initial, paletteOf]);

  /* First-paint orb height: the ladder's first value at scale 1 (what
     setStatic computes before any effect runs); setStatic refines it. */
  const zone0 = React.useMemo(() => {
    const l = sizes.split(",").map((n) => parseFloat(n) || 0).filter((n) => n > 0);
    return Math.round(l[0] || 220);
  }, [sizes]);
  const style = { "--vo-gap": gap + "px", "--vo-caption-w": captionWidth + "px", "--vo-nav-offset": navOffset + "px", "--vo-zone": zone0 + "px" } as React.CSSProperties;
  const hasVoices = N > 0;

  const renderItem = (v: Voice, vi: number, copy: number) => (
    <div key={copy + "-" + vi} className="vo-item" data-vo-voice={vi}>
      <div className="vo-orb">
        {procedural
          ? (thumbs[vi] ? <img src={thumbs[vi]} alt="" draggable={false} decoding="async" /> : <div className="vo-ph" style={{ position: "absolute", inset: "0 0 0 0", borderRadius: "9999px", background: "radial-gradient(circle at 35% 30%, #fff 0%, #dcd6f7 45%, #9f95e0 100%)" }} />)
          : (v.img ? <img src={v.img} alt="" draggable={false} crossOrigin="anonymous" decoding="async" loading={copy === 2 ? undefined : "lazy"} /> : null)}
        <button type="button" className="vo-play" aria-label={"Play " + (v.name || "voice") + " preview"} tabIndex={copy === 2 ? 0 : -1}>{PLAY}{PAUSE}</button>
      </div>
      <div className="vo-caption">
        <div className="vo-title">{v.name}</div>
        {v.desc && <div className="vo-desc">{v.desc}</div>}
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={"vo" + (card ? " is-card" : "")} data-voice-orbs style={style} tabIndex={hasVoices ? 0 : undefined}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {hasVoices && (
        <>
          <div ref={viewportRef} className="vo-viewport">
            <div ref={trackRef} className="vo-track">
              {[0, 1, 2, 3, 4].map((copy) => voices.map((v, vi) => renderItem(v, vi, copy)))}
            </div>
          </div>
          <button type="button" className="vo-nav vo-nav--prev" aria-label="Previous voice">{CHEV_L}</button>
          <button type="button" className="vo-nav vo-nav--next" aria-label="Next voice">{CHEV_R}</button>
        </>
      )}
    </div>
  );
}
