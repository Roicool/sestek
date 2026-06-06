/*!
 * site-utils.js v1.0.0
 * Small site-wide professionalism / a11y helpers — zero dependencies.
 *
 *   1. Skip-to-main link  [data-skip-link]  — keyboard users jump past the nav
 *   2. Footer year        [data-current-year] — auto-updates the © year
 *
 * Each helper is exposed individually AND through a convenience init:
 *   Sestek.initSkipLink()    — wire the skip link
 *   Sestek.initFooterYear()  — fill current year
 *   Sestek.initSiteUtils()   — run all of the above
 *
 * DOM:
 *   Skip link (place as the FIRST focusable element in <body>):
 *     <a data-skip-link href="#main" class="skip-link">Skip to content</a>
 *     <main id="main"> … </main>      (or [data-skip-target])
 *
 *   Footer year:
 *     <span data-current-year></span>            → "2026"
 *     <span data-current-year="© {year} Acme">…  → template, {year} replaced
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Wire skip-to-main links. On activation, moves focus to the target so the
   * next Tab continues from the main content — not just a visual scroll.
   */
  function initSkipLink() {
    var links = document.querySelectorAll("[data-skip-link]");
    if (!links.length) return;

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener("click", function (e) {
        // Resolve the target: href="#id", or first [data-skip-target], or #main
        var id = (link.getAttribute("href") || "").replace(/^#/, "");
        var target = id
          ? document.getElementById(id)
          : (document.querySelector("[data-skip-target]") || document.getElementById("main"));
        if (!target) return;

        e.preventDefault();

        // Make non-interactive targets focusable just for this jump
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: false });
      });
    });
  }

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
    initSkipLink();
    initFooterYear();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSkipLink   = initSkipLink;
  global.Sestek.initFooterYear = initFooterYear;
  global.Sestek.initSiteUtils  = initSiteUtils;

})(typeof window !== "undefined" ? window : this);
