/*!
 * blog-slider.js v1.0.0
 * A simple multi-per-view card carousel for blog/CMS lists, built on Swiper.
 * Attribute-driven (no class hooks in the config) and fully scoped per
 * instance, so several sliders can live on one page without their arrows /
 * pagination colliding. Shows a fractional slide count by default so the next
 * card "bleeds" in at the edge.
 *
 * Requires : Swiper 11 (global `Swiper`) + its CSS. Load BEFORE this script:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
 *   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
 * CSS      : css/components/blog-slider.css
 *
 * DOM (Webflow — only the attributes matter; design is yours):
 *   [data-blog-slider]                 root                → .swiper
 *     [data-bs-wrapper]                Collection List      → .swiper-wrapper
 *       [data-bs-slide]                Collection Item      → .swiper-slide
 *     [data-bs-pagination]  (optional) pagination target
 *     [data-bs-prev]        (optional) previous button
 *     [data-bs-next]        (optional) next button
 *
 * Swiper needs .swiper-wrapper as a direct child of .swiper and every
 * .swiper-slide a direct child of .swiper-wrapper — the component adds those
 * classes to the attribute-tagged elements, so the Webflow structure stays
 * attribute-driven.
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
  function warn(msg, el) {
    if (global.console && global.console.warn) {
      global.console.warn("[Sestek BlogSlider] " + msg, el || "");
    }
  }

  function wire(root) {
    if (root._blogSliderInit) return;
    root._blogSliderInit = true;

    if (typeof Swiper === "undefined") {
      warn("Swiper is not loaded — include swiper-bundle before this script.", root);
      return;
    }

    var wrapper = root.querySelector("[data-bs-wrapper]");
    if (!wrapper) { warn("Missing [data-bs-wrapper].", root); return; }
    var slides = Array.prototype.slice.call(wrapper.querySelectorAll("[data-bs-slide]"));
    if (!slides.length) { warn("No [data-bs-slide] children.", root); return; }

    // Map the attribute-tagged elements to the classes Swiper requires.
    root.classList.add("swiper");
    wrapper.classList.add("swiper-wrapper");
    slides.forEach(function (s) { s.classList.add("swiper-slide"); });

    // Controls — scoped to THIS root, passed as elements (not global selectors),
    // so multiple sliders on a page never steal each other's arrows/pagination.
    var pagEl  = root.querySelector("[data-bs-pagination]");
    var prevEl = root.querySelector("[data-bs-prev]");
    var nextEl = root.querySelector("[data-bs-next]");

    var gap  = attrNum(root, "data-bs-gap", 16);
    var bpMd = attrNum(root, "data-bs-bp-md", 768);
    var bpLg = attrNum(root, "data-bs-bp-lg", 992);

    var breakpoints = {};
    breakpoints[bpMd] = { slidesPerView: attrNum(root, "data-bs-per-view-md", 2.4), spaceBetween: gap };
    breakpoints[bpLg] = { slidesPerView: attrNum(root, "data-bs-per-view-lg", 3.4), spaceBetween: gap };

    var config = {
      slidesPerView: attrNum(root, "data-bs-per-view", 1.4),
      spaceBetween: gap,
      grabCursor: true,
      speed: attrNum(root, "data-bs-speed", 500),
      loop: root.getAttribute("data-bs-loop") === "true",
      breakpoints: breakpoints,
      a11y: { enabled: true },
    };
    if (pagEl) config.pagination = { el: pagEl, clickable: true };
    if (prevEl && nextEl) config.navigation = { prevEl: prevEl, nextEl: nextEl };

    root._blogSwiper = new Swiper(root, config);
    return root._blogSwiper;
  }

  /** Initialise every [data-blog-slider] on the page. */
  function initBlogSlider(selector) {
    var roots = document.querySelectorAll(selector || "[data-blog-slider]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBlogSlider = initBlogSlider;

})(typeof window !== "undefined" ? window : this);
