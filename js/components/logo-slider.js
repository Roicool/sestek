/*!
 * logo-slider.js v1.0.0
 * Brand-logo tabbed story slider for Webflow CMS. Everything is authored inside
 * the Collection List — JS never copies content into a separate "stage". Each
 * Collection Item = one brand = one slide, carrying BOTH its own logo tab AND
 * its own full slide (background image + quote/author/stat/CTA, already CMS-bound
 * by Webflow). CSS stacks every item in one grid cell so the section keeps the
 * height of the tallest slide and nothing jumps on switch.
 *
 * At init JS gathers every item's [data-ls-tab] (the brand logo) into one
 * [data-ls-tabs] bar (created under the root if absent) so the logos form a
 * single row of tabs at the top — something display:contents can't do while the
 * tabs stay inside their items. Clicking a tab, the prev/next arrows, or the
 * keyboard switches slides. When it is the active slide, that tab's [data-ls-fill]
 * bar animates 0→100 % over `dwell`; on completion the slider auto-advances.
 * Hover / focus / a hidden tab pauses the fill; leaving resumes it.
 *
 * Backgrounds cross-fade with a subtle scale-settle; panel contents stagger in.
 * The film-grain overlay is NOT this component's job — put `data-grain` on the
 * background layer and call Sestek.initGrain() alongside; the two compose.
 *
 * Requires : gsap (global) for cross-fade + auto-fill. Without it the slider
 *            still works as a click/arrow switcher (instant swap, no autoplay).
 *            js/core/utils.js (Sestek.util) loaded first.
 * CSS      : css/components/logo-slider.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────────
 *
 *   [data-logo-slider]                       ← Collection Wrapper (root)
 *
 *     (optional static header — title, subtitle, "See all" — authored freely)
 *
 *     [data-ls-prev]  <button>               ← optional arrows, placed anywhere
 *     [data-ls-next]  <button>                  in the root (e.g. top-right)
 *
 *     [data-ls-tabs]                         ← OPTIONAL empty box; JS creates it
 *                                               if missing and fills it with tabs
 *
 *     [Collection List]  role="list"         ← the stage (JS tags it data-ls-stage)
 *       [data-ls-item]   role="listitem"     ← one brand / slide
 *         [data-ls-tab]                       ← logo trigger, MOVED into the tab bar
 *           <img data-ls-logo src="…" alt="Brand">   ← PNG; greyscale until active/hover
 *           [data-ls-fill]                    ← the auto-advance progress bar
 *         [data-ls-bg]                        ← background layer (stacked, cross-fade)
 *           <img src="…" alt="" loading="lazy">
 *           [data-ls-overlay]                 ← OPTIONAL tint for text contrast
 *           (add data-grain here + Sestek.initGrain() for film grain)
 *         [data-ls-panel]                     ← content (stacked, staggered in)
 *           [data-ls-anim] …                  ← OPTIONAL: mark which children
 *                                               animate; default = panel's children
 *
 * Root attributes (all optional):
 *   data-ls-autoplay  "false" → no auto-advance                (default true)
 *   data-ls-dwell     seconds each slide holds before advancing (default 6)
 *   data-ls-fade      cross-fade seconds                        (default 0.6)
 *   data-ls-ease      GSAP ease                                 (default "power2.out")
 *   data-ls-loop      "false" → stop at the ends (arrows disable)(default true)
 *
 * API:
 *   Sestek.initLogoSlider()   — wire every [data-logo-slider] on the page
 *   returns an array of controllers: { el, to(i), next(), prev(), active(),
 *                                       play(), pause() }
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;
  var flag    = Sestek.util.flag;

  function setupInstance(root) {
    if (root._logoSliderInit) return null;
    root._logoSliderInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-ls-item]"));
    if (!items.length) {
      console.warn("[Sestek LogoSlider] need [data-ls-item]s.", root);
      return null;
    }

    var hasGsap  = typeof gsap !== "undefined";
    var reduce   = Sestek.util.prefersReducedMotion();
    var dwell    = attrNum(root, "data-ls-dwell", 6);
    var fade     = attrNum(root, "data-ls-fade", 0.6);
    var ease     = root.getAttribute("data-ls-ease") || "power2.out";
    var loop     = root.getAttribute("data-ls-loop") !== "false";
    var autoplay = root.getAttribute("data-ls-autoplay") !== "false" &&
                   hasGsap && !reduce && items.length > 1;

    // ── Stage: the items' shared parent (Webflow's Collection List). Tagging it
    //    lets the CSS stack every item in one grid cell (stable height).
    var stage = items[0].parentElement;
    stage.setAttribute("data-ls-stage", "");

    // ── Tab bar: move every item's [data-ls-tab] into one row. Created before
    //    the stage if the Designer didn't place a [data-ls-tabs] box.
    var tabsBar = root.querySelector("[data-ls-tabs]");
    if (!tabsBar) {
      tabsBar = document.createElement("div");
      tabsBar.setAttribute("data-ls-tabs", "");
      stage.parentNode.insertBefore(tabsBar, stage);
    }
    tabsBar.setAttribute("role", "tablist");
    if (!tabsBar.getAttribute("aria-label")) tabsBar.setAttribute("aria-label", "Customer stories");

    var uid = "ls-" + Math.random().toString(36).slice(2, 7);

    var tabs  = [];
    var fills = [];
    items.forEach(function (item, i) {
      var tab = item.querySelector("[data-ls-tab]");
      if (tab && tab.parentElement !== tabsBar) tabsBar.appendChild(tab);
      tabs.push(tab || null);
      fills.push(tab ? tab.querySelector("[data-ls-fill]") : null);

      // Wire ARIA + roving focus between the tab (control) and item (panel).
      var panelId = uid + "-panel-" + i;
      var tabId   = uid + "-tab-" + i;
      item.setAttribute("id", item.id || panelId);
      item.setAttribute("role", "tabpanel");
      item.setAttribute("aria-labelledby", tab ? (tab.id || tabId) : "");
      if (tab) {
        tab.setAttribute("id", tab.id || tabId);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", item.id);
        tab.setAttribute("tabindex", "-1");
        if (!tab.getAttribute("aria-label")) {
          var logo = tab.querySelector("[data-ls-logo]");
          tab.setAttribute("aria-label",
            (logo && logo.getAttribute("alt")) || ("Story " + (i + 1)));
        }
      }
    });

    // ── State helpers ─────────────────────────────────────────────
    var active = items.findIndex(function (it) {
      return it.hasAttribute("data-ls-active") || it.classList.contains("is-active");
    });
    if (active < 0) active = 0;

    var mainTl = null, fillTween = null, paused = false;

    /** Elements that stagger in when a slide becomes active. */
    function animTargets(item) {
      var marked = item.querySelectorAll("[data-ls-anim]");
      if (marked.length) return Array.prototype.slice.call(marked);
      var panel = item.querySelector("[data-ls-panel]");
      return panel ? Array.prototype.slice.call(panel.children) : [];
    }

    /** Reflect the active index on tabs + items (state hooks + a11y). Purely
     *  attribute-driven so the critical CSS never depends on a styling class. */
    function render(i) {
      items.forEach(function (it, idx) {
        var on = idx === i;
        if (on) it.setAttribute("data-ls-active", ""); else it.removeAttribute("data-ls-active");
        it.setAttribute("aria-hidden", on ? "false" : "true");
        it.classList.toggle("is-active", on); // convenience hook for the Designer
        var tab = tabs[idx];
        if (!tab) return;
        tab.setAttribute("aria-selected", on ? "true" : "false");
        tab.setAttribute("tabindex", on ? "0" : "-1");
        if (on) tab.setAttribute("data-ls-active", ""); else tab.removeAttribute("data-ls-active");
        tab.classList.toggle("is-active", on);
      });
    }

    // ── Auto-advance fill ─────────────────────────────────────────
    function killFill() {
      if (fillTween) { fillTween.kill(); fillTween = null; }
      fills.forEach(function (f) { if (f) gsap.set(f, { scaleX: 0 }); });
    }

    function startFill() {
      if (!hasGsap) return;
      killFill();
      if (!autoplay || paused) return;
      var f = fills[active];
      var advance = function () { go(active + 1, false); };
      if (f) {
        gsap.set(f, { transformOrigin: "left center", scaleX: 0 });
        fillTween = gsap.to(f, { scaleX: 1, duration: dwell, ease: "none", onComplete: advance });
      } else {
        // No fill element on this tab — still time the advance off a proxy tween.
        fillTween = gsap.to({}, { duration: dwell, onComplete: advance });
      }
    }

    function pause() { paused = true; if (fillTween) fillTween.pause(); }
    function resume() {
      paused = false;
      if (fillTween && fillTween.paused()) fillTween.resume();
      else startFill();
    }

    // ── Transition ────────────────────────────────────────────────
    function animateTo(prevI, i) {
      var inItem  = items[i];
      var outItem = items[prevI];
      var inBg    = inItem.querySelector("[data-ls-bg]");
      var anims   = animTargets(inItem);
      var tl = gsap.timeline({ defaults: { ease: ease, overwrite: "auto" } });

      if (outItem && outItem !== inItem) {
        tl.to(outItem, { opacity: 0, duration: fade }, 0)
          .set(outItem, { visibility: "hidden" });
      }
      gsap.set(inItem, { visibility: "visible" });
      tl.fromTo(inItem, { opacity: 0 }, { opacity: 1, duration: fade }, 0);
      if (inBg) tl.fromTo(inBg, { scale: 1.06 }, { scale: 1, duration: fade * 1.8 }, 0);
      if (anims.length) {
        tl.fromTo(anims,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: fade, stagger: 0.06 },
          fade * 0.25);
      }
      return tl;
    }

    /** Instantly show slide i (reduced-motion / no-GSAP path). */
    function showInstant(i) {
      if (!hasGsap) return; // pure-CSS path handled by aria-hidden rules
      items.forEach(function (it, idx) {
        gsap.set(it, { opacity: idx === i ? 1 : 0, visibility: idx === i ? "visible" : "hidden" });
      });
      var anims = animTargets(items[i]);
      if (anims.length) gsap.set(anims, { opacity: 1, y: 0 });
      var bg = items[i].querySelector("[data-ls-bg]");
      if (bg) gsap.set(bg, { scale: 1 });
    }

    // ── Navigate ──────────────────────────────────────────────────
    function go(target, user) {
      if (items.length < 2) return;
      var i = loop
        ? (target % items.length + items.length) % items.length
        : Math.max(0, Math.min(items.length - 1, target));

      if (i === active) { if (user) startFill(); return; }

      var prev = active;
      active = i;
      render(i);
      updateArrows();
      killFill();
      if (mainTl) mainTl.kill();

      if (!hasGsap) { startFill(); return; }        // CSS drives the swap
      if (reduce)   { showInstant(i); startFill(); return; }

      mainTl = animateTo(prev, i);
      mainTl.eventCallback("onComplete", startFill);
    }

    function updateArrows() {
      if (loop) return;
      if (prevBtn) prevBtn.disabled = active === 0;
      if (nextBtn) nextBtn.disabled = active === items.length - 1;
    }

    // ── Wire controls ─────────────────────────────────────────────
    tabs.forEach(function (tab, idx) {
      if (!tab) return;
      tab.addEventListener("click", function () { go(idx, true); });
      tab.addEventListener("keydown", function (e) {
        var k = e.key;
        if (k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); go(active + 1, true); focusTab(); }
        else if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); go(active - 1, true); focusTab(); }
        else if (k === "Home") { e.preventDefault(); go(0, true); focusTab(); }
        else if (k === "End")  { e.preventDefault(); go(items.length - 1, true); focusTab(); }
        else if (k === "Enter" || k === " ") { e.preventDefault(); go(idx, true); }
      });
    });
    function focusTab() { var t = tabs[active]; if (t) t.focus(); }

    var prevBtn = root.querySelector("[data-ls-prev]");
    var nextBtn = root.querySelector("[data-ls-next]");
    if (prevBtn) {
      if (!prevBtn.getAttribute("aria-label")) prevBtn.setAttribute("aria-label", "Previous story");
      prevBtn.addEventListener("click", function () { go(active - 1, true); });
    }
    if (nextBtn) {
      if (!nextBtn.getAttribute("aria-label")) nextBtn.setAttribute("aria-label", "Next story");
      nextBtn.addEventListener("click", function () { go(active + 1, true); });
    }

    // Pause auto-advance on hover / keyboard focus / tab-away — resume on leave.
    if (autoplay) {
      root.addEventListener("mouseenter", pause);
      root.addEventListener("mouseleave", resume);
      root.addEventListener("focusin", pause);
      root.addEventListener("focusout", function (e) {
        if (!root.contains(e.relatedTarget)) resume();
      });
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) pause(); else resume();
      });
    }

    // ── Initial state ─────────────────────────────────────────────
    render(active);
    updateArrows();
    if (hasGsap) {
      items.forEach(function (it, idx) {
        gsap.set(it, { opacity: idx === active ? 1 : 0, visibility: idx === active ? "visible" : "hidden" });
      });
    }
    root.setAttribute("data-ls-ready", "");
    if (!hasGsap) root.setAttribute("data-ls-plain", "");
    startFill();

    return {
      el: root,
      to: function (i) { go(i, true); },
      next: function () { go(active + 1, true); },
      prev: function () { go(active - 1, true); },
      active: function () { return active; },
      play: function () { paused = false; startFill(); },
      pause: pause,
    };
  }

  /** Initialise every [data-logo-slider] on the page. */
  function initLogoSlider(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-logo-slider]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLogoSlider = initLogoSlider;

})(typeof window !== "undefined" ? window : this);
