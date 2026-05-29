/*!
 * scroll-tabs.js v1.3.0
 * Pinned, scroll-driven tab section (Apollo-style):
 *   1. Big cards collapse into a thin tab bar
 *   2. Section pins
 *   3. Scroll switches the active tab; each panel swaps via height-reveal
 *      (one collapses height→0, the next grows 0→auto)
 * Tabs are clickable (smooth-scroll to their segment) and the timeline snaps.
 *
 * Mobile (≤768px): SAME pinned scroll animation. The tab bar is a horizontal
 * scroll row; the active tab slides into view as the active index changes.
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.heightReveal loaded.
 * Optional : Lenis (Sestek.scrollTo) for click navigation; falls back to native.
 *
 * All timing/behaviour is data-attribute driven — see DOM contract below.
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
   * Initializes a pinned scroll-tabs section.
   *
   * Root element  [data-scroll-tabs] supports:
   *   data-stabs-end      pin scroll distance         (default "400%")
   *   data-stabs-scrub    scrub lag in seconds        (default 0.5)
   *   data-stabs-collapse collapse-phase length, units(default 1)
   *   data-stabs-reveal   per-swap length, units      (default 1)
   *   data-stabs-dwell    per-tab hold length, units  (default 1.5)
   *   data-stabs-snap     snap to tabs "true"/"false" (default true)
   *   data-stabs-ease     ease for collapse + swaps   (default "power2.inOut")
   *
   * Children:
   *   [data-stabs-bar]            the card row that collapses into a tab bar
   *   [data-stabs-tab="i"]        a tab/card (i = 0-based index)
   *   [data-stabs-desc]           text that collapses during phase 1
   *   [data-stabs-icon]           icon that collapses during phase 1
   *   [data-stabs-panel="i"]      content panel matching tab i
   *
   * @param {string} [selector="[data-scroll-tabs]"]
   */
  function initScrollTabs(selector) {
    var root = document.querySelector(selector || "[data-scroll-tabs]");
    if (!root) { console.warn("[Sestek ScrollTabs] No [data-scroll-tabs] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek ScrollTabs] GSAP + ScrollTrigger required."); return;
    }
    if (typeof Sestek === "undefined" || typeof Sestek.heightReveal !== "function") {
      console.error("[Sestek ScrollTabs] Sestek.heightReveal required (load height-reveal.js)."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var tabs   = Array.from(root.querySelectorAll("[data-stabs-tab]"));
    var panels = Array.from(root.querySelectorAll("[data-stabs-panel]"));
    var descs  = Array.from(root.querySelectorAll("[data-stabs-desc]"));
    var icons  = Array.from(root.querySelectorAll("[data-stabs-icon]"));

    var n = panels.length;
    if (!n || tabs.length !== n) {
      console.warn("[Sestek ScrollTabs] Need matching [data-stabs-tab] and [data-stabs-panel] counts.");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var endDist  = root.getAttribute("data-stabs-end") || "400%";
    var scrub    = num(root, "data-stabs-scrub", 0.5);
    var collapse = num(root, "data-stabs-collapse", 1);
    var reveal   = num(root, "data-stabs-reveal", 1);
    var dwell    = num(root, "data-stabs-dwell", 1.5);
    var snapOn   = root.getAttribute("data-stabs-snap") !== "false";
    var ease     = root.getAttribute("data-stabs-ease") || "power2.inOut";

    var reduce   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mqMobile = window.matchMedia("(max-width: 768px)");

    // Reduced-motion: static, click-to-switch, no animation
    if (reduce) { buildStatic(); return; }

    // ── Shared state ──────────────────────────────────────────────
    var activeST    = null;
    var snapPts     = [];   // snap targets as progress 0..1
    var totalUnits  = 0;    // timeline length in units
    var clickTarget = null; // forces snapResolver during a click scroll
    var clickTimer  = null;
    var curActive   = -1;   // last applied active index (avoids redundant work)

    // ── Snap resolver ─────────────────────────────────────────────
    /** Nearest snap point, or the click target while a jump is in flight. */
    function snapResolver(value) {
      if (clickTarget != null) return clickTarget;
      if (!snapPts.length) return value;
      var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
      for (var i = 1; i < snapPts.length; i++) {
        var d = Math.abs(value - snapPts[i]);
        if (d < bestD) { bestD = d; best = snapPts[i]; }
      }
      return best;
    }

    /** Toggle the active tab; on mobile slide that tab into view (only when changed). */
    function setActive(idx) {
      if (idx === curActive) return;
      curActive = idx;
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle("is-active", i === idx);
      }
      // Mobile: slide the active chip into the centre of the horizontal bar.
      // block:"nearest" prevents any vertical page scroll (would fight the pin).
      if (mqMobile.matches && tabs[idx]) {
        tabs[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    /** Which tab is active at timeline-time t (in units). */
    function activeFromTime(t) {
      if (t <= collapse) return 0;
      var idx = 0;
      for (var i = 1; i < n; i++) {
        var mid = collapse + dwell + (i - 1) * (reveal + dwell) + reveal / 2;
        if (t >= mid) idx = i;
      }
      return idx;
    }

    // ── Build the pinned scroll-driven timeline (all viewports) ───
    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      gsap.set(panels, { clearProps: "all" });
      if (descs.length) gsap.set(descs, { clearProps: "all" });
      if (icons.length) gsap.set(icons, { clearProps: "all" });
      root.classList.remove("is-collapsed");
      curActive = -1;

      var heights = panels.map(function (p) {
        p.style.height = "auto";
        return p.offsetHeight;
      });
      panels.forEach(function (p, i) {
        if (i === 0) gsap.set(p, { height: heights[0], autoAlpha: 1 });
        else         gsap.set(p, { height: 0, autoAlpha: 0 });
      });
      setActive(0);

      var total = collapse + (n - 1) * reveal + n * dwell;
      totalUnits = total;

      // Snap targets = each tab's resting dwell centre.
      // No standalone "0" rest point: sits too close to tab-0 → indecisive feel.
      snapPts = [];
      for (var i = 0; i < n; i++) {
        var centre = collapse + i * (reveal + dwell) + dwell / 2;
        snapPts.push(centre / total);
      }

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + endDist,
          pin: true,
          scrub: scrub,
          anticipatePin: 0,
          snap: snapOn ? {
            // Function form: nearest point, or the click target when a tab-click
            // is in flight so snap cooperates rather than fights Lenis.
            snapTo: snapResolver,
            // min ≥ scrub: scrub lag finishes inside the snap animation
            // window — both settle at the same time, no double-jump feel.
            duration: { min: 0.55, max: 0.9 },
            ease: "power2.inOut",
            delay: 0.12,
            // Always snap to NEAREST regardless of scroll direction.
            directional: false,
          } : false,
          onUpdate: function (self) {
            var t = self.progress * total;
            root.classList.toggle("is-collapsed", t >= collapse * 0.5);
            setActive(activeFromTime(t));
          },
          onLeaveBack: function () {
            root.classList.remove("is-collapsed");
            setActive(0);
          },
        },
      });

      // ── Phase 1: cards collapse into the tab bar ─────────────────
      if (descs.length) {
        tl.to(descs, { height: 0, autoAlpha: 0, marginTop: 0, ease: ease, duration: collapse }, 0);
      }
      if (icons.length) {
        tl.to(icons, { height: 0, autoAlpha: 0, scale: 0.7, marginBottom: 0, ease: ease, duration: collapse }, 0);
      }

      // ── Phase 2..n: panel swaps via height-reveal ─────────────────
      var cursor = collapse + dwell;
      for (var j = 1; j < n; j++) {
        tl.add(
          Sestek.heightReveal(panels[j - 1], panels[j], {
            duration: reveal,
            ease: ease,
            inHeight: heights[j],
          }),
          cursor
        );
        cursor += reveal + dwell;
      }

      if (tl.duration() < total) {
        tl.to({}, { duration: total - tl.duration() });
      }

      activeST = tl.scrollTrigger;
    }

    /** Click a tab → smooth-scroll to its dwell-centre (= exact snap point). */
    function jumpTo(idx) {
      if (!activeST) return;
      var st = activeST;
      var progress = (collapse + idx * (reveal + dwell) + dwell / 2) / totalUnits;
      var y = st.start + (st.end - st.start) * progress;

      // Lock snap resolver to this exact target for the duration of the scroll
      // so ScrollTrigger's snap agrees with the click instead of fighting Lenis.
      clickTarget = progress;
      if (clickTimer) clearTimeout(clickTimer);

      var dur = 1.0;
      if (typeof Sestek.scrollTo === "function" && global.lenisInstance) {
        Sestek.scrollTo(y, {
          duration: dur,
          easing: function (t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; },
        });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }

      clickTimer = setTimeout(function () { clickTarget = null; }, dur * 1000 + 120);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { jumpTo(i); });
    });

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      root.classList.add("is-collapsed", "is-static");
      panels.forEach(function (p, i) {
        gsap.set(p, { height: i === 0 ? "auto" : 0, autoAlpha: i === 0 ? 1 : 0 });
      });
      if (descs.length) gsap.set(descs, { height: 0, autoAlpha: 0 });
      if (icons.length) gsap.set(icons, { height: 0, autoAlpha: 0 });
      setActive(0);

      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () {
          panels.forEach(function (p, j) {
            gsap.set(p, { height: j === i ? "auto" : 0, autoAlpha: j === i ? 1 : 0 });
          });
          setActive(i);
        });
      });
    }

    build();

    // Rebuild on resize — handles orientation change and viewport switches
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 180);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollTabs = initScrollTabs;

})(typeof window !== "undefined" ? window : this);
