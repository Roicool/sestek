/*!
 * story-slider.js v2.0.0
 * Stripe-style customer story slider for a Webflow Collection List.
 * Core mechanics are dependency-free vanilla JS (Stripe's own approach):
 *
 *   1. Hover — rAF + lerp drives two CSS vars (--ss-s scale, --ss-x
 *      shift) on each card's inner wrapper. Target scale 1.036; the
 *      neighbour shift is computed from the real card width
 *      (w * 0.036 / 2 → 5.976px on a 332px card, Stripe's exact number).
 *      transform-origin left center: hovered card and everything to its
 *      left ease left, the rest ease right — growth reads symmetric.
 *   2. Drag — mouse pointer drag on the native scroller (touch already
 *      scrolls natively); a real drag never triggers the card link.
 *   3. Nav — prev/next buttons (injected into [data-ss-nav] or above
 *      the list), disabled at the ends, one card per click.
 *   4. Keyboard — focusable region; ←/→ one card, Home/End jump.
 *   5. Entrance — cards stagger into place scrubbed to scroll
 *      (rise+fade+scale). The ONLY part that uses GSAP/ScrollTrigger;
 *      skipped silently if GSAP is absent or reduced motion is on.
 *
 * FOUC guard (optional, pairs with the entrance):
 *   html.w-mod-js [data-story-slider] .w-dyn-item { opacity: 0; }
 *
 * API:
 *   Sestek.initStorySlider()  — wire every [data-story-slider]
 *
 * DOM (Webflow) — attribute goes on the Collection List WRAPPER:
 *   <div data-story-slider>          Collection List Wrapper
 *     <div>                          Collection List      → .ss-list (scroller)
 *       <div>…</div>                 Collection Item      → .ss-item
 *         <a>…</a>                   kartın tamamı        → .ss-inner (transform)
 *     </div>
 *   </div>
 *
 * data-ss-link on the "Read story" text block → animated arrow appended.
 * data-ss-nav on any div (anywhere in the section) → buttons land there.
 * data-ss-prev / data-ss-next on your own two buttons → they get wired.
 *
 * Attributes (all optional, on [data-story-slider]):
 *   data-ss-scale="1.036"     hover scale target
 *   data-ss-card-w="360px"    card width (default 332px, caps at 78vw)
 *   data-ss-enter="false"     disable the entrance choreography
 *   data-ss-label="Customer stories"  accessible name for the region
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var LERP = 0.12; /* frame başına yumuşatma — küçük = daha yumuşak */

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

    /* transform bu wrapper'a uygulanır (yoksa item'ın kendisi) */
    var inners = items.map(function (it) {
      var inner = it.firstElementChild || it;
      inner.classList.add("ss-inner");
      return inner;
    });

    var SCALE = parseFloat(root.getAttribute("data-ss-scale"));
    if (isNaN(SCALE) || SCALE <= 0) SCALE = 1.036;
    var cardW = root.getAttribute("data-ss-card-w");
    if (cardW) root.style.setProperty("--ss-card-w", cardW);

    /* "Read story" oku */
    var links = root.querySelectorAll("[data-ss-link]");
    for (i = 0; i < links.length; i++) {
      if (links[i].querySelector(".ss-arrow")) continue;
      var span = document.createElement("span");
      span.className = "ss-arrow";
      span.innerHTML = ARROW_SVG;
      links[i].appendChild(span);
    }

    /* ── Nav butonları ────────────────────────────────────────────── */
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

    function step() {
      return items.length > 1
        ? items[1].offsetLeft - items[0].offsetLeft /* kart + gap */
        : items[0].getBoundingClientRect().width;
    }
    function updateArrows() {
      var max = list.scrollWidth - list.clientWidth - 1;
      prevBtn.disabled = list.scrollLeft <= 1;
      nextBtn.disabled = list.scrollLeft >= max;
    }
    prevBtn.addEventListener("click", function () {
      list.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" });
    });
    nextBtn.addEventListener("click", function () {
      list.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" });
    });
    list.addEventListener("scroll", updateArrows, { passive: true });
    global.addEventListener("resize", updateArrows);
    updateArrows();

    /* ── Klavye ───────────────────────────────────────────────────── */
    list.setAttribute("tabindex", "0");
    list.setAttribute("role", "region");
    list.setAttribute("aria-label",
      root.getAttribute("data-ss-label") || "Stories carousel");
    list.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); list.scrollBy({ left: -step(), behavior: "smooth" }); }
      else if (e.key === "ArrowRight") { e.preventDefault(); list.scrollBy({ left: step(), behavior: "smooth" }); }
      else if (e.key === "Home") { e.preventDefault(); list.scrollTo({ left: 0, behavior: "smooth" }); }
      else if (e.key === "End") { e.preventDefault(); list.scrollTo({ left: list.scrollWidth, behavior: "smooth" }); }
    });

    /* ── Hover: rAF + lerp → CSS değişkenleri (Stripe'ın yöntemi) ─── */
    var canHover =
      global.matchMedia &&
      global.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !reduce;

    if (canHover) {
      /* her kart: s = anlık scale, x = anlık shift; st/xt = hedefler */
      var state = items.map(function () { return { s: 1, st: 1, x: 0, xt: 0 }; });
      var hovered = -1, raf = null;

      var setTargets = function () {
        var half = 0;
        if (hovered >= 0) {
          var w = items[hovered].getBoundingClientRect().width;
          half = (w * (SCALE - 1)) / 2; /* 332px kartta ≈ 5.976px */
        }
        state.forEach(function (st, k) {
          st.st = k === hovered ? SCALE : 1;
          /* origin "left center": hover edilen ve solundakiler sola,
             sağındakiler sağa → büyüme simetrik, komşular ezilmez */
          st.xt = hovered < 0 ? 0 : (k <= hovered ? -half : half);
        });
        if (!raf) raf = requestAnimationFrame(tick);
      };

      var tick = function () {
        var busy = false;
        state.forEach(function (st, k) {
          st.s += (st.st - st.s) * LERP;
          st.x += (st.xt - st.x) * LERP;
          if (Math.abs(st.st - st.s) > 0.0004 || Math.abs(st.xt - st.x) > 0.04) {
            busy = true;
          } else { st.s = st.st; st.x = st.xt; }
          inners[k].style.setProperty("--ss-s", st.s.toFixed(4));
          inners[k].style.setProperty("--ss-x", st.x.toFixed(2) + "px");
        });
        raf = busy ? requestAnimationFrame(tick) : null;
      };

      items.forEach(function (it, k) {
        it.addEventListener("mouseenter", function () { hovered = k; setTargets(); });
        it.addEventListener("mouseleave", function () {
          if (hovered === k) { hovered = -1; setTargets(); }
        });
      });
    }

    /* ── Mouse ile sürükleme (touch zaten native kayar) ───────────── */
    var dragging = false, dragMoved = false, startX = 0, startScroll = 0;

    list.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse") return;
      dragging = true; dragMoved = false;
      startX = e.clientX; startScroll = list.scrollLeft;
      list.classList.add("ss-grabbing");
    });
    global.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) dragMoved = true;
      list.scrollLeft = startScroll - dx;
    });
    global.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      list.classList.remove("ss-grabbing");
      if (!dragMoved) return;
      /* Bırakınca en yakın kart sınırına yumuşakça otur. CSS snap,
         settle bitene kadar kapalı kalır (yoksa yarım kalan smooth
         scroll'u yakalayıp geri çeker). */
      list.classList.add("ss-settling");
      var s = step();
      var max = list.scrollWidth - list.clientWidth;
      var target = Math.max(0, Math.min(max, Math.round(list.scrollLeft / s) * s));
      list.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
      var done = function () {
        list.classList.remove("ss-settling");
        list.removeEventListener("scrollend", done);
      };
      if ("onscrollend" in global) list.addEventListener("scrollend", done);
      else setTimeout(done, 700);
    });
    /* gerçek sürükleme kart linkini tetiklemesin */
    list.addEventListener("click", function (e) {
      if (dragMoved) { e.preventDefault(); e.stopPropagation(); dragMoved = false; }
    }, true);

    /* ── Giriş: kartlar sahneye dizilir (scrub, sadece burada GSAP) ── */
    var enter = flag(root, "data-ss-enter", true);
    if (enter && !reduce &&
        typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      /* item'ı oynatır; hover transform'u .ss-inner'da yaşadığı için
         ikisi çakışmaz. */
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
