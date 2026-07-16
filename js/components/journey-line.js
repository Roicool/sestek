/*!
 * journey-line.js v1.3.0
 * v1.1.0: badge reveals are a pure opacity fade — the scale + back.out pop
 *         read badly when the scrub rewinds. Media/copy choreography unchanged.
 * v1.2.0: the fill starts AT badge 1 (step 1 is already open when the pin
 *         catches, so drawing the empty stretch before it was wasted scroll).
 *         Reveal timings re-map to the remaining badge-1 → end range.
 * v1.3.0: ZERO-SHIFT hardening. anticipatePin removed — it flips the pin a
 *         beat early, which reads as a jump-then-settle with Lenis (native
 *         fast-scroll flash, the thing it guards, can't happen under Lenis;
 *         step-scroll.js made the same call). Media boxes with no reserved
 *         height get an aspect-ratio fallback so Webflow's lazy images can't
 *         grow the box on viewport entry (the CLS source), and every late
 *         image load re-seats the line immediately instead of waiting for
 *         the next global refresh.
 * Superpower-style pinned journey steps: the section pins for the whole
 * scroll distance, a full-bleed horizontal line fills with the accent colour
 * (scaleX — no SVG, no path measuring) and each step's badge/media/copy
 * blur-dissolves in the moment the line reaches its badge. Fully scrubbed:
 * scrolling back rewinds every reveal. Step 1 is open from the start; the
 * title (and anything else static inside the section) simply stays put
 * because the whole section is pinned.
 *
 * Design decision (vs process-flow's DrawSVG rail): the line here is straight,
 * so it's a plain div scaled on X. That removes the whole path-generation /
 * viewBox / tween-invalidation layer process-flow needs — resize costs nothing
 * because scaleX is proportional by nature. If the design ever grows curves
 * or step-downs, port layoutRail() from process-flow.js instead.
 *
 * Requires : gsap + ScrollTrigger registered. Smooth scroll is Lenis at the
 *            site level (lenis-init.js drives ScrollTrigger.update).
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-journey-line]              section root (this element pins)
 *     [data-jl-line]                 full-bleed track line (absolute, spans the
 *                                    section; JS aligns its top to the badge
 *                                    row centre — CSS top:50% is the fallback)
 *       [data-jl-line-fill]          accent fill (injected by JS if missing)
 *     [data-jl-step]                 one step (N total, inside .container-2xl)
 *       [data-jl-badge]              numbered chip the line passes through
 *       [data-jl-media]              image/visual block
 *       [data-jl-copy]               heading + paragraph block
 *
 * Root attributes (all optional):
 *   data-jl-step-vh   scroll distance PER STEP, % of viewport height (default 100)
 *   data-jl-scrub     scrub lag in seconds — higher = floatier      (default 1.2)
 *   data-jl-priority  ScrollTrigger refreshPriority — set per the page's pin
 *                     stacking order, see PROJECT.md "Pinli Bölüm Kuralları"
 *                     (default 0)
 *   data-jl-reveal    each reveal's share of the timeline, 0–1      (default 0.16)
 *
 * Colour tokens (CSS custom properties on the root, see journey-line.css):
 *   --jl-track · --jl-accent · --jl-line-w
 *
 * Mobile & tablet (≤991px): no pin — the steps stack vertically and each one
 * reveals with its own lightweight ScrollTrigger (play/reverse, no scrub);
 * the horizontal line is hidden by the CSS.
 *
 * Reduced motion: everything rendered visible, line fully filled, no triggers.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function num(el, attr, fallback) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }

  function build(root) {
    if (root._journeyLineInit) return;                      // idempotent
    root._journeyLineInit = true;

    var toArray = gsap.utils.toArray;
    var steps = toArray(root.querySelectorAll("[data-jl-step]"));
    var line = root.querySelector("[data-jl-line]");
    var fill = root.querySelector("[data-jl-line-fill]");

    if (steps.length < 2 || !line) {
      console.warn("[Sestek JourneyLine] Need [data-jl-line] and 2+ [data-jl-step] blocks.");
      return;
    }

    // Container-only convenience (same contract style as step-scroll's
    // progress bar): an empty [data-jl-line] gets its fill injected.
    if (!fill) {
      fill = document.createElement("span");
      fill.setAttribute("data-jl-line-fill", "");
      line.appendChild(fill);
    }

    var n = steps.length;
    var STEP_VH = num(root, "data-jl-step-vh", 100);
    var SCRUB = num(root, "data-jl-scrub", 1.2);
    var PRIORITY = num(root, "data-jl-priority", 0);
    var REVEAL = num(root, "data-jl-reveal", 0.16);
    var FILL_DUR = 1;                                       // normalized timeline units
    var SETTLE = 0.18;                                      // trailing hold after the last reveal

    var badges = steps.map(function (s) { return s.querySelector("[data-jl-badge]"); });
    var medias = steps.map(function (s) { return s.querySelector("[data-jl-media]"); });
    var copies = steps.map(function (s) { return s.querySelector("[data-jl-copy]"); });

    // ── CLS guard: media boxes must own their height BEFORE images land ──────
    // Webflow serves images loading="lazy" — they arrive right as the section
    // enters the viewport. If a media box has no reserved height (skin not
    // applied / aspect-ratio removed in the Designer), the box grows at that
    // moment: the badge row jumps, the line is left mis-seated, and it counts
    // as CLS. Same guard pattern as step-scroll's videoWrap fallback.
    medias.forEach(function (m) {
      if (m && m.getBoundingClientRect().height < 2) {
        m.style.aspectRatio = "3 / 2";
        m.style.overflow = "hidden";
      }
    });

    // ── Geometry: line top + badge fractions ─────────────────────────────────
    // The only measuring this component does: where (vertically) the line sits
    // and how far along it (0–1) each badge centre is. Both are plain rect
    // ratios — nothing is cached per-length, so nothing needs invalidating.
    var fracs = [];

    function place() {
      var lineR = line.getBoundingClientRect();
      if (lineR.width < 2) return;                          // hidden (mobile)
      var rootR = root.getBoundingClientRect();
      if (badges[0]) {
        var bR = badges[0].getBoundingClientRect();
        line.style.top = (bR.top - rootR.top + bR.height / 2 - lineR.height / 2) + "px";
        lineR = line.getBoundingClientRect();               // re-read after the move
      }
      fracs = steps.map(function (s, i) {
        var b = badges[i];
        if (!b) return (i + 0.5) / n;                       // no badge: equal spacing
        var r = b.getBoundingClientRect();
        var f = (r.left + r.width / 2 - lineR.left) / lineR.width;
        return Math.max(0, Math.min(1, f));
      });
    }

    // ── States ────────────────────────────────────────────────────────────────
    /** Step 0 open, the rest primed for their reveal. The fill rests at
     *  badge 1 — step 1 is open from the start, so the line owns that much. */
    function primeStates() {
      gsap.set(fill, { scaleX: fracs[0] || 0, transformOrigin: "left center" });
      steps.forEach(function (s, i) {
        var open = i === 0;
        if (badges[i]) gsap.set(badges[i], { autoAlpha: open ? 1 : 0 });
        if (medias[i]) gsap.set(medias[i], { autoAlpha: open ? 1 : 0, y: open ? 0 : "-2.5rem", filter: open ? "blur(0px)" : "blur(8px)" });
        if (copies[i]) gsap.set(copies[i], { autoAlpha: open ? 1 : 0, y: open ? 0 : "2.5rem" });
      });
    }

    /** Everything visible, line full — reduced motion / no-trigger fallback. */
    function renderStatic() {
      gsap.set(fill, { scaleX: 1, transformOrigin: "left center" });
      steps.forEach(function (s, i) {
        var t = [badges[i], medias[i], copies[i]].filter(Boolean);
        gsap.set(t, { autoAlpha: 1, scale: 1, y: 0, filter: "blur(0px)" });
      });
    }

    /** One step's reveal tweens, added to any timeline at `at`. */
    function addReveal(tl, i, at, dur, stagger) {
      // Badges: pure opacity fade — anything springy looks wrong in reverse
      // when the scrub rewinds.
      if (badges[i]) tl.fromTo(badges[i], { autoAlpha: 0 },
        { autoAlpha: 1, duration: dur * 0.6, ease: "power1.inOut" }, at);
      if (medias[i]) tl.fromTo(medias[i], { autoAlpha: 0, y: "-2.5rem", filter: "blur(8px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: dur, ease: "power2.out" }, at + stagger);
      if (copies[i]) tl.fromTo(copies[i], { autoAlpha: 0, y: "2.5rem" },
        { autoAlpha: 1, y: 0, duration: dur, ease: "power2.out" }, at + stagger * 2);
    }

    // ── Reduced motion ────────────────────────────────────────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderStatic();
      return;
    }

    // ── Mobile/tablet (≤991px): vertical stack, per-step reveal, no pin ──────
    if (window.matchMedia("(max-width: 991px)").matches) {
      primeStates();
      gsap.set(fill, { scaleX: 1 });                        // line is display:none anyway
      steps.forEach(function (s, i) {
        if (i === 0) return;
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: s,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
        addReveal(tl, i, 0, 0.8, 0.08);
      });
      return;
    }

    // ── Desktop: pin + one scrubbed master timeline ───────────────────────────
    var master = null;

    function buildDesktop() {
      if (master) {
        if (master.scrollTrigger) master.scrollTrigger.kill();
        master.kill();
        master = null;
      }
      place();
      primeStates();

      master = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + (n * STEP_VH) + "%",
          pin: true,
          scrub: SCRUB,
          // NO anticipatePin: it flips the pin slightly BEFORE the section
          // reaches the top — a visible jump-then-settle under Lenis. The
          // native fast-scroll flash it guards against can't happen when
          // Lenis drives the scroll (see step-scroll.js, same decision).
          // See PROJECT.md "ScrollTrigger — Pinli Bölüm Kuralları": priority is
          // driven by data-jl-priority, set per the page's pin stacking order.
          refreshPriority: PRIORITY,
        },
      });

      // The line starts already filled to badge 1 (no scroll wasted on the
      // empty stretch before the open step) and runs linearly to the end;
      // each later step opens the moment the fill crosses its badge. Ease
      // stays "none" on the fill so badge-arrival maps 1:1 to the measured
      // fractions, re-based onto the badge-1 → end range.
      var from = Math.min(fracs[0] || 0, 0.9);
      var span = 1 - from;
      master.fromTo(fill, { scaleX: from }, { scaleX: 1, duration: FILL_DUR }, 0);
      for (var i = 1; i < n; i++) {
        var at = Math.min(((fracs[i] - from) / span) * FILL_DUR, FILL_DUR - REVEAL);
        addReveal(master, i, Math.max(0, at), REVEAL, REVEAL * 0.15);
      }
      master.to({}, { duration: SETTLE });                  // hold on the finished frame
    }

    buildDesktop();

    // Rebuild on resize — badge fractions move with the container width and
    // the pin distance re-measures against the new viewport.
    var resizeT = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        buildDesktop();
        ScrollTrigger.refresh();
      }, 180);
    });

    // Vertical drift only (images/fonts landing change heights, not the badge
    // X-fractions): re-seat the line's top on every ScrollTrigger refresh.
    // Never rebuilds the timeline here — that could recurse into refresh.
    ScrollTrigger.addEventListener("refresh", place);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(place);
    }
    // Lazy images land as the section nears the viewport — long after the
    // window-load refresh. Re-seat the line the moment each one arrives
    // (cheap rect math; with the aspect-ratio guard above this is usually
    // a no-op, it only matters when a box's height genuinely changed).
    toArray(root.querySelectorAll("img")).forEach(function (img) {
      if (!img.complete) img.addEventListener("load", place, { once: true });
    });

    root._journeyLineTimeline = master;                     // exposed for debugging
  }

  /**
   * Initializes every journey-line section on the page in one call.
   * @param {string} [selector="[data-journey-line]"] narrow the scope if needed
   */
  function initJourneyLine(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek JourneyLine] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var roots = document.querySelectorAll(selector || "[data-journey-line]");
    if (!roots.length) { console.warn("[Sestek JourneyLine] No [data-journey-line] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initJourneyLine = initJourneyLine;

})(typeof window !== "undefined" ? window : this);
