/*!
 * journey-path.js v2.2.0
 * PINNED scroll-driven CURVY progress path through a row of step items. The
 * section pins to the viewport; as you keep scrolling, a gradient progress
 * line FILLS along a meandering dashed track that runs through every step's
 * icon (scrubbed, fully reversible), and each icon lights up from its dimmed
 * state — takes the accent (Sestek pink) — the moment the fill reaches it.
 * When the fill completes, the pin releases and the page scrolls on.
 *
 * Changelog
 * v2.2.0 — SYMMETRIC waves. The curve is no longer a Catmull-Rom spline
 *          (which overshot unevenly around offset icons); every point is now
 *          a crest with a horizontal tangent and each bow mirrors itself —
 *          clean, even, professional meander. Extra wave midpoints are only
 *          inserted between anchors that sit at (nearly) the same height;
 *          icons placed at different heights in Designer ARE the wave.
 * v2.1.0 — DrawSVG + MotionPath. The fill is now drawn with DrawSVGPlugin
 *          (project standard, docs/gsap-svg.md §5) and a glowing accent DOT
 *          rides the curve tip via MotionPathPlugin — both free on the GSAP
 *          3.13+ CDN. BOTH ARE OPTIONAL: without DrawSVG the fill falls back
 *          to the stroke-dashoffset draw (identical result); without
 *          MotionPath the dot is positioned per-frame via getPointAtLength.
 *          data-jp-dot sets the dot radius (0 = off).
 * v2.0.0 — PIN by default. The section now pins (start "top top") for
 *          data-jp-distance % of viewport scroll while the line fills.
 *          data-jp-pin="false" restores the v1 non-pinned in-flow scrub.
 *          Pinned sections must follow PROJECT.md pin rules: refreshPriority
 *          via data-jp-priority, and NO transform/filter/perspective on any
 *          ancestor of [data-journey-path].
 *
 * The path is GENERATED from the real layout: the script measures each icon's
 * centre and draws a smooth spline through the points (with a gentle
 * alternating wave between them), so any Webflow grid/spacing works and the
 * curve survives every breakpoint — nothing is hardcoded. Re-measured on
 * resize and window load.
 *
 * Requires : gsap + ScrollTrigger (registered here), Sestek.util
 *            (js/core/utils.js) loaded first. No other plugins — the draw is
 *            stroke-dashoffset, not DrawSVG.
 * CSS      : css/components/journey-path.css  (dim/lit icon states + svg layer)
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-journey-path]              section root (position:relative via CSS)
 *     [data-jp-item]                 one step (icon + title + copy, N ≥ 2)
 *       [data-jp-icon]               the icon block that dims/lights up
 *                                    (falls back to the item itself if absent)
 *   <svg data-jp-svg>                injected by JS if absent — the two paths
 *                                    (dashed track + gradient fill) live here
 *
 * Root attributes (all optional):
 *   data-jp-wave       px of sideways bow between steps; negative flips the
 *                      meander direction                       (default 56)
 *   data-jp-bleed      "edge" = run the line to the section edges ·
 *                      "none" = start/stop at the first/last icon (default edge)
 *   data-jp-pin        "false" → no pin: in-flow scrub between data-jp-start
 *                      and data-jp-end (v1 behaviour)          (default true)
 *   data-jp-distance   pin scroll distance, % of viewport      (default 160)
 *   data-jp-priority   refreshPriority for the pin — set relative to other
 *                      pinned sections (PROJECT.md pin table)  (default 1)
 *   data-jp-start      ScrollTrigger start
 *                      (default "top top" pinned · "top 70%" unpinned)
 *   data-jp-end        ScrollTrigger end — unpinned mode only  (default "bottom 75%")
 *   data-jp-scrub      scrub lag in seconds                   (default 1)
 *   data-jp-dot        radius px of the accent dot riding the line tip;
 *                      0 = no dot                             (default 5)
 *   data-jp-min        min viewport px for pin + line + scrub — below this the
 *                      svg is hidden, no pin, icons render lit (default 992)
 *
 * Colour / geometry tokens (CSS custom properties on the root — see the CSS):
 *   --jp-track · --jp-grad-from · --jp-grad-to · --jp-line-w
 *
 * Accessibility: purely decorative — the svg is aria-hidden and pointer-blind.
 * prefers-reduced-motion: no scrub; the line renders fully filled and every
 * icon is lit. Below data-jp-min the same final state shows (CSS).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var uid = 0;

  var DEFAULTS = {
    wave: 56,
    startFlow: "top 70%",     // unpinned mode
    end: "bottom 75%",        // unpinned mode
    startPin: "top top",      // pinned mode
    distance: 160,            // pinned mode: % of viewport scroll
    priority: 1,
    scrub: 1,
    min: 992,
  };

  function buildOne(root) {
    if (root._journeyPathInit) return;                        // idempotent
    root._journeyPathInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var items = toArray(root.querySelectorAll("[data-jp-item]"));
    var icons = items.map(function (it) { return it.querySelector("[data-jp-icon]") || it; });
    if (items.length < 2) {
      console.warn("[Sestek JourneyPath] Need at least two [data-jp-item] steps.");
      return;
    }

    var WAVE  = attrNum(root, "data-jp-wave", DEFAULTS.wave);
    var SCRUB = attrNum(root, "data-jp-scrub", DEFAULTS.scrub);
    var MIN   = attrNum(root, "data-jp-min", DEFAULTS.min);
    var PIN   = root.getAttribute("data-jp-pin") !== "false";
    var DIST  = attrNum(root, "data-jp-distance", DEFAULTS.distance);
    var PRIORITY = attrNum(root, "data-jp-priority", DEFAULTS.priority);
    var START = root.getAttribute("data-jp-start") || (PIN ? DEFAULTS.startPin : DEFAULTS.startFlow);
    var END   = root.getAttribute("data-jp-end") || DEFAULTS.end;
    var BLEED = (root.getAttribute("data-jp-bleed") || "edge") !== "none";

    // ── SVG scaffolding (injected once) ─────────────────────────────────────
    var svg = root.querySelector("[data-jp-svg]");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("data-jp-svg", "");
      root.insertBefore(svg, root.firstChild);
    }
    svg.setAttribute("aria-hidden", "true");

    var gradId = "jp-grad-" + (++uid);
    var cs = getComputedStyle(root);
    var gFrom = (cs.getPropertyValue("--jp-grad-from") || "#EC008C").trim();
    var gTo   = (cs.getPropertyValue("--jp-grad-to") || "#9d4bff").trim();
    var defs = document.createElementNS(SVGNS, "defs");
    defs.innerHTML =
      '<linearGradient id="' + gradId + '" x1="0%" y1="0%" x2="100%" y2="0%">' +
      '<stop offset="0%" stop-color="' + gFrom + '"/>' +
      '<stop offset="100%" stop-color="' + gTo + '"/></linearGradient>';
    svg.appendChild(defs);

    var basePath = document.createElementNS(SVGNS, "path");
    basePath.setAttribute("class", "jp-base");
    var fillPath = document.createElementNS(SVGNS, "path");
    fillPath.setAttribute("class", "jp-fill");
    fillPath.setAttribute("stroke", "url(#" + gradId + ")");
    svg.appendChild(basePath);
    svg.appendChild(fillPath);

    // Accent dot riding the tip of the fill (data-jp-dot px radius, 0 = off).
    var DOT_R = attrNum(root, "data-jp-dot", 5);
    var dot = null;
    if (DOT_R > 0) {
      dot = document.createElementNS(SVGNS, "circle");
      dot.setAttribute("class", "jp-dot");
      dot.setAttribute("r", DOT_R);
      svg.appendChild(dot);
    }
    function placeDot(len) {
      if (!dot) return;
      var p = fillPath.getPointAtLength(len);
      dot.setAttribute("cx", p.x);
      dot.setAttribute("cy", p.y);
    }

    function measureLen(d) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
      var L = p.getTotalLength();
      svg.removeChild(p);
      return L;
    }

    // ── Geometry: spline through the icon centres with an alternating wave ──
    // Returns { d, fractions } — fractions[i] = how far along the path icon i
    // sits (0..1), used to light icons up as the fill passes them.
    function buildGeometry() {
      var rr = root.getBoundingClientRect();
      var anchors = icons.map(function (icon) {
        var r = icon.getBoundingClientRect();
        return { x: r.left + r.width / 2 - rr.left, y: r.top + r.height / 2 - rr.top };
      });

      // Optional edge bleed: run in from the section edges at the outer
      // anchors' height (horizontal layouts; harmless on odd layouts).
      var pts = anchors.slice();
      if (BLEED) {
        pts.unshift({ x: 0, y: anchors[0].y });
        pts.push({ x: rr.width, y: anchors[anchors.length - 1].y });
      }

      // Meander points: when two neighbouring anchors sit at (nearly) the
      // same height, ONE midpoint offset by ±wave keeps the line bowing
      // between them. Anchors at different heights (icons offset in
      // Designer) ARE the wave — no extra point is inserted there.
      var alt = WAVE < 0 ? -1 : 1;
      var amp = Math.abs(WAVE);
      var wavePts = [];
      var anchorIdx = [];                                     // anchor → index in wavePts
      pts.forEach(function (p, i) {
        wavePts.push(p);
        var ai = BLEED ? i - 1 : i;
        if (ai >= 0 && ai < anchors.length) anchorIdx[ai] = wavePts.length - 1;
        var q = pts[i + 1];
        if (!q) return;
        if (Math.abs(q.y - p.y) < amp) {
          wavePts.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 + amp * alt });
          alt = -alt;
        }
      });

      // SYMMETRIC smooth curve: every point is a crest — the tangent is
      // horizontal there — and each bow mirrors itself (control points at
      // half the horizontal span). Even, professional waves; no spline
      // overshoot.
      var segs = [];
      for (var i = 0; i < wavePts.length - 1; i++) {
        var p = wavePts[i], q = wavePts[i + 1];
        var hx = (q.x - p.x) / 2;
        segs.push("C" + (p.x + hx).toFixed(1) + "," + p.y.toFixed(1) + " " +
                  (q.x - hx).toFixed(1) + "," + q.y.toFixed(1) + " " +
                  q.x.toFixed(1) + "," + q.y.toFixed(1));
      }
      var head = "M" + wavePts[0].x.toFixed(1) + "," + wavePts[0].y.toFixed(1);
      var d = head + segs.join("");

      svg.setAttribute("viewBox", "0 0 " + Math.max(rr.width, 1) + " " + Math.max(rr.height, 1));

      var total = measureLen(d) || 1;
      var fractions = anchorIdx.map(function (wi) {
        return wi === 0 ? 0 : measureLen(head + segs.slice(0, wi).join("")) / total;
      });
      return { d: d, total: total, fractions: fractions };
    }

    function setActive(progress, fractions) {
      icons.forEach(function (icon, i) {
        var on = progress >= fractions[i] - 0.001;
        icon.classList.toggle("is-active", on);
        items[i].classList.toggle("is-active", on);
      });
    }

    // ── Reduced motion: final frame — full line, everything lit ─────────────
    if (util.prefersReducedMotion()) {
      var geo = buildGeometry();
      basePath.setAttribute("d", geo.d);
      fillPath.setAttribute("d", geo.d);
      placeDot(geo.total);
      setActive(1, geo.fractions);
      return;
    }

    // ── Breakpoint gate: line + scrub at data-jp-min and up only ────────────
    var mm = gsap.matchMedia();
    mm.add("(min-width: " + MIN + "px)", function () {
      var tl = null, resizeTimer = null;
      var hasDraw = typeof DrawSVGPlugin !== "undefined";
      var hasMotion = typeof MotionPathPlugin !== "undefined";

      function build() {
        if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); tl = null; }
        var geo = buildGeometry();
        basePath.setAttribute("d", geo.d);
        fillPath.setAttribute("d", geo.d);

        var st = PIN ? {
          // Pinned: the section sticks and the fill consumes DIST% of scroll.
          trigger: root,
          start: START,
          end: "+=" + DIST + "%",
          scrub: SCRUB,
          pin: true,
          refreshPriority: PRIORITY,                          // pin: page order (PROJECT.md)
        } : {
          // Unpinned (v1): in-flow scrub while the section crosses the viewport.
          trigger: root,
          start: START,
          end: END,
          scrub: SCRUB,
          refreshPriority: -1,                                // non-pinned: after pins
        };
        st.onUpdate = function (self) {
          setActive(self.progress, geo.fractions);
          // Without MotionPath the dot is placed per-frame along the path.
          if (!hasMotion) placeDot(self.progress * geo.total);
        };

        tl = gsap.timeline({ scrollTrigger: st });

        // The fill draw — DrawSVGPlugin (project standard, docs/gsap-svg.md §5)
        // with an identical stroke-dashoffset fallback when it isn't loaded.
        if (hasDraw) {
          tl.fromTo(fillPath, { drawSVG: "0%" }, { drawSVG: "0% 100%", ease: "none" }, 0);
        } else {
          tl.fromTo(fillPath,
            { strokeDasharray: geo.total, strokeDashoffset: geo.total },
            { strokeDashoffset: 0, ease: "none" }, 0);
        }

        // The accent dot rides the tip — MotionPathPlugin when available.
        if (dot && hasMotion) {
          tl.to(dot, {
            motionPath: { path: fillPath, align: fillPath, alignOrigin: [0.5, 0.5] },
            ease: "none",
          }, 0);
        } else if (dot) {
          placeDot(0);                                        // start point; onUpdate drives it
        }

        setActive(tl.scrollTrigger ? tl.scrollTrigger.progress : 0, geo.fractions);
      }

      function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () { build(); ScrollTrigger.refresh(); }, 180);
      }

      build();
      window.addEventListener("resize", onResize);
      window.addEventListener("load", onResize);

      return function () {                                    // matchMedia cleanup
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("load", onResize);
        if (tl) { if (tl.scrollTrigger) tl.scrollTrigger.kill(); tl.kill(); }
        icons.forEach(function (icon, i) {
          icon.classList.remove("is-active");
          items[i].classList.remove("is-active");
        });
      };
    });

    root._journeyPathMM = mm;
  }

  /**
   * Initialise every [data-journey-path] section on the page in one call.
   * @param {string} [selector="[data-journey-path]"] narrow the scope if needed
   */
  function initJourneyPath(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
          clearInterval(poll);
          initJourneyPath(selector);
        } else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek JourneyPath] gsap + ScrollTrigger required — " +
            "load gsap.min.js AND ScrollTrigger.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek JourneyPath] Sestek.util (js/core/utils.js) required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    if (typeof DrawSVGPlugin !== "undefined") gsap.registerPlugin(DrawSVGPlugin);
    if (typeof MotionPathPlugin !== "undefined") gsap.registerPlugin(MotionPathPlugin);

    // Arm the CSS dim state (no-op if already added in <head>). Without JS the
    // icons render lit — graceful fallback.
    document.documentElement.classList.add("jpath-armed");

    var roots = document.querySelectorAll(selector || "[data-journey-path]");
    if (!roots.length) { console.warn("[Sestek JourneyPath] No [data-journey-path] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);

    if (document.readyState === "complete") {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initJourneyPath = initJourneyPath;

})(typeof window !== "undefined" ? window : this);
