/*!
 * height-reveal.js v1.1.0
 * Reusable "Webflow-style" height swap — one element collapses (height → 0)
 * while another grows (0 → auto). GPU-light, single source of truth for the
 * site-wide content-swap look.
 *
 * Two ways to use it:
 *   1. Sestek.heightReveal(outEl, inEl, opts)   — programmatic, returns a timeline
 *   2. Sestek.initHeightReveal()                 — declarative, scans
 *      [data-height-reveal] groups and wires click / auto swapping (no JS needed)
 *
 * Requires: gsap registered (CSSPlugin ships with gsap core).
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Builds a timeline that swaps two stacked elements by animating their height.
   *
   *   outEl : height (current) → 0, fades out      — the element leaving
   *   inEl  : height 0 → inHeight (or "auto"), fades in — the element arriving
   *
   * Both run on the SAME timeline at position 0 so the collapse and the grow
   * happen together (the classic "one drops, the other rises" feel).
   *
   * @param {HTMLElement}  outEl              element to collapse (may be null)
   * @param {HTMLElement}  inEl               element to reveal (may be null)
   * @param {object}       [opts]
   * @param {number}       [opts.duration=0.5]
   * @param {string}       [opts.ease="power2.inOut"]
   * @param {number|string}[opts.inHeight="auto"]  explicit target height in px
   *                        (recommended inside scrubbed timelines to avoid
   *                         re-measuring "auto" on every tick)
   * @returns {gsap.core.Timeline}
   */
  function heightReveal(outEl, inEl, opts) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek heightReveal] GSAP required.");
      return null;
    }

    var o = opts || {};
    var duration = typeof o.duration === "number" ? o.duration : 0.5;
    var ease = o.ease || "power2.inOut";
    var inHeight = o.inHeight != null ? o.inHeight : "auto";

    var tl = gsap.timeline();

    if (outEl) {
      tl.to(outEl, {
        height: 0,
        autoAlpha: 0,
        ease: ease,
        duration: duration,
        onStart: function () { outEl.style.willChange = "height"; },
        onComplete: function () { outEl.style.willChange = "auto"; },
        // reverse (scrub-back) also restores will-change cleanly
        onReverseComplete: function () { outEl.style.willChange = "auto"; },
      }, 0);
    }

    if (inEl) {
      tl.fromTo(inEl,
        { height: 0, autoAlpha: 0 },
        {
          height: inHeight,
          autoAlpha: 1,
          ease: ease,
          duration: duration,
          onStart: function () { inEl.style.willChange = "height"; },
          onComplete: function () { inEl.style.willChange = "auto"; },
          onReverseComplete: function () { inEl.style.willChange = "auto"; },
        }, 0);
    }

    return tl;
  }

  /**
   * Measures the natural (auto) pixel height of an element without leaving a
   * visible flash. Useful before locking elements to height:0 in a build step.
   * @param {HTMLElement} el
   * @returns {number} height in px
   */
  function measureAutoHeight(el) {
    if (!el) return 0;
    var prevHeight = el.style.height;
    var prevVis = el.style.visibility;
    el.style.height = "auto";
    var h = el.offsetHeight;
    el.style.height = prevHeight;
    el.style.visibility = prevVis;
    return h;
  }

  /** Parse a numeric data-attribute with a fallback. */
  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Declarative, data-attribute driven height-reveal groups — no JS needed.
   *
   * Group element  [data-height-reveal] supports:
   *   data-hr-duration  swap duration in seconds      (default 0.5)
   *   data-hr-ease      ease for the swap             (default "power2.inOut")
   *   data-hr-trigger   "click" | "auto"             (default "click")
   *   data-hr-interval  auto-cycle interval in ms     (default 4000, "auto" only)
   *
   * Inside the group:
   *   [data-hr-item]        the stacked panels to swap (one visible at a time);
   *                          mark the starting one with class "is-active"
   *   [data-hr-to="i"]      a trigger (button/tab) that swaps to item i on click;
   *                          gets an "is-active" class mirroring the active item
   *
   * @param {string} [selector="[data-height-reveal]"]
   * @returns {Array<{el:HTMLElement, to:function, stop:function}>} group APIs
   */
  function initHeightReveal(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek initHeightReveal] GSAP required.");
      return [];
    }

    var groups = Array.from(document.querySelectorAll(selector || "[data-height-reveal]"));
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var instances = [];

    groups.forEach(function (group) {
      var items = Array.from(group.querySelectorAll("[data-hr-item]"));
      if (items.length < 2) return; // nothing to swap

      var duration = attrNum(group, "data-hr-duration", 0.5);
      var ease = group.getAttribute("data-hr-ease") || "power2.inOut";
      var trigger = group.getAttribute("data-hr-trigger") || "click";
      var interval = attrNum(group, "data-hr-interval", 4000);

      // Starting active item (first with .is-active, else index 0)
      var active = 0;
      items.forEach(function (el, i) { if (el.classList.contains("is-active")) active = i; });

      // Lock initial heights
      items.forEach(function (el, i) {
        el.style.overflow = "hidden";
        gsap.set(el, i === active ? { height: "auto", autoAlpha: 1 } : { height: 0, autoAlpha: 0 });
        el.classList.toggle("is-active", i === active);
      });

      var triggers = Array.from(group.querySelectorAll("[data-hr-to]"));
      function syncTriggers() {
        triggers.forEach(function (t) {
          t.classList.toggle("is-active", parseInt(t.getAttribute("data-hr-to"), 10) === active);
        });
      }
      syncTriggers();

      var animating = false;

      function to(idx) {
        if (idx === active || idx < 0 || idx >= items.length || animating) return;
        var out = items[active];
        var inn = items[idx];

        if (reduce) {
          gsap.set(out, { height: 0, autoAlpha: 0 });
          gsap.set(inn, { height: "auto", autoAlpha: 1 });
        } else {
          animating = true;
          var tl = heightReveal(out, inn, { duration: duration, ease: ease });
          tl.eventCallback("onComplete", function () { animating = false; });
        }

        out.classList.remove("is-active");
        inn.classList.add("is-active");
        active = idx;
        syncTriggers();
      }

      triggers.forEach(function (t) {
        t.addEventListener("click", function () {
          to(parseInt(t.getAttribute("data-hr-to"), 10));
        });
      });

      var timer = null;
      if (trigger === "auto" && !reduce) {
        timer = setInterval(function () { to((active + 1) % items.length); }, interval);
      }

      instances.push({
        el: group,
        to: to,
        stop: function () { if (timer) { clearInterval(timer); timer = null; } },
      });
    });

    return instances;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.heightReveal = heightReveal;
  global.Sestek.measureAutoHeight = measureAutoHeight;
  global.Sestek.initHeightReveal = initHeightReveal;

})(typeof window !== "undefined" ? window : this);
