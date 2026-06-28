/*!
 * stagger-button.js v1.0.0
 * Button hover text animation — the label's characters stagger UP and fade
 * out while a cloned copy of the same label staggers up FROM BELOW and fades
 * in, on mouseenter. Reverses on mouseleave. Degrades to no-op (text just
 * sits still) under prefers-reduced-motion.
 *
 * Requires: gsap (global) + GSAP's SplitText plugin (global)
 *
 * DOM (Webflow) — add to any link/button:
 *   [stagger-up-animate]
 *     .text-wrap                 ← positioning context (position:relative)
 *       [stagger-btn-text]       ← the visible label; JS clones this node,
 *                                   absolutely positions the clone on top,
 *                                   then SplitText's both into chars
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ANIM = { duration: 0.5, ease: "power3.inOut", stagger: 0.03 };

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

    global.requestAnimationFrame(function () {
      var splitOriginal = new SplitText(originalText, { type: "chars" });
      var splitClone = new SplitText(cloneText, { type: "chars" });

      gsap.set(splitClone.chars, { y: 100, opacity: 0 });

      link.addEventListener("mouseenter", function () {
        gsap.to(splitOriginal.chars, Object.assign({ y: -100, opacity: 0 }, ANIM));
        gsap.to(splitClone.chars, Object.assign({ y: 0, opacity: 1 }, ANIM));
      });

      link.addEventListener("mouseleave", function () {
        gsap.to(splitOriginal.chars, Object.assign({ y: 0, opacity: 1 }, ANIM));
        gsap.to(splitClone.chars, Object.assign({ y: 100, opacity: 0 }, ANIM));
      });
    });
  }

  /**
   * Wires every matched button/link with the stagger-up hover text swap.
   * @param {string} [selector="[stagger-up-animate]"]
   */
  function initStaggerButton(selector) {
    if (typeof gsap === "undefined" || typeof SplitText === "undefined") {
      console.error("[Sestek StaggerButton] GSAP + SplitText required.");
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
