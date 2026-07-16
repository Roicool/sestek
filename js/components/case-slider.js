/*!
 * case-slider.js v1.0.0
 * CMS-driven draggable case-study card slider (Apollo-style):
 *   1. Left copy column is static; the right side is a horizontal track of
 *      CMS cards showing ONE full card plus a peek of the next from the
 *      right edge.
 *   2. NO fades — cards physically slide. Grab-and-drag (pointer events,
 *      mouse + touch) with edge resistance; release snaps to the nearest
 *      card (velocity-aware, so a quick flick advances).
 *   3. Prev/next arrows loop: next on the last card rewinds to the first,
 *      prev on the first jumps to the last.
 *   4. Cards can be links — a real drag (> a few px) swallows the click
 *      so dragging never accidentally navigates.
 *
 * Requires : gsap. (No plugins — drag is pointer-event based.)
 *
 * DOM contract:
 *   [data-case-slider]        root; config attributes below
 *     [data-cslider-viewport]   clipping window (the drag surface)
 *       ...Collection List...    the list element is used as the track
 *         [data-cslider-card]     one per CMS item (indexed by DOM order)
 *     [data-cslider-prev]       previous arrow
 *     [data-cslider-next]       next arrow
 *
 * Root config attributes:
 *   data-cslider-dur        snap tween seconds        (default 0.65)
 *   data-cslider-ease       snap ease                 (default "power3.out")
 *   data-cslider-resist     edge drag resistance 0..1 (default 0.35)
 *   data-cslider-flick      flick velocity px/ms      (default 0.5)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function initCaseSlider(selector) {
    var root = document.querySelector(selector || "[data-case-slider]");
    if (!root) { console.warn("[Sestek CaseSlider] No [data-case-slider] found."); return; }
    if (root._caseSliderInit) return;                     // idempotent
    root._caseSliderInit = true;
    if (typeof gsap === "undefined") {
      console.error("[Sestek CaseSlider] GSAP required."); return;
    }

    var viewport = root.querySelector("[data-cslider-viewport]");
    var cards    = Array.from(root.querySelectorAll("[data-cslider-card]"));
    var prevBtn  = root.querySelector("[data-cslider-prev]");
    var nextBtn  = root.querySelector("[data-cslider-next]");

    if (!viewport || !cards.length) {
      console.warn("[Sestek CaseSlider] [data-cslider-viewport] and [data-cslider-card] items required (is the Collection List empty?).");
      return;
    }

    // The track is whatever single container holds the card wrappers —
    // for a Webflow Collection List that's the DynamoList element.
    // Walk up from the first card until the element whose parent is
    // an ancestor containing ALL cards' common parent chain.
    var items = cards.map(function (c) {
      var el = c;
      while (el.parentElement && el.parentElement !== viewport &&
             !el.parentElement.contains(cards[cards.length - 1])) {
        el = el.parentElement;
      }
      // el.parentElement now contains all cards → el is the per-card wrapper
      while (el.parentElement && cards.every(function (cc) { return el.parentElement.contains(cc); }) === false) {
        el = el.parentElement;
      }
      return el;
    });
    // Common parent of all per-card wrappers = the track we translate.
    var track = items[0].parentElement;
    while (track && !cards.every(function (c) { return track.contains(c); })) {
      track = track.parentElement;
    }
    // Re-derive wrappers as DIRECT children of the track, in DOM order.
    items = Array.from(track.children).filter(function (ch) {
      return cards.some(function (c) { return ch === c || ch.contains(c); });
    });

    var n = items.length;

    var dur    = num(root, "data-cslider-dur", 0.65);
    var ease   = root.getAttribute("data-cslider-ease") || "power3.out";
    var resist = num(root, "data-cslider-resist", 0.35);
    var flick  = num(root, "data-cslider-flick", 0.5);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Geometry ───────────────────────────────────────────────────
    var snaps = [];      // x offset (positive) per index
    var maxX  = 0;       // furthest the track can shift left
    var index = 0;
    var pos   = { x: 0 };  // current translate (negative when shifted left)

    function measure() {
      var base = items[0].offsetLeft;
      maxX = Math.max(0, track.scrollWidth - viewport.clientWidth);
      snaps = items.map(function (it) {
        return Math.min(Math.max(0, it.offsetLeft - base), maxX);
      });
    }

    function apply() { gsap.set(track, { x: -pos.x }); }

    function setArrowState() {
      // Loop mode — arrows never disable; kept as a hook for styling.
      if (prevBtn) prevBtn.setAttribute("aria-disabled", "false");
      if (nextBtn) nextBtn.setAttribute("aria-disabled", "false");
    }

    function goTo(i, animate) {
      index = ((i % n) + n) % n;              // wrap — loop in both directions
      var target = snaps[index];
      gsap.killTweensOf(pos);
      if (animate === false || reduce) {
        pos.x = target; apply(); setArrowState(); return;
      }
      gsap.to(pos, {
        x: target,
        duration: dur,
        ease: ease,
        onUpdate: apply,
      });
      setArrowState();
    }

    /** Nearest snap index for an arbitrary x. */
    function nearest(x) {
      var best = 0, bestD = Infinity;
      for (var i = 0; i < snaps.length; i++) {
        var d = Math.abs(x - snaps[i]);
        if (d < bestD) { bestD = d; best = i; }
      }
      return best;
    }

    // ── Drag (pointer events; touch-action: pan-y expected on viewport) ──
    var dragging = false;
    var dragMoved = false;
    var startX = 0, startPos = 0;
    var lastX = 0, lastT = 0, velo = 0;

    function onDown(e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      dragMoved = false;
      startX = e.clientX;
      startPos = pos.x;
      lastX = e.clientX;
      lastT = e.timeStamp;
      velo = 0;
      gsap.killTweensOf(pos);
      viewport.classList.add("is-dragging");
    }

    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 6) dragMoved = true;

      var next = startPos - dx;
      // Edge resistance — rubber-band past either end.
      if (next < 0) next *= resist;
      if (next > maxX) next = maxX + (next - maxX) * resist;
      pos.x = next;
      apply();

      var dt = e.timeStamp - lastT;
      if (dt > 0) velo = (e.clientX - lastX) / dt;   // px per ms, signed
      lastX = e.clientX;
      lastT = e.timeStamp;

      if (dragMoved) e.preventDefault();
    }

    function onUp() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");

      var target = nearest(pos.x);
      // Velocity flick: advance even on a short, fast swipe.
      if (Math.abs(velo) > flick) {
        target = velo < 0 ? Math.min(index + 1, n - 1) : Math.max(index - 1, 0);
      } else if (target === index) {
        // Dragged past half a card? nearest() already handles it.
      }
      goTo(target, true);
    }

    viewport.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    // A real drag must never click through to the card link.
    viewport.addEventListener("click", function (e) {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; }
    }, true);

    // Native image ghost-drag fights pointer dragging — disable it.
    root.querySelectorAll("img").forEach(function (im) { im.draggable = false; });

    // ── Arrows (looping) ───────────────────────────────────────────
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(index - 1, true); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(index + 1, true); });

    // ── Resize: re-measure, keep the current card aligned ─────────
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        measure();
        goTo(index, false);
      }, 150);
    });

    measure();
    goTo(0, false);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCaseSlider = initCaseSlider;

})(typeof window !== "undefined" ? window : this);
