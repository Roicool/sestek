/*!
 * scroll-stack.js v1.2.0
 * Pinned, scroll-driven "card deck" section:
 *   • LEFT  — a persistent list of items; the active one expands (its body
 *     grows height 0→auto via Sestek.heightReveal) while the rest stay
 *     collapsed and dimmed (.is-active toggled for Designer to style).
 *   • RIGHT — a stack of cards, one per item, stacked in the same spot.
 *     The active card sits in front (scale 1, no tilt, no offset). Cards
 *     behind it peek from below — offset down, scaled down, and tipped back
 *     (rotateX) via a real 3D perspective on the stage — a proper receding
 *     deck, not a flat crossfade. Advancing the active index does TWO things
 *     at once:
 *       1. the current front card lifts UP and tips further back (rotateX)
 *          while fading out — like the top card being lifted off a deck
 *       2. every card behind it rises one depth level (and untilts a step)
 *          to take its place
 *     Scrolling back reverses the exact same tween, so the deck rebuilds
 *     itself scroll-direction-agnostically — no manual reverse logic.
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
 *     [data-sstack-stage]               RIGHT column — give it an explicit
 *                                       size (aspect-ratio / min-height);
 *                                       children are position:absolute (CSS)
 *       [data-sstack-card="0"]          one stacked card — index must match
 *                                       its [data-sstack-item]. Content is
 *                                       yours (image, or a <video> — see below)
 *       [data-sstack-card="1"]          …
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
 *   data-sstack-end         pin scroll distance             (default "400%")
 *   data-sstack-scrub       scrub lag in seconds             (default 0.5)
 *   data-sstack-dwell       per-item hold length, in "units" (default 1.5)
 *   data-sstack-transition  per-swap length, in "units"      (default 1)
 *   data-sstack-snap        "false" to disable snap-to-item  (default true)
 *   data-sstack-ease        ease for every swap              (default "power2.inOut")
 *   data-sstack-peek        yPercent offset per stacked depth level (default 6)
 *   data-sstack-peek-scale  scale falloff per depth level    (default 0.05)
 *   data-sstack-peek-tilt   rotateX degrees per depth level, receding tilt (default 6)
 *   data-sstack-max-depth   depth beyond which a card is hidden (opacity 0) (default 3)
 *   data-sstack-exit        yPercent the leaving card travels, upward (default 140)
 *   data-sstack-exit-tilt   rotateX degrees the leaving card tips back to (default 25)
 *   data-sstack-perspective px depth of the 3D perspective on the stage (default 1200)
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
    var cards  = Array.from(root.querySelectorAll("[data-sstack-card]"));

    var n = items.length;
    if (n < 2 || cards.length !== n || bodies.length !== n) {
      console.warn("[Sestek ScrollStack] Need >=2 matching [data-sstack-item]/[data-sstack-body]/[data-sstack-card].");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist    = root.getAttribute("data-sstack-end") || "400%";
    var scrub      = num(root, "data-sstack-scrub", 0.5);
    var dwell      = num(root, "data-sstack-dwell", 1.5);
    var transition = num(root, "data-sstack-transition", 1);
    var snapOn     = root.getAttribute("data-sstack-snap") !== "false";
    var ease       = root.getAttribute("data-sstack-ease") || "power2.inOut";
    var peek        = num(root, "data-sstack-peek", 6);
    var peekScale   = num(root, "data-sstack-peek-scale", 0.05);
    var peekTilt    = num(root, "data-sstack-peek-tilt", 6);
    var maxDepth    = num(root, "data-sstack-max-depth", 3);
    var exitY       = num(root, "data-sstack-exit", 140);
    var exitTilt    = num(root, "data-sstack-exit-tilt", 25);
    var perspective = num(root, "data-sstack-perspective", 1200);

    var reduce = Sestek.util.prefersReducedMotion();

    var stage = root.querySelector("[data-sstack-stage]");
    if (stage) stage.style.perspective = perspective + "px";

    /**
     * Resting style for a card at a given depth.
     * depth 0        → front, fully visible, no tilt, no offset.
     * depth > 0       → stacked behind, peeking below — offset down, scaled
     *                   down, tipped back a little further per depth level
     *                   (rotateX) so the deck actually recedes in 3D space
     *                   instead of just looking like flat, offset copies.
     * depth < 0       → already dismissed — lifted up, tipped further back,
     *                   faded out. Continues the SAME tilt direction the
     *                   card was already easing into as it neared the front,
     *                   so the departure reads as one continuous motion
     *                   rather than a bolted-on exit.
     * depth > maxDepth is visually identical to maxDepth but invisible, so a
     * long list doesn't pile up an ever-growing, ever-shrinking peek stack.
     */
    function depthVars(depth) {
      if (depth < 0) {
        return {
          yPercent: -exitY,
          rotateX: -exitTilt,
          scale: 1,
          opacity: 0,
          zIndex: 0,
          force3D: true,
        };
      }
      return {
        yPercent: peek * depth,
        rotateX: -peekTilt * depth,
        scale: 1 - peekScale * depth,
        opacity: depth > maxDepth ? 0 : 1,
        zIndex: n - depth,
        force3D: true,
      };
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
    var activeST      = null;
    var snapPts        = [];  // each item's dwell-centre, as progress 0..1
    var transitionMids = [];  // each transition's centre, in timeline units
    var totalUnits      = 0;
    var clickTarget      = null;
    var clickTimer       = null;
    var curActive         = -1;

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
      curActive = -1;

      var heights = bodies.map(function (b) {
        b.style.height = "auto";
        return b.offsetHeight;
      });
      bodies.forEach(function (b, i) {
        if (i === 0) gsap.set(b, { height: heights[0], autoAlpha: 1 });
        else         gsap.set(b, { height: 0, autoAlpha: 0 });
      });

      cards.forEach(function (card, i) {
        gsap.set(card, depthVars(i));
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

      // Build every transition: outgoing card exits, the rest rise one depth,
      // the left body swaps — all scheduled at the same timeline cursor so
      // they read as ONE coordinated move rather than separate steps.
      transitionMids = [];
      snapPts = [ (dwell / 2) ]; // item 0's dwell centre (in units, converted to progress after total is known)

      var cursor = dwell;
      for (var a = 1; a < n; a++) {
        tl.to(cards[a - 1], mergeVars(depthVars(-1)), cursor);
        for (var k = a; k < n; k++) {
          tl.to(cards[k], mergeVars(depthVars(k - a)), cursor);
        }
        tl.add(
          Sestek.heightReveal(bodies[a - 1], bodies[a], {
            duration: transition,
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

    function mergeVars(vars) {
      vars.duration = transition;
      vars.ease = ease;
      return vars;
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
      bodies.forEach(function (b, i) {
        gsap.set(b, { height: i === 0 ? "auto" : 0, autoAlpha: i === 0 ? 1 : 0 });
      });
      cards.forEach(function (card, i) { gsap.set(card, depthVars(i)); });

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
          cards.forEach(function (card, j) {
            gsap.set(card, depthVars(j - i));
            card.classList.toggle("is-active", j === i);
          });
          items.forEach(function (it, j) { it.classList.toggle("is-active", j === i); });
        });
      });
    }

    build();

    // Rebuild on resize — body heights and card depths both depend on layout.
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
