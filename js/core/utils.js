/*!
 * utils.js v1.0.0
 * Sestek shared core helpers — tiny, dependency-free utilities reused across
 * components and animations. Load this once (core layer) before any component
 * that uses Sestek.util.*, the same way gsap/lenis-init are loaded.
 *
 * Exposes:
 *   Sestek.util.attrNum(el, attr, fallback)   numeric data-attribute reader
 *   Sestek.util.flag(value)                   present/"true"-ish attribute test
 *   Sestek.util.resolveColor(value, ctxEl)    CSS var token → computed colour
 *   Sestek.util.prefersReducedMotion()        prefers-reduced-motion: reduce ?
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Read a numeric data-attribute, returning `fallback` when it is missing,
   * empty, or not a number.
   * @param {HTMLElement} el
   * @param {string} attr
   * @param {number} fallback
   * @returns {number}
   */
  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Boolean test for a presence/value flag attribute. Absent → false;
   * present-but-empty → true; "false" / "0" / "no" / "off" → false;
   * any other value → true.
   * @param {string|null} v  raw getAttribute() value
   * @returns {boolean}
   */
  function flag(v) {
    if (v === null || v === undefined) return false;
    if (v === "") return true;
    return v !== "false" && v !== "0" && v !== "no" && v !== "off";
  }

  /**
   * Resolve a colour value to something GSAP can interpolate. A raw colour
   * (#hex, rgb(), named) passes straight through; a CSS-variable token —
   * "var(--token)" or bare "--token" — is resolved to its computed value
   * read from `contextEl` (so scope-overridden variables resolve correctly).
   * @param {string} value
   * @param {HTMLElement} contextEl  element to read the computed variable from
   * @returns {string}
   */
  function resolveColor(value, contextEl) {
    if (!value) return value;
    var v = value.trim();
    var name = null;
    var m = v.match(/^var\(\s*(--[^,)\s]+)/);
    if (m) name = m[1];
    else if (v.indexOf("--") === 0) name = v;
    if (!name) return v;
    var resolved = getComputedStyle(contextEl).getPropertyValue(name).trim();
    return resolved || v;
  }

  /** @returns {boolean} true when the user requested reduced motion. */
  function prefersReducedMotion() {
    return typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.util = global.Sestek.util || {
    attrNum: attrNum,
    flag: flag,
    resolveColor: resolveColor,
    prefersReducedMotion: prefersReducedMotion,
  };
})(typeof window !== "undefined" ? window : this);
