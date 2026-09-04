/**
 * OutboundCallDemo — "Sizi arayalım" canlı demo kartı.
 *
 * ElevenLabs "Voice" kartı estetiğinde tek, minimal bir kart: üstte sade
 * başlık, ORTADA DEV CANLI ORB (WebGL fluid) ve merkezinde beyaz telefon
 * butonu, sol altta kısa caption, sağ altta özellik çipleri. Bol beyaz
 * boşluk, hairline çizgiler, siyah pill CTA — süs yok.
 *
 * Akış üç sahne:
 *   idle    → referanstaki kart; telefon butonuna basılır
 *   form    → orb küçülür, altında minimal form belirir (pill input'lar,
 *             +90 çipli canlı biçimlenen numara, ince consent, siyah CTA)
 *   calling → orb büyür, çevresinde halkalar; "Aranıyor · asistan · numara"
 *
 * Davranış js/components/outbound-demo.js ile aynı sözleşmededir
 * (docs/outbound-demo-api.md): TR telefon normalizasyonu, KVKK onayı,
 * honeypot, JSON POST, sunucu hata kodları, localStorage'da kalıcı cooldown
 * (AYNI "sestek-od" anahtarı). Font sayfadan miras alınır; renk/ölçüler RC
 * token'larına köprülüdür (var(--token, fallback)). Theme: Soft (açık,
 * default — referans görünüm) | Deep (aynı düzenin koyu hali).
 * WebGL yoksa / reduced-motion'da orb statik gradient'e düşer.
 */
import * as React from "react";
import { createTurnstile } from "./turnstile";
import {
  CountryPicker, PHONE_CSS, readPhone, formatNational, type CountryCode,
} from "./PhoneField";
import { errorCode } from "./apiError";

type Lang = "TR" | "EN";
type Theme = "Deep" | "Soft";
type Stage = "idle" | "calling";

export interface OutboundCallDemoProps {
  theme?: Theme;
  heading?: string;
  description?: string;
  chip1?: string;
  chip2?: string;
  chip3?: string;
  agentName?: string;
  nameLabel?: string;
  phoneLabel?: string;
  consentText?: string;
  consentLinkText?: string;
  consentLinkUrl?: string;
  buttonText?: string;
  sendingText?: string;
  successTitle?: string;
  successText?: string;
  sideTitle?: string;
  sideIntro?: string;
  sideCaption?: string;
  endpoint?: string;
  lang?: Lang;
  phoneCountry?: string;
  phoneCountries?: string;
  phonePreferred?: string;
  turnstileSiteKey?: string;
  turnstileWidget?: "Visible" | "Invisible";
  cooldownSeconds?: number;
}

const MESSAGES: Record<Lang, Record<string, string>> = {
  TR: {
    invalid_name: "Lütfen adınızı girin.",
    invalid_phone: "Lütfen geçerli bir cep telefonu girin.",
    consent_required: "Devam etmek için onay kutusunu işaretleyin.",
    captcha_failed: "Güvenlik doğrulaması tamamlanamadı — lütfen tekrar deneyin.",
    country_label: "Ülke kodu",
    country_search: "Ülke ara",
    country_empty: "Eşleşen ülke yok",
    captcha_unavailable: "Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar deneyin, sorun sürerse bizimle iletişime geçin.",
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
    captcha_failed: "Security check could not be completed — please try again.",
    country_label: "Country code",
    country_search: "Search country",
    country_empty: "No matching country",
    captcha_unavailable: "The security check could not be completed. Please refresh and try again, and contact us if it keeps happening.",
    rate_limited: "You requested a call just now — please try again in a few minutes.",
    not_configured: "The demo is unavailable right now, please try again later.",
    upstream: "We couldn't start the call, please try again later.",
    network: "Connection failed — check your internet and try again.",
    generic: "Something went wrong, please try again.",
  },
};

/* ── Telefon ──────────────────────────────────────────────────────
 * Numara artık ülke seçicili: doğrulama ve biçimlendirme PhoneField
 * üzerinden libphonenumber verisiyle yapılıyor.
 *
 * Sunucuya GÖNDERİLEN biçim geçiş halinde: TR için sözleşmedeki
 * "05XXXXXXXXX" korunuyor (mevcut form kırılmasın), diğer ülkeler E.164
 * ("+44…") gidiyor. Sunucu E.164'ü kabul etmeye başlayınca TR de E.164'e
 * geçer ve bu ayrım kalkar. Bkz. docs/outbound-demo-api.md.
 */
function wireFormat(e164: string, country: CountryCode): string {
  if (country !== "TR") return e164;
  const d = e164.replace(/\D/g, "");          // 905314072845
  return "0" + d.slice(2);                    // 05314072845
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

/* ── Dev fluid orb — voice-orbs shader'ının renk-sentez dalı ─────
 * Referanstaki gibi yumuşak, bulutsu bir küre; idle'da çok yavaş akar,
 * calling'de hız + parlaklık artar. Tek draw-call. Reduced-motion/WebGL
 * yok → CSS gradient fallback. */
const ORB_FRAG = `precision mediump float;
uniform sampler2D n;uniform vec2 R;uniform float T,E;
uniform vec3 A,B,C;
float f(vec2 p){float v=0.,a=.5;p*=.05;
for(int i=0;i<4;i++){v+=a*texture2D(n,p).r;p=p*2.03+17.1;a*=.5;}return v;}
void main(){vec2 u=gl_FragCoord.xy/R;vec2 c=u-.5;float r=length(c)*2.;
float m=1.-smoothstep(.985,1.,r);float t=T;
vec2 q=vec2(f(u*1.7+vec2(t*.25,t*.16)),f(u*1.7+vec2(4.7,1.3)-vec2(t*.19,t*.28)));
vec3 col=mix(A,B,clamp((q.x-.34)*3.2,0.,1.));
col=mix(col,C,clamp((q.y-.36)*2.6,0.,1.));
vec2 h=c-vec2(-.13,.13);col+=vec3(.07)*exp(-dot(h,h)*7.);
col*=1.-.10*smoothstep(.6,1.,r);col+=E*.10;
float g=texture2D(n,gl_FragCoord.xy/64.+fract(vec2(t*3.1,t*5.7))).r;
col+=(g-.5)*.05;gl_FragColor=vec4(col,m);}`;

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

    const side = Math.round(420 * Math.min(window.devicePixelRatio || 1, 1.5));
    canvas.width = side;
    canvas.height = side;
    gl.viewport(0, 0, side, side);
    gl.uniform2f(gl.getUniformLocation(prog, "R"), side, side);
    // Sestek pastelleri — referansın mavi/yeşil bulutsusunun marka karşılığı
    gl.uniform3f(gl.getUniformLocation(prog, "A"), 0.72, 0.66, 1.0);   // viyole
    gl.uniform3f(gl.getUniformLocation(prog, "B"), 0.55, 0.84, 0.95);  // cyan
    gl.uniform3f(gl.getUniformLocation(prog, "C"), 1.0, 0.78, 0.88);   // pembe
    const uT = gl.getUniformLocation(prog, "T");
    const uE = gl.getUniformLocation(prog, "E");

    let raf = 0, phase = Math.random() * 20, energy = 0,
      last = performance.now(), dead = false;
    const tick = () => {
      if (dead) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = callingRef.current ? 0.7 : 0.1;
      energy += (target - energy) * 0.05;
      phase += dt * (0.3 + energy * 1.1);
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
.sodc{--x-bg:#fdfcfb;--x-card:#ffffff;--x-line:rgba(20,18,30,.08);
  --x-text:var(--color-text--base,#17151f);--x-muted:var(--color-text--muted,#8b8894);
  --x-field:#ffffff;--x-field-line:rgba(20,18,30,.12);
  --x-ink:#17151f;--x-ink-hover:#2a2736;
  --x-accent:var(--brand-primary--500,#6f5fe6);--x-neg:#c9463a;
  max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--6,1.5rem);color:var(--x-text);font:inherit}
.sodc.is-deep{--x-bg:#141221;--x-card:#191627;--x-line:rgba(255,255,255,.09);
  --x-text:#f4f2fb;--x-muted:#a09aba;--x-field:#211d33;
  --x-field-line:rgba(255,255,255,.13);--x-ink:#f4f2fb;--x-ink-hover:#ffffff;
  --x-neg:#ff8274}
.sodc.is-deep .sodc-cta{color:#17151f}
.sodc *{box-sizing:border-box}

/* ── İkili düzen: solda arama kartı, sağda metin kartı ─────── */
.sodc-grid{display:grid;grid-template-columns:1.55fr 1fr;
  gap:var(--spacing--5,1.25rem);align-items:stretch}

.sodc-card{position:relative;display:flex;flex-direction:column;
  min-height:34rem;border-radius:var(--radius--3xl,24px);
  background:var(--x-card);
  box-shadow:inset 0 0 0 1px var(--x-line);
  padding:var(--spacing--10,2.5rem) var(--spacing--10,2.5rem) var(--spacing--8,2rem)}

.sodc-t{margin:0;font-size:var(--text--3xl,1.875rem);font-weight:500;
  letter-spacing:-.01em}

/* ── Orta: orb sahnesi ─────────────────────────────────────── */
.sodc-mid{flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:var(--spacing--6,1.5rem);
  padding:var(--spacing--6,1.5rem) 0}
.sodc-orbwrap{position:relative;width:24rem;max-width:70vw;aspect-ratio:1;
  transition:width .6s cubic-bezier(.22,1,.36,1)}
.sodc-mid.st-calling .sodc-orbwrap{width:22rem}
.sodc-orb,.sodc-orb-fb{position:absolute;inset:0;width:100%;height:100%;
  border-radius:50%;display:block}
.sodc-orb-fb{background:radial-gradient(circle at 34% 30%,#cfc5ff,#8fd6ea 55%,#b7a8f5 95%)}
/* halkalar — yalnız calling */
.sodc-ringx{position:absolute;inset:0;border-radius:50%;pointer-events:none;
  border:1px solid var(--x-line);opacity:0;transform:scale(1)}
.st-calling .sodc-ringx{animation:sodc-ringx 2.4s cubic-bezier(.2,.6,.35,1) infinite}
.st-calling .sodc-ringx:nth-child(2){animation-delay:.8s}
.st-calling .sodc-ringx:nth-child(3){animation-delay:1.6s}
@keyframes sodc-ringx{0%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.45)}}

/* merkez telefon butonu (idle) */
.sodc-callbtn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:4.25rem;height:4.25rem;border-radius:50%;border:0;cursor:pointer;
  background:#fff;color:#17151f;display:grid;place-items:center;
  box-shadow:0 4px 18px rgba(20,18,30,.14),0 0 0 1px rgba(20,18,30,.05);
  transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}
.sodc-callbtn:hover{transform:translate(-50%,-50%) scale(1.07);
  box-shadow:0 8px 26px rgba(20,18,30,.18),0 0 0 1px rgba(20,18,30,.05)}
.sodc-callbtn:active{transform:translate(-50%,-50%) scale(1)}
.sodc-callbtn svg{width:1.35rem;height:1.35rem}

/* calling metinleri */
.sodc-callmeta{text-align:center;padding:var(--spacing--8,2rem) 0;
  animation:sodc-in .5s cubic-bezier(.22,1,.36,1)}
.sodc-callnote{margin:var(--spacing--5,1.25rem) auto 0;max-width:18rem;
  font-size:var(--text--sm,.875rem);line-height:1.55;color:var(--x-muted)}
.sodc-callmeta b{display:block;font-weight:500;font-size:var(--text--lg,1.125rem)}
.sodc-callmeta span{display:block;margin-top:.25em;color:var(--x-muted);
  font-size:var(--text--sm,.875rem);font-variant-numeric:tabular-nums;letter-spacing:.03em}
.sodc-dots{display:flex;justify-content:center;gap:.4rem;margin-top:.9rem}
.sodc-dots i{width:.4rem;height:.4rem;border-radius:50%;background:var(--x-muted);
  animation:sodc-dot 1.2s ease-in-out infinite}
.sodc-dots i:nth-child(2){animation-delay:.2s}
.sodc-dots i:nth-child(3){animation-delay:.4s}
@keyframes sodc-dot{0%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}

/* ── Form (stage: form) ────────────────────────────────────── */
.sodc-form{width:100%;display:grid;gap:var(--spacing--2-5,.625rem);
  align-content:start}
.sodc-intro{margin:0 0 var(--spacing--1-5,.375rem);font-size:var(--text--sm,.875rem);
  line-height:1.5;color:var(--x-muted)}
@keyframes sodc-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sodc-field{position:relative}
.sodc-input{width:100%;font:inherit;font-size:var(--text--base,1rem);color:var(--x-text);
  background:var(--x-field);border:1px solid var(--x-field-line);
  border-radius:var(--radius--full,9999px);outline:none;
  padding:.78em 1.25em;transition:border-color .2s,box-shadow .2s}
.sodc-input::placeholder{color:var(--x-muted)}
.sodc-input:focus{border-color:var(--x-text);
  box-shadow:0 0 0 3px rgba(20,18,30,.07)}
.sodc-field.is-invalid .sodc-input{border-color:var(--x-neg);
  box-shadow:0 0 0 3px color-mix(in oklab,var(--x-neg) 14%,transparent)}
.sodc-field--phone{display:flex;align-items:center}
.sodc-field--phone .sodc-input{padding-left:.5em;border-top-left-radius:0;
  border-bottom-left-radius:0;border-left:0}
.sodc-prefix{display:flex;align-items:center;align-self:stretch;
  padding:0 .15em 0 .5em;font-size:var(--text--sm,.875rem);font-weight:500;
  color:var(--x-text);background:var(--x-field);
  border:1px solid var(--x-field-line);border-right:0;
  border-radius:var(--radius--full,9999px) 0 0 var(--radius--full,9999px)}
.sodc-field--phone:focus-within .sodc-prefix,
.sodc-field--phone:focus-within .sodc-input{border-color:var(--x-text)}
.sodc-field--phone.is-invalid .sodc-prefix{border-color:var(--x-neg)}
.sodc-prefix .spf-panel{--spf-bg:var(--x-card,#fff);--spf-fg:var(--x-text,#101014)}
.sodc-consent{display:flex;gap:.55em;align-items:flex-start;cursor:pointer;
  padding:.15em .4em;font-size:var(--text--xs,.75rem);line-height:1.45;color:var(--x-muted)}
.sodc-consent input{flex:none;width:1.05em;height:1.05em;margin-top:.2em;
  accent-color:var(--x-ink);cursor:pointer}
.sodc-consent.is-invalid{color:var(--x-neg)}
.sodc-consent a{color:inherit;text-decoration:underline;text-underline-offset:2px}
.sodc-consent a:hover{color:var(--x-text)}
.sodc-err{padding:0 .5em;font-size:var(--text--xs,.75rem);line-height:1.5;color:var(--x-neg)}
.sodc-cta{font:inherit;font-size:var(--text--base,1rem);font-weight:500;color:#fff;
  width:100%;border:0;cursor:pointer;
  display:inline-flex;justify-content:center;align-items:center;gap:.55em;
  padding:.82em 1.5em;border-radius:var(--radius--full,9999px);
  background:var(--x-ink);transition:background .2s,transform .2s}
.sodc-cta:hover{background:var(--x-ink-hover);transform:translateY(-1px)}
.sodc-cta:active{transform:none}
.sodc-cta:disabled{cursor:default;opacity:.7;transform:none}
.sodc-spin{width:1em;height:1em;flex:none;border-radius:50%;
  border:2px solid rgba(255,255,255,.35);border-top-color:#fff;
  animation:sodc-rot .7s linear infinite}
.sodc.is-deep .sodc-spin{border-color:rgba(20,18,30,.3);border-top-color:#17151f}
@keyframes sodc-rot{to{transform:rotate(360deg)}}

/* ── Alt satır: caption + çipler ───────────────────────────── */
.sodc-foot{display:flex;justify-content:space-between;align-items:flex-end;
  gap:var(--spacing--6,1.5rem)}
.sodc-cap{max-width:15rem;font-size:var(--text--sm,.875rem);line-height:1.5;
  color:var(--x-muted)}
.sodc-chips{display:flex;gap:var(--spacing--4,1rem) var(--spacing--5,1.25rem);
  flex-wrap:wrap;justify-content:flex-end}
.sodc-chips span{display:inline-flex;align-items:center;gap:.45em;
  font-size:var(--text--xs,.75rem);font-weight:500;letter-spacing:.01em;
  color:var(--x-muted)}
.sodc-chips svg{width:1.1em;height:1.1em;color:var(--x-muted)}

/* ── Sağ: metin kartı ──────────────────────────────────────── */
.sodc-side{display:flex;flex-direction:column;
  border-radius:var(--radius--3xl,24px);
  background:color-mix(in oklab,var(--x-text) 4%,var(--x-card));
  box-shadow:inset 0 0 0 1px var(--x-line);
  padding:var(--spacing--8,2rem) var(--spacing--7,1.75rem) var(--spacing--7,1.75rem)}
.sodc.is-deep .sodc-side{background:color-mix(in oklab,#000 22%,var(--x-card))}
.sodc-side .sodc-t{margin-bottom:var(--spacing--5,1.25rem)}
.sodc-side-cap{margin-top:auto;padding-top:var(--spacing--5,1.25rem);
  font-size:var(--text--xs,.75rem);line-height:1.5;color:var(--x-muted);
  opacity:.85;max-width:17rem}

/* ── Responsive / reduced motion ───────────────────────────── */
@media (max-width:991px){
  .sodc-grid{grid-template-columns:1fr}
  .sodc-side{min-height:0}
}
@media (max-width:767px){
  .sodc-card{min-height:30rem;
    padding:var(--spacing--7,1.75rem) var(--spacing--5,1.25rem)}
  .sodc-orbwrap{width:17rem}
  .sodc-mid.st-calling .sodc-orbwrap{width:13rem}
  .sodc-foot{flex-direction:column;align-items:flex-start}
  .sodc-chips{justify-content:flex-start}
}
@media (prefers-reduced-motion:reduce){
  .sodc-dots i,.st-calling .sodc-ringx,.sodc-spin{animation:none}
  .sodc-orbwrap{transition:none}
}
` + PHONE_CSS + `
.sodc-ts{margin-top:var(--spacing--3,.75rem)}
.sodc-ts:empty{display:none;margin:0}
`;

const PhoneIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3.6 1.8c.5-.5 1.3-.4 1.7.1l1.3 1.7c.3.5.3 1.1-.1 1.5l-.7.8c.6 1.3 1.7 2.4 3 3l.8-.7c.4-.4 1-.4 1.5-.1l1.7 1.3c.5.4.6 1.2.1 1.7l-.9.9c-.5.5-1.2.7-1.9.5-2-.6-3.9-1.7-5.4-3.2S2.2 6 1.6 4c-.2-.7 0-1.4.5-1.9l1.5-.3z"
      fill="currentColor"
    />
  </svg>
);
const WaveIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 6.5v3M5 4.5v7M8 2.5v11M11 4.5v7M14 6.5v3" fill="none"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const BoltIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8.8 1.5 3.5 9h3.2l-.7 5.5L11.5 7H8.3l.5-5.5z" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);
const CHIP_ICONS = [PhoneIcon, WaveIcon, BoltIcon];

export function OutboundCallDemo({
  theme = "Soft",
  heading = "Let Us Call You",
  description = "Leave your number and Knovvu's voice agent will call you within seconds — hear it in a real conversation.",
  chip1 = "Real phone call",
  chip2 = "Natural voice",
  chip3 = "Within seconds",
  agentName = "Knovvu Voice Agent",
  nameLabel = "Your name",
  phoneLabel = "5XX XXX XX XX",
  consentText = "I consent to my personal data being processed for this demo call.",
  consentLinkText = "Privacy Policy",
  consentLinkUrl = "",
  buttonText = "Call me",
  sendingText = "Connecting…",
  successTitle = "Calling",
  successText = "Your phone will ring in a moment — pick up and meet Knovvu's natural voice.",
  sideTitle = "Try it now",
  sideIntro = "Just your name and number — we don't ask for anything else.",
  sideCaption = "Your number is used only for this demo call and never stored.",
  endpoint = "/demos/api/demos/outbound-call",
  lang = "EN",
  phoneCountry = "TR",
  phoneCountries = "",
  phonePreferred = "TR,GB,US,DE,FR,NL",
  turnstileSiteKey = "",
  turnstileWidget = "Visible",
  cooldownSeconds = 600,
}: OutboundCallDemoProps) {
  /* Turnstile — site key boşsa hiçbir şey olmaz (script bile yüklenmez). */
  const ts = createTurnstile(React, turnstileSiteKey, turnstileWidget !== "Invisible");

  const [stage, setStage] = React.useState<Stage>("idle");
  const [name, setName] = React.useState("");
  const [digits, setDigits] = React.useState("");
  const [country, setCountry] = React.useState<CountryCode>(
    (phoneCountry || "TR").toUpperCase() as CountryCode
  );
  const phoneInfo = readPhone(digits, country);
  const [consent, setConsent] = React.useState(false);
  const [hp, setHp] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [invalid, setInvalid] = React.useState<"name" | "phone" | "consent" | null>(null);

  const orbCanvas = React.useRef<HTMLCanvasElement>(null);
  const gpuOk = useFluidOrb(orbCanvas, stage === "calling");

  const t = MESSAGES[lang] || MESSAGES.TR;
  const msg = (code: string) => t[code] || t.generic;

  function fail(code: string, field: typeof invalid = null) {
    setInvalid(field);
    setError(msg(code));
  }
  function clearErr() {
    setInvalid(null);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    clearErr();

    const cleanName = name.trim();
    if (cleanName.length < 2) return fail("invalid_name", "name");
    if (!phoneInfo.valid) return fail("invalid_phone", "phone");
    if (!consent) return fail("consent_required", "consent");
    const phone = wireFormat(phoneInfo.e164, country);
    if (cooldownLeft(phone, cooldownSeconds * 1000) > 0) {
      return fail("rate_limited"); // kalıcı cooldown — istek hiç çıkmaz
    }

    setSending(true);
    /* Turnstile jetonu istekle birlikte gider; anahtar yoksa "" olur ve
     * akış hiç değişmez. Doğrulama sunucuda yapılır. */
    ts.getToken()
      .then((turnstileToken) =>
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: cleanName, phone, consent: true, lang, hp, turnstileToken,
          }),
        })
      )
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 200 && body?.ok) {
          recordSubmit(phone);
          setStage("calling");
        } else {
          fail(errorCode(body));
        }
      })
      .catch(() => fail("network"))
      .finally(() => {
        setSending(false);
        ts.reset(); // jetonlar tek kullanımlık
      });
  }

  const chips = [chip1, chip2, chip3].filter(Boolean);
  const nameRef = React.useRef<HTMLInputElement>(null);

  /* Soldaki telefon butonu sağdaki açık forma odaklar */
  function focusForm() {
    nameRef.current?.focus();
    nameRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <section className={"sodc" + (theme === "Deep" ? " is-deep" : "")}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sodc-grid">
      <div className="sodc-card">
        <h3 className="sodc-t">{heading}</h3>

        <div className={"sodc-mid st-" + stage}>
          <div className="sodc-orbwrap">
            <span className="sodc-ringx" aria-hidden="true" />
            <span className="sodc-ringx" aria-hidden="true" />
            <span className="sodc-ringx" aria-hidden="true" />
            {!gpuOk && <span className="sodc-orb-fb" aria-hidden="true" />}
            <canvas ref={orbCanvas} className="sodc-orb" aria-hidden="true" hidden={!gpuOk} />
            {stage === "idle" && (
              <button
                type="button"
                className="sodc-callbtn"
                aria-label={buttonText}
                onClick={focusForm}
              >
                <PhoneIcon />
              </button>
            )}
          </div>
        </div>

        <div className="sodc-foot">
          <div className="sodc-cap">{description}</div>
          {chips.length > 0 && (
            <div className="sodc-chips">
              {chips.map((c, i) => {
                const Icon = CHIP_ICONS[i] || PhoneIcon;
                return (
                  <span key={i}>
                    <Icon />
                    {c}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <aside className="sodc-side">
        {sideTitle && <h3 className="sodc-t">{sideTitle}</h3>}
        {stage !== "calling" ? (
          <form className="sodc-form" onSubmit={submit} noValidate aria-busy={sending}>
            {sideIntro && <p className="sodc-intro">{sideIntro}</p>}
            <div className={"sodc-field" + (invalid === "name" ? " is-invalid" : "")}>
              <input
                ref={nameRef}
                className="sodc-input"
                type="text"
                autoComplete="name"
                placeholder={nameLabel}
                aria-label={nameLabel}
                value={name}
                onChange={(e) => { setName(e.target.value); clearErr(); }}
              />
            </div>
            <div className={"sodc-field sodc-field--phone" + (invalid === "phone" ? " is-invalid" : "")}>
              <span className="sodc-prefix">
                <CountryPicker
                  country={country}
                  onChange={(c) => { setCountry(c); clearErr(); }}
                  allowed={phoneCountries}
                  preferred={phonePreferred}
                  locale={lang === "TR" ? "tr" : "en"}
                  searchLabel={t.country_search}
                  emptyLabel={t.country_empty}
                  ariaLabel={t.country_label}
                />
              </span>
              <input
                className="sodc-input"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={phoneLabel}
                aria-label={phoneLabel}
                value={phoneInfo.national}
                onChange={(e) => { setDigits(e.target.value); clearErr(); }}
              />
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
              <span>
                {consentText}
                {consentLinkText && consentLinkUrl && (
                  <>
                    {" "}
                    <a
                      href={consentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {consentLinkText}
                    </a>
                  </>
                )}
              </span>
            </label>
            {error && <div className="sodc-err" role="alert">{error}</div>}
            {/* Turnstile — appearance interaction-only, yalnız meydan okuma
                gerektiğinde görünür; aksi halde yer kaplamaz. */}
            {ts.enabled && <div className="sodc-ts" ref={ts.slotRef} />}
            {ts.failed && <div className="sodc-err" role="alert">{t.captcha_unavailable}</div>}
            <button className="sodc-cta" type="submit" disabled={sending}>
              {sending ? <span className="sodc-spin" aria-hidden="true" /> : <PhoneIcon size={15} />}
              {sending ? sendingText : buttonText}
            </button>
          </form>
        ) : (
          <div className="sodc-callmeta" role="status">
            <b>{successTitle} · {agentName}</b>
            <span>{phoneInfo.e164 || formatNational(digits, country)}</span>
            <div className="sodc-dots" aria-hidden="true">
              <i /><i /><i />
            </div>
            <p className="sodc-callnote">{successText}</p>
          </div>
        )}
        {sideCaption && <div className="sodc-side-cap">{sideCaption}</div>}
      </aside>
      </div>
    </section>
  );
}
