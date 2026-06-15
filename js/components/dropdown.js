/*!
 * dropdown.js v1.0.0
 * Simple disclosure dropdown (e.g. "Explore categories"): clicking the
 * trigger reveals a floating panel of links below it.
 *
 * Behaviour:
 *   • Click (or Enter/Space/↓ on the trigger) opens the panel.
 *   • Opening one dropdown closes any other open dropdown on the page.
 *   • Click outside, ESC, or selecting a link closes it.
 *   • ↑/↓ move through the links, Home/End jump to first/last, Enter
 *     follows the highlighted link, ESC returns focus to the trigger.
 *   • Trigger carries aria-expanded/aria-haspopup; panel carries aria-hidden.
 *
 * API:
 *   Sestek.initDropdown()   — wire every [data-dropdown] block on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-dropdown>
 *     <button data-dropdown-trigger aria-haspopup="true" aria-expanded="false">
 *       Explore categories
 *       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 *         <path d="m6 9 6 6 6-6"></path>
 *       </svg>
 *     </button>
 *     <div data-dropdown-panel role="menu">
 *       <a class="dropdown__item" role="menuitem" href="/blog/category/ai">AI</a>
 *       <a class="dropdown__item" role="menuitem" href="/blog/category/accounting">Accounting</a>
 *       …
 *     </div>
 *   </div>
 *
 * CSS: css/components/dropdown.css
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function warn(msg) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek.dropdown] " + msg);
    }
  }

  function initDropdown(selector) {
    var roots = document.querySelectorAll(selector || "[data-dropdown]");
    if (!roots.length) {
      warn("No [data-dropdown] blocks found on the page — nothing to init.");
      return;
    }

    var instances = [];

    function closeAll(except) {
      instances.forEach(function (inst) {
        if (inst !== except && inst.isOpen()) inst.close();
      });
    }

    Array.prototype.forEach.call(roots, function (root) {
      var trigger = root.querySelector("[data-dropdown-trigger]");
      var panel   = root.querySelector("[data-dropdown-panel]");

      if (!trigger || !panel) {
        warn("Skipping a [data-dropdown] block — needs both [data-dropdown-trigger] and [data-dropdown-panel].");
        return;
      }

      var items = Array.prototype.slice.call(panel.querySelectorAll(".dropdown__item"));
      var activeIndex = -1;

      items.forEach(function (item) { item.setAttribute("tabindex", "-1"); });

      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");

      function isOpen() {
        return panel.classList.contains("is-open");
      }

      function setActive(index) {
        if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove("is-active");
        activeIndex = index;
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].classList.add("is-active");
          items[activeIndex].focus();
        }
      }

      function open() {
        closeAll(instance);
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        trigger.setAttribute("aria-expanded", "true");
      }

      function close(focusTrigger) {
        if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove("is-active");
        activeIndex = -1;
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        trigger.setAttribute("aria-expanded", "false");
        if (focusTrigger) trigger.focus();
      }

      function toggle() {
        if (isOpen()) close(true); else open();
      }

      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        toggle();
      });

      trigger.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          if (!isOpen()) {
            e.preventDefault();
            open();
            setActive(0);
          }
        }
      });

      panel.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          e.preventDefault();
          close(true);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setActive(activeIndex < items.length - 1 ? activeIndex + 1 : 0);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActive(activeIndex > 0 ? activeIndex - 1 : items.length - 1);
        } else if (e.key === "Home") {
          e.preventDefault();
          setActive(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setActive(items.length - 1);
        } else if (e.key === "Tab") {
          close();
        }
      });

      items.forEach(function (item) {
        item.addEventListener("click", function () { close(); });
      });

      document.addEventListener("click", function (e) {
        if (!isOpen()) return;
        if (root.contains(e.target)) return;
        close();
      });

      var instance = { isOpen: isOpen, close: close };
      instances.push(instance);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initDropdown = initDropdown;
})(typeof window !== "undefined" ? window : this);
