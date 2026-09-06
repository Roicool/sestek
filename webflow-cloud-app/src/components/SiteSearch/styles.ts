/*
 * Palette styles as a string — injected into the shadow root by the embed and
 * into a <style> by the React component, so both surfaces share one sheet.
 * Everything is prefixed `sst-search-` and reads the site's CSS variables
 * (custom properties DO cross the shadow boundary) with brand-neutral fallbacks.
 */

export const SEARCH_CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
.sst-search{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;padding:clamp(24px,12vh,120px) 16px 16px;font-family:var(--font--body,inherit);color:var(--color-text--base,#111);-webkit-font-smoothing:antialiased}
.sst-search[hidden]{display:none}
.sst-search__backdrop{position:absolute;inset:0;background:rgba(10,10,16,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);animation:sst-fade .18s ease both}
.sst-search__panel{position:relative;width:min(680px,100%);max-height:min(72vh,640px);display:flex;flex-direction:column;background:var(--surface--base,#fff);color:var(--color-text--base,#111);border-radius:var(--radius--lg,16px);box-shadow:0 30px 80px -20px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06);overflow:hidden;animation:sst-pop .22s cubic-bezier(.22,1,.36,1) both}
.sst-search__bar{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--border--color-border-page,#ececf1)}
.sst-search__icon{flex:none;width:20px;height:20px;color:var(--color-text--muted,#777)}
.sst-search__input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:17px;line-height:1.4;color:inherit}
.sst-search__input::placeholder{color:var(--color-text--muted,#9a9aa5)}
.sst-search__input::-webkit-search-cancel-button{display:none}
.sst-search__kbd{flex:none;font:inherit;font-size:11px;line-height:1;padding:5px 7px;border-radius:6px;border:1px solid var(--border--color-border-page,#e2e2ea);color:var(--color-text--muted,#777);background:var(--surface--light,#f6f6fa);cursor:pointer}
.sst-search__kbd:hover{color:var(--color-text--base,#111)}
.sst-search__body{overflow-y:auto;overscroll-behavior:contain;padding:8px}
.sst-search__label{padding:10px 12px 6px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--color-text--muted,#8a8a96)}
.sst-search__list{list-style:none;margin:0;padding:0}
.sst-search__opt{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;text-decoration:none;color:inherit}
.sst-search__opt[aria-selected="true"]{background:var(--surface--light,#f2f1fa)}
.sst-search__opt:active{transform:scale(.995)}
.sst-search__kind{flex:none;width:34px;height:34px;display:grid;place-items:center;border-radius:9px;background:var(--surface--muted,#eeecf7);color:var(--brand-primary--500,#6b5ce7);font-size:11px;font-weight:600}
.sst-search__text{flex:1;min-width:0}
.sst-search__title{font-size:15px;line-height:1.35;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sst-search__title mark{background:transparent;color:var(--brand-primary--500,#6b5ce7);font-weight:600}
.sst-search__meta{display:flex;gap:8px;align-items:baseline;font-size:12.5px;line-height:1.4;color:var(--color-text--muted,#7a7a86);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sst-search__meta span+span::before{content:"·";margin-right:8px;opacity:.6}
.sst-search__enter{flex:none;opacity:0;font-size:11px;color:var(--color-text--muted,#8a8a96)}
.sst-search__opt[aria-selected="true"] .sst-search__enter{opacity:1}
.sst-search__empty{padding:28px 16px 20px;text-align:center}
.sst-search__empty h3{margin:0 0 6px;font-size:15px;font-weight:600}
.sst-search__empty p{margin:0 0 16px;font-size:13.5px;color:var(--color-text--muted,#7a7a86)}
.sst-search__ctas{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.sst-search__cta{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:999px;font-size:13px;font-weight:500;text-decoration:none;border:1px solid var(--border--color-border-page,#e2e2ea);color:var(--color-text--base,#111);background:var(--surface--light,#f6f6fa)}
.sst-search__cta--primary{background:var(--brand-primary--500,#6b5ce7);border-color:transparent;color:#fff}
.sst-search__foot{display:flex;justify-content:space-between;gap:12px;padding:8px 14px;border-top:1px solid var(--border--color-border-page,#ececf1);font-size:11.5px;color:var(--color-text--muted,#8a8a96)}
.sst-search__foot kbd{font:inherit;padding:1px 5px;border-radius:4px;border:1px solid var(--border--color-border-page,#e2e2ea);background:var(--surface--light,#f6f6fa)}
.sst-search__status{padding:24px;text-align:center;font-size:13.5px;color:var(--color-text--muted,#7a7a86)}
@keyframes sst-fade{from{opacity:0}to{opacity:1}}
@keyframes sst-pop{from{opacity:0;transform:translateY(-8px) scale(.985)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sst-search__backdrop,.sst-search__panel{animation:none}}
@media (max-width:640px){.sst-search{padding:12px}.sst-search__panel{max-height:calc(100dvh - 24px)}.sst-search__hintkbd{display:none}}
`;
