/*!
 * dropdown.js v1.3.0
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
 *   • Links (.dropdown__item) are re-scanned every time the panel opens, so
 *     CMS lists that load/filter items after page load (Finsweet, pagination,
 *     "load more") still get keyboard nav + click-to-close automatically —
 *     no per-item listeners to rebind.
 *   • Responsive: if the panel would overflow the right edge of the
 *     viewport, it flips to align to the trigger's right edge instead.
 *   • If the trigger has a [data-dropdown-label] element, its text is kept
 *     in sync with the selected item: updated on click, and pre-filled on
 *     load from whichever item is the current page (Webflow's ".w--current"
 *     class, or an explicit [aria-current]).
 *
 * API:
 *   Sestek.initDropdown()   — wire every [data-dropdown] block on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-dropdown>
 *     <button data-dropdown-trigger aria-haspopup="true" aria-expanded="false">
 *       <span data-dropdown-label>Explore categories</span>
 *       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 *         <path d="m6 9 6 6 6-6"></path>
 *       </svg>
 *     </button>
 *
 *     <!-- can be a static list OR a Webflow CMS Collection List Wrapper —
 *          each Collection Item link block just needs class="dropdown__item" -->
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

      var label = trigger.querySelector("[data-dropdown-label]");

      var items = [];
      var activeIndex = -1;

      // Mirror the selected item's text onto the trigger label, and flag it
      // (.is-selected) inside the panel so it can be styled as the current
      // choice next time the panel opens.
      function selectItem(item) {
        if (!label || !item) return;
        items.forEach(function (it) { it.classList.remove("is-selected"); });
        item.classList.add("is-selected");
        label.textContent = item.textContent.trim();
      }

      // Pre-fill the label from whichever item represents the current page,
      // so a category page loads with that category already shown.
      function selectCurrent() {
        if (!label) return;
        var current = panel.querySelector(
          ".dropdown__item.w--current, .dropdown__item[aria-current]"
        );
        if (current) selectItem(current);
      }

      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      panel.setAttribute("aria-hidden", "true");

      function isOpen() {
        return panel.classList.contains("is-open");
      }

      // Re-scan on every open so CMS/Finsweet items added after init are included.
      function refreshItems() {
        items = Array.prototype.slice.call(panel.querySelectorAll(".dropdown__item"));
        items.forEach(function (item) {
          item.setAttribute("tabindex", "-1");
          item.classList.remove("is-active");
        });
        activeIndex = -1;
      }

      function setActive(index) {
        if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].classList.remove("is-active");
        activeIndex = index;
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].classList.add("is-active");
          items[activeIndex].focus();
        }
      }

      // The panel is `width: 100%` of the trigger's box, so widen the
      // trigger (min-width) to fit the widest item — keeps both the same
      // width instead of the panel overflowing past a narrow trigger.
      function matchWidth() {
        var prevPanelWidth = panel.style.width;
        panel.style.width = "max-content";
        var panelWidth = panel.offsetWidth;
        panel.style.width = prevPanelWidth;

        trigger.style.minWidth = "";
        var triggerWidth = trigger.offsetWidth;

        trigger.style.minWidth = Math.max(triggerWidth, panelWidth) + "px";
      }

      // Flip the panel to align with the trigger's right edge if it would
      // otherwise overflow the viewport — keeps it on-screen at any width.
      function reposition() {
        root.classList.remove("is-align-right");
        var rect = panel.getBoundingClientRect();
        if (rect.right > (global.innerWidth || document.documentElement.clientWidth)) {
          root.classList.add("is-align-right");
        }
      }

      function open() {
        closeAll(instance);
        refreshItems();
        matchWidth();
        panel.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        trigger.setAttribute("aria-expanded", "true");
        reposition();
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

      // Delegated — covers items rendered/added after init too.
      panel.addEventListener("click", function (e) {
        var picked = e.target.closest(".dropdown__item");
        if (picked) {
          selectItem(picked);
          close();
        }
      });

      document.addEventListener("click", function (e) {
        if (!isOpen()) return;
        if (root.contains(e.target)) return;
        close();
      });

      global.addEventListener("resize", function () {
        matchWidth();
        if (isOpen()) reposition();
      });

      matchWidth();
      refreshItems();
      selectCurrent();

      var instance = { isOpen: isOpen, close: close };
      instances.push(instance);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initDropdown = initDropdown;
})(typeof window !== "undefined" ? window : this);
