/*!
 * text-rotator.js v1.1.0
 * Auto-rotating line of hand-authored items — the "Dribbble ships landing pages
 * 10x faster" strip that cycles through phrases/brands on its own. Each item
 * fades (and lifts) out while the next fades in, on a timer. Independent of
 * hero-slider.js.
 *
 * Built from plain divs you arrange yourself in Webflow (NOT a CMS list) — just
 * drop one [data-rotator-item] per phrase inside the [data-rotator] wrapper.
 *
 * Pure show-one-at-a-time crossfade (not a marquee) — premium and calm.
 *
 * Requires : nothing (vanilla). Optional : gsap for nicer easing.
 * CSS      : css/components/text-rotator.css
 *
 * DOM (plain Webflow divs — no Collection List):
 *   [data-rotator]                    wrapper
 *     [data-rotator-item]             one phrase/brand row (repeat as many as you
 *                                     like; mark the first with .is-active, opt.)
 *
 * Root attributes:
 *   data-rotator-interval  ms each item is shown        (default 2800)
 *   data-rotator-duration  crossfade seconds            (default 0.5)
 *   data-rotator-ease      GSAP ease (if gsap present)  (default "power2.out")
 *   data-rotator-effect    "cube" 3D vertical roll | "fade" crossfade
 *                          (default "cube")
 *   data-rotator-perspective  px depth for the cube     (default 800)
 *   data-rotator-shift     px the outgoing item lifts (fade effect only)
 *                          (default 14)
 *   data-rotator-autosize  "false" to NOT lock height to the tallest item
 *                          (default true — prevents layout jump between items)
 *
 * Behaviour:
 *   • Cycles items on a timer; pauses on hover (fine pointers) and when off-screen.
 *   • prefers-reduced-motion: shows the first item only, no rotation.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  // Numeric data-attribute reader — shared helper from js/core/utils.js (core layer).
  var attrNum = Sestek.util.attrNum;

  /** Initialise every [data-rotator] on the page. */
  function initTextRotator(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-rotator]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  function setupInstance(root) {
    if (root._rotatorInit) return null;
    root._rotatorInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-rotator-item]"));
    if (!items.length) return null;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var hasGsap = typeof gsap !== "undefined";

    var interval = attrNum(root, "data-rotator-interval", 2800);
    var duration = attrNum(root, "data-rotator-duration", 0.5);
    var ease     = root.getAttribute("data-rotator-ease") || "power2.out";
    var shift    = attrNum(root, "data-rotator-shift", 14);
    var autosize = root.getAttribute("data-rotator-autosize") !== "false";
    var effect   = (root.getAttribute("data-rotator-effect") || "cube").toLowerCase();
    var perspect = attrNum(root, "data-rotator-perspective", 800);

    // Stack all items in the same spot; lock the root's height to the tallest so
    // the line never jumps between a short and a long phrase.
    root.classList.add("is-ready");   // CSS hands stacking control over to JS
    root.style.position = root.style.position || "relative";
    // The cube effect rotates each item in 3D — give the wrapper a perspective so
    // the roll has real depth (a face tipping back over the top, not a flat skew).
    if (effect === "cube") root.style.perspective = perspect + "px";
    var active = 0;
    items.forEach(function (el, i) { if (el.classList.contains("is-active")) active = i; });

    function lockHeight() {
      if (!autosize) return;
      var max = 0;
      items.forEach(function (el) {
        // Measure each item at its natural size without flashing.
        var prev = el.style.cssText;
        el.style.position = "static";
        el.style.opacity = "0";
        el.style.visibility = "hidden";
        max = Math.max(max, el.offsetHeight);
        el.style.cssText = prev;
      });
      if (max) root.style.minHeight = max + "px";
    }

    // Initial state: only the active item visible.
    items.forEach(function (el, i) {
      el.style.position = "absolute";
      el.style.left = "0";
      el.style.right = "0";
      el.style.top = "0";
      el.style.transformOrigin = "center center";
      el.style.opacity = i === active ? "1" : "0";
      el.style.transform = "translateY(0)";
      el.classList.toggle("is-active", i === active);
      el.setAttribute("aria-hidden", i === active ? "false" : "true");
    });
    lockHeight();

    // Reduced motion or single item: show the first, never rotate.
    if (reduce || items.length < 2) {
      return { root: root, next: function () {}, play: function () {}, pause: function () {}, destroy: function () {} };
    }

    var cube = effect === "cube";

    function show(idx) {
      if (idx === active) return;
      var out = items[active], inn = items[idx];
      inn.classList.add("is-active");
      inn.setAttribute("aria-hidden", "false");
      out.setAttribute("aria-hidden", "true");

      if (hasGsap) {
        if (cube) {
          // Vertical roll: the old line tips back over the top (rotateX 0→90)
          // while the new one rises edge-on from below (rotateX -90→0). At ±90°
          // each face is edge-on (zero projected height) for a clean handoff.
          gsap.to(out, { rotationX: 90, opacity: 0, duration: duration, ease: ease,
            onComplete: function () { out.classList.remove("is-active"); } });
          gsap.fromTo(inn, { rotationX: -90, opacity: 0 },
            { rotationX: 0, opacity: 1, duration: duration, ease: ease });
        } else {
          gsap.to(out, { opacity: 0, y: -shift, duration: duration, ease: ease,
            onComplete: function () { out.classList.remove("is-active"); } });
          gsap.fromTo(inn, { opacity: 0, y: shift },
            { opacity: 1, y: 0, duration: duration, ease: ease });
        }
      } else if (cube) {
        // Same roll in pure CSS: snap the incoming face to its -90° start with no
        // transition, force a reflow so the browser registers it, then transition
        // both faces to their end state.
        inn.style.transition = "none";
        inn.style.opacity = "0";
        inn.style.transform = "rotateX(-90deg)";
        void inn.offsetWidth;   // reflow — otherwise the start value is coalesced away
        inn.style.transition = "opacity " + duration + "s, transform " + duration + "s";
        out.style.transition = "opacity " + duration + "s, transform " + duration + "s";
        inn.style.opacity = "1"; inn.style.transform = "rotateX(0deg)";
        out.style.opacity = "0"; out.style.transform = "rotateX(90deg)";
        setTimeout(function () { out.classList.remove("is-active"); }, duration * 1000);
      } else {
        out.style.transition = "opacity " + duration + "s, transform " + duration + "s";
        inn.style.transition = "opacity " + duration + "s, transform " + duration + "s";
        out.style.opacity = "0"; out.style.transform = "translateY(" + (-shift) + "px)";
        inn.style.opacity = "1"; inn.style.transform = "translateY(0)";
        setTimeout(function () { out.classList.remove("is-active"); }, duration * 1000);
      }
      active = idx;
    }

    function next() { show((active + 1) % items.length); }

    // ── Timer + pause conditions ──────────────────────────────────
    // Two INDEPENDENT pause sources — cursor hover and off-screen. Each gets its
    // own flag (never one shared boolean): otherwise an IntersectionObserver tick
    // while the cursor is still inside would clear the hover pause (and a
    // mouseleave while off-screen would clear the off-screen pause). Rotation
    // runs only when BOTH are clear.
    var timer = null, hovering = false, offscreen = false;
    function isPaused() { return hovering || offscreen; }
    function start() { if (!timer) timer = setInterval(function () { if (!isPaused()) next(); }, interval); }
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

    // Re-lock height on resize (wrapping can change the tallest item).
    var rT;
    window.addEventListener("resize", function () {
      clearTimeout(rT); rT = setTimeout(lockHeight, 160);
    });

    start();

    var api = {
      root: root, next: next,
      play: function () { start(); },
      pause: function () { stop(); },
      destroy: function () { stop(); },
    };
    root._rotatorDestroy = api.destroy;
    return api;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initTextRotator = initTextRotator;

})(typeof window !== "undefined" ? window : this);
