/*!
 * TtsDemo (Code Component) — the Text-to-Speech & Voice Cloning demo iframe
 * (tts-cloning-demo.sestek.com) with the two approved sizings from the
 * Webflow embeds:
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

type LinkValue = { href?: string; target?: string } | string | null | undefined;

export interface TtsDemoProps {
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

const DEFAULT_SRC = "https://tts-cloning-demo.sestek.com:12443/Demo.aspx?lang={lang}&embed=1";

/* approved constants (from the embeds) */
const SIDE = { bigPanel: 593, bigIframe: 728, lapW: 760, lapH: 728, lapZoom: 0.647859, shortMax: 700 };
const FULL = { baseW: 960, baseH: 649, lapVH: 554, lapScale: 0.7147, adjust: 1.01 };
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
.tts_links{display:flex;flex-direction:column;align-items:flex-start;gap:.625rem;margin-top:.5rem}
.tts_link{display:inline-flex;align-items:center;gap:.5rem;font-size:.9375rem;font-weight:600;color:var(--tts-ink);text-decoration:none;border-bottom:1px solid transparent;transition:color .2s ease,border-color .2s ease}
.tts_link svg{width:1rem;height:1rem;flex:none;transition:transform .25s cubic-bezier(.2,.7,.2,1)}
.tts_link:hover{color:var(--tts-accent);border-color:currentColor}
.tts_link:hover svg{transform:translateX(3px)}
.tts_link:focus-visible{outline:2px solid var(--tts-accent);outline-offset:3px}
.tts_link--muted{color:var(--tts-muted);font-weight:500}
.tts_panel{position:relative;box-sizing:border-box;padding:0;margin:0 auto;max-width:100%}
.tts_frame{position:relative;overflow:hidden;width:100%;max-width:none;background:#fff}
.tts[data-framed="on"] .tts_frame{border:1px solid var(--tts-line);border-radius:var(--tts-radius)}
.tts_frame iframe{display:block;border:0;max-width:none;width:100%;height:100%}
.tts_ph{position:absolute;inset:0;display:grid;place-items:center;color:var(--tts-muted);font-size:.875rem;background:linear-gradient(135deg,#fafafc,#f1f1f5)}
.tts_ph i{width:22px;height:22px;border-radius:50%;border:2px solid var(--tts-line);border-top-color:var(--tts-accent);animation:tts-spin .9s linear infinite}
@keyframes tts-spin{to{transform:rotate(360deg)}}
@media (max-width:767px){
  .tts_grid,.tts[data-side="right"] .tts_grid{grid-template-columns:minmax(0,1fr);gap:1.75rem}
  .tts[data-side="right"] .tts_text{order:0}
  .tts_text{max-width:none}
  .tts_panel{width:100%!important;max-width:100%!important}
}
@media (prefers-reduced-motion:reduce){.tts_ph i{animation:none}}
`;

type Size = { mobile: boolean; panelW: string; frameW: string; frameH: string; ifW: string; ifH: string; zoom: string };

function linkHref(v: LinkValue): string { if (!v) return ""; return typeof v === "string" ? v : v.href || ""; }

export function TtsDemo(p: TtsDemoProps) {
  const full = (p.layout || "Side by side").toLowerCase().startsWith("full");
  const side = (p.textSide || "Left").toLowerCase().startsWith("right") ? "right" : "left";
  const mobileH = Math.max(300, p.mobileHeight || 840);
  const bottom = p.bottomMargin == null ? 80 : Math.max(0, p.bottomMargin);
  const framed = p.framed !== false;

  const root = React.useRef<HTMLDivElement>(null);
  const [size, setSize] = React.useState<Size | null>(null);
  const [near, setNear] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [lang, setLang] = React.useState("en-US");

  /* language: prop or page locale (/tr, <html lang>) */
  React.useEffect(() => {
    const l = (p.lang || "Auto").trim();
    if (l && !/^auto$/i.test(l)) { setLang(l); return; }
    const tr = /^\/tr(\/|$)/.test(location.pathname) || (document.documentElement.lang || "").toLowerCase().startsWith("tr");
    setLang(tr ? "tr-TR" : "en-US");
  }, [p.lang]);

  /* sizing — port of the two approved embed scripts */
  React.useEffect(() => {
    const el = root.current; if (!el) return;
    const compute = () => {
      const mobile = window.innerWidth <= MOBILE_BP;
      if (mobile) { setSize({ mobile: true, panelW: "100%", frameW: "100%", frameH: mobileH + "px", ifW: "100%", ifH: mobileH + "px", zoom: "1" }); return; }
      if (full) {
        const cs = getComputedStyle(el);
        const avail = el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
        const widthScale = (avail - 2) / FULL.baseW;
        const heightScale = FULL.lapScale * (window.innerHeight / FULL.lapVH);
        const scale = Math.max(0.2, Math.min(1, widthScale, heightScale * FULL.adjust));
        const vw = FULL.baseW * scale, vh = FULL.baseH * scale;
        setSize({ mobile: false, panelW: vw + 2 + "px", frameW: vw + "px", frameH: vh + "px", ifW: FULL.baseW + "px", ifH: FULL.baseH + "px", zoom: String(scale) });
        return;
      }
      const short = window.innerHeight <= SIDE.shortMax;
      if (short) {
        const vw = SIDE.lapW * SIDE.lapZoom, vh = SIDE.lapH * SIDE.lapZoom;
        setSize({ mobile: false, panelW: vw + "px", frameW: "100%", frameH: vh + "px", ifW: SIDE.lapW + "px", ifH: SIDE.lapH + "px", zoom: String(SIDE.lapZoom) });
        return;
      }
      setSize({ mobile: false, panelW: SIDE.bigPanel + "px", frameW: "100%", frameH: SIDE.bigIframe + "px", ifW: "100%", ifH: SIDE.bigIframe + "px", zoom: "1" });
    };
    compute();
    let t = 0;
    const onResize = () => { clearTimeout(t); t = window.setTimeout(compute, 80); };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize); ro.observe(el);
    return () => { window.removeEventListener("resize", onResize); clearTimeout(t); ro.disconnect(); };
  }, [full, mobileH]);

  /* src only near the viewport (the demo app is heavy) */
  React.useEffect(() => {
    const el = root.current; if (!el) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "60% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const src = (p.iframeSrc || DEFAULT_SRC).replace("{lang}", encodeURIComponent(lang));
  const l1 = linkHref(p.link1Url) || "/demos/tts";
  const l2 = linkHref(p.link2Url) || "https://docs.sestek.com/docs/tts-supported-languages-and-voices";
  const ext1 = p.link1NewTab ? { target: "_blank", rel: "noopener" } : {};
  const ext2 = p.link2NewTab !== false ? { target: "_blank", rel: "noopener" } : {};
  const arrow = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

  const panelStyle: React.CSSProperties = size ? { width: size.panelW, maxWidth: "100%", marginBottom: full ? bottom + "px" : undefined } : { width: full ? "100%" : SIDE.bigPanel + "px" };
  const frameStyle: React.CSSProperties = size ? { width: size.frameW, height: size.frameH } : { height: (full ? FULL.baseH : SIDE.bigIframe) + "px" };
  const ifStyle = (size ? { width: size.ifW, height: size.ifH, zoom: size.zoom } : {}) as React.CSSProperties;

  const panel = (
    <div className="tts_panel" style={panelStyle}>
      <div className="tts_frame" style={frameStyle}>
        {!loaded && <div className="tts_ph" aria-hidden="true"><i /></div>}
        {near && (
          <iframe src={src} title={p.title || "Text-to-Speech and Voice Cloning demo"} allow="microphone" loading="lazy" style={ifStyle} onLoad={() => setLoaded(true)} />
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{CSS}</style>
      <div ref={root} className="tts" data-side={side} data-framed={framed ? "on" : "off"} data-layout={full ? "full" : "side"}>
        {full ? panel : (
          <div className="tts_grid">
            <div className="tts_text">
              {p.eyebrow ? <p className="tts_eyebrow">{p.eyebrow}</p> : null}
              {p.title ? <h2 className="tts_title">{p.title}</h2> : null}
              {p.description ? <p className="tts_desc">{p.description}</p> : null}
              {(p.link1Label || p.link2Label) && (
                <div className="tts_links">
                  {p.link1Label ? <a className="tts_link" href={l1} {...ext1}>{p.link1Label}{arrow}</a> : null}
                  {p.link2Label ? <a className="tts_link tts_link--muted" href={l2} {...ext2}>{p.link2Label}{arrow}</a> : null}
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

export default TtsDemo;
