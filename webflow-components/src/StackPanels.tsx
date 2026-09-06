/*!
 * StackPanels (Code Component) — React port of js/components/stack-panels.js
 * v1.4.0 + stack-panels.css v1.0.1 + the [data-text-fill] heading from
 * js/effects/scroll-fx.js ("Built to resolve, not just respond").
 *
 * Scrollytelling: every panel but the last pins (pinSpacing:false); as the
 * next panel slides up over it the pinned one holds, then scales down, dims,
 * blurs and lifts away (hold / scale / blur / lift / fade props). Panels
 * taller than the viewport get the "fake-scroll" phase first (inner content
 * translates up) so nothing is skipped. GSAP + ScrollTrigger come from the
 * site's globals; without them, under prefers-reduced-motion, or when an
 * ancestor carries a transform/filter (pin blocker) the panels simply read
 * top to bottom. On PHONES (≤767px) the effect is off by default, exactly
 * like v1.4.0 — plain flow.
 *
 * MEDIA (the mobile "shifting" fix): each panel's media sits in a box with a
 * FIXED aspect ratio, so an <img> or <video> arriving late never changes the
 * panel's height. A late height change is what broke phones: ScrollTrigger
 * had measured the pins against the short panel, the video then grew the
 * panel, and every pin start/end was stale → jumps. Videos are muted,
 * playsinline, loop, preload="metadata", get their src only when they come
 * near the viewport, play only while visible, and use the panel image as
 * poster. A panel height change that still happens (fonts, rich text) is
 * caught by a ResizeObserver → debounced ScrollTrigger.refresh().
 */

import * as React from "react";

export interface StackPanelItem {
  html: string;
  node?: React.ReactNode;
  image?: string;
  imageAlt?: string;
  video?: string;
  /** "auto" | "left" | "right" — media side ("auto" alternates: 1st right, 2nd left…) */
  side?: string;
}

type N = 1 | 2 | 3 | 4 | 5 | 6;
type ItemKey = `i${N}${"Content" | "Video" | "Side"}`;
type ImgProp = string | { src?: string; url?: string; alt?: string } | null | undefined;

export interface StackPanelsProps extends Partial<Record<ItemKey, unknown>> {
  items?: StackPanelItem[];
  i1Image?: ImgProp; i2Image?: ImgProp; i3Image?: ImgProp; i4Image?: ImgProp; i5Image?: ImgProp; i6Image?: ImgProp;

  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** heading words fill in (dim → full) while scrolling through the viewport */
  titleFill?: boolean;

  /** "4:3" | "16:10" | "16:9" | "3:2" | "1:1" */
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
  /** run the stacking effect on phones too (default off = plain flow) */
  mobileEffect?: boolean;

  bgImage?: { src: string; alt?: string };
  sectionBg?: string;
  cardBg?: string;
  bottomFade?: boolean;
}

export const DEFAULT_ITEMS: StackPanelItem[] = [
  { html: "<h3>Hybrid NLU + LLM</h3><p>Structured, regulated requests get the precision of deterministic workflows; open-ended ones get the flexibility of LLM reasoning, so you're never paying LLM costs for a simple request.</p>" },
  { html: "<h3>Advanced routing &amp; multi-agent orchestration</h3><p>Every conversation reaches the right specialist agent from the first message, even when the request shifts mid-conversation, without the customer noticing the handoff.</p><p>Supervisor and sub-agent design mirrors how your teams are already structured, keeping each agent narrow and focused instead of overloading one bot with every tool.</p>" },
  { html: "<h3>Agent builder</h3><p>Describe what you need in plain language, and Agent Builder asks the right business questions, then generates the full design (instructions, tools, persona, architecture) for your approval before anything is created.</p>" },
  { html: "<h3>RAG-based knowledge retrieval</h3><p>Agents pull answers directly from your knowledge base, including tables, charts, and scanned documents, so responses stay grounded in what your business actually knows.</p>" },
  { html: "<h3>Omnichannel, always on, connected to your systems</h3><p>The same AI agent handles voice, chat, and messaging under one architecture, and can place outbound calls to follow up proactively, not just wait for customers to reach out.</p><p>Agents take real action through API integrations, connect to tools like Google Sheets, Outlook, and Slack, and automatically update your CRM or open tickets once a conversation ends.</p>" },
];

/* ── helpers ─────────────────────────────────────────────────────────── */
type STi = { kill(): void; refresh(): void; start: number; end: number };
type Tl = { to: (t: unknown, v: Record<string, unknown>) => Tl; fromTo: (t: unknown, a: Record<string, unknown>, b: Record<string, unknown>) => Tl; kill(): void; scrollTrigger?: STi };
type G = {
  registerPlugin: (p: unknown) => void;
  timeline: (v: Record<string, unknown>) => Tl;
  fromTo: (t: unknown, a: Record<string, unknown>, b: Record<string, unknown>) => { kill(): void; scrollTrigger?: STi };
  set: (t: unknown, v: Record<string, unknown>) => void;
};
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
const hasText = (html: string) => /[^\s]/.test(html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "));
function richText(v: unknown): { html: string; node?: React.ReactNode } | null {
  if (v == null || v === false) return null;
  if (typeof v === "string") return { html: v };
  if (typeof v === "number") return { html: String(v) };
  if (React.isValidElement(v) || Array.isArray(v)) return { html: "node", node: v as React.ReactNode };
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["html", "value", "text", "content"]) if (typeof o[k] === "string") return { html: o[k] as string };
    if (o.children != null) return { html: "node", node: o.children as React.ReactNode };
  }
  return null;
}
/** pin uses position:fixed — a transform/filter/perspective on any ancestor re-bases it */
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
  --sp-muted:var(--color-text--muted,#66666e);
  --sp-radius:var(--radius--lg,1rem);
  --sp-gap:var(--gap--2xl,clamp(3rem,6vw,5rem));
  --sp-ratio:4/3;
  --sp-fit:cover;
  --sp-shadow-rgb:var(--shadow-rgb,15 23 42);
  position:relative;overflow:hidden;font-family:var(--sp-font);color:var(--sp-ink);background:var(--sp-bg);
  padding:var(--section--py-2,clamp(4rem,10vw,8rem)) var(--view--px,var(--spacing--6,1.5rem));
}
.sp_bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
.sp_fade{position:absolute;left:0;right:0;bottom:0;height:10%;z-index:1;pointer-events:none;background:linear-gradient(0deg,var(--sp-bg),transparent)}
.sp_wrap{position:relative;z-index:2;max-width:var(--container--2xl,96rem);margin:0 auto;display:flex;flex-direction:column;gap:var(--sp-gap)}
.sp_head{display:flex;flex-direction:column;align-items:center;gap:1rem;text-align:center;max-width:52rem;margin:0 auto;position:relative;z-index:20}
.sp_eyebrow{margin:0;font-size:.8125rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--sp-muted)}
.sp_title{margin:0;font-size:var(--heading--h2,clamp(2rem,4.2vw,3.25rem));line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--semibold,600);text-wrap:balance}
.sp_title span{display:inline}
.sp_sub{margin:0;font-size:1.0625rem;line-height:1.5;color:var(--sp-muted);max-width:40rem;text-wrap:balance}
.sp_stack{position:relative;display:flex;flex-direction:column;gap:var(--sp-gap);z-index:20}
.sp_panel{position:relative;overflow:hidden;border-radius:var(--sp-radius);background:var(--sp-card);z-index:1;
  transform-origin:center center;will-change:transform,opacity,filter;
  box-shadow:0 1px 2px -1px rgb(var(--sp-shadow-rgb)/.06),0 6px 14px -6px rgb(var(--sp-shadow-rgb)/.1),0 22px 40px -24px rgb(var(--sp-shadow-rgb)/.14)}
.sp_panel~.sp_panel{z-index:2}
.sp_inner{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);align-items:stretch;gap:clamp(1.5rem,3vw,2.5rem);will-change:transform}
.sp_text{display:flex;flex-direction:column;justify-content:center;padding:clamp(1.75rem,4vw,3.25rem);min-width:0}
.sp_rt{font-size:1rem;line-height:var(--leading--relaxed,1.65);color:var(--sp-muted)}
.sp_rt>*{margin:0}
.sp_rt>*+*{margin-top:.875rem}
.sp_rt h1,.sp_rt h2,.sp_rt h3,.sp_rt h4{font-size:var(--text--3xl,clamp(1.5rem,2.4vw,2rem));line-height:var(--leading--tight,1.15);font-weight:var(--font-weight--medium,500);color:var(--sp-ink)}
.sp_rt h1+*,.sp_rt h2+*,.sp_rt h3+*,.sp_rt h4+*{margin-top:1.125rem}
.sp_rt strong{color:var(--sp-ink);font-weight:600}
.sp_rt ul,.sp_rt ol{padding-left:1.25rem}
.sp_rt a{color:var(--interactive--color-primary-base,var(--brand-primary--500,#EC008C))}
.sp_media{position:relative;min-width:0;margin:clamp(2rem,5vw,4rem) 0 0 clamp(1rem,3vw,2rem);
  aspect-ratio:var(--sp-ratio);border-radius:var(--sp-radius) var(--sp-radius) 0 0;overflow:hidden;background:rgb(var(--sp-shadow-rgb)/.06);
  /* a panel is overflow:hidden, so the media bleeds off the card's bottom edge on purpose */
  transform:translateZ(0)}
.sp_panel[data-side="right"] .sp_media{margin:clamp(2rem,5vw,4rem) clamp(1rem,3vw,2rem) 0 0}
.sp_panel[data-side="left"] .sp_media{order:-1}
.sp_media img,.sp_media video{position:absolute;inset:0;width:100%;height:100%;object-fit:var(--sp-fit);display:block}
.sp_media video{background:transparent}
.sp_empty{position:absolute;inset:0;background:linear-gradient(135deg,rgb(var(--sp-shadow-rgb)/.06),rgb(var(--sp-shadow-rgb)/.12))}
.sp.is-flow .sp_panel{will-change:auto;overflow:hidden}
@media (max-width:991px){
  .sp_inner{grid-template-columns:minmax(0,1fr);gap:0}
  .sp_panel[data-side="left"] .sp_media{order:1}
  .sp_media,.sp_panel[data-side="right"] .sp_media{margin:0 clamp(1rem,4vw,2rem);aspect-ratio:var(--sp-ratio)}
  .sp_text{padding:clamp(1.5rem,5vw,2.5rem) clamp(1.25rem,5vw,2.5rem) clamp(1.25rem,4vw,2rem)}
}
@media (max-width:767px){
  .sp{padding-inline:var(--view--px,1rem)}
  .sp_rt{font-size:.9375rem}
  .sp_rt h1,.sp_rt h2,.sp_rt h3,.sp_rt h4{font-size:1.375rem}
  .sp_media,.sp_panel[data-side="right"] .sp_media{margin:0 1rem}
}
@media (prefers-reduced-motion:reduce){.sp_panel{will-change:auto}}
`;

/* ── Media: fixed-ratio box; video src only near the viewport, plays only while visible ── */
function Media({ image, alt, video, eager }: { image?: string; alt?: string; video?: string; eager?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const vref = React.useRef<HTMLVideoElement>(null);
  const [near, setNear] = React.useState(false);

  React.useEffect(() => {
    if (!video || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); } }, { rootMargin: "150% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [video]);

  React.useEffect(() => {
    const v = vref.current; if (!v || !near) return;
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause(); });
    }, { threshold: 0.15 });
    io.observe(v);
    return () => { io.disconnect(); v.pause(); };
  }, [near]);

  return (
    <div className="sp_media" ref={ref}>
      {!image && !video ? <span className="sp_empty" aria-hidden="true" /> : null}
      {image && !(video && near) ? <img src={image} alt={alt || ""} loading={eager ? "eager" : "lazy"} decoding="async" /> : null}
      {video && near ? (
        <video ref={vref} src={video} poster={image || undefined} muted playsInline loop autoPlay preload="metadata" aria-hidden="true" tabIndex={-1} disablePictureInPicture />
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
  const items = React.useMemo<StackPanelItem[]>(() => {
    if (p.items && p.items.length) return p.items;
    const px = p as unknown as Record<string, unknown>;
    const out: StackPanelItem[] = []; let any = false;
    for (let n = 1; n <= 6; n++) {
      const raw = px["i" + n + "Content"]; if (raw !== undefined) any = true;
      const rt = richText(raw); if (!rt) continue;
      const html = rt.html.trim(); if (!rt.node && (!html || !hasText(html))) continue;
      const im = px["i" + n + "Image"] as ImgProp;
      out.push({ html, node: rt.node, image: imgSrc(im), imageAlt: imgAlt(im), video: String(px["i" + n + "Video"] || "").trim(), side: String(px["i" + n + "Side"] || "Auto").toLowerCase() });
    }
    return out.length || any ? out : DEFAULT_ITEMS;
  }, [p]);

  const hold = p.hold == null ? 0.5 : Math.min(0.95, Math.max(0, p.hold));
  const endScale = p.scale == null ? 0.7 : Math.min(1, Math.max(0.2, p.scale));
  const blurPx = p.blur == null ? 4 : Math.max(0, p.blur);
  const liftPx = p.lift == null ? 24 : Math.max(0, p.lift);
  const fadePortion = p.fadePortion == null ? 0.1 : Math.min(0.9, Math.max(0.02, p.fadePortion));
  const midFade = p.midFade == null ? 0.5 : Math.min(1, Math.max(0, p.midFade));
  const scrub: number | boolean = p.scrub == null || p.scrub <= 0 ? true : p.scrub;
  const priorityStart = p.priorityStart == null ? 0 : p.priorityStart;
  const mobileEffect = !!p.mobileEffect;
  const titleFill = p.titleFill !== false;
  const ratio = { "16:10": "16/10", "16:9": "16/9", "3:2": "3/2", "1:1": "1/1" }[(p.mediaRatio || "4:3") as string] || "4/3";
  const fit = (p.mediaFit || "Cover").toLowerCase().startsWith("contain") ? "contain" : "cover";

  const root = React.useRef<HTMLElement>(null);
  const stack = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  const [flow, setFlow] = React.useState(true);           // true = plain flow (no pin)

  /* mode: pin unless reduced motion / phone (unless forced) / no gsap */
  React.useEffect(() => {
    const red = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mob = window.matchMedia(`(max-width: ${MOBILE_BP}px)`);
    const apply = () => setFlow(!gs() || red.matches || (mob.matches && !mobileEffect) || items.length < 2);
    apply();
    red.addEventListener("change", apply); mob.addEventListener("change", apply);
    return () => { red.removeEventListener("change", apply); mob.removeEventListener("change", apply); };
  }, [mobileEffect, items.length]);

  /* ── pins (port of setupPins) ── */
  React.useEffect(() => {
    if (flow) return;
    const g = gs(); const r = root.current, s = stack.current; if (!g || !r || !s) return;
    g.gsap.registerPlugin(g.ST);
    const panels = Array.from(s.querySelectorAll<HTMLElement>("[data-sp-panel]"));
    if (panels.length < 2) return;

    let cancelled = false;
    let probe = 0, tries = 0;
    let destroy: (() => void) | null = null;

    const build = () => {
      panels.forEach((panel, idx) => { if (!panel.style.zIndex) panel.style.zIndex = String(idx + 1); });
      const tls: Tl[] = [];
      const marginRefreshers: Array<() => void> = [];

      panels.slice(0, -1).forEach((panel, i) => {
        const inner = panel.querySelector<HTMLElement>("[data-sp-inner]")!;
        const windowH = window.innerHeight;
        const diff = inner.offsetHeight - windowH;
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
        const next = panels[i + 1];
        const uncovered = next ? 1 - Math.min(1, next.offsetHeight / windowH) : 0;
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

      // resize while scrolling → ScrollTrigger defers its own refresh; close that stale window
      let rt = 0; let lastW = window.innerWidth;
      const onResize = () => {
        if (window.innerWidth === lastW && window.innerWidth <= MOBILE_BP) return;   // phone URL bar: height-only
        lastW = window.innerWidth;
        clearTimeout(rt); rt = window.setTimeout(() => refreshST(g.ST), 150);
      };
      window.addEventListener("resize", onResize);
      // late content growth (fonts, rich text, images) → refresh
      let first = true, ro2 = 0;
      const ro = new ResizeObserver(() => { if (first) { first = false; return; } clearTimeout(ro2); ro2 = window.setTimeout(() => refreshST(g.ST), 120); });
      ro.observe(s);

      destroy = () => {
        window.removeEventListener("resize", onResize); clearTimeout(rt); clearTimeout(ro2); ro.disconnect();
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

  /* ── title word fill (scroll-fx text-fill) ── */
  const words = React.useMemo(() => (p.title || "").split(/\s+/).filter(Boolean), [p.title]);
  React.useEffect(() => {
    const g = gs(); const h = titleRef.current;
    if (!titleFill || !g || !h || words.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    g.gsap.registerPlugin(g.ST);
    const spans = Array.from(h.querySelectorAll("span"));
    const overlap = 0.6, each = 1 / (1 + (spans.length - 1) * overlap);
    const tw = g.gsap.fromTo(spans, { opacity: 0.18 }, { opacity: 1, ease: "none", duration: each, stagger: each * overlap, scrollTrigger: { trigger: h, start: "top 85%", end: "top 35%", scrub: 0.5 } });
    return () => { if (tw.scrollTrigger) tw.scrollTrigger.kill(); tw.kill(); g.gsap.set(spans, { clearProps: "opacity" }); };
  }, [titleFill, words]);

  const style = {
    "--sp-ratio": ratio, "--sp-fit": fit,
    ...(color(p.sectionBg) ? { "--sp-bg": color(p.sectionBg) } : {}),
    ...(color(p.cardBg) ? { "--sp-card": color(p.cardBg) } : {}),
  } as React.CSSProperties;
  const bg = imgSrc(p.bgImage);
  const sideOf = (it: StackPanelItem, i: number) => (it.side === "left" || it.side === "right" ? it.side : i % 2 === 0 ? "right" : "left");

  return (
    <>
      <style>{CSS}</style>
      <section ref={root} className={"sp " + (flow ? "is-flow" : "is-pinned")} style={style} data-stack-panels="">
        {bg ? <img className="sp_bg" src={bg} alt="" aria-hidden="true" loading="eager" /> : null}
        {p.bottomFade !== false ? <div className="sp_fade" aria-hidden="true" /> : null}
        <div className="sp_wrap">
          {(p.eyebrow || p.title || p.subtitle) && (
            <header className="sp_head">
              {p.eyebrow ? <p className="sp_eyebrow">{p.eyebrow}</p> : null}
              {p.title ? (
                <h2 className="sp_title" ref={titleRef} aria-label={p.title}>
                  {words.map((w, i) => <React.Fragment key={i}>{i ? " " : ""}<span aria-hidden="true">{w}</span></React.Fragment>)}
                </h2>
              ) : null}
              {p.subtitle ? <p className="sp_sub">{p.subtitle}</p> : null}
            </header>
          )}
          <div className="sp_stack" ref={stack}>
            {items.map((it, i) => (
              <div key={i} className="sp_panel" data-sp-panel="" data-side={sideOf(it, i)}>
                <div className="sp_inner" data-sp-inner="">
                  <div className="sp_text">
                    {it.node ? <div className="sp_rt">{it.node}</div> : <div className="sp_rt" dangerouslySetInnerHTML={{ __html: it.html }} />}
                  </div>
                  <Media image={it.image} alt={it.imageAlt} video={it.video} eager={i === 0} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default StackPanels;
