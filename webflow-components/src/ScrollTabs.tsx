/*!
 * ScrollTabs — "Agentic CX Suite" sticky-tabs section, desktop + tablet/mobile.
 *
 * React rewrite of the scroll-list.js / scroll-list.css pair, self-contained
 * (no GSAP, no site classes) so it renders identically inside Webflow's Code
 * Component shadow root. Up to four tabs, each = title + description + CTA +
 * a square video panel with play/pause, restart and mute controls.
 *
 * ONE DOM for every breakpoint (server-renderable, zero layout shift at
 * hydration): heading + tabs live in `.sst-left`, panels in `.sst-right`.
 * The layout is decided purely by CSS media queries, never by JS, so the
 * server markup equals the hydrated markup.
 *
 * ≥ 992px (desktop)
 *   Two-column grid. LEFT is position:sticky (heading + tab list); the
 *   active tab's body opens like an accordion, the rest collapse. RIGHT
 *   stacks the video panels in normal flow. The panel crossing the viewport
 *   centre is the active one (IntersectionObserver on a zero-height centre
 *   band, so it works with Lenis or native scroll). Clicking a tab
 *   smooth-scrolls its panel to the centre. Only the active panel's video
 *   plays.
 *
 * ≤ 991px (tablet + mobile)
 *   `.sst-left` / `.sst-right` become `display:contents` and the grid turns
 *   into a flex column; CSS `order` (tab i = 2i, panel i = 2i+1) interleaves
 *   them so each tab flows as a block: title, description, CTA, then its own
 *   video right below. No sticky, no accordion (every body is open). The
 *   video crossing the centre band plays, the others pause.
 *
 * Accordion animation is CSS (grid-template-rows 0fr → 1fr + opacity); the
 * hover/active shadow and control icon swapping mirror the site CSS.
 * prefers-reduced-motion: no transitions, no autoplay.
 */

import * as React from "react";

type LinkValue = { href: string; target?: string; preload?: string };

export interface ScrollTabsProps {
  heading?: string;
  stickyTop?: number;
  ratio?: string;
  autoplay?: boolean;

  tab1Title?: string; tab1Text?: string; tab1CtaLabel?: string; tab1CtaLink?: LinkValue; tab1Video?: string; tab1Poster?: string;
  tab2Title?: string; tab2Text?: string; tab2CtaLabel?: string; tab2CtaLink?: LinkValue; tab2Video?: string; tab2Poster?: string;
  tab3Title?: string; tab3Text?: string; tab3CtaLabel?: string; tab3CtaLink?: LinkValue; tab3Video?: string; tab3Poster?: string;
  tab4Title?: string; tab4Text?: string; tab4CtaLabel?: string; tab4CtaLink?: LinkValue; tab4Video?: string; tab4Poster?: string;
}

type Tab = { title: string; text: string; ctaLabel: string; ctaLink?: LinkValue; video: string; poster: string };

const DESKTOP = "(min-width: 992px)";

function lines(text: string | undefined): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/\s*(?:\||<br\s*\/?>|\n)\s*/).filter(Boolean);
  return parts.map((l, i) => (
    <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
  ));
}

/* Behaviour-only media query. Deterministic `false` on the server AND on the
   first client render (so hydration matches); the real value arrives in an
   effect. It never changes the DOM structure — layout is pure CSS. */
function useMedia(query: string): boolean {
  const [m, setM] = React.useState(false);
  React.useEffect(() => {
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

/* ── Icons (from the Webflow embed) ─────────────────────────── */
const I = {
  pause: (
    <svg data-icon="pause" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" /></svg>
  ),
  play: (
    <svg data-icon="play" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" /><circle cx="12" cy="12" r="10" /></svg>
  ),
  restart: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
  ),
  volume: (
    <svg data-icon="volume" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></svg>
  ),
  muted: (
    <svg data-icon="muted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><line x1="22" x2="16" y1="9" y2="15" /><line x1="16" x2="22" y1="9" y2="15" /></svg>
  ),
};

const CSS = `
.sst{position:relative;width:100%;color:var(--color-text--base,#111);padding:var(--section--py-2,4rem) var(--view--px,1.5rem);box-sizing:border-box}
.sst *,.sst *::before,.sst *::after{box-sizing:border-box}
.sst-in{max-width:var(--container--2xl,80rem);margin:0 auto}

/* ── Typography ─────────────────────────────────────────────── */
.sst-h2{margin:0;font-size:var(--heading--h2,2.5rem);line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--semibold,600)}
.sst-h3{margin:0;font-size:var(--heading--h3,1.5rem);line-height:var(--leading--snug,1.3);font-weight:var(--font-weight--medium,500)}
.sst-p{margin:0;font-size:var(--text--base,1rem);line-height:var(--leading--relaxed,1.6);color:var(--color-text--muted,#555);text-wrap:balance}
.sst-cta{display:inline-flex;align-items:center;text-decoration:none;font-size:var(--text--sm,.875rem);font-weight:var(--font-weight--medium,500);line-height:1;padding:.8rem 1.25rem;border-radius:var(--radius--full,999px);background:var(--surface--accent,#111);color:var(--color-text--inverted,#fff);transition:transform .25s ease,opacity .25s ease}
.sst-cta:hover{opacity:.9}.sst-cta:active{transform:scale(.97)}
.sst-div{width:100%;height:1px;background:var(--surface--muted,#e5e7eb);margin:var(--spacing--4,1rem) 0}

/* ── Desktop: two columns, sticky left ───────────────────────── */
.sst-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:var(--spacing--12,3rem);align-items:start}
.sst-left{position:sticky;top:var(--sst-top);display:flex;flex-direction:column;max-height:calc(100vh - var(--sst-top));overflow-y:auto;scrollbar-width:none}
.sst-left::-webkit-scrollbar{display:none}
.sst-tab{display:flex;flex-direction:column;align-items:flex-start;gap:var(--spacing--4,1rem);text-align:left;background:none;border:0;padding:0;margin:0;cursor:pointer;color:inherit;font:inherit;width:100%}
.sst-tab:first-of-type{margin-top:var(--spacing--4,1rem)}
.sst-tab .sst-h3{transition:opacity .35s ease;opacity:.5}
.sst-tab.is-active .sst-h3,.sst-tab:hover .sst-h3{opacity:1}
.sst-body{display:grid;grid-template-rows:0fr;opacity:0;transition:grid-template-rows .45s cubic-bezier(.65,0,.35,1),opacity .35s ease;width:100%}
.sst-body>div{overflow:hidden;display:flex;flex-direction:column;align-items:flex-start;gap:var(--spacing--8,2rem)}
.sst-tab.is-active .sst-body{grid-template-rows:1fr;opacity:1}
.sst-tab.is-active .sst-body{transition-delay:0s,.1s}
.sst-right{display:flex;flex-direction:column;align-items:flex-end;gap:var(--gap--xl,4rem);margin-top:var(--spacing--16,4rem)}

/* ── Panels ─────────────────────────────────────────────────── */
.sst-panel{position:relative;width:100%;max-width:600px;aspect-ratio:var(--sst-ratio,1/1);border-radius:var(--radius--lg,1rem);overflow:hidden;background:var(--surface--muted,#f2f2f4);box-shadow:0 1px 2px -1px rgb(var(--shadow-rgb,0 0 0)/calc(.06*var(--shadow-strength,1))),0 6px 14px -6px rgb(var(--shadow-rgb,0 0 0)/calc(.1*var(--shadow-strength,1))),0 22px 40px -24px rgb(var(--shadow-rgb,0 0 0)/calc(.14*var(--shadow-strength,1)));transition:box-shadow .45s var(--shadow-ease,ease)}
.sst-panel.is-active,.sst-panel:hover,.sst-panel:focus-within{box-shadow:0 2px 4px -2px rgb(var(--shadow-rgb,0 0 0)/calc(.08*var(--shadow-strength,1))),0 12px 24px -8px rgb(var(--shadow-rgb,0 0 0)/calc(.12*var(--shadow-strength,1))),0 36px 60px -28px rgb(var(--shadow-rgb,0 0 0)/calc(.2*var(--shadow-strength,1)))}
.sst-vid{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block;background:transparent}

/* ── Controls: hidden until hover / focus; always on for touch ── */
.sst-ctl{position:absolute;inset:auto 0 0 0;display:flex;align-items:center;justify-content:space-between;padding:var(--spacing--4,1rem);opacity:0;pointer-events:none;transition:opacity .2s ease;color:var(--color-text--inverted,#fff);background:linear-gradient(to top,rgba(0,0,0,.35),transparent)}
.sst-panel:hover .sst-ctl,.sst-panel:focus-within .sst-ctl{opacity:1;pointer-events:auto}
@media (hover:none){.sst-ctl{opacity:1;pointer-events:auto}}
.sst-ctl-l{display:flex;gap:var(--spacing--2,.5rem)}
.sst-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:999px;background:rgba(0,0,0,.35);color:inherit;cursor:pointer;padding:0;transition:background .2s ease;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.sst-btn:hover{background:rgba(0,0,0,.55)}
@media (hover:none){.sst-btn{background:rgba(0,0,0,.5);-webkit-backdrop-filter:none;backdrop-filter:none}}
.sst-btn svg{width:22px;height:22px}
.sst-panel [data-icon="play"]{display:none}
.sst-panel.is-paused [data-icon="play"]{display:inline}
.sst-panel.is-paused [data-icon="pause"]{display:none}
.sst-panel [data-icon="muted"]{display:none}
.sst-panel.is-muted [data-icon="muted"]{display:inline}
.sst-panel.is-muted [data-icon="volume"]{display:none}

/* ── Tablet + mobile: same DOM, one column, tab i then panel i ──
   Columns dissolve (display:contents); the grid becomes a flex column and
   the inline \`order\` on tabs (2i) / panels (2i+1) interleaves them. */
@media (max-width:991px){
  .sst-grid{display:flex;flex-direction:column;gap:0;align-items:stretch}
  .sst-left,.sst-right{display:contents}
  .sst-h2{margin-bottom:calc(var(--spacing--12,3rem) + var(--spacing--2,.5rem))}
  .sst-div{display:none}
  .sst-tab{gap:var(--spacing--5,1.25rem);cursor:default}
  .sst-tab:first-of-type{margin-top:0}
  .sst-tab .sst-h3,.sst-tab.is-active .sst-h3{opacity:1;transition:none}
  .sst-body,.sst-tab.is-active .sst-body{grid-template-rows:1fr;opacity:1;transition:none}
  .sst-body>div{gap:var(--spacing--5,1.25rem)}
  .sst-panel{max-width:none;margin-top:calc(var(--spacing--5,1.25rem) + var(--spacing--2,.5rem));margin-bottom:var(--spacing--12,3rem)}
  .sst-right .sst-panel:last-child{margin-bottom:0}
}
@media (min-width:768px) and (max-width:991px){.sst-panel{max-width:600px;align-self:center}}

@media (prefers-reduced-motion:reduce){
  .sst-body,.sst-panel,.sst-ctl,.sst-tab .sst-h3{transition:none}
}
`;

/* One video panel with its controls. `active` drives the is-active look,
   `play` (active AND confirmed by the centre band) drives play/pause.
   Rendered exactly once per tab — the same <video> element serves every
   breakpoint, so resizing never remounts or reloads media. */
function Panel({ tab, index, active, play, autoplay, reduce, refCb }: {
  tab: Tab; index: number; active: boolean; play: boolean; autoplay: boolean; reduce: boolean;
  refCb: (i: number, el: HTMLDivElement | null) => void;
}) {
  const vRef = React.useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = React.useState(true);
  const [muted, setMuted] = React.useState(true);

  React.useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    // React never serialises `muted` into SSR markup; force the property so
    // the first play() passes the browser's autoplay policy.
    v.muted = true;
    const sync = () => { setPaused(v.paused); setMuted(v.muted); };
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("volumechange", sync);
    sync();
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
      v.removeEventListener("volumechange", sync);
    };
  }, []);

  // Per-panel viewport tracking: play only when active AND on screen; pause the
  // moment the panel leaves so no video keeps decoding off-screen.
  const [inView, setInView] = React.useState(false);
  React.useEffect(() => {
    const el = vRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      setInView(entries[entries.length - 1].isIntersecting);
    }, { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    if (play && inView && autoplay && !reduce) v.play().catch(() => {});
    else v.pause();
  }, [play, inView, autoplay, reduce]);

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const togglePlay = (e: React.MouseEvent) => { stop(e); const v = vRef.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const restart = (e: React.MouseEvent) => { stop(e); const v = vRef.current; if (!v) return; v.currentTime = 0; v.play().catch(() => {}); };
  const toggleMute = (e: React.MouseEvent) => { stop(e); const v = vRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };

  return (
    <div
      ref={(el) => refCb(index, el)}
      className={"sst-panel" + (active ? " is-active" : "") + (paused ? " is-paused" : "") + (muted ? " is-muted" : "")}
      data-index={index}
      style={{ order: 2 * index + 1 }}
    >
      {tab.video ? (
        <video ref={vRef} className="sst-vid" muted loop playsInline preload="none" poster={tab.poster || undefined}>
          <source src={tab.video} type="video/mp4" />
        </video>
      ) : tab.poster ? (
        <img className="sst-vid" src={tab.poster} alt="" />
      ) : null}
      {tab.video && (
        <div className="sst-ctl">
          <div className="sst-ctl-l">
            <button type="button" className="sst-btn" onClick={togglePlay} aria-label={paused ? "Play" : "Pause"}>{I.pause}{I.play}</button>
            <button type="button" className="sst-btn" onClick={restart} aria-label="Restart">{I.restart}</button>
          </div>
          <button type="button" className="sst-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>{I.volume}{I.muted}</button>
        </div>
      )}
    </div>
  );
}

export function ScrollTabs(p: ScrollTabsProps) {
  const {
    heading = "",
    stickyTop = 0,
    ratio = "1 / 1",
    autoplay = true,
  } = p;

  const tabs: Tab[] = [
    { title: p.tab1Title || "", text: p.tab1Text || "", ctaLabel: p.tab1CtaLabel || "", ctaLink: p.tab1CtaLink, video: p.tab1Video || "", poster: p.tab1Poster || "" },
    { title: p.tab2Title || "", text: p.tab2Text || "", ctaLabel: p.tab2CtaLabel || "", ctaLink: p.tab2CtaLink, video: p.tab2Video || "", poster: p.tab2Poster || "" },
    { title: p.tab3Title || "", text: p.tab3Text || "", ctaLabel: p.tab3CtaLabel || "", ctaLink: p.tab3CtaLink, video: p.tab3Video || "", poster: p.tab3Poster || "" },
    { title: p.tab4Title || "", text: p.tab4Text || "", ctaLabel: p.tab4CtaLabel || "", ctaLink: p.tab4CtaLink, video: p.tab4Video || "", poster: p.tab4Poster || "" },
  ].filter((t) => t.title);

  // Behaviour switches only (click-to-scroll on desktop, reduced motion);
  // both are `false` until the mount effect runs, never touching the DOM.
  const desktop = useMedia(DESKTOP);
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  // -1 = nothing playing until the centre-band observer's first hit (or a
  // click). The accordion still shows tab 0 open meanwhile, as before.
  const [active, setActive] = React.useState(-1);
  const shown = active < 0 ? 0 : active;
  const panels = React.useRef<(HTMLDivElement | null)[]>([]);
  const lockUntil = React.useRef(0);
  const refCb = React.useCallback((i: number, el: HTMLDivElement | null) => { panels.current[i] = el; }, []);

  /* Centre-band detection (all breakpoints): the panel straddling the
     viewport centre is active — it opens its accordion tab on desktop and is
     the only one allowed to play. */
  React.useEffect(() => {
    const els = panels.current.filter((e): e is HTMLDivElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      if (Date.now() < lockUntil.current) return;   // don't fight a click scroll
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const i = Number((en.target as HTMLElement).dataset.index);
        if (!isNaN(i)) setActive(i);
      });
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [tabs.length, desktop]);

  /* Desktop only: a tab click scrolls its panel to the centre. On tablet /
     mobile the tab is plain content (every body is open), as before. */
  const onTab = (i: number) => {
    if (!desktop) return;
    lockUntil.current = Date.now() + 700;
    setActive(i);
    const el = panels.current[i];
    if (el) el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  const link = (v?: LinkValue) => ({
    href: (v && v.href) || "#",
    target: v && v.target && v.target !== "_self" ? v.target : undefined,
    rel: v && v.target === "_blank" ? "noopener" : undefined,
  });

  const style = { "--sst-top": stickyTop > 0 ? stickyTop + "px" : "calc(var(--_nav---nav-height, 4rem) * 1.5)", "--sst-ratio": ratio } as React.CSSProperties;

  if (!tabs.length) return <section className="sst" data-scroll-tabs><style dangerouslySetInnerHTML={{ __html: CSS }} /></section>;

  return (
    <section className="sst" data-scroll-tabs style={style}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="sst-in">
        <div className="sst-grid">
          {/* Heading + tabs: sticky column on desktop, dissolved (display:contents) below 992px */}
          <div className="sst-left">
            {heading && <h2 className="sst-h2">{lines(heading)}</h2>}
            {tabs.map((t, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="sst-div" style={{ order: 2 * i }} />}
                <button
                  type="button"
                  className={"sst-tab" + (shown === i ? " is-active" : "")}
                  style={{ order: 2 * i }}
                  onClick={() => onTab(i)}
                  aria-expanded={shown === i}
                >
                  <h3 className="sst-h3">{t.title}</h3>
                  <div className="sst-body">
                    <div>
                      {t.text && <p className="sst-p">{t.text}</p>}
                      {t.ctaLabel && <a className="sst-cta" {...link(t.ctaLink)} onClick={(e) => e.stopPropagation()}>{t.ctaLabel}</a>}
                    </div>
                  </div>
                </button>
              </React.Fragment>
            ))}
          </div>
          {/* Panels: right column on desktop, interleaved after their tab below 992px */}
          <div className="sst-right">
            {tabs.map((t, i) => (
              <Panel key={i} tab={t} index={i} active={shown === i} play={active === i} autoplay={autoplay} reduce={reduce} refCb={refCb} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
