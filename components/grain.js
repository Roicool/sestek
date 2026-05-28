/*!
 * grain.js v3.1.0
 * Animated film-grain overlay — CSS steps() animation, zero per-frame CPU
 * No runtime dependencies (GSAP not required)
 * https://github.com/roicool/sestek
 *
 * Attributes on [data-grain] element:
 *   data-grain-intensity  — opacity 0.0–1.0            (default: 0.15)
 *   data-grain-size       — SVG baseFrequency 0.3–0.9  (default: 0.65)
 *                           lower  → coarser / cinematic
 *                           higher → finer  / digital
 *   data-grain-speed      — animation duration in ms   (default: 800)
 *
 * Changelog
 * v3.1.0 — fix: feComponentTransfer contrast restored; base64 encoding; overflow guard
 * v3.0.0 — CSS steps() animation, SVG rendered once, no GSAP needed
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
      if (isNaN(intensity)) intensity = 0.15;
      intensity = Math.max(0, Math.min(1, intensity));

      var freq = parseFloat(el.dataset.grainSize);
      if (isNaN(freq)) freq = 0.65;
      freq = Math.max(0.3, Math.min(0.9, freq)).toFixed(2);

      var speed = parseInt(el.dataset.grainSpeed, 10);
      if (isNaN(speed) || speed < 100) speed = 800;

      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      // The overlay is 300%×300% — parent must clip it
      if (getComputedStyle(el).overflow === "visible") {
        el.style.overflow = "hidden";
      }

      /*
       * feTurbulence → desaturate → feComponentTransfer contrast boost.
       *
       * Without the contrast step, feTurbulence produces mid-gray values
       * (~0.5). mix-blend-mode:overlay with 0.5 gray = mathematically
       * invisible (no change to backdrop). The contrast step (slope=3,
       * intercept=-1) pushes values toward 0 or 1, making the grain
       * visible under overlay blend mode.
       *
       * The SVG is base64-encoded for reliable cross-browser data URI
       * parsing (avoids encodeURIComponent edge cases in some Webflow builds).
       */
      var svg = [
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256' width='256' height='256'>",
        "  <filter id='g' x='0%' y='0%' width='100%' height='100%'>",
        "    <feTurbulence type='fractalNoise' baseFrequency='" + freq + "'",
        "      numOctaves='4' stitchTiles='stitch' result='noise'/>",
        "    <feColorMatrix type='saturate' values='0' in='noise' result='gray'/>",
        "    <feComponentTransfer in='gray'>",
        "      <feFuncR type='linear' slope='3' intercept='-1'/>",
        "      <feFuncG type='linear' slope='3' intercept='-1'/>",
        "      <feFuncB type='linear' slope='3' intercept='-1'/>",
        "    </feComponentTransfer>",
        "  </filter>",
        "  <rect width='100%' height='100%' filter='url(#g)'/>",
        "</svg>",
      ].join("");

      var dataUri = "url(\"data:image/svg+xml;base64," + btoa(svg) + "\")";

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
