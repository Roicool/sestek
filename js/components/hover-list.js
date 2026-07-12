/*!
 * hover-list.js v2.2.0
 * Editorial link list with a rail-locked image (Work AI Institute-style):
 *   • Each row is a full-width link. Hovering a row flips it (and its icons/
 *     labels / a hidden arrow) to an active state — handled in CSS via
 *     :hover / .is-active.
 *   • A single square visual is locked to a fixed X (right side, CSS-placed)
 *     and only moves on the Y axis to line up with the active row. It does NOT
 *     follow the mouse. Moving between rows glides the square vertically and
 *     slides the IMAGE inside upward to swap (the frame just repositions).
 *
 * Movement + swaps are transform + opacity only (GPU-composited), eased with
 * gsap.quickTo. prefers-reduced-motion collapses all of it to instant.
 *
 * Mobile / touch (no hover): the square parks in a fixed corner and the
 * active row becomes whichever one sits at the viewport centre while you
 * scroll (IntersectionObserver) — same upward image-slide.
 *
 * Requires : gsap registered.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-hover-list]                   root / list (position:relative)
 *     [data-hlist-item="0"]             a row — should be (or wrap) an <a>
 *       …labels / icons…                  style .is-active states in CSS
 *       [data-hlist-arrow]               optional — hidden arrow, shown on hover
 *     [data-hlist-item="1"]             …
 *     [data-hlist-cursor]               the square (X fixed via CSS, Y by JS)
 *       [data-hlist-media]              overflow-hidden square window
 *         [data-hlist-vis="0"]           image layer for item 0 (index matches)
 *         [data-hlist-vis="1"]           image layer for item 1
 *
 * Root attributes (all optional):
 *   data-hlist-follow   Y-glide easing in seconds        (default 0.4)
 *   data-hlist-slide    image slide duration in seconds  (default 0.55)
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

  /** Build one list instance. */
  function build(root) {
    if (root._hoverListInit) return;                       // idempotent
    root._hoverListInit = true;

    var items  = Array.from(root.querySelectorAll("[data-hlist-item]"));
    var cursor = root.querySelector("[data-hlist-cursor]");

    if (!items.length) {
      console.warn("[Sestek HoverList] Need [data-hlist-item] rows."); return;
    }
    if (!cursor) return;                                   // no visual → plain links

    // Single-collection friendly: the per-item image [data-hlist-vis] may live
    // INSIDE each row (one CMS Collection List). Collect them in document order
    // (= row order → index matches) and relocate them into the shared square
    // window so they can stack + slide. Works too if they're already in place.
    var media = cursor.querySelector("[data-hlist-media]") || cursor;
    var vises = Array.from(root.querySelectorAll("[data-hlist-vis]"));
    vises.forEach(function (v) { media.appendChild(v); });

    var followDur = num(root, "data-hlist-follow", 0.4);
    var slideDur  = num(root, "data-hlist-slide", 0.55);
    var canHover  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Respect prefers-reduced-motion: kill the glide, the scale pop and the
    // image slide — the square jumps and images swap instantly.
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { followDur = 0.001; slideDur = 0.001; }

    var curIdx  = -1;
    var visible = false;

    // Image layers stacked; all parked below the window until activated.
    gsap.set(vises, { position: "absolute", inset: 0, yPercent: 100 });
    gsap.set(cursor, { autoAlpha: 0, scale: reduce ? 1 : 0.85, pointerEvents: "none" });

    function show() {
      if (visible) return;
      visible = true;
      gsap.to(cursor, { autoAlpha: 1, scale: 1, duration: reduce ? 0.001 : 0.4, ease: "power3.out" });
    }
    function hide() {
      if (!visible) return;
      visible = false;
      gsap.to(cursor, { autoAlpha: 0, scale: reduce ? 1 : 0.85, duration: reduce ? 0.001 : 0.35, ease: "power2.in" });
    }

    /** Swap to layer idx: outgoing slides up & out, incoming slides up in. */
    function slideImage(idx, prev) {
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

    /** Mark active row + swap the image. Y-positioning is per-mode (below). */
    function setActive(idx) {
      if (idx === curIdx) return;
      var prev = curIdx;
      curIdx = idx;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
      }
      slideImage(idx, prev);
    }

    // ── Desktop: X fixed (CSS), square glides on Y to the hovered row ─────
    function setupDesktop() {
      var toY = gsap.quickTo(cursor, "y", { duration: followDur, ease: "power3" });
      var placed = false;

      /** Y so the square's centre lines up with row idx's centre. */
      function moveTo(idx, instant) {
        var it = items[idx];
        if (!it) return;
        var y = it.offsetTop + it.offsetHeight / 2 - cursor.offsetHeight / 2;
        if (instant) gsap.set(cursor, { y: y }); else toY(y);
      }

      root.addEventListener("pointerenter", show);
      root.addEventListener("pointerleave", function () {
        hide();
        for (var i = 0; i < items.length; i++) items[i].classList.remove("is-active");
        curIdx = -1; placed = false;
      });
      items.forEach(function (item, i) {
        item.addEventListener("pointerenter", function () {
          moveTo(i, !placed);            // first entry: jump, don't glide from top
          placed = true;
          setActive(i);
        });
      });

      // Keep the resting Y correct if the layout reflows.
      window.addEventListener("resize", function () {
        if (curIdx >= 0) moveTo(curIdx, true);
      });
    }

    // ── Mobile: square parks in a fixed corner (CSS .is-touch); active =
    //    whichever row sits at the viewport centre while scrolling. ─────────
    function setupMobile() {
      root.classList.add("is-touch");
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var idx = items.indexOf(e.target);
            if (idx >= 0) setActive(idx);
          }
        });
      }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
      items.forEach(function (it) { io.observe(it); });

      var rootIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) show(); else hide(); });
      }, { threshold: 0 });
      rootIO.observe(root);
    }

    if (canHover) setupDesktop();
    else          setupMobile();
  }

  /**
   * Initializes every rail-locked hover list on the page in one call.
   * @param {string} [selector="[data-hover-list]"] narrow the scope if needed
   */
  function initHoverList(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek HoverList] GSAP required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-hover-list]");
    if (!roots.length) { console.warn("[Sestek HoverList] No [data-hover-list] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHoverList = initHoverList;

})(typeof window !== "undefined" ? window : this);
