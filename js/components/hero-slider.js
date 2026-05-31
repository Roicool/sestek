/*!
 * hero-slider.js v1.1.0
 * Framer-style hero card slider for Webflow CMS — a premium, GPU-driven track of
 * cards that auto-advances by a configurable STEP (1, 2, 3… cards at a time, the
 * "jumps two/three" feel), supports flick/drag with momentum, and snaps cleanly
 * to a card edge. Seamless infinite loop with ZERO clones: leading cards recycle
 * to the end (and trailing cards back to the front when you drag backwards) as
 * they pass out of view, so a ~10-card CMS list loops forever without doubling
 * the DOM.
 *
 * Driven by translateX on the track (no scrollLeft) so movement is fully
 * compositor-driven, sub-pixel smooth, and easy to tween/snap with GSAP.
 *
 * Independent of text-rotator.js — they share nothing and can be used apart.
 *
 * Requires : gsap (global)
 * CSS      : css/components/hero-slider.css
 *
 * DOM (Webflow CMS — Collection List Wrapper > Collection List > Item):
 *   [data-hslider]                    section root        (.hslider)
 *     [data-hslider-track]            Collection List     (the flex row)
 *       [data-hslider-card]           Collection Item     (your card design)
 *
 * Root attributes:
 *   data-hslider-step      cards advanced per auto-tick   (default 2)
 *   data-hslider-interval  ms between auto-ticks           (default 3800)
 *   data-hslider-ease      GSAP ease for each advance/snap (default "power3.inOut")
 *   data-hslider-duration  seconds per advance/snap        (default 0.9)
 *   data-hslider-autoplay  "false" to disable auto-advance (default true)
 *   data-hslider-gap       fallback gap px if CSS gap unreadable (default 0)
 *
 * Behaviour:
 *   • Auto-advances STEP cards every INTERVAL; pauses on hover (fine pointers)
 *     and while dragging; resumes shortly after.
 *   • Drag/flick anywhere on the track; release snaps to the nearest card with
 *     velocity-aware overshoot. Works with mouse, touch, and pen (Pointer Events).
 *   • prefers-reduced-motion: no auto-advance, no momentum — drag still snaps.
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

  /** Initialise every [data-hslider] on the page. */
  function initHeroSlider(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek HeroSlider] GSAP required.");
      return [];
    }
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-hslider]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  function setupInstance(root) {
    if (root._hsliderInit) return null;
    root._hsliderInit = true;

    var track = root.querySelector("[data-hslider-track]");
    if (!track) {
      console.warn("[Sestek HeroSlider] [data-hslider-track] not found.", root);
      return null;
    }
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-hslider-card]"));
    if (cards.length < 2) return null;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    var step      = Math.max(1, attrNum(root, "data-hslider-step", 2));
    var interval  = attrNum(root, "data-hslider-interval", 3800);
    var ease      = root.getAttribute("data-hslider-ease") || "power3.inOut";
    var duration  = attrNum(root, "data-hslider-duration", 0.9);
    var autoplay  = root.getAttribute("data-hslider-autoplay") !== "false" && !reduce;
    var gapAttr   = attrNum(root, "data-hslider-gap", 0);

    // Current translateX of the track (negative = moved left). We keep our own
    // value rather than reading the DOM so tweens and drags share one source.
    var x = 0;

    /** Gap between cards, read from the flex track (fallback to attribute). */
    function gap() {
      return parseFloat(getComputedStyle(track).columnGap) || gapAttr;
    }
    /** Width (incl. gap) of one card — assumes uniform card widths. */
    function cardStride() {
      return cards[0].getBoundingClientRect().width + gap();
    }

    gsap.set(track, { x: 0, force3D: true });

    // ── Clone-free infinite recycling ─────────────────────────────
    // As the track moves left, once the leading card is fully past the left
    // edge we move it to the end and add its stride back to x — nothing jumps.
    // Dragging right does the mirror (trailing → front).
    // Returns the NET adjustment applied to x, so a caller holding a fixed
    // reference point (e.g. startTrackX during a drag) can stay in sync.
    function recycle() {
      var stride = cardStride();
      var safety = 0;
      var applied = 0;
      // Moved left far enough that the first card is off-screen → send to back.
      while (-x >= stride && track.children.length > 1) {
        track.appendChild(track.children[0]);
        x += stride;
        applied += stride;
        if (++safety > 64) break;
      }
      // Moved right past 0 → pull the last card to the front.
      while (x > 0 && track.children.length > 1) {
        track.insertBefore(track.children[track.children.length - 1], track.children[0]);
        x -= stride;
        applied -= stride;
        if (++safety > 128) break;
      }
      gsap.set(track, { x: x });
      return applied;
    }

    // ── Programmatic advance / snap ───────────────────────────────
    var moveTween = null;
    function killMove() { if (moveTween) { moveTween.kill(); moveTween = null; } }

    /** Animate to an absolute x, recycling on each tick + at the end. */
    function animateTo(targetX, dur, e) {
      killMove();
      moveTween = gsap.to({ v: x }, {
        v: targetX,
        duration: dur != null ? dur : duration,
        ease: e || ease,
        onUpdate: function () {
          x = this.targets()[0].v;
          gsap.set(track, { x: x });
          recycle();
        },
        onComplete: function () {
          recycle();
          moveTween = null;
        },
      });
    }

    /** Advance by n cards (n>0 → left/next). Snaps to a card edge. */
    function advance(n) {
      var stride = cardStride();
      // Snap current x to a card boundary first, then add n strides.
      var snapped = Math.round(x / stride) * stride;
      animateTo(snapped - n * stride);
    }
    function next() { advance(step); }
    function prev() { advance(-step); }

    // ── Autoplay ──────────────────────────────────────────────────
    // Three INDEPENDENT pause conditions; autoplay only runs when none hold.
    // Kept separate (not one shared flag) so ending a drag can't clear a still
    // active hover — the cursor staying inside must keep it paused.
    var hovering = false, draggingPause = false, offscreen = false;
    function isPaused() { return hovering || draggingPause || offscreen; }

    var timer = null;
    function startAuto() {
      if (!autoplay || timer) return;
      timer = setInterval(function () { if (!isPaused()) next(); }, interval);
    }
    function stopAuto() { if (timer) { clearInterval(timer); timer = null; } }

    if (canHover) {
      // Mouse inside the slider → never autoslide, period.
      root.addEventListener("mouseenter", function () { hovering = true; });
      root.addEventListener("mouseleave", function () { hovering = false; });
    }
    // Pause when the tab/section isn't visible — saves work, avoids a "catch-up"
    // burst of advances when the user returns.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
      }, { threshold: 0.1 }).observe(root);
    }

    // ── Drag / flick (Pointer Events) ─────────────────────────────
    var dragging = false, startX = 0, startTrackX = 0, lastX = 0, lastT = 0, vel = 0;
    var DRAG_THRESH = 4;     // px before we treat it as a drag (lets clicks pass)
    var moved = false;

    function onDown(e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true; moved = false;
      draggingPause = true;
      killMove();
      startX = e.clientX;
      startTrackX = x;
      lastX = e.clientX; lastT = e.timeStamp || performance.now();
      vel = 0;
      track.setPointerCapture && track.setPointerCapture(e.pointerId);
      root.classList.add("is-dragging");
    }
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < DRAG_THRESH) return;
      moved = true;
      x = startTrackX + dx;
      gsap.set(track, { x: x });
      // recycle() may shift x by ±stride and re-order the DOM. Keep the drag's
      // fixed reference (startTrackX) in sync with that shift, otherwise the
      // next move recomputes x = startTrackX + dx and undoes the recycle —
      // making the track jump back and forth ("kafayı yiyor") while dragging.
      startTrackX += recycle();
      var now = e.timeStamp || performance.now();
      var dt = now - lastT;
      if (dt > 0) vel = (e.clientX - lastX) / dt * 1000;   // px/sec
      lastX = e.clientX; lastT = now;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      root.classList.remove("is-dragging");
      // Release the drag pause only. Hover (cursor still inside) is tracked
      // separately, so autoplay stays paused as long as the mouse is in.
      draggingPause = false;
      var stride = cardStride();

      if (reduce) {
        animateTo(Math.round(x / stride) * stride, 0.3, "power2.out");
        return;
      }
      // Velocity-aware: project the flick a little, then snap to nearest card.
      var projected = x + vel * 0.18;
      var target = Math.round(projected / stride) * stride;
      // Guarantee at least a one-card move on a deliberate flick.
      if (Math.abs(vel) > 350 && target === Math.round(x / stride) * stride) {
        target += (vel < 0 ? -1 : 1) * stride;
      }
      var dist = Math.abs(target - x);
      var dur = Math.min(1.1, Math.max(0.4, dist / stride * 0.45));
      animateTo(target, dur, "power3.out");
    }

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    // Swallow click after a drag so card links don't fire on a flick.
    track.addEventListener("click", function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);

    // Optional author controls: [data-hslider-prev] / [data-hslider-next]
    var prevBtn = root.querySelector("[data-hslider-prev]");
    var nextBtn = root.querySelector("[data-hslider-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { next(); });

    // Re-snap on resize (card widths change → stride changes).
    var rT;
    window.addEventListener("resize", function () {
      clearTimeout(rT);
      rT = setTimeout(function () {
        var stride = cardStride();
        x = Math.round(x / stride) * stride;
        gsap.set(track, { x: x });
        recycle();
      }, 160);
    });

    startAuto();

    var api = {
      root: root, next: next, prev: prev,
      play: function () { autoplay = true; startAuto(); },
      pause: function () { autoplay = false; stopAuto(); },
      destroy: function () { stopAuto(); killMove(); },
    };
    root._hsliderDestroy = api.destroy;
    return api;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHeroSlider = initHeroSlider;

})(typeof window !== "undefined" ? window : this);
