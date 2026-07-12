/*!
 * fill-bars.js v2.0.0
 * Pinned, scroll-driven "fill bars" section (Attio/Retool-style):
 *   • The section pins.
 *   • LEFT — a vertical rail of markers. Each inactive item is a dot; the active
 *     one morphs into a tall bar whose fill scales (scaleY) with the item's own
 *     scroll progress, and reveals its number (01/02/03…).
 *   • CENTRE — one text panel per item (heading + copy). On every item change the
 *     outgoing panel lifts + fades out and the incoming one settles up into place
 *     with a staggered, spring-like reveal — nothing snaps, everything "lands".
 *   • RIGHT — a fixed background visual plus per-item visuals that crossfade with
 *     a subtle scale-settle as the active item changes. Never clipped.
 *
 * Bars/reveals are transform + opacity only (GPU-composited) — zero layout
 * thrash, 60fps. Fully data-attribute driven; design lives in Webflow.
 *
 * Mobile (≤768px): SAME pinned scroll animation, single column (rail on top).
 *
 * Items are clickable (smooth-scroll to their segment) and the timeline snaps.
 *
 * Requires : gsap + ScrollTrigger registered.
 * Optional : Lenis (Sestek.scrollTo) for click navigation; falls back to native.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-fill-bars]                    root / section
 *     [data-fbar-inner]                 the element that PINS (rail+content+visual)
 *       [data-fbar-rail]                LEFT — the vertical marker rail
 *         [data-fbar-item="0"]          one marker — clickable; gets .is-active
 *           [data-fbar-track]             dot ⇄ bar (morphs when active)
 *             [data-fbar-fill]            the fill (scaleY 0→1) — required
 *           [data-fbar-num]               the number label (01, 02…) — animated
 *         [data-fbar-item="1"]          …
 *       [data-fbar-content]             CENTRE — swapping text panels
 *         [data-fbar-panel="0"]           one panel per item (index matches)
 *           [data-fbar-anim]              each element to settle-reveal (title,
 *           [data-fbar-anim]              copy…); optional — panel is used if none
 *         [data-fbar-panel="1"]         …
 *       [data-fbar-visual]              RIGHT — the visual stage; never clipped
 *         [data-fbar-visual-base]         optional fixed background (always shown)
 *         [data-fbar-vis="0"]             per-item visual — crossfades in when its
 *         [data-fbar-vis="1"]             item is active (index matches the item)
 *
 * Root attributes (all optional):
 *   data-fbar-end     pin scroll distance         (default "300%")
 *   data-fbar-scrub   scrub lag in seconds        (default 0.6)
 *   data-fbar-snap    snap to items "true"/"false"(default true)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /** Parse a numeric data-attribute with a fallback. */
  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Initializes a pinned scroll-driven fill-bars section.
   * @param {string} [selector="[data-fill-bars]"]
   */
  function initFillBars(selector) {
    var root = document.querySelector(selector || "[data-fill-bars]");
    if (!root) { console.warn("[Sestek FillBars] No [data-fill-bars] found."); return; }
    if (root._fillBarsInit) return;                        // idempotent — no duplicate triggers
    root._fillBarsInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek FillBars] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var items   = Array.from(root.querySelectorAll("[data-fbar-item]"));
    var fills   = items.map(function (it) { return it.querySelector("[data-fbar-fill]"); });
    var nums    = items.map(function (it) { return it.querySelector("[data-fbar-num]"); });
    var panels  = Array.from(root.querySelectorAll("[data-fbar-panel]"));
    var visuals = Array.from(root.querySelectorAll("[data-fbar-vis]"));

    var n = items.length;
    if (!n || fills.some(function (f) { return !f; })) {
      console.warn("[Sestek FillBars] Need [data-fbar-item] rows each with a [data-fbar-fill].");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist = root.getAttribute("data-fbar-end") || "300%";
    var scrub   = num(root, "data-fbar-scrub", 0.6);
    var snapOn  = root.getAttribute("data-fbar-snap") !== "false";

    var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Shared state ──────────────────────────────────────────────
    var activeST     = null;
    var totalUnits   = n;      // one unit per item
    var clickTarget  = null;   // forces snapResolver during a click scroll
    var clickTimer   = null;
    var curActive    = -1;     // last applied active index (avoids redundant work)
    var fillSetter   = null;   // gsap.quickSetter for the active bar's scaleY

    // Snap targets = each item's fill CENTRE (progress 0..1).
    var snapPts = [];
    for (var s = 0; s < n; s++) snapPts.push((s + 0.5) / totalUnits);

    /** Nearest snap point, or the click target while a jump is in flight. */
    function snapResolver(value) {
      if (clickTarget != null) return clickTarget;
      var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
      for (var i = 1; i < snapPts.length; i++) {
        var d = Math.abs(value - snapPts[i]);
        if (d < bestD) { bestD = d; best = snapPts[i]; }
      }
      return best;
    }

    // ── The "settle into place" swap ──────────────────────────────
    /**
     * Animate the transition from the previous item to idx: the outgoing text
     * panel / number / visual lift + fade; the incoming ones settle up into
     * place with a staggered power3 reveal. Non-scrubbed — it fires on change,
     * so it feels like each item lands rather than being dragged by scroll.
     */
    function swap(idx, prev) {
      // Exit the outgoing item
      if (prev != null && prev >= 0) {
        if (panels[prev])  gsap.to(panels[prev],  { autoAlpha: 0, y: -24, duration: 0.35, ease: "power2.in", overwrite: true });
        if (visuals[prev]) gsap.to(visuals[prev], { autoAlpha: 0, scale: 1.03, duration: 0.4, ease: "power2.in", overwrite: true });
        if (nums[prev])    gsap.to(nums[prev],    { autoAlpha: 0, y: -16, duration: 0.3, ease: "power2.in", overwrite: true });
      }

      // Enter the incoming item — text settles up, staggered
      if (panels[idx]) {
        var kids = panels[idx].querySelectorAll("[data-fbar-anim]");
        var targets = kids.length ? kids : [panels[idx]];
        gsap.set(panels[idx], { autoAlpha: 1 });
        gsap.fromTo(targets,
          { y: 46, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.75, ease: "power3.out", stagger: 0.08, overwrite: true });
      }
      if (visuals[idx]) {
        gsap.fromTo(visuals[idx],
          { autoAlpha: 0, scale: 1.06 },
          { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out", overwrite: true });
      }
      if (nums[idx]) {
        gsap.fromTo(nums[idx],
          { y: 26, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, ease: "power3.out", overwrite: true });
      }
    }

    /** Toggle the active item + run the swap (only when it actually changes). */
    function setActive(idx) {
      if (idx === curActive) return;
      var prev = curActive;
      curActive = idx;
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-active", i === idx);
      }
      // Point the fast fill setter at the newly-active bar; reset its scale.
      fillSetter = gsap.quickSetter(fills[idx], "scaleY");
      fillSetter(0);
      swap(idx, prev);
    }

    // Reduced-motion: static — first item shown, bars full, no scroll animation.
    if (reduce) { buildStatic(); wireClicks(); return; }

    // ── Build the pinned scroll-driven trigger ────────────────────
    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      gsap.set(fills, { scaleY: 0, transformOrigin: "top center" });
      // Pre-hide panels/visuals so only the active one shows after setActive(0).
      if (panels.length)  gsap.set(panels,  { autoAlpha: 0 });
      if (visuals.length) gsap.set(visuals, { autoAlpha: 0 });
      curActive = -1;
      setActive(0);

      activeST = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "+=" + endDist,
        pin: "[data-fbar-inner]",
        scrub: scrub,
        anticipatePin: 0,
        // Pins add pin-spacing to the document. Refresh this BEFORE any trigger
        // below it (e.g. [data-reveal]) so those resolve their start/end against
        // the post-pin document height. See docs/PROJECT.md → refreshPriority.
        refreshPriority: 1,
        snap: snapOn ? {
          snapTo: snapResolver,
          duration: { min: 0.4, max: 0.8 },
          ease: "power2.inOut",
          delay: 0.1,
          directional: false,
        } : false,
        onUpdate: function (self) {
          var pos = self.progress * totalUnits;
          var idx = Math.min(n - 1, Math.floor(pos));
          setActive(idx);
          // Fill the active bar by its own local progress (resets per item).
          var local = pos - idx;
          if (local < 0) local = 0; else if (local > 1) local = 1;
          if (fillSetter) fillSetter(local);
        },
        onLeaveBack: function () { setActive(0); if (fillSetter) fillSetter(0); },
      });
    }

    /** Click an item → smooth-scroll to its fill-centre (= exact snap point). */
    function jumpTo(idx) {
      if (!activeST) return;
      var st = activeST;
      var progress = (idx + 0.5) / totalUnits;
      var y = st.start + (st.end - st.start) * progress;

      // Lock the snap resolver to this target so snap agrees with the click.
      clickTarget = progress;
      if (clickTimer) clearTimeout(clickTimer);

      var dur = 1.0;
      if (typeof Sestek !== "undefined" && typeof Sestek.scrollTo === "function" && global.lenisInstance) {
        Sestek.scrollTo(y, {
          duration: dur,
          easing: function (t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; },
        });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      clickTimer = setTimeout(function () { clickTarget = null; }, dur * 1000 + 120);
    }

    function wireClicks() {
      items.forEach(function (item, i) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () { jumpTo(i); });
      });
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      root.classList.add("is-static");
      gsap.set(fills, { scaleY: 1, transformOrigin: "top center" });
      if (panels.length)  gsap.set(panels,  { autoAlpha: 0 });
      if (visuals.length) gsap.set(visuals, { autoAlpha: 0 });
      // Show only the first item, no reveal animation.
      curActive = 0;
      items.forEach(function (it, i) { it.classList.toggle("is-active", i === 0); });
      if (panels[0])  gsap.set(panels[0],  { autoAlpha: 1, clearProps: "transform" });
      if (visuals[0]) gsap.set(visuals[0], { autoAlpha: 1 });
      // Clicking an item just swaps which one is shown (instant).
      items.forEach(function (item, i) {
        item.style.cursor = "pointer";
        item.addEventListener("click", function () {
          items.forEach(function (it, j) { it.classList.toggle("is-active", j === i); });
          if (panels.length)  gsap.set(panels,  { autoAlpha: 0 });
          if (visuals.length) gsap.set(visuals, { autoAlpha: 0 });
          if (panels[i])  gsap.set(panels[i],  { autoAlpha: 1 });
          if (visuals[i]) gsap.set(visuals[i], { autoAlpha: 1 });
        });
      });
    }

    build();
    wireClicks();

    // Rebuild on resize — after rebuild the pin's spacing changes, shifting the
    // absolute start/end of every trigger below it; refresh them all so they
    // re-measure against the new document height.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initFillBars = initFillBars;

})(typeof window !== "undefined" ? window : this);
