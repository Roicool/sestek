/*!
 * grid-draw.js v1.0.0
 * Self-drawing border-grid lines. When a bordered element scrolls into
 * view its border lines draw themselves once — horizontals left→right
 * (scaleX), verticals top→bottom (scaleY) — then never replay.
 *
 * Stability by design: NO scrub, no pinning, no per-frame work. Each
 * element gets one fire-and-forget GSAP timeline behind a ScrollTrigger
 * with `once: true`, the same class of behaviour as reveal.js /
 * section-title.js. After the tween ends the component is inert.
 *
 * How it works: the element's own border CSS stays the single source of
 * truth — the JS measures which edges have a border (width > 0), their
 * colour and thickness via getComputedStyle, injects one absolutely
 * positioned line per edge, then hides the real border (inline
 * border-color: transparent) and animates the lines in. Lines are glued
 * to the edges with %-based positioning, so resize needs no recalc.
 * Without JS the real borders simply stay visible — progressive
 * enhancement for free.
 *
 * Requires globals : gsap, ScrollTrigger
 * Optional globals : Sestek.util (prefersReducedMotion)
 * CSS : css/components/grid-draw.css
 *
 * DOM (Webflow) — mark every bordered element that should draw itself:
 *
 *   <section class="bg-section" data-grid-draw>          ← border-bottom çizilir
 *     <div class="bg-container" data-grid-draw> … </div> ← border-left/right çizilir
 *   </section>
 *
 * Attributes (all optional, on the marked element):
 *   data-grid-draw                    marker (required)
 *   data-grid-draw-duration="0.8"     draw duration in seconds
 *   data-grid-draw-ease="power2.out"  GSAP ease
 *   data-grid-draw-delay="0"          delay in seconds (stagger siblings)
 *   data-grid-draw-start="top 85%"    ScrollTrigger start
 *
 * prefers-reduced-motion: reduce → nothing is initialised; the real
 * borders stay as plain CSS.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var STAGGER = 0.08;   // seconds between one element's own lines
  var instances = [];

  function prefersReducedMotion() {
    if (global.Sestek && Sestek.util && Sestek.util.prefersReducedMotion) {
      return Sestek.util.prefersReducedMotion();
    }
    return global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Per-edge geometry: where the line sits, which transform draws it and
  // from which origin (horizontals sweep from the left, verticals from top).
  var EDGES = {
    top:    { pos: { top: "0", left: "0", right: "0" },    size: "height", axis: "scaleX", origin: "left center" },
    bottom: { pos: { bottom: "0", left: "0", right: "0" }, size: "height", axis: "scaleX", origin: "left center" },
    left:   { pos: { top: "0", bottom: "0", left: "0" },   size: "width",  axis: "scaleY", origin: "center top" },
    right:  { pos: { top: "0", bottom: "0", right: "0" },  size: "width",  axis: "scaleY", origin: "center top" }
  };

  function setup(el) {
    var cs = global.getComputedStyle(el);
    var lines = [];

    Object.keys(EDGES).forEach(function (edge) {
      var width = parseFloat(cs["border" + edge.charAt(0).toUpperCase() + edge.slice(1) + "Width"]);
      if (!width) return;                      // this edge has no border → no line

      var conf = EDGES[edge];
      var line = document.createElement("div");
      line.className = "grid-draw-line";
      Object.keys(conf.pos).forEach(function (p) { line.style[p] = conf.pos[p]; });
      line.style[conf.size] = width + "px";
      line.style.background = cs["border" + edge.charAt(0).toUpperCase() + edge.slice(1) + "Color"];
      line.style.transformOrigin = conf.origin;
      line._axis = conf.axis;
      el.appendChild(line);
      lines.push(line);
    });

    if (!lines.length) {
      console.warn("[grid-draw] element has no borders to draw", el);
      return;
    }

    // Colours are measured — NOW the real border can go invisible.
    // (Inline, not via CSS, so the measurement above still saw the colour
    // and a no-JS page keeps its borders.) border stays in layout.
    el.style.borderColor = "transparent";

    var tl = gsap.timeline({
      defaults: {
        duration: parseFloat(el.getAttribute("data-grid-draw-duration")) || 0.8,
        ease: el.getAttribute("data-grid-draw-ease") || "power2.out"
      },
      delay: parseFloat(el.getAttribute("data-grid-draw-delay")) || 0,
      scrollTrigger: {
        trigger: el,
        start: el.getAttribute("data-grid-draw-start") || "top 85%",
        once: true                             // fire-and-forget: never replays
      }
    });

    lines.forEach(function (line, i) {
      var fromVars = {}, toVars = {};
      fromVars[line._axis] = 0;
      toVars[line._axis] = 1;
      tl.fromTo(line, fromVars, toVars, i * STAGGER);
    });

    instances.push({ el: el, lines: lines, tl: tl });
  }

  /** Initialise every [data-grid-draw] element on the page. */
  function initGridDraw(selector) {
    if (!global.gsap || !global.ScrollTrigger) {
      console.warn("[grid-draw] gsap + ScrollTrigger must be loaded first");
      return;
    }
    if (prefersReducedMotion()) return;        // real borders stay as-is
    gsap.registerPlugin(ScrollTrigger);

    var els = document.querySelectorAll(selector || "[data-grid-draw]");
    Array.prototype.forEach.call(els, setup);
  }

  /** Tear everything down and restore the real borders. */
  function destroyGridDraw() {
    instances.forEach(function (inst) {
      if (inst.tl.scrollTrigger) inst.tl.scrollTrigger.kill();
      inst.tl.kill();
      inst.lines.forEach(function (line) {
        if (line.parentNode) line.parentNode.removeChild(line);
      });
      inst.el.style.borderColor = "";
    });
    instances = [];
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initGridDraw = initGridDraw;
  global.Sestek.destroyGridDraw = destroyGridDraw;

})(typeof window !== "undefined" ? window : this);
