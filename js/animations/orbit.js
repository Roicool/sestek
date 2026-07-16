/*!
 * orbit.js v1.2.0
 * Decorative orbital-ring animation for line-art SVGs.
 *
 * Changelog
 * v1.2.0 — 3D depth illusion: the comet shrinks and dims as it swings around
 *          the visually higher (far) side of its ring, like a satellite
 *          passing behind a planet. Disable with data-orbit-depth="false".
 *          Also: if the [data-orbit-track] ring never crosses the viewBox
 *          (fully off-canvas in a slice-clipped svg), the comet falls back
 *          to the most-visible ring instead of orbiting invisibly.
 * v1.1.0 — respects prefers-reduced-motion (skips draw-in + comet); pauses the
 *          endless comet/pulse loops while off-screen; shared helpers moved to
 *          js/core/utils.js (Sestek.util).
 *
 *   1. Entrance — each <ellipse>/<path> stroke is drawn in with a stagger
 *      when the SVG scrolls into view (DrawSVGPlugin).
 *   2. Comet    — a glowing dot in the brand colour travels one ring on an
 *      endless loop (MotionPathPlugin). Most of the loop is off-canvas (the
 *      SVG is `slice`-clipped) so it reads like a comet sweeping the arc.
 *
 * Dependencies: gsap, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin
 * (all free via the Webflow–GSAP sponsorship — see docs/gsap-svg.md),
 * plus js/core/utils.js (Sestek.util) loaded first.
 *
 * API:
 *   Sestek.initOrbit()   — wire every [data-orbit] SVG on the page
 *
 * DOM:
 *   <svg data-orbit viewBox="…" preserveAspectRatio="xMinYMid slice">
 *     <ellipse … />                 ← drawn ring
 *     <ellipse data-orbit-track … />← the ring the comet follows (optional;
 *                                      defaults to the first ring)
 *   </svg>
 *
 * Attributes (all optional, on the [data-orbit] SVG):
 *   data-orbit-draw-duration="1.5"   seconds to draw each ring
 *   data-orbit-stagger="0.12"        delay between rings
 *   data-orbit-ease="power2.inOut"   draw ease
 *   data-orbit-start="top 85%"       ScrollTrigger start
 *   data-orbit-dot                   present = show comet (default ON; set
 *                                    data-orbit-dot="false" to disable)
 *   data-orbit-dot-color="--interactive--color-primary-base"
 *                                    CSS var token or raw colour
 *   data-orbit-dot-size="3"          core radius (SVG user units)
 *   data-orbit-speed="9"             seconds per full loop
 *   data-orbit-depth                 default ON: comet shrinks/dims on the
 *                                    far (upper) side of the ring for a 3D
 *                                    feel; data-orbit-depth="false" disables
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  /* Shared helpers from js/core/utils.js (core layer):
   *   resolveColor — CSS-var token (--x / var(--x)) → computed colour
   *   flag         — present/"true"-ish attribute test */
  var resolveColor = Sestek.util.resolveColor;
  var flag = Sestek.util.flag;

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  /**
   * Share of a ring's circumference that renders inside the svg's viewBox
   * (0..1). Points are mapped through the ring's own transform; slice-
   * clipped svgs never paint outside the viewBox, so this is what decides
   * whether a comet on this ring can ever be seen.
   */
  function visibleShare(svg, ring) {
    try {
      var vb = svg.viewBox.baseVal;
      var m = svg.getScreenCTM().inverse().multiply(ring.getScreenCTM());
      var L = ring.getTotalLength();
      var N = 96;
      var c = 0;
      for (var i = 0; i < N; i++) {
        var p = ring.getPointAtLength((i / N) * L);
        var x = m.a * p.x + m.c * p.y + m.e;
        var y = m.b * p.x + m.d * p.y + m.f;
        if (x >= vb.x && x <= vb.x + vb.width &&
            y >= vb.y && y <= vb.y + vb.height) c++;
      }
      return c / N;
    } catch (e) {
      return 0;
    }
  }

  function wireOrbit(svg) {
    if (svg._orbitInit) return;                           // idempotent — no duplicate comet/loops
    svg._orbitInit = true;

    /* Collect the rings BEFORE we inject anything else */
    var rings = svg.querySelectorAll("ellipse, path");
    if (!rings.length) return;

    var drawDur = num(svg.getAttribute("data-orbit-draw-duration"), 1.5);
    var stagger = num(svg.getAttribute("data-orbit-stagger"), 0.12);
    var ease    = svg.getAttribute("data-orbit-ease") || "power2.inOut";
    var start   = svg.getAttribute("data-orbit-start") || "top 85%";

    var hasDraw = typeof DrawSVGPlugin !== "undefined";
    var hasPath = typeof MotionPathPlugin !== "undefined";
    /* Honour prefers-reduced-motion: skip the draw-in and the endless comet
     * entirely. The rings stay statically visible (decorative motion removed). */
    var reduce  = Sestek.util.prefersReducedMotion();

    /* ── Entrance: draw the rings in ────────────────────────────── */
    if (hasDraw && !reduce) {
      gsap.set(rings, { transformOrigin: "50% 50%" });
      gsap.from(rings, {
        drawSVG: "0%",
        duration: drawDur,
        stagger: stagger,
        ease: ease,
        scrollTrigger: { trigger: svg, start: start, once: true },
      });
    }

    /* ── Comet dot ──────────────────────────────────────────────── */
    var dotAttr = svg.getAttribute("data-orbit-dot");
    var wantDot = dotAttr === null ? true : flag(dotAttr); /* default ON */
    if (!wantDot || !hasPath || reduce) return;

    var color = resolveColor(
      svg.getAttribute("data-orbit-dot-color") || "--interactive--color-primary-base",
      svg
    ) || "#5983f8";
    var dotR  = num(svg.getAttribute("data-orbit-dot-size"), 3);
    var speed = num(svg.getAttribute("data-orbit-speed"), 9);

    /* Pick the track ring; default to the first ring */
    var track = svg.querySelector("[data-orbit-track]") || rings[0];

    /* A ring that never crosses the viewBox would host an eternally
     * invisible comet. Fall back to the most-visible ring. */
    if (visibleShare(svg, track) === 0) {
      var best = track, bestShare = 0;
      for (var r = 0; r < rings.length; r++) {
        var share = visibleShare(svg, rings[r]);
        if (share > bestShare) { bestShare = share; best = rings[r]; }
      }
      if (best !== track) {
        console.warn(
          "[Sestek Orbit] [data-orbit-track] ring is fully outside the viewBox — " +
          "the comet would never be visible. Falling back to the most-visible ring. " +
          "Move data-orbit-track to a ring that crosses the canvas to silence this."
        );
        track = best;
      }
    }

    /* Clone it, strip its look, convert the clone to a path so the original
     * ring is untouched (it still draws + stays an <ellipse>). */
    var clone = track.cloneNode(false);
    clone.removeAttribute("data-orbit-track");
    clone.setAttribute("fill", "none");
    clone.setAttribute("stroke", "none");
    clone.style.pointerEvents = "none";
    svg.appendChild(clone);
    var trackPath = MotionPathPlugin.convertToPath(clone)[0];

    /* Build the comet: a blurred halo + a solid core, grouped */
    var dot = document.createElementNS(SVGNS, "g");
    dot.setAttribute("data-orbit-comet", "");
    dot.style.pointerEvents = "none";

    var halo = document.createElementNS(SVGNS, "circle");
    halo.setAttribute("r", dotR * 2.6);
    halo.setAttribute("fill", color);
    halo.setAttribute("opacity", "0.3");
    halo.style.filter = "blur(3px)";

    var core = document.createElementNS(SVGNS, "circle");
    core.setAttribute("r", dotR);
    core.setAttribute("fill", color);

    dot.appendChild(halo);
    dot.appendChild(core);
    svg.appendChild(dot);

    /* Endless travel along the track. The two infinite loops are paused
     * while the SVG is off-screen (perf: no compositor/main-thread work
     * when not visible) and resumed when it comes back — visible behaviour
     * is unchanged. IntersectionObserver (not ScrollTrigger) drives this:
     * it sees the REAL rendered position, so an svg inside a pinned
     * section (e.g. the hero) stays correctly "on screen" for the whole
     * pin, where scroll-offset math would wrongly pause it mid-pin. */
    var hasIO = typeof IntersectionObserver !== "undefined";

    /* ── Depth illusion ─────────────────────────────────────────────
     * The visually higher part of the ring reads as the FAR side of the
     * orbit. Sample the track once to learn its vertical extent in svg
     * user space (the clone carries the ring's transform, so points must
     * be mapped through it), then scale/dim the comet by how "front" its
     * current y is: full size at the lowest point, half-size and faint at
     * the top — a satellite swinging behind the planet. */
    var depthAttr = svg.getAttribute("data-orbit-depth");
    var depth = null;
    if (depthAttr === null || flag(depthAttr)) {
      try {
        var vb = svg.viewBox.baseVal;
        var dm = svg.getScreenCTM().inverse().multiply(trackPath.getScreenCTM());
        var dTotal = trackPath.getTotalLength();
        /* Normalise against the VISIBLE segment of the ring when there is
         * one — on huge slice-cropped rings the on-canvas sweep covers only
         * a slice of the full y-extent, and full-extent normalisation would
         * pin the comet at its minimum for the whole visible pass. */
        var yMin = Infinity, yMax = -Infinity;
        var vMin = Infinity, vMax = -Infinity, vCount = 0;
        for (var i = 0; i < 96; i++) {
          var pt = trackPath.getPointAtLength((i / 96) * dTotal);
          var tx = dm.a * pt.x + dm.c * pt.y + dm.e;
          var ty = dm.b * pt.x + dm.d * pt.y + dm.f;
          if (ty < yMin) yMin = ty;
          if (ty > yMax) yMax = ty;
          if (tx >= vb.x && tx <= vb.x + vb.width &&
              ty >= vb.y && ty <= vb.y + vb.height) {
            if (ty < vMin) vMin = ty;
            if (ty > vMax) vMax = ty;
            vCount++;
          }
        }
        if (vCount >= 8 && vMax - vMin > 1) {
          depth = { min: vMin, span: vMax - vMin };
        } else if (yMax - yMin > 1) {
          depth = { min: yMin, span: yMax - yMin };
        }
      } catch (e) { /* svg not measurable — comet still runs, flat */ }
    }

    /* Comet look = intro fade × depth factor, recomputed every frame the
     * comet moves (and while the intro fade runs) so the two never fight
     * over the dot's opacity. */
    var intro = { value: 0 };

    function applyLook() {
      if (!depth) {
        gsap.set(dot, { opacity: intro.value });
        return;
      }
      var front = (gsap.getProperty(dot, "y") - depth.min) / depth.span;
      front = Math.max(0, Math.min(1, front));
      gsap.set(dot, {
        opacity: intro.value * (0.3 + 0.7 * front),
        scale  : 0.5 + 0.5 * front,
      });
    }

    gsap.set(dot, { opacity: 0 });
    gsap.to(intro, {
      value: 1,
      duration: 0.6,
      delay: drawDur * 0.5,
      onUpdate: applyLook,
    });

    var cometTween = gsap.to(dot, {
      motionPath: {
        path: trackPath,
        align: trackPath,
        alignOrigin: [0.5, 0.5],
      },
      duration: speed,
      ease: "none",
      repeat: -1,
      paused: hasIO,
      onUpdate: applyLook,
    });

    /* Subtle pulse on the core */
    var pulseTween = gsap.to(core, {
      scale: 1.4,
      transformOrigin: "50% 50%",
      duration: 1.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      paused: hasIO,
    });

    if (hasIO) {
      new IntersectionObserver(function (entries) {
        var onScreen = entries[0].isIntersecting;
        if (onScreen) { cometTween.play();  pulseTween.play(); }
        else          { cometTween.pause(); pulseTween.pause(); }
      }).observe(svg);
    }
  }

  function initOrbit() {
    var svgs = document.querySelectorAll("[data-orbit]");
    if (!svgs.length) return;
    Array.prototype.forEach.call(svgs, wireOrbit);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initOrbit = initOrbit;

})(typeof window !== "undefined" ? window : this);
