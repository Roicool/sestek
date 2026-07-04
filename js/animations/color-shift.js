/*!
 * color-shift.js v1.3.0
 * Scroll-driven background + text colour transitions — data-attribute driven.
 *
 * Colour values accept either a literal (#hex, rgb()) or a CSS variable token
 * ("--neutral--900" or "var(--neutral--900)") — RC Structure tokens work
 * directly; they're resolved to a computed colour before tweening.
 *
 * Two playback modes:
 *   scrub (default) — colour tracks scroll position between start/end
 *   once            — data-cs-once: fixed-duration one-shot on entry, no scrub
 * Optional data-cs-disable-mobile snaps to the end colour below 768px.
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
 *     data-cs-target-2="prev"
 *     data-cs-bg-from-2="#ffffff"
 *     data-cs-bg-to-2="#0a0a0f"
 *   >
 *     <h2 data-cs-text data-cs-from="#111111" data-cs-to="#ffffff">…</h2>
 *     <p  data-cs-text data-cs-from="#444444" data-cs-to="#aaaaaa">…</p>
 *   </section>
 *
 * Section attributes:
 *   data-color-shift           marks the scroll trigger — required
 *   data-cs-bg-from   color    background start colour  (default: current bg)
 *   data-cs-bg-to     color    background end colour    (default: current bg)
 *   data-cs-target    selector CSS selector, or one of the keywords below, for
 *                              the element whose background changes.
 *                              (default: the [data-color-shift] section itself)
 *                                "self"     the section itself (default)
 *                                "parent"   the section's parentElement
 *                                "prev"     the section's previous sibling —
 *                                           e.g. fade the component ABOVE as
 *                                           this section scrolls into view
 *                                "next"     the section's next sibling
 *                                "body"     (or any selector) full-page shift
 *
 *   A SECOND background target can shift in lockstep with the first — e.g.
 *   the section fades its own background AND the section above it at once:
 *   data-cs-target-2    selector/keyword  same rules as data-cs-target,
 *                                         but no default — omit to disable
 *   data-cs-bg-from-2   color             start colour for the 2nd target
 *   data-cs-bg-to-2     color             end colour for the 2nd target
 *
 *   data-cs-start     string   ScrollTrigger start      (default "top 75%")
 *   data-cs-end       string   ScrollTrigger end        (default "bottom 25%")
 *                              (ignored in once mode)
 *   data-cs-scrub     number   scrub lag in seconds     (default 0.8)
 *                              (ignored in once mode)
 *   data-cs-once      flag     one-shot on entry instead of scrub. Fires a
 *                              fixed-duration tween once when start is hit.
 *   data-cs-duration  number   once-mode play time in seconds   (default 0.8)
 *   data-cs-ease      string   once-mode GSAP ease           (default power2.out)
 *   data-cs-disable-mobile  flag  below 768px skip the animation and snap to
 *                              the end colour (lighter on low-end devices)
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
   * Treat a data-attribute as a boolean flag. Present-but-empty (the Webflow
   * default when you add an attribute with no value) counts as TRUE; only an
   * explicit "false"/"0"/"no" — or a missing attribute — counts as false.
   * @param {string|undefined} v
   * @returns {boolean}
   */
  function flag(v) {
    return v !== undefined && v !== "false" && v !== "0" && v !== "no";
  }

  /**
   * Resolve a data-cs-target value to the element whose background should
   * shift. Accepts the positional keywords documented above or falls back to
   * a plain CSS selector (querySelector, first match wins).
   * @param {string|undefined} value
   * @param {HTMLElement} section
   * @returns {Element|null}
   */
  function resolveTarget(value, section) {
    if (!value) return section;
    switch (value) {
      case "self":     return section;
      case "parent":   return section.parentElement;
      case "prev":
      case "previous": return section.previousElementSibling;
      case "next":     return section.nextElementSibling;
      default:         return document.querySelector(value);
    }
  }

  /**
   * Resolve a colour value to something GSAP can interpolate.
   * GSAP tweens between two rgba() values — it cannot interpolate a raw
   * `var(--token)`, so any CSS variable must be resolved to its computed
   * colour FIRST. Supports three input forms:
   *   "#0a0a0f"            → returned as-is (literal colour)
   *   "--neutral--900"     → bare token, resolved on `contextEl`
   *   "var(--neutral--900)"→ var() wrapper, resolved on `contextEl`
   *
   * The token is read from the element's own computed style so scoped
   * overrides (a variable redefined on a parent) resolve correctly.
   *
   * @param {string} value
   * @param {HTMLElement} contextEl  element the variable is resolved against
   * @returns {string} a literal colour string (or the original value)
   */
  function resolveColor(value, contextEl) {
    if (!value) return value;
    var v = value.trim();

    // Extract the custom-property name from either "var(--x)" or "--x"
    var name = null;
    var m = v.match(/^var\(\s*(--[^,)\s]+)/);
    if (m) name = m[1];
    else if (v.indexOf("--") === 0) name = v;

    if (!name) return v; // literal colour (#hex, rgb(), named) — use directly

    var resolved = getComputedStyle(contextEl).getPropertyValue(name).trim();
    if (!resolved) {
      console.warn("[Sestek ColorShift] CSS variable not found:", name);
      return v;
    }
    return resolved;
  }

  /**
   * Wire up one [data-color-shift] section.
   * @param {HTMLElement} section
   */
  function wire(section) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ColorShift] GSAP + ScrollTrigger required."); return;
    }
    if (section._colorShiftInit) return;                  // idempotent — no duplicate triggers
    section._colorShiftInit = true;

    var d = section.dataset;

    // ── Config ─────────────────────────────────────────────────────
    var start    = d.csStart    || "top 75%";
    var end      = d.csEnd      || "bottom 25%";
    var scrub    = d.csScrub    !== undefined ? parseFloat(d.csScrub) : 0.8;

    // once: scroll-independent one-shot — plays a fixed-duration tween when the
    // section enters, instead of scrubbing the colour to scroll position.
    var once     = flag(d.csOnce);
    var duration = d.csDuration !== undefined ? parseFloat(d.csDuration) : 0.8;
    var ease     = d.csEase || "power2.out";

    // disableMobile: below 768px skip the animation and snap to the end colour.
    var disableMobile = flag(d.csDisableMobile);

    // Background target — defaults to the section itself. Accepts the "prev"/
    // "next"/"parent"/"self" keywords or any CSS selector (e.g. "body").
    var bgTarget = resolveTarget(d.csTarget, section);

    if (!bgTarget) {
      console.warn("[Sestek ColorShift] data-cs-target not found:", d.csTarget); return;
    }

    // Resolve colours (literal #hex or CSS var token → computed colour).
    // Variables resolve against the element they apply to, so bg tokens use
    // the bgTarget's scope and text tokens use each text element's scope.
    var bgFrom = d.csBgFrom ? resolveColor(d.csBgFrom, bgTarget) : null;
    var bgTo   = d.csBgTo   ? resolveColor(d.csBgTo,   bgTarget) : null;

    // Optional second background target — e.g. shift the section's own
    // background AND the component above it (data-cs-target-2="prev") at once.
    var bgTarget2 = d.csTarget2 ? resolveTarget(d.csTarget2, section) : null;
    if (d.csTarget2 && !bgTarget2) {
      console.warn("[Sestek ColorShift] data-cs-target-2 not found:", d.csTarget2);
    }
    var bgFrom2 = bgTarget2 && d.csBgFrom2 ? resolveColor(d.csBgFrom2, bgTarget2) : null;
    var bgTo2   = bgTarget2 && d.csBgTo2   ? resolveColor(d.csBgTo2,   bgTarget2) : null;

    // Text children
    var textEls = Array.prototype.slice.call(section.querySelectorAll("[data-cs-text]"));

    // Nothing to animate → bail silently
    if (!bgFrom && !bgTo && !bgFrom2 && !bgTo2 && !textEls.length) return;

    // Jump straight to the end colours (no animation) — shared by the
    // reduced-motion and disable-mobile escape hatches.
    function snapToEnd() {
      if (bgTo) gsap.set(bgTarget, { backgroundColor: bgTo });
      if (bgTo2) gsap.set(bgTarget2, { backgroundColor: bgTo2 });
      textEls.forEach(function (el) {
        if (el.dataset.csTo) gsap.set(el, { color: resolveColor(el.dataset.csTo, el) });
      });
    }

    // ── prefers-reduced-motion ──────────────────────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      snapToEnd(); return;
    }

    // ── disable-mobile ──────────────────────────────────────────────
    if (disableMobile && window.matchMedia("(max-width: 767px)").matches) {
      snapToEnd(); return;
    }

    // ── Set initial states ──────────────────────────────────────────
    // Only if an explicit from-colour was given — don't override CSS otherwise.
    if (bgFrom) gsap.set(bgTarget, { backgroundColor: bgFrom });
    if (bgFrom2) gsap.set(bgTarget2, { backgroundColor: bgFrom2 });
    textEls.forEach(function (el) {
      if (el.dataset.csFrom) gsap.set(el, { color: resolveColor(el.dataset.csFrom, el) });
    });

    // ── Build timeline ──────────────────────────────────────────────
    // Two modes share one timeline shape, only the ScrollTrigger differs:
    //   scrub mode  → colour tracks scroll position between start/end
    //   once  mode  → fixed-duration tween fires once on entry (scroll-free)
    var stConfig = {
      trigger        : section,
      start          : start,
      // Not a pin — stays below hero (2) and scroll-tabs (1) in refresh order.
      // Negative priority ensures reveal.js and color-shift never fight the pins.
      refreshPriority: -1,
    };
    if (once) {
      stConfig.toggleActions = "play none none none";
      stConfig.once = true;          // never replays — cheapest on mobile
    } else {
      stConfig.end   = end;
      stConfig.scrub = scrub;
    }

    var tl = gsap.timeline({ scrollTrigger: stConfig });

    // In scrub mode the absolute duration is irrelevant (scrub maps the whole
    // timeline to the scroll window); in once mode it's the real play time.
    var tweenDur  = once ? duration : 0.5;
    var tweenEase = once ? ease : "none";

    // Background
    if (bgFrom && bgTo) {
      tl.fromTo(
        bgTarget,
        { backgroundColor: bgFrom },
        { backgroundColor: bgTo, ease: tweenEase, duration: tweenDur },
        0
      );
    }

    // Second background target — same timeline position, stays in lockstep
    if (bgFrom2 && bgTo2) {
      tl.fromTo(
        bgTarget2,
        { backgroundColor: bgFrom2 },
        { backgroundColor: bgTo2, ease: tweenEase, duration: tweenDur },
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
          { color: resolveColor(from, el) },
          { color: resolveColor(to, el), ease: tweenEase, duration: tweenDur },
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
