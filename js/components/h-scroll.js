/*!
 * h-scroll.js v2.2.4
 *
 * Changelog
 * v2.2.4 — whole-card slidesPerView keeps the right gutter inside the visible
 *          band (cards ran flush right on every slide but the last); mobile
 *          default 1 → 1.1 (a peek of the next card).
 * v2.2.3 — one dot per CARD (Swiper's pagination module renders one per snap
 *          point, so 3 cards got 4 dots); left/right gutter measured
 *          separately so an asymmetric viewport padding no longer leaves the
 *          last card flush against the right edge.
 * v2.2.2 — no more double gutter: a Designer padding on .hscroll__viewport is
 *          already the gutter (Swiper sizes inside it), so slidesOffset only
 *          tops it up to the track gutter instead of adding on top. Mobile
 *          default 1.2 → 1 card (the arrows/dots say there is more).
 * v2.2.1 — the computed slide width is written INLINE on every card (width,
 *          min/max-width, flex-basis) — an inline value outranks any Designer
 *          class or combo, so Swiper's width always wins. The CSS no longer
 *          forces the card's inner layout (grid/flex stays the Designer's).
 * v2.2.0 — carousel controls: arrows + pagination dots are built and wired by
 *          the JS in Swiper mode (data-hscroll-nav="false" to opt out, or
 *          supply [data-hscroll-prev] / [data-hscroll-next] /
 *          [data-hscroll-dots] yourself). Pairs with h-scroll.css v2.4.0,
 *          which also forces the card into a single column while Swiper
 *          drives it — a 12-col Designer grid could not fit a ~300px slide,
 *          overflowed onto the next card and hid the peek.
 * v2.1.1 — slide width is computed against the viewport's CONTENT box (minus
 *          its own padding), the same box Swiper sizes against, so a Designer
 *          padding on .hscroll__viewport no longer makes the cards too wide.
 * v2.1.0 — Swiper now OWNS the card width on tablet/mobile: the slide width is
 *          computed from the real viewport, gutter and gap ((content − gutter
 *          − visible gaps) / slidesPerView) and handed to Swiper as
 *          slidesPerView:"auto" via --hscroll-slide-w, so the Designer's
 *          desktop card width, min/max-width or flex-basis can no longer leak
 *          into the carousel and the bleed is exactly what the attribute says.
 *          Tablet default 2.2 → 1.4 cards. Touch devices take the Swiper path
 *          regardless of width (iPad landscape used to get the desktop pin +
 *          scrub); the pin now needs hover:hover + pointer:fine. Height-only
 *          resizes (iOS URL bar) no longer re-measure / re-snap the carousel.
 *
 * Pinned horizontal-scroll card section:
 *   Desktop (≥992px) — section pins, vertical scroll drives the card track to
 *   the LEFT (content moves right-to-left, reading direction feels "scroll
 *   right"). Scroll distance = exactly how far the track overflows, so speed
 *   feels 1:1. Gutter-aware: padding-inline on the track OR its wrapper (e.g.
 *   the container-aligned gutter in h-scroll.css) is measured, so the scroll
 *   always ends with the last card fully inside the gutter.
 *
 *   Tablet & mobile (≤991px) or ANY touch device — the SAME DOM becomes a
 *   Swiper carousel: ~1.4 cards per view on tablet, ~1.1 on mobile (peek).
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
   *   data-hscroll-spv-t     slides per view on tablet      (default 1.4)
   *   data-hscroll-spv-m     slides per view on mobile      (default 1.1)
   *   data-hscroll-priority  ScrollTrigger refreshPriority — set per page
   *                          position (see PROJECT.md table) (default 1)
   *   data-hscroll-nav       "false" → no auto arrows/dots in Swiper mode
   *                                                         (default on)
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
    var spvT     = num(root, "data-hscroll-spv-t", 1.4);
    var spvM     = num(root, "data-hscroll-spv-m", 1.1);
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

    // ── Tablet & mobile (≤bp) or any touch device — Swiper carousel ──
    // A touch-only device wider than the breakpoint (iPad landscape, iPad
    // Pro) belongs here too: a pinned scrub on iOS fights the URL-bar resize
    // and the rubber-band. The pin below needs a real pointer.
    mm.add("(max-width: " + bp + "px), (hover: none)", function () {
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
        var vs = getComputedStyle(viewport);
        // The viewport's own inline padding already acts as a gutter (Swiper
        // sizes inside it and the peek shows through it), so the track
        // gutter only tops it up — otherwise the first card sat behind a
        // DOUBLE gutter (viewport padding + slidesOffsetBefore).
        // Left and right measured SEPARATELY: a Designer padding that only
        // exists on one side (or differs) must not leave the other edge with
        // no gutter — the last card used to run flush to the right edge.
        var padL    = parseFloat(vs.paddingLeft)  || 0;
        var padR    = parseFloat(vs.paddingRight) || 0;
        var gutterL = parseFloat(cs.paddingLeft)  || 0;
        var gutterR = parseFloat(cs.paddingRight) || gutterL;
        var m = {
          gap:     parseFloat(cs.columnGap) || 0,
          gutter:  Math.max(0, gutterL - padL),
          gutterR: Math.max(0, gutterR - padR),
        };
        root.classList.add("is-swiper");
        return m;
      }

      /**
       * Swiper OWNS the card width. Swiper's fractional slidesPerView divides
       * the whole container, ignoring slidesOffsetBefore, so "1.4 cards"
       * came out as ~1.2 once the gutter was in. Computed here instead:
       *   slide = (content − gutter − visibleGaps · gap) / spv
       * where the first card starts after the gutter and ceil(spv)−1 gaps
       * are on screen. Written as --hscroll-slide-w; the CSS applies it to
       * .is-swiper .hscroll__card and Swiper reads it via slidesPerView:"auto"
       * — the Designer's desktop width, min/max-width or flex-basis can no
       * longer leak into the carousel.
       */
      function slideWidth(m) {
        var spv  = window.innerWidth < bpM ? spvM : spvT;
        var gaps = Math.max(0, Math.ceil(spv) - 1);
        // Swiper's own size is the container's CONTENT box (clientWidth minus
        // its inline padding) — measure the same box, or a Designer padding
        // on the viewport makes the slides wider than the room they have.
        var vs = getComputedStyle(viewport);
        var content = viewport.clientWidth
          - (parseFloat(vs.paddingLeft)  || 0)
          - (parseFloat(vs.paddingRight) || 0);
        // Whole cards (spv 1, 2…) show no peek, so the RIGHT gutter must be
        // part of the visible band too — otherwise the active card ran flush
        // to the right edge on every slide but the last. With a fractional
        // spv the next card's peek reaches the edge by design.
        var whole = Math.abs(spv - Math.round(spv)) < 0.001;
        var right = whole ? m.gutterR : 0;
        var w    = (content - m.gutter - right - gaps * m.gap) / spv;
        w = Math.max(0, Math.floor(w * 100) / 100);
        root.style.setProperty("--hscroll-slide-w", w + "px");
        // Written INLINE on every card, not only as a custom property: an
        // inline width outranks any Designer class/combo on the card, so the
        // slide is exactly this wide no matter what the card's own CSS says.
        var px = w + "px";
        cards.forEach(function (c) {
          c.style.width = px; c.style.minWidth = px; c.style.maxWidth = px;
          c.style.flex = "0 0 " + px;
        });
        return w;
      }

      var m = measure();                                  // ends with .is-swiper set
      slideWidth(m);
      viewport.classList.add("swiper");
      track.classList.add("swiper-wrapper");
      cards.forEach(function (c) { c.classList.add("swiper-slide"); });

      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var lastW   = window.innerWidth;

      /*
       * Controls — arrows + dots, built by the JS so the carousel reads as
       * one (a lone card with nothing peeking gave no hint there was more).
       * Injected right after the viewport, styled by h-scroll.css
       * (.hscroll__nav / __dots / __dot / __arrows / __arrow). Opt out with
       * data-hscroll-nav="false"; bring your own with [data-hscroll-prev],
       * [data-hscroll-next], [data-hscroll-dots] anywhere inside the root.
       */
      var navEl = null, prevEl, nextEl, dotsEl;
      if (root.getAttribute("data-hscroll-nav") !== "false") {
        prevEl = root.querySelector("[data-hscroll-prev]");
        nextEl = root.querySelector("[data-hscroll-next]");
        dotsEl = root.querySelector("[data-hscroll-dots]");
        if (!prevEl || !nextEl || !dotsEl) {
          navEl = document.createElement("div");
          navEl.className = "hscroll__nav";
          navEl.setAttribute("data-hscroll-nav-auto", "");
          var chevron = function (dir) {
            return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
              '<path d="' + (dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7") +
              '" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          };
          navEl.innerHTML =
            '<div class="hscroll__dots" data-hscroll-dots></div>' +
            '<div class="hscroll__arrows">' +
              '<button type="button" class="hscroll__arrow hscroll__arrow--prev" ' +
                'data-hscroll-prev aria-label="Previous">' + chevron(-1) + '</button>' +
              '<button type="button" class="hscroll__arrow hscroll__arrow--next" ' +
                'data-hscroll-next aria-label="Next">' + chevron(1) + '</button>' +
            '</div>';
          viewport.insertAdjacentElement("afterend", navEl);
          prevEl = prevEl || navEl.querySelector("[data-hscroll-prev]");
          nextEl = nextEl || navEl.querySelector("[data-hscroll-next]");
          dotsEl = dotsEl || navEl.querySelector("[data-hscroll-dots]");
        }
      }

      var sw = new Swiper(viewport, {
        slidesPerView: "auto",                            // width from --hscroll-slide-w
        spaceBetween: m.gap,
        slidesOffsetBefore: m.gutter,
        slidesOffsetAfter: m.gutterR,
        speed: reduced ? 0 : 400,
        grabCursor: true,
        watchOverflow: true,
        keyboard: { enabled: true, onlyInViewport: true },
        navigation: prevEl && nextEl ? {
          prevEl: prevEl, nextEl: nextEl,
          disabledClass: "is-disabled", lockClass: "is-locked",
        } : false,
        // Dots are OURS, not Swiper's pagination module: that one renders a
        // bullet per SNAP POINT, and the trailing snap (last card + right
        // gutter) gave 4 dots for 3 cards. One dot per card, always.
        on: {
          activeIndexChange: function (s) { setActive(cardIndex(s)); },
          resize: function (s) {
            // iOS fires resize on every URL-bar show/hide while the page
            // scrolls — a height-only change. Re-measuring + update() there
            // re-snapped the carousel under the user's finger. Width only.
            if (window.innerWidth === lastW) return;
            lastW = window.innerWidth;
            // Tokens are fluid clamp()s — re-resolve px on a real resize.
            var r = measure();
            slideWidth(r);
            s.params.spaceBetween = s.originalParams.spaceBetween = r.gap;
            s.params.slidesOffsetBefore = s.originalParams.slidesOffsetBefore = r.gutter;
            s.params.slidesOffsetAfter  = s.originalParams.slidesOffsetAfter  = r.gutterR;
            s.update();
          },
        },
      });

      /** Card index for the current position, clamped to the real cards. */
      function cardIndex(s) {
        var i = s.activeIndex;
        if (s.isEnd) i = cards.length - 1;                 // trailing snap → last card
        return Math.max(0, Math.min(cards.length - 1, i));
      }

      // One dot per card, kept in sync with setActive.
      var dots = [];
      if (dotsEl) {
        dotsEl.innerHTML = "";
        dots = cards.map(function (_, i) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "hscroll__dot";
          b.setAttribute("aria-label", (i + 1) + " / " + cards.length);
          b.addEventListener("click", function () { sw.slideTo(i); });
          dotsEl.appendChild(b);
          return b;
        });
        if (cards.length < 2) dotsEl.classList.add("is-locked");
      }
      var _setActive = setActive;
      setActive = function (idx) {
        _setActive(idx);
        for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("is-active", i === idx);
      };

      setActive(0);

      // matchMedia cleanup — crossing above the breakpoint: tear Swiper down
      // and hand the untouched DOM back to the pin setup below.
      return function () {
        sw.destroy(true, true);                           // true,true → inline styles cleaned
        setActive = _setActive;
        if (dotsEl) dotsEl.innerHTML = "";
        if (navEl && navEl.parentNode) navEl.parentNode.removeChild(navEl);
        root.classList.remove("is-swiper");
        root.style.removeProperty("--hscroll-slide-w");
        viewport.classList.remove("swiper");
        track.classList.remove("swiper-wrapper");
        cards.forEach(function (c) {
          c.classList.remove("swiper-slide", "is-active");
          c.style.width = c.style.minWidth = c.style.maxWidth = c.style.flex = "";
        });
        curActive = -1;
      };
    });

    // ── Desktop (>bp) + real pointer + motion allowed — GSAP pin + scrub ──
    mm.add(
      "(min-width: " + (bp + 1) + "px) and (hover: hover) and (pointer: fine)" +
      " and (prefers-reduced-motion: no-preference)",
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
