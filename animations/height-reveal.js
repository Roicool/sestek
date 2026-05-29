/*!
 * height-reveal.js v1.0.0
 * Reusable "Webflow-style" height swap — one element collapses (height → 0)
 * while another grows (0 → auto). GPU-light, single source of truth for the
 * site-wide content-swap look.
 * Requires: gsap registered (CSSPlugin ships with gsap core).
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Builds a timeline that swaps two stacked elements by animating their height.
   *
   *   outEl : height (current) → 0, fades out      — the element leaving
   *   inEl  : height 0 → inHeight (or "auto"), fades in — the element arriving
   *
   * Both run on the SAME timeline at position 0 so the collapse and the grow
   * happen together (the classic "one drops, the other rises" feel).
   *
   * @param {HTMLElement}  outEl              element to collapse (may be null)
   * @param {HTMLElement}  inEl               element to reveal (may be null)
   * @param {object}       [opts]
   * @param {number}       [opts.duration=0.5]
   * @param {string}       [opts.ease="power2.inOut"]
   * @param {number|string}[opts.inHeight="auto"]  explicit target height in px
   *                        (recommended inside scrubbed timelines to avoid
   *                         re-measuring "auto" on every tick)
   * @returns {gsap.core.Timeline}
   */
  function heightReveal(outEl, inEl, opts) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek heightReveal] GSAP required.");
      return null;
    }

    var o = opts || {};
    var duration = typeof o.duration === "number" ? o.duration : 0.5;
    var ease = o.ease || "power2.inOut";
    var inHeight = o.inHeight != null ? o.inHeight : "auto";

    var tl = gsap.timeline();

    if (outEl) {
      tl.to(outEl, {
        height: 0,
        autoAlpha: 0,
        ease: ease,
        duration: duration,
        onStart: function () { outEl.style.willChange = "height"; },
        onComplete: function () { outEl.style.willChange = "auto"; },
        // reverse (scrub-back) also restores will-change cleanly
        onReverseComplete: function () { outEl.style.willChange = "auto"; },
      }, 0);
    }

    if (inEl) {
      tl.fromTo(inEl,
        { height: 0, autoAlpha: 0 },
        {
          height: inHeight,
          autoAlpha: 1,
          ease: ease,
          duration: duration,
          onStart: function () { inEl.style.willChange = "height"; },
          onComplete: function () { inEl.style.willChange = "auto"; },
          onReverseComplete: function () { inEl.style.willChange = "auto"; },
        }, 0);
    }

    return tl;
  }

  /**
   * Measures the natural (auto) pixel height of an element without leaving a
   * visible flash. Useful before locking elements to height:0 in a build step.
   * @param {HTMLElement} el
   * @returns {number} height in px
   */
  function measureAutoHeight(el) {
    if (!el) return 0;
    var prevHeight = el.style.height;
    var prevVis = el.style.visibility;
    el.style.height = "auto";
    var h = el.offsetHeight;
    el.style.height = prevHeight;
    el.style.visibility = prevVis;
    return h;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.heightReveal = heightReveal;
  global.Sestek.measureAutoHeight = measureAutoHeight;

})(typeof window !== "undefined" ? window : this);
