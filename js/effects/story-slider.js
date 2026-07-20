/*!
 * story-slider.js v1.0.0
 * Stripe-style customer story slider for a Webflow Collection List.
 * Motion is pure CSS (css/effects/story-slider.css) — this file only:
 *
 *   1. tags the Collection List / Items with .ss-list / .ss-item,
 *   2. injects (or wires) prev/next buttons + keeps disabled state,
 *   3. appends the self-drawing arrow after every [data-ss-link],
 *   4. scrolls one card per click (native smooth scrolling).
 *
 * No GSAP needed. Touch/trackpad swipe works natively (overflow scroll).
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
 * the animated arrow is appended automatically.
 *
 * Optional own nav: put data-ss-prev / data-ss-next on any two buttons
 * inside (or around) the wrapper; if absent, default buttons are
 * injected above the list.
 *
 * Attributes (all optional, on [data-story-slider]):
 *   data-ss-scale="1.035"   hover scale
 *   data-ss-shift="6"       neighbour shift in px
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
    /* Öncelik: elle işaretlenmiş liste → Webflow Collection List →
       ilk element çocuğu. */
    return (
      root.querySelector("[data-ss-list]") ||
      root.querySelector(".w-dyn-items") ||
      root.firstElementChild
    );
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

    var list = findList(root);
    if (!list) return;
    list.classList.add("ss-list");

    var items = [];
    for (var i = 0; i < list.children.length; i++) {
      list.children[i].classList.add("ss-item");
      items.push(list.children[i]);
    }
    if (!items.length) return;

    /* İnce ayar attribute'ları → CSS değişkeni */
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

    /* Nav butonları: kendininki varsa onu kullan, yoksa enjekte et. */
    var prev = root.querySelector("[data-ss-prev]");
    var next = root.querySelector("[data-ss-next]");
    if (!prev || !next) {
      var nav = document.createElement("div");
      nav.className = "ss-nav";
      prev = prev || makeBtn(-1, "Previous");
      next = next || makeBtn(1, "Next");
      nav.appendChild(prev);
      nav.appendChild(next);
      root.insertBefore(nav, list);
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

    function go(dir) {
      var target = Math.max(0, Math.min(maxScroll(), list.scrollLeft + dir * step()));
      list.scrollTo({ left: target, behavior: "smooth" });
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
  }

  function initStorySlider() {
    var roots = document.querySelectorAll("[data-story-slider]");
    for (var i = 0; i < roots.length; i++) build(roots[i]);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStorySlider = initStorySlider;
})(window);
