/*!
 * NotFoundPage (Code Component) — a complete 404 page: minimal navbar,
 * centred 404 body, slim footer. The whole thing is locked to the viewport
 * (100svh, grid auto/1fr/auto) so it never scrolls, on any screen.
 *
 * Look: calm off-white (or ink) ground, two very soft brand-tinted blooms,
 * a faint dot grid, a glass navbar pill. Type and spacing come from the
 * site's design tokens (--font--primary, --brand-*, --neutral-*) with plain
 * fallbacks, so it matches the rest of the site without any Designer work.
 *
 * SSR-safe: no window/document in render, styles via innerHTML, everything
 * sized by CSS — the server HTML is already the final layout (zero CLS).
 */

import * as React from "react";

type LinkValue = { href: string; target?: string; preload?: string };
type ImageValue = { src: string; alt?: string };

export interface NotFoundPageProps {
  /* look */
  theme?: string;                 // "Light" | "Dark"
  glow?: boolean;                 // brand-tinted background blooms
  grid?: boolean;                 // faint dot grid
  /* navbar */
  logo?: ImageValue;
  logoText?: string;
  logoLink?: LinkValue;
  logoHeight?: number;            // px
  nav1Label?: string; nav1Link?: LinkValue;
  nav2Label?: string; nav2Link?: LinkValue;
  nav3Label?: string; nav3Link?: LinkValue;
  nav4Label?: string; nav4Link?: LinkValue;
  navCtaLabel?: string; navCtaLink?: LinkValue;
  /* body */
  code?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  primaryLabel?: string; primaryLink?: LinkValue;
  secondaryLabel?: string; secondaryLink?: LinkValue;
  /* footer */
  footerText?: string;
  foot1Label?: string; foot1Link?: LinkValue;
  foot2Label?: string; foot2Link?: LinkValue;
  foot3Label?: string; foot3Link?: LinkValue;
  foot4Label?: string; foot4Link?: LinkValue;
}

const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.nf{
  --nf-font:var(--font--primary,var(--font--body,ui-sans-serif,system-ui,sans-serif));
  --nf-bg:var(--surface--base,#f7f7fa);
  --nf-ink:var(--color-text--base,var(--neutral--950,#17151f));
  --nf-muted:var(--color-text--muted,var(--neutral--600,#6b6a75));
  --nf-line:var(--border--color-border-muted,rgba(23,21,31,.08));
  --nf-glass:rgba(255,255,255,.55);
  --nf-glass-line:rgba(255,255,255,.7);
  --nf-btn:var(--surface--accent,var(--neutral--950,#17151f));
  --nf-btn-fg:var(--color-text--inverted,#fff);
  --nf-a:var(--brand-secondary--500,#7f81ae);
  --nf-b:var(--brand-primary--500,#ec008c);
  --nf-c:var(--color-teritary--500,#00ffeb);
  --nf-px:var(--view--px,clamp(1.25rem,4vw,3rem));
  position:relative;height:100vh;height:100svh;overflow:hidden;
  display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  background:var(--nf-bg);color:var(--nf-ink);font-family:var(--nf-font);
  -webkit-font-smoothing:antialiased}
.nf[data-theme="dark"]{
  --nf-bg:var(--neutral--950,#0f0e15);--nf-ink:#f4f2fb;--nf-muted:#9f9bb3;
  --nf-line:rgba(255,255,255,.08);--nf-glass:rgba(255,255,255,.06);--nf-glass-line:rgba(255,255,255,.12);
  --nf-btn:#f4f2fb;--nf-btn-fg:#0f0e15}

/* ── background: two soft blooms + dot grid, all fixed-size, no repaint ── */
.nf_bg{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.nf_bloom{position:absolute;border-radius:50%;filter:blur(64px);opacity:.55;will-change:auto}
.nf_bloom--a{width:52vmax;height:52vmax;left:-14vmax;top:-18vmax;background:radial-gradient(closest-side,color-mix(in oklab,var(--nf-a) 38%,transparent),transparent 72%)}
.nf_bloom--b{width:46vmax;height:46vmax;right:-16vmax;bottom:-20vmax;background:radial-gradient(closest-side,color-mix(in oklab,var(--nf-b) 22%,transparent),transparent 72%)}
.nf[data-theme="dark"] .nf_bloom{opacity:.42}
.nf_grid{position:absolute;inset:0;background-image:radial-gradient(color-mix(in oklab,var(--nf-ink) 12%,transparent) 1px,transparent 1.5px);background-size:28px 28px;
  -webkit-mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,#000 30%,transparent 100%);mask-image:radial-gradient(ellipse 70% 60% at 50% 45%,#000 30%,transparent 100%)}
.nf[data-theme="dark"] .nf_grid{background-image:radial-gradient(rgba(255,255,255,.14) 1px,transparent 1.5px)}
@supports not (color:color-mix(in oklab,#000,#fff)){
  .nf_bloom--a{background:radial-gradient(closest-side,rgba(127,129,174,.35),transparent 72%)}
  .nf_bloom--b{background:radial-gradient(closest-side,rgba(236,0,140,.18),transparent 72%)}
  .nf_grid{background-image:radial-gradient(rgba(23,21,31,.12) 1px,transparent 1.5px)}
}

/* ── navbar: glass pill ── */
.nf_nav{position:relative;z-index:2;padding:clamp(.75rem,2vh,1.25rem) var(--nf-px) 0}
.nf_nav-in{max-width:var(--container--2xl,80rem);margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:1rem;
  padding:.5rem .5rem .5rem 1rem;border-radius:999px;background:var(--nf-glass);border:1px solid var(--nf-glass-line);
  -webkit-backdrop-filter:blur(14px) saturate(1.3);backdrop-filter:blur(14px) saturate(1.3);
  box-shadow:0 1px 2px rgba(23,21,31,.04),0 12px 32px -20px rgba(23,21,31,.25)}
.nf_logo{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;color:inherit;font-weight:600;letter-spacing:-.01em;min-width:0}
.nf_logo img{display:block;height:var(--nf-logo-h,1.5rem);width:auto;max-width:40vw}
.nf_links{display:flex;align-items:center;gap:.25rem;margin:0;padding:0;list-style:none}
.nf_links a{display:inline-block;padding:.45rem .8rem;border-radius:999px;color:var(--nf-muted);text-decoration:none;font-size:.875rem;font-weight:500;transition:color .2s,background .2s}
.nf_links a:hover{color:var(--nf-ink);background:color-mix(in oklab,var(--nf-ink) 6%,transparent)}
.nf_btn{display:inline-flex;align-items:center;gap:.5rem;padding:.7rem 1.15rem;border-radius:999px;text-decoration:none;font-size:.875rem;font-weight:500;line-height:1;
  white-space:nowrap;transition:transform .25s ease,box-shadow .25s ease,background .2s;-webkit-tap-highlight-color:transparent}
.nf_btn--solid{background:var(--nf-btn);color:var(--nf-btn-fg)}
.nf_btn--ghost{background:transparent;color:var(--nf-ink);border:1px solid color-mix(in oklab,var(--nf-ink) 18%,transparent)}
.nf_btn:hover{transform:translateY(-1px);box-shadow:0 10px 24px -16px rgba(23,21,31,.5)}
.nf_btn:active{transform:none}
.nf_btn:focus-visible{outline:2px solid var(--nf-b);outline-offset:3px}
.nf_btn svg{width:1em;height:1em;flex:none}
.nf_nav .nf_btn{padding:.6rem 1rem}

/* ── body ── */
.nf_main{position:relative;z-index:1;min-height:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:1rem var(--nf-px)}
.nf_in{max-width:40rem;display:flex;flex-direction:column;align-items:center;gap:clamp(.6rem,1.6vh,1.1rem)}
.nf_code{margin:0;font-size:clamp(5.5rem,18vmin,11rem);line-height:.9;font-weight:300;letter-spacing:-.05em;
  background:linear-gradient(120deg,var(--nf-ink) 0%,var(--nf-ink) 55%,color-mix(in oklab,var(--nf-ink) 35%,transparent) 100%);
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;font-variant-numeric:tabular-nums}
.nf[data-theme="dark"] .nf_code{background:linear-gradient(120deg,#fff 0%,#fff 50%,rgba(255,255,255,.35) 100%);-webkit-background-clip:text;background-clip:text}
.nf_eyebrow{margin:0;font-size:.75rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--nf-muted)}
.nf_title{margin:0;font-size:clamp(1.375rem,2.6vw + .5rem,2.25rem);line-height:1.15;font-weight:500;letter-spacing:-.01em;text-wrap:balance}
.nf_desc{margin:0;max-width:34rem;font-size:clamp(.9375rem,.5vw + .75rem,1.0625rem);line-height:1.6;color:var(--nf-muted);text-wrap:balance}
.nf_ctas{display:flex;flex-wrap:wrap;justify-content:center;gap:.6rem;margin-top:clamp(.25rem,1vh,.75rem)}

/* ── footer ── */
.nf_foot{position:relative;z-index:2;padding:0 var(--nf-px) clamp(.75rem,2vh,1.25rem)}
.nf_foot-in{max-width:var(--container--2xl,80rem);margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem 1.5rem;
  padding-top:.85rem;border-top:1px solid var(--nf-line);font-size:.8125rem;color:var(--nf-muted)}
.nf_foot-links{display:flex;flex-wrap:wrap;gap:.25rem 1.1rem;margin:0;padding:0;list-style:none}
.nf_foot-links a{color:inherit;text-decoration:none;transition:color .2s}
.nf_foot-links a:hover{color:var(--nf-ink)}

/* ── responsive ── */
@media (max-width:991px){.nf_links{display:none}}
@media (max-width:767px){
  .nf_nav-in{padding:.4rem .4rem .4rem .9rem}
  .nf_code{font-size:clamp(4.5rem,24vw,7rem)}
  .nf_ctas{flex-direction:column;width:100%;max-width:20rem}
  .nf_ctas .nf_btn{justify-content:center}
  .nf_foot-in{justify-content:center;text-align:center}
  .nf_foot-links{justify-content:center}
}
/* very short viewports (landscape phones): compress, never overflow */
@media (max-height:560px){
  .nf_code{font-size:clamp(3rem,14vh,6rem)}
  .nf_desc{display:none}
  .nf_in{gap:.5rem}
}
@media (prefers-reduced-motion:reduce){.nf_btn,.nf_links a{transition:none}.nf_btn:hover{transform:none}}
`;

function linkAttrs(v?: LinkValue) {
  const a: React.AnchorHTMLAttributes<HTMLAnchorElement> = { href: (v && v.href) || "#" };
  if (v && v.target === "_blank") { a.target = "_blank"; a.rel = "noopener noreferrer"; }
  return a;
}

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function NotFoundPage(p: NotFoundPageProps) {
  const dark = p.theme === "Dark";
  const nav = [
    [p.nav1Label, p.nav1Link], [p.nav2Label, p.nav2Link], [p.nav3Label, p.nav3Link], [p.nav4Label, p.nav4Link],
  ].filter((x) => x[0]) as [string, LinkValue | undefined][];
  const foot = [
    [p.foot1Label, p.foot1Link], [p.foot2Label, p.foot2Link], [p.foot3Label, p.foot3Link], [p.foot4Label, p.foot4Link],
  ].filter((x) => x[0]) as [string, LinkValue | undefined][];
  const logoSrc = p.logo && p.logo.src;
  const style: React.CSSProperties & Record<string, string> = {};
  if (p.logoHeight) style["--nf-logo-h"] = p.logoHeight + "px";

  return (
    <div className="nf" data-theme={dark ? "dark" : "light"} data-not-found style={style}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="nf_bg" aria-hidden="true">
        {p.glow !== false && <><span className="nf_bloom nf_bloom--a" /><span className="nf_bloom nf_bloom--b" /></>}
        {p.grid !== false && <span className="nf_grid" />}
      </div>

      <header className="nf_nav">
        <div className="nf_nav-in">
          <a className="nf_logo" {...linkAttrs(p.logoLink)} aria-label={logoSrc ? (p.logo!.alt || p.logoText || "Home") : undefined}>
            {logoSrc ? <img src={logoSrc} alt={p.logo!.alt || ""} /> : <span>{p.logoText || "SESTEK"}</span>}
          </a>
          {nav.length > 0 && (
            <ul className="nf_links">
              {nav.map(([label, link], i) => <li key={i}><a {...linkAttrs(link)}>{label}</a></li>)}
            </ul>
          )}
          {p.navCtaLabel ? <a className="nf_btn nf_btn--solid" {...linkAttrs(p.navCtaLink)}>{p.navCtaLabel}</a> : <span />}
        </div>
      </header>

      <main className="nf_main">
        <div className="nf_in">
          <p className="nf_code" aria-hidden="true">{p.code || "404"}</p>
          {p.eyebrow && <p className="nf_eyebrow">{p.eyebrow}</p>}
          <h1 className="nf_title">{p.title || "This page doesn't exist"}</h1>
          {p.description && <p className="nf_desc">{p.description}</p>}
          {(p.primaryLabel || p.secondaryLabel) && (
            <div className="nf_ctas">
              {p.primaryLabel && <a className="nf_btn nf_btn--solid" {...linkAttrs(p.primaryLink)}>{p.primaryLabel}<Arrow /></a>}
              {p.secondaryLabel && <a className="nf_btn nf_btn--ghost" {...linkAttrs(p.secondaryLink)}>{p.secondaryLabel}</a>}
            </div>
          )}
        </div>
      </main>

      <footer className="nf_foot">
        <div className="nf_foot-in">
          <span>{p.footerText || `© ${new Date().getFullYear()} SESTEK`}</span>
          {foot.length > 0 && (
            <ul className="nf_foot-links">
              {foot.map(([label, link], i) => <li key={i}><a {...linkAttrs(link)}>{label}</a></li>)}
            </ul>
          )}
        </div>
      </footer>
    </div>
  );
}

export default NotFoundPage;
