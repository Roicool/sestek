/*!
 * lenis-init.js v1.3.1
 * Lenis smooth scroll — optional GSAP ScrollTrigger sync + stale-height guard
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.3.1 — refreshes no longer cause scroll jank: ScrollTrigger.refresh()
 *          is expensive (re-measures every trigger), so firing it while the
 *          page is still loading images (height changes constantly) or while
 *          the user is mid-scroll produced a stutter-then-catch-up feel.
 *          Now: body-height observer stays silent until window load, and any
 *          pending refresh waits for Lenis to go idle before running.
 * v1.3.0 — dynamic-content refresh plumbing (fixes "can't scroll to the
 *          bottom" / mispositioned triggers after CMS filter/load, lazy
 *          images, accordions…):
 *            • Sestek.refreshScroll() — debounced lenis.resize() +
 *              ScrollTrigger.refresh(), safe to call from anywhere
 *            • auto-hooks Finsweet cmsfilter/cmsload `renderitems`
 *            • ResizeObserver on <body> height as a catch-all
 *            • late safety refreshes after window load (500ms / 1500ms)
 *          All of it torn down by destroyLenis().
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
   *   duration         – scroll duration in seconds (default: 1.05)
   *   easing           – easing function (default: cubic out)
   *   lerp             – frame-based smoothing (pass e.g. 0.1 to use lerp mode
   *                      instead of duration/easing — Lenis prefers lerp when set)
   *   orientation      – "vertical" | "horizontal" (default: "vertical")
   *   smoothWheel      – smooth mouse wheel (default: true)
   *   wheelMultiplier  – wheel speed multiplier (default: 1)
   *   touchMultiplier  – touch speed multiplier (default: 2)
   *   infinite         – infinite scroll (default: false)
   */
  // Module-scoped handles so destroyLenis() can tear down exactly what
  // initLenis() created — the ticker callback is an anonymous wrapper (not
  // lenis.raf), the no-GSAP fallback runs its own requestAnimationFrame loop,
  // and the refresh plumbing owns a timer + ResizeObserver + load timeouts.
  var tickerCallback = null;
  var rafId = null;
  var refreshTimer = null;
  var bodyObserver = null;
  var lateTimeouts = [];

  /**
   * Debounced "the page height may have changed" handler: re-measures the
   * Lenis scroll limit AND re-computes every ScrollTrigger's start/end.
   *
   * This is THE fix for the classic Lenis-on-CMS symptoms — page won't scroll
   * all the way down after filtering/load-more, pinned sections release at the
   * wrong point, reveals fire mid-screen — all caused by measurements taken
   * against a height that later changed. Call it after ANY dynamic content
   * change; the 200ms debounce collapses bursts (e.g. a filter re-render)
   * into a single re-measure.
   *
   * Jank guard: ScrollTrigger.refresh() re-measures every trigger and forces
   * layout — running it while the user is mid-scroll makes the page hitch
   * (stutter, then catch up). So if Lenis is still moving when the debounce
   * fires, the refresh re-arms and waits for the scroll to go idle; the
   * re-measure then runs once, invisibly, between gestures.
   */
  function refreshScroll() {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function tick() {
      var lenis = global.lenisInstance;
      // Still scrolling (user gesture or scrollTo in flight)? Check again
      // shortly — never re-measure under the user's finger/wheel.
      if (lenis && (lenis.isScrolling || Math.abs(lenis.velocity || 0) > 0.05)) {
        refreshTimer = setTimeout(tick, 150);
        return;
      }
      refreshTimer = null;
      if (lenis) lenis.resize();
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }, 200);
  }

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

    // ── Stale-height guard ──────────────────────────────────────────────
    // Everything below exists to keep Lenis' limit and ScrollTrigger's
    // positions honest when the page height changes AFTER init.

    // Finsweet CMS Filter / CMS Load — refresh after every re-render
    // (filtering, pagination, load-more, infinite scroll). Pushing to
    // fsAttributes is the official callback API and harmless if Finsweet
    // never loads (it stays an inert array). Guarded on lenisInstance so a
    // late Finsweet render after destroyLenis() is a no-op.
    global.fsAttributes = global.fsAttributes || [];
    ["cmsfilter", "cmsload"].forEach(function (key) {
      global.fsAttributes.push([key, function (instances) {
        instances.forEach(function (instance) {
          instance.on("renderitems", function () {
            if (global.lenisInstance) refreshScroll();
          });
        });
      }]);
    });

    // Catch-all: ANY body height change (lazy images/embeds, accordions,
    // tabs, custom async content) schedules a debounced refresh.
    //
    // Silent until window load: while assets stream in, the body height
    // changes constantly — refreshing on each change made scrolling stutter
    // during load ("heavy, then snaps back"). ScrollTrigger already refreshes
    // itself on load, and our late passes below cover post-load settling, so
    // pre-load observer events carry no information worth the jank.
    if (typeof ResizeObserver !== "undefined") {
      var lastHeight = document.body.scrollHeight;
      bodyObserver = new ResizeObserver(function () {
        if (document.readyState !== "complete") return;   // load still in progress
        var h = document.body.scrollHeight;
        if (h !== lastHeight) {
          lastHeight = h;
          refreshScroll();
        }
      });
      bodyObserver.observe(document.body);
    }

    // Late safety refreshes: fonts/images that settle after `load` without
    // changing body height enough to trip the observer (or on browsers
    // without ResizeObserver). Routed through refreshScroll() so they too
    // wait for scroll-idle instead of hitching an in-flight gesture.
    var arm = function () {
      lateTimeouts.push(
        setTimeout(refreshScroll, 500),
        setTimeout(refreshScroll, 1500)
      );
    };
    if (document.readyState === "complete") {
      arm();
    } else {
      global.addEventListener("load", arm, { once: true });
    }

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
   * Destroys the Lenis instance and cleans up the ticker/raf loop plus the
   * refresh plumbing. Call this before navigating away in SPA contexts.
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
    // Tear down the stale-height guard.
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
    lateTimeouts.forEach(clearTimeout);
    lateTimeouts = [];
    global.lenisInstance.destroy();
    global.lenisInstance = null;
  }

  // Public API
  global.Sestek = global.Sestek || {};
  global.Sestek.initLenis = initLenis;
  global.Sestek.refreshScroll = refreshScroll;
  global.Sestek.scrollTo = scrollTo;
  global.Sestek.stopScroll = stopScroll;
  global.Sestek.startScroll = startScroll;
  global.Sestek.destroyLenis = destroyLenis;
})(typeof window !== "undefined" ? window : this);
