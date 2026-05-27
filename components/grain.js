/*!
 * grain.js v3.0.0
 * Animated film-grain overlay — CSS steps() animation, zero per-frame CPU
 * No runtime dependencies (GSAP not required)
 * https://github.com/roicool/sestek
 *
 * Attributes on [data-grain] element:
 *   data-grain-intensity  — opacity 0.0–1.0        (default: 0.08)
 *   data-grain-size       — SVG baseFrequency 0.3–0.9  (default: 0.65)
 *                           lower  → coarser / cinematic
 *                           higher → finer  / digital
 *   data-grain-speed      — animation duration in ms   (default: 800)
 *
 * How it works:
 *   An SVG feTurbulence texture is rendered ONCE as a CSS background-image.
 *   The browser rasterises it to a GPU texture at parse time — never again.
 *   A CSS @keyframes animation shifts the oversized overlay via transform,
 *   revealing different portions of the texture each step. Because only
 *   transform changes (compositor-only property), there is zero CPU cost
 *   at runtime — the GPU handles everything.
 *
 * Changelog
 * v3.0.0 — rewritten: CSS steps() animation, SVG rendered once, no GSAP needed
 * v2.0.0 — Canvas-based per-frame noise
 * v1.0.0 — SVG feTurbulence per-frame seed mutation
 */

(function (global) {
  "use strict";

  function initGrain(selector) {
    var targets = Array.from(
      document.querySelectorAll(selector || "[data-grain]")
    );
    if (!targets.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    targets.forEach(function (el) {
      var intensity = parseFloat(el.dataset.grainIntensity);
      if (isNaN(intensity)) intensity = 0.08;
      intensity = Math.max(0, Math.min(1, intensity));

      var freq = parseFloat(el.dataset.grainSize);
      if (isNaN(freq)) freq = 0.65;
      freq = Math.max(0.3, Math.min(0.9, freq)).toFixed(2);

      var speed = parseInt(el.dataset.grainSpeed, 10);
      if (isNaN(speed) || speed < 100) speed = 800;

      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }

      /*
       * The SVG is set as background-image — the browser renders the
       * feTurbulence filter once and uploads it to the GPU as a texture.
       * After that, no CPU work happens — only GPU transform changes.
       */
      var svg =
        "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'>" +
        "<filter id='g'>" +
        "<feTurbulence type='fractalNoise' baseFrequency='" + freq + "' " +
        "numOctaves='4' stitchTiles='stitch'/>" +
        "<feColorMatrix type='saturate' values='0'/>" +
        "</filter>" +
        "<rect width='100%' height='100%' filter='url(#g)'/>" +
        "</svg>";

      var dataUri = "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";

      var overlay = document.createElement("div");
      overlay.className = "grain__overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.setProperty("--grain-opacity", intensity);
      overlay.style.setProperty("--grain-speed",   speed + "ms");
      overlay.style.backgroundImage = dataUri;

      el.appendChild(overlay);
    });
  }

  global.Sestek            = global.Sestek || {};
  global.Sestek.initGrain  = initGrain;

})(typeof window !== "undefined" ? window : this);
