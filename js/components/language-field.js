/*!
 * language-field.js v1.2.0
 * Ambient "language constellation" background. Scatters flag items on a loose
 * (lightly jittered) grid with a clear centre for a headline, then runs a SINGLE
 * travelling pulse that weaves BETWEEN the flags on right-angle routes:
 *   1. the flag it sits on is lit,
 *   2. a soft grey connector is DRAWN between it and the next flag, threading the
 *      gaps (rounded orthogonal path),
 *   3. the brand colour then FLOWS along that grey line with a dot at its head,
 *   4. the next flag ignites (fills up from its bottom corners), the source
 *      releases, a beat passes, and the next line is drawn — repeat.
 * One line, one dot at a time. Calm by default.
 *
 * SVG motion is GSAP. With the free GSAP SVG plugins (gsap@3.13+) it uses
 * DrawSVGPlugin (draw + flow) and MotionPathPlugin (dot rides the exact route,
 * so it can follow the weaving orthogonal path). Without them it degrades to a
 * straight line drawn via stroke-dashoffset and a linear dot tween.
 *
 * Requires : gsap (global). js/core/utils.js first.
 * Optional : DrawSVGPlugin + MotionPathPlugin (loaded after gsap; self-registered).
 * CSS      : css/components/language-field.css  (structure only — you style it)
 *
 * ── DOM (static, no CMS) ─────────────────────────────────────────────
 *   [data-language-field]
 *     [data-lf-item] <img src="…flag…">     ← one flag; JS scatters it
 *     …  (≈40 works well)
 *     [data-lf-center] <h2>40+ languages</h2>  ← OPTIONAL, kept clear
 *
 * Style hooks: lit flag → .is-lit + [data-lf-lit]; grey base line [data-lf-wire];
 * flowing colour [data-lf-flow]; dot [data-lf-dot]. Colours via --lf-line /
 * --lf-color.
 *
 * Root attributes (all optional):
 *   data-lf-hole     centre clear radius, 0–1                 (default 0.18)
 *   data-lf-jitter   scatter off the grid cell, 0–1           (default 0.22)  ← tidier
 *   data-lf-corner   route corner radius in px                (default 14)
 *   data-lf-draw     grey-line draw seconds                   (default 0.8)   ← slower
 *   data-lf-travel   colour-flow / dot seconds                (default 1.6)   ← slower
 *   data-lf-gap-min / data-lf-gap-max   pause between hops    (default 0.7 / 1.8)
 *   data-lf-hold     how long a flag sits lit before the next hop (s) (default 1.4)
 *   data-lf-ease     GSAP ease for the flow + dot             (default power1.inOut)
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

  /** Path string for a polyline with rounded corners (quadratic at each bend). */
  function roundedPoly(pts, r) {
    if (pts.length < 3) return "M" + pts.map(function (p) { return p.x + "," + p.y; }).join(" L");
    var d = "M" + pts[0].x + "," + pts[0].y;
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (d1 < 1 || d2 < 1) { d += " L" + p1.x + "," + p1.y; continue; }
      var rr = Math.min(r, d1 / 2, d2 / 2);
      var a1x = p1.x + (p0.x - p1.x) / d1 * rr, a1y = p1.y + (p0.y - p1.y) / d1 * rr;
      var a2x = p1.x + (p2.x - p1.x) / d2 * rr, a2y = p1.y + (p2.y - p1.y) / d2 * rr;
      d += " L" + a1x + "," + a1y + " Q" + p1.x + "," + p1.y + " " + a2x + "," + a2y;
    }
    var last = pts[pts.length - 1];
    return d + " L" + last.x + "," + last.y;
  }

  /** Right-angle route that threads between cells: one axis, turn, other, turn. */
  function orthPath(a, b, r) {
    var mid = rand(0.4, 0.6);
    if (Math.random() < 0.5) {
      var mx = a.x + (b.x - a.x) * mid;
      return roundedPoly([a, { x: mx, y: a.y }, { x: mx, y: b.y }, b], r);
    }
    var my = a.y + (b.y - a.y) * mid;
    return roundedPoly([a, { x: a.x, y: my }, { x: b.x, y: my }, b], r);
  }

  function setup(root) {
    if (root._langFieldInit) return null;
    root._langFieldInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-lf-item]"));
    if (items.length < 2) { console.warn("[Sestek LanguageField] need >= 2 [data-lf-item].", root); return null; }

    var reduce = Sestek.util.prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined";
    if (!hasGsap) console.warn("[Sestek LanguageField] GSAP not found — field is static.");
    registerPlugins();
    var usePlugins = hasGsap &&
      typeof global.DrawSVGPlugin !== "undefined" &&
      typeof global.MotionPathPlugin !== "undefined";

    var hole    = attrNum(root, "data-lf-hole", 0.18);
    var jitter  = attrNum(root, "data-lf-jitter", 0.22);
    var corner  = attrNum(root, "data-lf-corner", 14);
    var drawDur = attrNum(root, "data-lf-draw", 0.8);
    var travel  = attrNum(root, "data-lf-travel", 1.6);
    var gapMin  = attrNum(root, "data-lf-gap-min", 0.7);
    var gapMax  = attrNum(root, "data-lf-gap-max", 1.8);
    var hold    = attrNum(root, "data-lf-hold", 1.4);
    var ease    = root.getAttribute("data-lf-ease") || "power1.inOut";

    if (getComputedStyle(root).position === "static") root.style.position = "relative";
    root.setAttribute("data-lf-ready", "");

    // ── Scatter: loose grid, small jitter, centre hole kept clear. ──
    var aspect = Math.max(0.3, (root.clientWidth || 1) / (root.clientHeight || 1));
    var cols = Math.max(2, Math.round(Math.sqrt(items.length * 1.5 * aspect)));
    var rows = Math.max(2, Math.ceil((items.length * 1.5) / cols));
    var cells = [];
    for (var rr = 0; rr < rows; rr++) {
      for (var c = 0; c < cols; c++) {
        var nx = (c + 0.5) / cols + rand(-0.5, 0.5) * (jitter / cols);
        var ny = (rr + 0.5) / rows + rand(-0.5, 0.5) * (jitter / rows);
        var dx = (nx - 0.5) * aspect, dy = (ny - 0.5);
        if (Math.sqrt(dx * dx + dy * dy) < hole) continue;
        cells.push({ nx: nx, ny: ny });
      }
    }
    for (var i = cells.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
    var nodes = [];
    items.forEach(function (el, idx) {
      var cell = cells[idx % cells.length];
      el.style.position = "absolute";
      el.style.left = (cell.nx * 100) + "%";
      el.style.top = (cell.ny * 100) + "%";
      el.style.transform = "translate(-50%,-50%)";
      nodes.push({ el: el, nx: cell.nx, ny: cell.ny });
    });

    // ── SVG layer: grey base wire + flowing colour wire + one dot. ──
    var svg = root.querySelector("[data-lf-wires]");
    if (!svg) { svg = document.createElementNS(SVGNS, "svg"); svg.setAttribute("data-lf-wires", ""); svg.setAttribute("preserveAspectRatio", "none"); root.appendChild(svg); }
    svg.setAttribute("aria-hidden", "true");
    function mkPath(attr) { var p = document.createElementNS(SVGNS, "path"); p.setAttribute(attr, ""); p.setAttribute("fill", "none"); svg.appendChild(p); return p; }
    var wire = mkPath("data-lf-wire");   // soft grey base
    var flow = mkPath("data-lf-flow");   // brand colour that fills along
    var dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("data-lf-dot", ""); dot.setAttribute("r", "4"); dot.setAttribute("cx", "0"); dot.setAttribute("cy", "0");
    svg.appendChild(dot);

    var W = 1, H = 1;
    function measure() { W = root.clientWidth || 1; H = root.clientHeight || 1; svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("width", W); svg.setAttribute("height", H); }
    function pt(n) { return { x: n.nx * W, y: n.ny * H }; }
    measure();

    function ignite(n) { n.el.classList.add("is-lit"); n.el.setAttribute("data-lf-lit", ""); }
    function douse(n) { n.el.classList.remove("is-lit"); n.el.removeAttribute("data-lf-lit"); }

    if (reduce || !hasGsap) { nodes.slice(0, 3).forEach(ignite); [wire, flow, dot].forEach(function (e) { e.style.opacity = "0"; }); return { el: root, stop: function () {}, start: function () {} }; }
    gsap.set([wire, flow, dot], { opacity: 0 });

    function pickTarget(fromIdx, lastIdx) {
      var p = pt(nodes[fromIdx]);
      var ranked = nodes.map(function (n, k) { var q = pt(n); return { k: k, d: Math.hypot(q.x - p.x, q.y - p.y) }; })
        .filter(function (o) { return o.k !== fromIdx && o.k !== lastIdx; })
        .sort(function (a, b) { return a.d - b.d; });
      if (!ranked.length) return (fromIdx + 1) % nodes.length;
      var lo = Math.min(2, ranked.length - 1), hi = Math.min(ranked.length - 1, 8);
      return ranked[(rand(lo, hi + 1)) | 0].k;
    }

    var running = true, cur = (Math.random() * nodes.length) | 0, last = -1, tl = null, waitId = null;
    ignite(nodes[cur]);

    function hop() {
      if (!running) return;
      var toIdx = pickTarget(cur, last);
      var a = pt(nodes[cur]), b = pt(nodes[toIdx]);
      var d = usePlugins ? orthPath(a, b, corner) : "M" + a.x + "," + a.y + " L" + b.x + "," + b.y;
      wire.setAttribute("d", d); flow.setAttribute("d", d);

      tl = gsap.timeline({ onComplete: function () { if (running) waitId = gsap.delayedCall(rand(gapMin, gapMax), hop); } });

      // 1) draw the soft grey base line, weaving between the flags
      gsap.set(wire, { opacity: 1 });
      gsap.set(flow, { opacity: 1 });
      if (usePlugins) {
        tl.fromTo(wire, { drawSVG: "0%" }, { drawSVG: "100%", duration: drawDur, ease: "power2.inOut" }, 0);
        // 2) the colour flows along it (trail), dot at the head
        tl.fromTo(flow, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: travel, ease: ease }, drawDur);
        gsap.set(dot, { opacity: 0, motionPath: { path: flow, align: flow, alignOrigin: [0.5, 0.5], end: 0 } });
        tl.to(dot, { opacity: 1, duration: 0.2 }, drawDur);
        tl.to(dot, { motionPath: { path: flow, align: flow, alignOrigin: [0.5, 0.5] }, duration: travel, ease: ease }, drawDur);
      } else {
        var len = wire.getTotalLength ? wire.getTotalLength() : Math.hypot(b.x - a.x, b.y - a.y);
        gsap.set([wire, flow], { attr: { "stroke-dasharray": len, "stroke-dashoffset": len } });
        gsap.set(dot, { opacity: 0, attr: { cx: a.x, cy: a.y } });
        tl.to(wire, { attr: { "stroke-dashoffset": 0 }, duration: drawDur, ease: "power2.inOut" }, 0);
        tl.to(flow, { attr: { "stroke-dashoffset": 0 }, duration: travel, ease: ease }, drawDur);
        tl.to(dot, { opacity: 1, duration: 0.2 }, drawDur);
        tl.to(dot, { attr: { cx: b.x, cy: b.y }, duration: travel, ease: ease }, drawDur);
      }

      // 3) arrive → ignite target (fills from the bottom via CSS), release source
      tl.add(function () {
        ignite(nodes[toIdx]);
        var src = cur;
        gsap.delayedCall(0.4, function () { if (src !== toIdx) douse(nodes[src]); });
      });
      tl.to(dot, { opacity: 0, duration: 0.3 }, ">-0.05");
      // 4) hold the lit flag, then retract the lines before the next hop
      tl.to([wire, flow], { opacity: 0, duration: 0.5 }, "+=" + hold);
      tl.add(function () { last = cur; cur = toIdx; });
    }
    hop();

    function stop() { running = false; if (tl) tl.kill(); if (waitId) waitId.kill(); }
    function start() { if (running) return; running = true; last = -1; hop(); }

    var rid; window.addEventListener("resize", function () { clearTimeout(rid); rid = setTimeout(measure, 200); });
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) start(); else stop(); }); }, { threshold: 0 }).observe(root); }

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
