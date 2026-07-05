/*!
 * pin-slider.js v1.0.0
 * A pin-then-scroll horizontal card slider (desktop) that degrades to a
 * sticky "stacking cards" list (mobile) — driven entirely by data-attributes,
 * built on GSAP + ScrollTrigger.
 *
 *   Desktop (≥ breakpoint):
 *     • The section PINS when it reaches the viewport.
 *     • Scrolling then drives the track sideways (left→right feel) through all
 *       cards via a scrubbed timeline — no wheel hijacking, native scroll only.
 *     • After the last card, an OUTRO segment recedes the whole track back in
 *       depth (scale down + fade) so the cards dissolve away as you scroll on.
 *   Mobile (< breakpoint):
 *     • Cards stack vertically and are position:sticky (CSS), so each one slides
 *       up and pins over the previous — the "sticky card" stack.
 *     • Each card scrubs a subtle scale-down as the next overlaps it (depth),
 *       skipped entirely under reduced-motion.
 *
 * Everything is attribute-driven — no class hooks required. The CSS
 * (css/components/pin-slider.css) is bound by the same data-attributes.
 *
 * Requires: gsap + ScrollTrigger (globals), Sestek.util (js/core/utils.js).
 * CSS     : css/components/pin-slider.css
 *
 * DOM:
 *   [data-ps-slider]                 section root
 *     [data-ps-viewport]             pinned/sticky frame (overflow clip on desktop)
 *       [data-ps-track]              the horizontal track (a plain div)
 *         [data-ps-cms]              Collection List Wrapper — ONE per collection,
 *                                    flattened to display:contents by the CSS so
 *                                    the item below becomes a direct flex child
 *           (Collection List)        also flattened (display:contents)
 *             [data-ps-card]         Collection Item = the card (4 collections → 4)
 *
 * Each card is bound to a DIFFERENT CMS collection, so there are 4 separate
 * Collection Lists in the track (each limited to 1 item). data-ps-cms +
 * data-ps-card carry the layout; the Webflow list levels in between contribute
 * nothing to layout thanks to display:contents.
 *
 * Root attributes:
 *   data-ps-breakpoint   min-width px for the horizontal mode   (default 768)
 *   data-ps-outro        outro length as a fraction of viewport (default 0.9)
 *   data-ps-scrub        ScrollTrigger scrub smoothing seconds  (default 1)
 *   data-ps-end-scale    track scale at the end of the outro    (default 0.82)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  // Read helpers lazily (inside functions) — NOT at load time. If this file
  // loads before js/core/utils.js, touching Sestek.util at parse time would
  // throw and initPinSlider would never get defined. These fallbacks also let
  // the component work even if utils.js is absent.
  function attrNum(el, attr, fallback) {
    if (global.Sestek && Sestek.util && Sestek.util.attrNum) {
      return Sestek.util.attrNum(el, attr, fallback);
    }
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }
  function prefersReduced() {
    if (global.Sestek && Sestek.util && Sestek.util.prefersReducedMotion) {
      return Sestek.util.prefersReducedMotion();
    }
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function warn(msg, el) {
    if (global.console && global.console.warn) {
      global.console.warn("[Sestek PinSlider] " + msg, el || "");
    }
  }

  /** Wire up one [data-ps-slider] section. */
  function wire(root) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek PinSlider] GSAP + ScrollTrigger required."); return;
    }
    if (root._pinSliderInit) return;                 // idempotent — no duplicate triggers
    root._pinSliderInit = true;

    var viewport = root.querySelector("[data-ps-viewport]");
    var track    = root.querySelector("[data-ps-track]");
    if (!viewport || !track) {
      warn("Missing [data-ps-viewport] or [data-ps-track].", root); return;
    }
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-ps-card]"));
    if (!cards.length) { warn("No [data-ps-card] children.", root); return; }

    var d          = root.dataset;
    var breakpoint = attrNum(root, "data-ps-breakpoint", 768);
    var outroFrac  = attrNum(root, "data-ps-outro",      0.9);
    var scrub      = d.psScrub !== undefined ? parseFloat(d.psScrub) : 1;
    var endScale   = attrNum(root, "data-ps-end-scale",  0.82);

    // Reduced motion: no pinning, no scrub. Desktop falls back to a native
    // horizontal-scroll strip; mobile keeps the CSS sticky stack (harmless,
    // no transforms). The [data-ps-reduced] hook lets the CSS restyle both.
    if (prefersReduced()) {
      root.setAttribute("data-ps-reduced", "");
      return;
    }

    // Two truly separate setups — matchMedia builds the right one and tears it
    // down automatically on cross-breakpoint resize (revert() undoes our sets).
    var mm = gsap.matchMedia();
    var desktop = "(min-width: " + breakpoint + "px)";
    var mobile  = "(max-width: " + (breakpoint - 1) + "px)";

    // ── Desktop: pin + horizontal scrub + depth outro ─────────────────
    mm.add(desktop, function () {
      root.setAttribute("data-ps-mode", "horizontal");

      // Distance the track must travel so its last edge reaches the viewport's.
      function distance() {
        return Math.max(0, track.scrollWidth - viewport.clientWidth);
      }
      var maxX     = distance();
      var outroPx  = viewport.clientHeight * outroFrac;
      var totalPx  = maxX + outroPx;
      // Fraction of the timeline spent sliding vs. dissolving — keeps the two
      // phases proportional to their real scroll length however wide the track.
      var slideDur = totalPx > 0 ? maxX / totalPx : 1;
      var outroDur = 1 - slideDur;

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + totalPx,
          pin: viewport,
          pinSpacing: true,
          scrub: scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,      // recompute distance() on resize
          refreshPriority: 1,             // pin resolves before reveal/color-shift
        },
      });

      // Phase 1 — slide the whole track sideways.
      if (maxX > 0) {
        tl.to(track, { x: function () { return -distance(); }, duration: slideDur }, 0);
      }
      // Phase 2 — recede into depth: scale down + fade the track away.
      if (outroDur > 0) {
        tl.to(track, {
          scale: endScale,
          autoAlpha: 0,
          transformOrigin: "center center",
          duration: outroDur,
        }, slideDur);
      }

      // matchMedia cleanup: revert the timeline + its ScrollTrigger and clear
      // the transforms so switching to mobile starts from a clean slate.
      return function () {
        tl.scrollTrigger && tl.scrollTrigger.kill();
        tl.kill();
        gsap.set(track, { clearProps: "all" });
        root.removeAttribute("data-ps-mode");
      };
    });

    // ── Mobile: CSS-sticky stack + per-card depth scrub ───────────────
    mm.add(mobile, function () {
      root.setAttribute("data-ps-mode", "stack");

      // The stacking itself is pure CSS (position:sticky). Here we only add a
      // subtle scale-down to each card as the NEXT card slides up over it, so
      // the covered card reads as receding rather than being flatly hidden.
      var triggers = [];
      cards.forEach(function (card, i) {
        if (i === cards.length - 1) return;         // last card is never covered
        var next = cards[i + 1];
        var tw = gsap.to(card, {
          scale: 0.94,
          transformOrigin: "center top",
          ease: "none",
          scrollTrigger: {
            trigger: next,
            start: "top bottom",                    // next enters from below
            end: "top top",                         // next fully covers this card
            scrub: scrub,
            invalidateOnRefresh: true,
          },
        });
        triggers.push(tw);
      });

      return function () {
        triggers.forEach(function (tw) {
          tw.scrollTrigger && tw.scrollTrigger.kill();
          tw.kill();
        });
        gsap.set(cards, { clearProps: "all" });
        root.removeAttribute("data-ps-mode");
      };
    });

    root._pinSliderDestroy = function () { mm.revert(); };
  }

  /** Initialise every [data-ps-slider] on the page. */
  function initPinSlider(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek PinSlider] GSAP + ScrollTrigger required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-ps-slider]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initPinSlider = initPinSlider;

})(typeof window !== "undefined" ? window : this);
