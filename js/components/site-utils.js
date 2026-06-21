/*!
 * site-utils.js v2.3.2
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
 * Plays nicely with AJAX content swaps (e.g. pagination.js): listens for a
 * "sestek:list-updated" document event and re-stamps the current view onto
 * whatever [data-view-card]s exist at that moment, so newly swapped-in
 * cards don't lose is-grid/is-list.
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
        // aria-pressed is only valid on role="button" — toggles are often
        // <a> tags (implicit role="link"), so stamp the role to stay valid.
        if (btn.tagName !== "BUTTON" && !btn.hasAttribute("role")) {
          btn.setAttribute("role", "button");
        }
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

    /* Target can live anywhere — look globally */
    var target  = document.querySelector("[data-view-target]");
    if (!target || !btns.length) return;

    // Re-queried on every apply (not cached) so cards swapped in later —
    // e.g. by pagination.js replacing a list's innerHTML via AJAX — are
    // picked up instead of operating on a stale, now-detached NodeList.
    function cards() { return document.querySelectorAll("[data-view-card]"); }

    /* Determine initial view: persisted → data-view-default → "grid" */
    var stored  = persistKey ? (localStorage.getItem("sv_" + persistKey) || "") : "";
    var defAttr = wrapper.getAttribute("data-view-default") || "grid";
    var currentView = (stored === "grid" || stored === "list") ? stored : defAttr;

    applyView(currentView, target, cards(), btns, false);

    Array.prototype.forEach.call(btns, function (btn) {
      btn.addEventListener("click", function (e) {
        var view = btn.getAttribute("data-view-btn");
        if (view !== "grid" && view !== "list") return;
        e.preventDefault();   // buttons are often <a href="#">, don't jump/scroll
        currentView = view;
        applyView(view, target, cards(), btns, true);
        if (persistKey) {
          try { localStorage.setItem("sv_" + persistKey, view); } catch (_) {}
        }
      });
    });

    // Re-stamp the current view onto freshly-swapped-in cards — fired by
    // pagination.js (or anything else that replaces list content) after a
    // content swap, since new markup arrives with no is-grid/is-list class.
    document.addEventListener("sestek:list-updated", function () {
      applyView(currentView, target, cards(), btns, false);
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
