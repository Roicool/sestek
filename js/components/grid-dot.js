/*!
 * grid-dot.js v1.0.0
 * Scroll-following dot that travels ON the border-grid lines, with a trail.
 * The route is never hand-drawn: on init (and on resize) the component
 * measures the real geometry — the vertical-line container's left/right
 * edges and each stop section's bottom border — and generates an SVG path
 * glued to the 1px lines. A single scrubbed GSAP timeline drives both the
 * dot (MotionPathPlugin) and the trail (stroke-dashoffset window), so they
 * stay locked together at any scroll speed.
 *
 * Requires globals : gsap, ScrollTrigger, MotionPathPlugin
 * Optional globals : Sestek.util (prefersReducedMotion)
 * CSS : css/components/grid-dot.css
 *
 * DOM (Webflow) — mark existing grid markup, nothing is restructured:
 *
 *   <div data-grid-dot>                        ← stage: wraps the bordered sections
 *     <section data-grid-dot-stop>             ← waypoint: bottom border of this
 *       <div data-grid-dot-lines> … </div>       section is a route corner
 *     </section>
 *     <section data-grid-dot-stop="exit-right"> … </section>
 *     <section data-grid-dot-stop> … </section> ← consumed as the re-entry line
 *     <section data-grid-dot-stop="cross"> … </section>
 *   </div>
 *
 * Stage attributes (all optional):
 *   data-grid-dot                 stage marker (required)
 *   data-grid-dot-tail="160"      trail length in px along the route
 *   data-grid-dot-scrub="0.8"     ScrollTrigger scrub lag (seconds)
 *   data-grid-dot-start="top 75%" ScrollTrigger start
 *   data-grid-dot-end="bottom 25%"ScrollTrigger end
 *   data-grid-dot-side="left"     which vertical line the route starts on
 *   data-grid-dot-media="(min-width: 768px)"
 *                                 media query gate — below it the layer is off
 *
 * Line container (required, inside the stage):
 *   data-grid-dot-lines           the element whose left/right borders are
 *                                 the vertical grid lines (your container)
 *
 * Waypoints — data-grid-dot-stop on sections, value = maneuver at that
 * section's BOTTOM border:
 *   (empty) / "pass"   keep going on the current vertical line
 *   "cross"            switch to the opposite vertical line
 *   "exit-right"       ride the horizontal line right, off screen; the NEXT
 *                      stop is consumed as the re-entry: the dot comes back
 *                      in from the right edge and lands on the LEFT line
 *   "exit-left"        mirror of exit-right (re-enters onto the RIGHT line)
 *
 * Notes:
 *   - The overlay is pointer-events: none and the injected SVG never clips,
 *     so nothing can block the drawing. Ancestors of the stage must not
 *     have overflow clipping; body needs overflow-x: hidden (site default)
 *     so off-screen route segments don't create a horizontal scrollbar.
 *   - prefers-reduced-motion: reduce → the layer is not initialised.
 *   - Resize re-measures geometry and rebuilds the timeline (debounced).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var OFFSCREEN = 120;   // px past the viewport edge for exit/re-entry legs
  var instances = [];

  function prefersReducedMotion() {
    if (global.Sestek && Sestek.util && Sestek.util.prefersReducedMotion) {
      return Sestek.util.prefersReducedMotion();
    }
    return global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ── Route generation ──────────────────────────────────────────────
     All coordinates in stage space; the 0.5px offsets centre the path
     on the 1px border lines. Walks the stops as a tiny state machine:
     `side` is the vertical line we're currently riding, `pendingExit`
     remembers that the next stop must be used as the re-entry line. */
  function buildRouteD(inst) {
    var sr = inst.stage.getBoundingClientRect();
    var cr = inst.lines.getBoundingClientRect();
    var W  = inst.stage.clientWidth;
    var L  = cr.left  - sr.left + 0.5;
    var R  = cr.right - sr.left - 0.5;
    var x  = function (side) { return side === "left" ? L : R; };

    var side = inst.startSide;
    var pendingExit = null;
    var d = "M " + x(side) + " 0.5";

    inst.stops.forEach(function (el) {
      var y = el.getBoundingClientRect().bottom - sr.top - 0.5;

      if (pendingExit) {                       // this stop = re-entry line
        var ox = pendingExit === "right" ? W + OFFSCREEN : -OFFSCREEN;
        d += " L " + ox + " " + y;             // descend off screen
        side = pendingExit === "right" ? "left" : "right";
        d += " L " + x(side) + " " + y;        // sweep back in to the far line
        pendingExit = null;
        return;
      }

      var action = el.getAttribute("data-grid-dot-stop") || "pass";
      d += " L " + x(side) + " " + y;          // ride the vertical to this border

      if (action === "cross") {
        side = side === "left" ? "right" : "left";
        d += " L " + x(side) + " " + y;
      } else if (action === "exit-right" || action === "exit-left") {
        pendingExit = action === "exit-right" ? "right" : "left";
        d += " L " + (pendingExit === "right" ? W + OFFSCREEN : -OFFSCREEN) + " " + y;
      }
      // "pass" → nothing extra; the point above anchors the straight leg
    });

    return d;
  }

  /* ── Build / teardown of the scrubbed timeline ───────────────────── */
  function teardown(inst) {
    if (inst.tl) {
      if (inst.tl.scrollTrigger) inst.tl.scrollTrigger.kill();
      inst.tl.kill();
      inst.tl = null;
    }
    inst.stage.removeAttribute("data-grid-dot-ready");
  }

  function build(inst) {
    teardown(inst);
    if (!inst.mql.matches) return;             // layer is off at this width

    var d = buildRouteD(inst);
    inst.route.setAttribute("d", d);
    inst.trail.setAttribute("d", d);

    var len  = inst.route.getTotalLength();
    var tail = Math.min(inst.tail, len);
    // Dash window trick: [tail dash, len gap] and offset = tail - distance
    // keeps the visible segment exactly `tail` px behind the dot. No DrawSVG
    // needed — works with the project's pinned gsap@3.12.5.
    inst.trail.style.strokeDasharray  = tail + " " + len;
    inst.trail.style.strokeDashoffset = tail;

    inst.tl = gsap.timeline({
      defaults: { ease: "none" },              // required under scrub
      scrollTrigger: {
        trigger: inst.stage,
        start: inst.start,
        end: inst.end,
        scrub: inst.scrub
      }
    });

    inst.tl
      .to(inst.dot, {
        motionPath: { path: inst.route, align: inst.route, alignOrigin: [0.5, 0.5] }
      }, 0)
      .to(inst.trail, { strokeDashoffset: tail - len }, 0);

    inst.stage.setAttribute("data-grid-dot-ready", "");
  }

  /* ── Per-stage setup ──────────────────────────────────────────────── */
  function setup(stage) {
    var lines = stage.querySelector("[data-grid-dot-lines]");
    var stops = stage.querySelectorAll("[data-grid-dot-stop]");
    if (!lines || !stops.length) {
      console.warn("[grid-dot] stage needs [data-grid-dot-lines] and at least one [data-grid-dot-stop]", stage);
      return;
    }

    // Inject the motion layer — the author's grid markup stays untouched.
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "grid-dot-svg");
    svg.setAttribute("aria-hidden", "true");
    var route = document.createElementNS(SVG_NS, "path");
    route.setAttribute("class", "grid-dot-route");
    var trail = document.createElementNS(SVG_NS, "path");
    trail.setAttribute("class", "grid-dot-trail");
    svg.appendChild(route);
    svg.appendChild(trail);
    var dot = document.createElement("div");
    dot.className = "grid-dot-point";
    stage.insertBefore(svg, stage.firstChild);
    stage.insertBefore(dot, svg.nextSibling);

    var inst = {
      stage: stage,
      lines: lines,
      stops: Array.prototype.slice.call(stops),
      svg: svg,
      route: route,
      trail: trail,
      dot: dot,
      tail:  parseFloat(stage.getAttribute("data-grid-dot-tail"))  || 160,
      scrub: parseFloat(stage.getAttribute("data-grid-dot-scrub")) || 0.8,
      start: stage.getAttribute("data-grid-dot-start") || "top 75%",
      end:   stage.getAttribute("data-grid-dot-end")   || "bottom 25%",
      startSide: stage.getAttribute("data-grid-dot-side") === "right" ? "right" : "left",
      mql: global.matchMedia(stage.getAttribute("data-grid-dot-media") || "(min-width: 768px)"),
      tl: null
    };

    // Rebuild on breakpoint flips and (debounced) on resize — the route is
    // measured geometry, so any layout change invalidates it.
    inst.onMedia = function () { build(inst); ScrollTrigger.refresh(); };
    inst.mql.addEventListener("change", inst.onMedia);

    inst.onResize = function () {
      clearTimeout(inst.resizeTimer);
      inst.resizeTimer = setTimeout(inst.onMedia, 200);
    };
    global.addEventListener("resize", inst.onResize);

    build(inst);
    instances.push(inst);
  }

  /** Initialise every [data-grid-dot] stage on the page. */
  function initGridDot(selector) {
    if (!global.gsap || !global.ScrollTrigger || !global.MotionPathPlugin) {
      console.warn("[grid-dot] gsap + ScrollTrigger + MotionPathPlugin must be loaded first");
      return;
    }
    if (prefersReducedMotion()) return;        // no motion → no layer at all
    gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

    var els = document.querySelectorAll(selector || "[data-grid-dot]");
    Array.prototype.forEach.call(els, setup);
  }

  /** Tear everything down (SPA navigations / page transitions). */
  function destroyGridDot() {
    instances.forEach(function (inst) {
      teardown(inst);
      inst.mql.removeEventListener("change", inst.onMedia);
      global.removeEventListener("resize", inst.onResize);
      clearTimeout(inst.resizeTimer);
      if (inst.svg.parentNode) inst.svg.parentNode.removeChild(inst.svg);
      if (inst.dot.parentNode) inst.dot.parentNode.removeChild(inst.dot);
    });
    instances = [];
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initGridDot = initGridDot;
  global.Sestek.destroyGridDot = destroyGridDot;

})(typeof window !== "undefined" ? window : this);
