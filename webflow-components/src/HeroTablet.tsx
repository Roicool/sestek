/*!
 * Hero — the home-page hero for EVERY breakpoint, in one Code Component.
 *
 * ONE DOM for all breakpoints (server-renderable, zero layout shift): the
 * layout is switched purely by CSS media queries inside the injected <style>
 * — `@media (min-width:992px)` = desktop, `@media (max-width:991px)` =
 * tablet + mobile. The viewport only decides which BEHAVIOUR is attached in
 * effects, never which markup is rendered, so the server HTML and the first
 * client render are identical and hydration never remounts anything.
 *
 * ≥ 992px  (desktop)  — a 1:1 React port of hero.js v1.9 + hero.css:
 *   Uses the SITE'S global gsap + ScrollTrigger (nothing is bundled): the
 *   hero is pinned (refreshPriority 2, anticipatePin 1) and a scrubbed
 *   timeline (scrub: 1, end +250%) runs hero.js's nine phases verbatim —
 *   same offsets, durations and eases:
 *     0.00–0.20 scene-1 copy exits (power2.in)
 *     0.06–0.28 dark overlay fades
 *     0.16–0.64 fullscreen video morphs (scale + translate) into the inline
 *               slot inside the phrase (power2.inOut), border-radius grows
 *     0.34–0.46 scene 2 fades in; nav gets .nav--on-light from 0.34
 *     0.40+     words land one by one (power3.out, 0.08 apart)
 *     0.74–0.86 description
 *     0.80–0.88 video fades out of the slot
 *     0.86–0.96 slot collapses (width 7rem → 0)
 *     0.76–0.92 stats stagger in; each counter rolls on its first reveal
 *   Slot geometry is measured hero-relative (hero top-left = viewport
 *   top-left while pinned), rebuilt on resize and font load without moving
 *   the scroll. Without gsap on the page, scene 2 is shown statically.
 *
 * ≤ 991px  (tablet + mobile) — static vertical flow:
 *   100svh video block with title/subtitle/CTAs and the Trusted-by row
 *   pinned to its bottom edge, then phrase + description, then stats that
 *   count up when scrolled into view.
 *
 * SSR contract: nothing in render touches window/document; scene 1 (H1,
 * subtitle, CTAs = the LCP text) is fully visible in the server HTML; the
 * desktop scene-2 word/description/stat start states (opacity 0 / y offset)
 * are applied by gsap in an effect, the mobile `[data-reveal]` start state
 * only exists under `.is-animated`, which an effect adds (and marks the
 * already-visible elements `.is-in` in the same pass, before paint).
 * Scene 2 on desktop is an overlay of the pinned 100vh box, so the hero's
 * height on the server equals its hydrated height on every breakpoint.
 *
 * Both variants share the same props. `[video]` in the phrase marks where
 * the inline video slot sits on desktop (ignored on mobile); `*…*` marks
 * brand-colour words. prefers-reduced-motion: desktop shows scene 2 as a
 * plain 100vh section (no pin, no scrub), mobile shows everything at once.
 *
 * Lives in Webflow's Code Component shadow root: site classes don't reach
 * in, but CSS custom properties DO inherit, so colours/spacing use the
 * site's variables with fallbacks. Font-family is inherited from the page.
 * The nav theme toggle targets [data-nav] in the light DOM, same as hero.js.
 */

import * as React from "react";
import { LogoMarquee } from "./LogoMarquee";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type LinkValue = { href: string; target?: string; preload?: string };
type ImageValue = { src: string; alt?: string };

export interface HeroTabletProps {
  videoUrl?: string;
  posterUrl?: string;
  overlay?: boolean;

  title?: string;
  subtitle?: string;
  cta1Label?: string;
  cta1Link?: LinkValue;
  cta2Label?: string;
  cta2Link?: LinkValue;

  trustedText?: string;
  logos?: React.ReactNode;

  phrase?: string;
  description?: string;

  stat1Value?: number; stat1Suffix?: string; stat1Label?: string;
  stat2Value?: number; stat2Suffix?: string; stat2Label?: string;
  stat3Value?: number; stat3Suffix?: string; stat3Label?: string;
  stat4Value?: number; stat4Suffix?: string; stat4Label?: string;

  bgImage?: ImageValue;
  animate?: boolean;
  scrollDistance?: number;

  grain?: boolean;
  grainIntensity?: number;
  grainSize?: number;
  grainSpeed?: number;
  staggerButton?: boolean;

  marqueeSpeed?: number;
  marqueeLogoSize?: number;
  marqueeGap?: number;
}

type StatDef = { v: number; s?: string; l?: string };

/* ── Text helpers ───────────────────────────────────────────── */

/* "Line one|Line two" or "Line one<br>Line two" → array of lines */
function lines(text: string | undefined): string[] {
  if (!text) return [];
  return text.split(/\s*(?:\||<br\s*\/?>|\n)\s*/).filter((s) => s.length > 0);
}

function renderLines(text: string) {
  return lines(text).map((l, i) => (
    <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
  ));
}

/* "Every interaction, *better than the last*" → segments with accent flag */
function accentSegments(text: string | undefined): { t: string; accent: boolean }[] {
  if (!text) return [];
  const out: { t: string; accent: boolean }[] = [];
  const re = /\*([^*]+)\*/g;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > idx) out.push({ t: text.slice(idx, m.index), accent: false });
    out.push({ t: m[1], accent: true });
    idx = m.index + m[0].length;
  }
  if (idx < text.length) out.push({ t: text.slice(idx), accent: false });
  return out;
}

/* Desktop phrase: words + an optional [video] slot token.
   "Every interaction, [video] better *than the last*"
   → [{word:"Every"},{word:"interaction,"},{slot:true},{word:"better"},{word:"than",accent}…] */
type Token = { word?: string; accent?: boolean; slot?: boolean };
function tokenize(phrase: string): Token[] {
  const out: Token[] = [];
  // "[video]" → a NUL sentinel (not whitespace, so it survives the split)
  accentSegments(phrase.replace(/\[video\]/gi, " \u0000 ")).forEach((seg) => {
    seg.t.split(/\s+/).filter(Boolean).forEach((w) => {
      if (w === "\u0000") out.push({ slot: true });
      else out.push({ word: w, accent: seg.accent });
    });
  });
  return out;
}

/* ── Hooks ──────────────────────────────────────────────────── */

/* Media query as state. `null` until the viewport is known — identical on
   the server and on the first client render (no hydration mismatch), and
   the behaviour effects wait for a real answer instead of briefly attaching
   the mobile behaviour on a desktop viewport. Set in a layout effect so the
   right behaviour is in place before the first paint. Never drives markup. */
function useMedia(query: string): boolean | null {
  const [m, setM] = React.useState<boolean | null>(null);
  useIsoLayoutEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener("change", on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", on);
      else mq.removeListener(on);
    };
  }, [query]);
  return m;
}

/* Count-up driven by a `start` flag: rolls 0 → target once start turns true.
   Initial value is deterministic (0 while animated, else the target). */
function useCountUp(target: number, start: boolean, enabled: boolean, duration = 1.6) {
  const [value, setValue] = React.useState(enabled ? 0 : target);
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!enabled) { setValue(target); return; }
    if (!start || done.current) return;
    done.current = true;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / (duration * 1000));
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);   // easeOutExpo
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, enabled, duration]);
  return value;
}

/* Reserve the final formatted width (in ch, tabular-nums) so digits rolling
   in during the count-up don't re-space the stats row. */
function statWidth(stat: StatDef): string {
  return (stat.v.toLocaleString("en-US") + (stat.s || "")).length + "ch";
}

/* One stat for both breakpoints. Desktop: the scroll timeline says when to
   start (`start`). Mobile (`io`): starts counting when it scrolls into view. */
function Stat({ stat, start, io, animate, refCb }: { stat: StatDef; start: boolean; io: boolean; animate: boolean; refCb: (el: HTMLDivElement | null) => void }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [ioStart, setIoStart] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !io || !animate) return;
    const obs = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { setIoStart(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [io, animate]);
  const shown = useCountUp(stat.v, io ? ioStart : start, animate);
  return (
    <div ref={(el) => { ref.current = el; refCb(el); }} className="sh-stat" data-reveal>
      <div className="sh-stat-n" style={{ minWidth: statWidth(stat) }}>{shown.toLocaleString("en-US")}{stat.s || ""}</div>
      {stat.l && <div className="sh-stat-l">{renderLines(stat.l)}</div>}
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */
const CSS = `
.sh{position:relative;width:100%;background:var(--surface--base,#fff);color:var(--color-text--base,#111);box-sizing:border-box}
.sh *,.sh *::before,.sh *::after{box-sizing:border-box}

/* ═══ SHARED STRUCTURE (one DOM, both breakpoints) ═════════════ */
.sh-hero{position:relative;width:100%;overflow:hidden}
.sh-top{position:relative;width:100%}
.sh-vw{position:absolute;inset:0;z-index:1;overflow:hidden;background:#0b0b0d;transform-origin:center center;will-change:transform,opacity;backface-visibility:hidden}
.sh-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sh-ovl{position:absolute;inset:0;will-change:opacity;pointer-events:none}
.sh-scene{position:absolute;inset:0;z-index:2;pointer-events:none}
.sh-s1{position:relative;width:100%;height:100%;display:flex;flex-direction:column;color:var(--color-text--inverted,#fff)}
.sh-s1-in{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:var(--spacing--4,1rem)}
.sh-h1{margin:0;line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--medium,500);text-wrap:balance}
.sh-sub{margin:0;max-width:var(--container--sm,36rem);font-size:var(--text--base,1rem);line-height:var(--leading--relaxed,1.6);opacity:.85;text-wrap:balance}
.sh-ctas{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:var(--spacing--4,1rem);margin-top:var(--spacing--2,.5rem);pointer-events:auto;position:relative;z-index:20;width:100%;max-width:100%}
.sh-ctas>*{flex:0 1 auto;max-width:100%;min-width:0}
.sh-btn{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;font-weight:var(--font-weight--medium,500);font-size:var(--text--sm,.875rem);line-height:1;border-radius:var(--radius--full,999px);padding:.8rem 1.25rem;transition:transform .25s ease,background-color .25s ease,opacity .25s ease;white-space:nowrap}
.sh-btn:active{transform:scale(.97)}
.sh-btn--light{background:var(--surface--light,#fff);color:var(--color-text--base,#111)}
.sh-btn--primary{background:var(--brand-primary--500,#00d5c8);color:var(--color-text--inverted,#fff)}
.sh-btn svg{width:1.1em;height:1.1em;flex:none}
.sh-trust{pointer-events:auto;color:var(--color-text--inverted,#fff)}
.sh-trust-t{font-size:var(--text--base,1rem);line-height:var(--leading--normal,1.4);color:var(--color-text--inverted,#fff);opacity:.75}

/* ── Film grain (port of grain.js v3.1 + grain.css v3.0) ─────── */
.sh-grain{position:absolute;top:-100%;left:-100%;width:300%;height:300%;z-index:10;pointer-events:none;mix-blend-mode:overlay;opacity:var(--grain-opacity,.08);background-size:256px 256px;background-repeat:repeat;will-change:transform;animation:sh-grain var(--grain-speed,800ms) steps(1) infinite}
.sh.is-offscreen .sh-grain{animation-play-state:paused}
@keyframes sh-grain{0%{transform:translate(0,0)}11%{transform:translate(-4%,-6%)}22%{transform:translate(5%,3%)}33%{transform:translate(-6%,7%)}44%{transform:translate(3%,-5%)}55%{transform:translate(-7%,2%)}66%{transform:translate(6%,-4%)}77%{transform:translate(-3%,6%)}88%{transform:translate(4%,-7%)}100%{transform:translate(0,0)}}
@media (prefers-reduced-motion:reduce){.sh-grain{display:none}}

/* ── Stagger button (port of stagger-button.js v1.0, no SplitText) ──
   Characters of the label stagger UP and fade out while a clone staggers
   up FROM BELOW — 0.5s power3.inOut, 0.03s apart, reversed on leave. */
.sh-stg-wrap{position:relative;display:inline-block;overflow:hidden;line-height:1.2}
.sh-stg-txt{display:inline-block;white-space:nowrap}
.sh-stg-txt--clone{position:absolute;top:0;left:0;width:100%;pointer-events:none}
.sh-stg-c{display:inline-block;transition:transform .5s cubic-bezier(.65,0,.35,1),opacity .5s cubic-bezier(.65,0,.35,1);transition-delay:calc(var(--i) * .03s)}
.sh-stg-txt--clone .sh-stg-c{transform:translateY(100%);opacity:0}
.sh-stg:hover .sh-stg-txt--orig .sh-stg-c{transform:translateY(-100%);opacity:0}
.sh-stg:hover .sh-stg-txt--clone .sh-stg-c{transform:translateY(0);opacity:1}
@media (prefers-reduced-motion:reduce){.sh-stg-c{transition:none}.sh-stg:hover .sh-stg-txt--orig .sh-stg-c{transform:none;opacity:1}.sh-stg-txt--clone{display:none}}

/* ── Scene 2 (shared) ── */
.sh-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:10;pointer-events:none}
.sh-bg-ovl{position:absolute;inset:0;z-index:15;pointer-events:none}
.sh-phrase,.sh-phrase-m{position:relative;z-index:20;margin:0;max-width:var(--container--lg,64rem);line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--normal,400);text-align:center}
.sh-accent{color:var(--brand-primary--500,#00d5c8)}
.sh-desc{position:relative;z-index:20;margin:0;max-width:var(--container--lg,64rem);text-align:center;font-size:var(--text--lg,1.125rem);line-height:var(--leading--relaxed,1.6);text-wrap:balance}
.sh-stats{position:relative;z-index:20;width:100%;max-width:var(--container--2xl,80rem);border-top:1px solid var(--border--color-border-page,#e5e7eb);border-bottom:1px solid var(--border--color-border-page,#e5e7eb)}
.sh-stat{display:flex;flex-direction:column;align-items:center;gap:var(--spacing--2,.5rem)}
.sh-stat-n{display:inline-block;text-align:center;line-height:1;font-weight:var(--font-weight--normal,400);font-variant-numeric:tabular-nums}
.sh-stat-l{font-size:var(--text--sm,.875rem);line-height:var(--leading--normal,1.4);font-weight:var(--font-weight--medium,500);color:var(--color-text--muted,#666);text-align:center}

/* ═══ DESKTOP (≥ 992px) — pinned 100vh box, scene 2 overlaid ═══ */
@media (min-width:992px){
  .sh-hero{height:100vh;background:var(--neutral--050,#f5f5f7)}
  .sh-top{height:100%}
  .sh-ovl{background:linear-gradient(to bottom,transparent 35%,oklch(14% 0 0 / .5) 100%)}
  .sh-s1-in{padding:0 var(--view--px,2rem)}
  .sh-h1{font-size:var(--text--6xl,3.75rem)}
  .sh-trust{position:absolute;left:0;right:0;bottom:0;display:flex;align-items:center;gap:var(--spacing--8,2rem);max-width:var(--container--2xl,80rem);margin:0 auto;padding:0 var(--view--px,2rem) var(--spacing--6,1.5rem)}
  .sh-trust-t{flex:none;padding-right:var(--spacing--12,3rem);border-right:1px solid rgba(255,255,255,.35)}
  .sh-trust-b{flex:1 1 auto;min-width:0}

  /* Scene 2 = an overlay of the same 100vh box: opacity 0 until the scrub
     timeline fades it in (it never affects the hero's height). */
  .sh-s2{position:absolute;inset:0;z-index:2;pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--spacing--8,2rem);padding:var(--section--py-2,4rem) var(--view--px,2rem);overflow:hidden;opacity:0;color:var(--color-text--base,#111)}
  .sh-bg-ovl{background:radial-gradient(circle farthest-corner at 100% 100%,var(--surface--base,#fff),transparent 10%),radial-gradient(circle farthest-corner at 0% 100%,var(--surface--base,#fff),transparent 10%),linear-gradient(0deg,var(--surface--base,#fff),transparent 12%)}
  .sh-phrase-m{display:none}
  .sh-phrase{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:var(--spacing--3,.75rem);margin:0 0 var(--spacing--10,2.5rem);padding:0 var(--spacing--8,2rem);font-size:min(var(--text--6xl,3.75rem),5.6vw)}
  .sh-word{display:inline-block}
  .sh-line{display:inline-flex;align-items:center;gap:var(--spacing--3,.75rem);white-space:nowrap;flex-shrink:0;max-width:100%}
  .sh-break{flex-basis:100%;height:0}
  .sh-slot{display:inline-block;width:7rem;aspect-ratio:16/9;border-radius:var(--radius--md,8px);overflow:hidden;vertical-align:middle;flex-shrink:0;position:relative;z-index:20}
  .sh-desc{width:100%;color:var(--color-text--base,#111)}
  .sh-stats{padding:var(--spacing--10,2.5rem) 0}
  .sh-stats-in{max-width:var(--container--lg,64rem);margin:0 auto;display:flex;justify-content:space-between;gap:var(--spacing--4,1rem)}
  .sh-stat{cursor:default}
  .sh-stat-n{font-size:var(--text--6xl,3.75rem)}

  /* Reduced motion / no gsap: scene 2 shown, scene 1 + video gone */
  .sh-hero.is-static .sh-vw,.sh-hero.is-static .sh-scene--1{display:none}
  .sh-hero.is-static .sh-s2{opacity:1;pointer-events:auto}
  .sh-hero.is-static .sh-word,.sh-hero.is-static .sh-desc,.sh-hero.is-static .sh-stat{opacity:1;transform:none}
  .sh-hero.is-static .sh-slot{display:none}
}

/* ═══ TABLET + MOBILE (≤ 991px) — static vertical flow ═════════ */
@media (max-width:991px){
  .sh-top{height:100vh;height:100svh;min-height:480px;overflow:hidden;background:#0b0b0d}
  .sh-ovl{background:linear-gradient(to bottom,rgba(0,0,0,.05) 15%,rgba(0,0,0,.45) 60%,rgba(0,0,0,.7) 100%)}
  /* Clear the fixed navbar + Top Bar (when present) so the centered copy never
     sits under them: --topbar-h is written on <html> by the Top Bar component
     and inherits through the shadow root; it is 0 when the bar is hidden. */
  .sh-s1-in{padding:calc(var(--nav-height,3.75rem) + var(--topbar-h,0px) + clamp(1rem,4vw,2rem)) var(--view--px,1.5rem) clamp(1.5rem,4vw,2.5rem)}
  .sh-h1{font-size:clamp(2rem,5.6vw,3.25rem);letter-spacing:-.01em}
  .sh-trust{position:relative;z-index:2;flex:none;display:flex;flex-direction:column;gap:var(--spacing--3,.75rem);padding:0 0 var(--spacing--5,1.25rem)}
  .sh-trust-t{padding:0 var(--view--px,1.5rem);text-align:center}
  .sh-trust-b{width:100%}
  .sh-phrase{display:none}
  .sh-s2{position:relative;padding:var(--section--py-2,4rem) var(--view--px,1.5rem);display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--spacing--6,1.5rem)}
  .sh-bg-ovl{background:linear-gradient(0deg,var(--surface--base,#fff),transparent 12%),linear-gradient(180deg,var(--surface--base,#fff),transparent 12%)}
  .sh-phrase-m{font-size:clamp(2rem,6.5vw,3.5rem);text-wrap:balance}
  .sh-desc{color:var(--color-text--muted,#555)}
  .sh-stats{margin-top:var(--spacing--6,1.5rem);padding:var(--spacing--8,2rem) 0}
  .sh-stats-in{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--spacing--8,2rem) var(--spacing--4,1rem)}
  .sh-stat-n{font-size:clamp(2.25rem,7vw,3.5rem)}

  /* Fade-up reveals: only once an effect has added .is-animated (the server
     HTML shows everything), elements already on screen get .is-in first. */
  .sh-hero.is-animated [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
  .sh-hero.is-animated [data-reveal].is-in{opacity:1;transform:none}
  .sh-hero.is-animated .sh-s1-in [data-reveal]:nth-child(2){transition-delay:.08s}
  .sh-hero.is-animated .sh-s1-in [data-reveal]:nth-child(3){transition-delay:.16s}
  .sh-hero.is-animated .sh-stats-in [data-reveal]:nth-child(2){transition-delay:.08s}
  .sh-hero.is-animated .sh-stats-in [data-reveal]:nth-child(3){transition-delay:.16s}
  .sh-hero.is-animated .sh-stats-in [data-reveal]:nth-child(4){transition-delay:.24s}
}
@media (min-width:768px) and (max-width:991px){
  .sh-trust{flex-direction:row;align-items:center;gap:var(--spacing--8,2rem);padding-left:var(--view--px,1.5rem);padding-right:var(--view--px,1.5rem);padding-bottom:var(--spacing--6,1.5rem)}
  .sh-trust-t{flex:none;padding:0 var(--spacing--8,2rem) 0 0;text-align:left;border-right:1px solid rgba(255,255,255,.35)}
  .sh-trust-b{flex:1 1 auto;min-width:0}
  .sh-stats-in{grid-template-columns:repeat(4,minmax(0,1fr))}
}
@media (prefers-reduced-motion:reduce){
  .sh-hero.is-animated [data-reveal]{opacity:1;transform:none;transition:none}
}
`;

/* Film grain overlay — same SVG feTurbulence tile as grain.js, animated by
   CSS steps() so it costs nothing per frame. Parent must clip (overflow:hidden). */
function Grain({ intensity, size, speed }: { intensity: number; size: number; speed: number }) {
  const uri = React.useMemo(() => {
    const freq = Math.max(0.3, Math.min(0.9, isNaN(size) ? 0.65 : size)).toFixed(2);
    const svg = [
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>",
      "<filter id='g' x='0%' y='0%' width='100%' height='100%'>",
      "<feTurbulence type='fractalNoise' baseFrequency='" + freq + "' numOctaves='4' stitchTiles='stitch' result='noise'/>",
      "<feColorMatrix type='saturate' values='0' in='noise' result='gray'/>",
      "<feComponentTransfer in='gray'><feFuncR type='linear' slope='3' intercept='-1'/><feFuncG type='linear' slope='3' intercept='-1'/><feFuncB type='linear' slope='3' intercept='-1'/></feComponentTransfer>",
      "</filter><rect width='100%' height='100%' filter='url(#g)'/></svg>",
    ].join("");
    return "url(\"data:image/svg+xml;base64," + (typeof btoa === "function" ? btoa(svg) : "") + "\")";
  }, [size]);
  const op = Math.max(0, Math.min(1, isNaN(intensity) ? 0.15 : intensity));
  const ms = !speed || speed < 100 ? 800 : speed;
  return (
    <div
      className="sh-grain"
      aria-hidden="true"
      style={{ backgroundImage: uri, "--grain-opacity": op, "--grain-speed": ms + "ms" } as React.CSSProperties}
    />
  );
}

/* Button label split into characters + a clone, for the hover stagger. */
function StaggerLabel({ text }: { text: string }) {
  const chars = Array.from(text);
  const row = (cls: string) => (
    <span className={"sh-stg-txt " + cls} aria-hidden="true">
      {chars.map((ch, i) => (
        <span key={i} className="sh-stg-c" style={{ "--i": i } as React.CSSProperties}>{ch === " " ? "\u00A0" : ch}</span>
      ))}
    </span>
  );
  return (
    <span className="sh-stg-wrap">
      {row("sh-stg-txt--orig")}
      {row("sh-stg-txt--clone")}
    </span>
  );
}

const ARROW = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 12h15m0 0l-5.625-6m5.625 6l-5.625 6" />
  </svg>
);

const linkAttrs = (v: LinkValue | undefined) => ({
  href: (v && v.href) || "#",
  target: v && v.target && v.target !== "_self" ? v.target : undefined,
  rel: v && v.target === "_blank" ? "noopener" : undefined,
});

/* Button 1 — "stagger-up-animate" in the Webflow markup: char stagger on hover */
function Cta1({ c }: { c: Content }) {
  const stg = c.staggerButton && c.animated;
  return (
    <a className={"sh-btn sh-btn--light" + (stg ? " sh-stg" : "")} {...linkAttrs(c.cta1Link)} aria-label={stg ? c.cta1Label : undefined}>
      {stg ? <StaggerLabel text={c.cta1Label} /> : c.cta1Label}
    </a>
  );
}

/* Trusted-by band — the Logos slot's images run through LogoMarquee INSIDE
   the hero. Whatever lands in the slot works: a bare Collection List, or the
   old Webflow marquee block (its <img>s are read via <slot>.assignedElements,
   duplicates from marquee.js clones are de-duplicated by src). */
function LogoBand({ c }: { c: Content }) {
  return (
    <LogoMarquee logos={c.logos} speed={c.marqueeSpeed} logoSize={c.marqueeLogoSize} gap={c.marqueeGap} />
  );
}

/* Shared, normalised content for both variants */
type Content = {
  videoUrl: string; posterUrl: string; overlay: boolean;
  title: string; subtitle: string;
  cta1Label: string; cta1Link?: LinkValue; cta2Label: string; cta2Link?: LinkValue;
  trustedText: string; logos?: React.ReactNode;
  phrase: string; description: string; stats: StatDef[]; bgSrc?: string;
  animated: boolean;
  grain: boolean; grainIntensity: number; grainSize: number; grainSpeed: number;
  staggerButton: boolean;
  marqueeSpeed: number; marqueeLogoSize: number; marqueeGap: number;
};

type GsapLike = any;
declare global { interface Window { gsap?: GsapLike; ScrollTrigger?: GsapLike; Sestek?: { refreshScroll?: () => void } } }

/* ═══════════════════════════════════════════════════════════════
   ROOT — one DOM; the viewport picks the BEHAVIOUR (effects only)
   ═══════════════════════════════════════════════════════════════ */
export function HeroTablet(p: HeroTabletProps) {
  const desktopMq = useMedia("(min-width: 992px)");
  const reduce = useMedia("(prefers-reduced-motion: reduce)") === true;
  const desktop = desktopMq === true;          // attach the GSAP pin + scrub
  const mobile = desktopMq === false;          // attach IO reveal + count-up
  const animated = (p.animate !== false) && !reduce;
  const rootRef = React.useRef<HTMLElement>(null);

  // Pause the grain keyframe animation while the hero is scrolled out of view
  // (.is-offscreen → animation-play-state:paused) so it stops repainting.
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      const en = entries[entries.length - 1];
      root.classList.toggle("is-offscreen", !en.isIntersecting);
    }, { threshold: 0 });
    io.observe(root);
    return () => { io.disconnect(); root.classList.remove("is-offscreen"); };
  }, []);

  const stats = [
    { v: p.stat1Value, s: p.stat1Suffix, l: p.stat1Label },
    { v: p.stat2Value, s: p.stat2Suffix, l: p.stat2Label },
    { v: p.stat3Value, s: p.stat3Suffix, l: p.stat3Label },
    { v: p.stat4Value, s: p.stat4Suffix, l: p.stat4Label },
  ]
    .filter((s) => typeof s.v === "number" && !isNaN(s.v))
    .map((s) => ({ v: s.v as number, s: s.s, l: s.l }));

  const c: Content = {
    videoUrl: p.videoUrl || "", posterUrl: p.posterUrl || "", overlay: p.overlay !== false,
    title: p.title || "", subtitle: p.subtitle || "",
    cta1Label: p.cta1Label || "", cta1Link: p.cta1Link, cta2Label: p.cta2Label || "", cta2Link: p.cta2Link,
    trustedText: p.trustedText || "", logos: p.logos,
    phrase: p.phrase || "", description: p.description || "", stats, bgSrc: p.bgImage && p.bgImage.src,
    animated,
    grain: p.grain !== false, grainIntensity: p.grainIntensity ?? 0.08, grainSize: p.grainSize ?? 0.3, grainSpeed: p.grainSpeed ?? 800,
    staggerButton: p.staggerButton !== false,
    marqueeSpeed: p.marqueeSpeed ?? 60, marqueeLogoSize: p.marqueeLogoSize ?? 6.25, marqueeGap: p.marqueeGap ?? 3,
  };
  const scrollDistance = p.scrollDistance ?? 2.5;

  /* ── refs shared by both behaviours ── */
  const hero = React.useRef<HTMLDivElement>(null);
  const vw = React.useRef<HTMLDivElement>(null);
  const video = React.useRef<HTMLVideoElement>(null);
  const ovl = React.useRef<HTMLDivElement>(null);
  const s1 = React.useRef<HTMLDivElement>(null);
  const s2 = React.useRef<HTMLDivElement>(null);
  const slot = React.useRef<HTMLSpanElement>(null);
  const desc = React.useRef<HTMLParagraphElement>(null);
  const words = React.useRef<(HTMLSpanElement | null)[]>([]);
  const statEls = React.useRef<(HTMLDivElement | null)[]>([]);
  const [statStart, setStatStart] = React.useState<boolean[]>([]);
  const [noGsap, setNoGsap] = React.useState(false);

  const tokens = React.useMemo(() => tokenize(c.phrase.replace(/\|/g, " ")), [c.phrase]);
  const hasSlot = tokens.some((t) => t.slot) && !!(c.videoUrl || c.posterUrl);
  const isStatic = !c.animated || noGsap;               // desktop only (scoped by media query)
  const dist = Math.max(0.5, scrollDistance);            // × viewport, hero.js: 2.5
  const mobilePhrase = c.phrase.replace(/\s*\[video\]\s*/gi, " ").replace(/\s*\|\s*/g, " ");

  /* `muted` is a property, not an attribute, in React's server HTML — the
     browser's autoplay gate may have refused the unmuted stream before
     hydration, so mute + (re)start it once the element is ours. */
  React.useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    if (v.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
  }, [c.videoUrl]);

  /* ── DESKTOP: hero.js v1.9 build(), verbatim, on the site's global gsap ──
     useLayoutEffect: when the breakpoint leaves desktop its cleanup runs
     before paint, so the pin-spacer ScrollTrigger wrapped around the hero is
     reverted before the mobile flow layout shows. */
  useIsoLayoutEffect(() => {
    if (!desktop || !c.animated) return;
    const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) {
      console.warn("[Sestek Hero] gsap + ScrollTrigger not found on window — showing scene 2 statically.");
      setNoGsap(true);
      return;
    }
    const heroEl = hero.current, vwEl = vw.current, s1El = s1.current, s2El = s2.current;
    if (!heroEl || !vwEl || !s1El || !s2El) return;
    const heroNode: HTMLDivElement = heroEl;
    gsap.registerPlugin(ScrollTrigger);

    const el = {
      videoWrap: vwEl,
      overlay: ovl.current,
      s1Content: s1El,
      scene2: s2El,
      words: words.current.filter((w): w is HTMLSpanElement => !!w),
      slot: hasSlot ? slot.current : null,
      desc: desc.current,
      stats: statEls.current.filter((s): s is HTMLDivElement => !!s),
    };
    const navEl = document.querySelector<HTMLElement>("[data-nav]");
    const hasStats = el.stats.length > 0;
    let activeST: GsapLike = null, activeTl: GsapLike = null;
    const fired: boolean[] = el.stats.map(() => false);

    function build() {
      // Rebuild must NOT move the scroll (see hero.js v1.8.3): clean kill +
      // restore scrollY exactly once the new pin is in place.
      const keepY = window.scrollY;
      if (activeST) {
        activeST.kill();
        if (activeTl) { activeTl.kill(); activeTl = null; }
        if (window.Sestek && window.Sestek.refreshScroll) window.Sestek.refreshScroll();
        else ScrollTrigger.refresh();
      }

      const vwW = window.innerWidth, vwH = window.innerHeight;

      // HERO-relative slot measurement: while pinned the hero's top-left is
      // the viewport's top-left, so this stays correct even when the page is
      // already scrolled at rebuild time.
      let targetScaleX = 0.2, targetScaleY = 0.2, targetX = 0, targetY = 0, finalBorderRadius = 8;
      if (el.slot) {
        gsap.set(el.slot, { width: "7rem", opacity: 1 });
        const slotRect = el.slot.getBoundingClientRect();
        const heroRect = heroNode.getBoundingClientRect();
        targetScaleX = slotRect.width / vwW;
        targetScaleY = slotRect.height / vwH;
        targetX = ((slotRect.left - heroRect.left) + slotRect.width * 0.5) - vwW * 0.5;
        targetY = ((slotRect.top - heroRect.top) + slotRect.height * 0.5) - vwH * 0.5;
        // scale() shrinks border-radius too — compensate so it reads as 8px.
        finalBorderRadius = Math.round(8 / Math.min(targetScaleX, targetScaleY));
      }

      // Hard-reset before re-building so resize doesn't leave stale values.
      // These are ALSO the scene-2 start states (opacity 0 / y offset) — they
      // are applied here, client-side, never in the server HTML.
      gsap.set(el.videoWrap, { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1, borderRadius: 0 });
      if (el.overlay) gsap.set(el.overlay, { opacity: 1 });
      gsap.set(el.s1Content, { opacity: 1, y: 0 });
      gsap.set(el.scene2, { opacity: 0 });
      el.s1Content.style.pointerEvents = "auto";
      el.scene2.style.pointerEvents = "none";
      gsap.set(el.words, { opacity: 0, y: 40 });
      if (el.desc) gsap.set(el.desc, { opacity: 0, y: 20 });
      if (hasStats) gsap.set(el.stats, { opacity: 0, y: 24 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },           // scrub handles timing; per-tween eases override
        scrollTrigger: {
          trigger: heroNode,
          start: "top top",
          end: "+=" + Math.round(dist * 100) + "%",   // 2.5× viewport of scroll distance
          pin: true,
          scrub: 1,                            // 1s lag — heavy/premium
          anticipatePin: 1,
          // Hero sits at the very top: its pin must refresh BEFORE any pin
          // below it (PROJECT.md refreshPriority table: hero = 2).
          refreshPriority: 2,
          onUpdate: (self: GsapLike) => {
            const inScene2 = self.progress >= 0.34;
            if (navEl) navEl.classList.toggle("nav--on-light", inScene2);
            el.s1Content.style.pointerEvents = inScene2 ? "none" : "auto";
            el.scene2.style.pointerEvents = inScene2 ? "auto" : "none";
          },
          onLeaveBack: () => {
            if (navEl) navEl.classList.remove("nav--on-light");
            el.s1Content.style.pointerEvents = "auto";
            el.scene2.style.pointerEvents = "none";
          },
        },
      });

      // Phase 1 (0.00–0.20): scene-1 text exits
      tl.to(el.s1Content, { opacity: 0, y: -28, ease: "power2.in", duration: 0.20 }, 0);
      // Phase 2 (0.06–0.28): dark overlay fades
      if (el.overlay) tl.to(el.overlay, { opacity: 0, duration: 0.22 }, 0.06);
      // Phase 3 (0.16–0.64): video morphs to the inline slot
      if (el.slot) {
        tl.to(el.videoWrap, {
          scaleX: targetScaleX, scaleY: targetScaleY, x: targetX, y: targetY,
          borderRadius: finalBorderRadius + "px", ease: "power2.inOut", duration: 0.48,
        }, 0.16);
      }
      // Phase 4 (0.34–0.46): scene 2 fades in
      tl.to(el.scene2, { opacity: 1, duration: 0.12 }, 0.34);
      // Phase 5 (0.40–…): words stagger in
      el.words.forEach((word, i) => {
        tl.to(word, { opacity: 1, y: 0, ease: "power3.out", duration: 0.14 }, 0.40 + i * 0.08);
      });
      // Phase 6 (0.74–0.86): description
      if (el.desc) tl.to(el.desc, { opacity: 1, y: 0, ease: "power3.out", duration: 0.12 }, 0.74);
      // Phase 7 (0.80–0.88): video fades from the slot
      tl.to(el.videoWrap, { opacity: 0, duration: 0.08 }, 0.80);
      // Phase 8 (0.86–0.96): slot collapses
      if (el.slot) tl.to(el.slot, { width: 0, opacity: 0, ease: "power2.inOut", duration: 0.10 }, 0.86);
      // Phase 9 (0.76–0.92): stats stagger in; last one lands at 0.92
      if (hasStats) {
        const sDur = 0.10, sStart = 0.76, sEnd = 0.92;
        const sSpace = el.stats.length > 1 ? (sEnd - sStart - sDur) / (el.stats.length - 1) : 0;
        el.stats.forEach((stat, i) => {
          tl.to(stat, {
            opacity: 1, y: 0, ease: "power3.out", duration: sDur,
            onStart: () => {
              // counter rolls the moment the stat starts revealing — once
              if (!fired[i]) { fired[i] = true; setStatStart(fired.slice()); }
            },
          }, sStart + i * sSpace);
        });
      }

      activeST = tl.scrollTrigger;
      activeTl = tl;
      if (Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
    }

    build();

    // The behaviour attaches on hydration, usually after ScrollTrigger's own
    // window.load refresh has run — so take one measured refresh now, through
    // the site's jank-guarded pipe when it exists.
    const lateRefresh = () => {
      if (window.Sestek && window.Sestek.refreshScroll) window.Sestek.refreshScroll();
      else ScrollTrigger.refresh();
    };
    if (document.readyState === "complete") lateRefresh();
    else window.addEventListener("load", lateRefresh, { once: true });
    // Fonts still loading → re-measure once they land. Already loaded → the
    // build() above measured final metrics, so skip the duplicate rebuild.
    if (document.fonts && document.fonts.ready && document.fonts.status !== "loaded") document.fonts.ready.then(() => { build(); }).catch(() => {});

    // Recalculate slot position on resize (slot may reflow between widths)
    let resizeTimer = 0;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = window.setTimeout(build, 180); };
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", lateRefresh);
      // kill(true) = revert: removes the pin-spacer and inline pin styles so
      // the DOM is exactly as React rendered it. Restore scrollY afterwards —
      // dropping the spacer would otherwise teleport the page.
      const keepY = window.scrollY;
      if (activeTl) activeTl.kill();
      if (activeST) activeST.kill(true);
      if (Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
      gsap.set([el.videoWrap, el.overlay, el.s1Content, el.scene2, el.slot, el.desc, ...el.words, ...el.stats].filter(Boolean), { clearProps: "all" });
      el.s1Content.style.pointerEvents = "";
      el.scene2.style.pointerEvents = "";
      if (navEl) navEl.classList.remove("nav--on-light");
    };
  }, [desktop, c.animated, hasSlot, dist, tokens.length, c.stats.length]);

  /* ── TABLET + MOBILE: fade-up reveals ──
     useLayoutEffect: `.is-animated` (which makes [data-reveal] start at
     opacity 0) and `.is-in` for the elements already inside the viewport
     (H1, subtitle, CTAs) land in the same pass BEFORE the first paint, so
     nothing ever flashes at opacity 0 — and the server HTML shows all of it. */
  useIsoLayoutEffect(() => {
    const root = hero.current;
    if (!root || !mobile || !c.animated) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;
    root.classList.add("is-animated");
    const vh = window.innerHeight;
    const pending = els.filter((el) => {
      if (el.getBoundingClientRect().top < vh) { el.classList.add("is-in"); return false; }
      return true;
    });
    let io: IntersectionObserver | null = null;
    if (pending.length) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io!.unobserve(e.target); }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      pending.forEach((el) => io!.observe(el));
    }
    return () => {
      if (io) io.disconnect();
      root.classList.remove("is-animated");
      els.forEach((el) => el.classList.remove("is-in"));
    };
  }, [mobile, c.animated, c.title, c.subtitle, c.phrase, c.description]);

  let wi = 0;
  return (
    <section ref={rootRef} className="sh" data-hero-component data-variant={desktop ? "desktop" : "mobile"}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={hero} className={"sh-hero" + (isStatic ? " is-static" : "")} data-hero>
        {/* ── Scene 1 shell: desktop = the pinned 100vh box, mobile = the 100svh video block ── */}
        <div className="sh-top">
          {/* video layer (rendered once — one download) */}
          <div ref={vw} className="sh-vw">
            {c.videoUrl ? (
              <video ref={video} className="sh-vid" autoPlay muted loop playsInline preload="none" poster={c.posterUrl || undefined} aria-hidden="true">
                <source src={c.videoUrl} type="video/mp4" />
              </video>
            ) : c.posterUrl ? <img className="sh-vid" src={c.posterUrl} alt="" /> : null}
            {c.overlay && <div ref={ovl} className="sh-ovl" />}
            {c.grain && c.animated && <Grain intensity={c.grainIntensity} size={c.grainSize} speed={c.grainSpeed} />}
          </div>

          {/* scene 1 */}
          <div className="sh-scene sh-scene--1">
            <div ref={s1} className="sh-s1">
              <div className="sh-s1-in">
                {c.title && <h1 className="sh-h1" data-reveal>{renderLines(c.title)}</h1>}
                {c.subtitle && <p className="sh-sub" data-reveal>{c.subtitle}</p>}
                {(c.cta1Label || c.cta2Label) && (
                  <div className="sh-ctas" data-reveal>
                    {c.cta1Label && <Cta1 c={c} />}
                    {c.cta2Label && <a className="sh-btn sh-btn--primary" {...linkAttrs(c.cta2Link)}><span>{c.cta2Label}</span>{ARROW}</a>}
                  </div>
                )}
              </div>
              {(c.trustedText || c.logos) && (
                <div className="sh-trust">
                  {c.trustedText && <div className="sh-trust-t">{renderLines(c.trustedText)}</div>}
                  <div className="sh-trust-b"><LogoBand c={c} /></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Scene 2: desktop = overlay of the pinned box, mobile = flows below ── */}
        {(tokens.length > 0 || c.description || c.stats.length > 0) && (
          <div ref={s2} className="sh-s2" data-nav-theme="light">
            {c.bgSrc && <img className="sh-bg" src={c.bgSrc} alt="" loading="lazy" />}
            {c.bgSrc && <div className="sh-bg-ovl" />}
            {/* desktop phrase: word-split + video slot (display:none ≤ 991px) */}
            {tokens.length > 0 && (
              <h2 className="sh-phrase">
                {(() => {
                  // Explicit lines: the Phrase prop is split on "|". Each line is
                  // ONE nowrap group, so nothing ever re-wraps or jumps between
                  // lines while the words animate in. "[video]" marks the slot.
                  const word = (tok: Token, key: React.Key) => (
                    <span key={key} ref={(el) => { words.current[wi++] = el; }} className={"sh-word" + (tok.accent ? " sh-accent" : "")}>{tok.word}</span>
                  );
                  let slotDone = false;
                  return lines(c.phrase).map((ln, li) => (
                    <React.Fragment key={li}>
                      {li > 0 && <span className="sh-break" aria-hidden="true" />}
                      <span className="sh-line">
                        {tokenize(ln).map((t, i) => {
                          if (t.slot) {
                            if (!hasSlot || slotDone) return null;
                            slotDone = true;
                            return <span key={li + "-s"} ref={slot} className="sh-slot" aria-hidden="true" />;
                          }
                          return word(t, li + "-" + i);
                        })}
                      </span>
                    </React.Fragment>
                  ));
                })()}
              </h2>
            )}
            {/* mobile phrase: plain text with accents (display:none ≥ 992px) */}
            {mobilePhrase.trim() && (
              <h2 className="sh-phrase-m" data-reveal>
                {accentSegments(mobilePhrase).map((seg, i) =>
                  seg.accent ? <span key={i} className="sh-accent">{seg.t}</span> : <React.Fragment key={i}>{seg.t}</React.Fragment>
                )}
              </h2>
            )}
            {c.description && <p ref={desc} className="sh-desc" data-reveal>{c.description}</p>}
            {c.stats.length > 0 && (
              <div className="sh-stats"><div className="sh-stats-in">
                {c.stats.map((s, i) => (
                  <Stat key={i} stat={s} start={isStatic || !!statStart[i]} io={mobile} animate={c.animated} refCb={(el) => { statEls.current[i] = el; }} />
                ))}
              </div></div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
