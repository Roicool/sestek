/*!
 * TopBar (Code Component) — dismissible announcement bar ABOVE the navbar.
 *
 * Drop it as the FIRST element of the page (above the Navbar). The site's
 * navbar is position:fixed at top:0, so while the bar is visible the
 * component pushes the nav down by the bar's height (inline `top` on
 * [data-nav], restored when the bar closes) and exposes the height as
 * `--topbar-h` on <html> for anything else that wants to offset itself.
 *
 * Behaviour
 *  - "Sticky": the bar is fixed at the very top, the nav sits right under it,
 *    an in-flow spacer keeps the page content from sliding under.
 *  - "Scrolls away": the bar is in normal flow and scrolls off with the page;
 *    the nav offset shrinks with the scroll so it lands back at top:0.
 *  - Dismiss (×) collapses the bar and remembers it in a cookie
 *    (`sestek_topbar=<campaign id>`, `Remember (days)`; 0 = this session
 *    only). Change the Campaign id in the Designer to show a new campaign to
 *    people who dismissed the previous one.
 *  - "Show on mobile" Off hides it under 768px (and pushes nothing).
 *  - Colours: Brand (magenta) / Dark / Light presets or custom hex.
 *
 * JS API: window.__sestekTopBar.dismiss() / .reset() (clears the cookie).
 */

import * as React from "react";

/* useLayoutEffect on the client, useEffect on the server (no SSR warning, same result after hydration) */
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface TopBarProps {
  text?: string;
  linkLabel?: string;
  linkUrl?: string;
  linkNewTab?: boolean;
  emoji?: string;
  campaignId?: string;
  dismissible?: boolean;
  rememberDays?: number;
  showOnMobile?: boolean;
  behavior?: string;        // "Sticky" | "Scrolls away"
  theme?: string;           // "Brand" | "Dark" | "Light" | "Custom"
  customBg?: string;
  customText?: string;
  pushNav?: boolean;
  /** insert a spacer so page content moves down by the bar height (default off: no layout shift) */
  pushContent?: boolean;
  navSelector?: string;
}

const COOKIE = "sestek_topbar";
const MOBILE_MAX = 767;

function readCookie(name: string): string {
  try {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  } catch { return ""; }
}
function writeCookie(name: string, value: string, days: number) {
  try {
    const maxAge = days > 0 ? "; max-age=" + Math.round(days * 86400) : "";   // no max-age = session cookie
    document.cookie = name + "=" + encodeURIComponent(value) + maxAge + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
  } catch { /* cookies blocked */ }
}
function clearCookie(name: string) {
  try { document.cookie = name + "=; max-age=0; path=/; SameSite=Lax"; } catch { /* noop */ }
}

const CSS = `
:host{all:initial;display:block;font-family:inherit;color:inherit}
*,*::before,*::after{box-sizing:border-box}
.tb{
  --tb-bg:var(--brand-primary--500,#e5007d);
  --tb-fg:#fff;
  --tb-font:var(--font--primary,var(--font--body,inherit));
  position:relative;z-index:2147483000;
  width:100%;background:var(--tb-bg);color:var(--tb-fg);font-family:var(--tb-font);
  overflow:hidden;transition:max-height .32s cubic-bezier(.22,1,.36,1),opacity .25s ease;
}
.tb[data-theme="dark"]{--tb-bg:var(--neutral--950,#17151f);--tb-fg:#fff}
.tb[data-theme="light"]{--tb-bg:var(--surface--light,#eeebf8);--tb-fg:var(--color-text--base,#17151f)}
.tb[data-pos="fixed"]{position:fixed;top:0;left:0;right:0}
.tb.is-closing{max-height:0!important;opacity:0}
.tb_in{display:flex;align-items:center;justify-content:center;gap:.75rem;min-height:2.5rem;padding:.5rem clamp(2.75rem,6vw,4rem);text-align:center}
.tb_msg{font-size:.875rem;font-weight:var(--font-weight--medium,500);line-height:1.35;letter-spacing:.005em}
.tb_emoji{margin-right:.35rem}
.tb_link{display:inline-flex;align-items:center;gap:.3rem;font-size:.875rem;font-weight:600;color:inherit;text-decoration:underline;text-underline-offset:.2em;text-decoration-thickness:1px;white-space:nowrap;transition:opacity .2s}
.tb_link:hover{opacity:.8}
.tb_link svg{width:.8em;height:.8em}
.tb_x{position:absolute;right:.5rem;top:50%;transform:translateY(-50%);width:2rem;height:2rem;display:grid;place-items:center;border:0;border-radius:999px;background:transparent;color:inherit;cursor:pointer;opacity:.8;transition:opacity .2s,background .2s;-webkit-tap-highlight-color:transparent}
.tb_x:hover{opacity:1;background:rgba(255,255,255,.14)}
.tb[data-theme="light"] .tb_x:hover{background:rgba(0,0,0,.06)}
.tb_x:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.tb_x svg{width:14px;height:14px}
.tb_spacer{width:100%}
@media (max-width:767px){
  .tb_in{flex-direction:column;gap:.25rem;padding:.55rem 2.5rem .6rem 1rem;text-align:left;align-items:flex-start}
  .tb_msg{font-size:.8125rem}
  .tb_link{font-size:.8125rem}
  .tb[data-mobile="off"]{display:none}
}
@media (prefers-reduced-motion:reduce){.tb{transition:none}}
`;

export function TopBar({
  text = "Sestek is now part of Unifonic.",
  linkLabel = "Read more",
  linkUrl = "/blog",
  linkNewTab = false,
  emoji = "",
  campaignId = "default",
  dismissible = true,
  rememberDays = 1,
  showOnMobile = true,
  behavior = "Sticky",
  theme = "Brand",
  customBg = "",
  customText = "",
  pushNav = true,
  pushContent = false,
  navSelector = "[data-nav]",
}: TopBarProps) {
  const id = (campaignId || "default").trim();
  const fixed = behavior !== "Scrolls away";
  // cookie read synchronously (client-only component) so the first paint is final — no bar popping in later
  const [hidden, setHidden] = React.useState(() => typeof document === "undefined" ? true : readCookie(COOKIE) === id);
  const [closing, setClosing] = React.useState(false);
  const bar = React.useRef<HTMLDivElement>(null);
  const spacer = React.useRef<HTMLDivElement>(null);
  const height = React.useRef(0);

  React.useEffect(() => { setHidden(readCookie(COOKIE) === id); }, [id]);

  const dismiss = React.useCallback(() => {
    if (!bar.current) { setHidden(true); return; }
    writeCookie(COOKIE, id, Number(rememberDays) || 0);
    bar.current.style.maxHeight = bar.current.offsetHeight + "px";
    requestAnimationFrame(() => setClosing(true));
    window.setTimeout(() => { setHidden(true); setClosing(false); }, 340);
  }, [id, rememberDays]);

  React.useEffect(() => {
    (window as unknown as { __sestekTopBar?: unknown }).__sestekTopBar = {
      dismiss,
      reset: () => { clearCookie(COOKIE); setHidden(false); },
    };
  }, [dismiss]);

  /* push the fixed navbar + expose --topbar-h; scroll-away mode shrinks the offset with the scroll.
     Layout effect: nav offset + spacer are applied BEFORE the first paint (no second shift). */
  useIsoLayoutEffect(() => {
    const el = bar.current;
    const root = document.documentElement;
    const nav = pushNav ? document.querySelector<HTMLElement>(navSelector || "[data-nav]") : null;
    const mobileOff = !showOnMobile;
    const isMobile = () => window.innerWidth <= MOBILE_MAX;

    const clear = () => {
      root.style.removeProperty("--topbar-h");
      root.removeAttribute("data-topbar");
      if (nav) nav.style.top = "";
      if (spacer.current) spacer.current.style.height = "0px";
    };
    if (hidden || closing || !el) { clear(); return; }

    let raf = 0;
    const apply = () => {
      raf = 0;
      const h = mobileOff && isMobile() ? 0 : el.offsetHeight;
      height.current = h;
      root.style.setProperty("--topbar-h", h + "px");
      root.setAttribute("data-topbar", h ? "on" : "off");
      // the spacer pushes the page content down — off by default: the fixed navbar already
      // overlays the page top, and a spacer that appears after hydration is a layout shift
      if (spacer.current) spacer.current.style.height = (fixed && pushContent ? h : 0) + "px";
      if (nav) nav.style.top = (fixed ? h : Math.max(0, h - (window.scrollY || 0))) + "px";
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    if (ro) ro.observe(el);
    window.addEventListener("resize", schedule);
    if (!fixed) window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      if (raf) cancelAnimationFrame(raf);
      clear();
    };
  }, [hidden, closing, fixed, pushNav, pushContent, navSelector, showOnMobile]);

  if (hidden) return <style dangerouslySetInnerHTML={{ __html: CSS }} />;

  const themeKey = theme === "Dark" ? "dark" : theme === "Light" ? "light" : theme === "Custom" ? "custom" : "brand";
  const style: React.CSSProperties & Record<string, string> = {};
  if (themeKey === "custom") { if (customBg) style["--tb-bg"] = customBg; if (customText) style["--tb-fg"] = customText; }
  const href = (linkUrl || "").trim();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={spacer} className="tb_spacer" aria-hidden="true" />
      <div ref={bar} className={"tb" + (closing ? " is-closing" : "")} role="region" aria-label={text || "Announcement"} data-theme={themeKey} data-pos={fixed ? "fixed" : "flow"} data-mobile={showOnMobile ? "on" : "off"} style={style}>
        <div className="tb_in">
          <span className="tb_msg">{emoji && <span className="tb_emoji" aria-hidden="true">{emoji}</span>}{text}</span>
          {href && linkLabel && (
            <a className="tb_link" href={href} target={linkNewTab ? "_blank" : undefined} rel={linkNewTab ? "noopener noreferrer" : undefined}>
              {linkLabel}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg>
            </a>
          )}
        </div>
        {dismissible && (
          <button type="button" className="tb_x" onClick={dismiss} aria-label="Close">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13" /></svg>
          </button>
        )}
      </div>
    </>
  );
}
