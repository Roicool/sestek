/*!
 * site-utils.js v2.1.0
 * Small site-wide professionalism helpers — zero dependencies.
 *
 *   1. Footer year   [data-current-year]  — auto-updates the © year
 *   2. View toggle   [data-view-toggle]   — grid ↔ list layout switcher
 *
 * Exposed individually AND through a convenience init:
 *   Sestek.initFooterYear()   — fill current year
 *   Sestek.initViewToggle()   — wire grid/list toggle(s)
 *   Sestek.initSiteUtils()    — run all of the above
 *
 * ── Footer year DOM ─────────────────────────────────────────────
 *   <span data-current-year></span>            → "2026"
 *   <span data-current-year="© {year} Acme">…  → template, {year} replaced
 *
 * ── View toggle DOM ─────────────────────────────────────────────
 *
 *   <!-- Buttons — place anywhere on the page -->
 *   <div data-view-toggle>
 *     <button data-view-btn="grid">Grid</button>
 *     <button data-view-btn="list">List</button>
 *   </div>
 *
 *   <!-- Cards container -->
 *   <div data-view-target>
 *     <div data-view-card>…</div>
 *     <div data-view-card>…</div>
 *   </div>
 *
 * Classes added by JS (style via Webflow Designer combo classes):
 *   [data-view-target].is-list   — container in list mode
 *   [data-view-target].is-grid   — container in grid mode (default)
 *   [data-view-card].is-list     — each card in list mode
 *   [data-view-card].is-grid     — each card in grid mode (default)
 *   [data-view-item].is-list     — any element in list mode
 *   [data-view-item].is-grid     — any element in grid mode (default)
 *   [data-view-btn].is-active    — the currently active button
 *
 * Optional: persist last selection across pages with localStorage.
 *   <div data-view-toggle data-view-persist="my-collection">…</div>
 *   (value = unique key, so multiple toggles on a site don't clash)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  // ── 1. Footer year ──────────────────────────────────────────────

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

  // ── 2. View toggle ──────────────────────────────────────────────

  /**
   * Apply a view ("grid" or "list") to a target + its cards.
   * Also marks the correct button as active.
   */
  function applyView(view, target, cards, btns, animate) {
    var other = view === "list" ? "grid" : "list";

    function commit() {
      target.classList.add("is-" + view);
      target.classList.remove("is-" + other);

      Array.prototype.forEach.call(cards, function (card) {
        card.classList.add("is-" + view);
        card.classList.remove("is-" + other);
      });

      Array.prototype.forEach.call(
        document.querySelectorAll("[data-view-item]"),
        function (el) {
          el.classList.add("is-" + view);
          el.classList.remove("is-" + other);
        }
      );

      Array.prototype.forEach.call(btns, function (btn) {
        var isActive = btn.getAttribute("data-view-btn") === view;
        btn.classList.toggle("is-active", isActive);
        btn.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    if (!animate) { commit(); return; }

    /* Fade out → commit layout → fade in */
    target.classList.add("is-switching");
    setTimeout(function () {
      commit();
      target.classList.remove("is-switching");
    }, 150);
  }

  /**
   * Wire a single [data-view-toggle] wrapper.
   */
  function wireToggle(wrapper) {
    var btns    = wrapper.querySelectorAll("[data-view-btn]");
    var persistKey = wrapper.getAttribute("data-view-persist");

    /* Target and cards can live anywhere — look globally */
    var target  = document.querySelector("[data-view-target]");
    var cards   = document.querySelectorAll("[data-view-card]");

    if (!target || !btns.length) return;

    /* Determine initial view: persisted → data-view-default → "grid" */
    var stored  = persistKey ? (localStorage.getItem("sv_" + persistKey) || "") : "";
    var defAttr = wrapper.getAttribute("data-view-default") || "grid";
    var initial = (stored === "grid" || stored === "list") ? stored : defAttr;

    applyView(initial, target, cards, btns, false);

    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener("click", function () {
        var view = btn.getAttribute("data-view-btn");
        if (view !== "grid" && view !== "list") return;
        applyView(view, target, cards, btns, true);
        if (persistKey) {
          try { localStorage.setItem("sv_" + persistKey, view); } catch (_) {}
        }
      });
    });
  }

  /**
   * Initialise all [data-view-toggle] wrappers on the page.
   * Safe to call on pages without any — exits immediately.
   */
  function initViewToggle() {
    var wrappers = document.querySelectorAll("[data-view-toggle]");
    if (!wrappers.length) return;
    Array.prototype.forEach.call(wrappers, wireToggle);
  }

  // ── Public API ──────────────────────────────────────────────────

  function initSiteUtils() {
    initFooterYear();
    initViewToggle();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFooterYear  = initFooterYear;
  global.Sestek.initViewToggle  = initViewToggle;
  global.Sestek.initSiteUtils   = initSiteUtils;

})(typeof window !== "undefined" ? window : this);
