/*!
 * lenis-init.js v1.2.1
 * Lenis smooth scroll — optional GSAP ScrollTrigger sync
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.2.1 — destroyLenis() now removes the real ticker wrapper (was a no-op),
 *          cancels the no-GSAP rAF fallback, and initLenis() is idempotent.
 * v1.2.0 — lighter, more perceptible default feel: duration 1.2→1.05,
 *          easing expo-out→cubic-out (longer glide tail, not heavy)
 * v1.1.0 — initial smooth-scroll + ScrollTrigger sync
 */

(function (global) {
  "use strict";

  /**
   * Initializes Lenis smooth scroll.
   * GSAP and ScrollTrigger are optional — if present they are wired automatically.
   * When you later add ScrollTrigger animations, load gsap + ScrollTrigger before
   * this file and the sync happens without any extra code.
   *
   * Required globals : Lenis
   * Optional globals : gsap, ScrollTrigger
   *
   * Options mirror the Lenis constructor API:
   *   duration         – scroll duration in seconds (default: 1.2)
   *   easing           – easing function (default: expo out)
   *   orientation      – "vertical" | "horizontal" (default: "vertical")
   *   smoothWheel      – smooth mouse wheel (default: true)
   *   wheelMultiplier  – wheel speed multiplier (default: 1)
   *   touchMultiplier  – touch speed multiplier (default: 2)
   *   infinite         – infinite scroll (default: false)
   */
  // Module-scoped handles so destroyLenis() can tear down exactly what
  // initLenis() created — the ticker callback is an anonymous wrapper (not
  // lenis.raf), and the no-GSAP fallback runs its own requestAnimationFrame
  // loop; both need a reference to be cancellable.
  var tickerCallback = null;
  var rafId = null;

  function initLenis(options) {
    if (typeof Lenis === "undefined") {
      console.error("[Sestek] Lenis is not loaded.");
      return null;
    }

    // Idempotent — a second call would otherwise add a second ticker handler
    // and a second Lenis instance, doubling every scroll delta.
    if (global.lenisInstance) {
      return global.lenisInstance;
    }

    var defaults = {
      // Light but perceptible glide — short enough to feel responsive, not heavy.
      duration: 1.05,
      easing: function (t) {
        return 1 - Math.pow(1 - t, 3); // cubic out — gentle, noticeable tail
      },
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    };

    var config = Object.assign({}, defaults, options || {});
    var lenis = new Lenis(config);
    var hasGsap = typeof gsap !== "undefined";
    var hasScrollTrigger = hasGsap && typeof ScrollTrigger !== "undefined";

    if (hasGsap) {
      // Drive Lenis via GSAP ticker for frame-perfect sync. Keep the wrapper
      // reference so destroyLenis() can remove this exact callback.
      tickerCallback = function (time) {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      // Prevent GSAP from adding its own lag smoothing on top of Lenis
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback: drive Lenis with requestAnimationFrame. Track the frame id
      // so destroyLenis() can cancel the loop.
      (function raf(time) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      })(performance.now());
    }

    if (hasScrollTrigger) {
      // ScrollTrigger reads native scroll — keep it in sync with Lenis virtual scroll
      lenis.on("scroll", ScrollTrigger.update);
    }

    // Expose on global for external access (e.g. anchor links, modals)
    global.lenisInstance = lenis;

    return lenis;
  }

  /**
   * Smoothly scrolls to a target element or numeric position.
   * @param {string|number|HTMLElement} target
   * @param {object} [options] – Lenis scrollTo options
   */
  function scrollTo(target, options) {
    if (!global.lenisInstance) {
      console.warn("[Sestek] Lenis is not initialized. Call initLenis() first.");
      return;
    }
    global.lenisInstance.scrollTo(target, options || {});
  }

  /** Temporarily stops Lenis (e.g. when a modal is open). */
  function stopScroll() {
    if (global.lenisInstance) global.lenisInstance.stop();
  }

  /** Resumes Lenis after stopScroll(). */
  function startScroll() {
    if (global.lenisInstance) global.lenisInstance.start();
  }

  /**
   * Destroys the Lenis instance and cleans up the ticker/raf loop.
   * Call this before navigating away in SPA contexts.
   */
  function destroyLenis() {
    if (!global.lenisInstance) return;
    // Remove the actual wrapper we added to the ticker (not lenis.raf, which
    // was never the registered callback).
    if (typeof gsap !== "undefined" && tickerCallback) {
      gsap.ticker.remove(tickerCallback);
    }
    tickerCallback = null;
    // Cancel the no-GSAP fallback loop if it was the active driver.
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
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
