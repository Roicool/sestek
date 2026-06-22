/*!
 * text-rotator.js v1.0.1
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
 *   data-rotator-shift     px the outgoing item lifts   (default 14)
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

  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

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

    // Stack all items in the same spot; lock the root's height to the tallest so
    // the line never jumps between a short and a long phrase.
    root.classList.add("is-ready");   // CSS hands stacking control over to JS
    root.style.position = root.style.position || "relative";
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

    function show(idx) {
      if (idx === active) return;
      var out = items[active], inn = items[idx];
      inn.classList.add("is-active");
      inn.setAttribute("aria-hidden", "false");
      out.setAttribute("aria-hidden", "true");

      if (hasGsap) {
        gsap.to(out, { opacity: 0, y: -shift, duration: duration, ease: ease,
          onComplete: function () { out.classList.remove("is-active"); } });
        gsap.fromTo(inn, { opacity: 0, y: shift },
          { opacity: 1, y: 0, duration: duration, ease: ease });
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
