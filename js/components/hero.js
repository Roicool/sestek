/*!
 * hero.js v1.2.0
 * Hero — fullscreen video morphs into an inline slot as user scrolls
 * Requires: gsap + ScrollTrigger registered, Sestek.initLenis() already called
 *
 * Optional stats block (inside [data-hero-s2], below [data-hero-desc]):
 *   <div class="hero__stats" data-hero-stats>
 *     <div class="hero__stat" data-hero-stat>
 *       <div class="hero__stat-number" data-count>1,250+</div>
 *       <div class="hero__stat-label">Label</div>
 *     </div>
 *   </div>
 * Stats stagger in at the end of the scroll timeline; numbers roll via
 * Sestek.countUp (count-up.js, optional — write the real value in the HTML).
 * The active stat is circled by a hand-drawn "scribble" ellipse (SVG stroke,
 * created at runtime). On hover the scribble erases itself, jumps to the new
 * stat and redraws around it — sticky: it stays on the last hovered stat.
 * Uses DrawSVGPlugin (gsap 3.13+) when present; falls back to a simple
 * fade + glide when it isn't.
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

    // DrawSVG is optional — without it the scribble skips the draw/erase
    // trick and simply fades + glides like a regular pill.
    var canDraw = typeof DrawSVGPlugin !== "undefined";
    if (canDraw) gsap.registerPlugin(DrawSVGPlugin);

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

    /*
     * Stats "active" scribble — a floating container holding a hand-drawn
     * SVG ellipse that circles whichever stat is active. Hover erases the
     * stroke, jumps the container to the new stat and redraws it (sticky:
     * it stays on the last hovered stat). One stat is always active
     * (index 0 initially); active state is mirrored with the house
     * .is-active class for CSS styling.
     */
    var pill = null;
    var scribble = null; // the <path> inside the pill
    var moveTl = null;   // in-flight erase→jump→redraw sequence
    var activeIndex = 0; // sticky: keeps the last hovered stat active

    /*
     * Hand-drawn ellipse: starts top-right, sweeps around and overshoots
     * its own start — like someone circled the stat with a pen. Stretched
     * onto each stat via preserveAspectRatio="none"; the stroke keeps its
     * width thanks to vector-effect="non-scaling-stroke".
     */
    var SCRIBBLE_D = "M162,12 C193,22 204,48 168,64 C126,82 44,81 15,59 " +
                     "C-9,39 20,10 88,4 C128,0.5 164,5 174,17";

    function movePill(index, immediate) {
      if (!pill) return;
      activeIndex = index;
      var stat = el.stats[index];
      el.stats.forEach(function (s, i) {
        s.classList.toggle("is-active", i === index);
      });
      // offsetLeft/Top are relative to the wrapper (position: relative in CSS)
      var props = {
        x     : stat.offsetLeft,
        y     : stat.offsetTop,
        width : stat.offsetWidth,
        height: stat.offsetHeight,
      };
      if (moveTl) { moveTl.kill(); moveTl = null; }
      if (immediate) {
        // Layout re-syncs (resize, count-up reflow): snap, fully drawn
        gsap.set(pill, props);
        if (canDraw) gsap.set(scribble, { drawSVG: "0% 100%" });
        return;
      }
      if (canDraw) {
        // Erase the pen stroke → jump to the new stat → redraw around it
        moveTl = gsap.timeline();
        moveTl
          .to(scribble, { drawSVG: "100% 100%", duration: 0.22, ease: "power1.in", overwrite: "auto" })
          .set(pill, props)
          .fromTo(scribble,
            { drawSVG: "0% 0%" },
            { drawSVG: "0% 100%", duration: 0.5, ease: "power2.out" });
      } else {
        props.duration = 0.45;
        props.ease = "power3.out";
        props.overwrite = "auto"; // rapid hovers retarget mid-flight cleanly
        gsap.to(pill, props);
      }
    }

    function setupStatsPill() {
      if (!hasStats || el.statsWrap._pillInit) return;
      el.statsWrap._pillInit = true;

      pill = document.createElement("div");
      pill.className = "hero__stat-pill";
      pill.setAttribute("aria-hidden", "true");
      pill.innerHTML =
        '<svg class="hero__stat-scribble" viewBox="0 0 200 80" ' +
        'preserveAspectRatio="none" fill="none">' +
        '<path d="' + SCRIBBLE_D + '" vector-effect="non-scaling-stroke" ' +
        'stroke-linecap="round"/></svg>';
      scribble = pill.querySelector("path");
      el.statsWrap.insertBefore(pill, el.statsWrap.firstChild);

      el.stats.forEach(function (stat, i) {
        stat.addEventListener("mouseenter", function () {
          if (i !== activeIndex) movePill(i); // re-hovering the active stat is a no-op
        });
      });
      // Active state is sticky: it stays on the last hovered stat, so no
      // mouseleave handler — the scribble only moves on the next hover.

      /*
       * The stats row reflows for reasons the pill can't see coming: the
       * video slot collapsing narrows the shrink-to-fit scene wrapper,
       * count-up reserves number widths, fonts load, breakpoints shift.
       * Watching the wrapper + each stat keeps the pill glued to the active
       * stat through ALL of them (any offset change here starts as a size
       * change of one of these boxes).
       */
      if (typeof ResizeObserver !== "undefined") {
        var ro = new ResizeObserver(function () { movePill(activeIndex, true); });
        ro.observe(el.statsWrap);
        el.stats.forEach(function (s) { ro.observe(s); });
      }

      movePill(0, true);
    }

    // Prefers-reduced-motion: skip everything, show scene 2 immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(el.scene2, { opacity: 1 });
      gsap.set(el.words, { opacity: 1, y: 0 });
      if (el.desc) gsap.set(el.desc, { opacity: 1, y: 0 });
      if (hasStats) {
        // Stats + pill appear instantly; numbers keep their final HTML value
        setupStatsPill();
        gsap.set(el.stats, { opacity: 1, y: 0 });
        if (pill) gsap.set(pill, { opacity: 1 });
      }
      el.s1Content.style.pointerEvents = "none";
      el.scene2.style.pointerEvents = "auto";
      return;
    }

    setupStatsPill();

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
      if (hasStats) {
        gsap.set(el.stats, { opacity: 0, y: 24 });
        if (pill) gsap.set(pill, { opacity: 0 });
        // Stats may reflow on resize — re-measure the pill's home position
        movePill(activeIndex, true);
      }
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
                var roll = global.Sestek.countUp(num, { duration: 1.6 });
                // countUp reserves the number's final width (tabular-nums +
                // min-width) synchronously, which reflows the centred stats
                // row — re-measure the pill onto the active stat.
                movePill(activeIndex, true);
                // min-width only stops the row from SHRINKING; intermediate
                // roll values can be wider than the final text, so the row
                // settles once more when the roll lands. Snap-sync so the
                // scribble doesn't erase/redraw on every roll landing.
                if (roll) roll.then(function () { movePill(activeIndex, true); });
              }
            },
          }, sStart + i * sSpace);
        });

        // Scribble appears together with the first (default-active) stat —
        // the ellipse draws itself around it as the user keeps scrolling.
        if (pill) {
          tl.to(pill, { opacity: 1, duration: sDur }, sStart);
          if (canDraw) {
            tl.fromTo(scribble,
              { drawSVG: "0% 0%" },
              { drawSVG: "0% 100%", duration: 0.16, ease: "none" },
              sStart);
          }
        }
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
