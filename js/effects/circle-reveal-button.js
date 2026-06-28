/*!
 * circle-reveal-button.js v1.0.0
 * Button hover effect — the label lifts up while a small circle scales up
 * to fill/reveal the button on mouseenter, both reversing on mouseleave.
 *
 * Requires: gsap (global)
 *
 * DOM (Webflow) — add to any button/link:
 *   .explore-btn
 *     .btn-text-wrapper   ← the visible label, lifts up on hover
 *     .circle-scale       ← small circle, scales up to reveal on hover
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function bind(button, reduce) {
    if (button._circleRevealInit) return;
    button._circleRevealInit = true;

    var textWrapper = button.querySelector(".btn-text-wrapper");
    var circleScale = button.querySelector(".circle-scale");
    if (!textWrapper || !circleScale) return;

    if (reduce) return; // no motion

    button.addEventListener("mouseenter", function () {
      gsap.to(textWrapper, { y: -20, duration: 0.5, ease: "power2.out" });
      gsap.to(circleScale, { scale: 12, duration: 0.4, ease: "power2.out" });
    });

    button.addEventListener("mouseleave", function () {
      gsap.to(textWrapper, { y: 0, duration: 0.5, ease: "power2.out" });
      gsap.to(circleScale, { scale: 0, duration: 0.4, ease: "power2.out" });
    });
  }

  /**
   * Wires every matched button with the circle-reveal hover behaviour.
   * @param {string} [selector=".explore-btn"]
   */
  function initCircleRevealButton(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek CircleRevealButton] GSAP required.");
      return;
    }
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var buttons = global.document.querySelectorAll(selector || ".explore-btn");
    Array.prototype.forEach.call(buttons, function (button) { bind(button, reduce); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCircleRevealButton = initCircleRevealButton;

})(typeof window !== "undefined" ? window : this);
