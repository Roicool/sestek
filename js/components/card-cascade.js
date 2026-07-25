/*!
 * card-cascade.js v2.0.0
 * PINNED scroll-cascade for a small set of cards. The section pins to the
 * viewport and, as you keep scrolling, the cards fade + rise into place ONE BY
 * ONE — each card's reveal locked to the scroll position (scrub). Once all
 * cards are in, the pin releases and the page scrolls on normally. Scrolling
 * back up reverses the same scrub. Fully data-attribute driven; the visual
 * design (layout, spacing, colours) stays in Webflow Designer.
 *
 * Changelog
 * v2.0.1 — pin no longer "seats" harshly. anticipatePin (which pins early based
 *          on scroll velocity) mis-predicts under Lenis' smoothed velocity and
 *          snapped the section into place; it's now OFF by default and opt-in
 *          via data-cc-anticipate.
 * v2.0.0 — pinned + scrub. Cards now come in tied to scroll position while the
 *          section is pinned (was: one-shot stagger on enter, no pin).
 *
 * BREAKPOINT GATE:
 *   Pin + scrub run ONLY at tablet & up — default min-width 991px. Below that
 *   (phones) the section is NOT pinned and the cards render normally, in place,
 *   untouched. Handled with gsap.matchMedia() so crossing the breakpoint on
 *   resize cleanly reverts the pin + styles both ways.
 *
 * Requires : gsap + ScrollTrigger (registered here), Sestek.util
 *            (js/core/utils.js) loaded first. Lenis optional (ScrollTrigger
 *            reads the native scroll position Lenis writes).
 * CSS      : css/components/card-cascade.css  (owns the armed anti-flash state)
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-card-cascade]              root — THIS is pinned. Give it the section
 *                                    height in Designer (e.g. min-height:100svh)
 *                                    so there's a screen to hold while cards
 *                                    come in.
 *     [data-cc-item]                 one card (repeat; e.g. 3). Each rises in
 *                                    turn, in DOM order, as you scroll.
 *
 *   ⚠ PIN RULE: no ANCESTOR of [data-card-cascade] may have transform / filter /
 *   perspective / will-change:transform — position:fixed (used by the pin)
 *   would anchor to that ancestor and the pin drifts. (See PROJECT.md.)
 *
 * Root attributes (all optional):
 *   data-cc-min        min viewport px to pin & animate at  (default 991)
 *                      below this: no pin, cards shown normally
 *   data-cc-y          rise distance in px (from below)     (default 40)
 *   data-cc-start      ScrollTrigger start (pin start)      (default "top top")
 *   data-cc-end        pin scroll distance                  (default "+=<n*50>%")
 *   data-cc-scrub      scrub lag in seconds                 (default 0.8)
 *   data-cc-duration   per-card reveal length, timeline units (default 1)
 *   data-cc-stagger    gap between each card start, tl units  (default 0.7)
 *   data-cc-ease       GSAP ease per card                   (default "power3.out")
 *   data-cc-priority   refreshPriority for this pin — set relative to other
 *                      pinned sections on the page (higher = earlier in the
 *                      page). See PROJECT.md pin table.         (default 1)
 *   data-cc-anticipate ScrollTrigger anticipatePin — pins slightly early to
 *                      hide the pin "jump". OFF by default (0) because under
 *                      Lenis' smoothed velocity it over-predicts and makes the
 *                      section snap in harshly. Try 0.5–1 only if you see a
 *                      1-frame jump on a native (non-smooth) scroller. (default 0)
 *
 * Accessibility: prefers-reduced-motion → no pin, no scrub. The section renders
 * as its final frame (all cards visible, in place). CSS mirrors this so it holds
 * even before JS runs.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    min: 991,
    y: 40,
    start: "top top",
    scrub: 0.8,
    duration: 1,
    stagger: 0.7,
    ease: "power3.out",
    priority: 1,
    anticipate: 0,
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
    var SCRUB    = attrNum(root, "data-cc-scrub", DEFAULTS.scrub);
    var DURATION = attrNum(root, "data-cc-duration", DEFAULTS.duration);
    var STAGGER  = attrNum(root, "data-cc-stagger", DEFAULTS.stagger);
    var PRIORITY = attrNum(root, "data-cc-priority", DEFAULTS.priority);
    var ANTICIPATE = attrNum(root, "data-cc-anticipate", DEFAULTS.anticipate);
    var EASE     = root.getAttribute("data-cc-ease") || DEFAULTS.ease;
    var START    = root.getAttribute("data-cc-start") || DEFAULTS.start;
    // Default pin distance scales with card count so more cards get more room.
    var END      = root.getAttribute("data-cc-end") || ("+=" + (items.length * 50) + "%");

    // Reduced motion: no pin, no scrub — final frame. Show the cards in place.
    if (util.prefersReducedMotion()) {
      gsap.set(items, { clearProps: "opacity,transform" });
      return;
    }

    // gsap.matchMedia gates pin + scrub to tablet & up. When the viewport drops
    // below MIN, matchMedia reverts the pin, the ScrollTrigger and every
    // gsap.set/tween it created here — so phones render the section untouched.
    var mm = gsap.matchMedia();

    mm.add("(min-width: " + MIN + "px)", function () {
      // Hidden from-state (matches css/components/card-cascade.css anti-flash).
      gsap.set(items, { opacity: 0, y: Y, force3D: true, willChange: "transform, opacity" });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: START,
          end: END,
          scrub: SCRUB,
          pin: true,
          anticipatePin: ANTICIPATE,                          // 0 = off (smooth-scroll friendly)
          refreshPriority: PRIORITY,
        },
      });

      // Each card reveals in turn — locked to scroll via the scrubbed timeline.
      items.forEach(function (el, i) {
        tl.to(el, { opacity: 1, y: 0, duration: DURATION, ease: EASE }, i * STAGGER);
      });
      // Small hold at the end so the last card settles before the pin releases.
      tl.to({}, { duration: DURATION * 0.5 });

      // matchMedia cleanup: kill this breakpoint's pin + timeline explicitly so
      // nothing dangles when we drop below MIN (styles are auto-reverted).
      return function () {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
      };
    });

    root._cardCascadeMM = mm;                                 // handle for _destroy
  }

  /**
   * Initialise every [data-card-cascade] section on the page in one call.
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

    // Late layout settle (fonts / images / CMS): the pin + start/end depend on
    // layout, so re-measure once everything has loaded.
    if (document.readyState === "complete") {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCardCascade = initCardCascade;

})(typeof window !== "undefined" ? window : this);
