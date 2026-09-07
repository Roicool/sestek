/*!
 * StackPanels (Code Component) — React port of js/components/stack-panels.js
 * v1.4.0 + stack-panels.css v1.0.1 for the HOME PAGE section
 * "Why global brands are choosing SESTEK" (3 panels: text + CTA on the
 * left, square Cloudflare Stream video on the right).
 *
 * Scrollytelling: every panel but the last pins (pinSpacing:false); as the
 * next panel slides up over it the pinned one holds, then scales down, dims,
 * blurs and lifts away (hold / scale / blur / lift / fade props). Panels
 * taller than the viewport get the "fake-scroll" phase first. GSAP +
 * ScrollTrigger come from the site's globals; without them, under
 * prefers-reduced-motion, with a pin-blocking ancestor, or on PHONES
 * (≤767px, like v1.4.0) the panels read top to bottom in plain flow.
 *
 * MEDIA (the mobile "shifting" fix): the media box has a FIXED aspect
 * ratio (1:1 by default), so an <img> or <video> arriving late never changes
 * the panel's height — a late height change is what broke phones: the pins
 * were measured against the short panel, the video then grew it, every pin
 * start/end went stale and the page jumped. Videos are muted (attribute AND
 * property), playsinline, loop, preload="metadata"; the src is assigned only
 * when the panel comes near the viewport; they play only while visible; the
 * poster (Cloudflare thumbnail URL or a Webflow image) shows meanwhile and
 * stays if the video fails. Any remaining height change (fonts, long text)
 * is caught by a ResizeObserver → debounced ScrollTrigger.refresh().
 *
 * Header: plain-text title (**bold** markup, | line break; the shine word
 * gets the brand shine mask from heading-shine.css), soft reveal on scroll-in. CTA: the site's
 * stagger button (characters roll up on hover), one style per panel.
 */

import * as React from "react";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface StackPanelItem {
  /** heading; the accent part is appended in the accent colour */
  heading: string;
  headingAccent?: string;
  /** body text; **bold** markup → <strong> */
  body?: string;
  image?: string;
  imageAlt?: string;
  poster?: string;
  video?: string;
  /** "auto" | "right" | "left" */
  side?: string;
  /** "Dark" | "White" | "Brand secondary" | "Brand primary" | "None" */
  button?: string;
  /** accent colour for <em> inside the heading (token / colour) */
  accent?: string;
}

type N = 1 | 2 | 3 | 4;
type ItemKey = `i${N}${"Heading" | "HeadingAccent" | "Body" | "Video" | "Poster" | "Side" | "Button" | "Accent"}`;
type ImgProp = string | { src?: string; url?: string; alt?: string } | null | undefined;

export interface StackPanelsProps extends Partial<Record<ItemKey, string>> {
  items?: StackPanelItem[];
  i1Image?: ImgProp; i2Image?: ImgProp; i3Image?: ImgProp; i4Image?: ImgProp;

  /** plain text; **bold** → strong, | → line break */
  title?: string;
  /** the word in the title that gets the brand shine */
  titleShineWord?: string;
  subtitle?: string;
  titleReveal?: boolean;
  titleShine?: boolean;

  ctaLabel?: string;
  ctaUrl?: string;
  ctaNewTab?: boolean;

  /** "1:1" | "4:3" | "16:10" | "16:9" | "3:2" */
  mediaRatio?: string;
  /** "Cover" | "Contain" */
  mediaFit?: string;

  hold?: number;
  scale?: number;
  blur?: number;
  lift?: number;
  fadePortion?: number;
  midFade?: number;
  scrub?: number;
  priorityStart?: number;
  mobileEffect?: boolean;

  bgImage?: { src: string; alt?: string };
  sectionBg?: string;
  cardBg?: string;
  bottomFade?: boolean;
}

export const DEFAULT_TITLE = "Why **global** brands are | choosing SESTEK";
export const DEFAULT_SHINE_WORD = "SESTEK";
export const DEFAULT_ITEMS: StackPanelItem[] = [
  { heading: "Market-leading performance,", headingAccent: "engineered in-house.", body: "Our **+100** R&D experts develop all core technologies in-house, delivering **>98% real-world accuracy**. This technical precision guarantees deeper, more reliable insights from every conversation.", button: "White", accent: "--color-teritary--700",
    poster: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/641caf060dbfe2f9463087afb89eb6f6/thumbnails/thumbnail.jpg?width=600&height=600&fit=crop",
    video: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/641caf060dbfe2f9463087afb89eb6f6/downloads/default.mp4" },
  { heading: "Guaranteed project delivery,", headingAccent: "deployed anywhere", body: "Driven by **25+ years** of experience, we maintain a flawless **100%** project delivery rate. Our cloud-agnostic solutions deploy seamlessly on-premise, public, or private clouds.", button: "Brand secondary", accent: "--brand-secondary--500",
    poster: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/2c20768633609f07771a6e8f9b975574/thumbnails/thumbnail.jpg?height=600",
    video: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/2c20768633609f07771a6e8f9b975574/downloads/default.mp4" },
  { heading: "High-touch partnership,", headingAccent: "connected seamlessly", body: "We work in close contact with customers to tailor **high-touch** solutions to their exact needs. This powers a scalable, end-to-end **omnichannel platform** for all business units.", button: "Dark", accent: "--brand-primary--500",
    poster: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/8f960c3b6e0adfec5ab2a36841c62eb9/thumbnails/thumbnail.jpg?height=600",
    video: "https://customer-aqbxsulug92giq9c.cloudflarestream.com/8f960c3b6e0adfec5ab2a36841c62eb9/downloads/default.mp4" },
];
export const BUTTON_STYLES = ["Auto", "White", "Brand secondary", "Brand primary", "Dark", "None"];
const AUTO_BUTTON = ["White", "Brand secondary", "Dark"];
const AUTO_ACCENT = ["--color-teritary--700", "--brand-secondary--500", "--brand-primary--500"];

/* ── helpers ─────────────────────────────────────────────────────────── */
type STi = { kill(): void; refresh(): void; start: number; end: number };
type Tl = { to: (t: unknown, v: Record<string, unknown>) => Tl; fromTo: (t: unknown, a: Record<string, unknown>, b: Record<string, unknown>) => Tl; kill(): void; scrollTrigger?: STi };
type G = { registerPlugin: (p: unknown) => void; timeline: (v: Record<string, unknown>) => Tl; set: (t: unknown, v: Record<string, unknown>) => void };
type STg = { refresh: () => void; addEventListener: (e: string, f: () => void) => void; removeEventListener: (e: string, f: () => void) => void };
function gs(): { gsap: G; ST: STg } | null {
  const w = window as unknown as { gsap?: G; ScrollTrigger?: STg };
  return w.gsap && w.ScrollTrigger ? { gsap: w.gsap, ST: w.ScrollTrigger } : null;
}
function refreshST(st: STg) {
  const w = window as unknown as { Sestek?: { refreshScroll?: () => void } };
  if (w.Sestek && w.Sestek.refreshScroll) w.Sestek.refreshScroll(); else st.refresh();
}
function color(v: string | undefined): string {
  const s = (v || "").trim();
  if (!s) return "";
  return s.startsWith("--") ? `var(${s})` : s;
}
function imgSrc(v: ImgProp): string { if (!v) return ""; if (typeof v === "string") return v; return v.src || v.url || ""; }
function imgAlt(v: ImgProp): string { return v && typeof v === "object" && v.alt ? v.alt : ""; }
const str = (v: unknown) => (v == null ? "" : String(v));
/**
 * Tiny inline markup for plain Text props (no HTML, React text nodes only):
 *   **bold**  → <strong>      |  → line break (title only)
 *   shineWord → <em> (brand shine) when given
 */
function mark(text: string, opts?: { breaks?: boolean; shine?: string }): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let k = 0;
  const pushText = (t: string) => {
    if (!t) return;
    const shine = opts && opts.shine ? opts.shine.trim() : "";
    if (shine && t.includes(shine)) {
      const parts = t.split(shine);
      parts.forEach((pt, i) => { if (pt) out.push(<React.Fragment key={k++}>{pt}</React.Fragment>); if (i < parts.length - 1) out.push(<em key={k++}>{shine}</em>); });
    } else out.push(<React.Fragment key={k++}>{t}</React.Fragment>);
  };
  const lines = opts && opts.breaks ? text.split("|") : [text];
  lines.forEach((line, li) => {
    if (li) out.push(<br key={k++} />);
    const segs = line.split("**");
    segs.forEach((seg, i) => {
      const t = li && i === 0 ? seg.replace(/^\s+/, "") : (li < lines.length - 1 && i === segs.length - 1 ? seg.replace(/\s+$/, "") : seg);
      if (i % 2 === 1) out.push(<strong key={k++}>{t}</strong>); else pushText(t);
    });
  });
  return out;
}
function pinBlocker(el: Element): Element | null {
  let p: Node | null = el.parentNode;
  while (p && p !== document.body) {
    if (p instanceof ShadowRoot) { p = p.host; continue; }
    if (p instanceof Element) {
      const cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" || cs.willChange.indexOf("transform") > -1) return p;
    }
    p = p.parentNode;
  }
  return null;
}
const MOBILE_BP = 767.98;

/* ── CSS ─────────────────────────────────────────────────────────────── */
const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.sp{
  --sp-font:var(--font--primary,var(--font--body,inherit));
  --sp-bg:var(--surface--base,#fff);
  --sp-card:var(--surface--base,#fff);
  --sp-ink:var(--color-text--base,#111);
  --sp-muted:var(--color-text--muted,#4b4b55);
  --sp-radius:var(--radius--lg,1rem);
  --sp-gap:var(--gap--2xl,clamp(2.5rem,6vw,5rem));
  --sp-pad:clamp(1.25rem,3vw,2rem);
  --sp-ratio:1/1;
  --sp-fit:cover;
  --sp-shadow-rgb:var(--shadow-rgb,15 23 42);
  position:relative;overflow:hidden;font-family:var(--sp-font);color:var(--sp-ink);background:var(--sp-bg);
  padding:var(--section--py-2,clamp(4rem,10vw,8rem)) var(--view--px,var(--spacing--6,1.5rem));
}
.sp_bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
.sp_fade{position:absolute;left:0;right:0;bottom:0;height:10%;z-index:1;pointer-events:none;background:linear-gradient(0deg,var(--sp-bg),transparent)}
.sp_wrap{position:relative;z-index:2;max-width:var(--container--2xl,96rem);margin:0 auto;display:flex;flex-direction:column;gap:var(--sp-gap)}
/* header */
.sp_head{display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center;max-width:var(--container--md,48rem);margin:0 auto;position:relative;z-index:20}
.sp_title{margin:0;font-size:var(--heading--h2,clamp(2rem,4.5vw,3.5rem));line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--semibold,600);text-wrap:balance;overflow-wrap:anywhere}
.sp_title strong{font-weight:var(--font-weight--bold,700)}
.sp_title p{margin:0;display:inline}
.sp_title.is-reveal{opacity:0;transform:translateY(14px) scale(1.03);transition:opacity 1.2s cubic-bezier(.2,.7,.2,1) .2s,transform 1.2s cubic-bezier(.2,.7,.2,1) .2s}
.sp_title.is-reveal.is-in{opacity:1;transform:none}
/* brand shine on <em> (heading-shine.css "brand", inlined) */
.sp_title em{font-style:normal}
.sp_title.is-shine em{
  padding-block:.1em;margin-block:-.1em;
  background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-image:linear-gradient(105deg,transparent 40%,#00d5c8 46%,#7f81ae 50%,#ec008c 54%,transparent 60%),linear-gradient(currentColor,currentColor);
  background-size:300% 100%,100% 100%;background-repeat:no-repeat;background-position:130% 0,0 0;
  animation:sp-shine 5.5s ease-in-out infinite}
@keyframes sp-shine{0%{background-position:130% 0,0 0}40%{background-position:-30% 0,0 0}100%{background-position:-30% 0,0 0}}
.sp_sub{margin:0;font-size:var(--text--lg,1.125rem);line-height:1.5;color:var(--sp-muted);max-width:40rem;text-wrap:balance}
/* stack */
.sp_stack{position:relative;display:flex;flex-direction:column;gap:var(--sp-gap);z-index:20}
.sp_panel{position:relative;overflow:hidden;border-radius:var(--sp-radius);background:var(--sp-card);z-index:1;
  transform-origin:center center;will-change:transform,opacity,filter;
  box-shadow:0 1px 2px -1px rgb(var(--sp-shadow-rgb)/.06),0 6px 14px -6px rgb(var(--sp-shadow-rgb)/.1),0 22px 40px -24px rgb(var(--sp-shadow-rgb)/.14)}
.sp_panel~.sp_panel{z-index:2}
.sp_inner{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:stretch;gap:var(--sp-pad);padding:var(--sp-pad)}
.sp_text{display:flex;flex-direction:column;justify-content:center;gap:1.5rem;min-width:0;padding:clamp(.5rem,2vw,1.5rem) clamp(.25rem,2vw,1.5rem)}
.sp_panel[data-side="left"] .sp_media{order:-1}
.sp_rt{display:flex;flex-direction:column;gap:1rem}
.sp_h{margin:0;font-size:var(--heading--h2,clamp(1.75rem,3.2vw,2.75rem));line-height:var(--leading--tight,1.12);font-weight:var(--font-weight--semibold,600);color:var(--sp-ink);text-wrap:balance;overflow-wrap:anywhere}
.sp_h em{font-style:normal;color:var(--sp-accent,var(--brand-primary--500,#EC008C))}
.sp_p{margin:0;font-size:var(--text--lg,1.125rem);line-height:var(--leading--normal,1.5);font-weight:var(--font-weight--light,300);letter-spacing:.01em;color:var(--sp-muted)}
.sp_p strong{font-weight:var(--font-weight--semibold,600);color:var(--sp-ink)}
/* CTA — stagger button */
.sp_cta{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;margin-top:.5rem}
.sp_btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.25rem .8rem;border-radius:999px;text-decoration:none;font-size:var(--text--sm,.875rem);font-weight:500;line-height:1.2;
  background:var(--surface--accent,#111);color:var(--color-text--inverted,#fff);transition:transform .35s cubic-bezier(.65,0,.35,1),box-shadow .35s ease;-webkit-tap-highlight-color:transparent}
.sp_btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -14px rgb(var(--sp-shadow-rgb)/.5)}
.sp_btn:focus-visible{outline:2px solid var(--brand-primary--500,#EC008C);outline-offset:3px}
.sp_btn[data-style="white"]{background:var(--surface--light,#f3f4f6);color:var(--color-text--base,#111)}
.sp_btn[data-style="brand-secondary"]{background:var(--brand-secondary--500,#3d6bb3);color:#fff}
.sp_btn[data-style="brand-primary"]{background:var(--brand-primary--500,#EC008C);color:#fff}
.sp_stg{position:relative;display:inline-block;overflow:hidden;line-height:1.2}
.sp_stg-t{display:inline-block;white-space:nowrap}
.sp_stg-t--clone{position:absolute;top:0;left:0;width:100%;pointer-events:none}
.sp_stg-c{display:inline-block;transition:transform .5s cubic-bezier(.65,0,.35,1),opacity .5s cubic-bezier(.65,0,.35,1);transition-delay:calc(var(--i) * .03s)}
.sp_stg-t--clone .sp_stg-c{transform:translateY(100%);opacity:0}
.sp_btn:hover .sp_stg-t--orig .sp_stg-c{transform:translateY(-100%);opacity:0}
.sp_btn:hover .sp_stg-t--clone .sp_stg-c{transform:translateY(0);opacity:1}
/* media: FIXED ratio box, inside the card padding */
.sp_media{position:relative;min-width:0;width:100%;aspect-ratio:var(--sp-ratio);border-radius:var(--sp-radius);overflow:hidden;background:rgb(var(--sp-shadow-rgb)/.06);isolation:isolate}
.sp_media img,.sp_media video{position:absolute;inset:0;width:100%;height:100%;object-fit:var(--sp-fit);display:block}
.sp_media video{background:transparent}
.sp_empty{position:absolute;inset:0;background:linear-gradient(135deg,rgb(var(--sp-shadow-rgb)/.08),rgb(var(--sp-shadow-rgb)/.18))}
.sp.is-flow .sp_panel{will-change:auto}
@media (max-width:991px){
  .sp_inner{grid-template-columns:minmax(0,1fr);gap:var(--sp-pad)}
  .sp_panel[data-side="left"] .sp_media{order:1}
  .sp_text{padding:.5rem .25rem;gap:1.25rem}
  .sp_h{font-size:clamp(1.625rem,4.2vw,2.25rem)}
}
@media (max-width:767px){
  .sp{padding-inline:var(--view--px,1rem)}
  .sp_title{font-size:clamp(1.75rem,7.5vw,2.5rem)}
  .sp_p{font-size:1rem}
  .sp_h{font-size:clamp(1.5rem,6.5vw,1.875rem)}
  .sp_inner{padding:1rem}
  .sp_text{padding:.5rem .25rem .75rem}
}
@media (prefers-reduced-motion:reduce){
  .sp_panel{will-change:auto}
  .sp_title.is-reveal{opacity:1;transform:none;transition:none}
  .sp_title.is-shine em{animation:none}
  .sp_stg-c{transition:none}.sp_btn:hover .sp_stg-t--orig .sp_stg-c{transform:none;opacity:1}.sp_stg-t--clone{display:none}
}
`;

/* ── Stagger button label ── */
function StaggerLabel({ text }: { text: string }) {
  const chars = Array.from(text);
  const row = (cls: string) => (
    <span className={"sp_stg-t " + cls} aria-hidden="true">
      {chars.map((ch, i) => <span key={i} className="sp_stg-c" style={{ "--i": i } as React.CSSProperties}>{ch === " " ? " " : ch}</span>)}
    </span>
  );
  return <span className="sp_stg">{row("sp_stg-t--orig")}{row("sp_stg-t--clone")}</span>;
}

/* ── Media: fixed-ratio box; video src only near the viewport, plays only while visible ── */
function Media({ poster, alt, video, eager }: { poster?: string; alt?: string; video?: string; eager?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const vref = React.useRef<HTMLVideoElement>(null);
  const [near, setNear] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!video || !ref.current) return;
    const el = ref.current;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [video]);

  React.useEffect(() => {
    const v = vref.current; if (!v || !near) return;
    // React sets `muted` as a property only — iOS autoplay policy wants the attribute too
    v.muted = true; v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
    const tryPlay = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if (!("IntersectionObserver" in window)) { tryPlay(); return; }
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) tryPlay(); else v.pause(); }); }, { threshold: 0.1 });
    io.observe(v);
    return () => { io.disconnect(); v.pause(); };
  }, [near]);

  const showVideo = !!video && near && !failed;
  return (
    <div className="sp_media" ref={ref}>
      {!poster && !video ? <span className="sp_empty" aria-hidden="true" /> : null}
      {poster && !showVideo ? <img src={poster} alt={alt || ""} loading={eager ? "eager" : "lazy"} decoding="async" /> : null}
      {showVideo ? (
        <video ref={vref} src={video} poster={poster || undefined} muted playsInline loop autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} disablePictureInPicture onError={() => setFailed(true)} />
      ) : null}
    </div>
  );
}

/* ── Error boundary ── */
class Boundary extends React.Component<{ children?: React.ReactNode }, { err: string }> {
  state = { err: "" };
  static getDerivedStateFromError(e: unknown) { return { err: e instanceof Error ? e.message : String(e) }; }
  componentDidCatch(e: unknown) { console.error("[Sestek StackPanels]", e); }
  render() {
    if (this.state.err) return <div style={{ padding: "1rem", font: "13px/1.4 monospace", color: "#b00020" }}>Stack Panels error: {this.state.err}</div>;
    return this.props.children;
  }
}
export function StackPanels(p: StackPanelsProps) { return <Boundary><Inner {...p} /></Boundary>; }

/* ── Component ── */
function Inner(p: StackPanelsProps) {
  /* stable key over the flat Designer props: a parent re-render must not tear the pins down */
  const itemsKey = React.useMemo(() => {
    const px = p as unknown as Record<string, unknown>; const parts: unknown[] = [];
    for (let n = 1; n <= 4; n++) { const im = px["i" + n + "Image"] as ImgProp; parts.push(px["i" + n + "Heading"], px["i" + n + "HeadingAccent"], px["i" + n + "Body"], px["i" + n + "Poster"], px["i" + n + "Video"], px["i" + n + "Side"], px["i" + n + "Button"], px["i" + n + "Accent"], imgSrc(im), imgAlt(im)); }
    return JSON.stringify(parts);
  }, [p]);
  const items = React.useMemo<StackPanelItem[]>(() => {
    if (p.items && p.items.length) return p.items;
    const px = p as unknown as Record<string, unknown>;
    const out: StackPanelItem[] = []; let any = false;
    for (let n = 1; n <= 4; n++) {
      if (px["i" + n + "Heading"] !== undefined) any = true;
      const heading = str(px["i" + n + "Heading"]).trim();
      const headingAccent = str(px["i" + n + "HeadingAccent"]).trim();
      const body = str(px["i" + n + "Body"]).trim();
      if (!heading && !headingAccent && !body) continue;
      const im = px["i" + n + "Image"] as ImgProp;
      out.push({
        heading, headingAccent, body,
        image: imgSrc(im), imageAlt: imgAlt(im),
        poster: str(px["i" + n + "Poster"]).trim(),
        video: str(px["i" + n + "Video"]).trim(),
        side: str(px["i" + n + "Side"] || "Right").toLowerCase(),
        button: str(px["i" + n + "Button"] || "Auto"),
        accent: str(px["i" + n + "Accent"]).trim(),
      });
    }
    return out.length || any ? out : DEFAULT_ITEMS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.items, itemsKey]);

  const hold = p.hold == null ? 0.5 : Math.min(0.95, Math.max(0, p.hold));
  const endScale = p.scale == null ? 0.5 : Math.min(1, Math.max(0.2, p.scale));
  const blurPx = p.blur == null ? 4 : Math.max(0, p.blur);
  const liftPx = p.lift == null ? 24 : Math.max(0, p.lift);
  const fadePortion = p.fadePortion == null ? 0.1 : Math.min(0.9, Math.max(0.02, p.fadePortion));
  const midFade = p.midFade == null ? 0.5 : Math.min(1, Math.max(0, p.midFade));
  const scrub: number | boolean = p.scrub == null || p.scrub <= 0 ? true : p.scrub;
  const priorityStart = p.priorityStart == null ? 0 : p.priorityStart;
  const mobileEffect = !!p.mobileEffect;
  const ratio = { "4:3": "4/3", "16:10": "16/10", "16:9": "16/9", "3:2": "3/2" }[(p.mediaRatio || "1:1") as string] || "1/1";
  const fit = (p.mediaFit || "Cover").toLowerCase().startsWith("contain") ? "contain" : "cover";
  const ctaLabel = p.ctaLabel == null ? "Request a demo" : p.ctaLabel;
  const ctaUrl = p.ctaUrl == null ? "/request-a-demo" : p.ctaUrl;

  const titleText = (p.title === undefined ? DEFAULT_TITLE : str(p.title)).trim();
  const shineWord = p.titleShineWord === undefined ? DEFAULT_SHINE_WORD : str(p.titleShineWord).trim();
  const hasTitle = titleText.length > 0;

  const root = React.useRef<HTMLElement>(null);
  const stack = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [flow, setFlow] = React.useState(true);
  const [titleIn, setTitleIn] = React.useState(false);
  const [revealArmed, setRevealArmed] = React.useState(false);   // opacity:0 only once JS knows the title is below the fold

  /* mode: pin unless reduced motion / phone (unless forced) / no gsap */
  React.useEffect(() => {
    const red = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mob = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    const apply = () => setFlow(!gs() || red.matches || (mob.matches && !mobileEffect) || items.length < 2);
    apply();
    red.addEventListener("change", apply); mob.addEventListener("change", apply);
    return () => { red.removeEventListener("change", apply); mob.removeEventListener("change", apply); };
  }, [mobileEffect, items.length]);

  /* title reveal on scroll-in (once). The heading is NEVER hidden before JS runs (SSR / no-JS paint
     shows it); it is only armed (opacity:0) when it is still below the fold at hydration. */
  useIsoLayoutEffect(() => {
    const h = titleRef.current;
    if (!h || p.titleReveal === false || !("IntersectionObserver" in window)) { setTitleIn(true); return; }
    if (h.getBoundingClientRect().top < window.innerHeight * 0.85) { setTitleIn(true); return; }   // already visible: no reveal
    setRevealArmed(true);
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setTitleIn(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(h);
    return () => io.disconnect();
  }, [p.titleReveal, hasTitle]);

  /* ── pins (port of setupPins) ── */
  React.useEffect(() => {
    if (flow) return;
    const g = gs(); const r = root.current, s = stack.current; if (!g || !r || !s) return;
    g.gsap.registerPlugin(g.ST);
    const panels = Array.from(s.querySelectorAll<HTMLElement>("[data-sp-panel]"));
    if (panels.length < 2) return;

    let cancelled = false, probe = 0, tries = 0;
    let destroy: (() => void) | null = null;

    const build = () => {
      // read every height first, then write (no forced reflow per panel)
      const windowH = window.innerHeight;
      const inners = panels.map((pn) => pn.querySelector<HTMLElement>("[data-sp-inner]")!);
      const innerH = inners.map((el) => el.offsetHeight);
      const panelH = panels.map((pn) => pn.offsetHeight);
      panels.forEach((panel, idx) => { if (!panel.style.zIndex) panel.style.zIndex = String(idx + 1); });
      const tls: Tl[] = [];
      const marginRefreshers: Array<() => void> = [];

      panels.slice(0, -1).forEach((panel, i) => {
        const inner = inners[i];
        const diff = innerH[i] - windowH;
        const fakeRatio = diff > 0 ? diff / (diff + windowH) : 0;
        if (fakeRatio) {
          const applyMargin = () => {
            const wh = window.innerHeight, ih = inner.offsetHeight, d = ih - wh;
            panel.style.marginBottom = (d > 0 ? ih * (d / (d + wh)) : 0) + "px";
          };
          applyMargin(); marginRefreshers.push(applyMargin);
        }
        const tl = g.gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: fakeRatio ? "bottom bottom" : "center center",
            end: () => (fakeRatio ? "+=" + inner.offsetHeight : "bottom top"),
            pin: panel, pinSpacing: false, scrub, invalidateOnRefresh: true,
            refreshPriority: priorityStart - i,
          },
        });
        if (fakeRatio) tl.to(inner, { yPercent: -100, y: () => window.innerHeight, ease: "none", duration: 1 / (1 - fakeRatio) - 1 });
        if (!fakeRatio && hold > 0 && hold < 1) tl.to({}, { duration: hold / (1 - hold), ease: "none" });
        const uncovered = panels[i + 1] ? 1 - Math.min(1, panelH[i + 1] / windowH) : 0;
        const fadeDur = Math.min(0.9, Math.max(fadePortion, uncovered));
        const fromVars: Record<string, unknown> = { scale: 1, opacity: 1 };
        const toVars: Record<string, unknown> = { scale: endScale, opacity: midFade, duration: 1 - fadeDur, ease: "none" };
        if (blurPx > 0) { fromVars.filter = "blur(0px)"; toVars.filter = "blur(" + blurPx + "px)"; }
        if (liftPx) { fromVars.y = 0; toVars.y = -liftPx; }
        tl.fromTo(panel, fromVars, toVars).to(panel, { opacity: 0, duration: fadeDur, ease: "none" });
        tls.push(tl);
      });

      const onRefreshInit = () => marginRefreshers.forEach((f) => f());
      if (marginRefreshers.length) g.ST.addEventListener("refreshInit", onRefreshInit);

      // ONE debounced refresh for window resize, stack size changes and late fonts
      let rt = 0; let lastW = window.innerWidth;
      const scheduleRefresh = () => { clearTimeout(rt); rt = window.setTimeout(() => refreshST(g.ST), 150); };
      const onResize = () => {
        if (window.innerWidth === lastW && window.innerWidth <= 991) return;     // tablet/phone URL bar: height-only
        lastW = window.innerWidth;
        scheduleRefresh();
      };
      window.addEventListener("resize", onResize);
      let first = true;
      const ro = new ResizeObserver(() => { if (first) { first = false; return; } scheduleRefresh(); });
      ro.observe(s);
      // fonts landing after init change panel heights → refresh once
      const fonts = (document as Document & { fonts?: { ready: Promise<unknown>; status?: string } }).fonts;
      if (fonts && fonts.ready && fonts.status !== "loaded") fonts.ready.then(() => { if (!cancelled) scheduleRefresh(); });

      destroy = () => {
        window.removeEventListener("resize", onResize); clearTimeout(rt); ro.disconnect();
        if (marginRefreshers.length) g.ST.removeEventListener("refreshInit", onRefreshInit);
        tls.forEach((tl) => { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); });
        g.gsap.set(panels, { clearProps: "all" });
        panels.forEach((pn) => { pn.style.marginBottom = ""; pn.style.zIndex = ""; const inner = pn.querySelector("[data-sp-inner]"); if (inner) g.gsap.set(inner, { clearProps: "all" }); });
      };
    };

    const tryBuild = () => {
      if (cancelled) return;
      const b = pinBlocker(r);
      if (!b) { r.removeAttribute("data-sp-reduced"); build(); if (tries) refreshST(g.ST); return; }
      r.setAttribute("data-sp-reduced", "");
      if (tries === 0) console.warn("[Sestek StackPanels] Pin deferred — an ancestor has transform/filter/perspective/will-change.", b);
      if (++tries >= 8) { console.warn("[Sestek StackPanels] Pin DISABLED — ancestor transform is permanent; plain flow.", b); return; }
      probe = window.setTimeout(tryBuild, 1500);
    };
    tryBuild();

    return () => { cancelled = true; clearTimeout(probe); if (destroy) destroy(); destroy = null; r.removeAttribute("data-sp-reduced"); };
  }, [flow, items, hold, endScale, blurPx, liftPx, fadePortion, midFade, scrub, priorityStart]);

  const style = {
    "--sp-ratio": ratio, "--sp-fit": fit,
    ...(color(p.sectionBg) ? { "--sp-bg": color(p.sectionBg) } : {}),
    ...(color(p.cardBg) ? { "--sp-card": color(p.cardBg) } : {}),
  } as React.CSSProperties;
  const bg = p.bgImage && p.bgImage.src ? p.bgImage.src : "";
  const sideOf = (it: StackPanelItem) => (it.side === "left" ? "left" : "right");
  const btnOf = (it: StackPanelItem, i: number) => {
    const b = (it.button || "Auto").toLowerCase();
    const v = b.startsWith("auto") ? AUTO_BUTTON[i % AUTO_BUTTON.length].toLowerCase() : b;
    if (v.startsWith("none")) return "";
    if (v.startsWith("white")) return "white";
    if (v.startsWith("brand s")) return "brand-secondary";
    if (v.startsWith("brand p")) return "brand-primary";
    return "dark";
  };
  const accentOf = (it: StackPanelItem, i: number) => color(it.accent) || `var(${AUTO_ACCENT[i % AUTO_ACCENT.length]})`;
  const linkProps = p.ctaNewTab ? { target: "_blank", rel: "noopener" } : {};
  const titleCls = "sp_title" + (revealArmed ? " is-reveal" : "") + (titleIn ? " is-in" : "") + (p.titleShine !== false ? " is-shine" : "");

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <section ref={root} className={"sp " + (flow ? "is-flow" : "is-pinned")} style={style} data-stack-panels="">
        {bg ? <img className="sp_bg" src={bg} alt="" aria-hidden="true" loading="lazy" /> : null}
        {p.bottomFade !== false ? <div className="sp_fade" aria-hidden="true" /> : null}
        <div className="sp_wrap">
          {(hasTitle || p.subtitle) && (
            <header className="sp_head">
              {hasTitle ? <h2 ref={titleRef} className={titleCls}>{mark(titleText, { breaks: true, shine: p.titleShine !== false ? shineWord : "" })}</h2> : null}
              {p.subtitle ? <p className="sp_sub">{p.subtitle}</p> : null}
            </header>
          )}
          <div className="sp_stack" ref={stack}>
            {items.map((it, i) => {
              const btn = btnOf(it, i);
              return (
                <div key={i} className="sp_panel" data-sp-panel="" data-side={sideOf(it)} style={{ "--sp-accent": accentOf(it, i) } as React.CSSProperties}>
                  <div className="sp_inner" data-sp-inner="">
                    <div className="sp_text">
                      <div className="sp_rt">
                        {it.heading || it.headingAccent ? (
                          <h3 className="sp_h">{mark(it.heading || "")}{it.headingAccent ? <>{it.heading ? " " : ""}<em>{it.headingAccent}</em></> : null}</h3>
                        ) : null}
                        {it.body ? <p className="sp_p">{mark(it.body)}</p> : null}
                      </div>
                      {btn && ctaLabel ? (
                        <div className="sp_cta">
                          <a className="sp_btn" data-style={btn} href={ctaUrl || "#"} aria-label={ctaLabel} {...linkProps}><StaggerLabel text={ctaLabel} /></a>
                        </div>
                      ) : null}
                    </div>
                    <Media poster={it.poster || it.image} alt={it.imageAlt} video={it.video} eager={i === 0} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export default StackPanels;
