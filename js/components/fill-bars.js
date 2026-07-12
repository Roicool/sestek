/*!
 * fill-bars.js v1.1.0
 * Pinned, scroll-driven "fill bars" section (Attio/Retool-style):
 *   • The section pins.
 *   • A left-column list of items each carry a thin progress bar. As you scroll,
 *     the active item's bar fills 0→100%; when full the next item takes over.
 *   • A right-column visual (diagram / mockup) stays put the whole time and is
 *     NEVER clipped or transformed — see the "visual is untouchable" notes below
 *     and fill-bars.css (no overflow:hidden on the visual column).
 *
 * Bars are driven with scaleX (transform, GPU-composited) — zero layout thrash,
 * 60fps. The list is fully data-attribute driven; design lives in Webflow.
 *
 * Mobile (≤768px): SAME pinned scroll animation. The visual sits above the list
 * (CSS stacks the grid to one column); nothing is hidden, bars still fill.
 *
 * Items are clickable (smooth-scroll to their segment) and the timeline snaps
 * to each item's centre.
 *
 * Requires : gsap + ScrollTrigger registered.
 * Optional : Lenis (Sestek.scrollTo) for click navigation; falls back to native.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-fill-bars]                    root / section
 *     [data-fbar-inner]                 the element that PINS (holds list+visual)
 *       [data-fbar-list]                LEFT column — the item list
 *         [data-fbar-item="0"]          one row — clickable; gets .is-active
 *           [data-fbar-track]             the bar rail
 *             [data-fbar-fill]            the fill (scaleX 0→1) — required
 *         [data-fbar-item="1"]          …
 *       [data-fbar-visual]              RIGHT column — the visual stage; never clipped
 *         [data-fbar-visual-base]         optional fixed background (always shown)
 *         [data-fbar-vis="0"]             per-item visual — crossfades in when its
 *         [data-fbar-vis="1"]             item is active (index matches the item)
 *
 * Root attributes (all optional):
 *   data-fbar-end     pin scroll distance         (default "300%")
 *   data-fbar-scrub   scrub lag in seconds        (default 0.6)
 *   data-fbar-snap    snap to items "true"/"false"(default true)
 *   data-fbar-ease    ease for each bar fill      (default "none")
 *
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
   * Initializes a pinned scroll-driven fill-bars section.
   * @param {string} [selector="[data-fill-bars]"]
   */
  function initFillBars(selector) {
    var root = document.querySelector(selector || "[data-fill-bars]");
    if (!root) { console.warn("[Sestek FillBars] No [data-fill-bars] found."); return; }
    if (root._fillBarsInit) return;                        // idempotent — no duplicate triggers
    root._fillBarsInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek FillBars] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var items = Array.from(root.querySelectorAll("[data-fbar-item]"));
    var fills = items.map(function (it) { return it.querySelector("[data-fbar-fill]"); });
    // Per-item visuals (optional). Indexed by data-fbar-vis; the active item's
    // visual crossfades in over the fixed [data-fbar-visual-base] background.
    var visuals = Array.from(root.querySelectorAll("[data-fbar-vis]"));

    var n = items.length;
    if (!n || fills.some(function (f) { return !f; })) {
      console.warn("[Sestek FillBars] Need [data-fbar-item] rows each with a [data-fbar-fill].");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist = root.getAttribute("data-fbar-end") || "300%";
    var scrub   = num(root, "data-fbar-scrub", 0.6);
    var snapOn  = root.getAttribute("data-fbar-snap") !== "false";
    var ease    = root.getAttribute("data-fbar-ease") || "none";

    var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Shared state ──────────────────────────────────────────────
    var activeST    = null;
    var totalUnits  = n;      // one unit per item
    var clickTarget = null;   // forces snapResolver during a click scroll
    var clickTimer  = null;
    var curActive   = -1;     // last applied active index (avoids redundant work)

    // Snap targets = each item's fill CENTRE (progress 0..1).
    var snapPts = [];
    for (var s = 0; s < n; s++) snapPts.push((s + 0.5) / totalUnits);

    /** Nearest snap point, or the click target while a jump is in flight. */
    function snapResolver(value) {
      if (clickTarget != null) return clickTarget;
      var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
      for (var i = 1; i < snapPts.length; i++) {
        var d = Math.abs(value - snapPts[i]);
        if (d < bestD) { bestD = d; best = snapPts[i]; }
      }
      return best;
    }

    /** Toggle the active item (only when it actually changes). */
    function setActive(idx) {
      if (idx === curActive) return;
      curActive = idx;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
      }
      // Swap the matching visual (CSS crossfades it in over the fixed base).
      for (var v = 0; v < visuals.length; v++) {
        visuals[v].classList.toggle("is-active", v === idx);
      }
    }

    // Reduced-motion: static — first item active + full, no scroll animation.
    if (reduce) { buildStatic(); wireClicks(); return; }

    // ── Build the pinned scroll-driven timeline ───────────────────
    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      gsap.set(fills, { scaleX: 0, transformOrigin: "left center" });
      curActive = -1;
      setActive(0);

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + endDist,
          pin: "[data-fbar-inner]",
          scrub: scrub,
          anticipatePin: 0,
          // Pins add pin-spacing to the document. Refresh this BEFORE any trigger
          // below it (e.g. [data-reveal]) so those resolve their start/end against
          // the post-pin document height. See docs/PROJECT.md → refreshPriority.
          refreshPriority: 1,
          snap: snapOn ? {
            snapTo: snapResolver,
            duration: { min: 0.4, max: 0.8 },
            ease: "power2.inOut",
            delay: 0.1,
            directional: false,
          } : false,
          onUpdate: function (self) {
            // Active item = whichever unit the playhead sits in.
            var idx = Math.min(n - 1, Math.floor(self.progress * totalUnits));
            setActive(idx);
          },
          onLeaveBack: function () { setActive(0); },
        },
      });

      // One unit per bar: fill i runs across the i-th unit of the timeline.
      for (var j = 0; j < n; j++) {
        tl.to(fills[j], { scaleX: 1, ease: ease, duration: 1 }, j);
      }

      activeST = tl.scrollTrigger;
    }

    /** Click an item → smooth-scroll to its fill-centre (= exact snap point). */
    function jumpTo(idx) {
      if (!activeST) return;
      var st = activeST;
      var progress = (idx + 0.5) / totalUnits;
      var y = st.start + (st.end - st.start) * progress;

      // Lock the snap resolver to this target so snap agrees with the click.
      clickTarget = progress;
      if (clickTimer) clearTimeout(clickTimer);

      var dur = 1.0;
      if (typeof Sestek !== "undefined" && typeof Sestek.scrollTo === "function" && global.lenisInstance) {
        Sestek.scrollTo(y, {
          duration: dur,
          easing: function (t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; },
        });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      clickTimer = setTimeout(function () { clickTarget = null; }, dur * 1000 + 120);
    }

    function wireClicks() {
      items.forEach(function (item, i) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () { jumpTo(i); });
      });
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      root.classList.add("is-static");
      gsap.set(fills, { scaleX: 1, transformOrigin: "left center" });
      setActive(0);
      // In static mode a click just marks the item active (no scroll timeline).
      items.forEach(function (item, i) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () { setActive(i); });
      });
    }

    build();
    wireClicks();

    // Rebuild on resize — after rebuild the pin's spacing changes, shifting the
    // absolute start/end of every trigger below it; refresh them all so they
    // re-measure against the new document height.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFillBars = initFillBars;

})(typeof window !== "undefined" ? window : this);
