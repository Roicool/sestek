/*!
 * scroll-list.js v2.1.0
 *
 * Changelog
 * v2.1.0 — MOBILE MODE. Below the breakpoint where the CSS stops the left
 *          column being sticky (≤767.98px, override with data-slist-mobile-bp)
 *          the list sits ABOVE the panels, so opening/closing an accordion body
 *          up there changed the height of everything above the panel the user
 *          was actually looking at — the page jumped under the finger while
 *          scrolling (worse on iOS, where the URL-bar resize piles on). In
 *          mobile mode every body stays open, nothing animates height, and
 *          only .is-active + video play/pause follow the scroll. Switching
 *          across the breakpoint re-applies the right state both ways.
 *
 * Simple "sticky list" section — left column stays put while the right scrolls:
 *   • LEFT  — a short list of items. It is held in place with CSS position:sticky
 *     (see scroll-list.css) — NOT a GSAP pin. Pinning a grid child is fragile;
 *     sticky is the reliable way to get "left fixed, right scrolls".
 *   • RIGHT — panels in normal flow, one per item, scrolling normally. The panel
 *     currently crossing the centre of the viewport is the active one; its item
 *     gets .is-active, its [data-slist-body] opens like an accordion (the rest
 *     collapse), and its optional <video> plays.
 *
 * Active detection uses IntersectionObserver (a zero-height band at the viewport
 * centre) — no dependency on ScrollTrigger or the scroll library's sync, so it
 * "just works" with Lenis or native scroll. GSAP is used ONLY to animate the
 * accordion open/close when it happens to be loaded; without it, bodies still
 * open/close, just instantly.
 *
 * Items are clickable (smooth-scroll to their panel). Controls (play/pause,
 * restart, mute) inside a panel are wired if present; the panel gets
 * .is-paused / .is-muted so Designer can swap the button icons.
 *
 * Requires : nothing hard. Optional: gsap (accordion animation).
 * CSS      : css/components/scroll-list.css  (this is where the sticky lives)
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-scroll-list]                  root / section
 *     [data-slist-left]                 LEFT column — CSS keeps this sticky
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
 *   data-slist-open       accordion open/close duration in seconds (default 0.45)
 *   data-slist-mobile-bp  px; at/below this width the list is stacked above the
 *                         panels → no accordion, all bodies open (default 767.98,
 *                         keep in sync with the media query in scroll-list.css)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function attrNum(el, attr, fb) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fb;
    var v = parseFloat(raw);
    return isNaN(v) ? fb : v;
  }
  function reducedMotion() {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function initScrollList(selector) {
    var root = document.querySelector(selector || "[data-scroll-list]");
    if (!root) { console.warn("[Sestek ScrollList] No [data-scroll-list] found."); return; }
    if (root._scrollListInit) return;
    root._scrollListInit = true;

    var left   = root.querySelector("[data-slist-left]");
    var items  = Array.from(root.querySelectorAll("[data-slist-item]"));
    var panels = Array.from(root.querySelectorAll("[data-slist-panel]"));

    if (!left) { console.warn("[Sestek ScrollList] [data-slist-left] is required."); return; }
    if (items.length < 2 || panels.length !== items.length) {
      console.warn("[Sestek ScrollList] Need >=2 matching [data-slist-item]/[data-slist-panel]. " +
        "Found " + items.length + " items, " + panels.length + " panels.");
      return;
    }

    var openDur  = attrNum(root, "data-slist-open", 0.45);
    var mobileBp = attrNum(root, "data-slist-mobile-bp", 767.98);
    var reduce   = reducedMotion();
    var hasGsap  = typeof gsap !== "undefined";

    var bodies = items.map(function (it) { return it.querySelector("[data-slist-body]"); });
    var videos = panels.map(function (p) { return p.querySelector("[data-slist-video]"); });

    // Mobile = the list is stacked above the panels (CSS drops the sticky).
    // Accordion height changes up there would shift the panels under the
    // user's finger, so in this mode every body stays open and nothing
    // animates height.
    var mobileMq = typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: " + mobileBp + "px)") : null;
    var isMobile = !!(mobileMq && mobileMq.matches);
    root.classList.toggle("is-slist-mobile", isMobile);

    /** Open/close one accordion body. Animated with GSAP when present, else instant. */
    function setBody(el, open, instant) {
      if (!el) return;
      if (isMobile) open = true;                          // no accordion on mobile
      if (hasGsap && !reduce && !instant) {
        gsap.to(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0, duration: openDur, ease: "power2.inOut" });
      } else if (hasGsap) {
        gsap.set(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0 });
      } else {
        el.style.height     = open ? "auto" : "0px";
        el.style.opacity    = open ? "1" : "0";
        el.style.visibility = open ? "visible" : "hidden";
      }
    }

    var clickLockUntil = 0;
    var cur = -1;

    function setActive(i, instant) {
      if (i === cur) return;
      cur = i;
      for (var j = 0; j < items.length; j++) {
        items[j].classList.toggle("is-active", j === i);
        panels[j].classList.toggle("is-active", j === i);
        setBody(bodies[j], j === i, instant);
      }
      videos.forEach(function (v, j) {
        if (!v) return;
        if (j === i && !reduce) v.play().catch(function () {});
        else v.pause();
      });
    }

    // Initial state — item 0 active/open, rest collapsed, set instantly.
    setActive(0, true);

    // Crossing the mobile breakpoint (rotation, resize): re-apply the bodies
    // for the new mode without animating — all open on mobile, accordion
    // (only the active one open) on desktop/tablet.
    if (mobileMq) {
      var onMq = function (e) {
        isMobile = e.matches;
        root.classList.toggle("is-slist-mobile", isMobile);
        for (var j = 0; j < items.length; j++) setBody(bodies[j], j === cur, true);
      };
      if (mobileMq.addEventListener) mobileMq.addEventListener("change", onMq);
      else if (mobileMq.addListener) mobileMq.addListener(onMq); // Safari < 14
    }

    // Click an item → activate + open it, and smooth-scroll its panel to centre.
    items.forEach(function (item, i) {
      item.style.cursor = "pointer";
      item.addEventListener("click", function () {
        clickLockUntil = Date.now() + 700;
        setActive(i);
        // Mobile: the panel is below the list — bring its TOP into view, not
        // its centre (a centred tall panel would start above the fold).
        panels[i].scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: isMobile ? "start" : "center",
        });
      });
    });

    // Optional per-panel manual controls. Panel gets .is-paused / .is-muted.
    function syncVideoState(panel, video) {
      panel.classList.toggle("is-paused", video.paused);
      panel.classList.toggle("is-muted", video.muted);
    }
    panels.forEach(function (panel) {
      var video = panel.querySelector("[data-slist-video]");
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
    });

    // Active detection — a zero-height band at the viewport centre. Whichever
    // panel straddles it is active. IntersectionObserver, so this is independent
    // of GSAP/Lenis timing. (The sticky left column is pure CSS — no JS pin.)
    var io = new IntersectionObserver(function (entries) {
      if (Date.now() < clickLockUntil) return; // don't fight a click scroll
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var i = panels.indexOf(entry.target);
        if (i !== -1) setActive(i);
      });
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });

    panels.forEach(function (p) { io.observe(p); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollList = initScrollList;

})(typeof window !== "undefined" ? window : this);
