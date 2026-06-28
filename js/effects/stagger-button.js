/*!
 * stagger-button.js v2.0.0
 * Button hover text animation — the label's characters stagger UP and fade
 * out while a cloned copy of the same label staggers up FROM BELOW and fades
 * in, on mouseenter. Reverses on mouseleave. Degrades to no-op (text just
 * sits still) under prefers-reduced-motion.
 *
 * Requires: gsap (global) only — no SplitText plugin. Characters are split
 * into spans by hand (splitChars below) so this has zero extra script tags
 * or version pinning to worry about.
 *
 * DOM (Webflow) — add to any link/button:
 *   [stagger-up-animate]
 *     .text-wrap                 ← positioning context (position:relative,
 *                                   overflow:hidden recommended so the
 *                                   sliding chars don't spill out)
 *       [stagger-btn-text]       ← the visible label; JS clones this node,
 *                                   absolutely positions the clone on top,
 *                                   then splits both into char spans
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ANIM = { duration: 0.5, ease: "power3.inOut", stagger: 0.03 };

  /** Wraps every character of el's text in its own <span>, in place.
   *  Returns the array of char spans. Whitespace is kept as a plain space
   *  inside its own span so layout/kerning isn't affected. */
  function splitChars(el) {
    var text = el.textContent;
    el.textContent = "";
    var spans = [];
    Array.prototype.forEach.call(text, function (ch) {
      var span = global.document.createElement("span");
      span.style.display = "inline-block";
      span.textContent = ch;
      el.appendChild(span);
      spans.push(span);
    });
    return spans;
  }

  function bind(link, reduce) {
    if (link._staggerInit) return;
    link._staggerInit = true;

    var container = link.querySelector(".text-wrap");
    var originalText = container && container.querySelector("[stagger-btn-text]");
    if (!container || !originalText) return;

    if (reduce) return; // text stays static

    var cloneText = originalText.cloneNode(true);
    container.appendChild(cloneText);

    gsap.set(cloneText, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      pointerEvents: "none",
    });

    var originalChars = splitChars(originalText);
    var cloneChars = splitChars(cloneText);

    gsap.set(cloneChars, { y: 100, opacity: 0 });

    link.addEventListener("mouseenter", function () {
      gsap.to(originalChars, Object.assign({ y: -100, opacity: 0 }, ANIM));
      gsap.to(cloneChars, Object.assign({ y: 0, opacity: 1 }, ANIM));
    });

    link.addEventListener("mouseleave", function () {
      gsap.to(originalChars, Object.assign({ y: 0, opacity: 1 }, ANIM));
      gsap.to(cloneChars, Object.assign({ y: 100, opacity: 0 }, ANIM));
    });
  }

  /**
   * Wires every matched button/link with the stagger-up hover text swap.
   * @param {string} [selector="[stagger-up-animate]"]
   */
  function initStaggerButton(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek StaggerButton] GSAP required.");
      return;
    }
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var links = global.document.querySelectorAll(selector || "[stagger-up-animate]");
    Array.prototype.forEach.call(links, function (link) { bind(link, reduce); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStaggerButton = initStaggerButton;

})(typeof window !== "undefined" ? window : this);
