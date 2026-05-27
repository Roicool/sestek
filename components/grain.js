/*!
 * grain.js v1.0.0
 * Animated film-grain overlay — SVG feTurbulence, GSAP-driven seed flicker
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 *
 * Attributes on [data-grain] element:
 *   data-grain-intensity  — opacity 0.0–1.0       (default: 0.12)
 *   data-grain-size       — baseFrequency 0.3–0.9  (default: 0.65)
 *                           lower  → coarser / cinematic
 *                           higher → finer  / digital
 *
 * Changelog
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  /**
   * Initialises grain overlay on every [data-grain] element.
   * @param {string} [selector="[data-grain]"]
   */
  function initGrain(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Grain] GSAP required.");
      return;
    }

    var targets = Array.from(
      document.querySelectorAll(selector || "[data-grain]")
    );
    if (!targets.length) return;

    // Respect user preference — no animation, no overlay
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var instances = [];

    targets.forEach(function (el) {
      var intensity = parseFloat(el.dataset.grainIntensity);
      if (isNaN(intensity)) intensity = 0.12;
      intensity = Math.max(0, Math.min(1, intensity));

      var size = parseFloat(el.dataset.grainSize);
      if (isNaN(size)) size = 0.65;
      size = Math.max(0.3, Math.min(0.9, size));

      // Ensure the parent can contain the absolute overlay
      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }

      // Unique filter ID so multiple instances don't share the same filter
      var uid = "sg-" + Math.random().toString(36).slice(2, 8);

      /*
       * feTurbulence → grayscale desaturate → contrast boost.
       * The contrast boost (slope/intercept) makes noise white/black rather
       * than mid-grey, which reads as sharp grain instead of haze.
       */
      var overlay = document.createElement("div");
      overlay.className = "grain__overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.style.setProperty("--grain-opacity", intensity);

      overlay.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"' +
        '     aria-hidden="true" focusable="false">' +
        "  <defs>" +
        '    <filter id="' + uid + '"' +
        '            x="0%" y="0%" width="100%" height="100%"' +
        '            color-interpolation-filters="linearRGB">' +
        '      <feTurbulence' +
        '        type="fractalNoise"' +
        '        baseFrequency="' + size + '"' +
        '        numOctaves="4"' +
        '        seed="0"' +
        '        stitchTiles="stitch"' +
        '        result="noise"/>' +
        '      <feColorMatrix type="saturate" values="0"' +
        '        in="noise" result="gray"/>' +
        '      <feComponentTransfer in="gray" result="sharp">' +
        '        <feFuncR type="linear" slope="3" intercept="-1"/>' +
        '        <feFuncG type="linear" slope="3" intercept="-1"/>' +
        '        <feFuncB type="linear" slope="3" intercept="-1"/>' +
        '      </feComponentTransfer>' +
        '    </filter>' +
        "  </defs>" +
        '  <rect width="100%" height="100%"' +
        '        filter="url(#' + uid + ')"/>' +
        "</svg>";

      el.appendChild(overlay);

      instances.push({
        turbulence: overlay.querySelector("feTurbulence"),
      });
    });

    /*
     * Seed is randomised every 2 ticks (~30 fps at 60 fps display).
     * 30 fps flicker mimics analogue film grain; 60 fps reads as digital noise.
     */
    var frame = 0;
    function tick() {
      frame++;
      if (frame % 2 !== 0) return;
      for (var i = 0; i < instances.length; i++) {
        instances[i].turbulence.setAttribute(
          "seed",
          Math.floor(Math.random() * 10000)
        );
      }
    }

    gsap.ticker.add(tick);

    // Public cleanup (SPA navigation, modal close, etc.)
    global.Sestek._grainDestroy = function () {
      gsap.ticker.remove(tick);
    };
  }

  global.Sestek           = global.Sestek || {};
  global.Sestek.initGrain = initGrain;

})(typeof window !== "undefined" ? window : this);
