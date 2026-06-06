/*!
 * site-utils.js v2.0.0
 * Small site-wide professionalism helpers — zero dependencies.
 *
 *   1. Footer year  [data-current-year] — auto-updates the © year
 *
 * Exposed individually AND through a convenience init:
 *   Sestek.initFooterYear()  — fill current year
 *   Sestek.initSiteUtils()   — run all of the above
 *
 * DOM:
 *   <span data-current-year></span>            → "2026"
 *   <span data-current-year="© {year} Acme">…  → template, {year} replaced
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Fill [data-current-year] elements with the current year.
   * If the attribute has a value, "{year}" within it is replaced; otherwise
   * the element's text is set to the bare year.
   */
  function initFooterYear() {
    var els = document.querySelectorAll("[data-current-year]");
    if (!els.length) return;

    var year = String(new Date().getFullYear());
    Array.prototype.forEach.call(els, function (el) {
      var tpl = el.getAttribute("data-current-year");
      el.textContent = (tpl && tpl.indexOf("{year}") !== -1)
        ? tpl.replace(/\{year\}/g, year)
        : year;
    });
  }

  /** Run all site-wide helpers. */
  function initSiteUtils() {
    initFooterYear();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFooterYear = initFooterYear;
  global.Sestek.initSiteUtils  = initSiteUtils;

})(typeof window !== "undefined" ? window : this);
