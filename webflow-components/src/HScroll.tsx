/*!
 * HScroll (Code Component) — React port of js/components/h-scroll.js v2.2.4 +
 * js/effects/hover-reveal.js v1.0.0 ("Why SESTEK" card strip).
 *
 * Desktop (≥992px, real pointer, motion allowed, gsap + ScrollTrigger on the
 * page): the section pins for one screen and vertical scroll drives the card
 * track to the left, 1px for 1px (× `speed`), snapping to card edges. A thin
 * progress line + counter sits under the cards.
 *
 * Tablet / mobile, any touch device, reduced motion, or no gsap: the SAME DOM
 * is a native scroll-snap carousel (no Swiper): `spvTablet` / `spvMobile`
 * cards per view, gutter from the site tokens, arrows + one dot per card.
 * Card widths are pure CSS (no inline px, no zoom) so nothing drifts on
 * resize / URL-bar changes — that was the source of the mobile misalignment
 * in the Swiper version (zoom:.68 on the card fought Swiper's measurements).
 *
 * Hover reveal (optional): a colour layer expands from the pointer's entry
 * point (CSS clip-path transition, origin written by JS), shrinks toward the
 * exit point; text colours may shift with it. Touch: tap toggles, tapping
 * outside closes. Keyboard focus reveals too.
 *
 * Header (title + subtitle) is in normal flow above the cards — no absolute
 * overlap, so it never collides with the cards on short viewports.
 */

import * as React from "react";

export interface HScrollItem {
  /** rich text HTML — heading + paragraph(s) in one field (h3 + p, like a Webflow Rich Text) */
  html: string;
  icon?: string;
  iconAlt?: string;
}

type ItemKey = `i${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}Content`;
type ImgProp = string | { src?: string; url?: string; alt?: string } | null | undefined;

export interface HScrollProps extends Partial<Record<ItemKey, string>> {
  items?: HScrollItem[];
  i1Icon?: ImgProp; i2Icon?: ImgProp; i3Icon?: ImgProp; i4Icon?: ImgProp;
  i5Icon?: ImgProp; i6Icon?: ImgProp; i7Icon?: ImgProp; i8Icon?: ImgProp;

  eyebrow?: string;
  title?: string;
  subtitle?: string;
  /** "Center" | "Left" */
  headerAlign?: string;

  /** desktop card width in px (capped to the available width) */
  cardWidth?: number;
  /** gap between cards in px */
  gap?: number;
  /** cards per view ≤991px / <768px (fractional = next card peeks) */
  spvTablet?: number;
  spvMobile?: number;
  /** arrows + dots in carousel mode */
  showNav?: boolean;
  /** progress line + counter in pinned mode */
  showProgress?: boolean;

  /** ScrollTrigger scrub lag (s) */
  scrub?: number;
  /** scroll distance multiplier (>1 slower / longer) */
  speed?: number;
  snap?: boolean;
  /** ScrollTrigger refreshPriority */
  priority?: number;

  hoverReveal?: boolean;
  /** token ("--brand-secondary--600"), var() or colour */
  revealBg?: string;
  revealText?: string;
  revealDuration?: number;

  /** "Dark" | "Light" */
  theme?: string;
  sectionBg?: string;
  cardBg?: string;
  cardBorder?: string;
}

export const DEFAULT_ITEMS: HScrollItem[] = [
  { html: "<h3>Technology we own</h3><p>Speech recognition, text-to-speech, NLU, sentiment, and PII masking are all built in-house, refined over 25+ years of R&amp;D, so you're never dependent on Google, Amazon, or Microsoft.</p>" },
  { html: "<h3>Hybrid by design</h3><p>NLU precision and LLM reasoning work under one architecture, so enterprises with mature NLU deployments migrate gradually, alongside what already works, not all at once.</p>" },
  { html: "<h3>Proven before production</h3><p>An AI testing framework simulates real customer conversations against your own success criteria before launch, and production dashboards keep tracking performance after it.</p>" },
  { html: "<h3>Enterprise-grade</h3><p>Three-layer security, PII masking, and SSO/LDAP support meet enterprise IT requirements, with cloud, on-premise, or hybrid deployment across eight or more LLM providers and no vendor lock-in.</p>" },
  { html: "<h3>Connected intelligence</h3><p>Connect Agentic AI, Conversational Intelligence, and Agent Copilot across the SESTEK Agentic CX Suite for consistent, context-aware support across every interaction.</p>" },
];

/** rich text with no visible text (Webflow sends "<p></p>" for an emptied field) = hidden card */
const hasText = (html: string) => /[^\s]/.test(html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " "));

/* ── helpers ─────────────────────────────────────────────────────────── */
type ST = {
  kill(): void; refresh(): void; progress: number; start: number; end: number;
};
type G = {
  registerPlugin: (p: unknown) => void;
  to: (t: unknown, v: Record<string, unknown>) => { kill(): void; scrollTrigger?: ST };
  set: (t: unknown, v: Record<string, unknown>) => void;
};
function gs(): { gsap: G; ScrollTrigger: unknown } | null {
  const w = window as unknown as { gsap?: G; ScrollTrigger?: unknown };
  return w.gsap && w.ScrollTrigger ? { gsap: w.gsap, ScrollTrigger: w.ScrollTrigger } : null;
}
const PIN_MQ = "(min-width: 992px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function color(v: string | undefined, fallback: string): string {
  const s = (v || "").trim();
  if (!s) return fallback;
  if (s.startsWith("--")) return `var(${s})`;
  return s;
}
function imgSrc(v: ImgProp): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  return v.src || v.url || "";
}
function imgAlt(v: ImgProp): string {
  return v && typeof v === "object" && v.alt ? v.alt : "";
}
const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));

/* ── CSS ─────────────────────────────────────────────────────────────── */
const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.hs{
  --hs-gutter:max(var(--view--px,var(--spacing--6,1.5rem)),calc((100% - var(--container--2xl,96rem)) / 2));
  --hs-radius:var(--radius--lg,1rem);
  --hs-font:var(--font--primary,var(--font--body,inherit));
  --hs-reveal-d:.7s;
  position:relative;width:100%;overflow:hidden;font-family:var(--hs-font);
  background:var(--hs-bg);color:var(--hs-ink);
}
.hs[data-theme="dark"]{
  --hs-bg:var(--brand-secondary--900,#0b1220);
  --hs-card:var(--brand-secondary--700,#1c2a44);
  --hs-line:var(--brand-secondary--800,#14213a);
  --hs-line-active:var(--brand-secondary--500,#3a5280);
  --hs-ink:var(--color-text--inverted,#fff);
  --hs-muted:color-mix(in srgb,var(--hs-ink) 68%,transparent);
  --hs-reveal:var(--brand-secondary--600,#2a3d63);
  --hs-reveal-text-default:inherit;
}
.hs[data-theme="light"]{
  --hs-bg:var(--surface--base,#fff);
  --hs-card:var(--neutral--50,#f6f6f7);
  --hs-line:var(--neutral--200,#e6e6e9);
  --hs-line-active:var(--brand-primary--500,#EC008C);
  --hs-ink:var(--color-text--base,#111);
  --hs-muted:var(--color-text--muted,#66666e);
  --hs-reveal:var(--brand-primary--500,#EC008C);
  --hs-reveal-text-default:#fff;
}
.hs_viewport{position:relative;display:flex;flex-direction:column;justify-content:center;overflow:hidden;
  padding-block:clamp(3rem,7vw,5rem)}
.hs.is-pinned .hs_viewport{height:100svh;min-height:100svh;padding-block:clamp(2rem,5vh,4rem)}
.hs_head{display:flex;flex-direction:column;gap:.75rem;align-items:center;text-align:center;width:100%;
  max-width:var(--container--2xl,96rem);margin:0 auto clamp(2rem,5vh,3.5rem);padding-inline:var(--hs-gutter)}
.hs_head>*{max-width:38rem}
.hs[data-align="left"] .hs_head{align-items:flex-start;text-align:left}
.hs_eyebrow{margin:0;font-size:.8125rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--hs-muted)}
.hs_title{margin:0;font-size:var(--heading--h2,clamp(2rem,4vw,3rem));line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--semibold,600);text-wrap:balance}
.hs_sub{margin:0;font-size:1.0625rem;line-height:1.5;color:var(--hs-muted);text-wrap:balance}
.hs_body{position:relative;width:100%;min-width:0}
.hs_track{display:flex;align-items:stretch;gap:var(--hs-gap);width:max-content;padding-inline:var(--hs-gutter);will-change:transform}
/* carousel = native scroll-snap scroller (no Swiper) */
.hs.is-carousel .hs_track{width:auto;max-width:100%;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;
  scroll-padding-inline:var(--hs-gutter);overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;
  scrollbar-width:none;will-change:auto;padding-bottom:2px}
.hs.is-carousel .hs_track::-webkit-scrollbar{display:none}
.hs_card{position:relative;flex:0 0 auto;width:var(--hs-card-w);min-height:clamp(17rem,38vh,24rem);
  display:flex;flex-direction:column;gap:1.5rem;padding:clamp(1.5rem,2.2vw,2rem);
  border:1px solid var(--hs-line);border-radius:var(--hs-radius);background:var(--hs-card);
  overflow:hidden;-webkit-tap-highlight-color:transparent;outline:none;
  transition:border-color .45s ease,transform .45s ease}
.hs.is-carousel .hs_card{scroll-snap-align:start;width:calc((100% - var(--hs-gaps-t) * var(--hs-gap)) / var(--hs-spv-t))}
.hs.is-carousel.is-desktop .hs_card{width:min(var(--hs-card-w),100%)}
@media (max-width:767px){.hs.is-carousel .hs_card{width:calc((100% - var(--hs-gaps-m) * var(--hs-gap)) / var(--hs-spv-m))}}
.hs_card.is-active{border-color:var(--hs-line-active)}
.hs_card:focus-visible{outline:2px solid var(--hs-line-active);outline-offset:3px}
.hs_reveal{position:absolute;inset:0;border-radius:inherit;background:var(--hs-reveal);pointer-events:none;
  clip-path:circle(0px at 50% 50%);will-change:clip-path}
.hs_card>:not(.hs_reveal){position:relative;z-index:1}
.hs_top{display:flex;align-items:center;justify-content:space-between;gap:1rem}
.hs_icon{width:2.5rem;height:2.5rem;object-fit:contain;display:block}
.hs_num{font-size:.8125rem;font-weight:600;letter-spacing:.08em;font-variant-numeric:tabular-nums;color:var(--hs-muted);
  transition:color var(--hs-reveal-d) ease}
.hs_content{margin-top:auto;font-size:.9375rem;line-height:var(--leading--relaxed,1.6)}
/* rich text: heading + paragraphs in one field */
.hs_content>*{margin:0}
.hs_content>*+*{margin-top:.625rem}
.hs_content h1,.hs_content h2,.hs_content h3,.hs_content h4,.hs_content h5,.hs_content h6{font-size:var(--heading--h4,1.375rem);line-height:var(--leading--normal,1.25);font-weight:var(--font-weight--medium,500);color:var(--hs-ink);
  transition:color calc(var(--hs-reveal-d) * .85) ease .05s}
.hs_content p,.hs_content li{color:var(--hs-muted);transition:color calc(var(--hs-reveal-d) * .85) ease .09s}
.hs_content ul,.hs_content ol{padding-left:1.25rem}
.hs_content li+li{margin-top:.25rem}
.hs_content a{color:inherit;text-decoration:underline;text-underline-offset:.15em}
.hs_content strong{color:var(--hs-ink);font-weight:600}
.hs_content img{max-width:100%;height:auto;border-radius:.5rem}
.hs_card.is-revealed .hs_content h1,.hs_card.is-revealed .hs_content h2,.hs_card.is-revealed .hs_content h3,.hs_card.is-revealed .hs_content h4,.hs_card.is-revealed .hs_content h5,.hs_card.is-revealed .hs_content h6,.hs_card.is-revealed .hs_content strong,.hs_card.is-revealed .hs_num{color:var(--hs-reveal-text,var(--hs-reveal-text-default))}
.hs_card.is-revealed .hs_content p,.hs_card.is-revealed .hs_content li{color:var(--hs-reveal-text,var(--hs-muted))}
/* progress (pinned) */
.hs_progress{display:none;align-items:center;gap:1.25rem;width:100%;max-width:var(--container--2xl,96rem);margin:clamp(1.5rem,4vh,2.5rem) auto 0;padding-inline:var(--hs-gutter)}
.hs.is-pinned .hs_progress{display:flex}
.hs_count{font-size:.8125rem;font-weight:600;letter-spacing:.08em;font-variant-numeric:tabular-nums;color:var(--hs-muted);white-space:nowrap}
.hs_count b{color:var(--hs-ink);font-weight:inherit}
.hs_bar{position:relative;flex:1;height:1px;background:var(--hs-line);overflow:hidden}
.hs_bar i{position:absolute;inset:0;background:var(--hs-ink);transform-origin:left;transform:scaleX(var(--hs-progress,0));transition:transform .15s linear}
/* nav (carousel) */
.hs_nav{display:none;align-items:center;justify-content:space-between;gap:1rem;width:100%;max-width:var(--container--2xl,96rem);
  margin:clamp(1.5rem,4vw,2rem) auto 0;padding-inline:var(--hs-gutter)}
.hs.is-carousel .hs_nav{display:flex}
.hs_nav.is-locked{display:none}
.hs_dots{display:flex;align-items:center;gap:.5rem}
.hs_dot{width:.5rem;height:.5rem;padding:0;border:0;border-radius:999px;background:currentColor;opacity:.28;cursor:pointer;
  transition:opacity .2s ease,width .2s ease}
.hs_dot.is-active{opacity:1;width:1.25rem}
.hs_dot:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.hs_arrows{display:flex;gap:.5rem}
.hs_arrow{display:inline-flex;align-items:center;justify-content:center;width:2.75rem;height:2.75rem;padding:0;border:1px solid var(--hs-line-active);
  border-radius:999px;background:transparent;color:inherit;cursor:pointer;transition:opacity .2s ease,background .2s ease,border-color .2s ease}
.hs_arrow:hover{background:var(--hs-card)}
.hs_arrow:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.hs_arrow svg{width:1.25rem;height:1.25rem;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hs_arrow[disabled]{opacity:.3;cursor:default;background:transparent}
@media (max-width:991px){
  .hs_head{margin-bottom:clamp(1.75rem,5vw,2.5rem)}
  .hs_card{min-height:16rem;gap:1.25rem}
}
@media (max-width:767px){
  .hs_card{min-height:15rem;padding:1.25rem 1.25rem 1.375rem}
  .hs_icon{width:2rem;height:2rem}
  .hs_content h1,.hs_content h2,.hs_content h3,.hs_content h4,.hs_content h5,.hs_content h6{font-size:1.1875rem}
  .hs_sub{font-size:1rem}
  .hs_arrow{width:2.5rem;height:2.5rem}
}
@media (prefers-reduced-motion:reduce){.hs *{transition-duration:0s!important}}
`;

/* ── Card with hover reveal ──────────────────────────────────────────── */
function Card({ item, index, reveal, duration, hoverable, active, onFocusCard }: {
  item: HScrollItem; index: number; reveal: boolean; duration: number; hoverable: boolean; active: boolean;
  onFocusCard: (i: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const layer = React.useRef<HTMLSpanElement>(null);
  const open = React.useRef(false);

  const origin = React.useCallback((e?: { clientX?: number; clientY?: number } | null) => {
    const el = ref.current!; const r = el.getBoundingClientRect();
    let x = e && typeof e.clientX === "number" ? e.clientX - r.left : r.width / 2;
    let y = e && typeof e.clientY === "number" ? e.clientY - r.top : r.height / 2;
    x = Math.max(0, Math.min(r.width, x)); y = Math.max(0, Math.min(r.height, y));
    const R = Math.ceil(Math.max(Math.hypot(x, y), Math.hypot(r.width - x, y), Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y)));
    return { x, y, R };
  }, []);

  const show = React.useCallback((e?: { clientX?: number; clientY?: number } | null) => {
    if (!reveal || open.current || !ref.current || !layer.current) return;
    open.current = true;
    const o = origin(e); const l = layer.current;
    l.style.transition = "none";
    l.style.clipPath = `circle(0px at ${o.x}px ${o.y}px)`;
    void l.offsetWidth;                                         // commit the origin before animating
    l.style.transition = `clip-path ${duration}s cubic-bezier(.16,1,.3,1)`;
    l.style.clipPath = `circle(${o.R}px at ${o.x}px ${o.y}px)`;
    ref.current.classList.add("is-revealed");
  }, [reveal, duration, origin]);

  const hide = React.useCallback((e?: { clientX?: number; clientY?: number } | null) => {
    if (!open.current || !ref.current || !layer.current) return;
    open.current = false;
    const o = origin(e); const l = layer.current;
    l.style.transition = `clip-path ${duration * 0.8}s cubic-bezier(.45,0,.55,1)`;
    l.style.clipPath = `circle(0px at ${o.x}px ${o.y}px)`;      // shrinks toward the exit point
    ref.current.classList.remove("is-revealed");
  }, [duration, origin]);

  // touch: tapping outside an open card closes it
  React.useEffect(() => {
    if (!reveal || hoverable) return;
    const onDoc = (e: Event) => {
      const path = e.composedPath ? e.composedPath() : [];
      if (open.current && ref.current && !path.includes(ref.current)) hide(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [reveal, hoverable, hide]);

  React.useEffect(() => () => { open.current = false; }, [reveal]);

  const src = item.icon || "";
  return (
    <div
      ref={ref}
      className={"hs_card" + (active ? " is-active" : "")}
      data-hs-card=""
      tabIndex={reveal ? 0 : undefined}
      onPointerEnter={hoverable ? (e) => { if (e.pointerType !== "touch") show(e); } : undefined}
      onPointerLeave={hoverable ? (e) => { if (e.pointerType !== "touch") hide(e); } : undefined}
      onClick={(e) => {
        if (!reveal) return;
        const pt = (e.nativeEvent as PointerEvent).pointerType;
        if (hoverable && pt !== "touch") return;                // mouse is handled by hover
        if (open.current) hide(e); else show(e);
      }}
      onFocus={(e) => { if (e.target === e.currentTarget) { onFocusCard(index); show(null); } }}
      onBlur={(e) => { if (!ref.current || !ref.current.contains(e.relatedTarget as Node | null)) hide(null); }}
    >
      {reveal && <span ref={layer} className="hs_reveal" aria-hidden="true" />}
      <div className="hs_top">
        {src ? <img className="hs_icon" src={src} alt={item.iconAlt || ""} loading="lazy" /> : <span className="hs_num">{pad2(index + 1)}</span>}
      </div>
      <div className="hs_content" dangerouslySetInnerHTML={{ __html: item.html }} />
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────────── */
export function HScroll(p: HScrollProps) {
  const items = React.useMemo<HScrollItem[]>(() => {
    if (p.items && p.items.length) return p.items;
    const out: HScrollItem[] = [];
    const px = p as unknown as Record<string, unknown>;
    let any = false;
    for (let n = 1; n <= 8; n++) {
      const html = ((px["i" + n + "Content"] as string) || "").trim();
      if (px["i" + n + "Content"] !== undefined) any = true;
      if (!html || !hasText(html)) continue;
      const ic = px["i" + n + "Icon"] as ImgProp;
      out.push({ html, icon: imgSrc(ic), iconAlt: imgAlt(ic) });
    }
    return out.length || any ? out : DEFAULT_ITEMS;
  }, [p]);

  const theme = (p.theme || "Dark").toLowerCase().startsWith("light") ? "light" : "dark";
  const align = (p.headerAlign || "Center").toLowerCase().startsWith("left") ? "left" : "center";
  const cardW = Math.max(200, p.cardWidth || 420);
  const gap = Math.max(0, p.gap == null ? 32 : p.gap);
  const spvT = Math.max(1, p.spvTablet || 1.4);
  const spvM = Math.max(1, p.spvMobile || 1.1);
  const scrub = p.scrub == null ? 0.5 : Math.max(0, p.scrub);
  const speed = p.speed == null ? 1 : Math.max(0.1, p.speed);
  const snapOn = p.snap !== false;
  const priority = p.priority == null ? 1 : p.priority;
  const reveal = p.hoverReveal !== false;
  const showNav = p.showNav !== false;
  const showProgress = p.showProgress !== false;

  const root = React.useRef<HTMLElement>(null);
  const body = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const stRef = React.useRef<ST | null>(null);

  const [mode, setMode] = React.useState<"pinned" | "carousel">("carousel");
  const [desktop, setDesktop] = React.useState(false);
  const [hoverable, setHoverable] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  /* mode selection — reacts to width / pointer / motion changes */
  React.useEffect(() => {
    const pin = window.matchMedia(PIN_MQ);
    const desk = window.matchMedia("(min-width: 992px)");
    const hov = window.matchMedia("(hover: hover) and (pointer: fine)");
    const red = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setMode(pin.matches && gs() ? "pinned" : "carousel");
      setDesktop(desk.matches); setHoverable(hov.matches); setReduced(red.matches);
    };
    apply();
    const mqs = [pin, desk, hov, red];
    mqs.forEach((m) => m.addEventListener("change", apply));
    return () => mqs.forEach((m) => m.removeEventListener("change", apply));
  }, []);

  const distance = React.useCallback(() => {
    const t = track.current, b = body.current;
    if (!t || !b) return 0;
    const cs = getComputedStyle(b);
    const content = b.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    return Math.max(0, t.scrollWidth - content);
  }, []);

  /* ── pinned mode: GSAP pin + scrub ── */
  React.useEffect(() => {
    if (mode !== "pinned") return;
    const g = gs(); const r = root.current, t = track.current;
    if (!g || !r || !t) return;
    g.gsap.registerPlugin(g.ScrollTrigger);
    if (distance() <= 0) { setActive(0); setProgress(0); return; }   // everything fits — nothing to scroll

    const cards = Array.from(t.querySelectorAll<HTMLElement>("[data-hs-card]"));
    let snapPts = [0];
    const computeSnapPts = () => {
      const d = distance(); if (d <= 0) return;
      const base = cards[0].offsetLeft;
      snapPts = cards.map((c) => Math.min(1, Math.max(0, (c.offsetLeft - base) / d)));
    };
    const resolve = (v: number) => {
      let best = snapPts[0], bd = Math.abs(v - snapPts[0]);
      for (let i = 1; i < snapPts.length; i++) { const d = Math.abs(v - snapPts[i]); if (d < bd) { bd = d; best = snapPts[i]; } }
      return best;
    };
    const tween = g.gsap.to(t, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: r, start: "top top",
        end: () => "+=" + distance() * speed,
        pin: true, scrub, anticipatePin: 0, invalidateOnRefresh: true, refreshPriority: priority,
        onRefresh: computeSnapPts,
        snap: snapOn ? { snapTo: resolve, duration: { min: 0.55, max: 0.9 }, ease: "power2.inOut", delay: 0.12, directional: false } : false,
        onUpdate: (self: ST) => {
          const v = resolve(self.progress);
          // cards that can't reach the left edge all clamp to 1 → the END means the last card
          const idx = v >= 1 ? cards.length - 1 : snapPts.indexOf(v);
          setActive(idx < 0 ? 0 : idx); setProgress(self.progress);
        },
        onLeaveBack: () => { setActive(0); setProgress(0); },
      },
    });
    stRef.current = tween.scrollTrigger || null;
    setActive(0); setProgress(0);

    // width changes of the track (font load, image size) → refresh the pin distance
    let first = true, raf = 0;
    const ro = new ResizeObserver(() => {
      if (first) { first = false; return; }
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => stRef.current && stRef.current.refresh());
    });
    ro.observe(t);

    return () => {
      ro.disconnect(); cancelAnimationFrame(raf);
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      g.gsap.set(t, { clearProps: "transform" });
      stRef.current = null;
    };
  }, [mode, items, cardW, gap, scrub, speed, snapOn, priority, distance]);

  /* ── carousel mode: active card + edges from scroll position ── */
  const cardsOf = () => Array.from(track.current?.querySelectorAll<HTMLElement>("[data-hs-card]") || []);
  const padL = () => (track.current ? parseFloat(getComputedStyle(track.current).paddingLeft) || 0 : 0);

  React.useEffect(() => {
    if (mode !== "carousel") return;
    const t = track.current; if (!t) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const cards = cardsOf(); if (!cards.length) return;
      const x = t.scrollLeft, max = t.scrollWidth - t.clientWidth, pl = padL();
      let idx = 0, bd = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft - pl - x); if (d < bd) { bd = d; idx = i; } });
      if (max > 0 && x >= max - 1) idx = cards.length - 1;
      setActive(idx);
      setEdges({ start: x <= 1, end: max <= 1 || x >= max - 1 });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    t.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll); ro.observe(t);
    return () => { t.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [mode, items]);

  const goTo = React.useCallback((i: number) => {
    const t = track.current; const cards = cardsOf(); if (!t || !cards.length) return;
    const c = cards[Math.max(0, Math.min(cards.length - 1, i))];
    t.scrollTo({ left: c.offsetLeft - padL(), behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  /* keyboard focus on a card: bring it into view in either mode */
  const onFocusCard = React.useCallback((i: number) => {
    if (mode === "carousel") { goTo(i); return; }
    const st = stRef.current, t = track.current; if (!st || !t) return;
    const cards = cardsOf(); const d = distance(); if (d <= 0) return;
    const prog = Math.min(1, Math.max(0, (cards[i].offsetLeft - cards[0].offsetLeft) / d));
    const vp = t.parentElement && t.parentElement.parentElement;                 // .hs_viewport
    if (vp) vp.scrollLeft = 0;                                                  // undo the browser's focus scroll
    window.scrollTo({ top: st.start + (st.end - st.start) * prog, behavior: reduced ? "auto" : "smooth" });
  }, [mode, goTo, reduced, distance]);

  const style = {
    "--hs-card-w": cardW + "px",
    "--hs-gap": gap + "px",
    "--hs-spv-t": String(spvT), "--hs-spv-m": String(spvM),
    "--hs-gaps-t": String(Math.max(0, Math.ceil(spvT) - 1)), "--hs-gaps-m": String(Math.max(0, Math.ceil(spvM) - 1)),
    "--hs-reveal-d": (reduced ? 0 : p.revealDuration == null ? 0.7 : Math.max(0, p.revealDuration)) + "s",
    "--hs-progress": String(progress),
    ...(p.revealBg ? { "--hs-reveal": color(p.revealBg, "") } : {}),
    ...(p.revealText ? { "--hs-reveal-text": color(p.revealText, "") } : {}),
    ...(p.sectionBg ? { "--hs-bg": color(p.sectionBg, "") } : {}),
    ...(p.cardBg ? { "--hs-card": color(p.cardBg, "") } : {}),
    ...(p.cardBorder ? { "--hs-line": color(p.cardBorder, "") } : {}),
  } as React.CSSProperties;

  const dur = reduced ? 0 : p.revealDuration == null ? 0.7 : Math.max(0, p.revealDuration);
  const chevron = (dir: number) => (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></svg>
  );
  const single = items.length < 2;

  return (
    <>
      <style>{CSS}</style>
      <section
        ref={root}
        className={"hs " + (mode === "pinned" ? "is-pinned" : "is-carousel") + (desktop ? " is-desktop" : "")}
        data-theme={theme} data-align={align} style={style}
      >
        <div className="hs_viewport">
          {(p.eyebrow || p.title || p.subtitle) && (
            <header className="hs_head">
              {p.eyebrow ? <p className="hs_eyebrow">{p.eyebrow}</p> : null}
              {p.title ? <h2 className="hs_title">{p.title}</h2> : null}
              {p.subtitle ? <p className="hs_sub">{p.subtitle}</p> : null}
            </header>
          )}
          <div className="hs_body" ref={body}>
            <div className="hs_track" ref={track} aria-live="polite">
              {items.map((it, i) => (
                <Card key={i} item={it} index={i} reveal={reveal} duration={dur} hoverable={hoverable} active={i === active} onFocusCard={onFocusCard} />
              ))}
            </div>
          </div>
          {showProgress && !single && (
            <div className="hs_progress" aria-hidden="true">
              <span className="hs_count"><b>{pad2(active + 1)}</b> / {pad2(items.length)}</span>
              <span className="hs_bar"><i /></span>
            </div>
          )}
          {showNav && (
            <div className={"hs_nav" + (single ? " is-locked" : "")}>
              <div className="hs_dots" role="tablist" aria-label="Slides">
                {items.map((_, i) => (
                  <button key={i} type="button" className={"hs_dot" + (i === active ? " is-active" : "")} aria-label={`${i + 1} / ${items.length}`} aria-current={i === active ? "true" : undefined} onClick={() => goTo(i)} />
                ))}
              </div>
              <div className="hs_arrows">
                <button type="button" className="hs_arrow" aria-label="Previous" disabled={edges.start} onClick={() => goTo(active - 1)}>{chevron(-1)}</button>
                <button type="button" className="hs_arrow" aria-label="Next" disabled={edges.end} onClick={() => goTo(active + 1)}>{chevron(1)}</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default HScroll;
