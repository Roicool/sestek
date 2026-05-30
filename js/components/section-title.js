/*!
 * section-title.js v1.0.0
 * One-shot, character-by-character heading reveal — each letter eases its
 * colour in on a 20ms stagger as the heading scrolls into view, while the whole
 * heading fades in (opacity 0→1). The beside.com title look.
 *
 * What it does (pure CSS drives the motion; JS only splits + triggers):
 *   1. Splits a heading's text into <span class="section-title-char"> letters,
 *      giving each an incremental inline animation-delay (index × step).
 *   2. One IntersectionObserver per heading; on first intersection it fades the
 *      heading in and stamps data-triggered on every letter, so the CSS keyframe
 *      runs exactly once, cascading left-to-right.
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
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var CHAR_CLASS = "section-title-char";
  var STEP_DEFAULT = 20;   // ms between letters — matches beside's 20ms cascade

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
      el.style.transition = "opacity 0.4s ease-out";      // only the reveal fades
      el.style.opacity = "1";                             // fade the heading in
      state.chars.forEach(function (c) { c.setAttribute("data-triggered", ""); });
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      trigger();                                          // no motion → final state
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
