/*!
 * scroll-stack.js v2.0.0
 * Pinned, scroll-driven vertical card list:
 *   • LEFT  — a persistent list of items; the active one expands (its body
 *     grows height 0→auto via Sestek.heightReveal) while the rest stay
 *     collapsed and dimmed (.is-active toggled for Designer to style).
 *   • RIGHT — cards sit in NORMAL DOCUMENT FLOW, stacked one below another
 *     inside [data-sstack-track]. The stage is a SQUARE (its own width) but
 *     its clipped window is a little TALLER (data-sstack-peek) so the top edge
 *     of the next card peeks in below the active one — you see it coming up
 *     from the bottom, not a boxed-in single card. Advancing the active index
 *     shifts the WHOLE track up by one square (a real vertical list scroll)
 *     while the leaving card tips back in 3D + shrinks (EXIT) and the incoming
 *     card eases up from a shrunk pose to flat+full (ENTER) — minimal in/out
 *     motion, no position:absolute, no overlapping boxes. Scrolling back
 *     reverses the exact same tween — no manual reverse logic needed.
 *
 * Items are clickable (smooth-scroll to their dwell-centre) and the
 * timeline snaps, same UX as scroll-tabs.js.
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.heightReveal and
 *            Sestek.util (js/core/utils.js) already loaded.
 * Optional : Lenis (Sestek.scrollTo) for click navigation; falls back to
 *            native window.scrollTo.
 * CSS      : css/components/scroll-stack.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-scroll-stack]                 root
 *     [data-sstack-list]                LEFT column (optional wrapper)
 *       [data-sstack-item="0"]          one row — ALWAYS visible (title etc.)
 *         [data-sstack-body]            the part that expands/collapses
 *       [data-sstack-item="1"]          …
 *     [data-sstack-stage]               RIGHT column — the clipped viewport.
 *                                       JS sizes it to a square (its own width)
 *                                       + peek; CSS just needs overflow:hidden
 *                                       + position:relative on it.
 *       [data-sstack-track]             wraps the cards — normal flow, this
 *                                       is what physically translates
 *         [data-sstack-card="0"]        one card, normal-flow — index must
 *                                       match its [data-sstack-item]. Content
 *                                       is yours (image, or a <video> below)
 *         [data-sstack-card="1"]        …
 *
 * Video cards (optional, per card):
 *   [data-sstack-video]               a <video muted loop playsinline> — only
 *                                     the ACTIVE card's video plays; every
 *                                     other card's video is paused, so at most
 *                                     one plays at a time (perf + no stacked
 *                                     background audio).
 *   [data-sstack-controls]            wrapper for the hover controls below —
 *                                     CSS shows it on card hover, JS wires it
 *   [data-sstack-toggle-play]         button — play/pause the card's video
 *   [data-sstack-restart]             button — restart the card's video (t=0)
 *   [data-sstack-toggle-mute]         button — mute/unmute the card's video
 *   Card gets .is-paused / .is-muted classes so Designer can swap icon state.
 *
 * Root attributes (all optional):
 *   data-sstack-end          pin scroll distance             (default "400%")
 *   data-sstack-scrub        scrub lag in seconds             (default 0.5)
 *   data-sstack-dwell        per-item hold length, in "units" (default 1.5)
 *   data-sstack-transition   per-swap length, in "units"      (default 1)
 *   data-sstack-text-duration  left-side open/close length, in "units",
 *                            independent of the card swap speed above (default 1.6)
 *   data-sstack-snap         "false" to disable snap-to-item  (default true)
 *   data-sstack-ease         ease for every swap              (default "power2.inOut")
 *   data-sstack-exit-tilt    rotateX degrees the leaving card tips back to,
 *                            as it slides out through the top (default 22)
 *   data-sstack-perspective  px depth of the 3D perspective on the stage (default 1200)
 *   data-sstack-peek         px of the NEXT card's top edge left visible below
 *                            the active square card, inside the stage window —
 *                            so you see it coming from the bottom, not a boxed-
 *                            in single card (default 88; "0" = fully clipped)
 *   data-sstack-scale        size a card rests at before it enters / after it
 *                            leaves; it eases to 1 as it becomes active (the
 *                            minimal enter/exit depth cue — default 0.92)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function initScrollStack(selector) {
    var root = document.querySelector(selector || "[data-scroll-stack]");
    if (!root) { console.warn("[Sestek ScrollStack] No [data-scroll-stack] found."); return; }
    if (root._scrollStackInit) return;
    root._scrollStackInit = true;

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ScrollStack] GSAP + ScrollTrigger required."); return;
    }
    if (typeof Sestek === "undefined" || typeof Sestek.heightReveal !== "function") {
      console.error("[Sestek ScrollStack] Sestek.heightReveal required (load height-reveal.js)."); return;
    }
    if (typeof Sestek.util === "undefined") {
      console.error("[Sestek ScrollStack] Sestek.util required (load js/core/utils.js)."); return;
    }

    gsap.registerPlugin(ScrollTrigger);
    var num = Sestek.util.attrNum;

    var items  = Array.from(root.querySelectorAll("[data-sstack-item]"));
    var bodies = Array.from(root.querySelectorAll("[data-sstack-body]"));
    var stage  = root.querySelector("[data-sstack-stage]");
    var track  = root.querySelector("[data-sstack-track]");
    var cards  = Array.from(root.querySelectorAll("[data-sstack-card]"));

    var n = items.length;
    if (n < 2 || cards.length !== n || bodies.length !== n) {
      console.warn("[Sestek ScrollStack] Need >=2 matching [data-sstack-item]/[data-sstack-body]/[data-sstack-card].");
      return;
    }
    if (!stage || !track) {
      console.warn("[Sestek ScrollStack] [data-sstack-stage] and [data-sstack-track] are both required."); return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist      = root.getAttribute("data-sstack-end") || "400%";
    var scrub        = num(root, "data-sstack-scrub", 0.5);
    var dwell        = num(root, "data-sstack-dwell", 1.5);
    var transition   = num(root, "data-sstack-transition", 1);
    var textDuration = num(root, "data-sstack-text-duration", 1.6);
    var snapOn       = root.getAttribute("data-sstack-snap") !== "false";
    var ease         = root.getAttribute("data-sstack-ease") || "power2.inOut";
    var exitTilt     = num(root, "data-sstack-exit-tilt", 22);
    var perspective  = num(root, "data-sstack-perspective", 1200);
    var peek         = num(root, "data-sstack-peek", 88);
    var enterScale   = num(root, "data-sstack-scale", 0.92);

    var reduce = Sestek.util.prefersReducedMotion();

    stage.style.perspective = perspective + "px";

    /**
     * The stage is a SQUARE sized to its own width, but its clipped window is
     * `peek` px TALLER than that square — so below the active card you can see
     * the top edge of the next card rising into place, inside the same section
     * (not a boxed-in single card). One card == one square; the track shifts by
     * exactly one square per step. Called on build + resize; returns the square
     * side, which is also the per-step shift distance.
     */
    function layoutSquare() {
      var size = Math.round(stage.getBoundingClientRect().width) || stage.offsetWidth || 0;
      stage.style.height = (size + peek) + "px";
      cards.forEach(function (c) { c.style.height = size + "px"; });
      return size;
    }

    // ── Per-card video (optional) ──────────────────────────────────
    // At most one video ever plays — whichever card is active. Hover
    // controls (play/pause, restart, mute) are scoped to their own card via
    // closest(), so this works regardless of how many cards have a video.
    var videos = cards.map(function (card) { return card.querySelector("[data-sstack-video]"); });

    function setVideoActive(idx) {
      videos.forEach(function (v, i) {
        if (!v) return;
        if (i === idx) v.play().catch(function () {});
        else v.pause();
      });
    }

    function wireVideoControls(card, video) {
      if (!video) return;
      var playBtn    = card.querySelector("[data-sstack-toggle-play]");
      var restartBtn = card.querySelector("[data-sstack-restart]");
      var muteBtn    = card.querySelector("[data-sstack-toggle-mute]");

      function syncPlaying() { card.classList.toggle("is-paused", video.paused); }
      function syncMuted()   { card.classList.toggle("is-muted", video.muted); }

      video.addEventListener("play", syncPlaying);
      video.addEventListener("pause", syncPlaying);
      syncPlaying();
      syncMuted();

      if (playBtn) playBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (video.paused) video.play().catch(function () {});
        else video.pause();
      });
      if (restartBtn) restartBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        video.currentTime = 0;
        video.play().catch(function () {});
      });
      if (muteBtn) muteBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        video.muted = !video.muted;
        syncMuted();
      });
    }

    cards.forEach(function (card, i) { wireVideoControls(card, videos[i]); });

    if (reduce) { buildStatic(); return; }

    // ── Shared state ──────────────────────────────────────────────
    var activeST       = null;
    var snapPts         = [];  // each item's dwell-centre, as progress 0..1
    var transitionMids  = [];  // each transition's centre, in timeline units
    var totalUnits       = 0;
    var clickTarget       = null;
    var clickTimer        = null;
    var curActive          = -1;

    function snapResolver(value) {
      if (clickTarget != null) return clickTarget;
      if (!snapPts.length) return value;
      var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
      for (var i = 1; i < snapPts.length; i++) {
        var d = Math.abs(value - snapPts[i]);
        if (d < bestD) { bestD = d; best = snapPts[i]; }
      }
      return best;
    }

    function setActive(idx) {
      if (idx === curActive) return;
      curActive = idx;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
        cards[i].classList.toggle("is-active", i === idx);
      }
      setVideoActive(idx);
    }

    function activeFromTime(t) {
      var idx = 0;
      for (var i = 0; i < transitionMids.length; i++) {
        if (t >= transitionMids[i]) idx = i + 1;
      }
      return idx;
    }

    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      gsap.set(bodies, { clearProps: "all" });
      gsap.set(cards, { clearProps: "all" });
      gsap.set(track, { clearProps: "all" });
      curActive = -1;

      var heights = bodies.map(function (b) {
        b.style.height = "auto";
        return b.offsetHeight;
      });
      bodies.forEach(function (b, i) {
        if (i === 0) gsap.set(b, { height: heights[0], autoAlpha: 1 });
        else         gsap.set(b, { height: 0, autoAlpha: 0 });
      });

      var cardH = layoutSquare();

      // Card rest states. The active (front) card sits flat + full size; every
      // OTHER card starts in the "pre-enter" pose — slightly shrunk — so the
      // one peeking below the active square already reads as sitting a touch
      // further back, and it eases up to full size AS it becomes active.
      gsap.set(track, { y: 0, force3D: true });
      cards.forEach(function (c, i) {
        gsap.set(c, { rotateX: 0, scale: i === 0 ? 1 : enterScale, force3D: true });
      });

      setActive(0);

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + endDist,
          pin: true,
          scrub: scrub,
          anticipatePin: 0,
          refreshPriority: 1,
          snap: snapOn ? {
            snapTo: snapResolver,
            duration: { min: 0.55, max: 0.9 },
            ease: "power2.inOut",
            delay: 0.12,
            directional: false,
          } : false,
          onUpdate: function (self) {
            var total = totalUnits;
            setActive(activeFromTime(self.progress * total));
          },
          onLeaveBack: function () { setActive(0); },
        },
      });

      // Build every transition: the WHOLE track shifts up by one card height
      // (a real vertical list scroll — the next card rises into the clipped
      // viewport from below). Scheduled at the SAME timeline cursor so they read
      // as one coordinated move:
      //   • EXIT  — the leaving card tips back in 3D (rotateX) and shrinks a
      //             touch as it slides out through the top (recedes away).
      //   • ENTER — the incoming card eases from its shrunk pre-enter pose up
      //             to flat + full size as it lands in the square.
      //   • left body swap (old row closes, new row opens).
      transitionMids = [];
      snapPts = [ (dwell / 2) ]; // item 0's dwell centre (in units, converted to progress after total is known)

      var cursor = dwell;
      for (var a = 1; a < n; a++) {
        tl.to(track, { y: -a * cardH, duration: transition, ease: ease, force3D: true }, cursor);
        tl.to(cards[a - 1], { rotateX: -exitTilt, scale: enterScale, duration: transition, ease: ease, force3D: true }, cursor);
        tl.to(cards[a], { rotateX: 0, scale: 1, duration: transition, ease: ease, force3D: true }, cursor);
        tl.add(
          Sestek.heightReveal(bodies[a - 1], bodies[a], {
            duration: textDuration,
            ease: ease,
            inHeight: heights[a],
          }),
          cursor
        );

        transitionMids.push(cursor + transition / 2);
        cursor += transition;          // start of dwell[a]
        snapPts.push(cursor + dwell / 2);
        cursor += dwell;
      }

      totalUnits = cursor;
      snapPts = snapPts.map(function (t) { return t / totalUnits; });

      if (tl.duration() < totalUnits) {
        tl.to({}, { duration: totalUnits - tl.duration() });
      }

      activeST = tl.scrollTrigger;
    }

    /** Click an item → smooth-scroll to its dwell-centre (= exact snap point). */
    function jumpTo(idx) {
      if (!activeST || !snapPts.length) return;
      var st = activeST;
      var progress = snapPts[idx];
      var y = st.start + (st.end - st.start) * progress;

      clickTarget = progress;
      if (clickTimer) clearTimeout(clickTimer);

      var dur = 1.0;
      if (typeof Sestek.scrollTo === "function" && global.lenisInstance) {
        Sestek.scrollTo(y, {
          duration: dur,
          easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      clickTimer = setTimeout(function () { clickTarget = null; }, dur * 1000 + 120);
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () { jumpTo(i); });
    });

    // ── prefers-reduced-motion fallback: no pin, click-to-swap instantly ──
    function buildStatic() {
      root.classList.add("is-static");
      var cardH = layoutSquare();
      bodies.forEach(function (b, i) {
        gsap.set(b, { height: i === 0 ? "auto" : 0, autoAlpha: i === 0 ? 1 : 0 });
      });
      gsap.set(track, { y: 0 });
      gsap.set(cards, { rotateX: 0, scale: 1 });

      var active = 0;
      items.forEach(function (item, i) { item.classList.toggle("is-active", i === 0); });
      cards.forEach(function (card, i) { card.classList.toggle("is-active", i === 0); });
      // Reduced motion: no auto-playing video, ever — mirrors video-inline.js's
      // convention. Videos stay paused on their poster until the visitor
      // presses the (still fully functional) manual play button themselves.
      videos.forEach(function (v) { if (v) v.pause(); });

      items.forEach(function (item, i) {
        item.addEventListener("click", function () {
          if (i === active) return;
          active = i;
          bodies.forEach(function (b, j) {
            gsap.set(b, { height: j === i ? "auto" : 0, autoAlpha: j === i ? 1 : 0 });
          });
          gsap.set(track, { y: -i * cardH });
          items.forEach(function (it, j) { it.classList.toggle("is-active", j === i); });
          cards.forEach(function (card, j) { card.classList.toggle("is-active", j === i); });
        });
      });
    }

    build();

    // Rebuild on resize — body heights and the card height both depend on layout.
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
  global.Sestek.initScrollStack = initScrollStack;

})(typeof window !== "undefined" ? window : this);
