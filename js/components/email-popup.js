/*!
 * email-popup.js v1.0.1
 * Bottom-left email capture slide-in ("get the report" style card). The card
 * itself is built in Webflow Designer inside a [data-email-popup] wrapper with
 * a NATIVE Webflow form (Webflow owns submit + success message); this script
 * only decides WHEN it is polite to show it — and when never to.
 *
 * Anti-annoyance contract (all thresholds tunable via attributes):
 *   - Never on landing. Shows only after real engagement: scroll depth
 *     (default 50%) OR active time on page (default 20s, paused while the
 *     tab is hidden) — whichever happens first.
 *   - Never while the visitor is typing in another form field; the reveal
 *     waits until the field is left.
 *   - Never on pages that already carry a lead form (default: any page with
 *     [data-demo-form]) — no double-asking where conversion already happens.
 *   - Never below a minimum viewport width (default 768px) — on phones a
 *     fixed card eats the screen.
 *   - At most once per browser session (sessionStorage), even across pages.
 *   - Dismiss (X or Esc) → snoozed for N days (default 14).
 *   - Successful submit → gone for M days (default 365).
 *   - Shown-but-ignored K times (default 3) → auto-snoozed anyway; silence
 *     is also an answer.
 *   - Non-modal: no backdrop, no scroll lock, focus is NEVER stolen. Esc and
 *     the close button always work.
 *   - prefers-reduced-motion: the slide/fade transition is dropped in CSS.
 *
 * Requires: nothing. No GSAP — entrance/exit is a CSS class swap
 * (email-popup.css owns the transition), storage is guarded for private mode.
 * CSS: css/components/email-popup.css
 *
 * DOM (Webflow) — [data-email-popup-content]/[data-email-popup-media] get the
 * ready-made card skin from email-popup.css (content left, cover image right,
 * close circle straddling the corner; leave the close button EMPTY — the
 * cross is drawn in CSS):
 *   <div data-email-popup aria-label="Report signup">
 *     <button data-email-popup-close aria-label="Close"></button>
 *     <div data-email-popup-content>
 *       <h4>42% of companies already use AI.</h4>
 *       <p>See new insights on Winter 2026 spend shifts.</p>
 *       <div class="w-form">
 *         <form> <input type="email" required> <input type="submit"> </form>
 *         <div class="w-form-done">Thanks — the report is on its way.</div>
 *       </div>
 *     </div>
 *     <div data-email-popup-media><img src="report-cover.jpg" alt=""></div>
 *   </div>
 *
 * Root attributes (all optional):
 *   data-email-popup-key         campaign id — storage is scoped per key, so a
 *                                new campaign re-arms past snoozes (default "default")
 *   data-email-popup-scroll      scroll-depth trigger, % of page (default 50; 0 = off)
 *   data-email-popup-delay       engaged-time trigger, seconds (default 20; 0 = off)
 *   data-email-popup-snooze      days to stay away after dismiss (default 14)
 *   data-email-popup-done        days to stay away after submit (default 365)
 *   data-email-popup-max-shows   ignored impressions before auto-snooze (default 3)
 *   data-email-popup-min-width   min viewport px to ever show (default 768; 0 = always)
 *   data-email-popup-skip-if     CSS selector — if it matches anything on the
 *                                page the popup stays away (default "[data-demo-form]";
 *                                "none" disables the check)
 *   data-email-popup-hide-after  seconds the success message stays before the
 *                                card slides away (default 4)
 *
 * Sestek.initEmailPopup() returns a controller per root: { el, show, hide,
 * dismiss } — show() bypasses the triggers but still honours snooze/done/session
 * caps, so a manual CTA elsewhere can reuse the same card.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var DAY_MS = 864e5;

  /** Numeric data-attribute reader (Sestek.util.attrNum fallback-inlined). */
  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /* ── Guarded storage — Safari private mode / blocked storage must never
   *    throw; on failure frequency-capping degrades to per-pageload only. ── */
  function storeRead(storage, key) {
    try {
      var raw = global[storage].getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function storeWrite(storage, key, value) {
    try {
      global[storage].setItem(key, JSON.stringify(value));
    } catch (e) { /* private mode — silently degrade */ }
  }

  /** Is the visitor mid-typing somewhere OUTSIDE the popup? Don't interrupt. */
  function isTypingOutside(root) {
    var el = doc.activeElement;
    if (!el || el === doc.body || root.contains(el)) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  /** Webflow toggles .w-form-done via inline display — visible yet? */
  function isVisible(el) {
    return !!el && getComputedStyle(el).display !== "none";
  }

  function wire(root) {
    var key = root.getAttribute("data-email-popup-key") || "default";
    var storeKey = "sestek-email-popup:" + key;
    var sessionKey = storeKey + ":shown";

    var scrollPct = attrNum(root, "data-email-popup-scroll", 50);
    var delaySec = attrNum(root, "data-email-popup-delay", 20);
    var snoozeDays = attrNum(root, "data-email-popup-snooze", 14);
    var doneDays = attrNum(root, "data-email-popup-done", 365);
    var maxShows = attrNum(root, "data-email-popup-max-shows", 3);
    var minWidth = attrNum(root, "data-email-popup-min-width", 768);
    var hideAfter = attrNum(root, "data-email-popup-hide-after", 4);
    var skipIf = root.getAttribute("data-email-popup-skip-if");
    if (skipIf == null || skipIf === "") skipIf = "[data-demo-form]";

    // Non-modal landmark; screen readers find it, focus is never moved to it.
    if (!root.hasAttribute("role")) root.setAttribute("role", "complementary");

    var state = storeRead("localStorage", storeKey) || {};
    var visible = false;
    var armed = false;
    var timers = [];

    /* ── Hard skips — decided once, before any listener is attached ── */
    function isBlocked() {
      var now = Date.now();
      if (state.doneUntil && now < state.doneUntil) return true;    // already subscribed
      if (state.snoozeUntil && now < state.snoozeUntil) return true; // dismissed recently
      if (storeRead("sessionStorage", sessionKey)) return true;      // once per session
      return false;
    }

    function disarm() {
      armed = false;
      global.removeEventListener("scroll", onScroll);
      for (var i = 0; i < timers.length; i++) clearInterval(timers[i]);
      timers.length = 0;
    }

    /* ── Reveal — still re-checks politeness at the moment of truth ── */
    function show() {
      if (visible || isBlocked()) return;
      if (minWidth > 0 && global.innerWidth < minWidth) return;
      if (isTypingOutside(root)) {
        // Mid-typing elsewhere — retry quietly until the field is left.
        var retry = setInterval(function () {
          if (isTypingOutside(root)) return;
          clearInterval(retry);
          show();
        }, 1000);
        timers.push(retry);
        return;
      }
      disarm();
      visible = true;
      root.classList.add("is-visible");
      storeWrite("sessionStorage", sessionKey, 1);
      state.shows = (state.shows || 0) + 1;
      // Ignored too many times → treat silence as a "no" and snooze.
      if (state.shows >= maxShows) {
        state.snoozeUntil = Date.now() + snoozeDays * DAY_MS;
        state.shows = 0;
      }
      storeWrite("localStorage", storeKey, state);
      doc.addEventListener("keydown", onKeydown);
    }

    function hide() {
      if (!visible) return;
      visible = false;
      root.classList.remove("is-visible");
      doc.removeEventListener("keydown", onKeydown);
    }

    function dismiss() {
      hide();
      state.snoozeUntil = Date.now() + snoozeDays * DAY_MS;
      state.shows = 0;
      storeWrite("localStorage", storeKey, state);
    }

    function markDone() {
      state.doneUntil = Date.now() + doneDays * DAY_MS;
      delete state.snoozeUntil;
      state.shows = 0;
      storeWrite("localStorage", storeKey, state);
      // Let the thank-you read, then slide away on its own.
      setTimeout(hide, hideAfter * 1000);
    }

    function onKeydown(e) {
      if (e.key === "Escape" || e.key === "Esc") dismiss();
    }

    /* ── Triggers — first of scroll depth / engaged time wins ── */
    function onScroll() {
      var docEl = doc.documentElement;
      var max = docEl.scrollHeight - global.innerHeight;
      if (max <= 0) return;
      if ((global.pageYOffset / max) * 100 >= scrollPct) show();
    }

    function arm() {
      if (armed) return;
      armed = true;
      if (scrollPct > 0) {
        global.addEventListener("scroll", onScroll, { passive: true });
      }
      if (delaySec > 0) {
        // Engaged seconds only — a backgrounded tab does not count down.
        var engaged = 0;
        var tick = setInterval(function () {
          if (doc.visibilityState !== "visible") return;
          if (++engaged >= delaySec) show();
        }, 1000);
        timers.push(tick);
      }
    }

    /* ── Wire up ── */
    var closeBtn = root.querySelector("[data-email-popup-close]");
    if (closeBtn) closeBtn.addEventListener("click", dismiss);

    var done = root.querySelector(".w-form-done");
    if (done) {
      new MutationObserver(function () {
        if (visible && isVisible(done)) markDone();
      }).observe(done, { attributes: true, attributeFilter: ["style", "class"] });
    }

    var pageHasLeadForm = skipIf !== "none" && skipIf !== "false" && !!doc.querySelector(skipIf);
    if (!isBlocked() && !pageHasLeadForm) arm();

    return { el: root, show: show, hide: hide, dismiss: dismiss };
  }

  /**
   * Initialize all [data-email-popup] roots on the page.
   * @param {string} [selector="[data-email-popup]"]
   * @returns {Array<{el:HTMLElement, show:Function, hide:Function, dismiss:Function}>}
   */
  function initEmailPopup(selector) {
    var roots = doc.querySelectorAll(selector || "[data-email-popup]");
    return Array.prototype.map.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initEmailPopup = initEmailPopup;

})(typeof window !== "undefined" ? window : this);
