/*!
 * scroll-list.js v1.0.0
 * Simple pinned "sticky list" section:
 *   • LEFT  — a short list of items. GSAP pins this column in place while the
 *     right side scrolls past it. The item whose matching panel is currently
 *     in the centre of the viewport gets .is-active (Designer styles active vs
 *     inactive — highlight, show/hide description, whatever).
 *   • RIGHT — panels in NORMAL DOCUMENT FLOW, one per item, scrolling normally.
 *     As each panel's centre crosses the viewport centre, its index becomes the
 *     active one. That's the whole trick — no track translation, no clipping,
 *     no 3D. Just pin + swap the active class.
 *
 * Optional: the active panel's <video> plays; every other panel's video is
 * paused (at most one plays at a time). Plain <video> here; if you prefer the
 * inline-video library, drop this and use its data-video-scroll-in-play.
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.util (js/core/utils.js).
 * CSS      : css/components/scroll-list.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-scroll-list]                  root / section (its height = the right
 *                                       column's; that's the scroll length)
 *     [data-slist-left]                 LEFT column — GSAP pins THIS
 *       [data-slist-item="0"]           one row (title + desc + CTA…)
 *       [data-slist-item="1"]           …
 *     [data-slist-right]                RIGHT column — scrolls normally
 *       [data-slist-panel="0"]          content block; index must match its item
 *         [data-slist-video]            optional <video muted playsinline>
 *       [data-slist-panel="1"]          …
 *
 * Root attributes (all optional):
 *   data-slist-trigger   where a panel counts as "active", as a ScrollTrigger
 *                        position keyword/percent (default "center")
 *   data-slist-min       min viewport width (px) to enable the pin; below it
 *                        the layout just stacks and scrolls (default 768)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function initScrollList(selector) {
    var root = document.querySelector(selector || "[data-scroll-list]");
    if (!root) { console.warn("[Sestek ScrollList] No [data-scroll-list] found."); return; }
    if (root._scrollListInit) return;
    root._scrollListInit = true;

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ScrollList] GSAP + ScrollTrigger required."); return;
    }
    if (typeof Sestek === "undefined" || typeof Sestek.util === "undefined") {
      console.error("[Sestek ScrollList] Sestek.util required (load js/core/utils.js)."); return;
    }

    gsap.registerPlugin(ScrollTrigger);
    var num = Sestek.util.attrNum;

    var left   = root.querySelector("[data-slist-left]");
    var items  = Array.from(root.querySelectorAll("[data-slist-item]"));
    var panels = Array.from(root.querySelectorAll("[data-slist-panel]"));

    if (!left) { console.warn("[Sestek ScrollList] [data-slist-left] is required."); return; }
    if (items.length < 2 || panels.length !== items.length) {
      console.warn("[Sestek ScrollList] Need >=2 matching [data-slist-item]/[data-slist-panel].");
      return;
    }

    var triggerPos = root.getAttribute("data-slist-trigger") || "center";
    var minWidth   = num(root, "data-slist-min", 768);
    var reduce     = Sestek.util.prefersReducedMotion();

    // Optional per-panel video — at most one plays at a time (the active one).
    var videos = panels.map(function (p) { return p.querySelector("[data-slist-video]"); });

    var cur = -1;
    function setActive(i) {
      if (i === cur) return;
      cur = i;
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle("is-active", j === i);
        panels[j].classList.toggle("is-active", j === i);
      }
      videos.forEach(function (v, j) {
        if (!v) return;
        if (j === i && !reduce) v.play().catch(function () {});
        else v.pause();
      });
    }

    setActive(0);

    // Active detection — always on (mobile + desktop, reduced-motion or not).
    // A panel is "active" while its box straddles the trigger line; because the
    // panels are contiguous, exactly one straddles it at a time. Pure class
    // toggles in the callback — nothing measured per scroll frame.
    panels.forEach(function (panel, i) {
      ScrollTrigger.create({
        trigger: panel,
        start: "top " + triggerPos,
        end: "bottom " + triggerPos,
        onToggle: function (self) { if (self.isActive) setActive(i); },
      });
    });

    // Pin the LEFT column for the length of the section — desktop only. On
    // narrower screens (or reduced motion) we don't pin; the section just
    // stacks and scrolls, and .is-static lets CSS fall back to position:sticky.
    var mm = gsap.matchMedia();

    if (reduce) {
      root.classList.add("is-static");
    } else {
      mm.add("(min-width: " + minWidth + "px)", function () {
        var pin = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          pin: left,
          pinSpacing: false,
          refreshPriority: 1,
        });
        // matchMedia auto-reverts this cleanup when the query stops matching.
        return function () { pin.kill(); };
      });

      mm.add("(max-width: " + (minWidth - 0.02) + "px)", function () {
        root.classList.add("is-static");
        return function () { root.classList.remove("is-static"); };
      });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollList = initScrollList;

})(typeof window !== "undefined" ? window : this);
