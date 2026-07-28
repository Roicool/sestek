/*!
 * chapter-tabs.js v1.0.0
 * Colour-coordinated vertical tabs (Xref "Our journey so far" pattern): a
 * stack of big clickable titles on one side, a card panel on the other. Click
 * a title and its panel cross-fades in while the stage height morphs to the
 * new card — no jump when the cards have different amounts of copy.
 *
 * The colour coordination is the point: every chapter carries its own ACCENT
 * (data-ct-accent). The active title takes that accent, and so does the
 * optional rail indicator — so a soft-pink card pairs with a Sestek-pink
 * title, a mint card with a green title, and so on. The card's own background
 * stays in Designer (a class per panel); the accent is the one value the
 * component needs to keep the two sides in sync.
 *
 * Requires : gsap. Sestek.util (js/core/utils.js) loaded first.
 * CSS      : css/components/chapter-tabs.css (stacked panels + accent hooks)
 *
 * DOM contract (Webflow — attributes matter, design is yours):
 *   [data-chapter-tabs]                    root
 *     [data-ct-list]                       the title rail (role="tablist")
 *       [data-ct-tab                       one clickable title (N total)
 *         data-ct-accent="--brand-primary--500"]   this chapter's accent —
 *                                          a token ("--x" / "var(--x)") or a
 *                                          literal colour. May also live on
 *                                          the matching panel instead.
 *       [data-ct-indicator]                OPTIONAL: a bar JS moves to the
 *                                          active title, tinted with the accent
 *     [data-ct-panels]                     the card stage (position:relative)
 *       [data-ct-panel]                    one card per title, SAME ORDER
 *
 * Root attributes (all optional):
 *   data-ct-duration   swap duration in seconds          (default 0.5)
 *   data-ct-ease       GSAP ease                         (default "power2.out")
 *   data-ct-rise       px the incoming card rises from   (default 16)
 *   data-ct-start      index open on load                (default 0)
 *   data-ct-interval   autoplay ms, 0 = off              (default 0)
 *
 * Accessibility: a real tablist — role="tab"/"tabpanel", aria-selected,
 * aria-controls, roving tabindex, ↑/↓/←/→/Home/End. Autoplay (when enabled)
 * pauses on hover, on focus, and while the tab is hidden.
 * prefers-reduced-motion: instant swaps, no autoplay.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    duration: 0.5,
    ease: "power2.out",
    rise: 16,
    start: 0,
    interval: 0,
  };

  /** Bare "--token" → "var(--token)"; anything else passes through. */
  function normalizeColor(v) {
    if (!v) return "";
    v = v.trim();
    return v.indexOf("--") === 0 ? "var(" + v + ")" : v;
  }

  function buildOne(root) {
    if (root._chapterTabsInit) return;                        // idempotent
    root._chapterTabsInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var tabs = toArray(root.querySelectorAll("[data-ct-tab]"));
    var panels = toArray(root.querySelectorAll("[data-ct-panel]"));
    var stage = root.querySelector("[data-ct-panels]");
    var list = root.querySelector("[data-ct-list]") || (tabs[0] && tabs[0].parentNode);
    var indicator = root.querySelector("[data-ct-indicator]");

    var n = Math.min(tabs.length, panels.length);
    if (n < 2) {
      console.warn("[Sestek ChapterTabs] Need at least two [data-ct-tab] + [data-ct-panel] pairs.");
      return;
    }
    if (tabs.length !== panels.length) {
      console.warn("[Sestek ChapterTabs] tab count (" + tabs.length + ") ≠ panel count (" +
        panels.length + "). They are matched by DOM order — using the first " + n + ".");
    }
    tabs = tabs.slice(0, n);
    panels = panels.slice(0, n);

    var DUR      = attrNum(root, "data-ct-duration", DEFAULTS.duration);
    var RISE     = attrNum(root, "data-ct-rise", DEFAULTS.rise);
    var INTERVAL = attrNum(root, "data-ct-interval", DEFAULTS.interval);
    var EASE     = root.getAttribute("data-ct-ease") || DEFAULTS.ease;

    var reduce = util.prefersReducedMotion();
    var active = Math.min(Math.max(attrNum(root, "data-ct-start", DEFAULTS.start), 0), n - 1);
    var animating = false;

    // Accent per chapter: authored on the tab, or on its panel. Normalised so
    // tokens keep working as live CSS variables (no computed-value snapshot).
    var accents = tabs.map(function (tab, i) {
      return normalizeColor(tab.getAttribute("data-ct-accent") ||
        panels[i].getAttribute("data-ct-accent") || "");
    });

    // ── ARIA wiring ─────────────────────────────────────────────────────────
    if (list) list.setAttribute("role", "tablist");
    tabs.forEach(function (tab, i) {
      tab.setAttribute("role", "tab");
      if (!tab.id) tab.id = "ct-tab-" + (root.id || "x") + "-" + i;
      if (!panels[i].id) panels[i].id = "ct-panel-" + (root.id || "x") + "-" + i;
      tab.setAttribute("aria-controls", panels[i].id);
      panels[i].setAttribute("role", "tabpanel");
      panels[i].setAttribute("aria-labelledby", tab.id);
      if (accents[i]) tab.style.setProperty("--ct-accent", accents[i]);
    });

    function syncTabs() {
      tabs.forEach(function (tab, i) {
        var on = i === active;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.tabIndex = on ? 0 : -1;                           // roving tabindex
      });
      panels.forEach(function (panel, i) {
        panel.setAttribute("aria-hidden", i === active ? "false" : "true");
      });
      // The root carries the live accent too, so the indicator (and any
      // Designer element) can read var(--ct-accent) without extra plumbing.
      if (accents[active]) root.style.setProperty("--ct-accent", accents[active]);
    }

    // ── Rail indicator (optional) ───────────────────────────────────────────
    function placeIndicator(animate) {
      if (!indicator || !list) return;
      var t = tabs[active].getBoundingClientRect();
      var l = list.getBoundingClientRect();
      var props = { y: t.top - l.top, height: t.height };
      if (animate && !reduce) gsap.to(indicator, Object.assign({ duration: DUR, ease: EASE }, props));
      else gsap.set(indicator, props);
    }

    // ── Panel swap: cross-fade + stage height morph ─────────────────────────
    function show(i, animate) {
      i = Math.min(Math.max(i, 0), n - 1);
      if (i === active && animate) return;
      if (animating) return;

      var from = panels[active];
      var to = panels[i];
      active = i;
      syncTabs();
      placeIndicator(animate);

      // Only the active panel sits in normal flow (CSS) — it is what gives the
      // stage its height, so the stage keeps reflowing on its own when the copy
      // wraps at a new width.
      if (!animate || reduce) {
        panels.forEach(function (p, idx) {
          p.classList.toggle("is-active", idx === active);
          gsap.set(p, { autoAlpha: idx === active ? 1 : 0, y: 0 });
        });
        if (stage) gsap.set(stage, { height: "auto" });
        return;
      }

      animating = true;
      // Freeze the stage at the outgoing height, swap which panel is in flow,
      // then tween the stage to the incoming card's height — no jump.
      var h0 = stage ? stage.offsetHeight : 0;
      if (stage) gsap.set(stage, { height: h0 });
      from.classList.remove("is-active");
      to.classList.add("is-active");
      var h1 = stage ? to.offsetHeight : 0;

      var tl = gsap.timeline({
        onComplete: function () {
          if (stage) gsap.set(stage, { height: "auto" });
          animating = false;
        },
      });
      if (stage && h1 && Math.abs(h1 - h0) > 1) {
        tl.to(stage, { height: h1, duration: DUR, ease: EASE }, 0);
      }
      tl.to(from, { autoAlpha: 0, duration: DUR * 0.45, ease: "power2.in" }, 0);
      tl.fromTo(to, { autoAlpha: 0, y: RISE },
        { autoAlpha: 1, y: 0, duration: DUR, ease: EASE }, DUR * 0.2);
    }

    // ── Autoplay (opt-in, pause-aware) ──────────────────────────────────────
    var timer = null, paused = { hover: false, hidden: false };
    function shouldRun() { return INTERVAL > 0 && !reduce && !paused.hover && !paused.hidden; }
    function schedule() {
      clearTimeout(timer);
      if (shouldRun()) timer = setTimeout(function () { show((active + 1) % n, true); schedule(); }, INTERVAL);
    }
    if (INTERVAL > 0) {
      root.addEventListener("pointerenter", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        paused.hover = true; schedule();
      });
      root.addEventListener("pointerleave", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        paused.hover = false; schedule();
      });
      root.addEventListener("focusin", function () { paused.hover = true; schedule(); });
      root.addEventListener("focusout", function () {
        if (!root.contains(document.activeElement)) { paused.hover = false; schedule(); }
      });
      document.addEventListener("visibilitychange", function () {
        paused.hidden = document.hidden; schedule();
      });
    }

    // ── Interaction ─────────────────────────────────────────────────────────
    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function (e) {
        e.preventDefault();                                   // tabs are often <a href="#">
        show(i, true);
        schedule();
      });
    });
    if (list) {
      list.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (active + 1) % n;
        else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (active - 1 + n) % n;
        else if (e.key === "Home") next = 0;
        else if (e.key === "End") next = n - 1;
        else return;
        e.preventDefault();
        show(next, true);
        schedule();
        tabs[next].focus();
      });
    }

    // Re-seat the indicator when the layout settles (fonts, resize).
    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { placeIndicator(false); }, 150);
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("load", onResize);

    // ── Init state ──────────────────────────────────────────────────────────
    show(active, false);
    placeIndicator(false);
    schedule();

    root._chapterTabs = {
      el: root,
      to: function (i) { show(i, true); schedule(); },
      _destroy: function () {
        clearTimeout(timer);
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("load", onResize);
      },
    };
  }

  /**
   * Initialise every [data-chapter-tabs] section on the page in one call.
   * @param {string} [selector="[data-chapter-tabs]"] narrow the scope if needed
   */
  function initChapterTabs(selector) {
    // Tolerate late-loading gsap (async/defer order): poll for ~4s.
    if (typeof gsap === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined") { clearInterval(poll); initChapterTabs(selector); }
        else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek ChapterTabs] gsap required — load gsap.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek ChapterTabs] Sestek.util (js/core/utils.js) required."); return;
    }

    // Arm the CSS: panels only stack once JS is running, so a no-JS page
    // renders every card in normal flow (graceful fallback).
    document.documentElement.classList.add("ctabs-armed");

    var roots = document.querySelectorAll(selector || "[data-chapter-tabs]");
    if (!roots.length) { console.warn("[Sestek ChapterTabs] No [data-chapter-tabs] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initChapterTabs = initChapterTabs;

})(typeof window !== "undefined" ? window : this);
