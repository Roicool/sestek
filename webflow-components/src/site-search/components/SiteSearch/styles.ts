/*
 * Palette styles — one sheet for both surfaces (shadow root in the embed,
 * inline <style> in the app). Prefix `sst-search-`. Reads the site's CSS
 * custom properties (they inherit across the shadow boundary) with Sestek-
 * flavoured fallbacks: magenta accent, lavender surfaces, rounded-lg.
 *
 * Layout: FULL-PAGE overlay → panel with a header (eyebrow + big search bar),
 * a two-column body (results list · live preview of the active result) and a
 * footer with keyboard hints. Below 768px the preview column is hidden.
 */

export const SEARCH_CSS = `
:host{all:initial;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.sst-search{
  --sst-accent:var(--brand-primary--500,#e5007d);
  --sst-bg:var(--surface--base,#fff);
  --sst-soft:var(--surface--light,#eeebf8);
  --sst-muted:var(--surface--muted,#f4f3fa);
  --sst-text:var(--color-text--base,#111118);
  --sst-text-muted:var(--color-text--muted,#6f6f7c);
  --sst-line:var(--border--color-border-page,#e6e5ef);
  --sst-r:var(--radius--lg,20px);
  --sst-rm:var(--radius--md,10px);
  position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  padding:clamp(16px,4vh,48px) clamp(16px,4vw,64px);
  /* site font: Webflow's --font--primary (fallback --font--body), else the body font through the shadow host */
  font-family:var(--font--primary,var(--font--body,inherit));color:var(--sst-text);-webkit-font-smoothing:antialiased;
}
.sst-search[hidden]{display:none}
/* frosted site behind the panel — the panel leaves a margin so the blur is visible */
.sst-search__backdrop{position:absolute;inset:0;background:rgba(18,12,40,.42);-webkit-backdrop-filter:blur(22px) saturate(1.2);backdrop-filter:blur(22px) saturate(1.2);animation:sst-fade .22s ease both}

/* ── Panel ─────────────────────────────────────────────────── */
.sst-search__panel{position:relative;width:min(var(--container--2xl,1240px),100%);height:min(100%,880px);display:grid;grid-template-rows:auto 1fr auto;background:var(--sst-bg);border-radius:var(--sst-r);box-shadow:0 40px 100px -30px rgba(20,10,50,.55),0 0 0 1px rgba(255,255,255,.35) inset;overflow:hidden;animation:sst-pop .26s cubic-bezier(.22,1,.36,1) both}

/* ── Header: eyebrow + search bar ──────────────────────────── */
.sst-search__head{padding:clamp(16px,2.4vw,28px) clamp(16px,2.4vw,32px) clamp(12px,1.6vw,20px);border-bottom:1px solid var(--sst-line)}
.sst-search__eyebrow{display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:var(--font-weight--semibold,600);color:var(--sst-text-muted)}
.sst-search__eyebrow::before{content:"";width:10px;height:10px;border-radius:2px;background:var(--sst-accent);transform:rotate(45deg) scale(.8)}
.sst-search__bar{display:flex;align-items:center;gap:14px;padding:6px 8px 6px 18px;border:2px solid var(--sst-accent);border-radius:var(--radius--full,999px);background:var(--sst-bg);box-shadow:0 0 0 6px color-mix(in srgb,var(--sst-accent) 10%,transparent)}
.sst-search__icon{flex:none;width:24px;height:24px;color:var(--sst-text-muted)}
.sst-search__input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:clamp(18px,2.2vw,26px);line-height:1.3;padding:8px 0;color:inherit}
.sst-search__input::placeholder{color:var(--sst-text-muted);opacity:.8}
.sst-search__input::-webkit-search-cancel-button{display:none}
.sst-search__esc{flex:none;font:inherit;font-size:12px;font-weight:600;line-height:1;padding:12px 16px;border-radius:var(--radius--full,999px);border:1px solid var(--sst-line);color:var(--sst-text-muted);background:var(--sst-muted);cursor:pointer}
.sst-search__esc:hover{color:var(--sst-text)}
/* suggested queries under the bar (idle only) */
.sst-search__try{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:14px;padding-left:4px}
.sst-search__try-label{font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:var(--font-weight--semibold,600);color:var(--sst-text-muted);margin-right:4px}
.sst-search__try-chip{font:inherit;font-size:13px;font-weight:var(--font-weight--medium,500);line-height:1;padding:8px 12px;border-radius:var(--radius--full,999px);border:1px solid var(--sst-line);background:var(--sst-bg);color:var(--sst-text);cursor:pointer;transition:border-color .15s,background .15s,color .15s}
.sst-search__try-chip:hover{border-color:var(--sst-accent);color:var(--sst-accent);background:color-mix(in srgb,var(--sst-accent) 6%,var(--sst-bg))}

/* ── Body: results · preview ───────────────────────────────── */
.sst-search__body{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);min-height:0}
.sst-search__list-col{min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:clamp(14px,2vw,26px) clamp(12px,1.8vw,24px) clamp(14px,2vw,26px) clamp(16px,2.4vw,32px)}
.sst-search__label{margin:0 0 4px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:var(--font-weight--semibold,600);color:var(--sst-text)}
.sst-search__hint{margin:0 0 14px;font-size:14px;line-height:1.5;color:var(--sst-text-muted)}
.sst-search__list{display:flex;flex-direction:column;gap:6px}
.sst-search__group{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
/* quick access = tile grid per group (not a list): 2 columns, title + one-line summary */
.sst-search__group--quick{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:22px}
.sst-search__group-label{grid-column:1/-1;display:flex;align-items:center;gap:10px;margin:0 0 2px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:var(--font-weight--semibold,600);color:var(--sst-text-muted)}
.sst-search__group-label::after{content:"";flex:1;height:1px;background:var(--sst-line)}
.sst-search__opt.sst-search__tile{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:4px;padding:14px 16px;min-height:96px;border:1px solid var(--sst-line);background:var(--sst-bg);transition:border-color .15s,background .15s,transform .15s}
.sst-search__opt.sst-search__tile:hover{transform:translateY(-1px)}
.sst-search__opt.sst-search__tile::before{left:0;top:16px;bottom:16px}
.sst-search__tile .sst-search__title{font-size:15.5px;margin:0;white-space:normal}
.sst-search__tile .sst-search__sum{margin:0;font-size:12.5px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sst-search__tile .sst-search__arrow{position:absolute;right:12px;top:12px}
.sst-search__tile-kind{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--sst-text-muted)}
.sst-search__dot{width:7px;height:7px;border-radius:50%;background:var(--sst-k,var(--sst-accent))}
/* kind colours — chips + dots */
[data-kind="product"]{--sst-k:var(--sst-accent)}
[data-kind="solution"]{--sst-k:#6b4fd8}
[data-kind="case-study"]{--sst-k:#0f9d8a}
[data-kind="resource"]{--sst-k:#d98a12}
[data-kind="career"]{--sst-k:#2f9e44}
[data-kind="blog"]{--sst-k:#6f6f7c}
[data-kind="page"]{--sst-k:#6f6f7c}
.sst-search__chip[data-kind]{color:var(--sst-k);background:color-mix(in srgb,var(--sst-k) 10%,var(--sst-bg))}
.sst-search__opt{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:14px;padding:12px 14px;border-radius:var(--sst-rm);border:1px solid transparent;text-decoration:none;color:inherit;cursor:pointer}
.sst-search__opt::before{content:"";position:absolute;left:-1px;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--sst-accent);opacity:0;transition:opacity .15s}
.sst-search__opt[aria-selected="true"]{background:var(--sst-soft);border-color:color-mix(in srgb,var(--sst-accent) 18%,var(--sst-line))}
.sst-search__opt[aria-selected="true"]::before{opacity:1}
.sst-search__chip{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;background:var(--sst-muted);color:var(--sst-accent);font-size:11px;font-weight:700;letter-spacing:.04em}
.sst-search__text{min-width:0}
.sst-search__eyeline{display:flex;gap:8px;align-items:baseline;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--sst-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sst-search__eyeline b{color:var(--sst-accent);font-weight:700}
.sst-search__title{display:block;margin-top:2px;font-size:17px;line-height:1.3;font-weight:var(--font-weight--semibold,600);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sst-search__title mark{background:transparent;color:var(--sst-accent)}
.sst-search__sum{display:block;margin-top:2px;font-size:13.5px;line-height:1.45;color:var(--sst-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sst-search__arrow{opacity:0;color:var(--sst-text-muted);font-size:16px}
.sst-search__opt[aria-selected="true"] .sst-search__arrow{opacity:1}

.sst-search__preview{position:relative;min-height:0;overflow:hidden;border-left:1px solid var(--sst-line);background:linear-gradient(160deg,var(--sst-soft) 0%,var(--sst-bg) 55%,color-mix(in srgb,var(--sst-accent) 8%,var(--sst-bg)) 100%);display:flex;flex-direction:column;justify-content:flex-end;padding:clamp(20px,3vw,40px)}
/* image area: page's own og:image, else the component's preview image */
.sst-search__pv-media{position:relative;z-index:1;flex:0 1 auto;width:100%;min-height:0;max-height:48%;aspect-ratio:16/10;margin:0 0 auto;border-radius:var(--sst-rm);overflow:hidden;background:var(--sst-soft);box-shadow:0 24px 50px -30px rgba(20,10,50,.45),0 0 0 1px rgba(255,255,255,.5) inset}
.sst-search__pv-media img{display:block;width:100%;height:100%;object-fit:cover;animation:sst-fade .3s ease both}
.sst-search__pv-media + *{margin-top:22px}
.sst-search__pv-chip.sst-search__pv-chip--on-media{position:absolute;left:14px;top:14px;margin:0;background:rgba(255,255,255,.88);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.sst-search__preview::before{content:"";position:absolute;right:-12%;top:-18%;width:60%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--sst-accent) 22%,transparent) 0%,transparent 70%);pointer-events:none}
.sst-search__preview::after{content:"";position:absolute;right:-6%;bottom:-24%;width:52%;aspect-ratio:1;border-radius:50%;border:1px solid color-mix(in srgb,var(--sst-accent) 22%,transparent);pointer-events:none}
.sst-search__pv-chip{position:relative;display:inline-flex;align-items:center;padding:7px 12px;border-radius:var(--radius--full,999px);background:var(--sst-bg);border:1px solid var(--sst-line);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--sst-accent);margin-bottom:18px}
.sst-search__pv-title{position:relative;margin:0 0 12px;font-size:clamp(28px,3.2vw,44px);line-height:var(--leading--tight,1.1);font-weight:var(--font-weight--semibold,600);letter-spacing:-.01em;text-wrap:balance}
.sst-search__pv-sum{position:relative;margin:0 0 14px;font-size:16px;line-height:1.55;color:var(--sst-text-muted);max-width:44ch}
.sst-search__pv-url{position:relative;margin:0 0 22px;font-size:13px;color:var(--sst-text-muted);word-break:break-all}
.sst-search__pv-url b{font-weight:500;color:var(--sst-text)}
.sst-search__btn{position:relative;display:inline-flex;align-items:center;gap:10px;align-self:flex-start;padding:14px 22px;border-radius:var(--radius--full,999px);background:var(--sst-accent);color:var(--color-text--inverted,#fff);font-size:15px;font-weight:600;text-decoration:none;transition:transform .2s ease,filter .2s ease}
.sst-search__btn:hover{filter:brightness(1.06)}
.sst-search__btn:active{transform:scale(.98)}
.sst-search__pv-empty{position:relative;color:var(--sst-text-muted);font-size:15px;max-width:36ch}

/* ── Empty / loading ───────────────────────────────────────── */
.sst-search__empty{padding:36px 8px}
.sst-search__empty h3{margin:0 0 8px;font-size:20px;font-weight:600}
.sst-search__empty p{margin:0 0 18px;font-size:15px;line-height:1.5;color:var(--sst-text-muted);max-width:52ch}
.sst-search__ctas{display:flex;gap:10px;flex-wrap:wrap}
.sst-search__cta{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:var(--radius--full,999px);font-size:14px;font-weight:600;text-decoration:none;border:1px solid var(--sst-line);color:var(--sst-text);background:var(--sst-muted)}
.sst-search__cta--primary{background:var(--sst-accent);border-color:transparent;color:var(--color-text--inverted,#fff)}
.sst-search__status{padding:36px 8px;font-size:15px;color:var(--sst-text-muted)}
.sst-search__skel{height:70px;border-radius:var(--sst-rm);background:linear-gradient(90deg,var(--sst-muted) 25%,var(--sst-soft) 50%,var(--sst-muted) 75%);background-size:200% 100%;animation:sst-shimmer 1.2s linear infinite;margin-bottom:6px}

/* ── Footer ────────────────────────────────────────────────── */
.sst-search__foot{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:12px clamp(16px,2.4vw,32px);border-top:1px solid var(--sst-line);font-size:13px;color:var(--sst-text-muted)}
.sst-search__keys{display:flex;gap:18px;flex-wrap:wrap}
.sst-search__keys span{display:inline-flex;align-items:center;gap:8px}
.sst-search__foot kbd{font:inherit;font-size:12px;font-weight:600;padding:5px 8px;border-radius:7px;border:1px solid var(--sst-line);background:var(--sst-muted);color:var(--sst-text)}
.sst-search__brand{font-weight:700;color:var(--sst-text)}

@keyframes sst-fade{from{opacity:0}to{opacity:1}}
@keyframes sst-pop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}
@keyframes sst-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.sst-search__backdrop,.sst-search__panel,.sst-search__skel{animation:none}}

@media (max-width:767px){
  .sst-search{padding:8px}
  .sst-search__panel{border-radius:var(--sst-rm);height:calc(100dvh - 16px)}
  .sst-search__body{grid-template-columns:minmax(0,1fr)}
  .sst-search__preview{display:none}
  .sst-search__keys{display:none}
  .sst-search__bar{box-shadow:none;padding-left:14px}
  .sst-search__esc{padding:10px 12px}
  .sst-search__opt{grid-template-columns:38px minmax(0,1fr)}
  .sst-search__arrow{display:none}
  .sst-search__chip{width:38px;height:38px}
  .sst-search__group--quick{grid-template-columns:minmax(0,1fr)}
  .sst-search__opt.sst-search__tile{min-height:0;padding:12px 14px}
  .sst-search__try{display:none}
}
`;
