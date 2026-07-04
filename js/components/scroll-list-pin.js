/*!
 * scroll-list-pin.js v1.0.0
 * Pinned "captured scroll" variant of scroll-list — the SAME DOM contract, but a
 * more cinematic feel: the whole section pins to the viewport and, as you scroll,
 * the scrub drives through the items. The left list stays put (it's inside the
 * pinned section), its active item's [data-slist-body] opens like an accordion,
 * and on the right the matching panel cross-fades + slides in over the previous
 * one. Optional snap settles on each item.
 *
 * This is the alternative to the CSS-sticky scroll-list.js — use ONE of the two,
 * with its matching CSS. Pin genuinely needs GSAP; if gsap/ScrollTrigger are
 * absent, or prefers-reduced-motion is set, it degrades to a plain stacked list
 * (no pin, first item open, click to jump).
 *
 * Requires : gsap + ScrollTrigger.
 * CSS      : css/components/scroll-list-pin.css
 *
 * DOM contract — identical to scroll-list.js:
 *   [data-scroll-list]                  root / section (pinned)
 *     [data-slist-left]                 LEFT column (stays in the pinned section)
 *       [data-slist-item="0"]             clickable row; title always shown
 *         [data-slist-body]               accordion part (opens when active)
 *     [data-slist-right]                RIGHT column
 *       [data-slist-panel="0"]            panels are stacked (CSS); index matches
 *         [data-slist-video]              optional <video>
 *         [data-slist-controls] …         optional controls (see scroll-list.js)
 *
 * Root attributes (all optional):
 *   data-slist-end     pin scroll distance                 (default "300%")
 *   data-slist-scrub   scrub lag in seconds                (default 0.6)
 *   data-slist-snap    "false" to disable snap-to-item     (default true)
 *   data-slist-open    accordion open/close seconds        (default 0.45)
 *   data-slist-ease    ease for the panel cross-fade       (default "power2.out")
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

  function initScrollListPin(selector) {
    var root = document.querySelector(selector || "[data-scroll-list]");
    if (!root) { console.warn("[Sestek ScrollListPin] No [data-scroll-list] found."); return; }
    if (root._scrollListPinInit) return;
    root._scrollListPinInit = true;

    var left   = root.querySelector("[data-slist-left]");
    var items  = Array.from(root.querySelectorAll("[data-slist-item]"));
    var panels = Array.from(root.querySelectorAll("[data-slist-panel]"));

    if (!left) { console.warn("[Sestek ScrollListPin] [data-slist-left] is required."); return; }
    if (items.length < 2 || panels.length !== items.length) {
      console.warn("[Sestek ScrollListPin] Need >=2 matching [data-slist-item]/[data-slist-panel]. " +
        "Found " + items.length + " items, " + panels.length + " panels.");
      return;
    }

    var openDur = attrNum(root, "data-slist-open", 0.45);
    var reduce  = reducedMotion();
    var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

    var bodies = items.map(function (it) { return it.querySelector("[data-slist-body]"); });
    var videos = panels.map(function (p) { return p.querySelector("[data-slist-video]"); });

    // ── Video controls (shared with the sticky variant) ──────────────
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
        if (video.paused) video.play().catch(function () {}); else video.pause();
      });
      if (restartBtn) restartBtn.addEventListener("click", function (e) {
        e.stopPropagation(); video.currentTime = 0; video.play().catch(function () {});
      });
      if (muteBtn) muteBtn.addEventListener("click", function (e) {
        e.stopPropagation(); video.muted = !video.muted; syncVideoState(panel, video);
      });
    });

    function setBody(el, open, instant) {
      if (!el) return;
      if (hasGsap && !reduce && !instant) {
        gsap.to(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0, duration: openDur, ease: "power2.inOut" });
      } else if (hasGsap) {
        gsap.set(el, { height: open ? "auto" : 0, autoAlpha: open ? 1 : 0 });
      } else {
        el.style.height = open ? "auto" : "0px";
        el.style.opacity = open ? "1" : "0";
        el.style.visibility = open ? "visible" : "hidden";
      }
    }

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

    // ── Graceful fallback: no pin (reduced motion or no GSAP) ─────────
    // Stacked list, first item open, click to jump. Same as the sticky variant
    // minus the scroll magic — nothing breaks, it just doesn't animate.
    if (!hasGsap || reduce) {
      root.classList.add("is-static");
      setActive(0, true);
      items.forEach(function (item, i) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () {
          setActive(i);
          panels[i].scrollIntoView({ behavior: "auto", block: "center" });
        });
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var endDist = root.getAttribute("data-slist-end") || "300%";
    var scrub   = attrNum(root, "data-slist-scrub", 0.6);
    var snapOn  = root.getAttribute("data-slist-snap") !== "false";
    var ease    = root.getAttribute("data-slist-ease") || "power2.out";
    var n       = items.length;

    // Panels are absolutely stacked (CSS). Start with panel 0 shown.
    gsap.set(panels, { autoAlpha: 0, yPercent: 6 });
    gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 });
    setActive(0, true);

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=" + endDist,
        pin: true,
        scrub: scrub,
        snap: snapOn ? { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.6 }, ease: "power2.inOut" } : false,
        onUpdate: function (self) {
          setActive(Math.round(self.progress * (n - 1)));
        },
      },
      defaults: { ease: ease },
    });

    // One unit per transition: the incoming panel fades/slides up over the
    // outgoing one. Scrubbed both ways, so reverse is automatic.
    for (var i = 1; i < n; i++) {
      tl.fromTo(panels[i], { autoAlpha: 0, yPercent: 6 }, { autoAlpha: 1, yPercent: 0, duration: 1 }, i - 1);
      tl.to(panels[i - 1], { autoAlpha: 0, yPercent: -6, duration: 1 }, i - 1);
    }

    // Clicking an item scrolls to that item's slice of the pinned range.
    var st = tl.scrollTrigger;
    items.forEach(function (item, i) {
      item.style.cursor = "pointer";
      item.addEventListener("click", function () {
        var p = (n === 1) ? 0 : i / (n - 1);
        var y = st.start + (st.end - st.start) * p;
        window.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollListPin = initScrollListPin;

})(typeof window !== "undefined" ? window : this);
