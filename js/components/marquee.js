/*!
 * marquee.js v1.2.0
 * Infinite logo marquee — GSAP-driven, drag + momentum + hover-pause
 * Requires: gsap (global)
 *
 * Root attributes (all optional):
 *   data-marquee-speed      px/s scroll speed              (default 60)
 *   data-marquee-direction  "left" (default) | "right"     — which way the
 *                           track drifts; drag/momentum/hover-pause all
 *                           respect it automatically
 *   data-marquee-drag-slop  px of movement before a press counts as a drag
 *                           instead of a click                  (default 6)
 *
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.2.0 — links inside items are clickable again. The pointer is now captured
 *          only once the press turns into a real drag (> drag-slop px), so a
 *          plain click keeps its natural target: capturing on pointerdown
 *          retargeted the follow-up click event to the root, and an <a> that
 *          never receives the click never navigates. A drag still swallows the
 *          click it would otherwise end with, so dragging never opens a link.
 * v1.1.0 — data-marquee-direction ("left"/"right") for multi-row layouts
 *          where alternating rows drift opposite ways
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  /**
   * Initialises every [data-marquee] element on the page.
   * @param {string} [selector="[data-marquee]"]
   */
  function initMarquee(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Marquee] GSAP required.");
      return;
    }

    var roots = Array.from(
      document.querySelectorAll(selector || "[data-marquee]")
    );
    if (!roots.length) return;

    roots.forEach(setupInstance);
  }

  /* ─────────────────────────────────────────────────────────────
   *  Single-instance setup
   * ───────────────────────────────────────────────────────────── */
  function setupInstance(root) {
    if (root._marqueeInit) return;                        // idempotent — no duplicate ticker loops
    root._marqueeInit = true;

    var track = root.querySelector(".marquee__track");
    if (!track) {
      console.warn("[Sestek Marquee] .marquee__track not found.", root);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var dir = (root.getAttribute("data-marquee-direction") || "left").toLowerCase();
    var BASE_SPEED = (parseFloat(root.dataset.marqueeSpeed) || 60) * (dir === "right" ? -1 : 1); // px / s, signed

    // How far the pointer must travel before the press counts as a drag rather
    // than a click. Below it the gesture stays a plain click, so links inside
    // the items keep working; above it we capture the pointer and swallow the
    // click that would otherwise fire at the end of the drag.
    var DRAG_SLOP = parseFloat(root.dataset.marqueeDragSlop);
    if (isNaN(DRAG_SLOP) || DRAG_SLOP < 0) DRAG_SLOP = 6;

    // ── 1. Clone original items for seamless loop ─────────────
    //    aria-hidden keeps clones out of accessibility tree
    Array.from(track.children).forEach(function (el) {
      var clone = el.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    // ── 2. Measure loop cycle width ───────────────────────────
    //    With N original + N clone items and uniform column-gap G:
    //      scrollWidth = 2N·itemW + (2N−1)·G
    //    One seamless cycle = N·itemW + N·G = (scrollWidth + G) / 2
    function measureTrack() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return (track.scrollWidth + gap) / 2;
    }

    var trackW = measureTrack();

    // Re-measure once any lazy images finish loading
    var lazyImgs = Array.from(track.querySelectorAll("img")).filter(function (img) {
      return !img.complete;
    });
    if (lazyImgs.length) {
      var loaded = 0;
      function onLoad() {
        if (++loaded === lazyImgs.length) trackW = measureTrack();
      }
      lazyImgs.forEach(function (img) {
        img.addEventListener("load",  onLoad);
        img.addEventListener("error", onLoad);
      });
    }

    // ── 3. State ──────────────────────────────────────────────
    var pos         = 0;       // virtual scroll position in px (monotonically increases)
    var isDragging  = false;
    var dragMoved   = 0;       // px travelled this press — click vs drag verdict
    var captured    = false;   // pointer captured? (only once it IS a drag)
    var dragStartX  = 0;
    var dragStartPos = 0;
    var ptrVelocity = 0;       // px / s  (positive = dragging left)
    var lastPtrX    = 0;
    var lastPtrTime = 0;

    // Speed proxy — GSAP tweens this object so acceleration is always smooth
    var sp      = { v: BASE_SPEED };
    var spTween = null;

    function tweenSpeed(target, dur, ease) {
      if (spTween) spTween.kill();
      spTween = gsap.to(sp, {
        v       : target,
        duration: dur  || 0.7,
        ease    : ease || "power3.out",
      });
    }

    // ── 4. GSAP ticker — the only thing that moves the track ──
    //    deltaTime is milliseconds (GSAP 3 convention)
    function tick(time, deltaTime) {
      if (!isDragging) {
        pos += sp.v * (deltaTime / 1000);
        // Keep pos from growing without bound over long sessions
        if (pos > trackW * 1e6) pos -= trackW * Math.floor(pos / trackW);
      }

      // Positive-modulo: maps any pos value into [0, trackW)
      var wrapped = ((pos % trackW) + trackW) % trackW;
      gsap.set(track, { x: -wrapped, force3D: true });
    }

    gsap.ticker.add(tick);

    // ── 5. Hover ──────────────────────────────────────────────
    root.addEventListener("mouseenter", function () {
      if (isDragging) return;
      tweenSpeed(0, 0.9, "power3.out");
    });

    root.addEventListener("mouseleave", function () {
      if (isDragging) return;
      tweenSpeed(BASE_SPEED, 1.1, "power3.inOut");
    });

    // ── 6. Drag / grab ────────────────────────────────────────
    root.addEventListener("pointerdown", function (e) {
      // Ignore non-primary buttons on mouse; allow touch / pen
      if (e.pointerType === "mouse" && e.button !== 0) return;

      if (spTween) spTween.kill();
      sp.v = 0;

      isDragging   = true;
      dragMoved    = 0;
      captured     = false;
      dragStartX   = e.clientX;
      dragStartPos = pos;
      lastPtrX     = e.clientX;
      lastPtrTime  = performance.now();
      ptrVelocity  = 0;

      root.classList.add("is-dragging");
      // NOTE: no setPointerCapture here. Capturing on pointerdown retargets the
      // click that follows to the capture element, so an <a> inside an item
      // never gets its click and never navigates. We capture in pointermove,
      // once the press has actually become a drag.
    });

    root.addEventListener("pointermove", function (e) {
      if (!isDragging) return;

      dragMoved = Math.max(dragMoved, Math.abs(e.clientX - dragStartX));
      if (!captured && dragMoved >= DRAG_SLOP) {
        captured = true;
        // Now that it IS a drag: receive pointermove/up even when the cursor
        // leaves the root. The click is suppressed below, so no link opens.
        try { root.setPointerCapture(e.pointerId); } catch (err) { /* pointer gone */ }
      }

      var now = performance.now();
      var dt  = now - lastPtrTime;
      if (dt > 0) {
        // Positive = dragging left (same direction as scroll)
        ptrVelocity = (lastPtrX - e.clientX) / dt * 1000;
      }
      lastPtrX    = e.clientX;
      lastPtrTime = now;

      // Dragging left increases pos (marquee moves left); right decreases it
      pos = dragStartPos + (dragStartX - e.clientX);
    });

    root.addEventListener("pointerup",     releaseDrag);
    root.addEventListener("pointercancel", releaseDrag);

    // Links and images are natively draggable, so pressing on one and moving
    // sideways starts the BROWSER's drag-and-drop: it fires pointercancel and
    // kills our gesture a couple of frames in (the marquee stops following the
    // cursor and a ghost image trails it). Ours is the only drag here.
    root.addEventListener("dragstart", function (e) { e.preventDefault(); });

    function releaseDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      root.classList.remove("is-dragging");

      // Clamp momentum so it never feels violent (magnitude-based — BASE_SPEED
      // may be negative for data-marquee-direction="right").
      var maxSpeed = Math.abs(BASE_SPEED);
      var momentum = Math.max(-maxSpeed * 5, Math.min(maxSpeed * 10, ptrVelocity));
      sp.v = momentum;

      // If pointer is still inside the root settle to hover-pause (0),
      // otherwise ease back to normal playback speed.
      var r       = root.getBoundingClientRect();
      var inside  = e.clientX >= r.left && e.clientX <= r.right &&
                    e.clientY >= r.top  && e.clientY <= r.bottom;

      tweenSpeed(inside ? 0 : BASE_SPEED, 1.6, "power4.out");
    }

    // A drag ends with a click event on whatever sits under the pointer —
    // swallow it (capture phase, before the link sees it) so letting go over a
    // logo never navigates. A press that stayed under DRAG_SLOP is a real
    // click and passes straight through to the <a>.
    root.addEventListener("click", function (e) {
      if (dragMoved < DRAG_SLOP) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    // ── 7. Resize ─────────────────────────────────────────────
    var rTimer;
    window.addEventListener("resize", function () {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () { trackW = measureTrack(); }, 150);
    });

    // ── 8. Public cleanup ─────────────────────────────────────
    root._marqueeDestroy = function () {
      gsap.ticker.remove(tick);
      if (spTween) spTween.kill();
    };
  }

  global.Sestek            = global.Sestek || {};
  global.Sestek.initMarquee = initMarquee;

})(typeof window !== "undefined" ? window : this);
