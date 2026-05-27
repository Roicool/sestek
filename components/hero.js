/*!
 * hero.js v1.0.0
 * Hero — fullscreen video morphs into an inline slot as user scrolls
 * Requires: gsap + ScrollTrigger registered, Sestek.initLenis() already called
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Initializes the hero scroll animation.
   * @param {string} [selector="[data-hero]"]
   */
  function initHero(selector) {
    var hero = document.querySelector(selector || "[data-hero]");
    if (!hero) { console.warn("[Sestek Hero] No hero element found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek Hero] GSAP + ScrollTrigger required."); return;
    }

    var el = {
      videoWrap : hero.querySelector("[data-hero-video-wrap]"),
      overlay   : hero.querySelector(".hero__video-overlay"),
      s1Content : hero.querySelector("[data-hero-s1-content]"),
      scene2    : hero.querySelector("[data-hero-s2]"),
      words     : Array.from(hero.querySelectorAll("[data-hero-word]")),
      slot      : hero.querySelector("[data-hero-video-slot]"),
      barBeta   : hero.querySelector("[data-hero-bar-beta]"),
    };

    // Bail if any critical element is missing
    var missing = Object.keys(el).filter(function (k) {
      return !el[k] || (NodeList && el[k] instanceof NodeList && !el[k].length);
    });
    if (missing.length) {
      console.warn("[Sestek Hero] Missing elements:", missing.join(", ")); return;
    }

    // Prefers-reduced-motion: skip everything, show scene 2 immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el.scene2, { opacity: 1 });
      gsap.set(el.words, { opacity: 1, y: 0 });
      return;
    }

    var activeST = null;

    function build() {
      if (activeST) {
        activeST.kill();
        ScrollTrigger.refresh();
      }

      var vw = window.innerWidth;
      var vh = window.innerHeight;

      /*
       * Slot rect is measured before the timeline starts.
       * opacity:0 on the parent doesn't affect layout so getBoundingClientRect
       * returns correct values. The hero is position:relative so slot coords
       * are viewport-relative — which is what we want since the hero will be
       * pinned to the viewport during the animation.
       */
      var slotRect = el.slot.getBoundingClientRect();

      /*
       * Compute the transform that maps the full-viewport video-wrap
       * (transform-origin: center center) onto the slot's position and size.
       */
      var targetScaleX = slotRect.width  / vw;
      var targetScaleY = slotRect.height / vh;
      var targetX      = (slotRect.left + slotRect.width  * 0.5) - vw * 0.5;
      var targetY      = (slotRect.top  + slotRect.height * 0.5) - vh * 0.5;

      // Hard-reset before re-building so resize doesn't leave stale values
      gsap.set(el.videoWrap, { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1, borderRadius: 0 });
      gsap.set(el.overlay,   { opacity: 1 });
      gsap.set(el.s1Content, { opacity: 1, y: 0 });
      gsap.set(el.scene2,    { opacity: 0 });
      gsap.set(el.words,     { opacity: 0, y: 40 });
      gsap.set(el.barBeta,   { color: "var(--neutral--0)" });

      var tl = gsap.timeline({
        defaults: { ease: "none" }, // scrub handles timing; per-tween eases override this
        scrollTrigger: {
          trigger    : hero,
          start      : "top top",
          end        : "+=250%",  // 2.5× viewport of scroll distance
          pin        : true,
          scrub      : 1,         // 1s lag behind scroll — feels heavy/premium
          anticipatePin: 1,
        },
      });

      // ── Phase 1 (0.00 – 0.20): Scene 1 text exits ───────────────
      tl.to(el.s1Content, {
        opacity: 0,
        y: -28,
        ease: "power2.in",
        duration: 0.20,
      }, 0);

      // ── Phase 2 (0.06 – 0.28): Dark overlay fades — video gets "clean" ─
      tl.to(el.overlay, {
        opacity: 0,
        duration: 0.22,
      }, 0.06);

      // ── Phase 3 (0.16 – 0.64): Video morphs to inline slot ──────
      /*
       * We animate scale + translate instead of width/height/top/left
       * so the browser can GPU-composite without layout recalculation.
       * border-radius grows from 0 to match the slot's --radius--md (8px).
       */
      tl.to(el.videoWrap, {
        scaleX      : targetScaleX,
        scaleY      : targetScaleY,
        x           : targetX,
        y           : targetY,
        borderRadius: "8px",
        ease        : "power2.inOut",
        duration    : 0.48,
      }, 0.16);

      // ── Phase 4 (0.34 – 0.46): Scene 2 fades in ─────────────────
      tl.to(el.scene2, {
        opacity : 1,
        duration: 0.12,
      }, 0.34);

      // Bar beta text: white → dark as background switches to off-white
      tl.to(el.barBeta, {
        color   : "var(--neutral--700)",
        duration: 0.18,
      }, 0.32);

      // ── Phase 5 (0.40 – 0.76): Words stagger in ──────────────────
      /*
       * Each word animates independently so scrub gives a natural
       * "words landing one by one" feel as the user scrolls slowly.
       */
      el.words.forEach(function (word, i) {
        tl.to(word, {
          opacity : 1,
          y       : 0,
          ease    : "power3.out",
          duration: 0.14,
        }, 0.40 + i * 0.08);
      });

      // ── Phase 6 (0.80 – 0.94): Video fades from slot ─────────────
      tl.to(el.videoWrap, {
        opacity : 0,
        duration: 0.14,
      }, 0.80);

      activeST = tl.scrollTrigger;
    }

    build();

    // Recalculate slot position on resize (slot may reflow on mobile breakpoints)
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 180);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHero = initHero;

})(typeof window !== "undefined" ? window : this);
