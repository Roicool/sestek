/*!
 * blog-slider-pro.js v1.0.0
 * The "pro" variant of blog-slider.js — same attribute-driven Swiper card
 * carousel, plus three opt-in premium touches:
 *   • Edge mask/fade  — the bleeding trailing card dissolves into a soft
 *     gradient at the container edge (like marquee.css), for a premium bleed.
 *   • Autoplay        — auto-advance with pause on hover / while dragging,
 *     resuming afterwards; disabled under reduced-motion.
 *   • Keyboard + reduced-motion — arrow-key navigation (a11y), and under
 *     prefers-reduced-motion the transition is instant and autoplay is off.
 *
 * A SEPARATE component from blog-slider.js so the basic one stays lean — use
 * whichever you need; do not put both attributes on the same root.
 *
 * Requires : Swiper 11 (global `Swiper`, bundle includes Autoplay/Keyboard) +
 *   its CSS. Load BEFORE this script:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
 *   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
 * CSS      : css/components/blog-slider-pro.css
 *
 * DOM (identical to blog-slider, only the root attribute differs):
 *   [data-blog-slider-pro]             root                → .swiper
 *     [data-bs-wrapper]                Collection List      → .swiper-wrapper
 *       [data-bs-slide]                Collection Item      → .swiper-slide
 *     [data-bs-pagination]  (optional) pagination target
 *     [data-bs-prev]        (optional) previous button
 *     [data-bs-next]        (optional) next button
 *
 * Root attributes (all optional):
 *   data-bs-per-view     slides per view (fractional → bleed)     (default 1.4)
 *   data-bs-per-view-md  slides per view at >= data-bs-bp-md      (default 2.4)
 *   data-bs-per-view-lg  slides per view at >= data-bs-bp-lg      (default 3.4)
 *   data-bs-gap          gap between slides in px                 (default 16)
 *   data-bs-bp-md        md breakpoint px                         (default 768)
 *   data-bs-bp-lg        lg breakpoint px                         (default 992)
 *   data-bs-loop         "true" → loop the slides                 (default false)
 *   data-bs-speed        transition speed ms                      (default 500)
 *   data-bs-fade         trailing edge fade width in px (0 = off) (default 0)
 *   data-bs-autoplay     autoplay delay in ms (0 = off)           (default 0)
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
      global.console.warn("[Sestek BlogSliderPro] " + msg, el || "");
    }
  }

  function wire(root) {
    if (root._blogSliderProInit) return;
    root._blogSliderProInit = true;

    if (typeof Swiper === "undefined") {
      warn("Swiper is not loaded — include swiper-bundle before this script.", root);
      return;
    }

    var wrapper = root.querySelector("[data-bs-wrapper]");
    if (!wrapper) { warn("Missing [data-bs-wrapper].", root); return; }
    var slides = Array.prototype.slice.call(wrapper.querySelectorAll("[data-bs-slide]"));
    if (!slides.length) { warn("No [data-bs-slide] children.", root); return; }

    root.classList.add("swiper");
    wrapper.classList.add("swiper-wrapper");
    slides.forEach(function (s) { s.classList.add("swiper-slide"); });

    var pagEl  = root.querySelector("[data-bs-pagination]");
    var prevEl = root.querySelector("[data-bs-prev]");
    var nextEl = root.querySelector("[data-bs-next]");

    var reduce = prefersReduced();
    var gap    = attrNum(root, "data-bs-gap", 16);
    var bpMd   = attrNum(root, "data-bs-bp-md", 768);
    var bpLg   = attrNum(root, "data-bs-bp-lg", 992);

    // ── Edge mask/fade ────────────────────────────────────────────────────
    // Opt-in: set data-bs-fade in px. JS exposes it as --bs-fade + a class the
    // CSS keys the trailing gradient mask off of.
    var fade = attrNum(root, "data-bs-fade", 0);
    if (fade > 0) {
      root.style.setProperty("--bs-fade", fade + "px");
      root.classList.add("bs-faded");
    }

    var breakpoints = {};
    breakpoints[bpMd] = { slidesPerView: attrNum(root, "data-bs-per-view-md", 2.4), spaceBetween: gap };
    breakpoints[bpLg] = { slidesPerView: attrNum(root, "data-bs-per-view-lg", 3.4), spaceBetween: gap };

    var config = {
      slidesPerView: attrNum(root, "data-bs-per-view", 1.4),
      spaceBetween: gap,
      grabCursor: true,
      // Reduced motion → instant transitions.
      speed: reduce ? 0 : attrNum(root, "data-bs-speed", 500),
      loop: root.getAttribute("data-bs-loop") === "true",
      breakpoints: breakpoints,
      a11y: { enabled: true },
      keyboard: { enabled: true, onlyInViewport: true },
    };
    if (pagEl) config.pagination = { el: pagEl, clickable: true };
    if (prevEl && nextEl) config.navigation = { prevEl: prevEl, nextEl: nextEl };

    // ── Autoplay + hover / drag pause ─────────────────────────────────────
    var delay = attrNum(root, "data-bs-autoplay", 0);
    if (delay > 0 && !reduce) {
      config.autoplay = {
        delay: delay,
        disableOnInteraction: false,   // keep autoplaying after arrows/drag
        pauseOnMouseEnter: true,       // pause on hover, resume on leave
      };
    }

    var swiper = new Swiper(root, config);
    root._blogSwiper = swiper;

    // ── Pause autoplay when the slider is off-screen ──────────────────────
    // Swiper only pauses autoplay on tab/visibility change, NOT when scrolled
    // out of view — so without this it keeps advancing invisibly (wasteful and
    // the user returns mid-sequence). Stop it when the slider leaves the
    // viewport, resume when it comes back. (No-op if autoplay is off/absent.)
    if (config.autoplay && swiper.autoplay && typeof IntersectionObserver === "function") {
      var io = new IntersectionObserver(function (entries) {
        var e = entries[0];
        if (!e) return;
        if (e.isIntersecting) {
          swiper.autoplay.start();
        } else {
          swiper.autoplay.stop();
        }
      }, { threshold: 0.2 });   // at least ~20% visible counts as on-screen
      io.observe(root);
      root._blogSliderIO = io;
    }

    return swiper;
  }

  /** Initialise every [data-blog-slider-pro] on the page. */
  function initBlogSliderPro(selector) {
    var roots = document.querySelectorAll(selector || "[data-blog-slider-pro]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBlogSliderPro = initBlogSliderPro;

})(typeof window !== "undefined" ? window : this);
