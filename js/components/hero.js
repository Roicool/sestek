/*!
 * hero.js v1.0.3
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
    if (hero._heroInit) return;                           // idempotent — no duplicate triggers
    hero._heroInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek Hero] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var el = {
      videoWrap : hero.querySelector("[data-hero-video-wrap]"),
      overlay   : hero.querySelector(".hero__video-overlay"),
      s1Content : hero.querySelector("[data-hero-s1-content]"),
      scene2    : hero.querySelector("[data-hero-s2]"),
      words     : Array.from(hero.querySelectorAll("[data-hero-word]")),
      slot      : hero.querySelector("[data-hero-video-slot]"),
      desc      : hero.querySelector("[data-hero-desc]"),
    };

    // Bail if any critical element is missing (desc is optional)
    var required = ["videoWrap", "overlay", "s1Content", "scene2", "words", "slot"];
    var missing = required.filter(function (k) {
      return !el[k] || (Array.isArray(el[k]) && !el[k].length);
    });
    if (missing.length) {
      console.warn("[Sestek Hero] Missing elements:", missing.join(", ")); return;
    }

    // Prefers-reduced-motion: skip everything, show scene 2 immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el.scene2, { opacity: 1 });
      gsap.set(el.words, { opacity: 1, y: 0 });
      if (el.desc) gsap.set(el.desc, { opacity: 1, y: 0 });
      el.s1Content.style.pointerEvents = "none";
      el.scene2.style.pointerEvents = "auto";
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

      /*
       * scale() transform border-radius'ı da küçültür.
       * Görsel olarak 8px görünmesi için CSS değerini scale'e bölerek telafi ediyoruz.
       */
      var finalBorderRadius = Math.round(8 / Math.min(targetScaleX, targetScaleY));

      // Hard-reset before re-building so resize doesn't leave stale values
      gsap.set(el.videoWrap, { scaleX: 1, scaleY: 1, x: 0, y: 0, opacity: 1, borderRadius: 0 });
      gsap.set(el.overlay,   { opacity: 1 });
      gsap.set(el.s1Content, { opacity: 1, y: 0 });
      gsap.set(el.scene2,    { opacity: 0 });
      // Only one scene should ever be clickable/focusable at a time — the
      // invisible one must not intercept clicks or steal tab focus from
      // whichever scene is actually on screen.
      el.s1Content.style.pointerEvents = "auto";
      el.scene2.style.pointerEvents = "none";
      gsap.set(el.words,     { opacity: 0, y: 40 });
      if (el.desc) gsap.set(el.desc, { opacity: 0, y: 20 });
      gsap.set(el.slot, { width: "7rem", opacity: 1 });

      var navEl = document.querySelector("[data-nav]");

      var tl = gsap.timeline({
        defaults: { ease: "none" }, // scrub handles timing; per-tween eases override this
        scrollTrigger: {
          trigger    : hero,
          start      : "top top",
          end        : "+=250%",  // 2.5× viewport of scroll distance
          pin        : true,
          scrub      : 1,         // 1s lag behind scroll — feels heavy/premium
          anticipatePin: 1,
          // Hero sits at the very top of the page, so its pin must refresh
          // BEFORE any pin below it (scroll-tabs = 1, reveals = -1). Higher
          // priority refreshes first → hero adds its pin-spacing, then the
          // sections below measure their start/end against the real, post-pin
          // document height instead of overlapping the pinned hero.
          refreshPriority: 2,
          onUpdate: function (self) {
            var inScene2 = self.progress >= 0.34;
            // Nav theme
            if (navEl) navEl.classList.toggle("nav--on-light", inScene2);
            // Exactly one scene is interactive at a time — the other gets
            // pointer-events:none so its (invisible) buttons/links can't be
            // clicked or tabbed into while off-screen.
            el.s1Content.style.pointerEvents = inScene2 ? "none" : "auto";
            el.scene2.style.pointerEvents    = inScene2 ? "auto" : "none";
          },
          onLeaveBack: function () {
            // Scrolled back above hero entirely — restore dark nav + scene 1 clicks
            if (navEl) navEl.classList.remove("nav--on-light");
            el.s1Content.style.pointerEvents = "auto";
            el.scene2.style.pointerEvents    = "none";
          },
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
        borderRadius: finalBorderRadius + "px",
        ease        : "power2.inOut",
        duration    : 0.48,
      }, 0.16);

      // ── Phase 4 (0.34 – 0.46): Scene 2 fades in ─────────────────
      tl.to(el.scene2, {
        opacity : 1,
        duration: 0.12,
      }, 0.34);

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

      // ── Phase 6 (0.74 – 0.86): Description fades in ─────────────
      if (el.desc) {
        tl.to(el.desc, {
          opacity : 1,
          y       : 0,
          ease    : "power3.out",
          duration: 0.12,
        }, 0.74);
      }

      // ── Phase 7 (0.80 – 0.88): Video fades from slot ─────────────
      tl.to(el.videoWrap, {
        opacity : 0,
        duration: 0.08,
      }, 0.80);

      // ── Phase 8 (0.86 – 0.96): Slot collapses, last word shifts left ─
      tl.to(el.slot, {
        width   : 0,
        opacity : 0,
        ease    : "power2.inOut",
        duration: 0.10,
      }, 0.86);

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
