/*!
 * link-underline.js v1.0.0
 * GSAP-driven hover underline — a line hidden under any link wipes IN on
 * mouseenter and wipes OUT on mouseleave, both sweeping the same
 * left → right direction (rather than growing then shrinking back to where
 * it came from), for a premium, directional feel.
 *
 * Requires: gsap (global)
 * CSS     : css/effects/link-underline.css
 *
 * DOM (Webflow) — add the attribute to any link:
 *   <a data-underline href="#">Link text</a>
 *
 * The <span class="link-underline__line"> is injected automatically — you
 * don't add it in Webflow. The link is forced to position:relative /
 * display:inline-block via CSS so the line sits flush under its own text
 * width, not the full row.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function bind(link, reduce) {
    if (link._underlineInit) return;
    link._underlineInit = true;

    var line = global.document.createElement("span");
    line.className = "link-underline__line";
    link.appendChild(line);

    if (reduce) return; // CSS shows a static underline instead — see stylesheet

    gsap.set(line, { scaleX: 0, transformOrigin: "left" });

    link.addEventListener("mouseenter", function () {
      gsap.killTweensOf(line);
      gsap.set(line, { transformOrigin: "left" });
      gsap.to(line, { scaleX: 1, duration: 0.35, ease: "power3.out" });
    });

    link.addEventListener("mouseleave", function () {
      gsap.killTweensOf(line);
      gsap.set(line, { transformOrigin: "right" });
      gsap.to(line, { scaleX: 0, duration: 0.35, ease: "power3.in" });
    });
  }

  /**
   * Wires every matched link with the hover-underline behaviour.
   * @param {string} [selector="[data-underline]"]
   */
  function initLinkUnderline(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek LinkUnderline] GSAP required.");
      return;
    }
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var links = global.document.querySelectorAll(selector || "[data-underline]");
    Array.prototype.forEach.call(links, function (link) { bind(link, reduce); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLinkUnderline = initLinkUnderline;

})(typeof window !== "undefined" ? window : this);
