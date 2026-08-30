# Archived story-slider versions

Superseded implementations kept for reference. **Not loaded anywhere** —
the live component is `js/effects/story-slider.js` (v3, Swiper-based).

## story-slider.v2-vanilla.js / .v2-vanilla.css — v2.0.0

Dependency-free (no Swiper). Stripe's own technique: hover choreography
driven by `requestAnimationFrame` + lerp writing `--ss-s` / `--ss-x` CSS
vars per card (neighbour shift computed from real card width →
`w * (scale-1) / 2` = 5.976px at 332px). Mouse drag via raw pointer
events on the native scroller; settles to the nearest card boundary on
release. GSAP used only for the scrubbed entrance stagger.

Swap back in by pointing the CDN `<link>`/`<script>` at:
`js/effects/_archive/story-slider.v2-vanilla.js` and
`css/effects/_archive/story-slider.v2-vanilla.css`.
Same DOM/attributes as v3 EXCEPT: no Swiper dependency, and the inner
wrapper uses `--ss-s`/`--ss-x` (not a CSS `:hover` scale). Full source
also lives in git at commit 972378d.
