/*!
 * scroll-list.js v1.0.0
 * Simple pinned "sticky list" section:
 *   • LEFT  — a short list of items. GSAP pins this column in place while the
 *     right side scrolls past it. The item whose matching panel is currently
 *     in the centre of the viewport gets .is-active (Designer styles active vs
 *     inactive). Titles stay visible; each item's [data-slist-body] opens/closes
 *     like an accordion (only the active one is open). Items are clickable —
 *     click smooth-scrolls to that panel and opens its body.
 *   • RIGHT — panels in NORMAL DOCUMENT FLOW, one per item, scrolling normally.
 *     As each panel's centre crosses the viewport centre, its index becomes the
 *     active one. That's the whole trick — no track translation, no clipping,
 *     no 3D. Just pin + swap the active class.
 *
 * Optional: the active panel's <video> plays; every other panel's video is
 * paused (at most one plays at a time). Each panel may also carry hover/manual
 * controls — play/pause, restart, mute — wired below; the panel gets
 * .is-paused / .is-muted classes so Designer can swap the button icons.
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.util (js/core/utils.js).
 * CSS      : css/components/scroll-list.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-scroll-list]                  root / section (its height = the right
 *                                       column's; that's the scroll length)
 *     [data-slist-left]                 LEFT column — GSAP pins THIS
 *       [data-slist-item="0"]           one row — clickable; title always shown
 *         [data-slist-body]             the accordion part (opens when active)
 *       [data-slist-item="1"]           …
 *     [data-slist-right]                RIGHT column — scrolls normally
 *       [data-slist-panel="0"]          content block; index must match its item
 *         [data-slist-video]            optional <video muted playsinline>
 *         [data-slist-controls]           optional controls wrapper
 *           [data-slist-toggle-play]      button — play/pause
 *           [data-slist-restart]          button — restart (t=0)
 *           [data-slist-toggle-mute]      button — mute/unmute
 *       [data-slist-panel="1"]          …
 *
 * Root attributes (all optional):
 *   data-slist-trigger   where a panel counts as "active", as a ScrollTrigger
 *                        position keyword/percent (default "center")
 *   data-slist-min       min viewport width (px) to enable the pin; below it
 *                        the layout just stacks and scrolls (default 768)
 *   data-slist-open      accordion open/close duration in seconds (default 0.45)
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
    var openDur    = num(root, "data-slist-open", 0.45); // accordion open/close, s
    var reduce     = Sestek.util.prefersReducedMotion();

    // Per-item accordion body (optional per item) and per-panel video.
    var bodies = items.map(function (it) { return it.querySelector("[data-slist-body]"); });
    var videos = panels.map(function (p) { return p.querySelector("[data-slist-video]"); });

    /** Open/close one accordion body. Instant under reduced motion. */
    function setBody(el, open) {
      if (!el) return;
      if (reduce) { gsap.set(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0 }); return; }
      gsap.to(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0, duration: openDur, ease: "power2.inOut" });
    }

    // A click smooth-scrolls to a panel; while that scroll plays, panels passing
    // through the centre would otherwise steal "active". Lock it briefly so the
    // clicked item stays active until the scroll settles on it.
    var clickLockUntil = 0;

    var cur = -1;
    function setActive(i) {
      if (i === cur) return;
      cur = i;
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle("is-active", j === i);
        panels[j].classList.toggle("is-active", j === i);
        setBody(bodies[j], j === i);
      }
      videos.forEach(function (v, j) {
        if (!v) return;
        if (j === i && !reduce) v.play().catch(function () {});
        else v.pause();
      });
    }

    // Initial state — item 0 active/open, the rest collapsed — set WITHOUT a
    // tween so nothing animates on load; runtime changes go through setActive.
    cur = 0;
    items.forEach(function (it, j) {
      it.classList.toggle("is-active", j === 0);
      panels[j].classList.toggle("is-active", j === 0);
      if (bodies[j]) gsap.set(bodies[j], { height: j === 0 ? "auto" : 0, autoAlpha: j === 0 ? 1 : 0 });
    });
    if (videos[0] && !reduce) videos[0].play().catch(function () {});

    // Click an item → activate + open it, and smooth-scroll its panel to centre.
    items.forEach(function (item, i) {
      item.style.cursor = "pointer";
      item.addEventListener("click", function () {
        clickLockUntil = Date.now() + 700;
        setActive(i);
        panels[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
    });

    // Per-panel manual controls (optional). The panel gets .is-paused / .is-muted
    // so CSS can swap which icon shows. stopPropagation keeps a control click
    // from bubbling to anything that might sit around the panel.
    function syncVideoState(panel, video) {
      panel.classList.toggle("is-paused", video.paused);
      panel.classList.toggle("is-muted", video.muted);
    }
    function wireControls(panel, video) {
      if (!video) return;
      var playBtn    = panel.querySelector("[data-slist-toggle-play]");
      var restartBtn = panel.querySelector("[data-slist-restart]");
      var muteBtn    = panel.querySelector("[data-slist-toggle-mute]");

      video.addEventListener("play",  function () { syncVideoState(panel, video); });
      video.addEventListener("pause", function () { syncVideoState(panel, video); });
      syncVideoState(panel, video);

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
        syncVideoState(panel, video);
      });
    }
    panels.forEach(function (panel, i) { wireControls(panel, videos[i]); });

    // Active detection — always on (mobile + desktop, reduced-motion or not).
    // A panel is "active" while its box straddles the trigger line; because the
    // panels are contiguous, exactly one straddles it at a time. Pure class
    // toggles in the callback — nothing measured per scroll frame.
    panels.forEach(function (panel, i) {
      ScrollTrigger.create({
        trigger: panel,
        start: "top " + triggerPos,
        end: "bottom " + triggerPos,
        onToggle: function (self) {
          if (!self.isActive) return;
          if (Date.now() < clickLockUntil) return; // don't fight a click scroll
          setActive(i);
        },
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
