/*!
 * stack-panels.js v1.0.0
 * "Stacking panels" scrollytelling: each panel (but the last) pins in place
 * with pinSpacing:false, then — as you keep scrolling and the NEXT panel
 * slides up over it — scales down and fades away, so panels visually stack
 * and dissolve one into the next (the classic GSAP "stacking cards" pattern).
 *
 * Tall panels (content taller than the viewport) get a "fake scroll" phase
 * first: the inner content translates up to reveal the rest before the
 * scale/fade kicks in, so nothing is skipped.
 *
 * This is a SEPARATE component from pin-slider.js (horizontal slide) and
 * scroll-stack.js (list + receding card deck) — different visual, its own
 * DOM/attributes. Do not mix them into the same root.
 *
 * Requires: gsap + ScrollTrigger (globals), Sestek.util (js/core/utils.js).
 * CSS     : css/components/stack-panels.css
 *
 * DOM:
 *   [data-stack-panels]              root (plain wrapper, no pin itself)
 *     [data-sp-panel]                one panel — ALL but the last one pin
 *       [data-sp-inner]              OPTIONAL: content wrapper. Only needed
 *                                    when the panel's content can be taller
 *                                    than the viewport — enables the
 *                                    fake-scroll phase. Omit for panels that
 *                                    always fit one screen.
 *
 * Root attributes:
 *   data-sp-scale            end scale of an outgoing panel      (default 0.7)
 *   data-sp-fade-portion     fraction of the outgoing tween spent on the
 *                            final quick fade-to-0 (vs. the scale+mid-fade
 *                            portion before it)                  (default 0.1)
 *   data-sp-mid-fade         opacity reached at the end of the scale portion,
 *                            right before the quick fade-to-0    (default 0.5)
 *   data-sp-scrub            ScrollTrigger scrub value/seconds   (default true)
 *   data-sp-refresh-priority-start
 *                            refreshPriority of the FIRST panel; each next
 *                            panel gets one less (see PROJECT.md "ScrollTrigger
 *                            — Pinli Bölüm Kuralları" Kural 1). If this page
 *                            has OTHER pinned sections (hero, pin-slider, …),
 *                            set this so the whole run sits in the correct
 *                            slot for this component's position on the page.
 *                                                                 (default 10)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function attrNum(el, attr, fallback) {
    if (global.Sestek && Sestek.util && Sestek.util.attrNum) {
      return Sestek.util.attrNum(el, attr, fallback);
    }
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }
  function prefersReduced() {
    if (global.Sestek && Sestek.util && Sestek.util.prefersReducedMotion) {
      return Sestek.util.prefersReducedMotion();
    }
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function warn(msg, el) {
    if (global.console && global.console.warn) {
      global.console.warn("[Sestek StackPanels] " + msg, el || "");
    }
  }

  // Pin uses position:fixed — a transform/filter/perspective/will-change on ANY
  // ancestor re-bases it and the pin visibly slips (PROJECT.md Kural 3).
  // Degrade to the plain no-pin fallback instead of pinning broken.
  function pinBlocker(el, stopAt) {
    for (var p = el.parentElement; p && p !== stopAt; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.filter !== "none" ||
          cs.perspective !== "none" || cs.willChange.indexOf("transform") > -1) return p;
    }
    return null;
  }

  function wire(root) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StackPanels] GSAP + ScrollTrigger required."); return;
    }
    if (root._stackPanelsInit) return;
    root._stackPanelsInit = true;

    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-sp-panel]"));
    if (panels.length < 2) {
      warn("Need at least 2 [data-sp-panel] children (the last one never pins).", root);
      return;
    }

    var endScale   = attrNum(root, "data-sp-scale", 0.7);
    var fadePortion = attrNum(root, "data-sp-fade-portion", 0.1);
    var midFade    = attrNum(root, "data-sp-mid-fade", 0.5);
    var scrubA     = root.getAttribute("data-sp-scrub");
    var scrub      = scrubA === "false" ? false : (scrubA ? (parseFloat(scrubA) || true) : true);
    var priorityStart = attrNum(root, "data-sp-refresh-priority-start", 10);

    if (prefersReduced()) {
      root.setAttribute("data-sp-reduced", "");
      return; // plain stacked-in-flow panels, no pin/scrub — CSS handles the rest
    }

    var blocker = pinBlocker(root, document.body);
    if (blocker) {
      warn("Pin DISABLED — ancestor has transform/filter/perspective/will-change; " +
           "position:fixed would slip (PROJECT.md Kural 3). Falling back to " +
           "plain stacked-in-flow panels.", blocker);
      root.setAttribute("data-sp-reduced", "");
      return;
    }

    var triggers = [];
    // The LAST panel never pins/dissolves — it's the final resting layer.
    panels.slice(0, -1).forEach(function (panel, i) {
      var inner = panel.querySelector("[data-sp-inner]");
      var windowH = window.innerHeight;
      var innerH = inner ? inner.offsetHeight : windowH;
      var diff = innerH - windowH;
      // Portion (0–1) of the pinned scroll spent "fake-scrolling" the inner
      // content up before the scale/fade phase — only when content overflows.
      var fakeRatio = diff > 0 ? diff / (diff + windowH) : 0;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          start: "bottom bottom",
          end: function () {
            return fakeRatio ? "+=" + inner.offsetHeight : "bottom top";
          },
          pin: panel,
          pinSpacing: false,        // overlap the next panel, don't reserve space
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: priorityStart - i,   // page-order priority, Kural 1
        },
      });

      if (fakeRatio) {
        tl.to(inner, {
          yPercent: -100,
          y: windowH,
          ease: "none",
          duration: 1 / (1 - fakeRatio) - 1,
        });
      }
      tl.fromTo(panel,
        { scale: 1, opacity: 1 },
        { scale: endScale, opacity: midFade, duration: 1 - fadePortion, ease: "none" }
      ).to(panel, { opacity: 0, duration: fadePortion, ease: "none" });

      triggers.push(tl);
    });

    root._stackPanelsDestroy = function () {
      triggers.forEach(function (tl) {
        tl.scrollTrigger && tl.scrollTrigger.kill();
        tl.kill();
      });
      gsap.set(panels, { clearProps: "all" });
    };
  }

  /** Initialise every [data-stack-panels] on the page. */
  function initStackPanels(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StackPanels] GSAP + ScrollTrigger required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-stack-panels]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStackPanels = initStackPanels;

})(typeof window !== "undefined" ? window : this);
