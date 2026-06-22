/*!
 * featured-blog-slider.js v4.0.0
 * Featured-blog carousel for a Webflow CMS Collection List, built on Swiper
 * (slidesPerView:"auto") with a GSAP-driven depth-focus animation layer.
 *
 * Instead of binary CSS class swaps, every card's scale / opacity and its
 * image's parallax drift are mapped LIVE to that slide's Swiper progress
 * (0 = centered/active, ±1 = neighbours). So the motion is continuous and
 * tactile while dragging, and on a programmatic advance the cards ease over
 * the transition — the active one with a slight back-ease "settle" pop, the
 * neighbours with a soft power ease. The result reads premium, not 2018.
 *
 *   • Active card: full scale/opacity, soft two-layer shadow, crisp.
 *   • Neighbours: scaled down, dimmed, softly blurred + desaturated (CSS).
 *   • Image parallax: the card image drifts opposite the travel direction.
 *   • Stories-style fill bars (active fills, passed ones stay full) + arrows.
 *   • Autoplay pauses on hover / drag; bars pause in sync.
 *   • No GSAP? The slider still works; cards fall back to a static CSS depth.
 *   • prefers-reduced-motion: no autoplay, no GSAP motion, static depth.
 *
 * Requires : Swiper 11 (global `Swiper`) + its CSS, and GSAP (global `gsap`).
 *   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
 *   <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
 * CSS      : css/components/featured-blog-slider.css
 *
 * DOM (Webflow CMS — three DISTINCT elements; check the Navigator):
 *   [data-fbslider]                      root (.fbslider)
 *     [data-fbslider-viewport]           Collection List Wrapper  → .swiper
 *       [data-fbslider-track]            Collection List          → .swiper-wrapper
 *         [data-fbslider-card]           Collection Item          → .swiper-slide
 *           [data-fbslider-img]          (optional) the image to parallax
 *     [data-fbslider-bars]               controls strip (JS-populated: dots + arrows)
 *
 * Root attributes:
 *   data-fbslider-interval   ms each bar fills / autoplay tick   (default 5000)
 *   data-fbslider-speed      ms per slide transition             (default 900)
 *   data-fbslider-gap        px space between cards              (default 24)
 *   data-fbslider-autoplay   "false" to disable auto-advance     (default true)
 *   data-fbslider-centered   "true" → center the active card     (default false)
 *   data-fbslider-min-scale  neighbour card scale at full offset (default 0.86)
 *   data-fbslider-min-opacity neighbour card opacity at full offset (default 0.4)
 *   data-fbslider-parallax   image drift, % of its width (0=off) (default 10)
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

    var gsap = global.gsap;
    var hasGsap = typeof gsap !== "undefined";
    if (!hasGsap) {
      warn("GSAP not found — falling back to a static CSS depth (no live scale/parallax). " +
        "Add gsap.min.js to get the full motion.");
    }

    var parallaxAmt = attrNum(root, "data-fbslider-parallax", 10);

    // Tag our clean data-API elements with the classes Swiper requires, and
    // pick each card's parallax image (explicit [data-fbslider-img], else the
    // card's first <img> — a blog card is usually one hero image).
    root.classList.add("fbslider");
    if (!hasGsap) root.classList.add("fbslider--no-gsap");
    viewport.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    cards.forEach(function (c) {
      c.classList.add("swiper-slide");
      var img = c.querySelector("[data-fbslider-img]") || c.querySelector("img");
      if (img && parallaxAmt) {
        img.classList.add("fbslider-pimg");
        c._fbsImg = img;
      }
    });

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var interval   = attrNum(root, "data-fbslider-interval", 5000);
    var speed      = attrNum(root, "data-fbslider-speed", 900);
    var gap        = attrNum(root, "data-fbslider-gap", 24);
    var autoplay   = root.getAttribute("data-fbslider-autoplay") !== "false" && !reduce;
    var centered   = root.getAttribute("data-fbslider-centered") === "true";
    var minScale   = attrNum(root, "data-fbslider-min-scale", 0.86);
    var minOpacity = attrNum(root, "data-fbslider-min-opacity", 0.4);

    var animate = hasGsap && !reduce;

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
            d.classList.remove("is-active");
            void d.offsetWidth;   // reflow → restart the CSS fill
          }
          d.classList.toggle("is-active", on);
          d.classList.toggle("is-filled", n < s.activeIndex);
        });
        if (prevBtn) prevBtn.disabled = s.isBeginning;
        if (nextBtn) nextBtn.disabled = s.isEnd;
      }

      // ── GSAP depth-focus engine ───────────────────────────────────────
      // Map each slide's Swiper progress (0 centered, ±1 neighbour) to scale /
      // opacity, and its image to a parallax drift. Driven from Swiper's
      // setTranslate (live, e.g. dragging) + setTransition (eased, programmatic).
      var lastDur = 0;

      function render(durationMs) {
        if (!animate) return;
        var dur = durationMs / 1000;
        cards.forEach(function (slide) {
          var cp  = Math.max(-1, Math.min(1, slide.progress || 0));
          var abs = Math.abs(cp);
          var scale   = 1 - abs * (1 - minScale);
          var opacity = 1 - abs * (1 - minOpacity);
          var isActive = abs < 0.05;
          if (durationMs > 0) {
            gsap.to(slide, {
              scale: scale, opacity: opacity, duration: dur,
              // Active card overshoots a touch then settles; neighbours glide.
              ease: isActive ? "back.out(1.7)" : "power3.out",
              overwrite: "auto",
            });
          } else {
            gsap.set(slide, { scale: scale, opacity: opacity });
          }
          var img = slide._fbsImg;
          if (img) {
            var ix = cp * parallaxAmt;   // % of image width
            if (durationMs > 0) {
              gsap.to(img, { xPercent: ix, duration: dur, ease: "power3.out", overwrite: "auto" });
            } else {
              gsap.set(img, { xPercent: ix });
            }
          }
        });
      }

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
          init: function (s) {
            syncControls(s);
            render(0);
          },
          // Live (drag) updates come through here with no transition pending.
          setTranslate: function () {
            if (lastDur > 0) return;   // a real eased transition is animating
            render(0);
          },
          // Programmatic/drag-release transitions: ease over their duration.
          setTransition: function (s, dur) {
            lastDur = dur;
            render(dur);
          },
          transitionEnd: function () { lastDur = 0; },
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
