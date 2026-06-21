/*!
 * featured-blog-slider.js v2.0.0
 * Centered-card carousel for a Webflow CMS Collection List of featured blog
 * posts, built on Swiper (slidesPerView:"auto") — the reliable engine — with
 * a Sestek-flavoured layer on top:
 *
 *   • Active card centered + full opacity (.swiper-slide-active); the rest are
 *     dimmed via CSS (--fbslider-inactive-opacity). No JS opacity tweening.
 *   • centeredSlidesBounds clamps the track at the ends, so there's no blank
 *     gutter before the first card or after the last — only cards ever peek.
 *   • Stories-style progress bars (one per slide): the active bar fills over
 *     the autoplay delay, driven by Swiper's own autoplayTimeLeft so it pauses
 *     (without resetting) exactly when autoplay pauses on hover. Clicking any
 *     bar jumps to that slide.
 *   • Autoplay pauses on hover (fine pointers) and during drag, resumes after.
 *   • prefers-reduced-motion: no autoplay; bars act as plain clickable dots.
 *
 * Requires : Swiper 11 (global `Swiper`) + its CSS. Load BEFORE this script:
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
 *   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
 * CSS      : css/components/featured-blog-slider.css
 *
 * DOM (Webflow CMS — Collection List Wrapper > Collection List > Item):
 *   [data-fbslider]                      root (.fbslider)
 *     [data-fbslider-viewport]           Collection List Wrapper  → .swiper
 *       [data-fbslider-track]            Collection List          → .swiper-wrapper
 *         [data-fbslider-card]           Collection Item          → .swiper-slide
 *     [data-fbslider-bars]               JS-populated progress bar strip
 *   (the Swiper classes above are added by JS — keep your clean Webflow names)
 *
 * Root attributes:
 *   data-fbslider-interval  ms each bar fills / autoplay tick   (default 5000)
 *   data-fbslider-speed     ms per slide transition             (default 700)
 *   data-fbslider-gap       px space between cards              (default 24)
 *   data-fbslider-autoplay  "false" to disable auto-advance     (default true)
 *   data-fbslider-centered  "false" → left-aligned (first flush left, no center) (default true)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

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

    // Tag our clean data-API elements with the classes Swiper requires.
    viewport.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    cards.forEach(function (c) { c.classList.add("swiper-slide"); });

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var interval = attrNum(root, "data-fbslider-interval", 5000);
    var speed    = attrNum(root, "data-fbslider-speed", 700);
    var gap      = attrNum(root, "data-fbslider-gap", 24);
    var autoplay = root.getAttribute("data-fbslider-autoplay") !== "false" && !reduce;
    var centered = root.getAttribute("data-fbslider-centered") !== "false";

    var api = { root: root };

    whenSwiper(function () {
      // ── Progress bars (built before init so init can stamp the first) ──
      var bars = [];
      var fills = [];

      function buildBars() {
        if (!barsEl) return;
        barsEl.innerHTML = "";
        cards.forEach(function (_, n) {
          var bar = document.createElement("button");
          bar.type = "button";
          bar.className = "fbslider-bar";
          bar.setAttribute("aria-label", "Slide " + (n + 1));
          var fill = document.createElement("span");
          fill.className = "fbslider-bar__fill";
          bar.appendChild(fill);
          bar.addEventListener("click", function () { if (sw) sw.slideTo(n); });
          barsEl.appendChild(bar);
          bars.push(bar);
          fills.push(fill);
        });
      }

      function setActiveBar(i) {
        bars.forEach(function (b, n) { b.classList.toggle("is-active", n === i); });
      }
      function clearFills() {
        fills.forEach(function (f) { f.style.width = "0%"; });
      }
      function setFill(i, pct) {
        if (fills[i]) fills[i].style.width = pct + "%";
      }

      buildBars();

      var sw = new global.Swiper(viewport, {
        slidesPerView: "auto",
        centeredSlides: centered,
        // Clamp centering at the ends → no empty gutter before first / after
        // last slide; only real cards ever peek into view.
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
          init: function (s) {
            setActiveBar(s.activeIndex);
            clearFills();
          },
          slideChange: function (s) {
            setActiveBar(s.activeIndex);
            clearFills();
          },
          // Fires every frame while autoplay runs; progress goes 1 → 0 as the
          // delay elapses. Freezes (stops firing) when autoplay pauses on
          // hover, so the fill holds without resetting — then resumes.
          autoplayTimeLeft: function (s, time, progress) {
            setFill(s.activeIndex, (1 - progress) * 100);
          },
        },
      });

      api.next  = function () { sw.slideNext(); };
      api.prev  = function () { sw.slidePrev(); };
      api.goTo  = function (i) { sw.slideTo(i); };
      api.swiper = sw;
      api.destroy = function () { sw.destroy(true, true); };
      root._fbsliderApi = api;

      // Optional author controls: [data-fbslider-prev] / [data-fbslider-next]
      var prevBtn = root.querySelector("[data-fbslider-prev]");
      var nextBtn = root.querySelector("[data-fbslider-next]");
      if (prevBtn) prevBtn.addEventListener("click", function () { sw.slidePrev(); });
      if (nextBtn) nextBtn.addEventListener("click", function () { sw.slideNext(); });
    });

    return api;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFeaturedBlogSlider = initFeaturedBlogSlider;

})(typeof window !== "undefined" ? window : this);
