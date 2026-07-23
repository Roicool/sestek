/*!
 * card-drop.js v1.3.0
 * Pinned, scroll-driven card reveal — the section pins and its cards drop in
 * from ABOVE, ONE BY ONE, in sync with scroll; then the pin releases. Scrubbed,
 * so scrolling back up reverses the exact same motion — fully reversible.
 *
 * The first card drops the instant the section pins (as you arrive / enter it),
 * so it greets you from the top; cards two and three then drop one after
 * another as you keep scrolling. ALL cards fall the same way — straight down —
 * because the drop happens while the section is PINNED (a fixed frame).
 *
 * Why not drop the first card BEFORE the pin (during the approach)? Two hard
 * constraints kill it: (1) before the pin the section is still scrolling up, so
 * a small downward drop is outrun by the page and reads as coming from BELOW;
 * (2) making it travel far enough to visibly descend sends the card straight
 * THROUGH the header above it. A fixed (pinned) frame is the only way to get a
 * clean, collision-free "from above" — so every card drops while pinned, the
 * first one first.
 *
 * Changelog
 * v1.3.0 — kesin çözüm: tüm kartlar pinli karede yukarıdan düşer, ilki section
 *          oturur oturmaz. Pin ÖNCESİ "yukarıdan" düşüş denendi ve bırakıldı:
 *          ya sayfa kayması yüzünden aşağıdan geliyormuş gibi görünüyor (v1.0),
 *          ya da kart başlığın içinden geçip çakışıyor (v1.2). Pinli kare tek
 *          temiz yol.
 * v1.2.0 — pin öncesi yukarıdan düşüş (başlıkla çakıştı — geri alındı).
 * v1.1.0 — tüm kartlar pinde.
 * v1.0.0 — ilk sürüm (pin öncesi küçük düşüş → aşağıdan görünüyordu).
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
 *   data-cd-end        pin scroll distance          (default "n*75%")
 *   data-cd-scrub      scrub lag in seconds         (default 1)
 *   data-cd-distance   drop distance from above, px (default 90)
 *   data-cd-reveal     per-card reveal length, unit (default 1)
 *   data-cd-gap        hold between cards, units    (default 0.6)
 *   data-cd-scale      optional zoom-settle 0..1    (default 1 = off)
 *   data-cd-ease       ease for the drops           (default "power3.out")
 *   data-cd-priority   ScrollTrigger refreshPriority — set per the page's pin
 *                      stacking order (top pin = highest)       (default 1)
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
    var scrub    = attrNum(root, "data-cd-scrub", 1);
    var distance = attrNum(root, "data-cd-distance", 90);
    var reveal   = attrNum(root, "data-cd-reveal", 1);
    var gap      = attrNum(root, "data-cd-gap", 0.6);
    var scale    = attrNum(root, "data-cd-scale", 1);
    var priority = attrNum(root, "data-cd-priority", 1);
    var ease     = root.getAttribute("data-cd-ease") || "power3.out";
    var endAttr  = root.getAttribute("data-cd-end");

    // ── Reduced motion: final frame, no pin, no scrub ─────────────
    if (reduce) {
      gsap.set(cards, { clearProps: "all" });
      gsap.set(cards, { y: 0, autoAlpha: 1, scale: 1 });
      return;
    }

    var pinTL = null;   // pinned timeline that drops every card

    function build() {
      // Tear down previous timeline before re-measuring.
      if (pinTL) {
        if (pinTL.scrollTrigger) pinTL.scrollTrigger.kill();
        pinTL.kill();
        pinTL = null;
      }

      gsap.set(cards, { clearProps: "all" });

      // Hidden starting frame: every card sits `distance` above its slot, faded.
      var from = { y: -distance, autoAlpha: 0 };
      if (scale !== 1) from.scale = scale;
      gsap.set(cards, from);

      // ── All cards drop from above, one by one, WHILE PINNED ──
      // The pin gives a fixed frame, so every card (the first included) falls
      // straight down into its slot — same motion for all, no "from below",
      // no crossing the header.
      var totalUnits = n * reveal + (n - 1) * gap;   // n drops + gaps between
      var endDist    = endAttr || ("+=" + (n * 75) + "%");

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

      // Card 0 drops first (cursor 0) — it lands right as the section pins, so
      // the frame is populated the moment you arrive. Cards 1..n follow.
      var cursor = 0;
      for (var j = 0; j < n; j++) {
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
