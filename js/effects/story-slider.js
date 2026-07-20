/*!
 * story-slider.js v1.2.0
 * Stripe-style customer story slider for a Webflow Collection List.
 *
 *   1. tags the Collection List / Items with .ss-list / .ss-item,
 *   2. injects (or wires) prev/next buttons + keeps disabled state,
 *   3. appends the self-drawing arrow after every [data-ss-link],
 *   4. drag + throw — GSAP Draggable + InertiaPlugin drive the native
 *      scroller through a proxy (grab a card, fling it, it glides and
 *      settles on a card boundary). Touch: horizontal swipe = drag with
 *      inertia, vertical swipe = native page scroll.
 *   5. keyboard — the list is focusable; ←/→ move one card,
 *      Home/End jump to the ends.
 *   6. entrance — cards stagger into place (rise + fade), scrubbed to
 *      scroll like scroll-fx: reversible, never one-shot. Needs
 *      ScrollTrigger; skipped under prefers-reduced-motion.
 *
 * Hover choreography is GSAP-driven like Stripe's (tweened per card,
 * expo.out — direction changes bend mid-flight); the CSS :hover rules
 * only remain as a no-GSAP fallback.
 *
 * Nav placement: put data-ss-nav on any Div (e.g. in your heading row,
 * even outside the wrapper) — the injected buttons land inside it.
 * Without it they go right above the list.
 * gsap + Draggable + InertiaPlugin + ScrollTrigger recommended; every
 * layer degrades gracefully if its plugin is missing (no drag / no
 * entrance — buttons, swipe and keyboard still work).
 *
 * FOUC guard (optional, pairs with the entrance):
 *   html.w-mod-js [data-story-slider] .w-dyn-item { opacity: 0; }
 * init reveals items the moment their start state is applied.
 *
 * API:
 *   Sestek.initStorySlider()  — wire every [data-story-slider]
 *
 * DOM (Webflow) — attribute goes on the Collection List WRAPPER:
 *   <div data-story-slider>          Collection List Wrapper
 *     <div>                          Collection List      → .ss-list
 *       <div>…</div>                 Collection Item      → .ss-item
 *     </div>
 *   </div>
 *
 * Inside each item, put data-ss-link on the "Read story" text block —
 * the animated arrow is appended automatically. Own nav: data-ss-prev /
 * data-ss-next on any two buttons inside the wrapper.
 *
 * Attributes (all optional, on [data-story-slider]):
 *   data-ss-scale="1.035"   hover scale
 *   data-ss-shift="6"       neighbour shift in px
 *   data-ss-enter="false"   disable the entrance choreography
 *   data-ss-snap="false"    disable card-boundary snapping after a throw
 *   data-ss-label="Customer stories"  accessible name for the region
 * On any div (anywhere in the section):
 *   data-ss-nav               injected prev/next buttons go here
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ARROW_SVG =
    '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path class="ss-arrow-line" d="M0.5 5.5h7"></path>' +
    '<path class="ss-arrow-head" d="M1.5 1.5l4 4-4 4"></path></svg>';

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

  /* Nav'ın gideceği kutu: [data-ss-nav] — önce wrapper'ın içinde, sonra
     yukarı doğru her atada aranır (Webflow'da başlık satırındaki bir Div
     olur genelde). Bulunamazsa nav listenin üstüne enjekte edilir. */
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

    var hasGsap = typeof gsap !== "undefined";
    var reduce =
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var list = findList(root);
    if (!list) return;
    list.classList.add("ss-list");

    var items = [];
    for (var i = 0; i < list.children.length; i++) {
      list.children[i].classList.add("ss-item");
      /* FOUC gizleme kuralını ez (guard CSS kullanılıyorsa) */
      list.children[i].style.opacity = "1";
      items.push(list.children[i]);
    }
    if (!items.length) return;

    var scale = parseFloat(root.getAttribute("data-ss-scale"));
    if (!isNaN(scale) && scale > 0) root.style.setProperty("--ss-scale", scale);
    var shift = parseFloat(root.getAttribute("data-ss-shift"));
    if (!isNaN(shift)) root.style.setProperty("--ss-shift", shift + "px");

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
    var prev = scope.querySelector("[data-ss-prev]") || root.querySelector("[data-ss-prev]");
    var next = scope.querySelector("[data-ss-next]") || root.querySelector("[data-ss-next]");
    if (!prev || !next) {
      var nav = document.createElement("div");
      nav.className = "ss-nav";
      prev = prev || makeBtn(-1, "Previous");
      next = next || makeBtn(1, "Next");
      nav.appendChild(prev);
      nav.appendChild(next);
      if (navHost) navHost.appendChild(nav);
      else root.insertBefore(nav, list);
    }

    function gapPx() {
      var g = parseFloat(getComputedStyle(list).columnGap);
      return isNaN(g) ? 24 : g;
    }
    function step() {
      return items[0].getBoundingClientRect().width + gapPx();
    }
    function maxScroll() {
      return list.scrollWidth - list.clientWidth;
    }
    function update() {
      prev.disabled = list.scrollLeft <= 1;
      next.disabled = list.scrollLeft >= maxScroll() - 1;
    }
    function killThrow() {
      if (drag && drag.tween) drag.tween.kill();
    }
    function go(dir) {
      killThrow();
      var target = Math.max(0, Math.min(maxScroll(), list.scrollLeft + dir * step()));
      list.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
    }

    prev.addEventListener("click", function () { go(-1); });
    next.addEventListener("click", function () { go(1); });

    var raf = 0;
    list.addEventListener("scroll", function () {
      if (raf) return;
      raf = requestAnimationFrame(function () { raf = 0; update(); });
    }, { passive: true });
    global.addEventListener("resize", update);
    update();

    /* ── Klavye ───────────────────────────────────────────────────── */
    list.setAttribute("tabindex", "0");
    list.setAttribute("role", "region");
    list.setAttribute("aria-label",
      root.getAttribute("data-ss-label") || "Stories carousel");
    list.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      else if (e.key === "Home") { e.preventDefault(); killThrow(); list.scrollTo({ left: 0, behavior: "smooth" }); }
      else if (e.key === "End") { e.preventDefault(); killThrow(); list.scrollTo({ left: maxScroll(), behavior: "smooth" }); }
    });

    /* ── Hover koreografisi — Stripe gibi JS sürer ────────────────
       CSS transition yerine her kart kendi GSAP tween'iyle hedefe
       yaklaşır (expo.out): hover hızla değişince yön yarı yoldan
       yumuşakça döner, CSS'in "baştan başlama" hissi olmaz.
       .ss-js-hover sınıfı CSS fallback'ini kapatır. */
    var clearHover = function () {};
    var hoverOn = hasGsap && !reduce &&
      global.matchMedia && global.matchMedia("(hover: hover)").matches;
    if (hoverOn) {
      root.classList.add("ss-js-hover");
      var hScale = !isNaN(scale) && scale > 0 ? scale : 1.035;
      var hShift = !isNaN(shift) ? shift : 6;
      var hovered = -1;
      var render = function () {
        for (var k = 0; k < items.length; k++) {
          var isH = k === hovered;
          items[k].style.zIndex = isH ? "2" : "";
          gsap.to(items[k], {
            scale: isH ? hScale : 1,
            x: hovered < 0 || isH ? 0 : (k < hovered ? -hShift : hShift),
            duration: 0.6,
            ease: "expo.out",
            overwrite: "auto"
          });
        }
      };
      clearHover = function () {
        if (hovered > -1) { hovered = -1; render(); }
      };
      items.forEach(function (it, k) {
        it.addEventListener("pointerenter", function (e) {
          if (e.pointerType && e.pointerType !== "mouse") return;
          hovered = k; render();
        });
        it.addEventListener("pointerleave", function (e) {
          if (e.pointerType && e.pointerType !== "mouse") return;
          if (hovered === k) { hovered = -1; render(); }
        });
      });
    }

    /* ── Drag + inertia (Draggable proxy → native scrollLeft) ─────── */
    var drag = null;
    if (hasGsap && typeof Draggable !== "undefined") {
      if (typeof InertiaPlugin !== "undefined") {
        gsap.registerPlugin(Draggable, InertiaPlugin);
      } else {
        gsap.registerPlugin(Draggable);
      }
      var snapOn = flag(root, "data-ss-snap", true);
      var proxy = document.createElement("div");
      var pressX = 0, pressScroll = 0, pressStep = 1;

      var applyScroll = function () {
        list.scrollLeft = pressScroll - (this.x - pressX);
      };

      drag = Draggable.create(proxy, {
        type: "x",
        trigger: list,
        inertia: typeof InertiaPlugin !== "undefined",
        edgeResistance: 0.85,
        cursor: "grab",
        activeCursor: "grabbing",
        allowNativeTouchScrolling: true, /* dikey swipe = sayfa scroll'u */
        onPress: function () {
          killScroll();
          clearHover();
          pressX = this.x;
          pressScroll = list.scrollLeft;
          pressStep = step();
          /* scrollLeft ∈ [0, max] aralığını proxy-x sınırına çevir */
          this.applyBounds({
            minX: pressX + pressScroll - maxScroll(),
            maxX: pressX + pressScroll
          });
          list.classList.add("ss-grabbing");
        },
        onDrag: applyScroll,
        onThrowUpdate: applyScroll,
        onRelease: function () { list.classList.remove("ss-grabbing"); },
        snap: snapOn ? function (endX) {
          /* fırlatma kart sınırında dursun */
          var target = pressScroll - (endX - pressX);
          var aligned = Math.round(target / pressStep) * pressStep;
          aligned = Math.max(0, Math.min(maxScroll(), aligned));
          return pressX + pressScroll - aligned;
        } : undefined
      })[0];
    }
    function killScroll() {
      /* native smooth scroll'u ve süren throw'u durdur */
      list.scrollTo({ left: list.scrollLeft, behavior: "auto" });
    }

    /* ── Giriş koreografisi: kartlar sahneye dizilir (scrub) ──────── */
    var enter = flag(root, "data-ss-enter", true);
    if (enter && !reduce && hasGsap && typeof ScrollTrigger !== "undefined") {
      gsap.registerPlugin(ScrollTrigger);
      /* Hover transition .ss-item'ın transform'unda yaşıyor; çakışmasın
         diye giriş, item'ın İÇİNDEKİ kartı oynatır. */
      var targets = items.map(function (it) {
        return it.firstElementChild || it;
      });
      gsap.fromTo(targets,
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
