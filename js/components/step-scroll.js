/*!
 * step-scroll.js v2.0.1
 * Pinned, scroll-driven 3(+)-step section:
 *   1. Section pins for the whole scroll distance
 *   2. Scroll splits into N equal dwell windows, one per step
 *   3. Step transitions are directional clip-path wipes (left→right), not
 *      flat opacity cuts: the incoming bg/video is revealed by the wipe
 *      while it settles from a 1.12 zoom; the outgoing layer fades late,
 *      underneath the wipe. Step copy staggers: title leads, text follows.
 *   4. While inside a step's window, that step's video is scrubbed
 *      (currentTime) in lock-step with scroll — feels "played by scroll"
 *   5. Segmented progress bar is BUILT BY JS inside [data-sscroll-progress]
 *      (one glowing track+fill per step) — no per-segment DOM or CSS needed
 *      in Webflow, only the empty container element.
 *
 * v2.0.0: clip-path wipe transitions, zoom-settle, staggered copy;
 *         JS-generated segmented progress bar (container-only contract).
 * v2.0.1: step containers forced visible (autoAlpha:1) — copy animates on
 *         the title/text inside, so leftover `opacity:0` CSS on the step
 *         class no longer hides all content.
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
   *                           the wipe transition           (default 0.45)
   *   data-sscroll-ease       ease for wipes/copy            (default "power2.inOut")
   *   data-sscroll-priority   ScrollTrigger refreshPriority  (default 0)
   *   data-sscroll-bar-width  progress bar line width, px    (default 2)
   *   data-sscroll-bar-gap    gap between segments, px       (default 12)
   *
   * Children:
   *   [data-sscroll-bg-item="i"]   background layer for step i (0-based)
   *   [data-sscroll-step="i"]      title+text block for step i
   *     [data-sscroll-title]         heading inside the step (staggered)
   *     [data-sscroll-text]          paragraph inside the step (staggered)
   *   [data-sscroll-video="i"]     video for step i (scrubbed while active)
   *   [data-sscroll-progress]      EMPTY container — JS builds one
   *                                track+fill segment per step inside it
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
    var bar     = root.querySelector("[data-sscroll-progress]");

    var n = steps.length;
    if (!n || bgItems.length !== n || videos.length !== n) {
      console.warn("[Sestek StepScroll] Need matching [data-sscroll-bg-item], [data-sscroll-step] and [data-sscroll-video] counts.");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist   = root.getAttribute("data-sscroll-end") || "300%";
    var scrub     = num(root, "data-sscroll-scrub", 0.5);
    var dwell     = num(root, "data-sscroll-dwell", 1);
    var crossFrac = num(root, "data-sscroll-crossfade", 0.45);
    var ease      = root.getAttribute("data-sscroll-ease") || "power2.inOut";
    var priority  = num(root, "data-sscroll-priority", 0);
    var barW      = num(root, "data-sscroll-bar-width", 2);
    var barGap    = num(root, "data-sscroll-bar-gap", 12);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Build the segmented progress bar (JS owns look & structure) ──
    // Container-only contract: whatever is inside [data-sscroll-progress]
    // is replaced with N track+fill segments. Neutralize leftover container
    // styling (background/opacity) so old CSS can't make it a solid line.
    var fills = [];
    if (bar) {
      bar.innerHTML = "";
      bar.style.background = "transparent";
      bar.style.opacity = "1";
      bar.style.width = "auto";
      bar.style.display = "flex";
      bar.style.flexDirection = "column";
      bar.style.rowGap = barGap + "px";
      bar.style.flexShrink = "0";
      if (!bar.getBoundingClientRect().height) bar.style.height = "12rem";

      for (var s = 0; s < n; s++) {
        var track = document.createElement("div");
        track.style.cssText =
          "position:relative;flex:1 1 0%;width:" + barW + "px;" +
          "border-radius:9999px;background:rgba(255,255,255,.16);overflow:hidden;";
        var fill = document.createElement("div");
        fill.style.cssText =
          "position:absolute;left:0;top:0;width:100%;height:0%;" +
          "border-radius:9999px;background:#fff;" +
          "box-shadow:0 0 10px rgba(255,255,255,.55),0 0 22px rgba(255,255,255,.25);";
        track.appendChild(fill);
        bar.appendChild(track);
        fills.push(fill);
      }
    }

    // Reduced-motion: show step 0 statically, no pin/scrub/video-play
    if (reduce) { buildStatic(); return; }

    var total        = n * dwell;
    var crossfadeDur = dwell * crossFrac;
    var activeST     = null;

    var CLIP_HIDDEN = "inset(0% 100% 0% 0%)";  // fully clipped from the right → reveals left→right
    var CLIP_SHOWN  = "inset(0% 0% 0% 0%)";

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

    /** Title/text of a step, for staggered copy transitions. */
    function copyParts(stepEl) {
      var title = stepEl.querySelector("[data-sscroll-title]");
      var text  = stepEl.querySelector("[data-sscroll-text]");
      return { title: title, text: text, whole: !title && !text ? stepEl : null };
    }

    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      // ── Resting state: step 0 fully shown, the rest clipped & primed ──
      bgItems.forEach(function (el, i) {
        gsap.set(el, {
          autoAlpha: 1,
          clipPath: i === 0 ? CLIP_SHOWN : CLIP_HIDDEN,
          scale: i === 0 ? 1 : 1.12,
          transformOrigin: "50% 50%",
        });
      });
      videos.forEach(function (el, i) {
        gsap.set(el, {
          autoAlpha: 1,
          clipPath: i === 0 ? CLIP_SHOWN : CLIP_HIDDEN,
          scale: i === 0 ? 1 : 1.12,
          transformOrigin: "50% 50%",
        });
        if (el.pause) el.pause();
      });
      steps.forEach(function (el, i) {
        // autoAlpha:1 on the container overrides any leftover `opacity:0`
        // CSS on the step class — visibility is animated on the copy inside.
        gsap.set(el, { autoAlpha: 1, position: i === 0 ? "relative" : "absolute", top: i === 0 ? "auto" : 0, left: i === 0 ? "auto" : 0 });
        var p = copyParts(el);
        var targets = p.whole ? [el] : [p.title, p.text].filter(Boolean);
        gsap.set(targets, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 28 });
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

      // Segmented progress bar: each fill runs 0→100% across its own window only.
      if (fills.length) {
        for (var f = 0; f < n; f++) {
          tl.fromTo(fills[f], { height: "0%" }, { height: "100%", duration: dwell }, f * dwell);
        }
      }

      // ── Step boundaries: directional wipe + zoom-settle + staggered copy ──
      for (var i = 0; i < n - 1; i++) {
        var boundary = (i + 1) * dwell;
        var t0 = boundary - crossfadeDur;
        var d  = crossfadeDur;

        // Incoming bg: left→right wipe reveal while the zoom settles 1.12→1.
        // Later siblings sit above earlier ones in DOM order — no z-index juggling.
        tl.fromTo(bgItems[i + 1],
          { clipPath: CLIP_HIDDEN, scale: 1.12 },
          { clipPath: CLIP_SHOWN, scale: 1, ease: ease, duration: d }, t0);
        // Outgoing bg: fades late, underneath the wipe (prevents a visible pop).
        tl.to(bgItems[i], { autoAlpha: 0, ease: "power1.in", duration: d * 0.5 }, t0 + d * 0.5);
        tl.set(bgItems[i], { autoAlpha: 1, clipPath: CLIP_HIDDEN, scale: 1.12 }, t0 + d);

        // Incoming video: same wipe treatment.
        tl.fromTo(videos[i + 1],
          { clipPath: CLIP_HIDDEN, scale: 1.12 },
          { clipPath: CLIP_SHOWN, scale: 1, ease: ease, duration: d }, t0);
        tl.to(videos[i], { autoAlpha: 0, ease: "power1.in", duration: d * 0.5 }, t0 + d * 0.5);
        tl.set(videos[i], { autoAlpha: 1, clipPath: CLIP_HIDDEN, scale: 1.12 }, t0 + d);

        // Copy: outgoing lifts away first; incoming title leads, text follows.
        var out = copyParts(steps[i]);
        var inc = copyParts(steps[i + 1]);
        var outTargets = out.whole ? [steps[i]] : [out.title, out.text].filter(Boolean);

        tl.set(steps[i + 1], { position: "absolute", top: 0, left: 0 }, t0);
        tl.to(outTargets, { autoAlpha: 0, y: -24, ease: "power2.in", duration: d * 0.4, stagger: d * 0.06 }, t0);

        if (inc.whole) {
          tl.fromTo(steps[i + 1], { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.6 }, t0 + d * 0.35);
        } else {
          if (inc.title) tl.fromTo(inc.title, { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.55 }, t0 + d * 0.35);
          if (inc.text) tl.fromTo(inc.text, { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.55 }, t0 + d * 0.5);
        }

        tl.set(steps[i], { position: "absolute", top: 0, left: 0 }, t0 + d);
        tl.set(steps[i + 1], { position: "relative", top: "auto", left: "auto" }, t0 + d);
      }

      activeST = tl.scrollTrigger;
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      bgItems.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, clipPath: "none", scale: 1 });
      });
      steps.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, position: i === 0 ? "relative" : "absolute", y: 0 });
      });
      videos.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, clipPath: "none", scale: 1 });
      });
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
