/*!
 * language-field.js v1.1.0
 * Ambient "language constellation" background. Scatters flag items on a jittered
 * grid with a clear centre (for a headline), then runs a SINGLE travelling pulse:
 * each hop DRAWS the connecting line first, then one dot runs inside it to the
 * next flag, ignites it, and moves on — one line, one dot at a time (no static
 * web, no triangles).
 *
 * SVG motion is GSAP. When the free GSAP SVG plugins are present it uses:
 *   • DrawSVGPlugin   — to "draw" the connector stroke on
 *   • MotionPathPlugin — to run the dot exactly along that (curved) path
 * so the connectors are elegant beziers the dot rides perfectly. Without the
 * plugins it degrades to straight lines drawn via stroke-dashoffset and a linear
 * dot tween — still one-line-one-dot, just not curved.
 *
 * Requires : gsap (global). js/core/utils.js (Sestek.util) first.
 * Optional : DrawSVGPlugin + MotionPathPlugin (gsap@3.13+, free) for curved paths.
 *            Load them after gsap; the component self-registers them.
 * CSS      : css/components/language-field.css  (structure only — you style it)
 *
 * ── DOM (static, no CMS needed) ──────────────────────────────────────
 *   [data-language-field]                     ← root (plain Div / section)
 *     [data-lf-item] <img src="…flag…">        ← one flag; JS scatters it
 *     … (add as many as you like, by hand)
 *     [data-lf-center] <h2>40+ languages</h2>  ← OPTIONAL headline, kept clear
 *
 * Style hooks: active flag gets .is-lit + [data-lf-lit]; the wire is
 * [data-lf-wire], the dot [data-lf-dot] (colour via --lf-color).
 *
 * Root attributes (all optional):
 *   data-lf-hole     centre clear radius, 0–1               (default 0.18)
 *   data-lf-jitter   scatter off the grid cell, 0–1         (default 0.4)
 *   data-lf-curve    bezier arc height, 0 = straight        (default 0.18)
 *   data-lf-draw     line-draw seconds per hop              (default 0.45)
 *   data-lf-travel   dot-travel seconds per hop             (default 0.55)
 *   data-lf-gap-min / data-lf-gap-max   pause between hops  (default 0.25 / 1.1)
 *   data-lf-hold     how long a flag stays lit (s)          (default 0.9)
 *   data-lf-ease     GSAP ease for the dot travel           (default power1.inOut)
 *
 * API: Sestek.initLanguageField()  → [{ el, stop(), start() }]
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;
  var SVGNS = "http://www.w3.org/2000/svg";
  var registered = false;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function registerPlugins() {
    if (registered || typeof gsap === "undefined") return;
    registered = true;
    ["DrawSVGPlugin", "MotionPathPlugin"].forEach(function (name) {
      if (global[name]) { try { gsap.registerPlugin(global[name]); } catch (e) {} }
    });
  }

  function setup(root) {
    if (root._langFieldInit) return null;
    root._langFieldInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-lf-item]"));
    if (items.length < 2) {
      console.warn("[Sestek LanguageField] need >= 2 [data-lf-item].", root);
      return null;
    }

    var reduce = Sestek.util.prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined";
    if (!hasGsap) console.warn("[Sestek LanguageField] GSAP not found — field is static.");
    registerPlugins();
    var curved = hasGsap &&
      typeof global.DrawSVGPlugin !== "undefined" &&
      typeof global.MotionPathPlugin !== "undefined";

    var hole    = attrNum(root, "data-lf-hole", 0.18);
    var jitter  = attrNum(root, "data-lf-jitter", 0.4);
    var curve   = attrNum(root, "data-lf-curve", 0.18);
    var drawDur = attrNum(root, "data-lf-draw", 0.45);
    var travel  = attrNum(root, "data-lf-travel", 0.55);
    var gapMin  = attrNum(root, "data-lf-gap-min", 0.25);
    var gapMax  = attrNum(root, "data-lf-gap-max", 1.1);
    var hold    = attrNum(root, "data-lf-hold", 0.9);
    var ease    = root.getAttribute("data-lf-ease") || "power1.inOut";

    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    root.setAttribute("data-lf-ready", "");

    // ── Scatter: jittered grid, centre hole left clear for the headline. ──
    var aspect = Math.max(0.3, (root.clientWidth || 1) / (root.clientHeight || 1));
    var cols = Math.max(2, Math.round(Math.sqrt(items.length * 1.7 * aspect)));
    var rows = Math.max(2, Math.ceil((items.length * 1.7) / cols));
    var cells = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var nx = (c + 0.5) / cols + rand(-0.5, 0.5) * (jitter / cols);
        var ny = (r + 0.5) / rows + rand(-0.5, 0.5) * (jitter / rows);
        var dx = (nx - 0.5) * aspect, dy = (ny - 0.5);
        if (Math.sqrt(dx * dx + dy * dy) < hole) continue;
        cells.push({ nx: nx, ny: ny });
      }
    }
    for (var i = cells.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0, t = cells[i]; cells[i] = cells[j]; cells[j] = t;
    }
    var nodes = [];
    items.forEach(function (el, idx) {
      var cell = cells[idx % cells.length];
      el.style.position = "absolute";
      el.style.left = (cell.nx * 100) + "%";
      el.style.top = (cell.ny * 100) + "%";
      el.style.transform = "translate(-50%,-50%)";
      nodes.push({ el: el, nx: cell.nx, ny: cell.ny });
    });

    // ── SVG layer: one wire (path) + one dot (circle). Injected & styled by you.
    var svg = root.querySelector("[data-lf-wires]");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("data-lf-wires", "");
      svg.setAttribute("preserveAspectRatio", "none");
      root.appendChild(svg);
    }
    svg.setAttribute("aria-hidden", "true");
    var wire = document.createElementNS(SVGNS, "path");
    wire.setAttribute("data-lf-wire", "");
    wire.setAttribute("fill", "none");
    var dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("data-lf-dot", "");
    dot.setAttribute("r", "4"); dot.setAttribute("cx", "0"); dot.setAttribute("cy", "0");
    svg.appendChild(wire); svg.appendChild(dot);

    var W = 1, H = 1;
    function measure() {
      W = root.clientWidth || 1; H = root.clientHeight || 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W); svg.setAttribute("height", H);
    }
    function pt(n) { return { x: n.nx * W, y: n.ny * H }; }
    measure();

    function ignite(n) { n.el.classList.add("is-lit"); n.el.setAttribute("data-lf-lit", ""); }
    function douse(n) { n.el.classList.remove("is-lit"); n.el.removeAttribute("data-lf-lit"); }

    if (reduce || !hasGsap) {                 // static: light a few, no motion
      nodes.slice(0, 3).forEach(ignite);
      wire.style.opacity = "0"; dot.style.opacity = "0";
      return { el: root, stop: function () {}, start: function () {} };
    }
    gsap.set([wire, dot], { opacity: 0 });

    /** d-string for the connector: a bezier arc (curved mode) or straight L. */
    function pathD(a, b) {
      if (!curved || curve <= 0) return "M" + a.x + "," + a.y + " L" + b.x + "," + b.y;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var k = len * curve * (Math.random() < 0.5 ? 1 : -1);   // arc height, random side
      var cx = mx + (-dy / len) * k, cy = my + (dx / len) * k;
      return "M" + a.x + "," + a.y + " Q" + cx + "," + cy + " " + b.x + "," + b.y;
    }

    function pickTarget(fromIdx, lastIdx) {
      var p = pt(nodes[fromIdx]);
      var ranked = nodes.map(function (n, k) { var q = pt(n); return { k: k, d: Math.hypot(q.x - p.x, q.y - p.y) }; })
        .filter(function (o) { return o.k !== fromIdx && o.k !== lastIdx; })
        .sort(function (a, b) { return a.d - b.d; });
      if (!ranked.length) return (fromIdx + 1) % nodes.length;
      var lo = Math.min(2, ranked.length - 1), hi = Math.min(ranked.length - 1, 9);
      return ranked[(rand(lo, hi + 1)) | 0].k;
    }

    var running = true, cur = (Math.random() * nodes.length) | 0, last = -1, tl = null, waitId = null;
    ignite(nodes[cur]);

    function hop() {
      if (!running) return;
      var toIdx = pickTarget(cur, last);
      var a = pt(nodes[cur]), b = pt(nodes[toIdx]);
      wire.setAttribute("d", pathD(a, b));
      gsap.set(wire, { opacity: 1 });

      tl = gsap.timeline({
        onComplete: function () { if (running) waitId = gsap.delayedCall(rand(gapMin, gapMax), hop); }
      });

      if (curved) {
        gsap.set(dot, { opacity: 0, motionPath: { path: wire, align: wire, alignOrigin: [0.5, 0.5], end: 0 } });
        tl.fromTo(wire, { drawSVG: "0%" }, { drawSVG: "100%", duration: drawDur, ease: "power2.inOut" }, 0);
        tl.to(dot, { opacity: 1, duration: 0.15 }, drawDur * 0.5);
        tl.to(dot, { motionPath: { path: wire, align: wire, alignOrigin: [0.5, 0.5] }, duration: travel, ease: ease }, drawDur * 0.55);
      } else {
        var len = wire.getTotalLength ? wire.getTotalLength() : Math.hypot(b.x - a.x, b.y - a.y);
        gsap.set(wire, { attr: { "stroke-dasharray": len, "stroke-dashoffset": len } });
        gsap.set(dot, { opacity: 0, attr: { cx: a.x, cy: a.y } });
        tl.to(wire, { attr: { "stroke-dashoffset": 0 }, duration: drawDur, ease: "power2.inOut" }, 0);
        tl.to(dot, { opacity: 1, duration: 0.15 }, drawDur * 0.5);
        tl.to(dot, { attr: { cx: b.x, cy: b.y }, duration: travel, ease: ease }, drawDur * 0.55);
      }

      tl.add(function () { ignite(nodes[toIdx]); }, ">-0.04");
      tl.to(dot, { opacity: 0, duration: 0.2 }, ">-0.02");
      tl.to(wire, { opacity: 0, duration: 0.35 }, "<");
      tl.add(function () {
        var leaving = cur;
        gsap.delayedCall(hold, function () { if (leaving !== cur) douse(nodes[leaving]); });
        last = cur; cur = toIdx;
      });
    }
    hop();

    function stop() { running = false; if (tl) tl.kill(); if (waitId) waitId.kill(); }
    function start() { if (running) return; running = true; last = -1; hop(); }

    var rid;
    window.addEventListener("resize", function () { clearTimeout(rid); rid = setTimeout(measure, 200); });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) start(); else stop(); });
      }, { threshold: 0 }).observe(root);
    }

    return { el: root, stop: stop, start: start };
  }

  function initLanguageField(selector) {
    var roots = Array.prototype.slice.call(document.querySelectorAll(selector || "[data-language-field]"));
    var apis = [];
    roots.forEach(function (root) { var a = setup(root); if (a) apis.push(a); });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLanguageField = initLanguageField;

})(typeof window !== "undefined" ? window : this);
