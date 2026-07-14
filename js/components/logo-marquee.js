/*!
 * logo-marquee.js v1.0.0
 * Step-advancing logo strip with a fixed centre "spotlight" frame — a calm,
 * premium catalogue: one logo at a time glides into a bordered box at the
 * middle of the strip, holds there (name label crossfades in below), then
 * slides out as the next one glides in. Loops forever, no clones drift out
 * of sync (a single duplicate pass is reused and silently re-centred).
 *
 * Requires : gsap (global), js/core/utils.js (Sestek.util) loaded first.
 * CSS      : css/components/logo-marquee.css
 *
 * DOM (Webflow — only the attributes matter, design is yours):
 *   [data-logo-marquee]                  root
 *     [data-lm-stage]                    viewport (overflow hidden) — holds the
 *                                         moving track AND the fixed frame
 *       [data-lm-track]                  the row; JS clones its children ONCE
 *                                         for a seamless loop (do not author
 *                                         duplicates yourself)
 *         [data-lm-item]                 one logo cell
 *           data-lm-name="Brand Name"    label shown while this cell is centred
 *           …logo markup (img/svg)…
 *       [data-lm-frame]                  decorative bordered box, CSS-centred,
 *                                         never moves — the "spotlight"
 *     [data-lm-label]                    name text below the stage (JS fills it)
 *
 * Root attributes (all optional):
 *   data-lm-dwell           ms each logo holds centred        (default 1800)
 *   data-lm-step-duration   seconds for the glide between logos (default 0.6)
 *   data-lm-ease            GSAP ease for the glide            (default "power3.inOut")
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;

  function setupInstance(root) {
    if (root._logoMarqueeInit) return null;
    root._logoMarqueeInit = true;

    var stage = root.querySelector("[data-lm-stage]");
    var track = root.querySelector("[data-lm-track]");
    var frame = root.querySelector("[data-lm-frame]");
    var label = root.querySelector("[data-lm-label]");
    var items = track ? Array.prototype.slice.call(track.querySelectorAll("[data-lm-item]")) : [];

    if (!stage || !track || items.length < 2) {
      console.warn("[Sestek LogoMarquee] Need [data-lm-stage] > [data-lm-track] with 2+ [data-lm-item]s.", root);
      return null;
    }

    var reduce = Sestek.util.prefersReducedMotion();
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var dwell = attrNum(root, "data-lm-dwell", 1800);
    var stepDur = attrNum(root, "data-lm-step-duration", 0.6);
    var ease = root.getAttribute("data-lm-ease") || "power3.inOut";
    var N = items.length;

    /** Fill the label from an item's data-lm-name, with a small crossfade. */
    function setLabel(item, animate) {
      if (!label) return;
      var name = item.getAttribute("data-lm-name") || "";
      if (!animate || reduce || typeof gsap === "undefined") {
        label.textContent = name;
        return;
      }
      gsap.killTweensOf(label);
      gsap.to(label, {
        autoAlpha: 0, y: -4, duration: stepDur * 0.35, ease: "power1.in",
        onComplete: function () {
          label.textContent = name;
          gsap.fromTo(label, { autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: stepDur * 0.5, ease: "power2.out" });
        },
      });
    }

    function setActive(idx) {
      items.forEach(function (el, i) { el.classList.toggle("is-active", i === idx); });
    }

    // Reduced motion / no GSAP: freeze on the first logo, no glide, no timer —
    // but still centre it under the frame (plain style, no animation) so the
    // static state matches what the frame is designed around.
    if (reduce || typeof gsap === "undefined") {
      var firstRect = items[0].getBoundingClientRect();
      track.style.transform = "translateX(" +
        (stage.clientWidth / 2 - firstRect.width / 2) + "px)";
      setActive(0);
      setLabel(items[0], false);
      return { root: root, pause: function () {}, play: function () {} };
    }

    // ── Clone the track once for a seamless loop (N originals + N clones) ──
    items.forEach(function (el) {
      var clone = el.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    var stepIndex = 0;   // 0..N — which original item is currently centred
    var step = 0;        // px between two consecutive item centres
    var centerOffset = 0; // track x when stepIndex === 0

    function measure() {
      var first = items[0];
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = first.getBoundingClientRect().width + gap;
      centerOffset = stage.clientWidth / 2 - first.getBoundingClientRect().width / 2;
    }

    function targetX(idx) { return centerOffset - idx * step; }

    measure();
    gsap.set(track, { x: targetX(0) });
    setActive(0);
    setLabel(items[0], false);

    // Re-measure on lazy image load (logos loaded async can shift widths).
    var lazyImgs = Array.prototype.slice.call(track.querySelectorAll("img")).filter(function (img) {
      return !img.complete;
    });
    if (lazyImgs.length) {
      var loaded = 0;
      function onLoad() {
        if (++loaded === lazyImgs.length) { measure(); gsap.set(track, { x: targetX(stepIndex) }); }
      }
      lazyImgs.forEach(function (img) {
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onLoad);
      });
    }

    var rTimer;
    window.addEventListener("resize", function () {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () { measure(); gsap.set(track, { x: targetX(stepIndex) }); }, 150);
    });

    // ── Step timer + pause conditions (hover / focus / off-screen / tab hidden) ──
    var timer = null, hovering = false, offscreen = false, tween = null;
    function isPaused() { return hovering || offscreen; }

    function step_() {
      stepIndex++;
      var activeIdx = stepIndex % N;
      tween = gsap.to(track, {
        x: targetX(stepIndex), duration: stepDur, ease: ease,
        onComplete: function () {
          setActive(activeIdx);
          setLabel(items[activeIdx], true);
          // A full pass just completed (about to show the clone set again) —
          // snap invisibly back to the matching original so stepIndex + the
          // track's x never grow without bound. Both positions render the
          // same logo in the same neighbourhood, so this is imperceptible.
          if (stepIndex >= N) {
            stepIndex -= N;
            gsap.set(track, { x: targetX(stepIndex) });
          }
        },
      });
    }

    function start() { if (!timer) timer = setInterval(function () { if (!isPaused()) step_(); }, dwell + stepDur * 1000); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (canHover) {
      root.addEventListener("mouseenter", function () { hovering = true; });
      root.addEventListener("mouseleave", function () { hovering = false; });
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
      }, { threshold: 0.1 }).observe(root);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    start();

    var api = {
      root: root,
      pause: stop,
      play: start,
      destroy: function () { stop(); if (tween) tween.kill(); },
    };
    root._logoMarqueeDestroy = api.destroy;
    return api;
  }

  /** Initialise every [data-logo-marquee] on the page. */
  function initLogoMarquee(selector) {
    if (typeof gsap === "undefined") {
      console.warn("[Sestek LogoMarquee] GSAP not found — falling back to a static first logo.");
    }
    var roots = Array.prototype.slice.call(document.querySelectorAll(selector || "[data-logo-marquee]"));
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLogoMarquee = initLogoMarquee;

})(typeof window !== "undefined" ? window : this);
