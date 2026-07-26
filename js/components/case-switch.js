/*!
 * case-switch.js v1.0.0
 * CMS-driven case-study switcher: a column of customer LOGOS acts as tabs, and
 * a STACKED DECK of cards on the other side shows the selected case study. The
 * deck auto-advances every 5s, can be GRABBED and thrown to change cards, and
 * whichever card lands on top always drives the active (coloured) logo — the
 * two stay in perfect sync no matter how the change was triggered.
 *
 * Change triggers (all keep logo ⇄ card in sync):
 *   • autoplay          — advances every data-cswitch-interval ms (default 5s)
 *   • click a logo tab  — jumps the deck to that case study
 *   • keyboard on tabs  — ←/→/Home/End move + select (roving tabindex)
 *   • drag the deck     — throw left → next, pull right → previous, snap back
 *                         if released below threshold
 *
 * Two SAME-collection Webflow Collection Lists (logos + cards) are bound by DOM
 * order: item i in the tabs list matches item i in the deck list. Design lives
 * in Designer; this file only wires behaviour + sync.
 *
 * Requires : gsap (core; no plugins — drag is pointer-event based, deps stay
 *            Lenis + GSAP only). Sestek.util (js/core/utils.js) loaded first.
 * CSS      : css/components/case-switch.css  (deck stacking + logo active state)
 *
 * DOM contract (Webflow — attributes matter, visual design is yours):
 *   [data-cswitch]                      root; config attrs below
 *     [data-cswitch-tabs]   (Collection List)  logo tabs — same collection
 *       [data-cswitch-tab]  (Collection Item)  one logo per case study
 *     [data-cswitch-deck]   (Collection List)  card deck — same collection/order
 *       [data-cswitch-card] (Collection Item)  one card per case study
 *
 * Root config attributes (all optional):
 *   data-cswitch-interval   autoplay ms, 0 = off             (default 5000)
 *   data-cswitch-duration   transition seconds               (default 0.6)
 *   data-cswitch-ease       GSAP ease for settles            (default "power3.out")
 *   data-cswitch-stack      how many behind-cards are visible (default 3)
 *   data-cswitch-offset-x   px each behind card peeks sideways (default 18)
 *   data-cswitch-offset-y   px each behind card peeks up (−) / down (default -16)
 *   data-cswitch-scale      scale falloff per depth           (default 0.05)
 *   data-cswitch-drag       "false" disables grab/throw       (default true)
 *
 * Accessibility: tabs are a real role="tablist" (roving tabindex, aria-selected);
 * cards are role="tabpanel" with aria-hidden on the non-front cards. Autoplay
 * pauses on hover, on keyboard focus, while dragging, and when the tab is hidden.
 * prefers-reduced-motion → no autoplay, no drag, instant switches.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    interval: 5000,
    duration: 0.6,
    ease: "power3.out",
    stack: 3,
    offsetX: 18,
    offsetY: -16,
    scale: 0.05,
  };

  function mod(n, m) { return ((n % m) + m) % m; }

  function buildOne(root) {
    if (root._caseSwitchInit) return;                         // idempotent
    root._caseSwitchInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var tabs = toArray(root.querySelectorAll("[data-cswitch-tab]"));
    var cards = toArray(root.querySelectorAll("[data-cswitch-card]"));
    var deck = root.querySelector("[data-cswitch-deck]");

    var n = Math.min(tabs.length, cards.length);
    if (n < 1) {
      console.warn("[Sestek CaseSwitch] Need matching [data-cswitch-tab] and [data-cswitch-card] items (same collection).");
      return;
    }
    if (tabs.length !== cards.length) {
      console.warn("[Sestek CaseSwitch] tab count (" + tabs.length + ") ≠ card count (" +
        cards.length + "). Bind both Collection Lists to the SAME collection + sort. Using first " + n + ".");
    }
    tabs = tabs.slice(0, n);
    cards = cards.slice(0, n);

    var INTERVAL = attrNum(root, "data-cswitch-interval", DEFAULTS.interval);
    var DUR      = attrNum(root, "data-cswitch-duration", DEFAULTS.duration);
    var STACK    = Math.max(1, attrNum(root, "data-cswitch-stack", DEFAULTS.stack));
    var OFFX     = attrNum(root, "data-cswitch-offset-x", DEFAULTS.offsetX);
    var OFFY     = attrNum(root, "data-cswitch-offset-y", DEFAULTS.offsetY);
    var SCALE    = attrNum(root, "data-cswitch-scale", DEFAULTS.scale);
    var EASE     = root.getAttribute("data-cswitch-ease") || DEFAULTS.ease;
    var DRAG_ON  = root.getAttribute("data-cswitch-drag") !== "false";

    var reduce = util.prefersReducedMotion();
    var active = 0;
    var animating = false;

    // ── ARIA wiring ──────────────────────────────────────────────────────────
    var tablist = root.querySelector("[data-cswitch-tabs]") || tabs[0].parentNode;
    if (tablist) tablist.setAttribute("role", "tablist");
    tabs.forEach(function (tab, i) {
      tab.setAttribute("role", "tab");
      if (!tab.id) tab.id = "cswitch-tab-" + (root.id || "x") + "-" + i;
      if (!cards[i].id) cards[i].id = "cswitch-card-" + (root.id || "x") + "-" + i;
      tab.setAttribute("aria-controls", cards[i].id);
      cards[i].setAttribute("role", "tabpanel");
      cards[i].setAttribute("aria-labelledby", tab.id);
    });

    // ── Deck slot geometry ───────────────────────────────────────────────────
    // depth 0 = front; higher = further back. Cards past STACK are hidden.
    function slotProps(card) {
      var d = mod(cards.indexOf(card) - active, n);
      var shown = d < STACK;
      return {
        x: d * OFFX,
        y: d * OFFY,
        rotation: 0,
        scale: 1 - d * SCALE,
        autoAlpha: shown ? 1 : 0,
        zIndex: 100 - d,
        transformOrigin: "50% 100%",
      };
    }

    // Front card is interactive; the rest never swallow clicks.
    function applyPointerEvents() {
      cards.forEach(function (card, i) {
        card.style.pointerEvents = i === active ? "auto" : "none";
      });
    }

    function syncActive() {
      tabs.forEach(function (tab, i) {
        var on = i === active;
        tab.classList.toggle("is-active", on);          // Designer styles the coloured state
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;                     // roving tabindex
      });
      cards.forEach(function (card, i) {
        card.setAttribute("aria-hidden", i === active ? "false" : "true");
      });
      applyPointerEvents();
    }

    // Place every card at its slot — animated (tween) or instant (set).
    function render(animate) {
      cards.forEach(function (card) {
        var p = slotProps(card);
        if (animate) gsap.to(card, Object.assign({ duration: DUR, ease: EASE }, p));
        else gsap.set(card, p);
      });
      syncActive();
    }

    // ── Transitions ──────────────────────────────────────────────────────────
    // Throw the front card off to `dir` and advance to the next case study.
    function throwOut(dir) {
      if (animating || n < 2) return;
      animating = true;
      var leaving = cards[active];
      active = mod(active + 1, n);
      var dist = (deck ? deck.offsetWidth : root.offsetWidth || 400) * 1.15;
      gsap.to(leaving, {
        x: dir * dist, y: -24, rotation: dir * 12, autoAlpha: 0,
        duration: DUR * 0.55, ease: "power2.in",
        onComplete: function () { gsap.set(leaving, slotProps(leaving)); },
      });
      cards.forEach(function (card) {
        if (card !== leaving) gsap.to(card, Object.assign({ duration: DUR, ease: EASE }, slotProps(card)));
      });
      syncActive();
      gsap.delayedCall(DUR, function () { animating = false; });
    }

    // Pull the previous case study in from the left and recede the old front.
    function pullIn() {
      if (animating || n < 2) return;
      animating = true;
      active = mod(active - 1, n);
      var incoming = cards[active];
      var dist = (deck ? deck.offsetWidth : root.offsetWidth || 400) * 1.15;
      gsap.set(incoming, { x: -dist, y: -24, rotation: -10, scale: 1, autoAlpha: 1, zIndex: 200 });
      cards.forEach(function (card) {
        gsap.to(card, Object.assign({ duration: DUR, ease: EASE }, slotProps(card)));
      });
      syncActive();
      gsap.delayedCall(DUR, function () { animating = false; });
    }

    // Jump to an arbitrary index (tab click / keyboard) — smooth deck reshuffle.
    function jumpTo(i) {
      i = mod(i, n);
      if (i === active) return;
      if (animating) return;
      animating = true;
      active = i;
      render(true);
      gsap.delayedCall(DUR, function () { animating = false; });
    }

    // ── Autoplay (pause-aware) ───────────────────────────────────────────────
    var timer = null, paused = { hover: false, drag: false, hidden: false };
    function shouldRun() {
      return INTERVAL > 0 && !reduce && n > 1 &&
        !paused.hover && !paused.drag && !paused.hidden;
    }
    function schedule() {
      clearTimeout(timer);
      if (shouldRun()) timer = setTimeout(function () { throwOut(-1); schedule(); }, INTERVAL);
    }
    function restart() { schedule(); }                        // call after any manual change

    // ── Tab interaction ──────────────────────────────────────────────────────
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function (e) { e.preventDefault(); jumpTo(i); restart(); });
    });
    if (tablist) {
      tablist.addEventListener("keydown", function (e) {
        var cur = active, next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") next = mod(cur + 1, n);
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = mod(cur - 1, n);
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = n - 1;
        else return;
        e.preventDefault();
        jumpTo(next); restart();
        tabs[next].focus();
      });
    }

    // Pause autoplay on hover / focus / tab-hidden.
    root.addEventListener("pointerenter", function () { paused.hover = true; schedule(); });
    root.addEventListener("pointerleave", function () { paused.hover = false; schedule(); });
    root.addEventListener("focusin", function () { paused.hover = true; schedule(); });
    root.addEventListener("focusout", function () {
      if (!root.contains(document.activeElement)) { paused.hover = false; schedule(); }
    });
    document.addEventListener("visibilitychange", function () {
      paused.hidden = document.hidden; schedule();
    });

    // ── Drag to throw ────────────────────────────────────────────────────────
    if (DRAG_ON && !reduce && n > 1 && deck) {
      deck.classList.add("is-draggable");
      var dragging = false, decided = false, horiz = false;
      var startX = 0, startY = 0, dx = 0, moved = 0, deckW = 0;

      deck.addEventListener("pointerdown", function (e) {
        if (animating) return;
        dragging = true; decided = false; horiz = false;
        startX = e.clientX; startY = e.clientY; dx = 0; moved = 0;
        deckW = deck.offsetWidth || 400;
        paused.drag = true; schedule();
      });
      deck.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        dx = e.clientX - startX;
        var dy = e.clientY - startY;
        moved = Math.abs(dx);
        // First meaningful move decides intent: horizontal → drag, vertical → let the page scroll.
        if (!decided && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
          decided = true;
          horiz = Math.abs(dx) > Math.abs(dy);
          if (horiz && deck.setPointerCapture) { try { deck.setPointerCapture(e.pointerId); } catch (err) {} }
        }
        if (!horiz) return;
        e.preventDefault();
        gsap.set(cards[active], { x: dx, rotation: dx * 0.03 });
      });
      function endDrag() {
        if (!dragging) return;
        dragging = false;
        paused.drag = false;
        var threshold = Math.max(deckW * 0.18, 60);
        if (horiz && dx <= -threshold) throwOut(-1);          // toss left → next
        else if (horiz && dx >= threshold) pullIn();          // pull right → previous
        else gsap.to(cards[active], { x: 0, rotation: 0, duration: 0.35, ease: "power3.out" }); // snap back
        schedule();
      }
      deck.addEventListener("pointerup", endDrag);
      deck.addEventListener("pointercancel", endDrag);
      // A real drag must not fire the card's link click.
      deck.addEventListener("click", function (e) {
        if (moved > 8) { e.preventDefault(); e.stopPropagation(); moved = 0; }
      }, true);
    }

    // ── Init state ───────────────────────────────────────────────────────────
    render(false);                                            // instant lay-out of the deck
    schedule();                                               // start autoplay (no-op if disabled)

    // Expose a small controller for programmatic control / teardown.
    root._caseSwitch = {
      el: root,
      to: function (i) { jumpTo(i); restart(); },
      next: function () { throwOut(-1); restart(); },
      prev: function () { pullIn(); restart(); },
      _destroy: function () { clearTimeout(timer); },
    };
  }

  /**
   * Initialise every [data-cswitch] switcher on the page in one call.
   * @param {string} [selector="[data-cswitch]"] narrow the scope if needed
   */
  function initCaseSwitch(selector) {
    // Tolerate late-loading gsap (async/defer order): poll for ~4s.
    if (typeof gsap === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined") { clearInterval(poll); initCaseSwitch(selector); }
        else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek CaseSwitch] gsap required — load gsap.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek CaseSwitch] Sestek.util (js/core/utils.js) required."); return;
    }

    // Arm the CSS anti-flash guard (no-op if already added in <head>). Gated on
    // this class so no-JS pages just show the cards stacked (graceful fallback).
    document.documentElement.classList.add("cswitch-armed");

    var roots = document.querySelectorAll(selector || "[data-cswitch]");
    if (!roots.length) { console.warn("[Sestek CaseSwitch] No [data-cswitch] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCaseSwitch = initCaseSwitch;

})(typeof window !== "undefined" ? window : this);
