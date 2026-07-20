/*!
 * tab-stack.js v1.1.3
 * Pinned tab section with stacking panels (qount.io-style):
 *   • The section pins; a tab bar sits at its very top.
 *   • A full-width progress bar ([data-tstack-progress], typically the
 *     bar's bottom edge) fills 1:1 with the WHOLE section's scroll.
 *     Optional per-tab fills: give a tab its own [data-tstack-track] and
 *     that tab's segment drives it instead.
 *   • Panels are stacked in one spot. The next panel slides UP from below
 *     while the active one exits completely — scales down and dims over
 *     most of the swap, then fades out entirely (classic GSAP stacked-
 *     sections pattern). Scrolling back reverses the exact same tween —
 *     scroll-direction agnostic.
 *   • Tabs are clickable (smooth-scroll to their segment) and the timeline
 *     snaps to each tab's dwell-centre, same UX as scroll-tabs.js.
 *   • Auto-hiding navbar ([data-nav-autohide]): by DEFAULT the pinned tab
 *     bar stays put and the returning nav simply slides OVER it (nav is
 *     fixed + higher z) — zero layout shift, zero overlap artefacts.
 *     Opt-in `data-tstack-nav-offset="push"` restores the yield dance
 *     (bar slides down by the nav's height while the nav is visible);
 *     only use it when the stage content clears the bar comfortably,
 *     otherwise the translated bar cuts across the panels.
 *
 * Requires : gsap + ScrollTrigger registered.
 * Optional : Lenis (Sestek.scrollTo) for click navigation; falls back to
 *            native window.scrollTo. nav.js for the nav-offset dance.
 * CSS      : css/components/tab-stack.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-tab-stack]                    root (the pinned section)
 *     [data-tstack-bar]                 tab bar — first child, top of section
 *       [data-tstack-tab="0"]           a tab (0-based index)
 *       [data-tstack-tab="1"]           …
 *       [data-tstack-progress]          full-width progress track (thin line
 *                                       across the bar's bottom edge); its
 *                                       [data-tstack-fill] is auto-created.
 *                                       Optional per-tab variant: put a
 *                                       [data-tstack-track] inside a tab.
 *     [data-tstack-stage]               panel stage — panels stack in one cell
 *       [data-tstack-panel="0"]         a panel; MUST have its own opaque
 *                                       background (it gets covered/covers)
 *       [data-tstack-panel="1"]         …
 *
 * Root attributes (all optional):
 *   data-tstack-end          pin scroll distance              (default "400%")
 *   data-tstack-scrub        scrub lag in seconds             (default 0.5)
 *   data-tstack-dwell        per-tab hold length, units       (default 1.5)
 *   data-tstack-swap         per-cover length, units          (default 1)
 *   data-tstack-snap         snap to tabs "true"/"false"      (default true)
 *   data-tstack-ease         ease for the cover motion        (default "power3.inOut")
 *   data-tstack-cover-scale  scale the exiting panel shrinks to  (default 0.8)
 *   data-tstack-cover-fade   opacity it dims to before vanishing (default 0.5)
 *   data-tstack-drift        yPercent the exiting panel drifts up while
 *                            being covered — parallax depth      (default 8)
 *   data-tstack-click-dur    tab-click scroll duration in seconds for a
 *                            full-length jump; shorter jumps scale down
 *                            proportionally (default 1.4)
 *   data-tstack-nav-offset   "push" — while pinned, the bar yields the
 *                            nav's height whenever the nav is visible
 *                            (default: off; the nav overlays the bar)
 *   data-tstack-priority     ScrollTrigger refreshPriority — set per the
 *                            page's pin stacking order (top pin = highest),
 *                            see PROJECT.md "Pinli Bölüm Kuralları"
 *                            (default 1)
 *
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.1.3 — refreshPriority is now data-tstack-priority (default 1) so pages
 *          stacking multiple pins can order refreshes per PROJECT.md's
 *          "Pinli Bölüm Kuralları" (top pin = highest priority).
 * v1.1.2 — premium tab-click scroll: the native window.scrollTo smooth
 *          fallback ignored distance (browser-timed, ~0.4s — felt broken
 *          on long pins). Clicks are now driven by a GSAP tween with a
 *          distance-proportional duration (clamped, power3.inOut glide),
 *          tunable via data-tstack-click-dur; the Lenis path uses the
 *          same duration so both feel identical.
 * v1.1.1 — navbar coordination default flipped: the returning nav now just
 *          overlays the pinned bar (no movement). The old yield-the-nav-
 *          height dance translated the bar down INTO the stage, where it
 *          cut across panel content/progress under transformed stacking
 *          contexts (visible glitch on scroll-up). It remains available
 *          as an explicit opt-in: data-tstack-nav-offset="push".
 * v1.1.0 — full-width [data-tstack-progress] bar driven by the WHOLE
 *          section's progress (per-tab [data-tstack-track] fills stay as an
 *          opt-in); the covered panel now exits COMPLETELY — scale + dim
 *          over 90% of the swap, then fade to 0 (autoAlpha) — matching the
 *          classic GSAP stacked-sections pattern; cover-scale default
 *          0.94 → 0.8 for a more pronounced recede.
 * v1.0.1 — enforce the stacking layout (stage grid + every panel in cell 1/1)
 *          via inline styles at init. Webflow Designer grids assign per-element
 *          #w-node-… grid-area rules whose ID specificity beats any stylesheet
 *          selector, scattering panels into separate cells; inline styles win
 *          over everything, so the stack now survives any Designer layout.
 * v1.0.0 — initial release
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
   * Initializes a pinned tab-stack section.
   * @param {string} [selector="[data-tab-stack]"]
   */
  function initTabStack(selector) {
    var root = document.querySelector(selector || "[data-tab-stack]");
    if (!root) { console.warn("[Sestek TabStack] No [data-tab-stack] found."); return; }
    if (root._tabStackInit) return;                       // idempotent — no duplicate triggers
    root._tabStackInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek TabStack] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var bar    = root.querySelector("[data-tstack-bar]");
    var stage  = root.querySelector("[data-tstack-stage]");
    var tabs   = Array.from(root.querySelectorAll("[data-tstack-tab]"));
    var panels = Array.from(root.querySelectorAll("[data-tstack-panel]"));

    var n = panels.length;
    if (!n || tabs.length !== n) {
      console.warn("[Sestek TabStack] Need matching [data-tstack-tab] and [data-tstack-panel] counts.");
      return;
    }

    /** Find/create a [data-tstack-fill] inside a track element. */
    function ensureFill(track) {
      if (!track) return null;
      var fill = track.querySelector("[data-tstack-fill]");
      if (!fill) {
        fill = document.createElement("span");
        fill.setAttribute("data-tstack-fill", "");
        track.appendChild(fill);
      }
      return fill;
    }

    // Global full-width progress bar — fills 1:1 with the WHOLE section's
    // scroll. Colour comes from CSS (--tstack-fill-color etc.).
    var progressFill = ensureFill(root.querySelector("[data-tstack-progress]"));

    // Optional per-tab fills (a [data-tstack-track] inside a tab) — each is
    // driven by its own tab's segment instead. May all be null — guarded.
    var fills = tabs.map(function (tab) {
      return ensureFill(tab.querySelector("[data-tstack-track]"));
    });

    // ── Config from data-attributes ───────────────────────────────
    var endDist    = root.getAttribute("data-tstack-end") || "400%";
    var scrub      = num(root, "data-tstack-scrub", 0.5);
    var dwell      = num(root, "data-tstack-dwell", 1.5);
    var swap       = num(root, "data-tstack-swap", 1);
    var snapOn     = root.getAttribute("data-tstack-snap") !== "false";
    var ease       = root.getAttribute("data-tstack-ease") || "power3.inOut";
    var coverScale = num(root, "data-tstack-cover-scale", 0.8);
    var coverFade  = num(root, "data-tstack-cover-fade", 0.5);
    var drift      = num(root, "data-tstack-drift", 8);
    var clickDur   = num(root, "data-tstack-click-dur", 1.4);
    var priority   = num(root, "data-tstack-priority", 1);

    var reduce   = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mqMobile = window.matchMedia("(max-width: 768px)");

    // ── Layout hardening (Webflow-proof) ──────────────────────────
    // The stack REQUIRES: stage = single-cell grid clipping its overflow,
    // every panel in cell 1/1. A Webflow Designer grid on the stage assigns
    // per-element #w-node-… grid-area rules whose ID specificity beats any
    // stylesheet selector and scatters panels into separate cells. Inline
    // styles outrank everything, so enforce the layout here and it survives
    // whatever the Designer says.
    function enforceLayout() {
      if (stage) {
        stage.style.display             = "grid";
        stage.style.gridTemplateColumns = "1fr";   // kill Designer's 2×2 default
        stage.style.gridTemplateRows    = "auto";
        stage.style.overflow            = "hidden";
        if (getComputedStyle(stage).position === "static") {
          stage.style.position = "relative";
        }
      }
      panels.forEach(function (p) {
        p.style.gridArea = "1 / 1";
        p.style.minWidth = "0";
        if (getComputedStyle(p).position === "static") {
          p.style.position = "relative";
        }
      });
    }

    // ── Navbar coordination (opt-in) ──────────────────────────────
    // Default: no movement — the fixed nav simply slides over the pinned
    // bar and off again. With data-tstack-nav-offset="push", the bar
    // yields the nav's height (.nav--hidden watched on [data-nav]) while
    // the section is pinned and the nav is visible.
    var navEl    = document.querySelector("[data-nav]");
    var navBarEl = navEl ? navEl.querySelector("[data-nav-bar]") : null;
    var navSync  = !!navEl && root.getAttribute("data-tstack-nav-offset") === "push";
    var pinned   = false;

    function barOffset() {
      if (!navSync || !pinned) return 0;
      if (navEl.classList.contains("nav--hidden")) return 0;
      return (navBarEl && navBarEl.offsetHeight) || navEl.offsetHeight || 0;
    }

    function syncBarOffset(instant) {
      if (!bar) return;
      var y = barOffset();
      if (instant || reduce) gsap.set(bar, { y: y });
      else gsap.to(bar, { y: y, duration: 0.5, ease: "power3.out", overwrite: "auto" });
    }

    var navObserver = null;
    if (navSync && "MutationObserver" in window) {
      navObserver = new MutationObserver(function () { syncBarOffset(); });
      navObserver.observe(navEl, { attributes: true, attributeFilter: ["class"] });
    }

    // Reduced-motion: static, click-to-switch, no pin/animation
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
        tabs[i].setAttribute("aria-selected", i === idx ? "true" : "false");
      }
      // Mobile: slide the active tab into the centre of the horizontal bar.
      // block:"nearest" prevents any vertical page scroll (would fight the pin).
      if (mqMobile.matches && tabs[idx]) {
        tabs[idx].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }

    /** Which tab is active at timeline-time t (in units) — flips mid-cover. */
    function activeFromTime(t) {
      var idx = 0;
      for (var i = 1; i < n; i++) {
        var mid = dwell + (i - 1) * (swap + dwell) + swap / 2;
        if (t >= mid) idx = i;
      }
      return idx;
    }

    // ── Build the pinned scroll-driven timeline ───────────────────
    function build() {
      if (activeST) { activeST.kill(); activeST = null; }

      gsap.set(panels, { clearProps: "all" });
      fills.forEach(function (f) { if (f) gsap.set(f, { clearProps: "all" }); });
      if (progressFill) gsap.set(progressFill, { clearProps: "all" });
      enforceLayout();   // after clearProps — it must never be wiped
      curActive = -1;

      // Panels stack in one grid cell; every panel after the first waits one
      // own-height below the stage (clipped by the stage's overflow:hidden).
      panels.forEach(function (p, i) {
        gsap.set(p, i === 0
          ? { yPercent: 0, scale: 1, autoAlpha: 1 }
          : { yPercent: 100, scale: 1, autoAlpha: 1 });
      });
      fills.forEach(function (f) { if (f) gsap.set(f, { scaleX: 0 }); });
      if (progressFill) gsap.set(progressFill, { scaleX: 0 });
      root.classList.add("is-ready");
      setActive(0);

      var total = n * dwell + (n - 1) * swap;
      totalUnits = total;

      // Snap targets = each tab's resting dwell centre.
      snapPts = [];
      for (var i = 0; i < n; i++) {
        snapPts.push((i * (dwell + swap) + dwell / 2) / total);
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
          // Pins add huge pin-spacing to the document — refresh order MUST
          // follow page order (top pin first). Set per page via
          // data-tstack-priority (PROJECT.md "Pinli Bölüm Kuralları").
          refreshPriority: priority,
          snap: snapOn ? {
            snapTo: snapResolver,
            // min ≥ scrub: scrub lag finishes inside the snap window —
            // both settle at the same time, no double-jump feel.
            duration: { min: 0.55, max: 0.9 },
            ease: "power2.inOut",
            delay: 0.12,
            directional: false,
          } : false,
          onUpdate: function (self) {
            setActive(activeFromTime(self.progress * total));
          },
          onToggle: function (self) {
            pinned = self.isActive;
            root.classList.toggle("is-pinned", pinned);
            syncBarOffset();
          },
          onLeaveBack: function () { setActive(0); },
        },
      });

      // ── Covers: panel j slides up while panel j-1 exits completely ──
      // Classic GSAP stacked-sections feel: the outgoing panel scales down
      // + dims over 90% of the swap, then fades out entirely in the last
      // 10% — by the time the new panel has landed, the old one is GONE.
      for (var j = 1; j < n; j++) {
        var at = dwell + (j - 1) * (swap + dwell);
        // Incoming panel rises from below the stage…
        tl.fromTo(panels[j],
          { yPercent: 100 },
          { yPercent: 0, duration: swap, ease: ease },
          at
        );
        tl.to(panels[j - 1],
          { scale: coverScale, autoAlpha: coverFade, yPercent: -drift, duration: swap * 0.9, ease: ease },
          at
        );
        tl.to(panels[j - 1],
          { autoAlpha: 0, duration: swap * 0.1, ease: "none" },
          at + swap * 0.9
        );
      }

      // ── Progress: linear, mapped 1:1 to scroll ───────────────────
      // Global bar spans the whole timeline — full page width, fills as the
      // section plays out.
      if (progressFill) {
        tl.fromTo(progressFill,
          { scaleX: 0 },
          { scaleX: 1, duration: total, ease: "none" },
          0
        );
      }
      // Opt-in per-tab fills: tab i's fill spans its dwell + the cover to
      // the next tab, so it hits 100% exactly when the cover completes.
      for (var k = 0; k < n; k++) {
        if (!fills[k]) continue;
        var segStart = k * (dwell + swap);
        var segLen   = (k < n - 1) ? dwell + swap : dwell;
        tl.fromTo(fills[k],
          { scaleX: 0 },
          { scaleX: 1, duration: segLen, ease: "none" },
          segStart
        );
      }

      if (tl.duration() < total) {
        tl.to({}, { duration: total - tl.duration() });
      }

      activeST = tl.scrollTrigger;
    }

    /** Click a tab → smooth-scroll to its dwell-centre (= exact snap point). */
    var clickTween = null;

    function jumpTo(idx) {
      if (!activeST) return;
      var st = activeST;
      var progress = (idx * (dwell + swap) + dwell / 2) / totalUnits;
      var y = st.start + (st.end - st.start) * progress;

      // Distance-proportional duration: a full-length jump takes clickDur,
      // shorter hops scale down but never below 65% of it — even adjacent
      // tabs glide instead of teleporting. One knob (data-tstack-click-dur)
      // scales the whole feel.
      var cur     = window.pageYOffset || document.documentElement.scrollTop || 0;
      var span    = Math.max(1, st.end - st.start);
      var dur     = clickDur * Math.max(0.65, Math.min(1, Math.abs(y - cur) / span));

      // Lock the snap resolver to this exact target for the duration of the
      // scroll so ScrollTrigger's snap agrees with the click instead of
      // fighting the scroll driver.
      clickTarget = progress;
      if (clickTimer) clearTimeout(clickTimer);
      if (clickTween) { clickTween.kill(); clickTween = null; }

      if (typeof Sestek.scrollTo === "function" && global.lenisInstance) {
        Sestek.scrollTo(y, {
          duration: dur,
          easing: function (t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; },
        });
      } else {
        // GSAP-driven fallback — native window.scrollTo({behavior:"smooth"})
        // is browser-timed (~0.4s regardless of distance) and feels broken
        // on long pinned sections.
        var proxy = { y: cur };
        clickTween = gsap.to(proxy, {
          y: y,
          duration: dur,
          ease: "power3.inOut",
          onUpdate: function () { window.scrollTo(0, proxy.y); },
          onComplete: function () { clickTween = null; },
        });
      }

      clickTimer = setTimeout(function () { clickTarget = null; }, dur * 1000 + 120);
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { jumpTo(i); });
    });

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      enforceLayout();
      root.classList.add("is-static", "is-ready");

      function show(idx) {
        panels.forEach(function (p, i) {
          gsap.set(p, { yPercent: 0, scale: 1, autoAlpha: i === idx ? 1 : 0 });
        });
        fills.forEach(function (f, i) {
          if (f) gsap.set(f, { scaleX: i <= idx ? 1 : 0 });
        });
        if (progressFill) gsap.set(progressFill, { scaleX: (idx + 1) / n });
        tabs.forEach(function (t, i) {
          t.classList.toggle("is-active", i === idx);
          t.setAttribute("aria-selected", i === idx ? "true" : "false");
        });
      }

      show(0);
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { show(i); });
      });
    }

    build();

    // Rebuild on resize — handles orientation change and viewport switches.
    // After rebuild the pin's spacing changes, which shifts the absolute
    // start/end of every trigger below it — refresh them all.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
        syncBarOffset(true);
      }, 180);
    });

    // ── Public cleanup ────────────────────────────────────────────
    root._tabStackDestroy = function () {
      if (activeST) activeST.kill();
      if (navObserver) navObserver.disconnect();
      if (clickTimer) clearTimeout(clickTimer);
      if (clickTween) clickTween.kill();
    };
  }

  global.Sestek              = global.Sestek || {};
  global.Sestek.initTabStack = initTabStack;

})(typeof window !== "undefined" ? window : this);
