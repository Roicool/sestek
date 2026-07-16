/*!
 * hero.js v1.7.0
 * Hero — fullscreen video morphs into an inline slot as user scrolls
 * Requires: gsap + ScrollTrigger registered, Sestek.initLenis() already called
 *
 * Optional stats block (inside [data-hero-s2], below [data-hero-desc]):
 *   <div class="hero__stats" data-hero-stats>
 *     <div class="hero__stat" data-hero-stat>
 *       <div data-hero-stat-media><img …></div>   ← absolute bg image (optional)
 *       <div data-hero-stat-overlay></div>        ← absolute overlay  (optional)
 *       <div class="hero__stat-number" data-count>1,250+</div>
 *       <div class="hero__stat-label">Label</div>
 *     </div>
 *   </div>
 * Stats stagger in at the end of the scroll timeline; numbers roll via
 * Sestek.countUp (count-up.js, optional — write the real value in the HTML).
 * Cards with [data-hero-stat-media] get a cursor-origin reveal: the image
 * blooms out of the exact point where the pointer entered the card
 * (clip-path circle) while settling from a slow zoom; on leave it drains
 * back into the exit point. The card gets .is-hover (text → white via CSS).
 * While ANY card is hovered the scene goes dark: a runtime "stage" layer
 * fades in over [data-hero-s2] (GSAP opacity — smoother than a CSS
 * background-color flip) and .is-dark restyles texts/cards via CSS. The
 * stage only lifts 6s after the mouse leaves the whole stats row.
 * No plugins needed beyond gsap + ScrollTrigger.
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
      statsWrap : hero.querySelector("[data-hero-stats]"),
      stats     : Array.from(hero.querySelectorAll("[data-hero-stat]")),
    };

    // Bail if any critical element is missing (desc and stats are optional)
    var required = ["videoWrap", "overlay", "s1Content", "scene2", "words", "slot"];
    var missing = required.filter(function (k) {
      return !el[k] || (Array.isArray(el[k]) && !el[k].length);
    });
    if (missing.length) {
      console.warn("[Sestek Hero] Missing elements:", missing.join(", ")); return;
    }

    var hasStats = !!(el.statsWrap && el.stats.length);
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * Stat-card hover reveal — cursor-origin bloom. For cards carrying an
     * absolute background image ([data-hero-stat-media]) and an optional
     * overlay ([data-hero-stat-overlay]). The image is clipped to a
     * zero-radius circle; on hover the circle blooms open FROM THE EXACT
     * POINT the pointer entered the card while the image settles from a
     * slow zoom (expo.out). On leave it drains back into the exit point.
     * Because the reveal literally grows out of your own gesture, every
     * hover feels bespoke — no two entries look the same.
     *
     * Scene mood: while ANY card is hovered the scene goes dark — a
     * runtime stage layer fades in behind the content (GSAP opacity on a
     * composited layer: one smooth crossfade instead of a repainting CSS
     * background-color) and .is-dark on [data-hero-s2] restyles texts and
     * card surfaces via CSS. The stage lifts only 6 seconds AFTER the
     * mouse leaves the whole stats row — re-entering within that window
     * cancels the revert.
     */
    var darkTimer = null;
    var stage = null;

    function setSceneDark(on) {
      el.scene2.classList.toggle("is-dark", on);
      if (!stage) return;
      if (reduceMotion) {
        gsap.set(stage, { opacity: on ? 1 : 0 });
      } else {
        gsap.to(stage, {
          opacity: on ? 1 : 0,
          duration: 0.9,
          ease: "power2.inOut",
          overwrite: "auto",
        });
      }
    }

    /** % point where the pointer crossed the card's edge, clamped to it */
    function pointerPct(stat, e) {
      var r = stat.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
        y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
      };
    }

    function setupStatCards() {
      // Darkness lives on its own composited layer behind the content
      stage = document.createElement("div");
      stage.className = "hero__stage";
      stage.setAttribute("aria-hidden", "true");
      el.scene2.insertBefore(stage, el.scene2.firstChild);

      el.stats.forEach(function (stat) {
        var media = stat.querySelector("[data-hero-stat-media]");
        if (!media || stat._cardInit) return;
        stat._cardInit = true;
        var overlay = stat.querySelector("[data-hero-stat-overlay]");

        stat.addEventListener("mouseenter", function (e) {
          if (darkTimer) { darkTimer.kill(); darkTimer = null; }
          setSceneDark(true);
          stat.classList.add("is-hover");

          if (reduceMotion) {
            gsap.set(media, { clipPath: "circle(142% at 50% 50%)", scale: 1 });
            if (overlay) gsap.set(overlay, { opacity: 1 });
            return;
          }

          var p = pointerPct(stat, e);
          if (stat._reveal) stat._reveal.kill();
          var tl = gsap.timeline();
          tl.fromTo(media,
            { clipPath: "circle(0% at " + p.x + "% " + p.y + "%)", scale: 1.18 },
            {
              clipPath: "circle(142% at " + p.x + "% " + p.y + "%)",
              duration: 0.75,
              ease: "power2.out",
            }, 0)
            .to(media, { scale: 1, duration: 1.1, ease: "expo.out" }, 0);
          if (overlay) {
            tl.fromTo(overlay,
              { opacity: 0 },
              { opacity: 1, duration: 0.35, ease: "power2.out" }, 0.2);
          }
          stat._reveal = tl;
        });

        stat.addEventListener("mouseleave", function (e) {
          stat.classList.remove("is-hover");

          if (reduceMotion) {
            gsap.set(media, { clipPath: "circle(0% at 50% 50%)" });
            if (overlay) gsap.set(overlay, { opacity: 0 });
            return;
          }

          var p = pointerPct(stat, e);
          if (stat._reveal) stat._reveal.kill();
          var tl = gsap.timeline();
          tl.to(media, {
            clipPath: "circle(0% at " + p.x + "% " + p.y + "%)",
            duration: 0.45,
            ease: "power2.in",
          }, 0);
          if (overlay) {
            tl.to(overlay, { opacity: 0, duration: 0.3 }, 0);
          }
          stat._reveal = tl;
        });
      });

      // The dark stage lifts 6s after the mouse leaves the entire stats row
      el.statsWrap.addEventListener("mouseleave", function () {
        if (darkTimer) darkTimer.kill();
        darkTimer = gsap.delayedCall(6, function () {
          setSceneDark(false);
          darkTimer = null;
        });
      });
    }

    if (hasStats) setupStatCards();

    // Prefers-reduced-motion: skip everything, show scene 2 immediately
    if (reduceMotion) {
      gsap.set(el.scene2, { opacity: 1 });
      gsap.set(el.words, { opacity: 1, y: 0 });
      if (el.desc) gsap.set(el.desc, { opacity: 1, y: 0 });
      // Stats appear instantly; numbers keep their final HTML value
      if (hasStats) gsap.set(el.stats, { opacity: 1, y: 0 });
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
      if (hasStats) gsap.set(el.stats, { opacity: 0, y: 24 });
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

      // ── Phase 9 (0.78 – 1.00): Stats stagger in ──────────────────
      /*
       * Spacing is computed from the stat count so the LAST stat always
       * lands exactly at 1.0 — never past it. A position beyond 1.0 would
       * extend the timeline's total duration and rescale every existing
       * phase against the scroll distance (which must stay untouched).
       */
      if (hasStats) {
        var sDur   = 0.10;
        var sStart = 0.78;
        var sSpace = el.stats.length > 1
          ? (1.0 - sStart - sDur) / (el.stats.length - 1)
          : 0;

        el.stats.forEach(function (stat, i) {
          tl.to(stat, {
            opacity : 1,
            y       : 0,
            ease    : "power3.out",
            duration: sDur,
            onStart : function () {
              /*
               * Numbers roll via count-up.js the moment the stat starts
               * revealing. The element is already in the viewport (hero is
               * pinned) so countUp's own ScrollTrigger fires instantly;
               * its _countUpInit flag keeps scrubbing back/forth from
               * re-initialising. Counts once, then stays (count-up default).
               */
              var num = stat.querySelector("[data-count]");
              if (num && global.Sestek.countUp) {
                global.Sestek.countUp(num, { duration: 1.6 });
              }
            },
          }, sStart + i * sSpace);
        });
      }

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
