/*!
 * card-cascade.js v1.0.0
 * Scroll-triggered "cascade" entrance for a small set of cards — they fade +
 * rise into place ONE BY ONE (staggered) as the group scrolls into view.
 * Fully data-attribute driven; the visual design (layout, spacing, colours)
 * stays in Webflow Designer — this file only owns the entrance motion.
 *
 * BREAKPOINT GATE (the whole point):
 *   The animation runs ONLY at tablet & up — default min-width 991px. Below
 *   that (phones) the cards are shown normally, in place, untouched: no hidden
 *   state, no transform, no ScrollTrigger. Handled with gsap.matchMedia() so
 *   crossing the breakpoint on resize cleanly reverts the styles both ways.
 *
 * Requires : gsap + ScrollTrigger (registered here), Sestek.util
 *            (js/core/utils.js) loaded first. Lenis optional.
 * CSS      : css/components/card-cascade.css  (owns the armed anti-flash state)
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-card-cascade]              root / group — the ScrollTrigger trigger
 *     [data-cc-item]                 one card (repeat; e.g. 3). Each rises in
 *                                    turn, in DOM order.
 *
 * Root attributes (all optional):
 *   data-cc-min        min viewport px to animate at        (default 991)
 *                      below this the cards are shown normally, no motion
 *   data-cc-y          rise distance in px (from below)      (default 40)
 *   data-cc-duration   per-card entrance duration in sec     (default 0.8)
 *   data-cc-stagger    gap between each card, in sec         (default 0.15)
 *   data-cc-ease       GSAP ease                             (default "power3.out")
 *   data-cc-start      ScrollTrigger start position          (default "top 80%")
 *   data-cc-once       "false" → bidirectional: replays on every enter and
 *                      reverses on every leave. Default true: play once, stay.
 *
 * Accessibility: prefers-reduced-motion → no motion, cards shown instantly at
 * their final position (CSS mirrors this, so it holds even before JS runs).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    min: 991,
    y: 40,
    duration: 0.8,
    stagger: 0.15,
    ease: "power3.out",
    start: "top 80%",
    once: true,
  };

  function buildOne(root) {
    if (root._cardCascadeInit) return;                        // idempotent
    root._cardCascadeInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var items = toArray(root.querySelectorAll("[data-cc-item]"));
    if (!items.length) {
      console.warn("[Sestek CardCascade] Need at least one [data-cc-item] inside [data-card-cascade].");
      return;
    }

    var MIN      = attrNum(root, "data-cc-min", DEFAULTS.min);
    var Y        = attrNum(root, "data-cc-y", DEFAULTS.y);
    var DURATION = attrNum(root, "data-cc-duration", DEFAULTS.duration);
    var STAGGER  = attrNum(root, "data-cc-stagger", DEFAULTS.stagger);
    var EASE     = root.getAttribute("data-cc-ease") || DEFAULTS.ease;
    var START    = root.getAttribute("data-cc-start") || DEFAULTS.start;
    var ONCE     = root.getAttribute("data-cc-once") !== "false";

    // Reduced motion: never hide, never animate — leave the cards in place.
    // (CSS already keeps them visible under reduced-motion; nothing to do.)
    if (util.prefersReducedMotion()) return;

    // gsap.matchMedia gates the whole effect to tablet & up. When the viewport
    // drops below MIN, matchMedia reverts every gsap.set/tween it created here
    // (clearing opacity + transform) so phones render the cards untouched.
    var mm = gsap.matchMedia();

    mm.add("(min-width: " + MIN + "px)", function () {
      // Hidden from-state (matches css/components/card-cascade.css anti-flash).
      gsap.set(items, {
        opacity: 0,
        y: Y,
        force3D: true,
        willChange: "transform, opacity",
      });

      var tween = gsap.to(items, {
        opacity: 1,
        y: 0,
        duration: DURATION,
        ease: EASE,
        stagger: STAGGER,                                     // one by one, DOM order
        scrollTrigger: {
          trigger: root,
          start: START,
          once: ONCE,
          // Non-pinned entrance → refresh AFTER any pinned triggers so "top 80%"
          // resolves against the real (post-pin-spacing) document height.
          refreshPriority: -1,
          toggleActions: ONCE ? "play none none none" : "play reverse play reverse",
        },
        onComplete: function () { gsap.set(items, { willChange: "auto" }); },
        onReverseComplete: function () {
          gsap.set(items, { willChange: "transform, opacity" });
        },
      });

      // matchMedia cleanup: kill this breakpoint's ScrollTrigger + tween so it
      // isn't left dangling when we drop below MIN (styles are auto-reverted).
      return function () {
        if (tween.scrollTrigger) tween.scrollTrigger.kill();
        tween.kill();
      };
    });

    root._cardCascadeMM = mm;                                 // handle for _destroy
  }

  /**
   * Initialise every [data-card-cascade] group on the page in one call.
   * @param {string} [selector="[data-card-cascade]"] narrow the scope if needed
   */
  function initCardCascade(selector) {
    // Tolerate late-loading libraries (async/defer order): poll for gsap +
    // ScrollTrigger for up to ~4s before giving up.
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
          clearInterval(poll);
          initCardCascade(selector);
        } else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek CardCascade] gsap + ScrollTrigger required — " +
            "load gsap.min.js AND ScrollTrigger.min.js before this script. Missing: " +
            (typeof gsap === "undefined" ? "gsap " : "") +
            (typeof ScrollTrigger === "undefined" ? "ScrollTrigger" : ""));
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek CardCascade] Sestek.util (js/core/utils.js) required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Arm the CSS anti-flash guard (no-op if already added in <head>). Gated on
    // this class so no-JS pages render the cards normally (graceful fallback).
    document.documentElement.classList.add("cc-armed");

    var roots = document.querySelectorAll(selector || "[data-card-cascade]");
    if (!roots.length) { console.warn("[Sestek CardCascade] No [data-card-cascade] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);

    // Late layout settle (fonts / images / CMS): re-measure so start/end land.
    if (document.readyState === "complete") {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCardCascade = initCardCascade;

})(typeof window !== "undefined" ? window : this);
