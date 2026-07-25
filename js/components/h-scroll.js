/*!
 * h-scroll.js v2.0.0
 * Pinned horizontal-scroll card section:
 *   Desktop (≥992px) — section pins, vertical scroll drives the card track to
 *   the LEFT (content moves right-to-left, reading direction feels "scroll
 *   right"). Scroll distance = exactly how far the track overflows, so speed
 *   feels 1:1. Gutter-aware: padding-inline on the track OR its wrapper (e.g.
 *   the container-aligned gutter in h-scroll.css) is measured, so the scroll
 *   always ends with the last card fully inside the gutter.
 *
 *   Tablet & mobile (≤991px) — the SAME DOM becomes a Swiper carousel:
 *   ~2.2 cards per view on tablet, ~1.2 on mobile (partial-card bleed).
 *   Gutter + gap are read from the computed CSS (RC tokens), so spacing stays
 *   token-driven. Swiper's own stylesheet is NOT needed — the required core
 *   styles ship inside h-scroll.css under .is-swiper.
 *
 *   If Swiper is not loaded, the CSS scroll-snap fallback in h-scroll.css
 *   takes over with the same bleed widths — nothing breaks.
 *
 * prefers-reduced-motion: desktop → no pin, native scroller (CSS); tablet &
 * mobile → Swiper with speed 0 (instant, no animated snapping).
 *
 * Requires : gsap + ScrollTrigger registered.
 *            Swiper 11 (swiper-bundle) for the tablet/mobile carousel —
 *            optional; CSS fallback covers its absence.
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
   * Initializes every h-scroll section on the page.
   *
   * Root element  [data-hscroll] supports:
   *   data-hscroll-scrub     scrub lag in seconds           (default 0.5)
   *   data-hscroll-speed     scroll-distance multiplier —
   *                          >1 slower/longer, <1 faster    (default 1)
   *   data-hscroll-snap      snap to cards "true"/"false"   (default true)
   *   data-hscroll-bp        pin breakpoint in px — at/below this width the
   *                          Swiper carousel takes over. Keep in sync with
   *                          the 991px media queries in h-scroll.css
   *                                                         (default 991)
   *   data-hscroll-bp-m      mobile breakpoint in px — below this width the
   *                          mobile slidesPerView applies   (default 768)
   *   data-hscroll-spv-t     slides per view on tablet      (default 2.2)
   *   data-hscroll-spv-m     slides per view on mobile      (default 1.2)
   *   data-hscroll-priority  ScrollTrigger refreshPriority — set per page
   *                          position (see PROJECT.md table) (default 1)
   *
   * Children:
   *   .hscroll__viewport     wrapper around the track (Swiper container)
   *   [data-hscroll-track]   the flex row that translates on x
   *   [data-hscroll-card]    a card inside the track (any count works)
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
    var viewport = track.parentElement || root;           // .hscroll__viewport

    // ── Config from data-attributes ───────────────────────────────
    var scrub    = num(root, "data-hscroll-scrub", 0.5);
    var speed    = num(root, "data-hscroll-speed", 1);
    var snapOn   = root.getAttribute("data-hscroll-snap") !== "false";
    var bp       = num(root, "data-hscroll-bp", 991);
    var bpM      = num(root, "data-hscroll-bp-m", 768);
    var spvT     = num(root, "data-hscroll-spv-t", 2.2);
    var spvM     = num(root, "data-hscroll-spv-m", 1.2);
    var priority = num(root, "data-hscroll-priority", 1);

    /**
     * Horizontal overflow in px — how far the track must translate.
     * Measured against the track's PARENT content box (clientWidth minus its
     * inline padding), not the section width: a container-aligned gutter like
     *   padding-inline: max(1.5rem, calc((100% - var(--container--2xl)) / 2))
     * can live on the track or on the viewport wrapper — either way the
     * distance lands the last card fully in view, inside the right gutter.
     */
    function getDistance() {
      var parent = track.parentElement || root;
      var cs = getComputedStyle(parent);
      var content = parent.clientWidth
        - (parseFloat(cs.paddingLeft) || 0)
        - (parseFloat(cs.paddingRight) || 0);
      return Math.max(0, track.scrollWidth - content);
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

    var mm = gsap.matchMedia();

    // ── Tablet & mobile (≤bp) — Swiper carousel ───────────────────
    mm.add("(max-width: " + bp + "px)", function () {
      // Mirror the configured slidesPerView into the CSS fallback widths so
      // the no-Swiper scroll-snap fallback shows the same bleed.
      root.style.setProperty("--hscroll-spv-t", String(spvT));
      root.style.setProperty("--hscroll-spv-m", String(spvM));

      if (typeof Swiper === "undefined") {
        console.warn("[Sestek HScroll] Swiper not found — CSS scroll-snap fallback active.");
        return;
      }

      /**
       * Gutter + gap in px, resolved from the token-driven CSS. .is-swiper
       * zeroes both (Swiper owns spacing), so drop the class for one sync
       * style read — no paint happens in between.
       */
      function measure() {
        root.classList.remove("is-swiper");
        var cs = getComputedStyle(track);
        var m = {
          gap:    parseFloat(cs.columnGap)   || 0,
          gutter: parseFloat(cs.paddingLeft) || 0,
        };
        root.classList.add("is-swiper");
        return m;
      }

      var m = measure();                                  // ends with .is-swiper set
      viewport.classList.add("swiper");
      track.classList.add("swiper-wrapper");
      cards.forEach(function (c) { c.classList.add("swiper-slide"); });

      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var breakpoints = {};
      breakpoints[bpM] = { slidesPerView: spvT };         // ≥bpM → tablet spv

      var sw = new Swiper(viewport, {
        slidesPerView: spvM,                              // <bpM → mobile spv
        spaceBetween: m.gap,
        slidesOffsetBefore: m.gutter,
        slidesOffsetAfter: m.gutter,
        breakpoints: breakpoints,
        speed: reduced ? 0 : 400,
        grabCursor: true,
        watchOverflow: true,
        keyboard: { enabled: true, onlyInViewport: true },
        on: {
          activeIndexChange: function (s) { setActive(s.activeIndex); },
          resize: function (s) {
            // Tokens are fluid clamp()s — re-resolve px on resize. Write to
            // originalParams too so breakpoint re-application keeps them.
            var r = measure();
            s.params.spaceBetween = s.originalParams.spaceBetween = r.gap;
            s.params.slidesOffsetBefore = s.originalParams.slidesOffsetBefore = r.gutter;
            s.params.slidesOffsetAfter  = s.originalParams.slidesOffsetAfter  = r.gutter;
            s.update();
          },
        },
      });

      setActive(0);

      // matchMedia cleanup — crossing above the breakpoint: tear Swiper down
      // and hand the untouched DOM back to the pin setup below.
      return function () {
        sw.destroy(true, true);                           // true,true → inline styles cleaned
        root.classList.remove("is-swiper");
        viewport.classList.remove("swiper");
        track.classList.remove("swiper-wrapper");
        cards.forEach(function (c) { c.classList.remove("swiper-slide", "is-active"); });
        curActive = -1;
      };
    });

    // ── Desktop (>bp) + motion allowed — GSAP pin + scrub ─────────
    mm.add(
      "(min-width: " + (bp + 1) + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        if (getDistance() <= 0) return;                   // track fits — nothing to scroll

        // Snap targets = each card's left edge as progress 0..1, measured
        // RELATIVE to the first card so the gutter/padding cancels out.
        // Recomputed on every refresh so resize/font-load stays accurate.
        var snapPts = [0];
        function computeSnapPts() {
          var d = getDistance();
          if (d <= 0) return;
          var base = cards[0].offsetLeft;
          snapPts = cards.map(function (c) {
            return Math.min(1, Math.max(0, (c.offsetLeft - base) / d));
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
        // when reduced-motion flips on: kill the pin, hand back to CSS/Swiper.
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
