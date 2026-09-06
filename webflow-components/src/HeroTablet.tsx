/*!
 * HeroTablet — tablet & mobile (≤ 991px) hero for the home page.
 *
 * The desktop hero (hero.js / hero.css, ≥ 992px) pins the section and morphs
 * a fullscreen video into an inline slot while the user scrolls. That
 * animation is desktop-only; this component is the static, vertically
 * flowing counterpart Designer users drop in for tablet & mobile. Both
 * scenes of the desktop hero are merged into one flow:
 *
 *   1. Video block — background video (poster, muted, loop, preload=none)
 *      with the scene-1 copy on top: title, subtitle, two CTAs.
 *   2. Trusted-by row — label + a Slot for the Logo Marquee code component
 *      (which itself holds the Clients Collection List). Sits INSIDE the
 *      video block, at its bottom edge, so the video runs behind the logos
 *      just like the desktop scene 1.
 *   3. Phrase + description — the scene-2 statement, accent words in brand
 *      colour (wrap them in *asterisks* in the prop).
 *   4. Stats — up to four counters that count up once they scroll into view
 *      (no dependency on count-up.js), 2 columns on phones, 4 on tablets.
 *
 * No GSAP, no ScrollTrigger, no pin. Entrance reveals are CSS transitions
 * flipped on by an IntersectionObserver; prefers-reduced-motion shows
 * everything immediately and skips the counters' roll.
 *
 * Lives in Webflow's Code Component shadow root: site classes don't reach in,
 * but CSS custom properties DO inherit, so colours/spacing use the site's
 * variables with sane fallbacks. Font-family is inherited from the page.
 */

import * as React from "react";

type LinkValue = { href: string; target?: string; preload?: string };
type ImageValue = { src: string; alt?: string };

export interface HeroTabletProps {
  videoUrl?: string;
  posterUrl?: string;
  videoHeight?: number;
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
}

/* "Line one|Line two" or "Line one<br>Line two" → array of lines */
function lines(text: string | undefined): string[] {
  if (!text) return [];
  return text.split(/\s*(?:\||<br\s*\/?>|\n)\s*/).filter((s) => s.length > 0);
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

function useReducedMotion(): boolean {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduce(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener("change", on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", on);
      else mq.removeListener(on);
    };
  }, []);
  return reduce;
}

/* Count-up: rolls from 0 to `target` the first time the element is visible. */
function useCountUp(target: number, enabled: boolean, duration = 1.6) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [value, setValue] = React.useState(enabled ? 0 : target);

  React.useEffect(() => {
    if (!enabled) { setValue(target); return; }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let done = false;
    const run = () => {
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / (duration * 1000));
        const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);   // easeOutExpo
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      if (done) return;
      if (entries.some((e) => e.isIntersecting)) {
        done = true;
        io.disconnect();
        run();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, enabled, duration]);

  return { ref, value };
}

function Stat({ value, suffix, label, animate }: { value: number; suffix?: string; label?: string; animate: boolean }) {
  const { ref, value: shown } = useCountUp(value, animate);
  return (
    <div className="sht-stat" data-reveal>
      <div ref={ref} className="sht-stat-n">
        {shown.toLocaleString("en-US")}{suffix || ""}
      </div>
      {label && (
        <div className="sht-stat-l">
          {lines(label).map((l, i) => (
            <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

const CSS = `
.sht{position:relative;width:100%;background:var(--surface--base,#fff);color:var(--color-text--base,#111);box-sizing:border-box;overflow:hidden}
.sht *,.sht *::before,.sht *::after{box-sizing:border-box}

/* ── 1. Video block ────────────────────────────────────────── */
.sht-video{position:relative;width:100%;min-height:480px;overflow:hidden;background:#0b0b0d;display:flex;flex-direction:column;justify-content:flex-end}
.sht-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.sht-ovl{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.05) 15%,rgba(0,0,0,.45) 60%,rgba(0,0,0,.7) 100%);pointer-events:none}
.sht-s1{position:relative;z-index:2;width:100%;flex:1 1 auto;justify-content:center;padding:clamp(1.5rem,5vw,3rem) var(--view--px,1.5rem) clamp(1.5rem,4vw,2.5rem);display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--spacing--4,1rem);color:var(--color-text--inverted,#fff)}
.sht-h1{margin:0;font-size:clamp(2rem,5.6vw,3.25rem);line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--medium,500);letter-spacing:-.01em;text-wrap:balance}
.sht-sub{margin:0;max-width:var(--container--sm,36rem);font-size:var(--text--base,1rem);line-height:var(--leading--relaxed,1.6);opacity:.85;text-wrap:balance}
.sht-ctas{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:var(--spacing--4,1rem);margin-top:var(--spacing--2,.5rem)}
.sht-btn{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;font-weight:var(--font-weight--medium,500);font-size:var(--text--sm,.875rem);line-height:1;border-radius:var(--radius--full,999px);padding:.8rem 1.25rem;transition:transform .25s ease,background-color .25s ease,opacity .25s ease;white-space:nowrap}
.sht-btn:active{transform:scale(.97)}
.sht-btn--light{background:var(--surface--light,#fff);color:var(--color-text--base,#111)}
.sht-btn--primary{background:var(--brand-primary--500,#00d5c8);color:var(--color-text--inverted,#fff)}
.sht-btn svg{width:1.1em;height:1.1em;flex:none}

/* ── 2. Trusted by ─────────────────────────────────────────── */
/* Over the video, pinned to its bottom edge (desktop: .absolute.bottom row) */
.sht-trust{position:relative;z-index:2;flex:none;display:flex;flex-direction:column;gap:var(--spacing--3,.75rem);padding:0 0 var(--spacing--5,1.25rem);color:var(--color-text--inverted,#fff)}
.sht-trust-t{padding:0 var(--view--px,1.5rem);font-size:var(--text--base,1rem);line-height:var(--leading--normal,1.4);color:var(--color-text--inverted,#fff);opacity:.75;text-align:center}
.sht-trust-b{width:100%}
@media (min-width:768px){
  .sht-trust{flex-direction:row;align-items:center;gap:var(--spacing--8,2rem);padding-left:var(--view--px,1.5rem);padding-right:var(--view--px,1.5rem);padding-bottom:var(--spacing--6,1.5rem)}
  .sht-trust-t{flex:none;padding:0 var(--spacing--8,2rem) 0 0;text-align:left;border-right:1px solid rgba(255,255,255,.35)}
  .sht-trust-b{flex:1 1 auto;min-width:0}
}

/* ── 3. Phrase + description ───────────────────────────────── */
.sht-s2{position:relative;padding:var(--section--py-2,4rem) var(--view--px,1.5rem);display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--spacing--6,1.5rem)}
.sht-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;pointer-events:none}
.sht-bg-ovl{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(0deg,var(--surface--base,#fff),transparent 12%),linear-gradient(180deg,var(--surface--base,#fff),transparent 12%)}
.sht-phrase{position:relative;z-index:2;margin:0;max-width:var(--container--lg,64rem);font-size:clamp(2rem,6.5vw,3.5rem);line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--normal,400);text-wrap:balance}
.sht-accent{color:var(--brand-primary--500,#00d5c8)}
.sht-desc{position:relative;z-index:2;margin:0;max-width:var(--container--lg,64rem);font-size:var(--text--lg,1.125rem);line-height:var(--leading--relaxed,1.6);color:var(--color-text--muted,#555);text-wrap:balance}

/* ── 4. Stats ──────────────────────────────────────────────── */
.sht-stats{position:relative;z-index:2;width:100%;max-width:var(--container--2xl,80rem);margin-top:var(--spacing--6,1.5rem);padding:var(--spacing--8,2rem) 0;border-top:1px solid var(--border--color-border-page,#e5e7eb);border-bottom:1px solid var(--border--color-border-page,#e5e7eb);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--spacing--8,2rem) var(--spacing--4,1rem)}
@media (min-width:768px){.sht-stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
.sht-stat{display:flex;flex-direction:column;align-items:center;gap:var(--spacing--2,.5rem)}
.sht-stat-n{font-size:clamp(2.25rem,7vw,3.5rem);line-height:1;font-weight:var(--font-weight--normal,400);font-variant-numeric:tabular-nums}
.sht-stat-l{font-size:var(--text--sm,.875rem);line-height:var(--leading--normal,1.4);font-weight:var(--font-weight--medium,500);color:var(--color-text--muted,#666)}

/* ── Reveal ────────────────────────────────────────────────── */
.sht.is-animated [data-reveal]{opacity:0;transform:translateY(18px);transition:opacity .7s cubic-bezier(.22,1,.36,1),transform .7s cubic-bezier(.22,1,.36,1)}
.sht.is-animated [data-reveal].is-in{opacity:1;transform:none}
.sht.is-animated .sht-s1 [data-reveal]:nth-child(2){transition-delay:.08s}
.sht.is-animated .sht-s1 [data-reveal]:nth-child(3){transition-delay:.16s}
.sht.is-animated .sht-stats [data-reveal]:nth-child(2){transition-delay:.08s}
.sht.is-animated .sht-stats [data-reveal]:nth-child(3){transition-delay:.16s}
.sht.is-animated .sht-stats [data-reveal]:nth-child(4){transition-delay:.24s}
@media (prefers-reduced-motion:reduce){
  .sht.is-animated [data-reveal]{opacity:1;transform:none;transition:none}
}
`;

const ARROW = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.5 12h15m0 0l-5.625-6m5.625 6l-5.625 6" />
  </svg>
);

export function HeroTablet({
  videoUrl = "",
  posterUrl = "",
  videoHeight = 72,
  overlay = true,
  title = "",
  subtitle = "",
  cta1Label = "",
  cta1Link,
  cta2Label = "",
  cta2Link,
  trustedText = "",
  logos,
  phrase = "",
  description = "",
  stat1Value, stat1Suffix, stat1Label,
  stat2Value, stat2Suffix, stat2Label,
  stat3Value, stat3Suffix, stat3Label,
  stat4Value, stat4Suffix, stat4Label,
  bgImage,
  animate = true,
}: HeroTabletProps) {
  const rootRef = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const animated = animate && !reduce;

  /* Reveal-on-scroll: flip .is-in on every [data-reveal] once visible. */
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || !animated) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [animated, title, subtitle, phrase, description]);

  const stats = [
    { v: stat1Value, s: stat1Suffix, l: stat1Label },
    { v: stat2Value, s: stat2Suffix, l: stat2Label },
    { v: stat3Value, s: stat3Suffix, l: stat3Label },
    { v: stat4Value, s: stat4Suffix, l: stat4Label },
  ].filter((s): s is { v: number; s: string | undefined; l: string | undefined } =>
    typeof s.v === "number" && !isNaN(s.v));

  const renderLines = (text: string) =>
    lines(text).map((l, i) => (
      <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
    ));

  const link = (v: LinkValue | undefined) => ({
    href: (v && v.href) || "#",
    target: v && v.target && v.target !== "_self" ? v.target : undefined,
    rel: v && v.target === "_blank" ? "noopener" : undefined,
  });

  const bgSrc = bgImage && bgImage.src;

  return (
    <section ref={rootRef} className={"sht" + (animated ? " is-animated" : "")} data-hero-tablet>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* 1 ── Video + scene-1 copy */}
      <div className="sht-video" style={{ height: Math.max(30, videoHeight) + "vh" }}>
        {videoUrl && (
          <video
            className="sht-vid"
            autoPlay
            muted
            loop
            playsInline
            preload="none"
            poster={posterUrl || undefined}
            aria-hidden="true"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}
        {!videoUrl && posterUrl && <img className="sht-vid" src={posterUrl} alt="" />}
        {overlay && <div className="sht-ovl" />}

        <div className="sht-s1">
          {title && <h1 className="sht-h1" data-reveal>{renderLines(title)}</h1>}
          {subtitle && <p className="sht-sub" data-reveal>{subtitle}</p>}
          {(cta1Label || cta2Label) && (
            <div className="sht-ctas" data-reveal>
              {cta1Label && (
                <a className="sht-btn sht-btn--light" {...link(cta1Link)}>{cta1Label}</a>
              )}
              {cta2Label && (
                <a className="sht-btn sht-btn--primary" {...link(cta2Link)}>
                  <span>{cta2Label}</span>{ARROW}
                </a>
              )}
            </div>
          )}
        </div>

        {/* 2 ── Trusted by + logo marquee (slot) — sits over the video, at
            its bottom edge, exactly like the desktop scene 1 */}
        {(trustedText || logos) && (
          <div className="sht-trust">
            {trustedText && <div className="sht-trust-t">{renderLines(trustedText)}</div>}
            <div className="sht-trust-b">{logos}</div>
          </div>
        )}
      </div>

      {/* 3+4 ── Phrase, description, stats */}
      {(phrase || description || stats.length > 0) && (
        <div className="sht-s2">
          {bgSrc && <img className="sht-bg" src={bgSrc} alt="" loading="lazy" />}
          {bgSrc && <div className="sht-bg-ovl" />}

          {phrase && (
            <h2 className="sht-phrase" data-reveal>
              {accentSegments(phrase).map((seg, i) =>
                seg.accent ? <span key={i} className="sht-accent">{seg.t}</span> : <React.Fragment key={i}>{seg.t}</React.Fragment>
              )}
            </h2>
          )}
          {description && <p className="sht-desc" data-reveal>{description}</p>}

          {stats.length > 0 && (
            <div className="sht-stats">
              {stats.map((s, i) => (
                <Stat key={i} value={s.v} suffix={s.s} label={s.l} animate={animated} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
