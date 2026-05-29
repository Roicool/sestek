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
├── js/
│   ├── core/        # Foundation utilities — lenis-init.js, nav.js
│   ├── components/  # UI components — hero.js, marquee.js, scroll-tabs.js
│   ├── effects/     # Visual effects — grain.js, btn-glow.js
│   └── animations/  # Reusable GSAP animation presets — height-reveal.js
├── css/
│   ├── core/        # Core styles — nav.css, nav-full.css
│   ├── components/  # Component styles — hero.css, marquee.css, scroll-tabs.css
│   └── effects/     # Effect styles — grain.css, btn-glow.css
└── docs/            # PROJECT.md, CDN-LINKS.md, RC-STRUCTURE-REFERENCE.css, changelogs
```

---

## CSS Convention — RC Structure Reference

All CSS written in this project **must** use the utility classes and CSS variables defined in  
[`docs/RC-STRUCTURE-REFERENCE.css`](./RC-STRUCTURE-REFERENCE.css) wherever applicable.

### Rules

- **Spacing** → always use `--spacing--*` variables or `.m-*` / `.p-*` / `.gap-*` utility classes. No hardcoded pixel/rem values.
- **Typography** → use `--text--*` scale variables or `.text-*` / `.h*-style` / `.display-*` classes. No arbitrary font sizes.
- **Colors** → use `--brand-primary--*`, `--brand-secondary--*`, `--neutral--*` or semantic tokens (`--surface--*`, `--color-text--*`). No raw hex/rgb values.
- **Border radius** → use `--radius--*` variables or `.rounded-*` classes.
- **Layout** → use `.container-*`, `.grid-*col`, `.col-span-*`, `.flex`, `.stack`, `.row` classes.
- **New custom CSS** → only write it when no existing utility class covers the need. Keep it minimal.

> **Reference file:** `docs/RC-STRUCTURE-REFERENCE.css`  
> Webflow Site ID: `6a15b02be7e45b4ce963410c` · Variable Collection: Base collection  
> All values are fluid `clamp()` based (fluid-min=20rem → fluid-max=90rem)

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

1. **Performance first** — 60fps always. No jank, no layout thrash. Target: PageSpeed 90+.
2. **Premium feel** — Smooth easing curves, intentional timing.
3. **Zero render-blocking scripts** — Every `<script src>` tag must use `defer`. No exceptions.
4. **Zero dependencies beyond declared stack** — Lenis + GSAP only.
5. **CDN-first** — Every file is consumable via jsDelivr without a build step.
6. **RC Structure first** — Always reach for `RC-STRUCTURE-REFERENCE.css` classes and variables before writing custom CSS.

---

## Getting Started (Webflow)

Webflow'da yerel dosya yolu (`/js/init.js`) yoktur. Init kodu Webflow'un Custom Code alanlarına yazılır.

### Page Settings → Custom Code → `<head>` bölümü

```html
<!-- DNS + TLS pre-warm -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- Tüm scriptler defer — render blocking sıfır -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/core/lenis-init.js" defer></script>
<!-- Kullanılan component scriptleri buraya eklenir -->
```

### Page Settings → Custom Code → `</body>` öncesi bölümü

```html
<script>
  /*
   * DOMContentLoaded, deferred script'ler bittikten SONRA ateşlenir (spec gereği).
   * Bu yüzden init kodu buraya — inline olmasına rağmen deferred script'lere
   * erişim garantilidir. /js/init.js'e gerek yok.
   */
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Sestek.initLenis({ duration: 1.2 });
    // Sestek.initHero(); // hero componenti varsa
  });
</script>
```

> **Neden çalışır?** Inline `<script>` HTML parse edilirken çalışır (deferred'dan önce),
> ama içindeki `addEventListener` callback'i DOMContentLoaded'da çalışır —
> bu event spec gereği deferred script'lerin tamamlanmasını bekler.

---

## Changelog

See individual file headers for per-file version history.
