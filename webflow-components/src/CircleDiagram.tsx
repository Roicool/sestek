/*!
 * CircleDiagram (Code Component) — React port of js/components/circle-diagram.js
 * v2.2.0 + circle-diagram.css v1.5.1 ("The conversational lifecycle").
 *
 * Same model: N chips sit evenly on a ring; ONE injected conic-gradient div
 * (the connector) spins clockwise at a constant speed on the site's global
 * gsap; whenever its bright tip passes a node that node becomes active and
 * the card list on the right slides to its card. Hover (mouse) / tap /
 * keyboard interrupts: the tip sweeps to that node and holds; the spin resumes
 * `resume` seconds later (mouse: when it leaves). Mouse over the card list and
 * keyboard focus inside the component pause the spin. Only spins while on
 * screen (IntersectionObserver). No gsap → hover/tap still work, the sweep is
 * a CSS transition, no loop. prefers-reduced-motion → no spin, instant swaps.
 *
 * Items come from Designer props (Item 1–8: label, icon, card title, card
 * text); empty label = hidden. Design tokens are read from the site's CSS
 * variables through the shadow boundary (--brand-primary--500, --surface--base…).
 *
 * FIT (vs the CSS file): chips never leave the panel at ANY width. The ring
 * is sized by CSS ALONE from the panel's width (container-query units): chip
 * width is capped at 40% of the panel (36% on phones) so long labels wrap and
 * the ring takes what is left — no JS measurement, so the server HTML already
 * has the final height.
 *
 * SSR (DevLink `ssr:true`): the render path never touches window/document;
 * everything below the first paint is CSS — ring size (above) and the card
 * window height (`--cd-visible` × `--cd-card-h`, see CSS). After hydration the
 * effect only re-measures the card window and rewrites it when the content
 * does not fit `--cd-card-h` (title longer than 2 lines, or a Card text) —
 * cards then grow uniformly (grid rows) and the window follows; that is the
 * one case where the height can change after hydration.
 */

import * as React from "react";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CircleDiagramItem {
  label: string;
  icon?: string;       // mic | chat | headset | sparkle | chart | target | check | zap | search | user | clock | shield | bulb | cycle | arrow | ""
  cardTitle?: string;
  cardText?: string;
}

type ItemKey = `i${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}${"Label" | "Icon" | "Title" | "Text"}`;

export interface CircleDiagramProps extends Partial<Record<ItemKey, string>> {
  items?: CircleDiagramItem[];
  /** seconds per revolution; 0 = no loop */
  spin?: number;
  /** seconds after an interruption before the spin resumes */
  resume?: number;
  /** how many cards are visible in the list window */
  visible?: number;
  /** initially active item */
  start?: number;
  /** "Center" | "Left" — text alignment inside the cards */
  cardAlign?: string;
  /** hide the card list (ring only) */
  showCards?: boolean;
  /* flat Designer props i1Label … i8Text (Item 1–8) — assembled into `items` when `items` is absent */
}

type G = {
  to: (t: unknown, v: Record<string, unknown>) => { kill(): void; pause(): void; play(): void };
  set: (t: unknown, v: Record<string, unknown>) => void;
  getProperty: (t: unknown, p: string) => number | string;
  killTweensOf: (t: unknown) => void;
  isTweening: (t: unknown) => boolean;
};
function gs(): G | null {
  const w = window as unknown as { gsap?: G };
  return w.gsap || null;
}

/* ── icon set (same SVGs as circle-diagram.css) ─────────────────────── */
const SVG = (body: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E${body}%3C/svg%3E")`;
export const ICONS: Record<string, string> = {
  mic: SVG("%3Cpath d='M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z'/%3E%3Cpath d='M19 11v1a7 7 0 0 1-14 0v-1'/%3E%3Cpath d='M12 19v3'/%3E"),
  chat: SVG("%3Cpath d='M21 14a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z'/%3E"),
  headset: SVG("%3Cpath d='M4 14v-2a8 8 0 0 1 16 0v2'/%3E%3Crect x='2' y='13' width='5' height='7' rx='2'/%3E%3Crect x='17' y='13' width='5' height='7' rx='2'/%3E"),
  sparkle: SVG("%3Cpath d='m12 3 2.2 6.3 6.3 2.2-6.3 2.2L12 20l-2.2-6.3-6.3-2.2 6.3-2.2Z'/%3E"),
  chart: SVG("%3Cpath d='M4 4v15a1 1 0 0 0 1 1h15'/%3E%3Cpath d='M8 16v-4'/%3E%3Cpath d='M13 16V8'/%3E%3Cpath d='M18 16v-6'/%3E"),
  target: SVG("%3Ccircle cx='12' cy='12' r='9'/%3E%3Ccircle cx='12' cy='12' r='4.5'/%3E%3Ccircle cx='12' cy='12' r='1' fill='%23000' stroke='none'/%3E"),
  check: SVG("%3Cpath d='M20 6.5 9.5 17 4 11.5'/%3E"),
  zap: SVG("%3Cpath d='M13 2 4 13.5h7L11 22l9-11.5h-7L13 2Z'/%3E"),
  search: SVG("%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20.5 20.5-4-4'/%3E"),
  user: SVG("%3Ccircle cx='12' cy='8' r='3.8'/%3E%3Cpath d='M4.5 20.5a7.5 7.5 0 0 1 15 0'/%3E"),
  clock: SVG("%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M12 7v5.2l3.2 2'/%3E"),
  shield: SVG("%3Cpath d='M12 21.5s7.5-3.7 7.5-9.4V5.6L12 2.5 4.5 5.6v6.5c0 5.7 7.5 9.4 7.5 9.4Z'/%3E"),
  bulb: SVG("%3Cpath d='M12 2.5a6.5 6.5 0 0 0-3.8 11.8V15h7.6v-.7A6.5 6.5 0 0 0 12 2.5Z'/%3E%3Cpath d='M9.5 18h5'/%3E%3Cpath d='M10.5 21.5h3'/%3E"),
  cycle: SVG("%3Cpath d='M20.5 12a8.5 8.5 0 1 1-2.6-6.1'/%3E%3Cpath d='M20.5 3.5V9H15'/%3E"),
  arrow: SVG("%3Cpath d='M4.5 12h14'/%3E%3Cpath d='m12.5 6 6 6-6 6'/%3E"),
};
export const ICON_NAMES = ["None", ...Object.keys(ICONS)];

/* ── CSS (circle-diagram.css v1.5.1, scoped to the shadow root + mobile fix) ── */
const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.cd{
  --cd-ink:var(--color-text--base,var(--neutral--950,#111));
  --cd-accent:var(--brand-primary--500,#EC008C);
  --cd-muted:var(--color-text--muted,var(--neutral--600,#6b6b6b));
  --cd-line:var(--border--color-border-base,var(--neutral--200,rgba(0,0,0,.12)));
  --cd-ring:var(--neutral--300,rgba(0,0,0,.22));
  --cd-ring-w:2px;
  --cd-bg:var(--surface--base,var(--neutral--0,#fff));
  --cd-card-align:center;
  --cd-icon-size:1.125rem;
  --cd-font:var(--font--primary,var(--font--body,inherit));
  /* chips: max 40% of the panel width (36% on phones), never wider than 240px */
  --cd-chip-max:min(240px,40cqw);
  /* card window: "visible" rows (inline --cd-visible) of --cd-card-h each.
     --cd-card-h = card padding + border + TWO title lines (line-height 1.25) —
     enough for every default title at 320–1440px; taller content grows all
     rows uniformly (grid) and the JS then adjusts the window height. */
  --cd-visible:3;
  --cd-card-gap:var(--spacing--4,1rem);
  --cd-card-h:calc(3rem + 2 * 1.125rem * 1.25 + 2px);
  position:relative;width:100%;max-width:var(--container--2xl,96rem);margin-inline:auto;
  padding:var(--spacing--10,2.5rem) var(--view--px,var(--spacing--6,1.5rem));
  font-family:var(--cd-font);
}
.cd[data-align="left"]{--cd-card-align:left}
.cd_layout{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(2.5rem,5vw,5rem);align-items:center}
.cd[data-cards="off"] .cd_layout{grid-template-columns:1fr}
.cd_panel{display:flex;justify-content:center;padding:clamp(1.5rem,3vw,2.5rem) 0;min-width:0;container-type:inline-size}
/* stage = panel width − one chip width (left/right chips hang half outside the ring) − 8px slack; CSS only, no JS */
.cd_stage{position:relative;width:clamp(150px,calc(100cqw - var(--cd-chip-max) - 8px),448px);aspect-ratio:1/1}
@supports not (width:1cqw){
  .cd{--cd-chip-max:min(240px,66%)}                                              /* % of the stage ≈ 40% of the panel */
  .cd_stage{width:clamp(150px,calc(100% - min(240px,40%) - 8px),448px)}
}
.cd_connector{position:absolute;inset:0;border-radius:50%;background:conic-gradient(var(--cd-ring) 328deg,var(--cd-accent) 360deg);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - var(--cd-ring-w,2px) - .25px),#000 calc(100% - .25px));
          mask:radial-gradient(farthest-side,transparent calc(100% - var(--cd-ring-w,2px) - .25px),#000 calc(100% - .25px));
  pointer-events:none;will-change:transform;transition:transform 1.2s cubic-bezier(.65,0,.35,1)}
.cd_item{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:.6rem;background:var(--cd-bg);border:1px solid var(--cd-line);border-radius:999px;
  padding:.55rem 1.05rem;box-shadow:0 10px 24px -18px rgba(0,0,0,.28);cursor:pointer;color:var(--cd-muted);font:inherit;font-family:var(--cd-font);font-size:.8125rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
  white-space:normal;width:max-content;max-width:var(--cd-chip-max,11rem);line-height:1.2;text-align:left;transition:color .35s,border-color .35s,box-shadow .35s,transform .35s;-webkit-tap-highlight-color:transparent}
.cd_item .cd_label{min-width:0;text-align:center;overflow-wrap:anywhere}
/* width:max-content above: an absolutely positioned chip at left:50% would otherwise be
   limited to HALF the stage (shrink-to-fit = containing block minus the offset), so a
   long label like "Conversational Intelligence" folded into 3 lines at 1024px. */
/* top/bottom chips sit centred on the ring and never hang off the side, so they may
   use (almost) the whole panel width — "Conversational Intelligence" wraps to two
   comfortable lines instead of overflowing the side-chip budget */
.cd_item[data-cd-side="top"],.cd_item[data-cd-side="bottom"]{max-width:min(340px,94cqw)}
.cd_item[data-cd-side="right"] .cd_label{text-align:left}
.cd_item[data-cd-side="left"] .cd_label{text-align:right}
.cd_item[data-cd-side="left"]{flex-direction:row-reverse}
.cd_dot{width:8px;height:8px;flex:none;border-radius:50%;border:.5px solid var(--neutral--400,#9b9b9b);background:var(--cd-bg);transition:background .35s,border-color .35s,transform .35s}
.cd_label{transition:letter-spacing .35s}
.cd_item.is-active{color:var(--cd-ink);border-color:var(--cd-accent);box-shadow:0 14px 32px -18px rgba(0,0,0,.35);transform:translate(-50%,-50%) scale(1.08);z-index:3}
.cd_item.is-active .cd_dot{background:var(--cd-accent);border-color:var(--cd-accent);transform:scale(1.45)}
.cd_item.is-active .cd_label{text-transform:none;letter-spacing:.01em}
.cd_item:focus-visible{outline:2px solid var(--cd-accent);outline-offset:2px}
.cd_item[data-cd-icon] .cd_dot{width:var(--cd-icon-size);height:var(--cd-icon-size);border:0;border-radius:0;background:currentColor;-webkit-mask:var(--cd-icon) center/contain no-repeat;mask:var(--cd-icon) center/contain no-repeat;transition:background-color .35s,transform .35s}
.cd_item.is-active[data-cd-icon] .cd_dot{background:var(--cd-accent);transform:scale(1.1)}
/* card window height is CSS (server HTML already final): visible rows + gaps */
.cd_cards{position:relative;overflow:hidden;height:calc(var(--cd-visible) * var(--cd-card-h) + (var(--cd-visible) - 1) * var(--cd-card-gap))}
/* uniform rows: every card is at least --cd-card-h; taller content grows ALL rows (1fr) */
.cd_cards-track{position:relative;display:grid;grid-auto-rows:minmax(var(--cd-card-h),1fr);gap:var(--cd-card-gap);will-change:transform}
.cd_pcard{display:block;width:100%;min-height:var(--cd-card-h);text-align:var(--cd-card-align);background:var(--cd-bg);border:1px solid var(--cd-line);border-radius:var(--radius--lg,.75rem);padding:1.5rem 1.75rem;cursor:pointer;opacity:.5;
  font:inherit;font-family:var(--cd-font);color:inherit;transition:opacity .35s,border-color .35s,box-shadow .35s;-webkit-tap-highlight-color:transparent}
.cd_pcard.is-active{opacity:1;border-color:var(--cd-accent);box-shadow:0 20px 40px -28px rgba(0,0,0,.25)}
.cd_pcard:hover{opacity:.8}
.cd_pcard.is-active:hover{opacity:1}
.cd_pcard:focus-visible{outline:2px solid var(--cd-accent);outline-offset:2px}
.cd_card-title{display:flex;align-items:center;justify-content:center;gap:.625rem;font-size:1.125rem;line-height:1.25;font-weight:600;letter-spacing:.01em;color:var(--cd-ink);margin:0}
.cd_card-title+.cd_card-text{margin-top:.625rem}
.cd[data-align="left"] .cd_card-title{justify-content:flex-start}
.cd_card-text{text-align:var(--cd-card-align);text-wrap:pretty;color:var(--color-text--base,var(--neutral--900,#1a1a1a));font-size:.9375rem;line-height:1.65;letter-spacing:.005em;margin:0}

/* ── tablet & mobile: single column + NO CHIP OVERFLOW ──
   Left/right chips hang half their width outside the ring, so the stage is
   sized from the available width minus one chip width (--cd-chip-w) and the
   labels are allowed to wrap inside that width. */
@media (max-width:991px){
  .cd_layout{grid-template-columns:1fr;gap:2.5rem}
  .cd_panel{padding:1.25rem 0}
  .cd_item{font-size:.75rem;letter-spacing:.06em;padding:.5rem .85rem;gap:.45rem}
}
/* phones: no side padding, NO icons (text-only chips), normal-size labels */
@media (max-width:767px){
  .cd{padding-left:0;padding-right:0}
  .cd_item .cd_dot{display:none}
  .cd_item{gap:0;font-size:.75rem;letter-spacing:.05em;padding:.5rem .8rem;line-height:1.2}
  .cd_item .cd_label{text-align:center}
  .cd_item.is-active{transform:translate(-50%,-50%) scale(1.04)}
}
@media (max-width:479px){
  .cd{--cd-chip-max:min(240px,36cqw);--cd-card-h:calc(2.25rem + 2 * 1rem * 1.25 + 2px)}
  .cd_item{font-size:.6875rem;padding:.45rem .7rem;letter-spacing:.03em}
  .cd_pcard{padding:1.125rem 1.25rem}
  .cd_card-title{font-size:1rem}
}
@media (prefers-reduced-motion:reduce){.cd_connector,.cd_item,.cd_dot,.cd_label,.cd_pcard{transition:none}}
`;

const DEFAULT_ITEMS: CircleDiagramItem[] = [
  { label: "Agentic AI", icon: "mic", cardTitle: "Agentic AI resolves what it can autonomously" },
  { label: "Human Agent", icon: "chat", cardTitle: "Human Agent handles complex cases with context" },
  { label: "Agent Copilot", icon: "headset", cardTitle: "Agent Copilot provides context and live guidance" },
  { label: "Conversational Intelligence", icon: "sparkle", cardTitle: "Conversational Intelligence analyzes every single interaction" },
  { label: "Insights", icon: "target", cardTitle: "Insights improves the next interaction" },
  { label: "Customer", icon: "zap", cardTitle: "Customer reaches out on preferred channels" },
];
export { DEFAULT_ITEMS };

/** Item 1–8 flat props → items array */
function itemsFromProps(p: Partial<Record<ItemKey, string>>): CircleDiagramItem[] {
  const q = p as Record<string, string | undefined>;
  const out: CircleDiagramItem[] = [];
  for (let i = 1; i <= 8; i++) {
    const label = String(q["i" + i + "Label"] ?? "").trim();
    if (!label) continue;
    const icon = String(q["i" + i + "Icon"] ?? "").trim();
    out.push({
      label,
      icon: icon && icon !== "None" ? icon : "",
      cardTitle: String(q["i" + i + "Title"] ?? "").trim(),
      cardText: String(q["i" + i + "Text"] ?? "").trim(),
    });
  }
  return out;
}

export function CircleDiagram(props: CircleDiagramProps) {
  const { spin = 14, resume = 3, visible = 3, start = 0, cardAlign = "Center", showCards = true } = props;
  const items = React.useMemo(() => {
    if (props.items && props.items.length) return props.items;
    const fromProps = itemsFromProps(props);
    return fromProps.length ? fromProps : DEFAULT_ITEMS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.items, JSON.stringify(itemsFromProps(props))]);

  const root = React.useRef<HTMLDivElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);
  const stage = React.useRef<HTMLDivElement>(null);
  const connector = React.useRef<HTMLDivElement>(null);
  const cardsWrap = React.useRef<HTMLDivElement>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const itemEls = React.useRef<(HTMLButtonElement | null)[]>([]);
  const cardEls = React.useRef<(HTMLButtonElement | null)[]>([]);

  /* geometry: even distribution from the top (-90°) */
  const angles = React.useMemo(() => items.map((_, i) => -90 + (360 / items.length) * i), [items]);
  const sideOf = (deg: number) => {
    const n = ((deg % 360) + 360) % 360;
    if (n > 245 && n < 295) return "top";
    if (n > 65 && n < 115) return "bottom";
    if (n > 115 && n <= 245) return "left";
    return "right";
  };

  /* layout effect: ring size + card window are final BEFORE the first paint (no post-paint shrink) */
  useIsoLayoutEffect(() => {
    const rootEl = root.current, conn = connector.current, wrap = cardsWrap.current, trk = track.current, panelEl = panel.current;
    if (!rootEl || !conn || !panelEl) return;
    const nodes = itemEls.current.slice(0, items.length).filter(Boolean) as HTMLButtonElement[];
    const cards = showCards ? (cardEls.current.slice(0, items.length).filter(Boolean) as HTMLButtonElement[]) : [];
    if (!nodes.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const SPIN = Math.max(0, Number(spin) || 0);
    const RESUME = Number(resume) > 0 ? Number(resume) : 3;
    const VISIBLE = Math.max(1, Math.floor(Number(visible)) || 3);
    const tipRots = angles.map((d) => (((d + 90) % 360) + 360) % 360);

    let gsapDrives = false;
    const claim = () => { if (!gsapDrives) { gsapDrives = true; conn.style.transition = "none"; } };
    const rotation = () => { const g = gs(); return g ? parseFloat(String(g.getProperty(conn, "rotation"))) || 0 : arcRot; };

    const idxForRot = (rot: number) => {
      const t = ((rot % 360) + 360) % 360 + 0.001;
      let best = -1, bestRot = -Infinity;
      for (let i = 0; i < tipRots.length; i++) if (tipRots[i] <= t && tipRots[i] > bestRot) { bestRot = tipRots[i]; best = i; }
      if (best === -1) for (let j = 0; j < tipRots.length; j++) if (tipRots[j] > bestRot) { bestRot = tipRots[j]; best = j; }
      return best;
    };

    /* ring size + chip width are pure CSS (container-query units) — nothing to fit here */

    /* card list window: the height is already set by CSS (--cd-visible ×
       --cd-card-h, uniform grid rows). Measure the real rows and only rewrite
       the height when the content outgrew --cd-card-h (all rows grow together),
       so the common case is a no-op and the server height stands. */
    let listH = 0, maxShift = 0;
    const measure = () => {
      if (!trk || !wrap || !cards.length) return;
      const last = cards[Math.min(VISIBLE, cards.length) - 1];
      listH = last.offsetTop + last.offsetHeight;
      if (Math.abs(wrap.getBoundingClientRect().height - listH) > 1) wrap.style.height = listH + "px";
      maxShift = Math.max(0, trk.scrollHeight - listH);
    };
    const scrollToCard = (i: number, animate: boolean) => {
      if (!trk || !cards[i]) return;
      const pc = cards[i];
      const centered = pc.offsetTop - (listH - pc.offsetHeight) / 2;
      const y = -Math.max(0, Math.min(centered, maxShift));
      const g = gs();
      if (animate && !reduced && g) g.to(trk, { y, duration: 0.7, ease: "power3.inOut", overwrite: "auto" });
      else if (g) g.set(trk, { y });
      else trk.style.transform = "translateY(" + y + "px)";
    };

    let active = -1;
    const applyActive = (i: number, animate: boolean) => {
      if (i === active || !nodes[i]) return;
      active = i;
      nodes.forEach((n, k) => { n.classList.toggle("is-active", k === i); if (k === i) n.setAttribute("aria-current", "true"); else n.removeAttribute("aria-current"); });
      if (cards.length) {
        cards.forEach((c, k) => { c.classList.toggle("is-active", k === i); if (k === i) c.setAttribute("aria-current", "true"); else c.removeAttribute("aria-current"); });
        scrollToCard(i, animate);
      }
    };

    /* spin loop */
    let inView = false, hoverHeld = false, listHover = false, focusHeld = false;
    let spinTween: ReturnType<G["to"]> | null = null;
    let resumeTimer: number | null = null;
    let arcRot = tipRots[0] || 0;

    const stopSpin = () => { if (spinTween) { spinTween.kill(); spinTween = null; } };
    const startSpin = () => {
      const g = gs();
      if (spinTween || !inView || hoverHeld || listHover || focusHeld || reduced || !g || SPIN <= 0) return;
      if (g.isTweening(conn)) return;
      claim();
      spinTween = g.to(conn, {
        rotation: "+=360", duration: SPIN, ease: "none", repeat: -1,
        onUpdate: () => { const idx = idxForRot(rotation()); if (idx !== active) applyActive(idx, true); },
      });
    };
    const clearResume = () => { if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; } };
    const scheduleResume = () => {
      clearResume();
      if (hoverHeld || listHover || focusHeld || reduced || SPIN <= 0) return;
      resumeTimer = window.setTimeout(startSpin, RESUME * 1000);
    };
    const sweepTo = (i: number) => {
      const g = gs();
      const cur = rotation();
      const delta = (((tipRots[i] - cur) % 360) + 360) % 360;
      const target = cur + delta;
      if (!reduced && g) { g.killTweensOf(conn); claim(); g.to(conn, { rotation: target, duration: 1, ease: "power3.inOut", onComplete: scheduleResume }); }
      else if (g) { g.set(conn, { rotation: target }); scheduleResume(); }
      else conn.style.transform = "rotate(" + target + "deg)";
      arcRot = target;
    };
    const engage = (i: number) => { clearResume(); stopSpin(); applyActive(i, true); sweepTo(i); };

    /* interaction */
    const offs: Array<() => void> = [];
    const on = (el: EventTarget, type: string, fn: EventListener) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
    nodes.forEach((n, i) => {
      on(n, "pointerenter", (e) => { if ((e as PointerEvent).pointerType !== "mouse") return; hoverHeld = true; engage(i); });
      on(n, "pointerleave", (e) => { if ((e as PointerEvent).pointerType !== "mouse") return; hoverHeld = false; scheduleResume(); });
      on(n, "click", () => engage(i));
    });
    cards.forEach((c, i) => { if (nodes[i]) on(c, "click", () => engage(i)); });
    if (wrap && cards.length) {
      on(wrap, "pointerenter", (e) => { if ((e as PointerEvent).pointerType !== "mouse") return; listHover = true; clearResume(); stopSpin(); });
      on(wrap, "pointerleave", (e) => { if ((e as PointerEvent).pointerType !== "mouse") return; listHover = false; scheduleResume(); });
    }
    on(rootEl, "focusin", (e) => {
      let kb = true;
      try { kb = (e.target as Element).matches(":focus-visible"); } catch { /* old engine */ }
      if (!kb) return;
      focusHeld = true; clearResume(); stopSpin();
    });
    on(rootEl, "focusout", (e) => { if (rootEl.contains((e as FocusEvent).relatedTarget as Node)) return; focusHeld = false; scheduleResume(); });

    /* initial frame */
    const startIdx = Math.min(Math.max(0, Math.floor(Number(start)) || 0), nodes.length - 1);
    measure();
    applyActive(startIdx, false);
    arcRot = tipRots[startIdx] || 0;
    { const g = gs(); if (g) { claim(); g.set(conn, { rotation: arcRot }); } else conn.style.transform = "rotate(" + arcRot + "deg)"; }

    let rsTimer: number | null = null;
    const remeasure = () => { measure(); scrollToCard(active, false); };
    on(window, "resize", () => { if (rsTimer) clearTimeout(rsTimer); rsTimer = window.setTimeout(remeasure, 120); });
    on(window, "load", remeasure);
    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts && fonts.ready && (fonts as { status?: string }).status !== "loaded") fonts.ready.then(remeasure).catch(() => {});
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      let pending = false;
      ro = new ResizeObserver(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; remeasure(); }); });
      ro.observe(panelEl);                    // chips/cards are NOT observed: the active chip's metrics change
                                              // on every step and would re-fit the ring every few seconds;
                                              // the web font landing is covered by fonts.ready above
    }

    /* viewport gate */
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          inView = e.isIntersecting;
          if (inView) { if (spinTween) spinTween.play(); else startSpin(); }
          else if (spinTween) spinTween.pause();
        });
      }, { threshold: 0.15 });
      io.observe(rootEl);
    } else { inView = true; startSpin(); }

    return () => {
      offs.forEach((f) => f());
      clearResume();
      if (rsTimer) clearTimeout(rsTimer);
      stopSpin();
      const g = gs(); if (g) { g.killTweensOf(conn); if (trk) g.killTweensOf(trk); }
      if (io) io.disconnect();
      if (ro) ro.disconnect();
    };
  }, [items, angles, spin, resume, visible, start, showCards]);

  /* server-rendered initial state (deterministic, no DOM access): the card
     window height (--cd-visible), the start item active and the tip on it */
  const visibleRows = Math.min(Math.max(1, Math.floor(Number(visible)) || 3), items.length);
  const startIdx = Math.min(Math.max(0, Math.floor(Number(start)) || 0), items.length - 1);
  const startRot = (((angles[startIdx] + 90) % 360) + 360) % 360;

  return (
    <div
      ref={root}
      className="cd"
      data-circle-diagram=""
      data-align={cardAlign === "Left" ? "left" : "center"}
      data-cards={showCards ? "on" : "off"}
      style={{ "--cd-visible": visibleRows } as React.CSSProperties}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="cd_layout">
        <div ref={panel} className="cd_panel">
          <div ref={stage} className="cd_stage">
            <div ref={connector} className="cd_connector" aria-hidden="true" style={{ transform: "rotate(" + startRot + "deg)" }} />
            {items.map((it, i) => {
              const rad = angles[i] * Math.PI / 180;
              const icon = it.icon && ICONS[it.icon] ? it.icon : undefined;
              return (
                <button
                  key={i}
                  ref={(el) => { itemEls.current[i] = el; }}
                  type="button"
                  className={"cd_item" + (i === startIdx ? " is-active" : "")}
                  aria-current={i === startIdx ? "true" : undefined}
                  data-cd-side={sideOf(angles[i])}
                  data-cd-icon={icon}
                  style={{ left: (50 + 50 * Math.cos(rad)) + "%", top: (50 + 50 * Math.sin(rad)) + "%", ...(icon ? ({ "--cd-icon": ICONS[icon] } as React.CSSProperties) : {}) }}
                >
                  <span className="cd_dot" aria-hidden="true" />
                  <span className="cd_label">{it.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {showCards && (
          <div ref={cardsWrap} className="cd_cards">
            <div ref={track} className="cd_cards-track">
              {items.map((it, i) => (
                <button key={i} ref={(el) => { cardEls.current[i] = el; }} type="button" className={"cd_pcard" + (i === startIdx ? " is-active" : "")} aria-current={i === startIdx ? "true" : undefined}>
                  <div className="cd_card-title">{it.cardTitle || it.label}</div>
                  {it.cardText && <p className="cd_card-text">{it.cardText}</p>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
