/*!
 * orbit.js v1.0.0
 * Decorative orbital-ring animation for line-art SVGs.
 *
 *   1. Entrance — each <ellipse>/<path> stroke is drawn in with a stagger
 *      when the SVG scrolls into view (DrawSVGPlugin).
 *   2. Comet    — a glowing dot in the brand colour travels one ring on an
 *      endless loop (MotionPathPlugin). Most of the loop is off-canvas (the
 *      SVG is `slice`-clipped) so it reads like a comet sweeping the arc.
 *
 * Dependencies: gsap, ScrollTrigger, DrawSVGPlugin, MotionPathPlugin
 * (all free via the Webflow–GSAP sponsorship — see docs/gsap-svg.md).
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
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";

  /* Resolve a CSS-variable token (--x or var(--x)) to a computed colour.
   * Raw colours pass straight through. */
  function resolveColor(value, contextEl) {
    if (!value) return value;
    var v = value.trim();
    var match = v.match(/^var\(\s*(--[^,)]+)/) || (v.indexOf("--") === 0 ? [null, v] : null);
    if (match) {
      var resolved = getComputedStyle(contextEl).getPropertyValue(match[1]).trim();
      if (resolved) return resolved;
    }
    return v;
  }

  function flag(v) {
    /* present-but-empty attribute counts as true; "false"/"0"/"off" = false */
    if (v === null) return false;
    if (v === "") return true;
    return v !== "false" && v !== "0" && v !== "off";
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function wireOrbit(svg) {
    /* Collect the rings BEFORE we inject anything else */
    var rings = svg.querySelectorAll("ellipse, path");
    if (!rings.length) return;

    var drawDur = num(svg.getAttribute("data-orbit-draw-duration"), 1.5);
    var stagger = num(svg.getAttribute("data-orbit-stagger"), 0.12);
    var ease    = svg.getAttribute("data-orbit-ease") || "power2.inOut";
    var start   = svg.getAttribute("data-orbit-start") || "top 85%";

    var hasDraw = typeof DrawSVGPlugin !== "undefined";
    var hasPath = typeof MotionPathPlugin !== "undefined";

    /* ── Entrance: draw the rings in ────────────────────────────── */
    if (hasDraw) {
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
    if (!wantDot || !hasPath) return;

    var color = resolveColor(
      svg.getAttribute("data-orbit-dot-color") || "--interactive--color-primary-base",
      svg
    ) || "#5983f8";
    var dotR  = num(svg.getAttribute("data-orbit-dot-size"), 3);
    var speed = num(svg.getAttribute("data-orbit-speed"), 9);

    /* Pick the track ring; default to the first ring */
    var track = svg.querySelector("[data-orbit-track]") || rings[0];

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

    /* Endless travel along the track */
    gsap.set(dot, { opacity: 0 });
    gsap.to(dot, { opacity: 1, duration: 0.6, delay: drawDur * 0.5 });
    gsap.to(dot, {
      motionPath: {
        path: trackPath,
        align: trackPath,
        alignOrigin: [0.5, 0.5],
      },
      duration: speed,
      ease: "none",
      repeat: -1,
    });

    /* Subtle pulse on the core */
    gsap.to(core, {
      scale: 1.4,
      transformOrigin: "50% 50%",
      duration: 1.1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });
  }

  function initOrbit() {
    var svgs = document.querySelectorAll("[data-orbit]");
    if (!svgs.length) return;
    Array.prototype.forEach.call(svgs, wireOrbit);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initOrbit = initOrbit;

})(typeof window !== "undefined" ? window : this);
