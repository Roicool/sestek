/*!
 * featured-blog-slider.js v3.1.0
 * Featured-blog carousel for a Webflow CMS Collection List, built on Swiper
 * (slidesPerView:"auto"). Full-width cards that bleed the next one in from the
 * edge (overflow:visible), with a controls strip below: thin "Stories" segment
 * bars that fill over the autoplay delay — driven by a pure CSS keyframe, so
 * they're cheap and frame-perfect — plus round prev/next arrows.
 *
 *   • Active card full opacity (.swiper-slide-active); the rest dimmed via CSS.
 *   • One bar per slide; the active bar fills over the autoplay interval and
 *     clicking any bar jumps to that slide. Fill PAUSES (without resetting) when
 *     autoplay pauses on hover, then resumes — kept in sync via Swiper's
 *     autoplayPause / autoplayResume events toggling .is-paused on the root.
 *   • Arrows disable at the first / last slide. Keyboard + drag supported.
 *   • prefers-reduced-motion: no autoplay; bars are plain clickable dots, the
 *     active one shown filled.
 *
 * Requires : Swiper 11 (global `Swiper`) + its CSS. Load BEFORE this script:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
 *   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
 * CSS      : css/components/featured-blog-slider.css
 *
 * DOM (Webflow CMS — three DISTINCT elements; check the Navigator):
 *   [data-fbslider]                      root (.fbslider)
 *     [data-fbslider-viewport]           Collection List Wrapper  → .swiper
 *       [data-fbslider-track]            Collection List          → .swiper-wrapper
 *         [data-fbslider-card]           Collection Item          → .swiper-slide
 *     [data-fbslider-bars]               controls strip (JS-populated: dots + arrows)
 *
 * Root attributes:
 *   data-fbslider-interval  ms each bar fills / autoplay tick   (default 5000)
 *   data-fbslider-speed     ms per slide transition             (default 700)
 *   data-fbslider-gap       px space between cards              (default 24)
 *   data-fbslider-autoplay  "false" to disable auto-advance     (default true)
 *   data-fbslider-centered  "true" → center the active card     (default false)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function warn(msg, el) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek FeaturedBlogSlider] " + msg, el || "");
    }
  }

  /** Run cb once Swiper is on the page (it may load via a deferred script). */
  function whenSwiper(cb) {
    if (typeof global.Swiper !== "undefined") return cb();
    var tries = 0;
    (function poll() {
      if (typeof global.Swiper !== "undefined") return cb();
      if (++tries > 100) {
        warn("Swiper not found — include swiper-bundle.min.js before this script.");
        return;
      }
      setTimeout(poll, 50);
    })();
  }

  function arrowSvg(dir) {
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("fill", "none");
    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", dir === "prev" ? "M10 12L6 8L10 4" : "M6 4L10 8L6 12");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return svg;
  }

  /** Initialise every [data-fbslider] on the page. */
  function initFeaturedBlogSlider(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-fbslider]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  function setupInstance(root) {
    if (root._fbsliderInit) return null;
    root._fbsliderInit = true;

    var viewport = root.querySelector("[data-fbslider-viewport]");
    var track    = root.querySelector("[data-fbslider-track]");
    if (!viewport || !track) {
      warn("Missing [data-fbslider-viewport] or [data-fbslider-track] — skipping.", root);
      return null;
    }
    var cards = Array.prototype.slice.call(track.querySelectorAll("[data-fbslider-card]"));
    if (!cards.length) {
      warn("No [data-fbslider-card] items found — skipping.", root);
      return null;
    }
    var barsEl = root.querySelector("[data-fbslider-bars]");

    // ── Structure validation ──────────────────────────────────────────
    // Swiper REQUIRES .swiper-wrapper to be a direct child of .swiper, and every
    // .swiper-slide a direct child of .swiper-wrapper. In Webflow: viewport =
    // Collection List Wrapper, track = Collection List, card = Collection Item —
    // three DISTINCT elements. Mis-map them and Swiper silently fails to lay out,
    // leaving the raw Designer grid showing.
    if (viewport === track) {
      warn(
        "[data-fbslider-viewport] and [data-fbslider-track] are the SAME element. " +
        "viewport = Collection List Wrapper, track = Collection List (its child). " +
        "Slider not initialized.", root
      );
      return null;
    }
    var stray = cards.filter(function (c) { return c.parentElement !== track; });
    if (stray.length) {
      warn(
        stray.length + "/" + cards.length + " [data-fbslider-card] element(s) are NOT a " +
        "direct child of [data-fbslider-track] — put the attribute on the Collection Item " +
        "itself, not a div nested inside it. Slider not initialized.", root
      );
      return null;
    }

    // Tag our clean data-API elements with the classes Swiper requires.
    root.classList.add("fbslider");
    viewport.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    cards.forEach(function (c) { c.classList.add("swiper-slide"); });

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var interval = attrNum(root, "data-fbslider-interval", 5000);
    var speed    = attrNum(root, "data-fbslider-speed", 700);
    var gap      = attrNum(root, "data-fbslider-gap", 24);
    var autoplay = root.getAttribute("data-fbslider-autoplay") !== "false" && !reduce;
    var centered = root.getAttribute("data-fbslider-centered") === "true";

    // Drives the CSS keyframe fill duration (one bar fills per interval).
    root.style.setProperty("--fbslider-autoplay", interval + "ms");
    if (!autoplay) root.classList.add("is-static");

    var api = { root: root };

    whenSwiper(function () {
      // ── Controls strip: thin segment bars + round arrows ──────────────
      var dots = [];
      var prevBtn = null, nextBtn = null;

      function buildControls() {
        if (!barsEl) return;
        barsEl.innerHTML = "";
        barsEl.classList.add("fbslider-controls");

        var dotsWrap = document.createElement("div");
        dotsWrap.className = "fbslider-dots";
        cards.forEach(function (_, n) {
          var dot = document.createElement("button");
          dot.type = "button";
          dot.className = "fbslider-dot";
          dot.setAttribute("aria-label", "Slide " + (n + 1));
          dot.addEventListener("click", function () { if (sw) sw.slideTo(n); });
          dotsWrap.appendChild(dot);
          dots.push(dot);
        });

        var arrowsWrap = document.createElement("div");
        arrowsWrap.className = "fbslider-arrows";
        prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "fbslider-arrow fbslider-arrow--prev";
        prevBtn.setAttribute("aria-label", "Previous slide");
        prevBtn.appendChild(arrowSvg("prev"));
        nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.className = "fbslider-arrow fbslider-arrow--next";
        nextBtn.setAttribute("aria-label", "Next slide");
        nextBtn.appendChild(arrowSvg("next"));
        arrowsWrap.appendChild(prevBtn);
        arrowsWrap.appendChild(nextBtn);

        barsEl.appendChild(dotsWrap);
        barsEl.appendChild(arrowsWrap);

        prevBtn.addEventListener("click", function () { if (sw) sw.slidePrev(); });
        nextBtn.addEventListener("click", function () { if (sw) sw.slideNext(); });
      }

      function syncControls(s) {
        dots.forEach(function (d, n) {
          var on = n === s.activeIndex;
          if (on && d.classList.contains("is-active")) {
            // Re-activating the same dot: force a reflow so the CSS fill
            // animation restarts from 0 instead of staying full.
            d.classList.remove("is-active");
            void d.offsetWidth;
          }
          d.classList.toggle("is-active", on);
          // Slides already passed read as fully filled; upcoming ones empty.
          d.classList.toggle("is-filled", n < s.activeIndex);
        });
        if (prevBtn) prevBtn.disabled = s.isBeginning;
        if (nextBtn) nextBtn.disabled = s.isEnd;
      }

      buildControls();

      var sw = new global.Swiper(viewport, {
        slidesPerView: "auto",
        centeredSlides: centered,
        centeredSlidesBounds: centered,
        spaceBetween: gap,
        speed: speed,
        loop: false,
        grabCursor: true,
        watchSlidesProgress: true,
        keyboard: { enabled: true, onlyInViewport: true },
        autoplay: autoplay
          ? { delay: interval, disableOnInteraction: false, pauseOnMouseEnter: true }
          : false,
        on: {
          init: syncControls,
          // Update at transition START so the bar + dim react instantly.
          slideChangeTransitionStart: syncControls,
          autoplayPause: function () { root.classList.add("is-paused"); },
          autoplayResume: function () { root.classList.remove("is-paused"); },
        },
      });

      api.next  = function () { sw.slideNext(); };
      api.prev  = function () { sw.slidePrev(); };
      api.goTo  = function (i) { sw.slideTo(i); };
      api.swiper = sw;
      api.destroy = function () { sw.destroy(true, true); };
      root._fbsliderApi = api;
    });

    return api;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFeaturedBlogSlider = initFeaturedBlogSlider;

})(typeof window !== "undefined" ? window : this);
