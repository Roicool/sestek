/*!
 * card-marquee.js v1.2.0
 * Two-row, scroll-driven card marquee for Webflow CMS.
 *   • Seamless infinite loop (GSAP ticker) — auto-scroll, hover-pause
 *   • Per-card depth: [data-card-featured] cards stay bright, others dim
 *   • Tap-to-flip cards (cross-fade) — only cards that have a .cardm__back
 *   • Custom floating "flip" cursor over flippable cards (hover/fine pointers)
 *   • Open flips auto-reset when the marquee resumes (mouse leaves)
 *
 * Changelog
 * v1.2.0 — flip rewritten as a 2D-safe cross-fade (CSS). A true preserve-3d
 *          flip blanked out here because the moving track is transformed and
 *          .cardm clips with overflow:hidden — both kill the 3D context.
 *          Removed debug logging.
 * v1.1.3 — robust tap: pointerup + click fallback (double-toggle guarded),
 *          touch-action:manipulation, explicit pointer-events on faces
 * v1.1.2 — flip the PRESSED card (not the up-target) + stop track on press,
 *          so a tap reliably flips even while the marquee is still easing
 * v1.1.1 — flip via pointerdown→up pairing (native click was suppressed while
 *          the track was still gliding); guard against double-init re-cloning
 * v1.1.0 — removed drag/grab entirely; auto-scroll + hover-pause + click-flip
 *          only (drag interfered with reliable click-to-flip)
 * v1.0.1 — (superseded) deferred pointer capture until drag slop
 * v1.0.0 — initial release
 *
 * Requires : gsap (global)
 * CSS      : css/components/card-marquee.css
 *
 * DOM (Webflow CMS — Collection List Wrapper > Collection List > Item):
 *   [data-card-marquee]                section root        (.cardm)
 *     .cardm__track                    Collection List     (the 2-row grid)
 *       .cardm__item                   Collection Item
 *         .cardm__inner                3D flip container
 *           .cardm__front              always shown (logo + stat)
 *           .cardm__back               optional — presence = "flippable"
 *
 * Root attributes:
 *   data-card-marquee-speed   px/sec auto-scroll          (default 50)
 *
 * Item attributes (bind to CMS fields):
 *   data-card-featured        "true"/"yes"/"on"/"1" → bright; else dim
 *   (flippable is inferred from a .cardm__back element being present —
 *    use Webflow Conditional Visibility so it only renders when desired)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var sharedCursor = null;     // one floating cursor element for the whole page

  /** Truthy-ish CMS values normalise to "featured". */
  function isFeaturedValue(v) {
    if (v == null) return false;
    v = String(v).trim().toLowerCase();
    return v === "true" || v === "yes" || v === "on" || v === "1";
  }

  /** Lazily build the single floating flip-cursor element. */
  function getCursor() {
    if (sharedCursor) return sharedCursor;
    var el = document.createElement("div");
    el.className = "cardm-cursor";
    el.setAttribute("aria-hidden", "true");
    // Refresh/rotate glyph — reads as "this card flips".
    el.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>';
    document.body.appendChild(el);
    sharedCursor = el;
    return el;
  }

  /** Initialise every [data-card-marquee] on the page. */
  function initCardMarquee(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek CardMarquee] GSAP required.");
      return;
    }
    var roots = Array.from(document.querySelectorAll(selector || "[data-card-marquee]"));
    if (!roots.length) return;
    roots.forEach(setupInstance);
  }

  function setupInstance(root) {
    var track = root.querySelector(".cardm__track");
    if (!track) {
      console.warn("[Sestek CardMarquee] .cardm__track not found.", root);
      return;
    }

    // Guard against double-init on the same root (would re-clone the track).
    if (root._cardMarqueeInit) return;
    root._cardMarqueeInit = true;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Tag items: depth (featured) + flippable affordance ────────
    function tagItems() {
      Array.from(track.children).forEach(function (item) {
        if (!item.classList.contains("cardm__item")) return;
        if (isFeaturedValue(item.getAttribute("data-card-featured"))) {
          item.classList.add("cardm__item--featured");
        }
        // Flippable = has a back face. Mark it so CSS/cursor can target it.
        if (item.querySelector(".cardm__back")) {
          item.setAttribute("data-card-flip", "true");
        }
      });
    }
    tagItems();

    // ── Flip handling (click to toggle; reset when scroll resumes) ─
    function flippableFrom(node) {
      var item = node && node.closest ? node.closest(".cardm__item") : null;
      return item && item.hasAttribute("data-card-flip") ? item : null;
    }

    function resetFlips() {
      Array.from(track.querySelectorAll(".cardm__item.is-flipped"))
        .forEach(function (el) { el.classList.remove("is-flipped"); });
    }

    function toggleFlip(item) {
      var willOpen = !item.classList.contains("is-flipped");
      resetFlips();                       // single card open at a time
      if (willOpen) item.classList.add("is-flipped");
    }

    // Reduced motion: static cards, click-to-flip only, no scroll/cursor.
    if (reduce) {
      root.addEventListener("click", function (e) {
        var item = flippableFrom(e.target);
        if (item) toggleFlip(item);
      });
      return;
    }

    var BASE_SPEED = parseFloat(root.dataset.cardMarqueeSpeed) || 50; // px/s

    // ── Seamless loop: clone into an EVEN repeat unit, then duplicate
    //    A 2-row grid only tiles cleanly when the repeat unit has an even
    //    item count. If the CMS list is odd, the unit is doubled (2n, even).
    function cloneItem(el) {
      var c = el.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      c.classList.remove("is-flipped");
      return c;
    }

    var originals = Array.from(track.children);
    var n = originals.length;
    var unitCount = (n % 2 === 0) ? n : n * 2;

    // Grow the repeat unit to unitCount items…
    for (var u = track.children.length; u < unitCount; u++) {
      track.appendChild(cloneItem(originals[u % n]));
    }
    // …then append one full duplicate of the unit for the loop.
    Array.from(track.children).forEach(function (el) {
      track.appendChild(cloneItem(el));
    });
    tagItems(); // re-tag so clones get featured/flip markers too

    // ── Measure one seamless cycle (= half of the doubled track) ──
    function measureTrack() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return (track.scrollWidth + gap) / 2;
    }
    var trackW = measureTrack();

    // Re-measure once images finish (logos affect column widths)
    var pendingImgs = Array.from(track.querySelectorAll("img")).filter(function (img) {
      return !img.complete;
    });
    if (pendingImgs.length) {
      var done = 0;
      var onImg = function () { if (++done === pendingImgs.length) trackW = measureTrack(); };
      pendingImgs.forEach(function (img) {
        img.addEventListener("load", onImg);
        img.addEventListener("error", onImg);
      });
    }

    // ── State ─────────────────────────────────────────────────────
    var pos = 0;
    var sp = { v: BASE_SPEED };   // speed proxy, tweened for smooth accel
    var spTween = null;
    function tweenSpeed(target, dur, ease) {
      if (spTween) spTween.kill();
      spTween = gsap.to(sp, { v: target, duration: dur || 0.7, ease: ease || "power3.out" });
    }

    // ── Ticker — the only thing that moves the track ──────────────
    function tick(time, deltaTime) {
      pos += sp.v * (deltaTime / 1000);
      if (pos > trackW * 1e6) pos -= trackW * Math.floor(pos / trackW);
      var wrapped = ((pos % trackW) + trackW) % trackW;
      gsap.set(track, { x: -wrapped, force3D: true });
    }
    gsap.ticker.add(tick);

    // ── Hover: pause scroll + reset open flips on leave ───────────
    root.addEventListener("mouseenter", function () {
      tweenSpeed(0, 0.9, "power3.out");
    });
    root.addEventListener("mouseleave", function () {
      tweenSpeed(BASE_SPEED, 1.1, "power3.inOut");
      resetFlips();
      hideCursor();
    });

    // ── Custom flip cursor (only on hover-capable, fine pointers) ─
    var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    function showCursorAt(x, y) {
      var c = getCursor();
      c.style.transform = "translate(" + x + "px," + y + "px)";
      c.classList.add("is-visible");
      root.classList.add("is-flip-hover");
    }
    function hideCursor() {
      if (sharedCursor) sharedCursor.classList.remove("is-visible");
      root.classList.remove("is-flip-hover");
    }
    if (canHover) {
      root.addEventListener("mousemove", function (e) {
        if (flippableFrom(e.target)) showCursorAt(e.clientX, e.clientY);
        else hideCursor();
      });
    }

    // ── Tap to flip ───────────────────────────────────────────────
    // Native "click" can't be trusted on its own: the track is still gliding
    // when the pointer lands (hover-pause eases over ~0.9s), so mousedown and
    // mouseup fall on different pixels and the browser suppresses click.
    // We pair pointerdown→pointerup ourselves (small travel = a tap → flip),
    // and keep a click fallback for the case where the track is already still.
    var TAP_SLOP = 12;           // px of pointer travel still counted as a tap
    var downItem = null, downX = 0, downY = 0;
    var lastFlipAt = 0;          // guards against pointerup + click double-toggle

    function flipNow(item) {
      lastFlipAt = Date.now();
      toggleFlip(item);
    }

    root.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      downItem = flippableFrom(e.target);
      downX = e.clientX;
      downY = e.clientY;
      // Stop the track instantly so the pressed card stays put. (Without this
      // the card slides out from under the cursor before pointerup.)
      if (downItem) { if (spTween) spTween.kill(); sp.v = 0; }
    });

    root.addEventListener("pointerup", function (e) {
      if (!downItem) return;
      var moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved <= TAP_SLOP) flipNow(downItem);
      downItem = null;
    });

    // Fallback: when the track is already stationary a clean click fires
    // normally. Skip if a pointerup flip just ran (≤400ms) so the same tap
    // isn't toggled twice.
    root.addEventListener("click", function (e) {
      if (Date.now() - lastFlipAt < 400) return;
      var item = flippableFrom(e.target);
      if (item) flipNow(item);
    });

    // ── Resize ────────────────────────────────────────────────────
    var rTimer;
    window.addEventListener("resize", function () {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () { trackW = measureTrack(); }, 150);
    });

    // ── Cleanup ───────────────────────────────────────────────────
    root._cardMarqueeDestroy = function () {
      gsap.ticker.remove(tick);
      if (spTween) spTween.kill();
    };
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCardMarquee = initCardMarquee;

})(typeof window !== "undefined" ? window : this);
