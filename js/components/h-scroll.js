/*!
 * h-scroll.js v1.0.0
 * Pinned horizontal-scroll card section:
 *   Desktop — section pins, vertical scroll drives the card track to the LEFT
 *   (content moves right-to-left, reading direction feels "scroll right").
 *   Scroll distance = exactly how far the track overflows, so speed feels 1:1.
 *
 * Mobile (≤768px) & prefers-reduced-motion: NO pin, NO GSAP — the track is a
 * native horizontal scroller with CSS scroll-snap (see h-scroll.css).
 * Touch scrub-pinning feels hijacked and mobile browser UI bars make
 * pin-spacing fragile; native swipe is the correct gesture there.
 *
 * Requires : gsap + ScrollTrigger registered.
 *
 * All behaviour is data-attribute driven — DOM contract below.
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /** Parse a numeric data-attribute with a fallback. */
  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Initializes every pinned h-scroll section on the page.
   *
   * Root element  [data-hscroll] supports:
   *   data-hscroll-scrub     scrub lag in seconds           (default 0.5)
   *   data-hscroll-speed     scroll-distance multiplier —
   *                          >1 slower/longer, <1 faster    (default 1)
   *   data-hscroll-snap      snap to cards "true"/"false"   (default true)
   *   data-hscroll-bp        mobile breakpoint in px        (default 768)
   *   data-hscroll-priority  ScrollTrigger refreshPriority — set per page
   *                          position (see PROJECT.md table) (default 1)
   *
   * Children:
   *   [data-hscroll-track]   the flex row that translates on x
   *   [data-hscroll-card]    a card inside the track (6 expected, any count works)
   *
   * @param {string} [selector="[data-hscroll]"]
   */
  function initHScroll(selector) {
    var roots = document.querySelectorAll(selector || "[data-hscroll]");
    if (!roots.length) { console.warn("[Sestek HScroll] No [data-hscroll] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek HScroll] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    roots.forEach(setup);
  }

  function setup(root) {
    if (root._hScrollInit) return;                        // idempotent — no duplicate triggers
    root._hScrollInit = true;

    var track = root.querySelector("[data-hscroll-track]");
    var cards = Array.from(root.querySelectorAll("[data-hscroll-card]"));
    if (!track || !cards.length) {
      console.warn("[Sestek HScroll] Need [data-hscroll-track] with [data-hscroll-card] children.");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var scrub    = num(root, "data-hscroll-scrub", 0.5);
    var speed    = num(root, "data-hscroll-speed", 1);
    var snapOn   = root.getAttribute("data-hscroll-snap") !== "false";
    var bp       = num(root, "data-hscroll-bp", 768);
    var priority = num(root, "data-hscroll-priority", 1);

    /** Horizontal overflow in px — how far the track must translate. */
    function getDistance() {
      return Math.max(0, track.scrollWidth - root.clientWidth);
    }

    /** Toggle .is-active on the card nearest the current progress. */
    var curActive = -1;
    function setActive(idx) {
      if (idx === curActive) return;
      curActive = idx;
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle("is-active", i === idx);
      }
    }

    // Desktop only + motion allowed. Below the breakpoint (or reduced motion)
    // NOTHING is built — h-scroll.css turns the track into a native
    // scroll-snap scroller, so there is no trigger to manage there.
    var mm = gsap.matchMedia();
    mm.add(
      "(min-width: " + (bp + 1) + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        if (getDistance() <= 0) return;                   // track fits — nothing to scroll

        // Snap targets = each card's left edge as progress 0..1.
        // Recomputed on every refresh so resize/font-load stays accurate.
        var snapPts = [0];
        function computeSnapPts() {
          var d = getDistance();
          if (d <= 0) return;
          snapPts = cards.map(function (c) {
            return Math.min(1, Math.max(0, c.offsetLeft / d));
          });
        }

        function snapResolver(value) {
          var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
          for (var i = 1; i < snapPts.length; i++) {
            var d = Math.abs(value - snapPts[i]);
            if (d < bestD) { bestD = d; best = snapPts[i]; }
          }
          return best;
        }

        root.classList.add("is-pinned");

        var tween = gsap.to(track, {
          x: function () { return -getDistance(); },
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            // Pin distance mirrors the real overflow → 1px vertical = 1px
            // horizontal at speed 1. `speed` stretches/compresses that feel.
            end: function () { return "+=" + getDistance() * speed; },
            pin: true,
            scrub: scrub,
            anticipatePin: 0,
            // Function-based x/end must re-resolve when metrics change.
            invalidateOnRefresh: true,
            // Pin adds pin-spacing to the document — refresh before triggers
            // below this section (see PROJECT.md refreshPriority table).
            refreshPriority: priority,
            onRefresh: computeSnapPts,
            snap: snapOn ? {
              snapTo: snapResolver,
              // min ≥ scrub: scrub lag settles inside the snap window.
              duration: { min: 0.55, max: 0.9 },
              ease: "power2.inOut",
              delay: 0.12,
              directional: false,
            } : false,
            onUpdate: function (self) {
              // Nearest snap point = the card considered "in view".
              var idx = snapPts.indexOf(snapResolver(self.progress));
              setActive(idx < 0 ? 0 : idx);
            },
            onLeaveBack: function () { setActive(0); },
          },
        });

        setActive(0);

        // matchMedia cleanup — fires when dropping below the breakpoint or
        // when reduced-motion flips on: kill the pin, hand back to native CSS.
        return function () {
          tween.scrollTrigger && tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          root.classList.remove("is-pinned");
          curActive = -1;
        };
      }
    );
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHScroll = initHScroll;

})(typeof window !== "undefined" ? window : this);
