/*!
 * DemoEmbed — shared body of the TTS Demo and STT Demo Code Components: a
 * Sestek demo iframe with the two approved sizings from the Webflow embeds
 * (preset "tts": tts-cloning-demo.sestek.com 960×649 / 593×728; preset
 * "stt": sr-demo-performance.sestek.com 600×600).
 *
 *  • "Side by side"  (/demos overview, article#tts): text column on the left
 *    (eyebrow, title, description, two links), the demo panel on the right.
 *    Big screens: 593px panel, iframe 728px tall, no zoom. Short desktop
 *    (viewport ≤ 700px tall): logical 760×728 at zoom .647859 (≈ 492×472),
 *    centred. Phones (≤ 767px): stacked, iframe full width, 840px tall.
 *
 *  • "Full width"  (/demos/tts detail page): iframe only, centred. Base
 *    960×649; scale = min(1, (available − 2) / 960, .7147 · innerHeight / 554
 *    · 1.01). Phones: full width, 840px tall, no zoom.
 *
 * The iframe keeps its LOGICAL size and is scaled with CSS `zoom` (exactly
 * like the approved embeds — the app inside re-flows for the logical width,
 * a transform would only shrink pixels). Sizes are recomputed on resize and
 * on the host's ResizeObserver; the iframe src is only set once the block
 * comes near the viewport.
 */

import * as React from "react";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type LinkValue = { href?: string; target?: string } | string | null | undefined;

export type DemoPreset = {
  src: string; allow: string; title: string;
  base: { w: number; h: number };
  side: { panelW: number; iframeH: number; lapW: number; lapH: number; lapZoom: number; shortMax: number };
  full: { lapVH: number; lapScale: number; adjust: number };
  /** "fixed" = phones use mobileHeight; "square" = phones scale the logical width to fit (height follows) */
  mobile: "fixed" | "square";
};
export const PRESETS: Record<string, DemoPreset> = {
  tts: {
    src: "https://tts-cloning-demo.sestek.com:12443/Demo.aspx?lang={lang}&embed=1", allow: "microphone", title: "Text-to-Speech and Voice Cloning demo",
    base: { w: 960, h: 649 },
    side: { panelW: 593, iframeH: 728, lapW: 760, lapH: 728, lapZoom: 0.647859, shortMax: 700 },
    full: { lapVH: 554, lapScale: 0.7147, adjust: 1.01 },
    mobile: "fixed",
  },
  stt: {
    src: "https://sr-demo-performance.sestek.com/index.html?lang={lang}&embed&env=demo", allow: "camera;microphone", title: "Speech Recognition demo",
    base: { w: 600, h: 600 },
    side: { panelW: 600, iframeH: 600, lapW: 600, lapH: 600, lapZoom: 0.78, shortMax: 700 },
    full: { lapVH: 554, lapScale: 0.85, adjust: 1 },
    mobile: "square",
  },
};

export interface TtsDemoProps {
  /** "tts" | "stt" */
  preset?: string;
  /** "Side by side" | "Full width" */
  layout?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  link1Label?: string;
  link1Url?: string;
  link1NewTab?: boolean;
  link2Label?: string;
  link2Url?: string;
  link2NewTab?: boolean;
  /** "Dark" | "White" | "Brand secondary" | "Brand primary" — site stagger button styles */
  link1Style?: string;
  link2Style?: string;
  /** demo URL; {lang} is replaced by the resolved language */
  iframeSrc?: string;
  /** "Auto" | "en-US" | "tr-TR" */
  lang?: string;
  /** "Left" | "Right" — text column side (Side by side) */
  textSide?: string;
  /** phones: iframe height in px */
  mobileHeight?: number;
  /** Full width: bottom margin in px */
  bottomMargin?: number;
  /** panel border + radius on the frame */
  framed?: boolean;
}

const MOBILE_BP = 767;

const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.tts{
  --tts-font:var(--font--primary,var(--font--body,inherit));
  --tts-ink:var(--color-text--base,#111);
  --tts-muted:var(--color-text--muted,#55555e);
  --tts-accent:var(--brand-primary--500,#EC008C);
  --tts-line:var(--border--color-border-muted,var(--neutral--200,#e6e6e9));
  --tts-radius:var(--radius--lg,1rem);
  position:relative;width:100%;font-family:var(--tts-font);color:var(--tts-ink)}
.tts_grid{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:clamp(2rem,5vw,4.5rem)}
.tts[data-side="right"] .tts_grid{grid-template-columns:auto minmax(0,1fr)}
.tts[data-side="right"] .tts_text{order:2}
.tts_text{display:flex;flex-direction:column;gap:1rem;min-width:0;max-width:34rem}
.tts_eyebrow{margin:0;font-size:.8125rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--tts-accent)}
.tts_title{margin:0;font-size:var(--heading--h3,clamp(1.625rem,2.6vw,2.25rem));line-height:var(--leading--tight,1.15);font-weight:var(--font-weight--semibold,600);text-wrap:balance}
.tts_desc{margin:0;font-size:var(--text--lg,1.0625rem);line-height:var(--leading--relaxed,1.6);color:var(--tts-muted)}
/* CTA — the site's stagger buttons (btn-stagger: pill, characters roll up on hover) */
.tts_links{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem;margin-top:.75rem}
.tts_btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.25rem .8rem;border-radius:999px;text-decoration:none;font-size:var(--text--sm,.875rem);font-weight:500;line-height:1.2;
  background:var(--surface--accent,#111);color:var(--color-text--inverted,#fff);transition:transform .35s cubic-bezier(.65,0,.35,1),box-shadow .35s ease;-webkit-tap-highlight-color:transparent}
.tts_btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -14px rgb(15 23 42/.5)}
.tts_btn:focus-visible{outline:2px solid var(--tts-accent);outline-offset:3px}
.tts_btn[data-style="white"]{background:var(--surface--light,#f3f4f6);color:var(--color-text--base,#111)}
.tts_btn[data-style="brand-secondary"]{background:var(--brand-secondary--500,#3d6bb3);color:#fff}
.tts_btn[data-style="brand-primary"]{background:var(--brand-primary--500,#EC008C);color:#fff}
.tts_stg{position:relative;display:inline-block;overflow:hidden;line-height:1.2}
.tts_stg-t{display:inline-block;white-space:nowrap}
.tts_stg-t--clone{position:absolute;top:0;left:0;width:100%;pointer-events:none}
.tts_stg-c{display:inline-block;transition:transform .5s cubic-bezier(.65,0,.35,1),opacity .5s cubic-bezier(.65,0,.35,1);transition-delay:calc(var(--i) * .03s)}
.tts_stg-t--clone .tts_stg-c{transform:translateY(100%);opacity:0}
.tts_btn:hover .tts_stg-t--orig .tts_stg-c{transform:translateY(-100%);opacity:0}
.tts_btn:hover .tts_stg-t--clone .tts_stg-c{transform:translateY(0);opacity:1}
@media (prefers-reduced-motion:reduce){.tts_stg-c{transition:none}.tts_btn:hover .tts_stg-t--orig .tts_stg-c{transform:none;opacity:1}.tts_stg-t--clone{display:none}}
/* BOXES ARE PURE CSS (first paint = final size, no layout shift); JS only sets the iframe's zoom.
   Side by side: --dm-side-w × --dm-side-h; short desktop (≤700px tall): the approved laptop box;
   Full width: base width capped by the container and by the viewport height (the approved
   height-scale rule expressed as vh), aspect-ratio keeps the height; phones: fixed height or square. */
.tts_panel{position:relative;box-sizing:border-box;padding:0;margin:0 auto;max-width:100%;width:var(--dm-side-w)}
.tts_frame{position:relative;overflow:hidden;width:100%;max-width:none;background:#fff;height:var(--dm-side-h)}
@media (min-width:768px) and (max-height:700px){.tts[data-layout="side"] .tts_panel{width:var(--dm-lap-w)}.tts[data-layout="side"] .tts_frame{height:var(--dm-lap-h)}}
.tts[data-layout="full"] .tts_panel{width:100%;margin-bottom:var(--dm-bottom)}
.tts[data-layout="full"] .tts_frame{width:min(var(--dm-bw),calc(100% - 2px),var(--dm-full-vh));height:auto;aspect-ratio:var(--dm-ratio);margin:0 auto}
.tts[data-framed="on"] .tts_frame{border:1px solid var(--tts-line);border-radius:var(--tts-radius)}
.tts_frame iframe{display:block;border:0;max-width:none;width:100%;height:100%}
.tts_ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--tts-muted);font-size:.875rem;background:linear-gradient(135deg,#fafafc,#f1f1f5)}
.tts_ph i{width:22px;height:22px;border-radius:50%;border:2px solid var(--tts-line);border-top-color:var(--tts-accent);animation:tts-spin .9s linear infinite}
@keyframes tts-spin{to{transform:rotate(360deg)}}
@media (max-width:767px){
  .tts_grid,.tts[data-side="right"] .tts_grid{grid-template-columns:minmax(0,1fr);gap:1.75rem}
  .tts[data-side="right"] .tts_text{order:0}
  .tts_text{max-width:none}
  .tts_panel,.tts[data-layout="full"] .tts_panel{width:100%;max-width:100%}
  .tts[data-mobile="fixed"] .tts_frame{width:100%;height:var(--dm-mh);aspect-ratio:auto}
  .tts[data-mobile="square"] .tts_frame{width:100%;height:auto;aspect-ratio:var(--dm-ratio)}
}
@media (prefers-reduced-motion:reduce){.tts_ph i{animation:none}}
`;

function linkHref(v: LinkValue): string { if (!v) return ""; return typeof v === "string" ? v : v.href || ""; }
function btnStyle(v: string | undefined, fallback: string): string {
  const s = (v || fallback).toLowerCase();
  if (s.startsWith("white")) return "white";
  if (s.startsWith("brand s")) return "brand-secondary";
  if (s.startsWith("brand p")) return "brand-primary";
  return "dark";
}
/* label split into characters + a clone, for the hover stagger (stagger-button.js port) */
function StaggerLabel({ text }: { text: string }) {
  const chars = Array.from(text);
  const row = (cls: string) => (
    <span className={"tts_stg-t " + cls} aria-hidden="true">
      {chars.map((ch, i) => <span key={i} className="tts_stg-c" style={{ "--i": i } as React.CSSProperties}>{ch === " " ? "\u00A0" : ch}</span>)}
    </span>
  );
  return <span className="tts_stg">{row("tts_stg-t--orig")}{row("tts_stg-t--clone")}</span>;
}

export function DemoEmbed(p: TtsDemoProps) {
  const P = PRESETS[(p.preset || "tts").toLowerCase()] || PRESETS.tts;
  const SIDE = P.side, FULL = P.full, BASE = P.base;
  const full = (p.layout || "Side by side").toLowerCase().startsWith("full");
  const side = (p.textSide || "Left").toLowerCase().startsWith("right") ? "right" : "left";
  const mobileH = Math.max(300, p.mobileHeight || 840);
  const bottom = p.bottomMargin == null ? 80 : Math.max(0, p.bottomMargin);
  const framed = p.framed !== false;

  const root = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [ifStyle, setIfStyleState] = React.useState<React.CSSProperties>({});
  const ifKey = React.useRef("");
  const setIfStyle = React.useCallback((v: React.CSSProperties) => { const k = JSON.stringify(v); if (k !== ifKey.current) { ifKey.current = k; setIfStyleState(v); } }, []);
  const [near, setNear] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [lang, setLang] = React.useState("en-US");

  /* language: prop or page locale (/tr, <html lang>); tts wants en-US / tr-TR, stt wants en / tr */
  const shortLang = P === PRESETS.stt;
  React.useEffect(() => {
    const l = (p.lang || "Auto").trim();
    if (l && !/^auto$/i.test(l)) { setLang(shortLang ? l.slice(0, 2) : l); return; }
    const tr = /^\/tr(\/|$)/.test(location.pathname) || (document.documentElement.lang || "").toLowerCase().startsWith("tr");
    setLang(tr ? (shortLang ? "tr" : "tr-TR") : (shortLang ? "en" : "en-US"));
  }, [p.lang, shortLang]);

  /* iframe zoom — the box is CSS; the app keeps its LOGICAL size and is scaled to the box width
     (port of the two approved embed scripts, minus the box maths). Layout effect + ResizeObserver
     on the frame: correct before first paint, never changes the box. */
  useIsoLayoutEffect(() => {
    const f = frameRef.current; if (!f) return;
    const compute = () => {
      const w = f.clientWidth; if (!w) return;
      const mobile = window.innerWidth <= MOBILE_BP;
      if (mobile) {
        if (P.mobile === "square") setIfStyle({ width: BASE.w + "px", height: BASE.h + "px", zoom: String(Math.max(0.2, Math.min(1, w / BASE.w))) } as React.CSSProperties);
        else setIfStyle({ width: "100%", height: "100%", zoom: "1" } as React.CSSProperties);
        return;
      }
      if (full) { setIfStyle({ width: BASE.w + "px", height: BASE.h + "px", zoom: String(Math.max(0.2, Math.min(1, w / BASE.w))) } as React.CSSProperties); return; }
      if (window.innerHeight <= SIDE.shortMax) { setIfStyle({ width: SIDE.lapW + "px", height: SIDE.lapH + "px", zoom: String(SIDE.lapZoom) } as React.CSSProperties); return; }
      setIfStyle({ width: "100%", height: "100%", zoom: "1" } as React.CSSProperties);
    };
    compute();
    let t = 0;
    const onResize = () => { clearTimeout(t); t = window.setTimeout(compute, 80); };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize); ro.observe(f);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); ro.disconnect(); };
  }, [full, P, BASE, SIDE, setIfStyle]);

  /* src only near the viewport (the demo app is heavy) */
  React.useEffect(() => {
    const el = root.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "60% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = (p.iframeSrc || P.src).replace("{lang}", encodeURIComponent(lang));
  const l1 = linkHref(p.link1Url) || "#";
  const l2 = linkHref(p.link2Url) || "#";
  const ext1 = p.link1NewTab ? { target: "_blank", rel: "noopener" } : {};
  const ext2 = p.link2NewTab !== false ? { target: "_blank", rel: "noopener" } : {};

  const vars = {
    "--dm-side-w": SIDE.panelW + "px", "--dm-side-h": SIDE.iframeH + "px",
    "--dm-lap-w": SIDE.lapW * SIDE.lapZoom + "px", "--dm-lap-h": SIDE.lapH * SIDE.lapZoom + "px",
    "--dm-bw": BASE.w + "px", "--dm-ratio": BASE.w + " / " + BASE.h,
    // approved height rule: frame = base · lapScale · adjust · (innerHeight / lapVH)  →  expressed in vh
    "--dm-full-vh": (FULL.lapScale * FULL.adjust / FULL.lapVH * BASE.w * 100).toFixed(2) + "vh",
    "--dm-mh": mobileH + "px", "--dm-bottom": bottom + "px",
  } as React.CSSProperties;

  const panel = (
    <div className="tts_panel">
      <div className="tts_frame" ref={frameRef}>
        {!loaded && <div className="tts_ph" aria-hidden="true"><i /></div>}
        {near && (
          <iframe src={src} title={p.title || P.title} allow={P.allow} loading="lazy" style={ifStyle} onLoad={() => setLoaded(true)} />
        )}
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={root} className="tts" style={vars} data-side={side} data-framed={framed ? "on" : "off"} data-layout={full ? "full" : "side"} data-mobile={P.mobile}>
        {full ? panel : (
          <div className="tts_grid">
            <div className="tts_text">
              {p.eyebrow ? <p className="tts_eyebrow">{p.eyebrow}</p> : null}
              {p.title ? <h2 className="tts_title">{p.title}</h2> : null}
              {p.description ? <p className="tts_desc">{p.description}</p> : null}
              {(p.link1Label || p.link2Label) && (
                <div className="tts_links">
                  {p.link1Label ? <a className="tts_btn" data-style={btnStyle(p.link1Style, "Dark")} href={l1} aria-label={p.link1Label} {...ext1}><StaggerLabel text={p.link1Label} /></a> : null}
                  {p.link2Label ? <a className="tts_btn" data-style={btnStyle(p.link2Style, "White")} href={l2} aria-label={p.link2Label} {...ext2}><StaggerLabel text={p.link2Label} /></a> : null}
                </div>
              )}
            </div>
            {panel}
          </div>
        )}
      </div>
    </>
  );
}

export function TtsDemo(p: TtsDemoProps) { return <DemoEmbed {...p} preset="tts" />; }
export function SttDemo(p: TtsDemoProps) { return <DemoEmbed {...p} preset="stt" />; }
export default DemoEmbed;
