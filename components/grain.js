/*!
 * grain.js v2.0.0
 * Animated film-grain overlay — Canvas-based, GPU-composited
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 *
 * Attributes on [data-grain] element:
 *   data-grain-intensity  — opacity 0.0–1.0  (default: 0.12)
 *   data-grain-size       — canvas tile px   (default: 128 — lower = coarser)
 *
 * Changelog
 * v2.0.0 — rewritten with Canvas; eliminates SVG feTurbulence CPU cost
 * v1.0.0 — initial release (SVG feTurbulence)
 */

(function (global) {
  "use strict";

  function initGrain(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Grain] GSAP required.");
      return;
    }

    var targets = Array.from(
      document.querySelectorAll(selector || "[data-grain]")
    );
    if (!targets.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var instances = [];

    targets.forEach(function (el) {
      var intensity = parseFloat(el.dataset.grainIntensity);
      if (isNaN(intensity)) intensity = 0.12;
      intensity = Math.max(0, Math.min(1, intensity));

      /*
       * Tile size controls grain coarseness when CSS stretches the canvas:
       *   64  → coarse / cinematic
       *   128 → standard 35mm (default)
       *   256 → fine / digital
       */
      var tileSize = parseInt(el.dataset.grainSize, 10);
      if (isNaN(tileSize) || tileSize < 32) tileSize = 128;
      tileSize = Math.min(tileSize, 512);

      if (getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }

      var canvas = document.createElement("canvas");
      canvas.width  = tileSize;
      canvas.height = tileSize;
      canvas.className = "grain__overlay";
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.setProperty("--grain-opacity", intensity);

      el.appendChild(canvas);

      var ctx     = canvas.getContext("2d");
      var imgData = ctx.createImageData(tileSize, tileSize);
      var data    = imgData.data;

      /*
       * Pre-fill alpha channel to 255 once — only RGB channels are written
       * per frame, saving 25 % of the per-frame write work.
       */
      for (var a = 3; a < data.length; a += 4) {
        data[a] = 255;
      }

      instances.push({ ctx: ctx, imgData: imgData, data: data, size: tileSize });
    });

    /*
     * Noise is repainted every 2 ticks (~30 fps at 60 fps display).
     * 30 fps mimics analogue film grain; 60 fps reads as digital noise.
     *
     * Per-frame cost for one 128×128 tile:
     *   16 384 pixels × 3 channels = 49 152 byte writes + putImageData upload.
     *   Negligible on all devices; no GC pressure (buffer is reused).
     */
    var frame = 0;

    function tick() {
      frame++;
      if (frame % 2 !== 0) return;

      // Pause when tab is hidden — no visual output, no wasted CPU
      if (document.hidden) return;

      for (var i = 0; i < instances.length; i++) {
        var inst = instances[i];
        var d    = inst.data;
        var len  = d.length;

        for (var j = 0; j < len; j += 4) {
          var v = (Math.random() * 255) | 0;
          d[j]     = v; // R
          d[j + 1] = v; // G
          d[j + 2] = v; // B
          // alpha pre-filled, skipped
        }

        inst.ctx.putImageData(inst.imgData, 0, 0);
      }
    }

    gsap.ticker.add(tick);

    global.Sestek._grainDestroy = function () {
      gsap.ticker.remove(tick);
    };
  }

  global.Sestek           = global.Sestek || {};
  global.Sestek.initGrain = initGrain;

})(typeof window !== "undefined" ? window : this);
