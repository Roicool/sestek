/*!
 * story-slider.js v3.0.0
 * Stripe-style customer story slider for a Webflow Collection List,
 * powered by Swiper (11+). This file is only the glue:
 *
 *   1. tags the Collection List DOM with Swiper's classes
 *      (wrapper → swiper-wrapper, items → swiper-slide),
 *   2. injects (or wires) prev/next buttons + the self-drawing arrow
 *      after every [data-ss-link],
 *   3. boots Swiper: free-mode drag with momentum that settles on a
 *      card boundary, grab cursor (also over links), keyboard,
 *      trackpad wheel, a11y — all Swiper's,
 *   4. entrance — cards stagger into place scrubbed to scroll
 *      (GSAP + ScrollTrigger; the ONLY GSAP usage, skipped silently
 *      if GSAP is absent or reduced motion is on).
 *
 * Hover (subtle card grow + arrow draw) is pure CSS in
 * css/effects/story-slider.css.
 *
 * Bleed layout: the wrapper sits inside your container (container-2xl);
 * overflow is visible, so cards flow past the container edges to the
 * viewport. Give the parent SECTION overflow:hidden so the page never
 * scrolls horizontally.
 *
 * Load order: swiper-bundle.css + swiper-bundle.js BEFORE this file.
 *   https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css
 *   https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js
 * If Swiper is missing, the list gracefully falls back to a plain
 * native scroller (CSS handles it) — buttons and touch still work.
 *
 * FOUC guard (optional, pairs with the entrance):
 *   html.w-mod-js [data-story-slider] .w-dyn-item { opacity: 0; }
 *
 * API:
 *   Sestek.initStorySlider()  — wire every [data-story-slider]
 *
 * DOM (Webflow) — attribute goes on the Collection List WRAPPER:
 *   <div data-story-slider>          Collection List Wrapper
 *     <div>                          Collection List      → swiper-wrapper
 *       <div>…</div>                 Collection Item      → swiper-slide
 *         <a>…</a>                   kart                 → .ss-inner (hover)
 *     </div>
 *   </div>
 *
 * data-ss-link on the "Read story" text block → animated arrow appended.
 * data-ss-nav on any div (anywhere in the section) → buttons land there.
 * data-ss-prev / data-ss-next on your own two buttons → they get wired.
 *
 * Attributes (all optional, on [data-story-slider]):
 *   data-ss-scale="1.036"     hover scale (CSS var)
 *   data-ss-card-w="360px"    card width (default 332px, caps at 78vw)
 *   data-ss-gap="24"          px between cards (Swiper spaceBetween)
 *   data-ss-snap="false"      free glide, don't settle on card boundaries
 *   data-ss-enter="false"     disable the entrance choreography
 *   data-ss-label="Customer stories"  accessible name
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ARROW_SVG =
    '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path class="ss-arrow-line" d="M0.5 5.5h7"></path>' +
    '<path d="M1.5 1.5l4 4-4 4"></path></svg>';

  var PREV_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true">' +
    '<path d="M9.613 2.62 5.107 7.124h9.137v1.75H5.107l4.506 4.506-1.238 1.238-6-6L1.756 8l.619-.62 6-6 1.238 1.24Z"></path></svg>';

  var NEXT_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" aria-hidden="true">' +
    '<path d="m6.387 2.62 4.506 4.505H1.756v1.75h9.137l-4.506 4.506 1.238 1.238 6-6L14.245 8l-.618-.62-6-6-1.239 1.24Z"></path></svg>';

  function findList(root) {
    return (
      root.querySelector("[data-ss-list]") ||
      root.querySelector(".w-dyn-items") ||
      root.firstElementChild
    );
  }

  /* Nav'ın gideceği kutu: [data-ss-nav] — önce wrapper'da, sonra yukarı
     doğru her atada aranır. Yoksa nav listenin üstüne enjekte edilir. */
  function findNavHost(root) {
    var node = root;
    while (node && node !== document.body) {
      var host = node.querySelector("[data-ss-nav]");
      if (host) return host;
      node = node.parentElement;
    }
    return null;
  }

  function flag(el, name, fallback) {
    var v = el.getAttribute(name);
    if (v === null || v === "") return fallback;
    return v !== "false" && v !== "0";
  }

  function makeBtn(dir, label) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ss-nav-btn";
    b.setAttribute("aria-label", label);
    b.innerHTML = dir < 0 ? PREV_SVG : NEXT_SVG;
    return b;
  }

  function build(root) {
    if (root.__ssBuilt) return;
    root.__ssBuilt = true;

    var reduce =
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var list = findList(root);
    if (!list) return;
    list.classList.add("ss-list");

    var items = [];
    for (var i = 0; i < list.children.length; i++) {
      var it = list.children[i];
      it.classList.add("ss-item");
      it.style.opacity = "1"; /* FOUC guard kuralını ez */
      items.push(it);
    }
    if (!items.length) return;

    /* Hover transform'u bu sarmalayıcıda yaşar (CSS'ten) */
    items.forEach(function (it) {
      (it.firstElementChild || it).classList.add("ss-inner");
    });

    var scale = parseFloat(root.getAttribute("data-ss-scale"));
    if (!isNaN(scale) && scale > 0) root.style.setProperty("--ss-scale", scale);
    var cardW = root.getAttribute("data-ss-card-w");
    if (cardW) root.style.setProperty("--ss-card-w", cardW);
    root.setAttribute("aria-label",
      root.getAttribute("data-ss-label") || "Stories carousel");

    /* "Read story" oku */
    var links = root.querySelectorAll("[data-ss-link]");
    for (i = 0; i < links.length; i++) {
      if (links[i].querySelector(".ss-arrow")) continue;
      var span = document.createElement("span");
      span.className = "ss-arrow";
      span.innerHTML = ARROW_SVG;
      links[i].appendChild(span);
    }

    /* Nav butonları */
    var navHost = findNavHost(root);
    var scope = navHost ? navHost.parentElement || navHost : root;
    var prevBtn = scope.querySelector("[data-ss-prev]") || root.querySelector("[data-ss-prev]");
    var nextBtn = scope.querySelector("[data-ss-next]") || root.querySelector("[data-ss-next]");
    if (!prevBtn || !nextBtn) {
      var nav = document.createElement("div");
      nav.className = "ss-nav";
      prevBtn = prevBtn || makeBtn(-1, "Previous");
      nextBtn = nextBtn || makeBtn(1, "Next");
      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
      if (navHost) navHost.appendChild(nav);
      else root.insertBefore(nav, list);
    }

    /* ── Swiper ───────────────────────────────────────────────────── */
    if (typeof Swiper !== "undefined") {
      root.classList.add("swiper");
      list.classList.add("swiper-wrapper");
      items.forEach(function (it) { it.classList.add("swiper-slide"); });

      var gap = parseFloat(root.getAttribute("data-ss-gap"));
      if (isNaN(gap)) gap = 24;

      root.__ssSwiper = new Swiper(root, {
        slidesPerView: "auto",
        spaceBetween: gap,
        freeMode: {
          enabled: true,
          sticky: flag(root, "data-ss-snap", true), /* kart sınırına otur */
          momentumBounce: false
        },
        grabCursor: true,          /* link üstünde de grab (CSS destekli) */
        touchStartPreventDefault: false,
        keyboard: { enabled: true, onlyInViewport: true },
        mousewheel: { forceToAxis: true },
        navigation: { prevEl: prevBtn, nextEl: nextBtn },
        on: {
          touchStart: function () { root.classList.add("ss-down"); },
          touchEnd: function () { root.classList.remove("ss-down"); }
        }
      });
    }
    /* Swiper yoksa: CSS'teki :not(.swiper) fallback'i native scroller
       olarak devrede; butonları ona bağla. */
    else {
      var step = function () {
        return items.length > 1
          ? items[1].offsetLeft - items[0].offsetLeft
          : items[0].getBoundingClientRect().width;
      };
      var upd = function () {
        var max = list.scrollWidth - list.clientWidth - 1;
        prevBtn.disabled = list.scrollLeft <= 1;
        nextBtn.disabled = list.scrollLeft >= max;
      };
      prevBtn.addEventListener("click", function () {
        list.scrollBy({ left: -step(), behavior: "smooth" });
      });
      nextBtn.addEventListener("click", function () {
        list.scrollBy({ left: step(), behavior: "smooth" });
      });
      list.addEventListener("scroll", upd, { passive: true });
      upd();
    }

    /* ── Giriş: kartlar sahneye dizilir (scrub — tek GSAP kullanımı) ─ */
    var enter = flag(root, "data-ss-enter", true);
    if (enter && !reduce &&
        typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      /* Swiper wrapper'ı transform'lar, item'ları değil — item'ı
         oynatmak güvenli; hover da .ss-inner'da yaşadığı için üçü
         birbirine karışmaz. */
      gsap.fromTo(items,
        { y: 56, opacity: 0, scale: 0.96 },
        {
          y: 0, opacity: 1, scale: 1,
          ease: "power2.out",
          duration: 1,
          stagger: 0.12,
          scrollTrigger: {
            trigger: root,
            start: "top 92%",
            end: "top 45%",
            scrub: 1
          }
        });
    }
  }

  function initStorySlider() {
    var roots = document.querySelectorAll("[data-story-slider]");
    for (var i = 0; i < roots.length; i++) build(roots[i]);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStorySlider = initStorySlider;
})(window);
