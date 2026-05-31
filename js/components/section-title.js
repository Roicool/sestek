/*!
 * section-title.js v1.3.0
 * One-shot, character-by-character heading reveal — each letter starts in its
 * slice of the Sestek brand gradient and eases to the heading's own defined
 * colour on a 20ms stagger as the heading scrolls into view, while the whole
 * heading fades in (opacity 0→1). The beside.com title look.
 *
 * What it does (JS splits + colours + triggers; CSS keyframe does the ease):
 *   1. Splits a heading's text into <span class="section-title-char"> letters,
 *      each with an incremental inline animation-delay (index × step) and an
 *      inline colour sampled from the gradient at its position (left→right).
 *   2. One IntersectionObserver per heading; on first intersection it fades the
 *      heading in and stamps data-triggered on every letter, so the CSS keyframe
 *      runs exactly once — gradient colour → defined colour — cascading.
 *
 * No dependencies — vanilla JS + IntersectionObserver.
 * CSS : css/components/section-title.css
 *
 * DOM (Webflow) — add the attribute to any heading you want revealed:
 *   <h1 data-section-title>Make your business phone work for you</h1>
 *
 * Attributes:
 *   data-section-title          mark a heading for the reveal (required)
 *   data-section-title-step     ms between letters            (default 20)
 *   data-section-title-hold     ms the full gradient holds before the cascade
 *                               starts, so every colour is seen  (default 600)
 *   data-section-title-colors   comma hex stops to reveal from
 *                               (default "#EC008C,#7F81AE,#00FFEB" — Sestek)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var CHAR_CLASS = "section-title-char";
  var STEP_DEFAULT = 20;   // ms between letters — matches beside's 20ms cascade
  var HOLD_DEFAULT = 600;  // ms the full gradient holds before the cascade starts
  var GRADIENT_DEFAULT = ["#EC008C", "#7F81AE", "#00FFEB"];  // Sestek brand gradient

  function hexToRgb(h) {
    h = h.trim().replace(/^#/, "");
    if (h.length === 3) h = h.replace(/(.)/g, "$1$1");
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /** Linear sample of an RGB-stop list at fraction f∈[0,1]. */
  function sampleGradient(stops, f) {
    if (stops.length === 1) return stops[0];
    var seg = f * (stops.length - 1);
    var i = Math.min(stops.length - 2, Math.floor(seg));
    var t = seg - i, a = stops[i], b = stops[i + 1];
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  /**
   * Recursively wrap each character of the heading's text nodes in a span,
   * stamping an incremental animation-delay. Element children (e.g. inline
   * wrappers) are recursed into; <br> is left untouched so line breaks survive.
   */
  function splitNode(node, state) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {                         // text node → split
        var text = child.nodeValue;
        var frag = document.createDocumentFragment();
        for (var i = 0; i < text.length; i++) {
          var span = document.createElement("span");
          span.className = CHAR_CLASS;
          span.textContent = text.charAt(i);
          span.style.animationDelay = (state.hold + state.n++ * state.step) + "ms";
          state.chars.push(span);
          frag.appendChild(span);
        }
        node.replaceChild(frag, child);
      } else if (child.nodeType === 1 && child.nodeName !== "BR") {
        splitNode(child, state);                          // recurse into wrappers
      }
    });
  }

  function setup(el) {
    if (el._sectionTitleInit) return;                     // idempotent
    el._sectionTitleInit = true;

    var step = parseFloat(el.getAttribute("data-section-title-step")) || STEP_DEFAULT;
    var hold = parseFloat(el.getAttribute("data-section-title-hold"));
    if (isNaN(hold)) hold = HOLD_DEFAULT;
    var state = { n: 0, step: step, hold: hold, chars: [] };
    splitNode(el, state);
    if (!state.chars.length) return;

    function trigger() {
      el.style.transition = "opacity 0.4s ease-out";      // only the reveal fades
      el.style.opacity = "1";                             // fade the heading in
      state.chars.forEach(function (c) { c.setAttribute("data-triggered", ""); });
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      trigger();                                          // no motion → defined colour
      return;
    }

    // Paint each letter its slice of the gradient (left→right across the run).
    // The CSS keyframe then eases this back to the heading's own defined colour.
    var attr = el.getAttribute("data-section-title-colors");
    var stops = (attr ? attr.split(",") : GRADIENT_DEFAULT).map(hexToRgb);
    var last = state.chars.length - 1;
    state.chars.forEach(function (c, i) {
      var rgb = sampleGradient(stops, last > 0 ? i / last : 0);
      c.style.color = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
    });

    // Hidden until revealed (no transition here, so it doesn't fade OUT on load).
    // Applied inline — not via CSS — so the text still shows if the script never
    // runs. The fade-IN transition is added in trigger().
    el.style.opacity = "0";

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        trigger();
        io.disconnect();                                  // one-shot — never replays
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });

    io.observe(el);
  }

  /** Initialise every [data-section-title] heading on the page. */
  function initSectionTitles(selector) {
    var els = document.querySelectorAll(selector || "[data-section-title]");
    Array.prototype.forEach.call(els, setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSectionTitles = initSectionTitles;

})(typeof window !== "undefined" ? window : this);
