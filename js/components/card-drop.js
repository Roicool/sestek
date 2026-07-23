/*!
 * card-drop.js v1.0.0
 * Pinned, scroll-driven card reveal — the section pins and its cards drop in
 * from ABOVE, ONE BY ONE, in sync with scroll; then the pin releases and the
 * page scrolls on. Everything is scrubbed, so scrolling back up reverses the
 * exact same motion — no direction logic, fully reversible.
 *
 * The FIRST card lands during the APPROACH (while the section is still
 * scrolling up into view), so the instant the section pins it is NEVER empty —
 * that "arriving card" lead-in is the whole point. The remaining cards then
 * drop in on the pinned timeline, one after another.
 *
 * Two ScrollTriggers, one section:
 *   • intro (NOT pinned): drives card 0 in over the approach window — from
 *     data-cd-intro-start until the section reaches the pin point ("top top").
 *     Its refreshPriority sits one BELOW the pin so it measures against the
 *     post-pin document height (see PROJECT.md "Pinli Bölüm Kuralları").
 *   • pin: cards 1..n drop in sequentially while the section is pinned.
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.util (js/core/utils.js).
 * CSS      : css/components/card-drop.css  (min-height:100svh on the root so the
 *            pinned frame fills the viewport; will-change on the cards).
 *
 * PIN CAVEAT (PROJECT.md Kural 3): no ANCESTOR of [data-card-drop] may carry
 * transform / filter / perspective / will-change:transform — it breaks the
 * pin's position:fixed. Watch Webflow page-wrapper styles.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-card-drop]                 root — THIS pins. Give it min-height:100svh.
 *     … your header (title / subtitle) — stays put, NOT animated …
 *     [data-cd-card]                 one card — DOM order = drop order. Keep the
 *                                    cards in a grid/flex row so hidden ones
 *                                    still reserve their cell (autoAlpha keeps
 *                                    layout → zero reflow as they pop in).
 *
 * Root attributes (all optional):
 *   data-cd-end          pin scroll distance         (default "(n-1)*80%")
 *   data-cd-scrub        scrub lag in seconds        (default 1)
 *   data-cd-distance     drop distance from above, px(default 90)
 *   data-cd-reveal       per-card reveal length,unit (default 1)
 *   data-cd-gap          hold between cards, units   (default 0.6)
 *   data-cd-scale        optional zoom-settle 0..1   (default 1 = off)
 *   data-cd-ease         ease for the drops          (default "power3.out")
 *   data-cd-intro-start  intro trigger start         (default "top 85%")
 *   data-cd-intro        "false" → card 0 is STATIC at pin (no approach reveal)
 *   data-cd-priority     ScrollTrigger refreshPriority — set per the page's pin
 *                        stacking order (top pin = highest)      (default 1)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function buildOne(root) {
    if (root._cardDropInit) return;                         // idempotent
    root._cardDropInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var reduce = util.prefersReducedMotion();
    var toArray = gsap.utils.toArray;

    var cards = toArray(root.querySelectorAll("[data-cd-card]"));
    if (!cards.length) {
      console.warn("[Sestek CardDrop] Need at least one [data-cd-card].");
      return;
    }
    var n = cards.length;

    // ── Config from data-attributes ───────────────────────────────
    var scrub      = attrNum(root, "data-cd-scrub", 1);
    var distance   = attrNum(root, "data-cd-distance", 90);
    var reveal     = attrNum(root, "data-cd-reveal", 1);
    var gap        = attrNum(root, "data-cd-gap", 0.6);
    var scale      = attrNum(root, "data-cd-scale", 1);
    var priority   = attrNum(root, "data-cd-priority", 1);
    var ease       = root.getAttribute("data-cd-ease") || "power3.out";
    var introStart = root.getAttribute("data-cd-intro-start") || "top 85%";
    var introOn    = root.getAttribute("data-cd-intro") !== "false";
    var endAttr    = root.getAttribute("data-cd-end");

    // ── Reduced motion: final frame, no pin, no scrub ─────────────
    if (reduce) {
      gsap.set(cards, { clearProps: "all" });
      gsap.set(cards, { y: 0, autoAlpha: 1, scale: 1 });
      return;
    }

    var introST = null;   // approach trigger for card 0
    var pinTL   = null;   // pinned timeline for cards 1..n-1

    /** Hidden starting frame: every card sits above its slot, faded out. */
    function setInitial() {
      var from = { y: -distance, autoAlpha: 0 };
      if (scale !== 1) from.scale = scale;
      gsap.set(cards, from);
    }

    function build() {
      // Tear down previous triggers/timelines before re-measuring.
      if (introST) { introST.kill(); introST = null; }
      if (pinTL) {
        if (pinTL.scrollTrigger) pinTL.scrollTrigger.kill();
        pinTL.kill();
        pinTL = null;
      }

      gsap.set(cards, { clearProps: "all" });
      setInitial();

      // ── Card 0: arrive during the approach, or sit static at the pin ──
      if (introOn) {
        var introTo = { y: 0, autoAlpha: 1, ease: ease, overwrite: true };
        if (scale !== 1) introTo.scale = 1;
        introTo.scrollTrigger = {
          trigger: root,
          start: introStart,
          end: "top top",             // lands exactly as the pin engages
          scrub: scrub,
          // One below the pin so the pin adds its spacing FIRST, then this
          // (non-pinning) trigger measures against the real document height.
          refreshPriority: priority - 1,
        };
        introST = gsap.to(cards[0], introTo).scrollTrigger;
      } else {
        gsap.set(cards[0], { y: 0, autoAlpha: 1, scale: 1 });
      }

      // ── Cards 1..n-1: drop in one by one on the pinned timeline ──
      // With a single card there is nothing left to pin for — the approach
      // reveal (or the static set above) is the whole animation.
      if (n < 2) return;

      var revealCount = n - 1;
      var totalUnits  = revealCount * (reveal + gap);   // trailing gap = release margin
      var endDist     = endAttr || ("+=" + (revealCount * 80) + "%");

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: endDist,
          pin: true,
          scrub: scrub,
          anticipatePin: 1,
          // Pins add huge pin-spacing to the document. This priority orders the
          // refresh so sections ABOVE (higher priority) resolve first and those
          // BELOW measure against the post-pin height. See PROJECT.md Kural 1.
          refreshPriority: priority,
        },
      });

      var cursor = 0;
      for (var j = 1; j < n; j++) {
        var cardTo = { y: 0, autoAlpha: 1, ease: ease, duration: reveal };
        if (scale !== 1) cardTo.scale = 1;
        tl.to(cards[j], cardTo, cursor);
        cursor += reveal + gap;
      }

      // Pad the timeline so the last card's trailing gap is real scroll — the
      // final card is fully landed before the pin can release.
      if (tl.duration() < totalUnits) {
        tl.to({}, { duration: totalUnits - tl.duration() });
      }

      pinTL = tl;
    }

    build();

    // Rebuild on resize — the pin's spacing changes with the layout, which
    // shifts every trigger below it; refresh so they all re-measure.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    });
  }

  /**
   * Initializes every card-drop section on the page in one call.
   * @param {string} [selector="[data-card-drop]"] narrow the scope if needed
   */
  function initCardDrop(selector) {
    // Tolerate late-loading libraries (async/defer order): poll gsap +
    // ScrollTrigger for up to ~4s before giving up.
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
          clearInterval(poll);
          initCardDrop(selector);
        } else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek CardDrop] gsap + ScrollTrigger required — " +
            "load gsap.min.js AND ScrollTrigger.min.js before this script. Missing: " +
            (typeof gsap === "undefined" ? "gsap " : "") +
            (typeof ScrollTrigger === "undefined" ? "ScrollTrigger" : ""));
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek CardDrop] Sestek.util (js/core/utils.js) required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var roots = document.querySelectorAll(selector || "[data-card-drop]");
    if (!roots.length) { console.warn("[Sestek CardDrop] No [data-card-drop] found."); return; }
    roots.forEach(buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCardDrop = initCardDrop;

})(typeof window !== "undefined" ? window : this);
