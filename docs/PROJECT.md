# Sestek — Project Overview

> Premium feel, maximum performance. Every interaction is intentional.

---

## Tech Stack

| Layer | Library / Tool | Version | Notes |
|---|---|---|---|
| Smooth Scroll | [Lenis](https://github.com/darkroomengineering/lenis) | ^1.1.x | Frame-perfect smooth scroll |
| Animation | [GSAP](https://gsap.com) | ^3.12.x | Industry-standard animation engine |
| Scroll Trigger | [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) | ^3.12.x | Scroll-driven animations, pinning |
| Bundler | Vanilla / CDN | — | No build step required, CDN-first |

---

## Architecture

```
sestek/
├── core/            # Foundation utilities (scroll, resize, etc.)
├── animations/      # Reusable GSAP animation presets
├── components/      # UI components (nav, hero, etc.)
└── docs/            # PROJECT.md, CDN-LINKS.md, changelogs
```

---

## Versioning

All files follow **Semantic Versioning** (`MAJOR.MINOR.PATCH`).  
Version is declared in the file header comment and bumped on every release.

| Bump | When |
|---|---|
| `PATCH` | Bug fix, minor tweak |
| `MINOR` | New feature, backward-compatible |
| `MAJOR` | Breaking change |

---

## Core Principles

1. **Performance first** — 60fps always. No jank, no layout thrash.
2. **Premium feel** — Smooth easing curves, intentional timing.
3. **Zero dependencies beyond declared stack** — Lenis + GSAP only.
4. **CDN-first** — Every file is consumable via jsDelivr without a build step.

---

## Getting Started

```html
<!-- 1. Load dependencies -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>

<!-- 2. Register ScrollTrigger -->
<script>gsap.registerPlugin(ScrollTrigger);</script>

<!-- 3. Load Sestek core -->
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/core/lenis-init.js"></script>

<!-- 4. Initialize -->
<script>
  Sestek.initLenis({ duration: 1.2 });
</script>
```

---

## Changelog

See individual file headers for per-file version history.
