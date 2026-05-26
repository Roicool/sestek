/*!
 * lenis-init.js v1.0.0
 * Lenis smooth scroll + GSAP ScrollTrigger integration
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Initializes Lenis smooth scroll and wires it to GSAP ScrollTrigger.
   *
   * Required globals: Lenis, gsap, ScrollTrigger
   *
   * Options mirror the Lenis constructor API:
   *   duration    – scroll duration in seconds (default: 1.2)
   *   easing      – easing function (default: expo out)
   *   orientation – "vertical" | "horizontal" (default: "vertical")
   *   smoothWheel – smooth mouse wheel (default: true)
   *   wheelMultiplier – wheel speed multiplier (default: 1)
   *   touchMultiplier – touch speed multiplier (default: 2)
   *   infinite    – infinite scroll (default: false)
   */
  function initLenis(options) {
    if (typeof Lenis === "undefined") {
      console.error("[Sestek] Lenis is not loaded.");
      return null;
    }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek] GSAP or ScrollTrigger is not loaded.");
      return null;
    }

    var defaults = {
      duration: 1.2,
      easing: function (t) {
        return 1 - Math.pow(1 - t, 5); // expo out
      },
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    };

    var config = Object.assign({}, defaults, options || {});

    var lenis = new Lenis(config);

    // Sync Lenis scroll position with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis via GSAP ticker for frame-perfect sync
    gsap.ticker.add(function (time) {
      lenis.raf(time * 1000);
    });

    // Prevent GSAP from adding its own lag smoothing on top of Lenis
    gsap.ticker.lagSmoothing(0);

    // Expose on global for external access (e.g. anchor links, modals)
    global.lenisInstance = lenis;

    return lenis;
  }

  /**
   * Smoothly scrolls to a target element or numeric position.
   *
   * @param {string|number|HTMLElement} target  – CSS selector, pixel offset, or element
   * @param {object} [options]                  – Lenis scrollTo options
   */
  function scrollTo(target, options) {
    if (!global.lenisInstance) {
      console.warn("[Sestek] Lenis is not initialized. Call initLenis() first.");
      return;
    }
    global.lenisInstance.scrollTo(target, options || {});
  }

  /**
   * Temporarily stops Lenis (e.g. when a modal is open).
   */
  function stopScroll() {
    if (global.lenisInstance) global.lenisInstance.stop();
  }

  /**
   * Resumes Lenis after stopScroll().
   */
  function startScroll() {
    if (global.lenisInstance) global.lenisInstance.start();
  }

  /**
   * Destroys the Lenis instance and removes the GSAP ticker listener.
   * Call this before navigating away in SPA contexts.
   */
  function destroyLenis() {
    if (!global.lenisInstance) return;
    gsap.ticker.remove(global.lenisInstance.raf);
    global.lenisInstance.destroy();
    global.lenisInstance = null;
  }

  // Public API
  global.Sestek = global.Sestek || {};
  global.Sestek.initLenis = initLenis;
  global.Sestek.scrollTo = scrollTo;
  global.Sestek.stopScroll = stopScroll;
  global.Sestek.startScroll = startScroll;
  global.Sestek.destroyLenis = destroyLenis;
})(typeof window !== "undefined" ? window : this);
