/*!
 * hover-list.js v3.0.0
 * Editorial link list with in-place row visuals (Work AI Institute-style):
 *   • Each row is a full-width link. Hovering a row flips it (and its icons/
 *     labels / a hidden arrow) to an active state — CSS via :hover / .is-active.
 *   • Each row carries its OWN visual [data-hlist-vis], sitting in the row's
 *     layout slot. Activating a row reveals its visual with an upward settle;
 *     the previous one clears. Because the visual lives in the layout, its
 *     position/size come from CSS on every screen — no JS placement, no drift.
 *
 * Switching between rows works exactly as before — only the motion is simpler:
 * the visual appears in its own slot instead of a single frame gliding around.
 *
 * Reveals are transform + opacity only (GPU-composited). prefers-reduced-motion
 * collapses them to instant.
 *
 * Desktop (hover): active row = the hovered row.
 * Mobile / touch : active row = whichever sits at the viewport centre while you
 *                  scroll (IntersectionObserver). Same in-place reveal.
 *
 * Requires : gsap registered.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-hover-list]                   root / list
 *     [data-hlist-item]                 a row — should be (or wrap) an <a>
 *       …labels / icons…                  style .is-active states in CSS
 *       [data-hlist-arrow]               optional — hidden arrow, shown on hover
 *       [data-hlist-vis]                 this row's visual (image/video), in its
 *                                        layout slot. Wrap in overflow:hidden for
 *                                        a hard clipped slide (optional).
 *
 * Root attributes (all optional):
 *   data-hlist-reveal   reveal duration in seconds (default 0.55)
 *   data-hlist-rise     enter offset in px         (default 40)
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

    var items = Array.from(root.querySelectorAll("[data-hlist-item]"));
    if (!items.length) {
      console.warn("[Sestek HoverList] Need [data-hlist-item] rows."); return;
    }
    // Each row's own visual (in its layout slot). Rows may omit it.
    var vises = items.map(function (it) { return it.querySelector("[data-hlist-vis]"); });

    var revealDur = num(root, "data-hlist-reveal", 0.55);
    var rise      = num(root, "data-hlist-rise", 40);
    var canHover  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduce    = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { revealDur = 0.001; rise = 0; }

    var curIdx = -1;
    var live   = vises.filter(Boolean);

    // Hidden until their row is active.
    gsap.set(live, { autoAlpha: 0 });

    /** Reveal a visual: settles up into place. */
    function reveal(el) {
      gsap.fromTo(el,
        { yPercent: 0, y: rise, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: revealDur, ease: "power3.out", overwrite: true });
    }
    /** Clear a visual: lifts + fades out. */
    function conceal(el) {
      gsap.to(el, { y: -rise * 0.6, autoAlpha: 0, duration: reduce ? 0.001 : 0.35, ease: "power2.in", overwrite: true });
    }

    /** Mark active row + swap the in-place visual. */
    function setActive(idx) {
      if (idx === curIdx) return;
      var prev = curIdx;
      curIdx = idx;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
      }
      if (vises[prev]) conceal(vises[prev]);
      if (vises[idx])  reveal(vises[idx]);
    }

    /** Clear the active row entirely (pointer left the list). */
    function deactivate() {
      if (curIdx < 0) return;
      for (var i = 0; i < items.length; i++) items[i].classList.remove("is-active");
      if (vises[curIdx]) conceal(vises[curIdx]);
      curIdx = -1;
    }

    // ── Desktop: active = hovered row ─────────────────────────────
    function setupDesktop() {
      items.forEach(function (item, i) {
        item.addEventListener("pointerenter", function () { setActive(i); });
      });
      root.addEventListener("pointerleave", deactivate);
    }

    // ── Mobile: active = row at the viewport centre while scrolling ─
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
    }

    if (canHover) setupDesktop();
    else          setupMobile();
  }

  /**
   * Initializes every hover list on the page in one call.
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
