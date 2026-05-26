# CDN Links

All files are served via **jsDelivr** from the `roicool/sestek` GitHub repository.  
Use a specific tag (e.g. `@v1.0.0`) in production. Use `@main` only for development.

---

## Format

```
https://cdn.jsdelivr.net/gh/roicool/sestek@<tag>/<path>
```

---

## Core

| File | Latest Tag | CDN Link |
|---|---|---|
| `lenis-init.js` | `v1.0.0` | `https://cdn.jsdelivr.net/gh/roicool/sestek@v1.0.0/core/lenis-init.js` |

### Dev (always latest main)

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/core/lenis-init.js"></script>
```

### Production (pinned)

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/sestek@v1.0.0/core/lenis-init.js"></script>
```

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
<!-- Latest stable -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>
```

### GSAP + ScrollTrigger

```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
```

---

## Version Bump Checklist

When releasing a new version:

1. Update the version comment in the JS/CSS file header (`v1.0.0` → `v1.1.0`)
2. Commit and push to `main`
3. Create a GitHub tag: `git tag v1.1.0 && git push origin v1.1.0`
4. Update the **Latest Tag** and CDN links in this file
5. jsDelivr will serve the new tag automatically (may take a few minutes to propagate)
