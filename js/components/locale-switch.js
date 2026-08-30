/*!
 * locale-switch.js v1.0.0
 * Language switcher dropdown for the navbar — wraps Webflow's OWN Locales
 * list without touching its DOM.
 *
 * Webflow renders localization as a fixed hierarchy you cannot insert
 * anything into:
 *
 *   Locales Wrapper  →  Locales List  →  Locale (link)
 *
 * So the trigger is a SEPARATE div that sits next to that wrapper, and this
 * script wires the two together: the wrapper becomes the floating panel, the
 * div becomes the button. Nothing is inserted between Webflow's elements —
 * the script only adds attributes and classes, which Webflow keeps intact.
 *
 * Behaviour:
 *   • Click (or Enter/Space/↓ on the trigger) opens the panel; opening one
 *     switcher closes every other one on the page.
 *   • Click outside, ESC, Tab out, or picking a locale closes it.
 *   • ↑/↓ walk the locales, Home/End jump to first/last, ESC returns focus
 *     to the trigger.
 *   • The current locale (Webflow's `.w--current`) is flagged `.is-current`
 *     and its code is mirrored into [data-locale-label] — so the bar shows
 *     "EN" / "TR" without hardcoding it per page.
 *   • Responsive: the panel flips to the trigger's right edge when it would
 *     overflow the viewport (`data-locale-align` forces a side).
 *   • Optional hover-open to match the nav's mega-menus.
 *   • Re-running init is safe (bound roots are skipped), so it survives
 *     Barba/page-transition swaps.
 *
 * API:
 *   Sestek.initLocaleSwitch()   — wire every [data-locale-switch] block
 *   → returns [{ el, open, close, toggle, isOpen }]
 *
 * ── DOM (Webflow Designer) ────────────────────────────────────────
 *
 *   <div data-locale-switch>                    ← plain div (position:relative)
 *
 *     <div data-locale-trigger>                 ← plain div: the button
 *       <svg>…globe…</svg>                      ← your icon (embed/asset)
 *       <span data-locale-label>EN</span>       ← optional, JS keeps it in sync
 *       <svg class="locale-switch__chevron">…</svg>   ← optional chevron
 *     </div>
 *
 *     <!-- Webflow's Locales Wrapper — UNTOUCHED, just tagged: -->
 *     <div data-locale-panel class="w-locales-wrapper">
 *       <div class="w-locales-list">
 *         <a href="/"   hreflang="en" class="w--current">English</a>
 *         <a href="/tr" hreflang="tr">Türkçe</a>
 *       </div>
 *     </div>
 *   </div>
 *
 *   [data-locale-panel] is optional: without it the script auto-detects
 *   Webflow's `.w-locales-wrapper` / `.w-locales-list` inside the root.
 *
 * Root attributes (all optional):
 *   data-locale-align   "auto" (default) | "left" | "right"
 *   data-locale-hover   "true" → opens on hover (desktop only)  (default false)
 *   data-locale-label-mode  "code" (default, e.g. EN) | "name" (e.g. English)
 *
 * NOTE: the CSS hides the panel until it is opened, so ship both files
 * together — CSS without JS would leave the locale list unreachable.
 *
 * CSS: css/components/locale-switch.css
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  var HOVER_CLOSE_DELAY = 180; // ms — grace period when leaving the block
  var instances = [];
  var docBound = false;

  function warn(msg) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek.localeSwitch] " + msg);
    }
  }

  function closeAll(except) {
    instances.forEach(function (inst) {
      if (inst !== except && inst.isOpen()) inst.close();
    });
  }

  /* One document listener for every switcher, bound once. */
  function bindDocument() {
    if (docBound) return;
    docBound = true;

    document.addEventListener("click", function (e) {
      instances.forEach(function (inst) {
        if (inst.isOpen() && !inst.el.contains(e.target)) inst.close();
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      instances.forEach(function (inst) {
        if (inst.isOpen()) inst.close(true);
      });
    });
  }

  /* "tr-TR" → "TR", "english" → "EN" */
  function codeFrom(link) {
    var explicit = link.getAttribute("data-locale-code");
    if (explicit) return explicit.trim();

    var tag = link.getAttribute("hreflang") || link.getAttribute("lang");
    if (tag) return tag.split("-")[0].toUpperCase();

    return (link.textContent || "").trim().slice(0, 2).toUpperCase();
  }

  function initLocaleSwitch(selector) {
    var roots = document.querySelectorAll(selector || "[data-locale-switch]");
    if (!roots.length) {
      warn("No [data-locale-switch] blocks found — nothing to init.");
      return [];
    }

    bindDocument();
    var built = [];

    Array.prototype.forEach.call(roots, function (root) {
      if (root.__localeSwitchBound) return; // idempotent re-init

      var trigger = root.querySelector("[data-locale-trigger]");

      /* Panel: explicit tag first, then Webflow's own locale containers. */
      var panel =
        root.querySelector("[data-locale-panel]") ||
        root.querySelector(".w-locales-wrapper") ||
        root.querySelector(".w-locales-list");

      if (!trigger || !panel) {
        warn(
          "Skipping a [data-locale-switch] block — needs [data-locale-trigger] " +
          "and a locales wrapper (tag it [data-locale-panel] if it isn't a " +
          "Webflow .w-locales-wrapper)."
        );
        return;
      }
      if (panel.contains(trigger)) {
        warn("Skipping a block — the trigger must sit OUTSIDE the locales wrapper.");
        return;
      }

      var label     = trigger.querySelector("[data-locale-label]");
      var labelMode = root.getAttribute("data-locale-label-mode") || "code";
      var align     = root.getAttribute("data-locale-align") || "auto";
      var hoverOpen = root.getAttribute("data-locale-hover") === "true";

      root.__localeSwitchBound = true;
      root.classList.add("locale-switch");
      trigger.classList.add("locale-switch__trigger");
      panel.classList.add("locale-switch__panel");

      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      if (!trigger.hasAttribute("tabindex")) trigger.setAttribute("tabindex", "0");
      if (!trigger.hasAttribute("aria-label")) {
        trigger.setAttribute("aria-label", "Change language");
      }
      panel.setAttribute("aria-hidden", "true");

      var items = [];
      var activeIndex = -1;
      var hoverTimer = null;

      /* Webflow's markup nests link → item row → list. Tag each level so the
       * CSS can style it deterministically, whatever classes Webflow used. */
      function refreshItems() {
        items = Array.prototype.slice.call(panel.querySelectorAll("a"));
        activeIndex = -1;

        items.forEach(function (link) {
          link.classList.add("locale-switch__item");
          link.classList.remove("is-active");
          link.setAttribute("tabindex", "-1");

          var row = link.parentElement;
          if (row && row !== panel) {
            row.classList.add("locale-switch__row");
            var list = row.parentElement;
            if (list && list !== panel) list.classList.add("locale-switch__list");
          }

          var current =
            link.classList.contains("w--current") || link.hasAttribute("aria-current");
          link.classList.toggle("is-current", current);
        });

        if (panel.classList.contains("locale-switch__row")) {
          panel.classList.remove("locale-switch__row");
        }
      }

      /* Mirror the active locale onto the bar (EN / TR / English…). */
      function syncLabel() {
        if (!label) return;
        var current = items.filter(function (l) {
          return l.classList.contains("is-current");
        })[0];
        if (!current) return;
        label.textContent =
          labelMode === "name" ? (current.textContent || "").trim() : codeFrom(current);
      }

      function isOpen() {
        return root.classList.contains("is-open");
      }

      function setActive(index) {
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].classList.remove("is-active");
        }
        activeIndex = index;
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].classList.add("is-active");
          items[activeIndex].focus();
        }
      }

      /* Flip to the trigger's right edge when the panel would run off-screen —
       * a nav switcher usually sits at the right end of the bar. */
      function reposition() {
        if (align === "left" || align === "right") {
          root.classList.toggle("is-align-right", align === "right");
          return;
        }
        root.classList.remove("is-align-right");
        var rect = panel.getBoundingClientRect();
        var vw = global.innerWidth || document.documentElement.clientWidth;
        if (rect.right > vw - 8) root.classList.add("is-align-right");
      }

      function open() {
        if (isOpen()) return;
        closeAll(instance);
        refreshItems();
        root.classList.add("is-open");
        panel.setAttribute("aria-hidden", "false");
        trigger.setAttribute("aria-expanded", "true");
        reposition();
      }

      function close(focusTrigger) {
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].classList.remove("is-active");
        }
        activeIndex = -1;
        root.classList.remove("is-open");
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
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          if (!isOpen()) open();
          setActive(0);
        }
      });

      if (hoverOpen) {
        root.addEventListener("mouseenter", function () {
          if (global.matchMedia && !global.matchMedia("(hover: hover)").matches) return;
          clearTimeout(hoverTimer);
          open();
        });
        root.addEventListener("mouseleave", function () {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () { close(); }, HOVER_CLOSE_DELAY);
        });
      }

      panel.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown") {
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

      /* Delegated — the locale links navigate, but close anyway so a
       * cancelled navigation doesn't leave the panel hanging open. */
      panel.addEventListener("click", function (e) {
        if (e.target.closest("a")) close();
      });

      global.addEventListener("resize", function () {
        if (isOpen()) reposition();
      });

      refreshItems();
      syncLabel();
      close();

      var instance = {
        el: root,
        open: open,
        close: close,
        toggle: toggle,
        isOpen: isOpen,
      };
      instances.push(instance);
      built.push(instance);
    });

    return built;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLocaleSwitch = initLocaleSwitch;
})(typeof window !== "undefined" ? window : this);
