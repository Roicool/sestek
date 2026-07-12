/*!
 * grid-draw.js v1.1.0
 * Self-drawing border-grid lines. When a bordered element enters the
 * viewport its border lines draw themselves once — horizontals left→right
 * (scaleX), verticals top→bottom (scaleY) — then never replay.
 *
 * Changelog
 * v1.1.0 — trigger moved from ScrollTrigger to IntersectionObserver.
 *          ScrollTrigger's start/end math breaks around pinned sections
 *          (pin spacers shift positions unless every trigger declares
 *          pinnedContainer), which made lines fire instantly and appear
 *          pre-drawn. IO watches REAL viewport intersection, so pinning
 *          elsewhere on the page can't affect it. ScrollTrigger is no
 *          longer a dependency — only gsap. data-grid-draw-start was
 *          replaced by data-grid-draw-offset.
 * v1.0.0 — initial release
 *
 * Stability by design: NO scrub, no pinning, no per-frame work. Each
 * element gets one paused GSAP timeline played once by a one-shot
 * IntersectionObserver — the same class of behaviour as section-title.js.
 * After the tween ends the component is inert.
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
 * Requires globals : gsap
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
 *   data-grid-draw-offset="15"        viewport bottom margin in % — element
 *                                     must clear the bottom N% of the screen
 *                                     before it draws (0 = any pixel visible)
 *
 * prefers-reduced-motion: reduce (or no IntersectionObserver) → nothing is
 * initialised; the real borders stay as plain CSS.
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
      var prop = "border" + edge.charAt(0).toUpperCase() + edge.slice(1);
      var width = parseFloat(cs[prop + "Width"]);
      if (!width) return;                      // this edge has no border → no line

      var conf = EDGES[edge];
      var line = document.createElement("div");
      line.className = "grid-draw-line";
      Object.keys(conf.pos).forEach(function (p) { line.style[p] = conf.pos[p]; });
      line.style[conf.size] = width + "px";
      line.style.background = cs[prop + "Color"];
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

    // Lines start undrawn; a paused timeline is played once by the IO below.
    var tl = gsap.timeline({
      paused: true,
      defaults: {
        duration: parseFloat(el.getAttribute("data-grid-draw-duration")) || 0.8,
        ease: el.getAttribute("data-grid-draw-ease") || "power2.out"
      }
    });

    lines.forEach(function (line, i) {
      var fromVars = {}, toVars = {};
      fromVars[line._axis] = 0;
      toVars[line._axis] = 1;
      gsap.set(line, fromVars);                // hidden immediately, not on play
      tl.to(line, toVars, i * STAGGER);
    });

    // IntersectionObserver instead of ScrollTrigger ON PURPOSE: it reads
    // the element's real on-screen position, so pinned sections elsewhere
    // (whose spacers shift ScrollTrigger's start/end math) can't break it.
    var offset = parseFloat(el.getAttribute("data-grid-draw-offset"));
    if (isNaN(offset)) offset = 15;
    var delay = parseFloat(el.getAttribute("data-grid-draw-delay")) || 0;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();                       // one-shot — never replays
        delay ? gsap.delayedCall(delay, function () { tl.play(); }) : tl.play();
      });
    }, { rootMargin: "0px 0px -" + offset + "% 0px", threshold: 0 });

    io.observe(el);
    instances.push({ el: el, lines: lines, tl: tl, io: io });
  }

  /** Initialise every [data-grid-draw] element on the page. */
  function initGridDraw(selector) {
    if (!global.gsap) {
      console.warn("[grid-draw] gsap must be loaded first");
      return;
    }
    // no motion (or no IO support) → real borders stay as plain CSS
    if (prefersReducedMotion() || !("IntersectionObserver" in global)) return;

    var els = document.querySelectorAll(selector || "[data-grid-draw]");
    Array.prototype.forEach.call(els, setup);
  }

  /** Tear everything down and restore the real borders. */
  function destroyGridDraw() {
    instances.forEach(function (inst) {
      inst.io.disconnect();
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
