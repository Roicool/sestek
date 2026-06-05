/*!
 * color-shift.js v1.0.0
 * Scroll-driven background + text colour transitions — data-attribute driven.
 *
 * As a section scrolls through the viewport the background of a target element
 * (the section itself, a wrapper, or <body>) smoothly transitions between two
 * colours. Any text elements inside can shift colour in the same timeline.
 *
 * Why backgroundColor not a CSS overlay?
 *   An animating overlay div sits above content (z-index hell) and causes
 *   compositing layers everywhere. Tweening backgroundColor directly is a
 *   single paint per frame — no layout, no extra layers, no CLS.
 *
 * Why scrub instead of a CSS transition?
 *   Scrub ties progress 1-to-1 to scroll position so the colour tracks the
 *   user's finger/wheel exactly — "smooth" comes from Lenis + GSAP ticker
 *   sync, not a fixed-duration tween that lags behind.
 *
 * PageSpeed notes:
 *   • backgroundColor is a paint-only property — no layout recalc, no reflow.
 *   • ScrollTrigger updates run inside the GSAP ticker (rAF-synced via Lenis),
 *     never on the main thread independently → zero TBT impact.
 *   • No will-change needed: the browser promotes layers only for transform/
 *     opacity. Painting bg-colour on existing layers is cheaper than a new one.
 *
 * Requires: gsap + ScrollTrigger registered, optionally Sestek.initLenis().
 *
 * DOM:
 *   <section
 *     data-color-shift
 *     data-cs-bg-from="#ffffff"
 *     data-cs-bg-to="#0a0a0f"
 *   >
 *     <h2 data-cs-text data-cs-from="#111111" data-cs-to="#ffffff">…</h2>
 *     <p  data-cs-text data-cs-from="#444444" data-cs-to="#aaaaaa">…</p>
 *   </section>
 *
 * Section attributes:
 *   data-color-shift           marks the scroll trigger — required
 *   data-cs-bg-from   color    background start colour  (default: current bg)
 *   data-cs-bg-to     color    background end colour    (default: current bg)
 *   data-cs-target    selector CSS selector for the element whose background
 *                              changes. e.g. "body" for a full-page shift.
 *                              (default: the [data-color-shift] section itself)
 *   data-cs-start     string   ScrollTrigger start      (default "top 75%")
 *   data-cs-end       string   ScrollTrigger end        (default "bottom 25%")
 *   data-cs-scrub     number   scrub lag in seconds     (default 0.8)
 *
 * Text child attributes (place on any child of the section):
 *   data-cs-text               marks a text element to colour-shift
 *   data-cs-from      color    text colour at scroll start (default: current color)
 *   data-cs-to        color    text colour at scroll end
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Wire up one [data-color-shift] section.
   * @param {HTMLElement} section
   */
  function wire(section) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ColorShift] GSAP + ScrollTrigger required."); return;
    }

    var d = section.dataset;

    // ── Config ─────────────────────────────────────────────────────
    var bgFrom   = d.csBgFrom   || null;
    var bgTo     = d.csBgTo     || null;
    var start    = d.csStart    || "top 75%";
    var end      = d.csEnd      || "bottom 25%";
    var scrub    = d.csScrub    !== undefined ? parseFloat(d.csScrub) : 0.8;

    // Background target — defaults to the section, can point anywhere (e.g. "body")
    var bgTarget = d.csTarget
      ? document.querySelector(d.csTarget)
      : section;

    if (!bgTarget) {
      console.warn("[Sestek ColorShift] data-cs-target not found:", d.csTarget); return;
    }

    // Text children
    var textEls = Array.prototype.slice.call(section.querySelectorAll("[data-cs-text]"));

    // Nothing to animate → bail silently
    if (!bgFrom && !bgTo && !textEls.length) return;

    // ── prefers-reduced-motion ──────────────────────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Jump straight to the end state so content is readable
      if (bgTo)  gsap.set(bgTarget, { backgroundColor: bgTo });
      textEls.forEach(function (el) {
        if (el.dataset.csTo) gsap.set(el, { color: el.dataset.csTo });
      });
      return;
    }

    // ── Set initial states ──────────────────────────────────────────
    // Only if an explicit from-colour was given — don't override CSS otherwise.
    if (bgFrom) gsap.set(bgTarget, { backgroundColor: bgFrom });
    textEls.forEach(function (el) {
      if (el.dataset.csFrom) gsap.set(el, { color: el.dataset.csFrom });
    });

    // ── Build timeline ──────────────────────────────────────────────
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger      : section,
        start        : start,
        end          : end,
        scrub        : scrub,
        // Not a pin — stays below hero (2) and scroll-tabs (1) in refresh order.
        // Negative priority ensures reveal.js and color-shift never fight the pins.
        refreshPriority: -1,
      },
    });

    // Background
    if (bgFrom && bgTo) {
      tl.fromTo(
        bgTarget,
        { backgroundColor: bgFrom },
        { backgroundColor: bgTo, ease: "none" },
        0
      );
    }

    // Text colours — all in the same timeline so they stay in lockstep
    textEls.forEach(function (el) {
      var from = el.dataset.csFrom;
      var to   = el.dataset.csTo;
      if (from && to) {
        tl.fromTo(
          el,
          { color: from },
          { color: to, ease: "none" },
          0  // same position → all change together
        );
      }
    });
  }

  /**
   * Initializes all [data-color-shift] sections on the page.
   * @param {string} [selector="[data-color-shift]"]
   */
  function initColorShift(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ColorShift] GSAP + ScrollTrigger required."); return;
    }

    var sections = document.querySelectorAll(selector || "[data-color-shift]");
    if (!sections.length) return;

    Array.prototype.forEach.call(sections, wire);

    // Re-measure after load (same pattern as reveal.js) so trigger positions
    // are correct after images / fonts settle the document height.
    if (document.readyState === "complete") {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () {
        ScrollTrigger.refresh();
      }, { once: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initColorShift = initColorShift;

})(typeof window !== "undefined" ? window : this);
