/*!
 * step-scroll.js v1.0.0
 * Pinned, scroll-driven 3(+)-step section:
 *   1. Section pins for the whole scroll distance
 *   2. Scroll splits into N equal dwell windows, one per step
 *   3. At each window boundary: background image, step copy, and video
 *      cross-fade together (GSAP opacity tweens, position handled inline)
 *   4. While inside a step's window, that step's video is scrubbed
 *      (currentTime) in lock-step with scroll — feels "played by scroll"
 *   5. A vertical progress bar fills 0→100% across the whole timeline
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
   *                           the cross-fade transition     (default 0.3)
   *   data-sscroll-ease       ease for cross-fades           (default "power2.inOut")
   *   data-sscroll-priority   ScrollTrigger refreshPriority  (default 0)
   *
   * Children:
   *   [data-sscroll-bg-item="i"]       background layer for step i (0-based)
   *   [data-sscroll-step="i"]          title+text block for step i
   *   [data-sscroll-video="i"]         video for step i (scrubbed while active)
   *   [data-sscroll-progress-fill]     vertical bar fill (0→100% over whole timeline)
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
    var fill    = root.querySelector("[data-sscroll-progress-fill]");

    var n = steps.length;
    if (!n || bgItems.length !== n || videos.length !== n) {
      console.warn("[Sestek StepScroll] Need matching [data-sscroll-bg-item], [data-sscroll-step] and [data-sscroll-video] counts.");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist    = root.getAttribute("data-sscroll-end") || "300%";
    var scrub      = num(root, "data-sscroll-scrub", 0.5);
    var dwell      = num(root, "data-sscroll-dwell", 1);
    var crossFrac  = num(root, "data-sscroll-crossfade", 0.3);
    var ease       = root.getAttribute("data-sscroll-ease") || "power2.inOut";
    var priority   = num(root, "data-sscroll-priority", 0);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reduced-motion: show step 0 statically, no pin/scrub/video-play
    if (reduce) { buildStatic(); return; }

    var total       = n * dwell;
    var crossfadeDur = dwell * crossFrac;
    var activeST    = null;
    var curActive   = -1;

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
      curActive = -1;

      // ── Normalize resting state (mirrors the CSS defaults, GSAP now owns it) ──
      bgItems.forEach(function (el, i) { gsap.set(el, { opacity: i === 0 ? 1 : 0 }); });
      videos.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0 });
        if (el.pause) el.pause();
      });
      steps.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, position: i === 0 ? "relative" : "absolute" });
      });
      if (fill) gsap.set(fill, { height: "0%" });

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
            var idx = stepFromTime(t);
            if (idx !== curActive) curActive = idx;
            scrubVideo(idx, t);
          },
        },
      });

      // Progress bar fills continuously across the whole timeline.
      if (fill) tl.to(fill, { height: "100%", duration: total }, 0);

      // Cross-fade at each step boundary: bg, step copy, and video together.
      for (var i = 0; i < n - 1; i++) {
        var boundary = (i + 1) * dwell;
        var t0 = boundary - crossfadeDur;

        tl.set(steps[i + 1], { position: "absolute" }, t0);
        tl.to(bgItems[i],  { opacity: 0, ease: ease, duration: crossfadeDur }, t0);
        tl.to(bgItems[i + 1], { opacity: 1, ease: ease, duration: crossfadeDur }, t0);
        tl.to(steps[i],    { opacity: 0, ease: ease, duration: crossfadeDur }, t0);
        tl.to(steps[i + 1], { opacity: 1, ease: ease, duration: crossfadeDur }, t0);
        tl.set(steps[i], { position: "absolute" }, t0 + crossfadeDur);
        tl.set(steps[i + 1], { position: "relative" }, t0 + crossfadeDur);
        tl.to(videos[i],   { opacity: 0, ease: ease, duration: crossfadeDur }, t0);
        tl.to(videos[i + 1], { opacity: 1, ease: ease, duration: crossfadeDur }, t0);
      }

      activeST = tl.scrollTrigger;
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      bgItems.forEach(function (el, i) { gsap.set(el, { opacity: i === 0 ? 1 : 0 }); });
      steps.forEach(function (el, i) {
        gsap.set(el, { opacity: i === 0 ? 1 : 0, position: i === 0 ? "relative" : "absolute" });
      });
      videos.forEach(function (el, i) { gsap.set(el, { opacity: i === 0 ? 1 : 0 }); });
      if (fill) gsap.set(fill, { height: "0%" });
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
