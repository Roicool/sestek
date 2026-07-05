/*!
 * language-grid.js v1.2.0
 * Ramp-style bento grid for a hand-authored (or CMS) list of tiles — a calm,
 * fixed grid, NOT a scrolling marquee. Every INTERVAL a couple of resting tiles
 * cross-fade to another item pulled from an off-grid pool, so a large list keeps
 * cycling through a small board. Click a tile and it expands to an N×N block
 * (Ramp/Vanta "feature card" feel), swapping its compact face for a detail face;
 * click again, hit ✕, press Esc, or open another tile to collapse.
 *
 * A fixed FEATURE cell (the big visual on the side) can hold several slides that
 * cross-fade on their own clock — so the image area rotates too, like Ramp's
 * customer card. Place it left or right and size it in columns/rows.
 *
 * Expand/collapse is a FLIP pass (First-Last-Invert-Play) via the Web Animations
 * API — no GSAP needed. prefers-reduced-motion drops the animation and the
 * auto-rotation; everything still works as a click-to-expand grid.
 *
 * ── DOM (build it yourself; items are direct children of the root) ────────────
 *
 *   [data-lang-grid]                     ← the grid (plain div)
 *
 *     [data-lg-feature]                  ← OPTIONAL big visual cell (fixed).
 *       [data-lg-feature-slide]          ← 1+ slides; if 2+ they cross-fade on
 *       [data-lg-feature-slide]            data-lg-feature-interval. First = active.
 *
 *     [data-lg-item]                     ← one tile (author as many as you like;
 *       [data-lg-face]                     more than data-lg-visible → pool/rotate)
 *       [data-lg-detail]                 ← revealed when the tile expands
 *         [data-lg-close] (optional)     ← ✕ button inside the detail face
 *
 * Root attributes (all optional):
 *   data-lg-cols            grid columns at full width          (default 6)
 *   data-lg-visible         tiles on the board at once; the rest
 *                           become the rotation pool            (default: all)
 *   data-lg-interval        ms between tile shuffles            (default 10000)
 *   data-lg-swap            tiles swapped per shuffle tick       (default 2)
 *   data-lg-autoplay        "false" → no auto-rotation          (default true)
 *   data-lg-expand          "false" → static, no click-expand   (default true)
 *   data-lg-expand-cols     expanded block width in columns      (default 2)
 *   data-lg-expand-rows     expanded block height in rows        (default 2)
 *
 * Feature cell attributes (on [data-lg-feature]):
 *   data-lg-feature-cols      width in columns                   (default 2)
 *   data-lg-feature-rows      height in rows                     (default 2)
 *   data-lg-feature-place     "start" (top-left) | "end" (top-right)  (default start)
 *   data-lg-feature-interval  ms between feature slides          (default: data-lg-interval)
 *
 * API:
 *   Sestek.initLanguageGrid()  — wire every [data-lang-grid] on the page
 *   returns controllers: { el, expand(i), collapse(), play(), pause() }
 *
 * CSS : css/components/language-grid.css
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = (global.Sestek && global.Sestek.util && global.Sestek.util.attrNum) ||
    function (el, name, def) {
      var v = parseFloat(el.getAttribute(name));
      return isNaN(v) ? def : v;
    };

  function prefersReduced() {
    return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setupInstance(root) {
    if (root._langGridInit) return null;
    root._langGridInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-lg-item]"));
    if (!items.length) {
      console.warn("[Sestek LanguageGrid] need [data-lg-item]s.", root);
      return null;
    }

    var reduce    = prefersReduced();
    var cols      = Math.max(2, attrNum(root, "data-lg-cols", 6));
    var interval  = attrNum(root, "data-lg-interval", 10000);
    var swapN     = Math.max(1, attrNum(root, "data-lg-swap", 2));
    var autoplay  = root.getAttribute("data-lg-autoplay") !== "false" && !reduce;
    var canExpand = root.getAttribute("data-lg-expand") !== "false";
    var expCols   = Math.max(1, attrNum(root, "data-lg-expand-cols", 2));
    var expRows   = Math.max(1, attrNum(root, "data-lg-expand-rows", 2));

    root.style.setProperty("--lg-cols", cols);
    root.style.setProperty("--lg-exp-col", "span " + expCols);
    root.style.setProperty("--lg-exp-row", "span " + expRows);
    root.setAttribute("data-lg-ready", "");

    // The parent that actually holds the items (a CMS list, or the root itself
    // when you author by hand). Lift every item to be a direct grid child and
    // collapse any wrapper so only our grid drives layout.
    var listWrap = items[0].parentElement;
    items.forEach(function (it) { root.appendChild(it); });
    if (listWrap && listWrap !== root) {
      var w = listWrap;
      while (w && w !== root) { w.style.display = "none"; w = w.parentElement; }
    }

    // ── Feature cell (fixed big visual, optional) ─────────────────
    var feature = root.querySelector("[data-lg-feature]");
    var featureStart = function () {}, featureStop = function () {};
    if (feature) {
      root.appendChild(feature); // keep it a direct grid child
      var fCols = Math.max(1, attrNum(root, "data-lg-feature-cols", 2));
      var fRows = Math.max(1, attrNum(root, "data-lg-feature-rows", 2));
      var place = (root.getAttribute("data-lg-feature-place") || "start").toLowerCase();
      // Pin the feature explicitly and let the tiles pack densely around it.
      feature.style.setProperty("--lg-feat-col",
        place === "end" ? ((-(fCols + 1)) + " / -1") : ("1 / span " + fCols));
      feature.style.setProperty("--lg-feat-row", "1 / span " + fRows);
      root.style.setProperty("--lg-flow", "dense");

      // Feature slides: if 2+, cross-fade them on their own clock.
      var fslides = Array.prototype.slice.call(feature.querySelectorAll("[data-lg-feature-slide]"));
      if (fslides.length > 1) {
        var fi = 0;
        fslides.forEach(function (s, idx) {
          s.setAttribute("data-lg-fslide", "");
          if (idx === 0) s.setAttribute("data-lg-fslide-on", ""); else s.removeAttribute("data-lg-fslide-on");
        });
        var fInt = attrNum(root, "data-lg-feature-interval", interval);
        var fTimer = null;
        var fStep = function () {
          fslides[fi].removeAttribute("data-lg-fslide-on");
          fi = (fi + 1) % fslides.length;
          fslides[fi].setAttribute("data-lg-fslide-on", "");
        };
        featureStart = function () { if (autoplay && !fTimer) fTimer = setInterval(function () { if (playing) fStep(); }, fInt); };
        featureStop  = function () { if (fTimer) { clearInterval(fTimer); fTimer = null; } };
      }
    }

    // Off-grid pool: everything beyond the visible count waits (display:none)
    // and rotates in over time.
    var visibleCount = attrNum(root, "data-lg-visible", items.length);
    visibleCount = Math.max(1, Math.min(visibleCount, items.length));
    var onGrid = items.slice(0, visibleCount);
    var pool   = items.slice(visibleCount);
    pool.forEach(function (it) { it.setAttribute("data-lg-pool", ""); });

    // ── Expand / collapse (FLIP) ──────────────────────────────────
    var expanded = null;

    function flip(mutate) {
      var tiles = Array.prototype.slice.call(root.querySelectorAll("[data-lg-item]"));
      if (feature) tiles.push(feature);
      if (reduce) { mutate(); return; }
      var firsts = tiles.map(function (t) { return t.getBoundingClientRect(); });
      mutate();
      tiles.forEach(function (t, i) {
        var a = firsts[i], b = t.getBoundingClientRect();
        var dx = a.left - b.left, dy = a.top - b.top;
        var sx = b.width ? a.width / b.width : 1, sy = b.height ? a.height / b.height : 1;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
        if (!t.animate) return;
        t.animate(
          [{ transform: "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")", transformOrigin: "top left" },
           { transform: "none", transformOrigin: "top left" }],
          { duration: 460, easing: "cubic-bezier(.2,.75,.2,1)" }
        );
      });
    }

    function collapse() {
      if (!expanded) return;
      var t = expanded; expanded = null;
      flip(function () { t.removeAttribute("data-lg-expanded"); });
      onGrid.forEach(function (x) { x.removeAttribute("data-lg-dim"); });
    }

    function expandTile(t) {
      if (!canExpand || t.hasAttribute("data-lg-pool")) return;
      if (expanded === t) { collapse(); return; }
      var prev = expanded; expanded = t;
      flip(function () {
        if (prev) prev.removeAttribute("data-lg-expanded");
        t.setAttribute("data-lg-expanded", "");
      });
      onGrid.forEach(function (x) {
        if (x === t) x.removeAttribute("data-lg-dim"); else x.setAttribute("data-lg-dim", "");
      });
    }

    root.addEventListener("click", function (e) {
      if (!canExpand) return;
      if (e.target.closest("[data-lg-close]")) { collapse(); return; }
      var t = e.target.closest("[data-lg-item]");
      if (t && onGrid.indexOf(t) !== -1) expandTile(t);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") collapse(); });

    // ── Auto-rotation: swap resting tiles with pool tiles ─────────
    var playing = autoplay, timer = null;

    function swapOne() {
      if (!pool.length) return;
      var rest = onGrid.filter(function (t) { return t !== expanded; });
      if (!rest.length) return;
      var gi = Math.floor(Math.random() * rest.length);
      var going = rest[gi];
      var pi = Math.floor(Math.random() * pool.length);
      var coming = pool[pi];

      going.setAttribute("data-lg-fade", "");
      var delay = reduce ? 0 : 260;
      setTimeout(function () {
        root.insertBefore(coming, going);
        coming.removeAttribute("data-lg-pool");
        coming.setAttribute("data-lg-fade", "");
        going.setAttribute("data-lg-pool", "");
        going.removeAttribute("data-lg-fade");
        onGrid[onGrid.indexOf(going)] = coming;
        pool[pi] = going;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { coming.removeAttribute("data-lg-fade"); });
        });
      }, delay);
    }

    function tick() {
      if (!playing || expanded) return;   // never reshuffle under an open tile
      for (var i = 0; i < swapN; i++) swapOne();
    }
    function start() { if (autoplay && !timer) timer = setInterval(tick, interval); featureStart(); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } featureStop(); }

    // Pause rotation while the pointer is on the grid (reading), like Ramp.
    if (autoplay && global.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.addEventListener("mouseenter", function () { playing = false; });
      root.addEventListener("mouseleave", function () { playing = true; });
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    var rT;
    global.addEventListener("resize", function () {
      clearTimeout(rT); rT = setTimeout(collapse, 150);
    });

    start();

    return {
      el: root,
      expand: function (i) { if (onGrid[i]) expandTile(onGrid[i]); },
      collapse: collapse,
      play: function () { playing = true; start(); },
      pause: function () { playing = false; },
    };
  }

  function initLanguageGrid(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-lang-grid]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLanguageGrid = initLanguageGrid;

})(typeof window !== "undefined" ? window : this);
