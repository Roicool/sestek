/*!
 * accordion.js v1.1.0
 * Accessible, data-attribute-driven accordion (FAQ / disclosure groups).
 *   • Full ARIA: aria-expanded, aria-controls, aria-hidden, role wiring
 *   • Keyboard: Enter/Space toggle, ↑/↓/Home/End move between headers
 *   • GSAP height animation (0 ↔ auto) with clean overflow clipping
 *   • Inner [data-accordion-content] reveals with a fade+slide overlapping
 *     the height tween (opens) / fades out first (closes) — premium feel
 *   • Card look opt-in: data-accordion-card on the root (see accordion.css)
 *   • Single-open (default) or allow-multiple, opt-in via attribute
 *   • prefers-reduced-motion: instant open/close, no tween
 *
 * Requires: gsap (global). ScrollTrigger NOT required.
 * CSS: css/components/accordion.css
 *
 * DOM:
 *   <div data-accordion data-accordion-multiple="false">
 *     <div data-accordion-item>
 *       <button data-accordion-trigger>
 *         Question text
 *         <svg data-accordion-icon>…</svg>     optional — rotates when open
 *       </button>
 *       <div data-accordion-panel>
 *         <div data-accordion-content>Answer…</div>   inner wrapper measured
 *       </div>
 *     </div>
 *     <!-- more [data-accordion-item] … -->
 *   </div>
 *
 * Root attributes:
 *   data-accordion-multiple   "true" → multiple panels can stay open
 *                             (default: single — opening one closes others)
 *   data-accordion-duration   open/close seconds            (default 0.4)
 *   data-accordion-ease       GSAP ease                     (default power2.inOut)
 *
 * Item attribute:
 *   data-accordion-open       on an item → start expanded
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var uid = 0;

  /** Truthy-ish attribute → boolean. Present-but-empty counts as true. */
  function flag(v) {
    return v !== undefined && v !== null && v !== "false" && v !== "0" && v !== "no";
  }

  /**
   * Wire one [data-accordion] group.
   * @param {HTMLElement} root
   */
  function wireGroup(root) {
    var multiple = flag(root.getAttribute("data-accordion-multiple"));
    var duration = parseFloat(root.getAttribute("data-accordion-duration")) || 0.4;
    var ease     = root.getAttribute("data-accordion-ease") || "power2.inOut";
    var reduce   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-accordion-item]"));
    if (!items.length) return;

    var entries = items.map(function (item) {
      var trigger = item.querySelector("[data-accordion-trigger]");
      var panel   = item.querySelector("[data-accordion-panel]");
      if (!trigger || !panel) return null;

      // Stable ids for aria-controls / aria-labelledby
      uid += 1;
      var panelId   = panel.id   || ("sestek-acc-panel-" + uid);
      var triggerId = trigger.id || ("sestek-acc-trigger-" + uid);
      panel.id   = panelId;
      trigger.id = triggerId;

      // ARIA wiring
      if (trigger.tagName !== "BUTTON") trigger.setAttribute("role", "button");
      if (!trigger.hasAttribute("tabindex") && trigger.tagName !== "BUTTON") {
        trigger.setAttribute("tabindex", "0");
      }
      trigger.setAttribute("aria-controls", panelId);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", triggerId);

      // Inner content wrapper — animated (fade+slide) alongside the height.
      var content = panel.querySelector("[data-accordion-content]");

      return { item: item, trigger: trigger, panel: panel, content: content, open: false };
    }).filter(Boolean);

    if (!entries.length) return;

    /** Apply the closed visual state (height 0, hidden). */
    function setClosed(entry, animate) {
      entry.open = false;
      entry.trigger.setAttribute("aria-expanded", "false");
      entry.item.classList.remove("is-open");
      entry.panel.setAttribute("aria-hidden", "true");
      gsap.killTweensOf(entry.panel);
      if (entry.content) gsap.killTweensOf(entry.content);

      if (reduce || !animate) {
        gsap.set(entry.panel, { height: 0, overflow: "hidden" });
        if (entry.content) gsap.set(entry.content, { opacity: 0, y: 8 });
        return;
      }
      // İçerik önce hızlıca solar, panel sonra kapanır → boş kutu görünmez.
      if (entry.content) {
        gsap.to(entry.content, {
          opacity: 0, y: 8,
          duration: Math.min(0.2, duration * 0.5), ease: "power1.in",
        });
      }
      gsap.to(entry.panel, {
        height: 0,
        duration: duration,
        ease: ease,
        overflow: "hidden",
      });
    }

    /** Apply the open visual state (height auto, visible). */
    function setOpen(entry, animate) {
      entry.open = true;
      entry.trigger.setAttribute("aria-expanded", "true");
      entry.item.classList.add("is-open");
      entry.panel.setAttribute("aria-hidden", "false");
      gsap.killTweensOf(entry.panel);
      if (entry.content) gsap.killTweensOf(entry.content);

      if (reduce || !animate) {
        gsap.set(entry.panel, { height: "auto", overflow: "visible" });
        if (entry.content) gsap.set(entry.content, { opacity: 1, y: 0 });
        return;
      }
      // Measure target height, animate 0→px, then settle to auto so the panel
      // reflows naturally if its content changes later.
      gsap.set(entry.panel, { height: "auto", overflow: "hidden" });
      var target = entry.panel.offsetHeight;
      gsap.fromTo(entry.panel,
        { height: 0 },
        {
          height: target,
          duration: duration,
          ease: ease,
          onComplete: function () { gsap.set(entry.panel, { height: "auto", overflow: "visible" }); },
        }
      );
      // İçerik yükseklikle üst üste binerek belirir — premium "reveal".
      if (entry.content) {
        gsap.fromTo(entry.content,
          { opacity: 0, y: 8 },
          {
            opacity: 1, y: 0,
            duration: duration, ease: "power2.out",
            delay: duration * 0.18,
          }
        );
      }
    }

    function open(entry) {
      if (!multiple) {
        entries.forEach(function (e) { if (e !== entry && e.open) setClosed(e, true); });
      }
      setOpen(entry, true);
    }

    function toggle(entry) {
      if (entry.open) setClosed(entry, true);
      else open(entry);
    }

    // Initial state — items flagged data-accordion-open start expanded
    entries.forEach(function (entry) {
      if (flag(entry.item.getAttribute("data-accordion-open"))) setOpen(entry, false);
      else setClosed(entry, false);
    });
    // Single mode: if several were flagged open, keep only the first
    if (!multiple) {
      var seen = false;
      entries.forEach(function (entry) {
        if (entry.open) {
          if (seen) setClosed(entry, false);
          seen = true;
        }
      });
    }

    // Click + keyboard
    entries.forEach(function (entry, i) {
      entry.trigger.addEventListener("click", function (e) {
        e.preventDefault();
        toggle(entry);
      });

      entry.trigger.addEventListener("keydown", function (e) {
        var k = e.key;
        // Space/Enter on a non-button role
        if ((k === " " || k === "Enter") && entry.trigger.tagName !== "BUTTON") {
          e.preventDefault();
          toggle(entry);
          return;
        }
        // Roving focus across headers
        var next = null;
        if (k === "ArrowDown")      next = entries[(i + 1) % entries.length];
        else if (k === "ArrowUp")   next = entries[(i - 1 + entries.length) % entries.length];
        else if (k === "Home")      next = entries[0];
        else if (k === "End")       next = entries[entries.length - 1];
        if (next) { e.preventDefault(); next.trigger.focus(); }
      });
    });

    return { root: root, entries: entries };
  }

  /**
   * Initialize all [data-accordion] groups on the page.
   * @param {string} [selector="[data-accordion]"]
   * @returns {Array} one controller object per group
   */
  function initAccordion(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Accordion] GSAP required."); return [];
    }
    var groups = document.querySelectorAll(selector || "[data-accordion]");
    var controllers = [];
    Array.prototype.forEach.call(groups, function (g) {
      var c = wireGroup(g);
      if (c) controllers.push(c);
    });
    return controllers;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initAccordion = initAccordion;

})(typeof window !== "undefined" ? window : this);
