/*!
 * card-marquee.js v2.1.0
 * Two-row, auto-scrolling card marquee for Webflow CMS.
 *   • Infinite loop with ZERO clones — columns recycle (first → last) as they
 *     scroll off, so ~20 CMS items loop seamlessly without duplicating the DOM
 *   • Scrolls via the container's scrollLeft (NOT a CSS transform) so the
 *     card's real 3D flip keeps an intact preserve-3d context
 *   • Per-card depth: [data-card-featured] cards stay bright, others dim
 *   • Tap-to-flip cards (true 3D rotateY) — only cards with a .cardm__back
 *   • Custom floating "flip" cursor over flippable cards (hover/fine pointers)
 *   • Hover (fine-pointer) pauses the scroll; on touch a press freezes it and
 *     releasing/closing the card (or tapping outside it) resumes — so a tap no
 *     longer strands the marquee stopped on devices that never fire mouseleave
 *
 * Why scrollLeft instead of transform:
 *   A moving CSS transform on the track flattens the descendant preserve-3d
 *   context, so rotateY(180deg) renders blank. Driving scrollLeft leaves the
 *   ancestor chain transform-free, so the 3D flip works reliably.
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
 *   data-card-arrange         opt-in auto-stagger so each column pairs one
 *                             aspect with the other, alternating top/bottom —
 *                             no manual CMS sort field needed:
 *                               "alternate" → lead with the first card's aspect
 *                               "5:7"/"1:1" → lead each column's top with that
 *
 * Item attributes (bind to CMS fields):
 *   data-card-featured        "true"/"yes"/"on"/"1" → bright; else dim
 *   data-card-aspect-ratio    "5:7" / "1:1" … — used by data-card-arrange to
 *                             interleave the rows (and handy for CSS sizing)
 *   (flippable is inferred from a .cardm__back element being present —
 *    use Webflow Conditional Visibility so it only renders when desired)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ROWS = 2;                // the grid is two rows → one column = 2 items
  var ASPECT_ATTR = "data-card-aspect-ratio"; // per-card aspect, e.g. "5:7" / "1:1"
  var sharedCursor = null;     // one floating cursor element for the whole page

  /** Truthy-ish CMS values normalise to "featured". */
  function isFeaturedValue(v) {
    if (v == null) return false;
    v = String(v).trim().toLowerCase();
    return v === "true" || v === "yes" || v === "on" || v === "1";
  }

  /**
   * Reorder a flat CMS list so every 2-row column pairs one aspect with the
   * other, alternating which sits on top — without any manual CMS sort field.
   * The grid fills column-by-column (item N→top, N+1→bottom), so emitting the
   * sequence [lead, other, other, lead, lead, other …] yields:
   *   col1 lead/other · col2 other/lead · col3 lead/other …
   * Aspect lives on each card (ASPECT_ATTR), so this stays recycle-safe — the
   * loop later moves whole columns (ROWS items) and never splits a pair.
   *
   * @param track  the .cardm__track grid
   * @param lead   aspect value to place on top of column 1; null → first card's
   */
  function arrangeByAspect(track, lead) {
    var items = Array.from(track.children).filter(function (c) {
      return c.classList && c.classList.contains("cardm__item");
    });
    if (items.length < 2) return;

    // Bucket cards by their aspect value.
    var groups = {};
    items.forEach(function (it) {
      var v = (it.getAttribute(ASPECT_ATTR) || "").trim();
      (groups[v] = groups[v] || []).push(it);
    });
    var keys = Object.keys(groups);
    if (keys.length < 2) return;   // only one aspect present → nothing to alternate

    var a = (lead && groups[lead]) ? lead : keys[0];                 // top of column 1
    var b = keys.filter(function (k) { return k !== a; })[0] || a;   // the other aspect
    var qa = groups[a].slice(), qb = groups[b].slice();

    var ordered = [], col = 0;
    while (qa.length || qb.length) {
      var topQ = (col % 2 === 0) ? qa : qb;   // alternate which aspect leads each column
      var botQ = (col % 2 === 0) ? qb : qa;
      var top = topQ.shift() || botQ.shift(); // fall back to leftovers when a bucket empties
      var bot = botQ.shift() || topQ.shift();
      if (top) ordered.push(top);
      if (bot) ordered.push(bot);
      if (++col > items.length) break;        // never spin forever
    }
    ordered.forEach(function (it) { track.appendChild(it); });
  }

  /** Lazily build the single floating flip-cursor element. */
  function getCursor() {
    if (sharedCursor) return sharedCursor;
    var el = document.createElement("div");
    el.className = "cardm-cursor";
    el.setAttribute("aria-hidden", "true");
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
    // If [data-card-marquee] lands on both an ancestor and a descendant (e.g.
    // the section AND the Collection List inside it), they resolve to the SAME
    // .cardm__track. Initialising both binds duplicate tickers + flip handlers
    // to one set of cards, which double-toggles every flip (open→close in one
    // tap) and leaves the real scroll container stuck paused. Keep only the
    // innermost root of any nested pair.
    roots = roots.filter(function (r) {
      return !roots.some(function (other) { return other !== r && r.contains(other); });
    });
    roots.forEach(setupInstance);
  }

  function setupInstance(root) {
    var track = root.querySelector(".cardm__track");
    if (!track) {
      console.warn("[Sestek CardMarquee] .cardm__track not found.", root);
      return;
    }

    // Idempotent — never re-process the same root…
    if (root._cardMarqueeInit) return;
    root._cardMarqueeInit = true;
    // …and never let two roots drive the same track (belt-and-suspenders for
    // the nested-root case the filter above already prunes).
    if (track._cardmTrackBound) return;
    track._cardmTrackBound = true;

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Opt-in: auto-stagger aspects so columns alternate (no CMS sort) ──
    // data-card-arrange="alternate" → lead with the first card's aspect
    // data-card-arrange="5:7"       → lead each odd column's top with 5:7
    var arrange = root.getAttribute("data-card-arrange");
    if (arrange) {
      arrange = arrange.trim();
      var lead = (arrange === "alternate" || arrange === "true" || arrange === "")
        ? null : arrange;
      arrangeByAspect(track, lead);
    }

    // ── Tag items: depth (featured) + flippable affordance ────────
    Array.from(track.children).forEach(function (item) {
      if (!item.classList.contains("cardm__item")) return;
      if (isFeaturedValue(item.getAttribute("data-card-featured"))) {
        item.classList.add("cardm__item--featured");
      }
      // Flippable = has a back face.
      if (item.querySelector(".cardm__back")) {
        item.setAttribute("data-card-flip", "true");
      }
    });

    // ── Flip handling ─────────────────────────────────────────────
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

    // ── Scroll state — scrollLeft, not transform (keeps 3D intact) ─
    var sp = { v: BASE_SPEED };   // speed proxy, tweened for smooth accel
    var spTween = null;
    function tweenSpeed(target, dur, ease) {
      if (spTween) spTween.kill();
      spTween = gsap.to(sp, { v: target, duration: dur || 0.7, ease: ease || "power3.out" });
    }

    // Hover-pause is a hover-device feature; touch uses press-to-freeze instead.
    var hovering = false;
    function resumeScroll() { tweenSpeed(BASE_SPEED, 1.1, "power3.inOut"); }
    function maybeResume() {
      if (hovering) return;                                       // hover device manages resume
      if (track.querySelector(".cardm__item.is-flipped")) return; // stay paused while a card is open
      resumeScroll();
    }

    // Sub-pixel accumulator so slow speeds still move (scrollLeft is integer).
    var acc = 0;

    /** Gap between columns, read from the grid. */
    function colGap() {
      return parseFloat(getComputedStyle(track).columnGap) || 0;
    }

    /**
     * Recycle the leading column (ROWS items) to the end once it has fully
     * scrolled out of view, pulling scrollLeft back by that column's width so
     * nothing visibly jumps — this is the seamless, clone-free loop.
     */
    function recycleIfNeeded() {
      var safety = 0;
      while (track.children.length > ROWS) {
        var first = track.children[0];
        var colW = first.getBoundingClientRect().width + colGap();
        if (root.scrollLeft < colW) break;        // not off-screen yet
        for (var i = 0; i < ROWS && track.children.length > ROWS; i++) {
          track.appendChild(track.children[0]);    // move first item to the end
        }
        root.scrollLeft -= colW;
        if (++safety > 64) break;                  // never spin forever
      }
    }

    // ── Ticker — advances scrollLeft, then recycles ───────────────
    function tick(time, deltaTime) {
      acc += sp.v * (deltaTime / 1000);
      var whole = Math.trunc(acc);
      if (whole !== 0) {
        acc -= whole;
        root.scrollLeft += whole;
        recycleIfNeeded();
      }
    }
    gsap.ticker.add(tick);

    // ── Custom flip cursor + hover-pause (hover-capable, fine pointers only) ──
    // Gated on `canHover` so synthetic mouse events on touch devices can't set
    // `hovering` and strand the scroll paused (touch resume runs on pointerup).
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
      // Hover pauses the scroll; leaving resumes it and resets any open flip.
      root.addEventListener("mouseenter", function () {
        hovering = true;
        tweenSpeed(0, 0.9, "power3.out");
      });
      root.addEventListener("mouseleave", function () {
        hovering = false;
        resetFlips();
        hideCursor();
        resumeScroll();
      });
      root.addEventListener("mousemove", function (e) {
        if (flippableFrom(e.target)) showCursorAt(e.clientX, e.clientY);
        else hideCursor();
      });
    }

    // ── Tap to flip ───────────────────────────────────────────────
    // Pair pointerdown→pointerup so a tap flips even while the scroll is
    // still easing (native click can be suppressed when the card moves
    // between press and release). A click fallback covers the still case.
    var TAP_SLOP = 12;           // px of pointer travel still counted as a tap
    var downItem = null, downX = 0, downY = 0;
    var lastFlipAt = 0;

    function flipNow(item) {
      lastFlipAt = Date.now();
      toggleFlip(item);
    }

    root.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      downItem = flippableFrom(e.target);
      downX = e.clientX;
      downY = e.clientY;
      if (downItem) {
        if (spTween) spTween.kill();
        sp.v = 0;                          // freeze while a flippable card is pressed
      } else if (track.querySelector(".cardm__item.is-flipped")) {
        resetFlips();                      // tap outside an open card dismisses it
        maybeResume();
      }
    });

    // Releasing (or a cancelled gesture) must always un-freeze the scroll —
    // otherwise the press-to-freeze on touch, where no mouseleave ever fires,
    // would strand the marquee stopped after the very first tap. maybeResume()
    // keeps it paused only while a card stays flipped open or a real hover is active.
    function endPress(flipIt, e) {
      if (!downItem) return;
      var item = downItem;
      downItem = null;
      if (flipIt) {
        var moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moved <= TAP_SLOP) flipNow(item);   // a tap (not a drag) flips
      }
      maybeResume();
    }

    root.addEventListener("pointerup", function (e) { endPress(true, e); });
    root.addEventListener("pointercancel", function (e) { endPress(false, e); });

    root.addEventListener("click", function (e) {
      if (Date.now() - lastFlipAt < 400) return;   // avoid double-toggle
      var item = flippableFrom(e.target);
      if (item) { flipNow(item); maybeResume(); }
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
