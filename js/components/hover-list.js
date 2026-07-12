/*!
 * hover-list.js v1.1.0
 * Editorial link list with a cursor-following image (Work AI Institute-style):
 *   • Each row is a full-width link. Hovering a row flips it (and its icons/
 *     labels) to an active state — handled in CSS via :hover / .is-active.
 *   • A single square "cursor visual" follows the pointer while it's over the
 *     list. Moving from one row to the next keeps the square stuck to the
 *     cursor; only the IMAGE inside slides upward to swap to the new row's
 *     visual (the frame never jumps).
 *
 * Position + swaps are transform + opacity only (GPU-composited), pointer
 * tracking is smoothed with gsap.quickTo.
 *
 * Mobile / touch (no hover): the square parks in a fixed corner and the
 * active row becomes whichever one sits at the viewport centre while you
 * scroll (IntersectionObserver) — same upward image-slide, no cursor follow.
 *
 * Requires : gsap registered.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-hover-list]                   root / list
 *     [data-hlist-item="0"]             a row — should be (or wrap) an <a>
 *       …your labels / icons…             style .is-active states in CSS
 *     [data-hlist-item="1"]             …
 *     [data-hlist-cursor]               the floating square (position:fixed)
 *       [data-hlist-media]              overflow-hidden square window
 *         [data-hlist-vis="0"]           image layer for item 0 (index matches)
 *         [data-hlist-vis="1"]           image layer for item 1
 *
 * Root attributes (all optional):
 *   data-hlist-follow   pointer-follow smoothing in seconds (default 0.35)
 *   data-hlist-slide    image slide duration in seconds     (default 0.55)
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
   * Initializes a cursor-following hover list.
   * @param {string} [selector="[data-hover-list]"]
   */
  function initHoverList(selector) {
    var root = document.querySelector(selector || "[data-hover-list]");
    if (!root) { console.warn("[Sestek HoverList] No [data-hover-list] found."); return; }
    if (root._hoverListInit) return;                       // idempotent
    root._hoverListInit = true;
    if (typeof gsap === "undefined") {
      console.error("[Sestek HoverList] GSAP required."); return;
    }

    var items  = Array.from(root.querySelectorAll("[data-hlist-item]"));
    var cursor = root.querySelector("[data-hlist-cursor]");
    var vises  = cursor ? Array.from(cursor.querySelectorAll("[data-hlist-vis]")) : [];

    if (!items.length) {
      console.warn("[Sestek HoverList] Need [data-hlist-item] rows."); return;
    }

    if (!cursor) return;                                  // no visual → plain links

    var followDur = num(root, "data-hlist-follow", 0.35);
    var slideDur  = num(root, "data-hlist-slide", 0.55);
    var canHover  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    var curIdx  = -1;
    var visible = false;

    // Image layers stacked; all parked below the window until activated.
    gsap.set(vises, { position: "absolute", inset: 0, yPercent: 100 });
    gsap.set(cursor, { autoAlpha: 0, scale: 0.85, pointerEvents: "none" });

    function show() {
      if (visible) return;
      visible = true;
      gsap.to(cursor, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "power3.out" });
    }
    function hide() {
      if (!visible) return;
      visible = false;
      gsap.to(cursor, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: "power2.in" });
    }

    /** Swap to layer idx: outgoing slides up & out, incoming slides up in. */
    function setActive(idx) {
      if (idx === curIdx) return;
      var prev = curIdx;
      curIdx = idx;
      // prev: the layer to slide out (may be -1 on first enter — no-op below).

      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
      }

      if (vises[prev]) {
        gsap.to(vises[prev], { yPercent: -100, duration: slideDur, ease: "power3.inOut", overwrite: true });
      }
      if (vises[idx]) {
        // Always enters from below → slides upward into the window.
        gsap.fromTo(vises[idx],
          { yPercent: 100 },
          { yPercent: 0, duration: slideDur, ease: "power3.inOut", overwrite: true });
      }
    }

    // ── Desktop: square follows the pointer, active = hovered row ──
    function setupDesktop() {
      gsap.set(cursor, { position: "fixed", top: 0, left: 0, xPercent: -50, yPercent: -50, zIndex: 60 });
      var toX = gsap.quickTo(cursor, "x", { duration: followDur, ease: "power3" });
      var toY = gsap.quickTo(cursor, "y", { duration: followDur, ease: "power3" });

      root.addEventListener("pointermove", function (e) { toX(e.clientX); toY(e.clientY); });
      root.addEventListener("pointerenter", show);
      root.addEventListener("pointerleave", function () {
        hide();
        for (var i = 0; i < items.length; i++) items[i].classList.remove("is-active");
        if (vises[curIdx]) gsap.to(vises[curIdx], { yPercent: -100, duration: 0.3, ease: "power2.in" });
        curIdx = -1;
      });
      items.forEach(function (item, i) {
        item.addEventListener("pointerenter", function () { setActive(i); });
      });
    }

    // ── Mobile: square parks in a fixed corner (CSS-placed); active =
    //    whichever row sits at the viewport centre while you scroll. Same
    //    upward image-slide, just driven by IntersectionObserver, not hover.
    function setupMobile() {
      root.classList.add("is-touch");
      // A zero-height band across the viewport centre: the row crossing it wins.
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var idx = items.indexOf(e.target);
            if (idx >= 0) setActive(idx);
          }
        });
      }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
      items.forEach(function (it) { io.observe(it); });

      // Reveal the square only while the list itself is on screen.
      var rootIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) show(); else hide(); });
      }, { threshold: 0 });
      rootIO.observe(root);
    }

    if (canHover) setupDesktop();
    else          setupMobile();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHoverList = initHoverList;

})(typeof window !== "undefined" ? window : this);
