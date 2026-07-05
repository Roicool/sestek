/*!
 * language-field.js v1.0.0
 * Ambient "language constellation" background. Scatters a set of flag items on a
 * jittered grid with a clear centre (for a headline), then runs a SINGLE travelling
 * pulse: for each hop it FIRST draws the connecting line, then a dot runs inside
 * that line to the next flag, ignites it, and moves on — one line, one dot at a
 * time (no static web, no triangles). All SVG motion is GSAP.
 *
 * Requires : gsap (global). js/core/utils.js (Sestek.util) loaded first.
 * CSS      : css/components/language-field.css  (structure only — you style the look)
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────────
 *
 *   [data-language-field]                     ← root (plain Div / section)
 *     [Collection List]                       ← your flags (a CMS list or static)
 *       [data-lf-item]                        ← one flag; JS scatters it (absolute)
 *         <img src="…flag…" alt="Language">
 *       …
 *     [data-lf-center]                        ← OPTIONAL headline zone, kept clear,
 *       <h2>40+ languages</h2>                   sits centred on top
 *
 * JS injects an SVG wire layer + the dot; style them via [data-lf-wire] /
 * [data-lf-dot] (or their CSS custom props). The active flag gets .is-lit (and
 * [data-lf-lit]) — style the "ignite" look yourself.
 *
 * Root attributes (all optional):
 *   data-lf-hole     centre clear radius, 0–1 of the smaller axis   (default 0.18)
 *   data-lf-jitter   how far items wander off their grid cell, 0–1  (default 0.4)
 *   data-lf-draw     line-draw seconds per hop                      (default 0.45)
 *   data-lf-travel   dot-travel seconds per hop                     (default 0.55)
 *   data-lf-gap-min  min pause between hops (s)                     (default 0.25)
 *   data-lf-gap-max  max pause between hops (s)                     (default 1.1)
 *   data-lf-hold     how long an ignited flag stays lit (s)         (default 0.9)
 *   data-lf-ease     GSAP ease for the dot travel                   (default power1.inOut)
 *
 * API: Sestek.initLanguageField()  → array of controllers { el, stop(), start() }
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;
  var SVGNS = "http://www.w3.org/2000/svg";

  function rand(a, b) { return a + Math.random() * (b - a); }

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

    var hole    = attrNum(root, "data-lf-hole", 0.18);
    var jitter  = attrNum(root, "data-lf-jitter", 0.4);
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
        if (Math.sqrt(dx * dx + dy * dy) < hole) continue; // keep centre clear
        cells.push({ nx: nx, ny: ny });
      }
    }
    // shuffle cells, assign one to each item
    for (var i = cells.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0; var t = cells[i]; cells[i] = cells[j]; cells[j] = t;
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

    // ── SVG wire layer + single dot (injected; style via attributes). ────
    var svg = root.querySelector("[data-lf-wires]");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("data-lf-wires", "");
      svg.setAttribute("preserveAspectRatio", "none");
      root.appendChild(svg);
    }
    svg.setAttribute("aria-hidden", "true");
    var wire = document.createElementNS(SVGNS, "line");
    wire.setAttribute("data-lf-wire", "");
    var dot = document.createElementNS(SVGNS, "circle");
    dot.setAttribute("data-lf-dot", "");
    dot.setAttribute("r", "4");
    svg.appendChild(wire); svg.appendChild(dot);

    var W = 1, H = 1;
    function measure() {
      W = root.clientWidth || 1; H = root.clientHeight || 1;
      svg.setAttribute("viewBox", "0 0 " + W + " " + H);
      svg.setAttribute("width", W); svg.setAttribute("height", H);
    }
    function pt(n) { return { x: n.nx * W, y: n.ny * H }; }
    measure();

    // ── Static / reduced-motion / no-GSAP: just light a couple, no motion. ──
    if (reduce || !hasGsap) {
      nodes.slice(0, 3).forEach(function (n) { n.el.classList.add("is-lit"); n.el.setAttribute("data-lf-lit", ""); });
      gsapHide();
      return { el: root, stop: function () {}, start: function () {} };
    }
    function gsapHide() { wire.style.opacity = "0"; dot.style.opacity = "0"; }
    gsapHide();

    function ignite(n) {
      n.el.classList.add("is-lit"); n.el.setAttribute("data-lf-lit", "");
    }
    function douse(n) {
      n.el.classList.remove("is-lit"); n.el.removeAttribute("data-lf-lit");
    }

    /** Pick a target: mid-distance from `from` so hops read cleanly (not the
     *  nearest, not clear across the field), never the same as the last node. */
    function pickTarget(fromIdx, lastIdx) {
      var from = nodes[fromIdx], p = pt(from);
      var ranked = nodes.map(function (n, k) { var q = pt(n); return { k: k, d: Math.hypot(q.x - p.x, q.y - p.y) }; })
        .filter(function (o) { return o.k !== fromIdx && o.k !== lastIdx; })
        .sort(function (a, b) { return a.d - b.d; });
      if (!ranked.length) return (fromIdx + 1) % nodes.length;
      var lo = Math.min(2, ranked.length - 1), hi = Math.min(ranked.length - 1, 9);
      return ranked[(rand(lo, hi + 1)) | 0].k;
    }

    var running = true, cur = (Math.random() * nodes.length) | 0, last = -1, tl = null, waitId = 0;
    ignite(nodes[cur]);

    function hop() {
      if (!running) return;
      var toIdx = pickTarget(cur, last);
      var a = pt(nodes[cur]), b = pt(nodes[toIdx]);
      var len = Math.hypot(b.x - a.x, b.y - a.y) || 1;

      wire.setAttribute("x1", a.x); wire.setAttribute("y1", a.y);
      wire.setAttribute("x2", b.x); wire.setAttribute("y2", b.y);
      gsap.set(wire, { attr: { "stroke-dasharray": len, "stroke-dashoffset": len }, opacity: 1 });
      gsap.set(dot, { attr: { cx: a.x, cy: a.y }, opacity: 0 });

      tl = gsap.timeline({
        onComplete: function () {
          if (!running) return;
          waitId = gsap.delayedCall(rand(gapMin, gapMax), hop);
        }
      });
      // 1) draw the line first
      tl.to(wire, { attr: { "stroke-dashoffset": 0 }, duration: drawDur, ease: "power2.inOut" }, 0);
      // 2) the dot enters the line and transfers to the target
      tl.to(dot, { opacity: 1, duration: 0.15 }, drawDur * 0.55);
      tl.to(dot, { attr: { cx: b.x, cy: b.y }, duration: travel, ease: ease }, drawDur * 0.65);
      // 3) ignite target, release source, retract the line + dot
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
    window.addEventListener("resize", function () {
      clearTimeout(rid); rid = setTimeout(function () { aspectReflow(); }, 200);
    });
    function aspectReflow() { measure(); } // items use %; only the SVG space needs W/H

    // Pause when off-screen (perf).
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
