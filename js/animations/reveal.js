/*!
 * reveal.js v1.2.0
 * Size-reveal entrance — the "Webflow grow-in" look, fully data-attribute driven.
 *
 * Changelog
 * v1.2.0 — bidirectional by default: plays every time the element enters the
 *          viewport (from either direction) and reverses every time it leaves.
 *          Set data-reveal-once="true" for the old play-once behaviour.
 *
 * The element does NOT slide in from offscreen (old WordPress style). Instead it
 * appears to GROW from zero to its own CSS-defined size as it scrolls into view:
 *   data-reveal="left"  / "right"  → looks like its WIDTH  expands 0 → CSS width
 *   data-reveal="top"   / "bottom" → looks like its HEIGHT expands 0 → CSS height
 *
 * It does this WITHOUT touching layout: the element keeps its real box (no reflow,
 * no content squish, siblings never jump) and is unveiled with an animated
 * `clip-path: inset(...)` anchored to the chosen edge — so the visible box appears
 * to scale up to the exact value you set in CSS. GPU-composited, 60fps, zero thrash.
 *
 * Two ways to use it:
 *   1. Sestek.initReveal()                 — declarative, scans [data-reveal] and
 *                                            wires a ScrollTrigger for each (no JS)
 *   2. Sestek.reveal(el, opts)             — programmatic, returns the GSAP tween
 *
 * Requires: gsap + ScrollTrigger registered.
 * CSS : css/animations/reveal.css   (owns the pre-reveal hidden state / anti-flash)
 *
 * DOM (Webflow):
 *   <div class="card" data-reveal="left" data-reveal-delay="0.1">…</div>
 *
 * Attributes (all optional except data-reveal):
 *   data-reveal           "left" | "right" | "top" | "bottom"   anchor edge / grow
 *                         direction. left/right grow width, top/bottom grow height.
 *                         (default "left")
 *   data-reveal-duration  reveal duration in seconds — the speed      (default 1.1)
 *   data-reveal-delay     delay before it starts, in seconds          (default 0)
 *   data-reveal-ease      GSAP ease for the grow                (default "expo.out")
 *   data-reveal-scale     optional inner zoom-settle, e.g. 1.08 → 1   (default 1,
 *                         off). Adds the premium Webflow image-reveal depth.
 *   data-reveal-start     ScrollTrigger start position          (default "top 85%")
 *   data-reveal-once      "true" → play only once and stay revealed. Default
 *                         false: bidirectional — plays on every viewport enter
 *                         (scrolling down OR back up), reverses on every leave.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  // Collapsed clip per anchor edge — inset(top right bottom left). Each collapses
  // from the OPPOSITE side so the box stays pinned to the named edge and appears
  // to grow toward the other (matches reveal.css and reads as a size grow).
  var HIDDEN = {
    left:   "inset(0% 100% 0% 0%)",   // pinned left   → width grows right
    right:  "inset(0% 0% 0% 100%)",   // pinned right  → width grows left
    top:    "inset(0% 0% 100% 0%)",   // pinned top    → height grows down
    bottom: "inset(100% 0% 0% 0%)",   // pinned bottom → height grows up
  };
  var SHOWN = "inset(0% 0% 0% 0%)";   // fully revealed — element at its CSS size

  // transform-origin so an optional data-reveal-scale settles toward the anchor.
  var ORIGIN = {
    left: "left center", right: "right center",
    top: "center top",   bottom: "center bottom",
  };

  var DEFAULTS = {
    duration: 1.1,
    delay: 0,
    ease: "expo.out",
    start: "top 85%",
    once: false,
    scale: 1,
  };

  // Numeric data-attribute reader — shared helper from js/core/utils.js (core layer).
  var attrNum = Sestek.util.attrNum;

  /**
   * Reveal a single element. Sets its collapsed clip immediately, then grows it
   * to full size when it enters the viewport.
   *
   * @param {HTMLElement} el
   * @param {object} [opts]  same keys as the data-attributes (camelCase optional)
   * @returns {gsap.core.Tween|null}
   */
  function reveal(el, opts) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek reveal] GSAP + ScrollTrigger required.");
      return null;
    }
    if (!el || el._revealInit) return null;
    el._revealInit = true;

    var o = opts || {};
    var dir = (o.direction || el.getAttribute("data-reveal") || "left").toLowerCase();
    if (!HIDDEN[dir]) dir = "left";

    var duration = o.duration != null ? o.duration : attrNum(el, "data-reveal-duration", DEFAULTS.duration);
    var delay    = o.delay    != null ? o.delay    : attrNum(el, "data-reveal-delay", DEFAULTS.delay);
    var scale    = o.scale    != null ? o.scale    : attrNum(el, "data-reveal-scale", DEFAULTS.scale);
    var ease     = o.ease     || el.getAttribute("data-reveal-ease")  || DEFAULTS.ease;
    var start    = o.start    || el.getAttribute("data-reveal-start") || DEFAULTS.start;
    var once     = o.once != null ? o.once : el.getAttribute("data-reveal-once") === "true";

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(el, { clearProps: "clip-path,transform" });
      return null;
    }

    // Collapsed start state (also covers above-the-fold elements if the CSS
    // anti-flash guard wasn't armed in <head>).
    gsap.set(el, {
      clipPath: HIDDEN[dir],
      scale: scale !== 1 ? scale : 1,
      transformOrigin: ORIGIN[dir],
      force3D: true,
    });
    el.style.willChange = "clip-path, transform";

    return gsap.to(el, {
      clipPath: SHOWN,
      scale: 1,
      duration: duration,
      delay: delay,
      ease: ease,
      scrollTrigger: {
        trigger: el,
        start: start,
        once: once,
        // Negative priority → these refresh AFTER pinned triggers (priority ≥ 0),
        // so by the time a reveal measures its start/end the pin-spacing above it
        // already exists and "top 85%" resolves against the real document height.
        refreshPriority: -1,
        // Bidirectional: play on every enter (either direction), reverse on
        // every leave — scroll down past it and back up, it re-reveals.
        toggleActions: once ? "play none none none" : "play reverse play reverse",
      },
      onComplete: function () { el.style.willChange = "auto"; },
      onReverseComplete: function () { el.style.willChange = "clip-path, transform"; },
    });
  }

  /**
   * Initialise every [data-reveal] element on the page.
   * @param {string} [selector="[data-reveal]"]
   * @returns {Array<gsap.core.Tween>}
   */
  function initReveal(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek initReveal] GSAP + ScrollTrigger required.");
      return [];
    }
    // Arm the CSS anti-flash guard (no-op if already added in <head>).
    document.documentElement.classList.add("reveal-armed");

    var els = document.querySelectorAll(selector || "[data-reveal]");
    var tweens = [];
    Array.prototype.forEach.call(els, function (el) {
      var t = reveal(el);
      if (t) tweens.push(t);
    });

    // Triggers created on DOMContentLoaded are measured before images/fonts
    // settle the layout — and before pins below them finish adding pin-spacing.
    // Re-measure once everything has loaded so every start/end lands correctly.
    if (typeof ScrollTrigger !== "undefined") {
      if (document.readyState === "complete") {
        ScrollTrigger.refresh();
      } else {
        window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
      }
    }

    return tweens;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.reveal = reveal;
  global.Sestek.initReveal = initReveal;

})(typeof window !== "undefined" ? window : this);
