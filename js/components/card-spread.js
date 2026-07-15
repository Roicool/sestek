/*!
 * card-spread.js v1.1.0
 * Ramp-style pinned scroll sequence, scrub-driven and fully reversible:
 *   1. (optional) a "physical card" hero visual is wiped away bottom-up with
 *      a clip-path while a 1px scan line travels up its face in sync —
 *      exactly Ramp's corporate-cards effect (clip inset + synced line).
 *   2. the virtual cards sit as a PERFECT deck (fully hidden behind the
 *      centre card) and SPREAD out from behind it to their natural grid
 *      positions — fanning open mid-flight and straightening with a soft
 *      back.out snap (FLIP-style: JS measures the real layout and animates
 *      the delta, so any Webflow grid/flex layout works, any breakpoint,
 *      any card count).
 *   3. a description rises from under each card.
 *   4. numbers inside the cards count up to their set values.
 * Then the pin releases and the page scrolls on normally — there is no
 * "collect back" phase; scrolling back up simply reverses the same scrub.
 *
 * Everything sits on ONE scrubbed timeline (smooth, no snapping), pinned by
 * ScrollTrigger. Lenis at the site level is fine — ScrollTrigger reads the
 * native scroll position Lenis writes.
 *
 * Requires : gsap + ScrollTrigger (registered here), Sestek.util
 *            (js/core/utils.js) loaded first. Lenis optional.
 * CSS      : css/components/card-spread.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-card-spread]                  root — THIS is pinned; give it the
 *                                       section height (e.g. min-height:100svh)
 *     [data-csp-stage]                  layout wrapper (defaults to root)
 *       [data-csp-header]               optional heading wrapper — drifts up
 *                                       and fades out as the sequence starts
 *       [data-csp-hero]                 optional wrapper for the physical card
 *                                       (position:relative in CSS)
 *         [data-csp-hero-visual]        the visual that gets wiped (falls back
 *                                       to the first <img> inside the hero)
 *         [data-csp-line]               the scan line (absolute, top:0 — JS
 *                                       moves it bottom → top during the wipe)
 *       [data-csp-grid]                 the final card layout (grid/flex)
 *         [data-csp-item]               one column, holds:
 *           [data-csp-card]             the card (JS stacks + spreads these)
 *             [data-csp-count           a number that counts up
 *               data-csp-to="3000"        target value        (required)
 *               data-csp-from="0"         start value         (default 0)
 *               data-csp-decimals="0"     decimal places      (default 0)
 *               data-csp-sep="."          thousands separator (default none)
 *               data-csp-prefix="$"       text before         (default "")
 *               data-csp-suffix=" TL"]    text after          (default "")
 *           [data-csp-desc]             the description under the card
 *
 * Root attributes (all optional):
 *   data-csp-start        ScrollTrigger start            (default "top top")
 *   data-csp-end          pin scroll distance            (default "+=160%")
 *   data-csp-scrub        scrub lag in seconds           (default 0.8)
 *   data-csp-stagger      spread offset per depth level from the centre
 *                         card, in timeline units             (default 0.1)
 *   data-csp-stack-scale  scale falloff per depth while decked (default 0.06)
 *   data-csp-fan          deg of in-flight fan per depth; the card rotates
 *                         open then straightens with back.out (default 7;
 *                         "0" = straight slide, no fan)
 *
 * Reduced motion: no pin, no scrub — the section renders as its final frame
 * (hero wiped away, cards in place, descriptions visible, counters at their
 * target values).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function buildOne(root) {
    if (root._cardSpreadInit) return;                       // idempotent
    root._cardSpreadInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var reduce = util.prefersReducedMotion();
    var toArray = gsap.utils.toArray;

    var stage = root.querySelector("[data-csp-stage]") || root;
    var cards = toArray(root.querySelectorAll("[data-csp-card]"));
    var descs = toArray(root.querySelectorAll("[data-csp-desc]"));
    var header = root.querySelector("[data-csp-header]");
    var hero = root.querySelector("[data-csp-hero]");
    var heroVisual = hero ? (hero.querySelector("[data-csp-hero-visual]") || hero.querySelector("img")) : null;
    var line = hero ? hero.querySelector("[data-csp-line]") : null;

    if (!cards.length) {
      console.warn("[Sestek CardSpread] Need at least one [data-csp-card].");
      return;
    }

    // ── Counters ─────────────────────────────────────────────────────────────
    var counters = toArray(root.querySelectorAll("[data-csp-count]")).map(function (el) {
      return {
        el: el,
        from: attrNum(el, "data-csp-from", 0),
        to: attrNum(el, "data-csp-to", 0),
        dec: attrNum(el, "data-csp-decimals", 0),
        sep: el.getAttribute("data-csp-sep") || "",
        prefix: el.getAttribute("data-csp-prefix") || "",
        suffix: el.getAttribute("data-csp-suffix") || ""
      };
    });

    function renderCount(c, v) {
      var s = v.toFixed(c.dec);
      if (c.sep) {
        var parts = s.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, c.sep);
        s = parts.join(c.dec ? "," : "");                   // sep "." implies decimal ","
      }
      c.el.textContent = c.prefix + s + c.suffix;
    }

    // ── Reduced motion: final frame, no pin, no scrub ───────────────────────
    if (reduce) {
      if (heroVisual) gsap.set(heroVisual, { clipPath: "inset(0% 0% 100% 0%)" });
      if (line) gsap.set(line, { autoAlpha: 0 });
      counters.forEach(function (c) { renderCount(c, c.to); });
      return;                                               // cards + descs stay as laid out
    }

    var START = root.getAttribute("data-csp-start") || "top top";
    var END = root.getAttribute("data-csp-end") || "+=160%";
    var SCRUB = attrNum(root, "data-csp-scrub", 0.8);
    var STAGGER = attrNum(root, "data-csp-stagger", 0.1);   // per depth level from centre
    var STACK_SC = attrNum(root, "data-csp-stack-scale", 0.06); // behind-cards scale falloff
    var FAN = attrNum(root, "data-csp-fan", 7);             // deg of in-flight fan per depth

    var tl = null;

    function destroy() {
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        tl = null;
      }
    }

    function build() {
      destroy();

      // Measure the REAL layout first (transforms cleared), then stack the
      // cards on the origin by delta — FLIP, so any layout/breakpoint works.
      gsap.set(cards, { clearProps: "transform" });
      if (heroVisual) gsap.set(heroVisual, { clearProps: "clipPath" });
      if (line) gsap.set(line, { clearProps: "transform,opacity,visibility" });

      var originEl = heroVisual || stage;
      var oR = originEl.getBoundingClientRect();
      var ox = oR.left + oR.width / 2;
      var oy = oR.top + oR.height / 2;
      var mid = (cards.length - 1) / 2;

      // Perfect deck: every card dead-centre on the origin, no offset, no
      // tilt — the back cards are completely HIDDEN behind the centre card
      // (centre = highest z, receding by distance). They only appear when
      // the spread pulls them out.
      cards.forEach(function (card, i) {
        var r = card.getBoundingClientRect();
        var depth = Math.abs(i - mid);
        gsap.set(card, {
          x: ox - (r.left + r.width / 2),
          y: oy - (r.top + r.height / 2),
          rotation: 0,
          scale: 1 - depth * STACK_SC,
          zIndex: 20 - depth,
          transformOrigin: "50% 50%"
        });
      });
      gsap.set(descs, { autoAlpha: 0, y: 28 });
      if (header) gsap.set(header, { clearProps: "transform,opacity,visibility" });
      var heroH = heroVisual ? heroVisual.getBoundingClientRect().height : 0;
      if (line) gsap.set(line, { y: heroH });
      counters.forEach(function (c) { renderCount(c, c.from); });

      tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: START,
          end: END,
          scrub: SCRUB,
          pin: true,
          anticipatePin: 1
        }
      });

      // Phase 0 — the heading drifts up and out as the sequence starts
      // (Ramp's t0 → t1: title exits before/while the card is scanned).
      if (header) {
        tl.to(header, { autoAlpha: 0, y: -48, duration: 0.5, ease: "power2.in" }, 0);
      }

      // Phase 1 — the physical card is scanned away (only if a hero exists).
      var spreadAt = 0;
      if (heroVisual) {
        tl.fromTo(heroVisual, { clipPath: "inset(0% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 100% 0%)", duration: 1, ease: "power1.inOut" }, 0);
        if (line) {
          tl.to(line, { y: 0, duration: 1, ease: "power1.inOut" }, 0);
          tl.to(line, { autoAlpha: 0, duration: 0.12 }, 0.97);
        }
        spreadAt = 0.4;                                     // cards emerge mid-wipe
      }

      // Phase 2 — the deck spreads from BEHIND the centre card. Each card
      // flies to its slot fanning open mid-flight (rotation out, then a
      // back.out straighten = a soft snap into place). x and y run on
      // different eases so the path bows slightly instead of a straight
      // slide. Centre card only settles its scale.
      cards.forEach(function (card, i) {
        var depth = Math.abs(i - mid);
        var at = spreadAt + depth * STAGGER;
        tl.to(card, { x: 0, duration: 1.1, ease: "power2.inOut" }, at);
        tl.to(card, { y: 0, duration: 1.1, ease: "power3.inOut" }, at);
        tl.to(card, { scale: 1, duration: 1.1, ease: "power2.inOut" }, at);
        if (i !== mid && FAN) {
          tl.to(card, { rotation: (i - mid) * FAN, duration: 0.5, ease: "power2.out" }, at);
          tl.to(card, { rotation: 0, duration: 0.65, ease: "back.out(1.7)" }, at + 0.5);
        }
      });

      // Phase 3 — descriptions rise + counters count, overlapping the settle.
      tl.addLabel("reveal", spreadAt + 1.0);
      if (descs.length) {
        tl.to(descs, { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out", stagger: 0.12 }, "reveal");
      }
      counters.forEach(function (c) {
        var proxy = { v: c.from };
        tl.to(proxy, {
          v: c.to, duration: 1.1, ease: "power1.out",
          onUpdate: function () { renderCount(c, proxy.v); }
        }, "reveal");
      });

      tl.to({}, { duration: 0.35 });                        // settle before unpin
    }

    build();

    // Rebuild on resize / late media load — the FLIP deltas depend on layout.
    var resizeTimer;
    function rebuild() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    }
    window.addEventListener("resize", rebuild);
    window.addEventListener("load", rebuild);
  }

  /**
   * Initializes every card-spread section on the page in one call.
   * @param {string} [selector="[data-card-spread]"] narrow the scope if needed
   */
  function initCardSpread(selector) {
    // Tolerate late-loading libraries (async/defer script order): poll for
    // gsap + ScrollTrigger for up to ~4s before giving up.
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
          clearInterval(poll);
          initCardSpread(selector);
        } else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek CardSpread] gsap + ScrollTrigger required — " +
            "load gsap.min.js AND ScrollTrigger.min.js before this script. Missing: " +
            (typeof gsap === "undefined" ? "gsap " : "") +
            (typeof ScrollTrigger === "undefined" ? "ScrollTrigger" : ""));
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek CardSpread] Sestek.util (js/core/utils.js) required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var roots = document.querySelectorAll(selector || "[data-card-spread]");
    if (!roots.length) { console.warn("[Sestek CardSpread] No [data-card-spread] found."); return; }
    roots.forEach(buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCardSpread = initCardSpread;

})(typeof window !== "undefined" ? window : this);
