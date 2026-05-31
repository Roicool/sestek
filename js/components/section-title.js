/*!
 * section-title.js v2.0.0
 * One-shot, character-by-character heading reveal — a narrow band of the Sestek
 * brand gradient that travels left→right across the text: letters ahead of the
 * band sit dim, letters under it flare through the gradient, letters behind it
 * settle to the heading's own defined colour. The beside.com title look.
 *
 * What it does (JS only splits + triggers; the CSS keyframe does ALL the motion):
 *   1. Splits a heading's text into <span class="section-title-char"> letters,
 *      each with an incremental inline animation-delay (index × step) — that
 *      stagger is what turns one per-letter keyframe into a travelling wave.
 *   2. One IntersectionObserver per heading; on first intersection it fades the
 *      heading in (opacity) and stamps data-triggered on every letter, so the
 *      CSS keyframe runs exactly once. The keyframe (dim → gradient → defined)
 *      lives in section-title.css; tune its colours there with CSS variables.
 *
 * No dependencies — vanilla JS + IntersectionObserver.
 * CSS : css/components/section-title.css
 *
 * DOM (Webflow) — add the attribute to any heading you want revealed:
 *   <h1 data-section-title>Make your business phone work for you</h1>
 *
 * Attributes:
 *   data-section-title          mark a heading for the reveal (required)
 *   data-section-title-step     ms between letters — controls the wave speed
 *                               and how wide the colour band is   (default 24)
 * (colours/duration are CSS variables — see section-title.css)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var CHAR_CLASS = "section-title-char";
  var STEP_DEFAULT = 24;   // ms between letters — sets wave speed + band width

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
          span.style.animationDelay = (state.n++ * state.step) + "ms";
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
    var state = { n: 0, step: step, chars: [] };
    splitNode(el, state);
    if (!state.chars.length) return;

    function trigger() {
      el.style.transition = "opacity 0.4s ease-out";      // soft overall fade-in
      el.style.opacity = "1";
      state.chars.forEach(function (c) { c.setAttribute("data-triggered", ""); });
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      trigger();                                          // no motion → defined colour
      return;
    }

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
