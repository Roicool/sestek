/*!
 * step-scroll.js v1.1.0
 * Pinned, scroll-driven 3(+)-step section:
 *   1. Section pins for the whole scroll distance
 *   2. Scroll splits into N equal dwell windows, one per step
 *   3. At each window boundary: background image, step copy, and video
 *      cross-fade together — subtle zoom-in on incoming bg/video, slide-up
 *      on incoming step copy, softer "sine.inOut" easing (premium feel)
 *   4. While inside a step's window, that step's video is scrubbed
 *      (currentTime) in lock-step with scroll — feels "played by scroll"
 *   5. A segmented progress bar — one line per step — fills 0→100% while
 *      its own step is the active dwell window
 *
 * v1.1.0: segmented (per-step) progress bar, replaces single continuous
 *         fill; softer cross-fade with zoom/slide instead of plain opacity.
 *
 * Requires : gsap + ScrollTrigger registered.
 *
 * All timing/behaviour is data-attribute driven — see DOM contract below.
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
   * Initializes a pinned step-scroll section.
   *
   * Root element  [data-step-scroll] supports:
   *   data-sscroll-end        pin scroll distance          (default "300%")
   *   data-sscroll-scrub      scrub lag in seconds          (default 0.5)
   *   data-sscroll-dwell      per-step hold length, units   (default 1)
   *   data-sscroll-crossfade  fraction of dwell used for
   *                           the cross-fade transition     (default 0.45)
   *   data-sscroll-ease       ease for cross-fades           (default "sine.inOut")
   *   data-sscroll-priority   ScrollTrigger refreshPriority  (default 0)
   *
   * Children:
   *   [data-sscroll-bg-item="i"]        background layer for step i (0-based)
   *   [data-sscroll-step="i"]           title+text block for step i
   *   [data-sscroll-video="i"]          video for step i (scrubbed while active)
   *   [data-sscroll-progress-fill="i"]  per-step progress-bar fill (0→100% during step i's window)
   *
   * @param {string} [selector="[data-step-scroll]"]
   */
  function initStepScroll(selector) {
    var root = document.querySelector(selector || "[data-step-scroll]");
    if (!root) { console.warn("[Sestek StepScroll] No [data-step-scroll] found."); return; }
    if (root._stepScrollInit) return;                      // idempotent — no duplicate triggers
    root._stepScrollInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StepScroll] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var bgItems = Array.from(root.querySelectorAll("[data-sscroll-bg-item]"));
    var steps   = Array.from(root.querySelectorAll("[data-sscroll-step]"));
    var videos  = Array.from(root.querySelectorAll("[data-sscroll-video]"));
    var fills   = Array.from(root.querySelectorAll("[data-sscroll-progress-fill]"));

    var n = steps.length;
    if (!n || bgItems.length !== n || videos.length !== n) {
      console.warn("[Sestek StepScroll] Need matching [data-sscroll-bg-item], [data-sscroll-step] and [data-sscroll-video] counts.");
      return;
    }
    if (fills.length && fills.length !== n) {
      console.warn("[Sestek StepScroll] [data-sscroll-progress-fill] count doesn't match step count — progress bar skipped.");
      fills = [];
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist    = root.getAttribute("data-sscroll-end") || "300%";
    var scrub      = num(root, "data-sscroll-scrub", 0.5);
    var dwell      = num(root, "data-sscroll-dwell", 1);
    var crossFrac  = num(root, "data-sscroll-crossfade", 0.45);
    var ease       = root.getAttribute("data-sscroll-ease") || "sine.inOut";
    var priority   = num(root, "data-sscroll-priority", 0);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion: show step 0 statically, no pin/scrub/video-play
    if (reduce) { buildStatic(); return; }

    var total        = n * dwell;
    var crossfadeDur = dwell * crossFrac;
    var activeST     = null;

    /** Which step owns timeline-time t (in units). */
    function stepFromTime(t) {
      var idx = Math.floor(t / dwell);
      if (idx < 0) idx = 0;
      if (idx > n - 1) idx = n - 1;
      return idx;
    }

    /** Scrub the active video's currentTime to match progress through its own dwell window. */
    function scrubVideo(idx, t) {
      var v = videos[idx];
      if (!v || !isFinite(v.duration) || !v.duration) return;
      var windowStart = idx * dwell;
      var local = (t - windowStart) / dwell;           // 0..1 within this step's window
      if (local < 0) local = 0;
      if (local > 1) local = 1;
      v.currentTime = v.duration * local;
    }

    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      // ── Normalize resting state (mirrors the CSS defaults, GSAP now owns it) ──
      bgItems.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 1.06 });
      });
      videos.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: i === 0 ? 1 : 1.06 });
        if (el.pause) el.pause();
      });
      steps.forEach(function (el, i) {
        gsap.set(el, {
          opacity: i === 0 ? 1 : 0,
          position: i === 0 ? "relative" : "absolute",
          y: i === 0 ? 0 : 14,
        });
      });
      if (fills.length) gsap.set(fills, { height: "0%" });

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + endDist,
          pin: true,
          scrub: scrub,
          anticipatePin: 0,
          // See PROJECT.md "ScrollTrigger — Pinli Bölüm Kuralları": priority is
          // driven by data-sscroll-priority, set per the page's pin stacking order.
          refreshPriority: priority,
          onUpdate: function (self) {
            var t = self.progress * total;
            scrubVideo(stepFromTime(t), t);
          },
        },
      });

      // Segmented progress bar: each step's fill runs 0→100% only across its own window.
      if (fills.length) {
        for (var f = 0; f < n; f++) {
          tl.fromTo(fills[f], { height: "0%" }, { height: "100%", duration: dwell }, f * dwell);
        }
      }

      // Cross-fade at each step boundary: bg, step copy, and video together —
      // incoming layers ease down from a slight zoom/slide for a softer, more
      // "played" transition instead of a flat opacity cut.
      for (var i = 0; i < n - 1; i++) {
        var boundary = (i + 1) * dwell;
        var t0 = boundary - crossfadeDur;

        tl.set(steps[i + 1], { position: "absolute" }, t0);

        tl.to(bgItems[i],     { opacity: 0, ease: ease, duration: crossfadeDur }, t0);
        tl.to(bgItems[i + 1], { opacity: 1, scale: 1, ease: ease, duration: crossfadeDur }, t0);

        tl.to(steps[i],     { opacity: 0, y: -14, ease: ease, duration: crossfadeDur }, t0);
        tl.to(steps[i + 1], { opacity: 1, y: 0, ease: ease, duration: crossfadeDur }, t0);

        tl.to(videos[i],     { opacity: 0, ease: ease, duration: crossfadeDur }, t0);
        tl.to(videos[i + 1], { opacity: 1, scale: 1, ease: ease, duration: crossfadeDur }, t0);

        tl.set(steps[i], { position: "absolute" }, t0 + crossfadeDur);
        tl.set(steps[i + 1], { position: "relative" }, t0 + crossfadeDur);
      }

      activeST = tl.scrollTrigger;
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      bgItems.forEach(function (el, i) { gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: 1 }); });
      steps.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, position: i === 0 ? "relative" : "absolute", y: 0 });
      });
      videos.forEach(function (el, i) { gsap.set(el, { opacity: i === 0 ? 1 : 0, scale: 1 }); });
      if (fills.length) gsap.set(fills, { height: "0%" });
    }

    build();

    // Rebuild on resize — re-measures the pin distance against the new viewport.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStepScroll = initStepScroll;

})(typeof window !== "undefined" ? window : this);
