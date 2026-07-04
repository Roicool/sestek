# miscellaneous

Reference code pulled from Webflow's public
[`webflow/brand_studio`](https://github.com/webflow/brand_studio) repo for
evaluation — **not wired into the site yet**. Kept here so we can study the
techniques (GSAP ScrollTrigger pinning, a reusable inline-video component,
scroll-driven sections) before deciding what to adapt for our own components.

| File | Source path in `webflow/brand_studio` | What it is |
|------|----------------------------------------|------------|
| `inline-video.js` | `global-brand-code/custom-components/inline-video.js` | Reusable video component — lazy-load + play-in-view via IntersectionObserver, play/pause/mute controls, `prefers-reduced-motion`, `window.videoLibrary` API. Closest to our video needs. |
| `inline-video-readme.md` | `global-brand-code/custom-components/inline-video-readme.md` | Docs / data-attributes for the above. |
| `brand-global-gsap.js` | `global-brand-code/brand-global-gsap.js` | Global GSAP setup + timeline/ScrollTrigger pattern. |
| `intro-animation.js` | `resources/webflow-conf-2025/intro-animation.js` | Pinned intro (`start:"top top"`, Observer + ScrollTrigger). |
| `outro-animation.js` | `resources/webflow-conf-2025/outro-animation.js` | Scrub outro (`scrub:1`, pin example). |
| `scroll-trigger.js` | `resources/webflow-challenge-2025/scroll-trigger.js` | Desktop-gated ScrollTrigger + SplitText timelines. |
| `secGrowthApp.js` | `home/2023/off-brand-code/src/js/secGrowthApp.js` | Scroll-driven section: GSAP Flip + MotionPath + ScrollTrigger UI morph. |
| `sliders.js` | `home/2023/off-brand-code/src/js/sliders.js` | ScrollTrigger reveal + Swiper carousels. |

> These files are the property of Webflow and retain their original license
> from the source repository. They live here only as a temporary reference.
