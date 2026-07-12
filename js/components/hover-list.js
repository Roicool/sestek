/*!
 * hover-list.js v4.2.0
 * Editorial link list with a mouse-following preview (Work AI Institute-style):
 *   • Each row is a full-width link. Hovering a row flips it (and its icons /
 *     labels / a hidden arrow) to an active state — CSS via :hover / .is-active.
 *   • A single follower square is locked to a fixed X (CSS) and tracks the mouse
 *     on the Y axis. Each row holds a source visual [data-hlist-vis]; on enter,
 *     that visual is CLONED into the follower and slides in — direction-aware:
 *     going DOWN the list it enters from below (previous slides up & out), going
 *     UP it enters from above. Leaving the list clears it.
 *
 * All motion is transform + opacity (GPU-composited); the follow is smoothed
 * with gsap.quickTo. prefers-reduced-motion collapses it to instant swaps.
 *
 * Mobile / touch (no mouse): the follower parks in a fixed corner and the active
 * row becomes whichever sits at the viewport centre while scrolling — same
 * direction-aware clone slide, driven by IntersectionObserver.
 *
 * Requires : gsap registered.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-hover-list]                   root / wrap (position:relative)
 *     [data-hlist-collection]           optional — the list container (clears on
 *                                       its mouseleave); defaults to the root
 *       [data-hlist-item]               a row — should be (or wrap) an <a>
 *         …labels / icons…                style .is-active states in CSS
 *         [data-hlist-arrow]             optional — hidden arrow, shown on hover
 *         [data-hlist-vis]               this row's SOURCE visual (cloned; hidden
 *                                        in the row by CSS, shown in the follower)
 *     [data-hlist-cursor]               the follower (X: CSS inset, Y: mouse)
 *       [data-hlist-cursor-inner]       overflow-hidden window; clones land here
 *
 * Root attributes (all optional):
 *   data-hlist-slide    slide duration in seconds     (default 0.5)
 *   data-hlist-follow   Y-follow smoothing in seconds (default 0.6)
 *   data-hlist-offset   enter/exit offset in %        (default 100)
 *   data-hlist-ease     slide ease                    (default "power2.inOut")
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

    var items    = Array.from(root.querySelectorAll("[data-hlist-item]"));
    var follower = root.querySelector("[data-hlist-cursor]");
    var inner    = root.querySelector("[data-hlist-cursor-inner]") || follower;
    var listEl   = root.querySelector("[data-hlist-collection]") || root;

    if (!items.length) {
      console.warn("[Sestek HoverList] Need [data-hlist-item] rows."); return;
    }
    if (!follower) return;                                 // no follower → plain links

    var slideDur  = num(root, "data-hlist-slide", 0.5);
    var followDur = num(root, "data-hlist-follow", 0.6);
    var offset    = num(root, "data-hlist-offset", 100);
    var ease      = root.getAttribute("data-hlist-ease") || "power2.inOut";
    var canHover  = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduce    = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { slideDur = 0.001; followDur = 0.001; offset = 0; }

    var prevIndex  = null;
    var firstEntry = true;

    gsap.set(follower, { autoAlpha: 0 });

    /** Clones currently living in the follower window. */
    function clones() { return inner.querySelectorAll("[data-hlist-vis]"); }

    /** Slide every current clone out (up or down) then drop it. */
    function slideOut(dir) {
      clones().forEach(function (el) {
        gsap.killTweensOf(el);
        gsap.to(el, {
          yPercent: dir * offset, duration: slideDur, ease: ease, overwrite: "auto",
          onComplete: function () { el.remove(); },
        });
      });
    }

    /** Activate row index: clone its visual in, slide the old one out. */
    function goTo(index) {
      if (index === prevIndex) return;
      var forward = prevIndex === null || index > prevIndex;
      prevIndex = index;

      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === index);
      }

      slideOut(forward ? -1 : 1);                          // out: fwd→up, back→down

      var src = items[index].querySelector("[data-hlist-vis]");
      if (!src) return;
      var clone = src.cloneNode(true);
      inner.appendChild(clone);

      if (firstEntry) { firstEntry = false; gsap.set(clone, { yPercent: 0 }); }
      else {
        gsap.fromTo(clone,
          { yPercent: forward ? offset : -offset },        // in: fwd from below, back from above
          { yPercent: 0, duration: slideDur, ease: ease, overwrite: "auto" });
      }
    }

    /** Clear everything (pointer left the list). */
    function clearAll() {
      slideOut(-1);
      for (var i = 0; i < items.length; i++) items[i].classList.remove("is-active");
      prevIndex = null;
      firstEntry = true;
    }

    function show() { gsap.to(follower, { autoAlpha: 1, duration: reduce ? 0.001 : 0.3 }); }
    function hide() { gsap.to(follower, { autoAlpha: 0, duration: reduce ? 0.001 : 0.3 }); }

    // ── Desktop: follower tracks the mouse on Y, active = hovered row ─────
    function setupDesktop() {
      gsap.set(follower, { yPercent: -50 });               // centre on the cursor Y
      var yTo = gsap.quickTo(follower, "y", { duration: followDur, ease: "power3" });

      root.addEventListener("mousemove", function (e) {
        var rect = root.getBoundingClientRect();
        yTo(e.clientY - rect.top);
      });
      root.addEventListener("pointerenter", show);

      items.forEach(function (item, i) {
        item.addEventListener("mouseenter", function () { goTo(i); });
      });
      listEl.addEventListener("mouseleave", function () { clearAll(); hide(); });
    }

    // ── Mobile: follower parks in a fixed corner (CSS .is-touch); active =
    //    whichever row sits at the viewport centre while scrolling. ─────────
    function setupMobile() {
      root.classList.add("is-touch");
      show();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            var idx = items.indexOf(e.target);
            if (idx >= 0) goTo(idx);
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
