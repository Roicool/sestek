/*!
 * featured-blog-slider.js v1.0.0
 * Centered-card carousel for a Webflow CMS Collection List of featured blog
 * posts — GPU-driven by GSAP, with clickable auto-fill progress bars (the
 * "Stories" pattern: one segment per slide, the active one fills over the
 * autoplay interval and clicking any segment jumps straight to it).
 *
 * The active card sits centered in the viewport with neighbours peeking on
 * both sides ("bleed"), EXCEPT at the very first/last slide, where the track
 * is clamped to the edge so there's no blank gutter before the first card or
 * after the last one — only real content ever peeks into view.
 *
 * Requires : gsap (global)
 * CSS      : css/components/featured-blog-slider.css
 *
 * DOM (Webflow CMS — Collection List Wrapper > Collection List > Item):
 *   [data-fbslider]                      root (.fbslider)
 *     [data-fbslider-viewport]           clipping viewport
 *       [data-fbslider-track]            Collection List (flex row)
 *         [data-fbslider-card]           Collection Item (your card design)
 *     [data-fbslider-bars]               JS-populated progress bar strip
 *
 * Root attributes:
 *   data-fbslider-interval  ms each bar takes to fill / autoplay tick (default 5000)
 *   data-fbslider-autoplay  "false" to disable auto-advance              (default true)
 *   data-fbslider-ease      GSAP ease for centering tween                (default "power3.out")
 *   data-fbslider-duration  seconds per centering tween                  (default 0.7)
 *   data-fbslider-start     starting slide index, 0-based                (default 0)
 *
 * Behaviour:
 *   • Active card: full opacity + .is-active. Inactive cards: dimmed via
 *     --fbslider-inactive-opacity (CSS), so no JS opacity tweening needed.
 *   • One [data-fbslider-bars] segment per card, generated on init. The
 *     active segment's fill animates 0→100% over the interval; reaching
 *     100% advances to the next slide. Clicking a segment jumps to it.
 *   • Hovering the slider (fine pointers) or dragging pauses the fill/autoplay
 *     without resetting progress; it resumes from where it left off.
 *   • Drag/flick the track (Pointer Events) snaps to the nearest card.
 *   • prefers-reduced-motion: no autoplay, instant (un-eased) snaps.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function warn(msg, el) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek FeaturedBlogSlider] " + msg, el || "");
    }
  }

  /** Initialise every [data-fbslider] on the page. */
  function initFeaturedBlogSlider(selector) {
    if (typeof gsap === "undefined") {
      warn("GSAP required — slider(s) not initialized.");
      return [];
    }
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-fbslider]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  function setupInstance(root) {
    if (root._fbsliderInit) return null;
    root._fbsliderInit = true;

    var viewport = root.querySelector("[data-fbslider-viewport]");
    var track    = root.querySelector("[data-fbslider-track]");
    if (!viewport || !track) {
      warn("Missing [data-fbslider-viewport] or [data-fbslider-track] — skipping.", root);
      return null;
    }
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-fbslider-card]"));
    if (!cards.length) {
      warn("No [data-fbslider-card] items found — skipping.", root);
      return null;
    }
    var barsEl = root.querySelector("[data-fbslider-bars]");

    var reduce = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = global.matchMedia && global.matchMedia("(hover: hover) and (pointer: fine)").matches;

    var interval = attrNum(root, "data-fbslider-interval", 5000);
    var ease     = root.getAttribute("data-fbslider-ease") || "power3.out";
    var duration = reduce ? 0 : attrNum(root, "data-fbslider-duration", 0.7);
    var autoplay = root.getAttribute("data-fbslider-autoplay") !== "false" && !reduce;
    var index    = Math.min(cards.length - 1, Math.max(0, attrNum(root, "data-fbslider-start", 0)));

    gsap.set(track, { x: 0, force3D: true });

    // ── Geometry ─────────────────────────────────────────────────────
    function gap() {
      return parseFloat(getComputedStyle(track).columnGap) || 0;
    }
    function cardWidth() {
      return cards[0].getBoundingClientRect().width;
    }
    function stride() {
      return cardWidth() + gap();
    }
    /** Track width if every card + gap were laid end to end. */
    function trackWidth() {
      return cards.length * cardWidth() + (cards.length - 1) * gap();
    }

    /**
     * Centered x for a given index, clamped so the first/last slide never
     * leaves a blank gutter before/after the track — only cards ever peek.
     */
    function targetX(i) {
      var vw = viewport.getBoundingClientRect().width;
      var centered = (vw - cardWidth()) / 2 - i * stride();
      var min = Math.min(0, vw - trackWidth());   // left-most allowed (last card flush right)
      return Math.max(min, Math.min(0, centered)); // 0 = first card flush left
    }

    // ── Active state ─────────────────────────────────────────────────
    function setActive(i) {
      cards.forEach(function (card, n) {
        card.classList.toggle("is-active", n === i);
      });
      if (bars[i]) {
        bars.forEach(function (b, n) { b.classList.toggle("is-active", n === i); });
      }
    }

    // ── Move (centering tween) ──────────────────────────────────────
    var moveTween = null;
    function killMove() { if (moveTween) { moveTween.kill(); moveTween = null; } }

    function goTo(i, opts) {
      i = Math.max(0, Math.min(cards.length - 1, i));
      var silent = opts && opts.silent;
      index = i;
      killMove();
      var x = targetX(i);
      if (duration <= 0) {
        gsap.set(track, { x: x });
      } else {
        moveTween = gsap.to(track, { x: x, duration: duration, ease: ease });
      }
      setActive(i);
      if (!silent) restartFill();
    }
    function next() { goTo((index + 1) % cards.length); }
    function prev() { goTo((index - 1 + cards.length) % cards.length); }

    // ── Progress bars (Stories-style auto-fill) ──────────────────────
    var bars = [];
    var fills = [];
    var fillTween = null;

    function buildBars() {
      if (!barsEl) return;
      barsEl.innerHTML = "";
      cards.forEach(function (_, n) {
        var bar  = document.createElement("button");
        bar.type = "button";
        bar.className = "fbslider-bar";
        bar.setAttribute("aria-label", "Slide " + (n + 1));
        var fill = document.createElement("span");
        fill.className = "fbslider-bar__fill";
        bar.appendChild(fill);
        bar.addEventListener("click", function () { goTo(n); });
        barsEl.appendChild(bar);
        bars.push(bar);
        fills.push(fill);
      });
    }
    buildBars();

    function killFill() { if (fillTween) { fillTween.kill(); fillTween = null; } }

    function restartFill() {
      killFill();
      fills.forEach(function (f) { gsap.set(f, { width: "0%" }); });
      if (!autoplay || !fills[index]) return;
      fillTween = gsap.to(fills[index], {
        width: "100%",
        duration: interval / 1000,
        ease: "none",
        onComplete: next,
      });
      if (isPaused()) fillTween.pause();
    }

    // ── Pause conditions (hover / drag / offscreen) ──────────────────
    var hovering = false, draggingPause = false, offscreen = false;
    function isPaused() { return hovering || draggingPause || offscreen; }
    function syncPause() {
      if (!fillTween) return;
      if (isPaused()) fillTween.pause();
      else fillTween.resume();
    }

    if (canHover) {
      root.addEventListener("mouseenter", function () { hovering = true; syncPause(); });
      root.addEventListener("mouseleave", function () { hovering = false; syncPause(); });
    }
    if ("IntersectionObserver" in global) {
      new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
        syncPause();
      }, { threshold: 0.1 }).observe(root);
    }

    // ── Drag / flick (Pointer Events) ────────────────────────────────
    var dragging = false, startX = 0, startTrackX = 0;
    var DRAG_THRESH = 4;
    var moved = false;

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true; moved = false;
      draggingPause = true; syncPause();
      killMove();
      startX = e.clientX;
      startTrackX = parseFloat(gsap.getProperty(track, "x")) || 0;
      track.setPointerCapture && track.setPointerCapture(e.pointerId);
      root.classList.add("is-dragging");
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < DRAG_THRESH) return;
      moved = true;
      var min = Math.min(0, viewport.getBoundingClientRect().width - trackWidth());
      var x = Math.max(min, Math.min(0, startTrackX + dx));
      gsap.set(track, { x: x });
    }
    function onUp(e) {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      draggingPause = false; syncPause();
      if (!moved) return;
      var dx = e.clientX - startX;
      var nearest = Math.round(index - dx / stride());
      goTo(nearest);
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    // Optional author controls: [data-fbslider-prev] / [data-fbslider-next]
    var prevBtn = root.querySelector("[data-fbslider-prev]");
    var nextBtn = root.querySelector("[data-fbslider-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); });

    // Re-center on resize (card width / viewport width change the geometry).
    var rT;
    global.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () { goTo(index, { silent: true }); }, 160);
    });

    goTo(index, { silent: true });
    restartFill();

    var api = {
      root: root, next: next, prev: prev, goTo: goTo,
      play: function () { autoplay = true; restartFill(); },
      pause: function () { autoplay = false; killFill(); },
      destroy: function () { killMove(); killFill(); },
    };
    root._fbsliderDestroy = api.destroy;
    return api;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFeaturedBlogSlider = initFeaturedBlogSlider;

})(typeof window !== "undefined" ? window : this);
