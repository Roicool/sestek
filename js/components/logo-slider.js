/*!
 * logo-slider.js v1.1.0
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
 * Hovering the slides PANEL or the tab bar (not the whole section), keyboard
 * focus, or a hidden tab pauses the fill; leaving the panel/tabs resumes it.
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
 * Webflow only lets you author markup INSIDE Collection Items — never in the
 * Collection Wrapper or Collection List. So the root is NOT the Collection
 * Wrapper: it is a plain Div Block that WRAPS the whole thing. Each item authors
 * its own logo tab / background / panel; at runtime JS gathers every item's tab
 * into one shared bar that is a NORMAL row in the root flow (not overlaid).
 *
 *   [data-logo-slider]                        ← plain Div Block = root
 *
 *     [data-ls-bg-wrap]                       ← OPTIONAL full-section background.
 *       (JS injects one cross-fading <img> per      Present → "section bg mode":
 *        brand here; add your overlays below)        the bg fills the whole section
 *       [data-ls-overlay] / fluted-glass            behind everything and swaps per
 *       [data-noise]                                 slide. Omit → per-item bg mode.
 *
 *     (optional static header — title, subtitle, "See all" — authored freely)
 *
 *     [data-ls-prev]  <button>                ← optional arrows, anywhere in root
 *     [data-ls-next]  <button>                   (e.g. top-right)
 *
 *     [data-ls-tabs]                          ← empty Div Block, a normal tabs row;
 *                                                JS fills it with the logo tabs.
 *                                                Style/position it freely. (Auto-
 *                                                created before the list if omitted.)
 *
 *     [Collection List Wrapper]               ← the Webflow CMS block
 *       [Collection List]  role="list"        ← the stage (JS tags data-ls-stage)
 *         [data-ls-item]   role="listitem"    ← Collection Item = one brand/slide
 *           [data-ls-tab]                       ← logo trigger, MOVED into the tab bar
 *             data-ls-color="#EC6608"           ← OPTIONAL: brand colour (CMS field)
 *                                                 the fill bar draws in; on the item works too
 *             <img data-ls-logo src="…" alt="Brand">  ← PNG; greyscale until active/hover
 *             [data-ls-fill]                    ← the auto-advance progress bar
 *                                                 (fills centre-out in --ls-color)
 *           [data-ls-bg]                        ← per-item background (default mode).
 *             <img src="…" alt="" loading="lazy">   In section-bg mode JS reads this
 *             [data-ls-overlay]                 ← img's src (or [data-ls-bg-img], or
 *             (add data-grain + Sestek.initGrain)   data-ls-bg-src on the item) and
 *                                                   hides this in-item layer.
 *           [data-ls-panel]                     ← content (stacked, staggered in)
 *             [data-ls-anim] …                  ← OPTIONAL: mark which children
 *                                                 animate; default = panel's children
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

    // The Collection List Wrapper — the top-level block under the root holding
    // the CMS list. Author the tab bar / arrows OUTSIDE it (root children).
    var cmsBlock = stage;
    while (cmsBlock.parentElement && cmsBlock.parentElement !== root) {
      cmsBlock = cmsBlock.parentElement;
    }

    // ── Tab bar: every item's [data-ls-tab] is gathered into one row so all the
    //    logos are visible at once. The bar is a NORMAL element in the root flow
    //    (author an empty [data-ls-tabs] where you want it, and style it freely);
    //    it is NOT overlaid on the slides. With section-bg mode the background is
    //    already behind everything, so the tabs sit over it naturally; in per-item
    //    mode the bar reads as a tabs row above the content. If you omit it, JS
    //    creates one just before the CMS block.
    var tabsBar = root.querySelector("[data-ls-tabs]");
    if (!tabsBar) {
      tabsBar = document.createElement("div");
      tabsBar.setAttribute("data-ls-tabs", "");
      root.insertBefore(tabsBar, cmsBlock);
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

      // Per-brand fill colour → exposed as the --ls-color custom property so the
      // fill bar draws in that brand's own colour. Two ways to supply it:
      //   1) data-ls-color="#hex" attribute on the tab/item (bind a CMS TEXT field)
      //   2) an empty [data-ls-color] element inside the tab/item whose BACKGROUND
      //      is bound to a CMS Colour field (Webflow can't bind a colour to an
      //      attribute value, but it can to a background) — JS reads its computed
      //      background-colour. Hide that element (display:none) in the Designer.
      if (tab) {
        var color = tab.getAttribute("data-ls-color") || item.getAttribute("data-ls-color");
        if (!color) {
          var srcEl = tab.querySelector("[data-ls-color]") || item.querySelector("[data-ls-color]");
          if (srcEl) {
            var bg = getComputedStyle(srcEl).backgroundColor;
            if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") color = bg;
          }
        }
        if (color) tab.style.setProperty("--ls-color", color.trim());
      }

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

    // ── Section background (optional) ─────────────────────────────
    // If a [data-ls-bg-wrap] exists at the root, the slider runs in "section
    // background" mode: instead of each slide showing its own [data-ls-bg] in
    // the stage cell, JS reads every brand's background image and builds a stack
    // of cross-fading layers filling the WHOLE section, behind everything. The
    // active brand's layer fades in on switch. Author your fluted-glass / noise /
    // gradient overlays as children of [data-ls-bg-wrap] — they sit above the
    // images but below the content. (Webflow-legal: the wrap is a plain Div Block
    // in the root; the images are cloned at runtime.)
    var bgWrap = root.querySelector("[data-ls-bg-wrap]");
    var bgLayers = [];
    if (bgWrap) {
      root.setAttribute("data-ls-bg-section", "");
      bgWrap.setAttribute("aria-hidden", "true");
      // Insert the images before the first authored child (your overlays) so the
      // images stay in item order AND every overlay keeps painting above them.
      var bgAnchor = bgWrap.firstChild;
      items.forEach(function (item) {
        var srcEl = item.querySelector("[data-ls-bg-img]") || item.querySelector("[data-ls-bg] img");
        var src = (srcEl && srcEl.getAttribute("src")) || item.getAttribute("data-ls-bg-src") || "";
        var layer = document.createElement("img");
        layer.setAttribute("data-ls-bg-layer", "");
        layer.setAttribute("role", "presentation");
        layer.setAttribute("aria-hidden", "true");
        layer.setAttribute("loading", "lazy");
        if (src) layer.src = src;
        layer.style.opacity = "0";
        bgWrap.insertBefore(layer, bgAnchor);
        bgLayers.push(layer);
      });
    }

    function setSectionBg(i, animate) {
      if (!bgLayers.length) return;
      var dur = (animate && !reduce && hasGsap) ? fade : 0;
      bgLayers.forEach(function (layer, idx) {
        var on = idx === i;
        if (hasGsap) gsap.to(layer, { opacity: on ? 1 : 0, duration: dur, ease: ease, overwrite: "auto" });
        else layer.style.opacity = on ? "1" : "0";
      });
    }

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

    /** Static state: full bar on the active tab, empty elsewhere. Used when the
     *  fill isn't animating (autoplay off / no GSAP) so it still reads as the
     *  active indicator — the coloured segment under the reference's active tab. */
    function showActiveFill() {
      fills.forEach(function (f, idx) {
        if (!f) return;
        var on = idx === active;
        if (hasGsap) gsap.set(f, { transformOrigin: "center center", scaleX: on ? 1 : 0 });
        else f.style.transform = on ? "scaleX(1)" : "scaleX(0)";
      });
    }

    function startFill() {
      // Not auto-advancing (or no GSAP): show the active bar full, statically.
      if (!hasGsap || !autoplay) { showActiveFill(); return; }
      killFill();
      if (paused) return;
      var f = fills[active];
      var advance = function () { go(active + 1, false); };
      if (f) {
        gsap.set(f, { transformOrigin: "center center", scaleX: 0 });
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
      setSectionBg(i, true);
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
      // Scope the hover-pause to the actual slider PANEL (the slides block) plus
      // the tab bar — NOT the whole root. In section-bg mode the root fills the
      // entire section, so binding hover to it paused the moment the pointer was
      // anywhere in that huge area and only "resumed" once you left it — which,
      // for a full-bleed section, effectively never happened (it looked like the
      // autoslide only came back after you clicked a tab, because a click restarts
      // the fill directly). Watching just the panel + tabs keeps the pause tight
      // and makes it resume the instant the pointer leaves the slides/logos.
      var hoverZones = [cmsBlock];
      if (tabsBar && tabsBar !== cmsBlock) hoverZones.push(tabsBar);

      // One shared "over the panel" count across the zones. Moving directly from
      // one zone to an adjacent one fires leave-then-enter, so a plain resume on
      // every leave would flicker; defer the resume a frame and cancel it if the
      // pointer lands on the other zone, so it only fires when truly outside both.
      var hoverCount = 0, resumeFrame = 0;
      function cancelResume() {
        if (resumeFrame) { cancelAnimationFrame(resumeFrame); resumeFrame = 0; }
      }
      function zoneEnter() { hoverCount++; cancelResume(); pause(); }
      function zoneLeave() {
        hoverCount = Math.max(0, hoverCount - 1);
        if (hoverCount > 0) return;
        cancelResume();
        resumeFrame = requestAnimationFrame(function () {
          resumeFrame = 0;
          if (hoverCount === 0) resume();
        });
      }
      hoverZones.forEach(function (zone) {
        zone.addEventListener("mouseenter", zoneEnter);
        zone.addEventListener("mouseleave", zoneLeave);
      });

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
    setSectionBg(active, false);
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
