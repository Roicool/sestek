/*!
 * quote-wheel.js v1.0.1
 * v1.0.1: nav clicks preventDefault — authors build the buttons as <a href="#">
 *         link blocks in Webflow; without it every click jumped the page to #.
 * Rotating testimonial WHEEL (incident.io style): quote cards sit on the rim
 * of a huge off-screen circle anchored to the section's right edge; the wheel
 * auto-rotates one slot at a time with a springy settle (GSAP back.out), the
 * active card takes the accent colour, and hover reveals prev/next buttons.
 * On tablet/mobile the same quotes render as a Swiper carousel with tilted
 * neighbour cards (scroll-snap fallback when Swiper isn't loaded).
 *
 * Sestek adaptation of the original inline widget:
 *   • quotes come from the DOM ([data-qw-quote] — bind a CMS Collection List),
 *     not a JS array; the source list stays in the page for screen readers
 *     (visually hidden via CSS) and the generated wheel is aria-hidden.
 *   • rotation is a GSAP tween (back.out(1.4) ≈ the original ease-out-back
 *     cubic-bezier(0.34,1.56,0.64,1)) — no CSS transition on the rotor.
 *   • cards render for active ±2 slots (was ±1) so the incoming card already
 *     exists while the wheel turns; content swaps happen behind the fade mask.
 *   • autoplay also pauses when the tab is hidden and when the section is out
 *     of the viewport (IntersectionObserver) — not just on hover. Hover-pause
 *     is mouse-only so a tap can't stall it. Nav click = manual mode (auto
 *     stops, like the original).
 *
 * Requires : gsap. Sestek.util (js/core/utils.js) loaded first.
 *            Swiper 11 (swiper-bundle) OPTIONAL for the mobile carousel —
 *            without it a CSS scroll-snap fallback takes over.
 * CSS      : css/components/quote-wheel.css (wheel geometry, card states,
 *            fade mask, embedded Swiper core styles).
 *
 * DOM contract (Webflow — attributes matter, design is yours):
 *   [data-quote-wheel]                  root (layout/grid is Designer's)
 *     …heading etc. (plain Designer content, ignored by JS)…
 *     [data-qw-quotes]                  quote source (Collection List OK) —
 *                                       visually hidden once armed, SR-visible
 *       [data-qw-quote]                 one quote (textContent is used)
 *     [data-qw-wheel]                   wheel region (right column) — JS builds
 *                                       viewport/rotor/cards/fade inside it
 *     [data-qw-nav]                     optional wrapper for the buttons —
 *                                       revealed while the wheel is hovered
 *       [data-qw-prev] / [data-qw-next] buttons
 *     [data-qw-mobile]                  optional container for the mobile
 *                                       carousel — created by JS if absent
 *
 * Root attributes (all optional):
 *   data-qw-size       circle container px               (default 3000)
 *   data-qw-slots      slots on the rim                  (default 30)
 *   data-qw-card-w     card width px                     (default 485)
 *   data-qw-card-h     card height px                    (default 173)
 *   data-qw-interval   autoplay ms, 0 = off              (default 3000;
 *                      first turn fires at half this)
 *   data-qw-duration   turn tween seconds                (default 0.55)
 *   data-qw-ease       GSAP ease                         (default "back.out(1.4)")
 *   data-qw-min        wheel min viewport px; below it the Swiper carousel
 *                      renders instead                   (default 992)
 *   data-qw-spv        mobile slides per view            (default 1.15)
 *
 * Reduced motion: no autoplay, no tween — nav still works with instant turns.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    size: 3000,
    slots: 30,
    cardW: 485,
    cardH: 173,
    interval: 3000,
    duration: 0.55,
    ease: "back.out(1.4)",
    min: 992,
    spv: 1.15,
  };

  function buildOne(root) {
    if (root._quoteWheelInit) return;                         // idempotent
    root._quoteWheelInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var reduce = util.prefersReducedMotion();

    var quotes = [];
    var quoteEls = root.querySelectorAll("[data-qw-quote]");
    Array.prototype.forEach.call(quoteEls, function (el) {
      var t = (el.textContent || "").trim();
      if (t) quotes.push(t);
    });
    if (quotes.length < 2) {
      console.warn("[Sestek QuoteWheel] Need at least two [data-qw-quote] items.");
      return;
    }

    var SIZE     = attrNum(root, "data-qw-size", DEFAULTS.size);
    var SLOTS    = Math.max(6, attrNum(root, "data-qw-slots", DEFAULTS.slots));
    var CARD_W   = attrNum(root, "data-qw-card-w", DEFAULTS.cardW);
    var CARD_H   = attrNum(root, "data-qw-card-h", DEFAULTS.cardH);
    var INTERVAL = attrNum(root, "data-qw-interval", DEFAULTS.interval);
    var DUR      = attrNum(root, "data-qw-duration", DEFAULTS.duration);
    var MIN      = attrNum(root, "data-qw-min", DEFAULTS.min);
    var SPV      = attrNum(root, "data-qw-spv", DEFAULTS.spv);
    var EASE     = root.getAttribute("data-qw-ease") || DEFAULTS.ease;

    var STEP = 360 / SLOTS;
    var C = SIZE / 2;                                         // circle centre
    var R = C - CARD_W / 2;                                   // rim radius

    var wheel = root.querySelector("[data-qw-wheel]");
    var prevBtn = root.querySelector("[data-qw-prev]");
    var nextBtn = root.querySelector("[data-qw-next]");

    var mm = gsap.matchMedia();

    // ── Desktop wheel ───────────────────────────────────────────────────────
    mm.add("(min-width: " + MIN + "px)", function () {
      if (!wheel) {
        console.warn("[Sestek QuoteWheel] [data-qw-wheel] missing — wheel skipped.");
        return;
      }

      var viewport = document.createElement("div");
      viewport.setAttribute("data-qw-viewport", "");
      viewport.style.width = SIZE + "px";
      viewport.style.height = SIZE + "px";
      var rotor = document.createElement("div");
      rotor.setAttribute("data-qw-rotor", "");
      rotor.setAttribute("aria-hidden", "true");              // decorative; source list is SR-visible
      viewport.appendChild(rotor);
      var fade = document.createElement("div");
      fade.setAttribute("data-qw-fade", "");
      wheel.appendChild(viewport);
      wheel.appendChild(fade);

      var v = 0;                                              // active slot
      var A = 0;                                              // rotor angle (deg)
      var manual = false;
      var first = true;
      var paused = { hover: false, hidden: false, off: false };
      var timer = null, leaveTimer = null;
      var cardsBySlot = {};

      function slotPos(a) {
        var r = -(STEP * a);
        var l = (r * Math.PI) / 180;
        return {
          left: C + R * Math.cos(l) - CARD_W / 2,
          top: C + R * Math.sin(l) - CARD_H / 2,
          rot: r,
        };
      }

      // Keep cards alive for active ±2 slots: the incoming card exists before
      // the turn starts; churn happens off-screen behind the fade mask.
      function ensureCards() {
        var keep = {};
        for (var t = -2; t <= 2; t++) {
          var a = ((v + t) % SLOTS + SLOTS) % SLOTS;
          keep[a] = true;
          if (!cardsBySlot[a]) {
            var p = slotPos(a);
            var card = document.createElement("div");
            card.setAttribute("data-qw-card", "");
            card.style.cssText = "left:" + p.left + "px;top:" + p.top +
              "px;width:" + CARD_W + "px;height:" + CARD_H + "px;";
            gsap.set(card, { rotation: p.rot });
            var span = document.createElement("span");
            span.setAttribute("data-qw-text", "");
            span.textContent = quotes[(((v + t) % quotes.length) + quotes.length) % quotes.length];
            card.appendChild(span);
            rotor.appendChild(card);
            cardsBySlot[a] = card;
          }
          cardsBySlot[a].classList.toggle("is-active", a === v);
        }
        Object.keys(cardsBySlot).forEach(function (a) {
          if (!keep[a]) { rotor.removeChild(cardsBySlot[a]); delete cardsBySlot[a]; }
        });
      }

      function turn(delta, animate) {
        v = ((v + delta) % SLOTS + SLOTS) % SLOTS;
        A += STEP * delta;
        ensureCards();
        if (animate && !reduce) gsap.to(rotor, { rotation: A, duration: DUR, ease: EASE, overwrite: "auto" });
        else gsap.set(rotor, { rotation: A });
      }

      function shouldRun() {
        return INTERVAL > 0 && !reduce && !manual &&
          !paused.hover && !paused.hidden && !paused.off;
      }
      function schedule() {
        clearTimeout(timer);
        if (!shouldRun()) return;
        timer = setTimeout(function () {
          turn(1, true);
          first = false;
          schedule();
        }, first ? INTERVAL / 2 : INTERVAL);
      }

      // Hover: pause (mouse only, 500ms leave tolerance) + reveal the nav.
      function onEnter(e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        clearTimeout(leaveTimer);
        paused.hover = true;
        root.classList.add("is-hover");
        schedule();
      }
      function onLeave(e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        clearTimeout(leaveTimer);
        leaveTimer = setTimeout(function () {
          paused.hover = false;
          root.classList.remove("is-hover");
          schedule();
        }, 500);
      }
      wheel.addEventListener("pointerenter", onEnter);
      wheel.addEventListener("pointerleave", onLeave);

      // Tab hidden + section off-screen → pause.
      function onVis() { paused.hidden = document.hidden; schedule(); }
      document.addEventListener("visibilitychange", onVis);
      var io = null;
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver(function (entries) {
          paused.off = !entries[0].isIntersecting;
          schedule();
        }, { threshold: 0.1 });
        io.observe(root);
      }

      // Nav → manual mode (autoplay stops, like the original). preventDefault:
      // Webflow link-block buttons are <a href="#"> — don't jump the page.
      function onPrev(e) { if (e) e.preventDefault(); manual = true; clearTimeout(timer); turn(-1, true); }
      function onNext(e) { if (e) e.preventDefault(); manual = true; clearTimeout(timer); turn(1, true); }
      if (prevBtn) prevBtn.addEventListener("click", onPrev);
      if (nextBtn) nextBtn.addEventListener("click", onNext);

      gsap.set(rotor, { rotation: A });
      ensureCards();
      schedule();

      return function () {                                    // matchMedia cleanup
        clearTimeout(timer);
        clearTimeout(leaveTimer);
        document.removeEventListener("visibilitychange", onVis);
        if (io) io.disconnect();
        wheel.removeEventListener("pointerenter", onEnter);
        wheel.removeEventListener("pointerleave", onLeave);
        if (prevBtn) prevBtn.removeEventListener("click", onPrev);
        if (nextBtn) nextBtn.removeEventListener("click", onNext);
        gsap.killTweensOf(rotor);
        wheel.removeChild(viewport);
        wheel.removeChild(fade);
        root.classList.remove("is-hover");
      };
    });

    // ── Tablet / mobile carousel ────────────────────────────────────────────
    mm.add("(max-width: " + (MIN - 1) + "px)", function () {
      var host = root.querySelector("[data-qw-mobile]");
      var created = false;
      if (!host) {
        host = document.createElement("div");
        host.setAttribute("data-qw-mobile", "");
        root.appendChild(host);
        created = true;
      }

      var el = document.createElement("div");
      el.className = "swiper";
      var wrap = document.createElement("div");
      wrap.className = "swiper-wrapper";
      quotes.forEach(function (q) {
        var slide = document.createElement("div");
        slide.className = "swiper-slide";
        var card = document.createElement("div");
        card.setAttribute("data-qw-mcard", "");
        var span = document.createElement("span");
        span.setAttribute("data-qw-text", "");
        span.textContent = q;
        card.appendChild(span);
        slide.appendChild(card);
        wrap.appendChild(slide);
      });
      el.appendChild(wrap);
      host.appendChild(el);

      var swiper = null;
      if (typeof Swiper !== "undefined") {
        swiper = new Swiper(el, {
          slidesPerView: SPV,
          centeredSlides: true,
          spaceBetween: 16,
          loop: quotes.length > 2,
          grabCursor: true,
          keyboard: { enabled: true, onlyInViewport: true },
          speed: reduce ? 0 : 300,
        });
      } else {
        console.warn("[Sestek QuoteWheel] Swiper not found — CSS scroll-snap fallback active.");
        el.classList.add("is-fallback");
      }

      return function () {
        if (swiper) swiper.destroy(true, true);
        host.removeChild(el);
        if (created) root.removeChild(host);
      };
    });

    root._quoteWheelMM = mm;
  }

  /**
   * Initialise every [data-quote-wheel] section on the page in one call.
   * @param {string} [selector="[data-quote-wheel]"] narrow the scope if needed
   */
  function initQuoteWheel(selector) {
    // Tolerate late-loading gsap (async/defer order): poll for ~4s.
    if (typeof gsap === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined") { clearInterval(poll); initQuoteWheel(selector); }
        else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek QuoteWheel] gsap required — load gsap.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek QuoteWheel] Sestek.util (js/core/utils.js) required."); return;
    }

    // Arm the CSS (hides the SR source list visually; no-JS pages show the
    // plain quote list instead of an empty wheel — graceful fallback).
    document.documentElement.classList.add("qwheel-armed");

    var roots = document.querySelectorAll(selector || "[data-quote-wheel]");
    if (!roots.length) { console.warn("[Sestek QuoteWheel] No [data-quote-wheel] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initQuoteWheel = initQuoteWheel;

})(typeof window !== "undefined" ? window : this);
