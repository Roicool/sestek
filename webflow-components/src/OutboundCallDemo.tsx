/**
 * OutboundCallDemo — "Sizi arayalım" canlı demo sahnesi.
 *
 * Koyu (Deep) ya da açık (Soft) temalı, container-2xl genişliğinde split
 * section: solda display tipografili içerik + 3 adımlık şerit + nefes alan
 * ses dalgası; sağda cam (glass) panel — başında CANLI WebGL fluid orb'lu
 * asistan satırı, floating-label'lı alanlar, +90 çipli ve yazarken
 * biçimlenen telefon girişi. Gönderimde buton "bağlanıyor" durumuna geçer;
 * başarıda panel bir ARAMA EKRANINA dönüşür: orb büyür, çalma halkaları
 * yayılır, ekolayzer çubukları oynar, aranan numara gösterilir.
 *
 * Davranış js/components/outbound-demo.js ile aynı sözleşmededir
 * (docs/outbound-demo-api.md): TR telefon normalizasyonu, KVKK onayı,
 * honeypot, JSON POST, sunucu hata kodları, localStorage'da kalıcı cooldown
 * (AYNI "sestek-od" anahtarı — vanilla formla limiti paylaşır).
 *
 * Renk/ölçüler RC token'larına köprülüdür (var(--token, fallback)) —
 * Webflow sayfasında gerçek marka değerleri kaskadlanır. WebGL yoksa ya da
 * prefers-reduced-motion'da orb statik CSS gradient'e düşer.
 */
import * as React from "react";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";

export interface OutboundCallDemoProps {
  theme?: Theme;
  eyebrow?: string;
  heading?: string;
  headingAccent?: string;
  description?: string;
  step1?: string;
  step2?: string;
  step3?: string;
  agentName?: string;
  agentStatus?: string;
  nameLabel?: string;
  phoneLabel?: string;
  consentText?: string;
  buttonText?: string;
  sendingText?: string;
  successTitle?: string;
  successText?: string;
  endpoint?: string;
  lang?: Lang;
  cooldownSeconds?: number;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_name: "Lütfen adınızı girin.",
    invalid_phone: "Lütfen geçerli bir cep telefonu girin.",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    rate_limited: "Kısa süre önce bir arama istediniz — lütfen biraz sonra tekrar deneyin.",
    not_configured: "Demo şu an kullanılamıyor, lütfen daha sonra deneyin.",
    upstream: "Arama başlatılamadı, lütfen daha sonra tekrar deneyin.",
    network: "Bağlantı kurulamadı — internetinizi kontrol edip tekrar deneyin.",
    generic: "Bir şeyler ters gitti, lütfen tekrar deneyin.",
  },
  EN: {
    invalid_name: "Please enter your name.",
    invalid_phone: "Please enter a valid mobile number.",
    consent_required: "Please tick the consent box to continue.",
    rate_limited: "You requested a call just now — please try again in a few minutes.",
    not_configured: "The demo is unavailable right now, please try again later.",
    upstream: "We couldn't start the call, please try again later.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
  },
};

/* ── Telefon: serbest girişten 10 haneli "5XXXXXXXXX" çıkar ─────── */
function phoneDigits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("90") && d.length > 10) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
/* "5444390406" → "544 439 04 06" (canlı biçimleme) */
function formatPhone(d: string): string {
  const g = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)];
  return g.filter(Boolean).join(" ");
}

/* ── Kalıcı gönderim kaydı — vanilla outbound-demo.js ile AYNI anahtar ── */
const STORE_KEY = "sestek-od";
type Store = { last?: number; phones?: Record<string, number> };
function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch { /* storage kapalı */ }
  return {};
}
function recordSubmit(phone: string) {
  const s = readStore();
  const now = Date.now();
  s.last = now;
  s.phones = s.phones || {};
  s.phones[phone] = now;
  for (const k of Object.keys(s.phones)) {
    if (now - s.phones[k] > 86400000) delete s.phones[k];
  }
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* */ }
}
function cooldownLeft(phone: string, perPhoneMs: number): number {
  const s = readStore();
  const now = Date.now();
  let left = Math.max(0, (s.last || 0) + 60000 - now);
  const t = s.phones?.[phone];
  if (t) left = Math.max(left, t + perPhoneMs - now);
  return left;
}

/* ── Mini fluid orb — voice-orbs shader'ının renk-sentez dalı ─────
 * Küçük (dpr×88px) canvas'ta domain-warped fbm; idle'da yavaş akar,
 * "calling" durumunda hız + parlaklık artar. Reduced-motion/WebGL yok →
 * CSS gradient fallback (canvas gizli kalır). */
const ORB_FRAG = `precision mediump float;
uniform sampler2D n;uniform vec2 R;uniform float T,E;
uniform vec3 A,B,C;
float f(vec2 p){float v=0.,a=.5;p*=.06;
for(int i=0;i<4;i++){v+=a*texture2D(n,p).r;p=p*2.03+17.1;a*=.5;}return v;}
void main(){vec2 u=gl_FragCoord.xy/R;vec2 c=u-.5;float r=length(c)*2.;
float m=1.-smoothstep(.96,1.,r);float t=T;
vec2 q=vec2(f(u*2.+vec2(t*.3,t*.18)),f(u*2.+vec2(4.7,1.3)-vec2(t*.22,t*.34)));
vec3 col=mix(A,B,clamp((q.x-.32)*3.,0.,1.));
col=mix(col,C,clamp((q.y-.36)*2.8,0.,1.));
vec2 h=c-vec2(-.14,.14);col+=vec3(.10)*exp(-dot(h,h)*8.);
col*=1.-.18*smoothstep(.55,1.,r);col+=E*.14;
float g=texture2D(n,gl_FragCoord.xy/64.+fract(vec2(t*3.1,t*5.7))).r;
col+=(g-.5)*.06;gl_FragColor=vec4(col,m);}`;

function useFluidOrb(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  calling: boolean
) {
  const callingRef = React.useRef(calling);
  callingRef.current = calling;
  const [gpuOk, setGpuOk] = React.useState(true);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGpuOk(false);
      return;
    }
    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) { setGpuOk(false); return; }

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}");
    const fs = compile(gl.FRAGMENT_SHADER, ORB_FRAG);
    if (!vs || !fs) { setGpuOk(false); return; }
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    const px = new Uint8Array(64 * 64);
    for (let i = 0; i < px.length; i++) px[i] = (Math.random() * 256) | 0;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 64, 64, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const side = Math.round(88 * Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = side;
    canvas.height = side;
    gl.viewport(0, 0, side, side);
    gl.uniform2f(gl.getUniformLocation(prog, "R"), side, side);
    // Marka pastelleri (site token'ları canvas'a giremez — sabit fallback)
    gl.uniform3f(gl.getUniformLocation(prog, "A"), 0.62, 0.55, 1.0);   // viyole
    gl.uniform3f(gl.getUniformLocation(prog, "B"), 0.36, 0.78, 0.92);  // cyan
    gl.uniform3f(gl.getUniformLocation(prog, "C"), 1.0, 0.62, 0.82);   // pembe
    const uT = gl.getUniformLocation(prog, "T");
    const uE = gl.getUniformLocation(prog, "E");

    let raf = 0, phase = 0, energy = 0, last = performance.now(), dead = false;
    const tick = () => {
      if (dead) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = callingRef.current ? 0.75 : 0.12;
      energy += (target - energy) * 0.06;
      phase += dt * (0.35 + energy * 1.2);
      gl.uniform1f(uT, phase);
      gl.uniform1f(uE, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [canvasRef]);

  return gpuOk;
}

const CSS = `
.sodc{--x-bg1:#141222;--x-bg2:#1c1830;
  --x-text:#f4f2fb;--x-muted:#a49ec2;--x-line:rgba(255,255,255,.09);
  --x-glass:rgba(255,255,255,.05);--x-glass-line:rgba(255,255,255,.10);
  --x-field:rgba(255,255,255,.06);--x-field-line:rgba(255,255,255,.14);
  --x-accent:var(--brand-primary--400,#8d7bff);--x-accent2:#4fd1e0;--x-accent3:#ff8ac4;
  --x-neg:#ff7a68;--x-ring:rgba(255,255,255,.055);
  max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--6,1.5rem);color:var(--x-text);font:inherit}
.sodc.is-soft{--x-bg1:#f6f4fa;--x-bg2:#eef0fa;
  --x-text:var(--color-text--base,#1b1830);--x-muted:var(--color-text--muted,#6d6885);
  --x-line:rgba(20,16,48,.08);--x-glass:rgba(255,255,255,.72);--x-glass-line:rgba(20,16,48,.08);
  --x-field:rgba(20,16,48,.045);--x-field-line:rgba(20,16,48,.14);--x-neg:#d34a3a;--x-ring:rgba(20,16,48,.06)}
.sodc *{box-sizing:border-box}
.sodc-card{position:relative;isolation:isolate;overflow:hidden;
  border-radius:var(--radius--3xl,24px);
  background:linear-gradient(160deg,var(--x-bg1),var(--x-bg2));
  box-shadow:inset 0 0 0 1px var(--x-line);
  display:grid;grid-template-columns:1.08fr 1fr;align-items:center;
  gap:var(--spacing--14,3.5rem);
  padding:var(--spacing--16,4rem) var(--spacing--14,3.5rem)}
/* Ambiyans: isima yerine orb'u yankilayan hairline halkalar — sag tarafta,
 * cok silik cizgi isi (glow degil) */
.sodc-card::before,.sodc-card::after{content:"";position:absolute;z-index:-1;
  pointer-events:none;border-radius:50%;border:1px solid var(--x-ring)}
.sodc-card::before{width:64rem;height:64rem;right:-22rem;top:50%;transform:translateY(-50%)}
.sodc-card::after{width:44rem;height:44rem;right:-12rem;top:50%;transform:translateY(-50%)}

/* ── Sol: içerik ───────────────────────────────────────────── */
.sodc-copy{max-width:37rem}
.sodc-eyebrow{display:flex;align-items:center;gap:.9em;
  font-size:var(--text--sm,.875rem);font-weight:600;letter-spacing:.14em;
  text-transform:uppercase;color:var(--x-muted)}
.sodc-eyebrow::before{content:"";width:2.4rem;height:1px;
  background:linear-gradient(90deg,var(--x-accent),transparent)}
.sodc-h{margin:var(--spacing--6,1.5rem) 0 0;
  font-size:var(--heading--h1,var(--text--5xl,3rem));font-weight:600;
  line-height:1.06;letter-spacing:-.025em}
.sodc-h em{font-style:normal;
  background:linear-gradient(100deg,#b3a6ff,var(--x-accent) 70%);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.sodc.is-soft .sodc-h em{background:linear-gradient(100deg,#7c6cff,#584ad0 70%);
  -webkit-background-clip:text;background-clip:text}
.sodc-p{margin:var(--spacing--6,1.5rem) 0 0;max-width:30rem;
  font-size:var(--text--lg,1.125rem);line-height:1.65;color:var(--x-muted)}
.sodc-steps{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);
  gap:var(--spacing--3,.75rem);margin:var(--spacing--10,2.5rem) 0 0;padding:0}
.sodc-steps li{position:relative;padding:var(--spacing--5,1.25rem);
  font-size:var(--text--sm,.875rem);line-height:1.5;color:var(--x-muted);
  background:var(--x-glass);border-radius:var(--radius--xl,12px);
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px var(--x-glass-line)}
.sodc.is-soft .sodc-steps li{box-shadow:inset 0 1px 0 rgba(255,255,255,.85),
  inset 0 0 0 1px var(--x-glass-line)}
.sodc-steps b{display:block;font-size:var(--text--xs,.75rem);font-weight:600;
  letter-spacing:.12em;color:var(--x-accent);margin-bottom:.55em}

/* ── Sağ: cam panel ────────────────────────────────────────── */
.sodc-panel{position:relative;border-radius:var(--radius--2xl,16px);
  background:var(--x-glass);
  -webkit-backdrop-filter:blur(22px);backdrop-filter:blur(22px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 1px var(--x-glass-line),
    0 34px 70px -30px rgba(0,0,0,.55);
  padding:var(--spacing--9,2.25rem)}
.sodc.is-soft .sodc-panel{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),
  inset 0 0 0 1px var(--x-glass-line),0 30px 60px -28px rgba(30,24,70,.25)}
.sodc-panel.is-shake{animation:sodc-shake .4s}
@keyframes sodc-shake{20%{transform:translateX(-7px)}45%{transform:translateX(6px)}
  70%{transform:translateX(-4px)}90%{transform:translateX(2px)}}

.sodc-agent{display:flex;align-items:center;gap:var(--spacing--4,1rem);
  padding-bottom:var(--spacing--6,1.5rem);margin-bottom:var(--spacing--6,1.5rem);
  border-bottom:1px solid var(--x-line);
  transition:all .5s cubic-bezier(.22,1,.36,1)}
.sodc-orb-wrap{position:relative;flex:none;width:56px;height:56px;
  transition:width .55s cubic-bezier(.22,1,.36,1),height .55s cubic-bezier(.22,1,.36,1)}
.sodc-orb,.sodc-orb-fallback{position:absolute;inset:0;width:100%;height:100%;
  border-radius:50%;display:block}
.sodc-orb-fallback{background:radial-gradient(circle at 32% 28%,#c9b8ff,#7c6cff 46%,#4fd1e0 90%)}
.sodc-agent-txt{min-width:0}
.sodc-agent-name{font-weight:600;font-size:var(--text--base,1rem)}
.sodc-agent-st{display:flex;align-items:center;gap:.45em;margin-top:.2em;
  font-size:var(--text--xs,.75rem);letter-spacing:.06em;text-transform:uppercase;
  color:var(--x-muted)}
.sodc-agent-st::before{content:"";width:.5em;height:.5em;border-radius:50%;
  background:#3ddc84;box-shadow:0 0 8px #3ddc84}

/* çalma halkaları — yalnız success'te */
.sodc-ring{position:absolute;inset:0;border-radius:50%;pointer-events:none;
  border:1.5px solid var(--x-accent);opacity:0}
.is-calling .sodc-ring{animation:sodc-ring 2s cubic-bezier(.2,.6,.35,1) infinite}
.is-calling .sodc-ring:nth-child(2){animation-delay:.66s}
.is-calling .sodc-ring:nth-child(3){animation-delay:1.33s}
@keyframes sodc-ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.9);opacity:0}}

/* alanlar — floating label */
.sodc-form{display:grid;gap:var(--spacing--5,1.25rem)}
.sodc-field{position:relative}
.sodc-input{width:100%;font:inherit;font-size:var(--text--base,1rem);color:var(--x-text);
  background:var(--x-field);border:1px solid var(--x-field-line);
  border-radius:var(--radius--xl,12px);outline:none;
  padding:1.5em 1.1em .6em;transition:border-color .2s,box-shadow .2s,background .2s}
.sodc-input:focus{border-color:var(--x-accent);
  box-shadow:0 0 0 4px color-mix(in oklab,var(--x-accent) 18%,transparent)}
.sodc-field.is-invalid .sodc-input{border-color:var(--x-neg);
  box-shadow:0 0 0 4px color-mix(in oklab,var(--x-neg) 16%,transparent)}
.sodc-flabel{position:absolute;left:1.15em;top:50%;transform:translateY(-50%);
  pointer-events:none;color:var(--x-muted);font-size:var(--text--base,1rem);
  transition:all .18s ease}
.sodc-input:focus~.sodc-flabel,.sodc-field.has-value .sodc-flabel{
  top:.62em;transform:none;font-size:var(--text--xs,.75rem);
  letter-spacing:.05em;color:var(--x-accent)}
.sodc-field.is-invalid .sodc-flabel{color:var(--x-neg)}
/* +90 çipi */
.sodc-field--phone .sodc-input{padding-left:4.4em}
.sodc-field--phone .sodc-flabel{left:4.55em}
.sodc-prefix{position:absolute;left:.75em;top:50%;transform:translateY(-50%);
  font-size:var(--text--sm,.875rem);font-weight:600;color:var(--x-muted);
  background:var(--x-field);border:1px solid var(--x-field-line);
  border-radius:var(--radius--lg,8px);padding:.35em .6em;pointer-events:none}

.sodc-consent{display:flex;gap:.7em;align-items:flex-start;cursor:pointer;
  font-size:var(--text--sm,.875rem);line-height:1.5;color:var(--x-muted)}
.sodc-consent input{flex:none;width:1.1em;height:1.1em;margin-top:.16em;
  accent-color:var(--x-accent);cursor:pointer}
.sodc-consent.is-invalid{color:var(--x-neg)}

.sodc-error{display:flex;gap:.6em;align-items:flex-start;
  font-size:var(--text--sm,.875rem);line-height:1.45;color:var(--x-neg);
  background:color-mix(in oklab,var(--x-neg) 12%,transparent);
  border:1px solid color-mix(in oklab,var(--x-neg) 30%,transparent);
  border-radius:var(--radius--lg,8px);padding:.7em .9em}

.sodc-btn{position:relative;overflow:hidden;font:inherit;font-weight:600;
  font-size:var(--text--base,1rem);color:#fff;width:100%;border:0;cursor:pointer;
  display:inline-flex;justify-content:center;align-items:center;gap:.6em;
  padding:1em 1.5em;border-radius:var(--radius--full,9999px);
  background:var(--x-accent);
  box-shadow:0 12px 26px -14px color-mix(in oklab,var(--x-accent) 65%,transparent);
  transition:transform .2s,box-shadow .2s,background .2s,filter .2s}
.sodc-btn:hover{background:color-mix(in oklab,var(--x-accent) 88%,#fff)}
.sodc-btn::after{content:"";position:absolute;inset:0;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.16) 50%,transparent 60%);
  transform:translateX(-110%);transition:transform .7s ease}
.sodc-btn:hover{transform:translateY(-2px);
  box-shadow:0 18px 34px -14px color-mix(in oklab,var(--x-accent) 75%,transparent)}
.sodc-btn:hover::after{transform:translateX(110%)}
.sodc-btn:active{transform:translateY(0)}
.sodc-btn:disabled{cursor:default;transform:none;filter:saturate(.7) brightness(.92)}
.sodc-btn svg{flex:none}
.sodc-btn:hover .sodc-btn-ic{animation:sodc-wiggle .5s ease}
@keyframes sodc-wiggle{25%{transform:rotate(-12deg)}60%{transform:rotate(9deg)}}
.sodc-spin{width:1.05em;height:1.05em;flex:none;border-radius:50%;
  border:2px solid rgba(255,255,255,.35);border-top-color:#fff;
  animation:sodc-rot .7s linear infinite}
@keyframes sodc-rot{to{transform:rotate(360deg)}}

/* ── Arama ekranı (success) ────────────────────────────────── */
.sodc-call{display:grid;justify-items:center;text-align:center;
  gap:var(--spacing--3,.75rem);padding:var(--spacing--6,1.5rem) 0 var(--spacing--4,1rem);
  animation:sodc-in .5s cubic-bezier(.22,1,.36,1)}
@keyframes sodc-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.is-calling .sodc-agent{border:0;margin:0;padding:0;justify-content:center}
.is-calling .sodc-orb-wrap{width:96px;height:96px}
.is-calling .sodc-agent-txt{display:none}
.sodc-call-t{font-size:var(--text--2xl,1.5rem);font-weight:600;margin-top:var(--spacing--4,1rem)}
.sodc-call-num{font-variant-numeric:tabular-nums;letter-spacing:.04em;
  color:var(--x-muted);font-size:var(--text--base,1rem)}
.sodc-call-x{color:var(--x-muted);font-size:var(--text--sm,.875rem);
  line-height:1.55;max-width:24rem}
.sodc-call-dots{display:flex;gap:.5rem;margin-top:var(--spacing--3,.75rem)}
.sodc-call-dots i{width:.5rem;height:.5rem;border-radius:50%;background:var(--x-accent);
  animation:sodc-dot 1.2s ease-in-out infinite}
.sodc-call-dots i:nth-child(2){animation-delay:.2s}
.sodc-call-dots i:nth-child(3){animation-delay:.4s}
@keyframes sodc-dot{0%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:991px){
  .sodc-card{grid-template-columns:1fr;gap:var(--spacing--10,2.5rem);
    padding:var(--spacing--10,2.5rem) var(--spacing--6,1.5rem)}
  .sodc-copy{max-width:none}
  .sodc-h{font-size:var(--heading--h2,var(--text--4xl,2.25rem))}
  .sodc-steps{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .sodc-call-dots i,.sodc-ring,.sodc-spin{animation:none}
  .sodc-btn::after{display:none}
}
`;

const PhoneIcon = () => (
  <svg className="sodc-btn-ic" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3.6 1.8c.5-.5 1.3-.4 1.7.1l1.3 1.7c.3.5.3 1.1-.1 1.5l-.7.8c.6 1.3 1.7 2.4 3 3l.8-.7c.4-.4 1-.4 1.5-.1l1.7 1.3c.5.4.6 1.2.1 1.7l-.9.9c-.5.5-1.2.7-1.9.5-2-.6-3.9-1.7-5.4-3.2S2.2 6 1.6 4c-.2-.7 0-1.4.5-1.9l1.5-.3z"
      fill="currentColor"
    />
  </svg>
);

export function OutboundCallDemo({
  theme = "Deep",
  eyebrow = "Canlı Demo",
  heading = "Knovvu sizi arasın,",
  headingAccent = "kendiniz deneyimleyin",
  description = "Numaranızı bırakın; yapay zekâ destekli sesli asistanımız saniyeler içinde arasın, gerçek bir görüşmede dinleyin.",
  step1 = "Numaranı bırak",
  step2 = "Telefonun çalsın",
  step3 = "Knovvu ile konuş",
  agentName = "Knovvu Sesli Asistan",
  agentStatus = "Çevrimiçi",
  nameLabel = "Adınız",
  phoneLabel = "Cep telefonunuz",
  consentText = "Kişisel verilerimin demo araması için işlenmesine onay veriyorum.",
  buttonText = "Beni ara",
  sendingText = "Bağlanıyor…",
  successTitle = "Telefonunuz çalıyor",
  successText = "Knovvu sesli asistanı sizi arıyor — açtığınızda doğal bir sesle karşılaşacaksınız.",
  endpoint = "/demos/api/demos/outbound-call",
  lang = "TR",
  cooldownSeconds = 600,
}: OutboundCallDemoProps) {
  const [name, setName] = React.useState("");
  const [digits, setDigits] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<"name" | "phone" | "consent" | null>(null);
  const [shake, setShake] = React.useState(0);

  const orbCanvas = React.useRef<HTMLCanvasElement>(null);
  const gpuOk = useFluidOrb(orbCanvas, done);

  const t = MESSAGES[lang] || MESSAGES.TR;
  const msg = (code: string) => t[code] || t.generic;

  function fail(code: string, field: typeof invalid = null) {
    setInvalid(field);
    setError(msg(code));
    setShake((n) => n + 1);
  }
  function clearErr() {
    setInvalid(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || done) return;
    clearErr();

    const cleanName = name.trim();
    if (cleanName.length < 2) return fail("invalid_name", "name");
    if (!/^5\d{9}$/.test(digits)) return fail("invalid_phone", "phone");
    if (!consent) return fail("consent_required", "consent");
    const phone = "0" + digits;
    if (cooldownLeft(phone, cooldownSeconds * 1000) > 0) {
      return fail("rate_limited"); // kalıcı cooldown — istek hiç çıkmaz
    }

    setSending(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, phone, consent: true, lang, hp }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 200 && body?.ok) {
          recordSubmit(phone);
          setDone(true);
        } else {
          fail(body?.error || "generic");
        }
      })
      .catch(() => fail("network"))
      .finally(() => setSending(false));
  }

  return (
    <section className={"sodc" + (theme === "Soft" ? " is-soft" : "")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sodc-card">
        <div className="sodc-copy">
          <div className="sodc-eyebrow">{eyebrow}</div>
          <h2 className="sodc-h">
            {heading} <em>{headingAccent}</em>
          </h2>
          <p className="sodc-p">{description}</p>
          <ol className="sodc-steps">
            {[step1, step2, step3].filter(Boolean).map((s, i) => (
              <li key={i}>
                <b>{"0" + (i + 1)}</b>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className={"sodc-panel" + (done ? " is-calling" : "") + (shake ? " is-shake" : "")} key={shake}>
          <div className="sodc-agent">
            <div className="sodc-orb-wrap">
              {!gpuOk && <span className="sodc-orb-fallback" aria-hidden="true" />}
              <canvas ref={orbCanvas} className="sodc-orb" aria-hidden="true" hidden={!gpuOk} />
              <span className="sodc-ring" aria-hidden="true" />
              <span className="sodc-ring" aria-hidden="true" />
              <span className="sodc-ring" aria-hidden="true" />
            </div>
            <div className="sodc-agent-txt">
              <div className="sodc-agent-name">{agentName}</div>
              <div className="sodc-agent-st">{agentStatus}</div>
            </div>
          </div>

          {!done ? (
            <form className="sodc-form" onSubmit={submit} noValidate aria-busy={sending}>
              <div className={"sodc-field" + (name ? " has-value" : "") + (invalid === "name" ? " is-invalid" : "")}>
                <input
                  id="sodc-name"
                  className="sodc-input"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearErr(); }}
                />
                <label className="sodc-flabel" htmlFor="sodc-name">{nameLabel}</label>
              </div>

              <div className={"sodc-field sodc-field--phone" + (digits ? " has-value" : "") + (invalid === "phone" ? " is-invalid" : "")}>
                <span className="sodc-prefix" aria-hidden="true">+90</span>
                <input
                  id="sodc-phone"
                  className="sodc-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={formatPhone(digits)}
                  onChange={(e) => { setDigits(phoneDigits(e.target.value)); clearErr(); }}
                />
                <label className="sodc-flabel" htmlFor="sodc-phone">{phoneLabel}</label>
              </div>

              {/* honeypot — görünmez, botlar doldurur */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }}
                value={hp}
                onChange={(e) => setHp(e.target.value)}
              />

              <label className={"sodc-consent" + (invalid === "consent" ? " is-invalid" : "")}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => { setConsent(e.target.checked); clearErr(); }}
                />
                <span>{consentText}</span>
              </label>

              {error && (
                <div className="sodc-error" role="alert">
                  <span aria-hidden="true">⚠</span>
                  {error}
                </div>
              )}

              <button className="sodc-btn" type="submit" disabled={sending}>
                {sending ? <span className="sodc-spin" aria-hidden="true" /> : <PhoneIcon />}
                {sending ? sendingText : buttonText}
              </button>
            </form>
          ) : (
            <div className="sodc-call" role="status">
              <div className="sodc-call-t">{successTitle}</div>
              <div className="sodc-call-num">+90 {formatPhone(digits)}</div>
              <div className="sodc-call-dots" aria-hidden="true">
                <i /><i /><i />
              </div>
              <div className="sodc-call-x">{successText}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
