/*!
 * badge-swap.js v1.0.0
 * Clickable badge row where the clicked badge physically swaps to the front
 * (FLIP reorder — First/Last/Invert/Play, no plugin needed) and a matching
 * description crossfades in below.
 *
 * Requires : gsap (global). No Flip plugin — reorder is plain rect-diff + gsap.to.
 * CSS      : css/components/badge-swap.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-badge-swap]                    root
 *     [data-badge-swap-list]             the row (flex); DOM order = visual order
 *       [data-badge-swap-item]           one badge — button/link, holds:
 *         data-badge-swap-name           bold lead-in, e.g. "Anthropic"
 *         data-badge-swap-copy           rest of the sentence
 *         …icon markup (img/svg)…
 *     [data-badge-swap-desc]             description line
 *       [data-badge-swap-desc-name]      filled with the active item's -name
 *       [data-badge-swap-desc-copy]      filled with the active item's -copy
 *
 * Root attributes (all optional):
 *   data-badge-swap-duration   reorder + crossfade duration in seconds (default 0.5)
 *   data-badge-swap-ease       reorder ease                            (default "power3.out")
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function build(root) {
    if (root._badgeSwapInit) return;                        // idempotent
    root._badgeSwapInit = true;

    var list = root.querySelector("[data-badge-swap-list]");
    var items = Array.from(root.querySelectorAll("[data-badge-swap-item]"));
    var descName = root.querySelector("[data-badge-swap-desc-name]");
    var descCopy = root.querySelector("[data-badge-swap-desc-copy]");

    if (!list || items.length < 2) {
      console.warn("[Sestek BadgeSwap] Need a [data-badge-swap-list] with 2+ [data-badge-swap-item]s.");
      return;
    }

    var duration = parseFloat(root.getAttribute("data-badge-swap-duration")) || 0.5;
    var ease = root.getAttribute("data-badge-swap-ease") || "power3.out";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Fill the description from an item's data attributes. */
    function setDesc(item, animate) {
      var name = item.getAttribute("data-badge-swap-name") || "";
      var copy = item.getAttribute("data-badge-swap-copy") || "";
      if (!descName && !descCopy) return;

      function apply() {
        if (descName) descName.textContent = name;
        if (descCopy) descCopy.textContent = copy;
      }

      if (!animate || reduce) { apply(); return; }
      var targets = [descName, descCopy].filter(Boolean);
      gsap.killTweensOf(targets);
      gsap.to(targets, {
        autoAlpha: 0, y: -4, duration: duration * 0.4, ease: "power1.in",
        onComplete: function () {
          apply();
          gsap.fromTo([descName, descCopy].filter(Boolean),
            { autoAlpha: 0, y: 4 },
            { autoAlpha: 1, y: 0, duration: duration * 0.6, ease: "power2.out" });
        },
      });
    }

    /** FLIP: move `item` to the front of `list`, animating every displaced sibling. */
    function moveToFront(item) {
      if (list.firstElementChild === item) return;

      var before = new Map();
      items.forEach(function (el) { before.set(el, el.getBoundingClientRect()); });

      list.insertBefore(item, list.firstElementChild);

      if (reduce) return;

      items.forEach(function (el) {
        var first = before.get(el);
        var last = el.getBoundingClientRect();
        var dx = first.left - last.left;
        if (!dx) return;
        gsap.fromTo(el, { x: dx }, { x: 0, duration: duration, ease: ease, overwrite: "auto" });
      });
    }

    function activate(item) {
      if (item.classList.contains("is-active")) return;
      items.forEach(function (el) { el.classList.toggle("is-active", el === item); });
      moveToFront(item);
      setDesc(item, true);
    }

    items.forEach(function (item, i) {
      if (i === 0) item.classList.add("is-active");
      item.addEventListener("click", function () { activate(item); });
    });

    setDesc(items[0], false);                                // initial description, no fade
  }

  /**
   * Initializes every badge-swap on the page in one call.
   * @param {string} [selector="[data-badge-swap]"] narrow the scope if needed
   */
  function initBadgeSwap(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek BadgeSwap] GSAP required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-badge-swap]");
    if (!roots.length) { console.warn("[Sestek BadgeSwap] No [data-badge-swap] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBadgeSwap = initBadgeSwap;

})(typeof window !== "undefined" ? window : this);
