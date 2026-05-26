# CDN Links

All files are served via **jsDelivr** from the `roicool/sestek` GitHub repository.  
Use a specific tag (e.g. `@v1.0.0`) in production. Use `@main` only for development.

> **PageSpeed 90+ Rule — always `defer`**  
> Every `<script src>` tag must carry the `defer` attribute.  
> Inline `<script>` blocks do **not** support `defer` — move all init code into a separate
> deferred file that is listed **last** in the load order.  
> Deferred scripts execute in declaration order after HTML parsing, before `DOMContentLoaded`.  
> Add `<link rel="preconnect" href="https://cdn.jsdelivr.net">` in `<head>` to cut DNS + TLS latency.

---

## Format

```
https://cdn.jsdelivr.net/gh/roicool/sestek@<tag>/<path>
```

---

## Core

| File | Latest Tag | CDN Link |
|---|---|---|
| `lenis-init.js` | `v1.1.0` | `https://cdn.jsdelivr.net/gh/roicool/sestek@v1.1.0/core/lenis-init.js` |

### Lenis only (no animations yet)

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@v1.1.0/core/lenis-init.js" defer></script>
<script src="/js/init.js" defer></script>
```
```js
// init.js
Sestek.initLenis({ duration: 1.2 });
```

### Lenis + GSAP ScrollTrigger (when animations are needed)

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@v1.1.0/core/lenis-init.js" defer></script>
<script src="/js/init.js" defer></script>
```
```js
// init.js
gsap.registerPlugin(ScrollTrigger);
Sestek.initLenis({ duration: 1.2 });
```

> ScrollTrigger sync is automatic — if the globals exist when `initLenis()` runs,
> they are wired. No extra code needed.

---

## Animations

> Files will be listed here as they are added.

---

## Components

> Files will be listed here as they are added.

---

## Dependency CDNs (External)

These are the third-party libraries Sestek depends on.

### Lenis

```html
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
```

### GSAP + ScrollTrigger

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
```

---

## Version Bump Checklist

When releasing a new version:

1. Update the version comment in the JS/CSS file header (`v1.0.0` → `v1.1.0`)
2. Commit and push to `main`
3. Create a GitHub tag: `git tag v1.1.0 && git push origin v1.1.0`
4. Update the **Latest Tag** and CDN links in this file
5. jsDelivr will serve the new tag automatically (may take a few minutes to propagate)
