/*!
 * card-marquee.js v1.0.1
 * Two-row, scroll-driven card marquee for Webflow CMS.
 *
 * Changelog
 * v1.0.1 — fix "grab sticks on click": pointer is captured only after the
 *          drag slop is exceeded, not on press; flip uses the press target.
 * v1.0.0 — initial release
 *   • Seamless infinite loop (GSAP ticker) — drag + momentum + hover-pause
 *   • Per-card depth: [data-card-featured] cards stay bright, others dim
 *   • Click-to-flip cards (3D rotateY) — only cards that have a .cardm__back
 *   • Custom floating "flip" cursor over flippable cards (hover/fine pointers)
 *   • Open flips auto-reset when the marquee resumes (mouse leaves)
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

  var CLICK_SLOP = 6;          // px of movement below which a press = a click
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
    var isDown = false;          // pointer pressed (may become a drag or a click)
    var isDragging = false;      // movement passed the slop → true drag
    var dragStartX = 0, dragStartY = 0, dragStartPos = 0;
    var movedDist = 0;
    var pressTarget = null;      // element under the press — used for flip on click
    var activePointerId = null;
    var ptrVelocity = 0, lastPtrX = 0, lastPtrTime = 0;

    var sp = { v: BASE_SPEED };   // speed proxy, tweened for smooth accel
    var spTween = null;
    function tweenSpeed(target, dur, ease) {
      if (spTween) spTween.kill();
      spTween = gsap.to(sp, { v: target, duration: dur || 0.7, ease: ease || "power3.out" });
    }

    // ── Ticker — the only thing that moves the track ──────────────
    function tick(time, deltaTime) {
      if (!isDown) {
        pos += sp.v * (deltaTime / 1000);
        if (pos > trackW * 1e6) pos -= trackW * Math.floor(pos / trackW);
      }
      var wrapped = ((pos % trackW) + trackW) % trackW;
      gsap.set(track, { x: -wrapped, force3D: true });
    }
    gsap.ticker.add(tick);

    // ── Hover: pause scroll + reset open flips on leave ───────────
    root.addEventListener("mouseenter", function () {
      if (!isDown) tweenSpeed(0, 0.9, "power3.out");
    });
    root.addEventListener("mouseleave", function () {
      if (!isDown) tweenSpeed(BASE_SPEED, 1.1, "power3.inOut");
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
        if (isDown) { hideCursor(); return; }
        if (flippableFrom(e.target)) showCursorAt(e.clientX, e.clientY);
        else hideCursor();
      });
    }

    // ── Press → (click | drag) ────────────────────────────────────
    // Pointer is NOT captured on press — capturing immediately makes a plain
    // click "stick" (grab cursor latches, pointerup retargets to root). We
    // only capture once movement passes the slop, i.e. it's a genuine drag.
    root.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (spTween) spTween.kill();
      sp.v = 0;
      isDown          = true;
      isDragging      = false;
      movedDist       = 0;
      pressTarget     = e.target;        // remember what was pressed (for flip)
      activePointerId = e.pointerId;
      dragStartX      = e.clientX;
      dragStartY      = e.clientY;
      dragStartPos    = pos;
      lastPtrX        = e.clientX;
      lastPtrTime     = performance.now();
      ptrVelocity     = 0;
    });

    root.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var now = performance.now();
      var dt = now - lastPtrTime;
      if (dt > 0) ptrVelocity = (lastPtrX - e.clientX) / dt * 1000;
      lastPtrX = e.clientX;
      lastPtrTime = now;

      var dx = e.clientX - dragStartX;
      var dy = e.clientY - dragStartY;
      movedDist = Math.max(movedDist, Math.sqrt(dx * dx + dy * dy));

      // Promote to a real drag only after the slop is exceeded.
      if (!isDragging && movedDist >= CLICK_SLOP) {
        isDragging = true;
        root.classList.add("is-dragging");
        hideCursor();
        if (root.setPointerCapture) root.setPointerCapture(e.pointerId);
      }

      if (isDragging) pos = dragStartPos + (dragStartX - e.clientX);
    });

    root.addEventListener("pointerup", releaseDrag);
    root.addEventListener("pointercancel", releaseDrag);

    function releaseDrag(e) {
      if (!isDown) return;
      isDown = false;

      if (activePointerId != null && root.releasePointerCapture) {
        try { root.releasePointerCapture(activePointerId); } catch (err) {}
      }
      activePointerId = null;

      // Barely moved → it was a click → flip the pressed card.
      if (!isDragging) {
        var item = flippableFrom(pressTarget);
        if (item) toggleFlip(item);
        pressTarget = null;
        tweenSpeed(0, 0.6, "power3.out"); // pointer still inside → hover-pause
        return;
      }

      // It was a drag → end it and fling with clamped momentum.
      isDragging = false;
      root.classList.remove("is-dragging");
      pressTarget = null;

      var momentum = Math.max(-BASE_SPEED * 5, Math.min(BASE_SPEED * 10, ptrVelocity));
      sp.v = momentum;

      var r = root.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
      tweenSpeed(inside ? 0 : BASE_SPEED, 1.6, "power4.out");
    }

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
