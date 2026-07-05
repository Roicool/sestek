/*!
 * language-grid.js v1.0.0
 * Ramp-style bento grid for a Webflow CMS list (logos / languages / customers).
 * A calm, fixed grid of cells — NOT a scrolling marquee. Every INTERVAL a couple
 * of resting cells cross-fade to another item pulled from an off-grid pool, so a
 * large CMS list keeps cycling through a small tile board. Click a cell and it
 * expands to a 2×2 block (Ramp/Vanta "feature card" feel), swapping its compact
 * face for a detail face bound to whatever CMS fields you put there; click again,
 * hit ✕, press Esc, or open another cell to collapse.
 *
 * The expand/collapse is animated with a FLIP pass (First-Last-Invert-Play) via
 * the Web Animations API — no GSAP needed. prefers-reduced-motion drops the
 * animation and the auto-shuffle; everything still works as a click-to-expand grid.
 *
 * ── DOM (Webflow CMS — plain Div Block root wrapping the Collection) ──────────
 *
 *   [data-lang-grid]                     ← plain Div Block = root (the grid)
 *     [data-lg-feature]                  ← OPTIONAL fixed 2×2 hero cell (a stat /
 *                                           CTA card that never rotates)
 *     [Collection List]                  ← authored freely; JS reads the items
 *       [data-lg-item]                   ← Collection Item = one tile
 *         [data-lg-face]                 ← compact content shown in the grid
 *                                           (logo, flag + name…)
 *         [data-lg-detail]               ← content revealed when the tile expands
 *                                           (bind any CMS fields: stats, quote…)
 *         [data-lg-close] (optional)     ← a ✕ button inside the detail face
 *
 * Root attributes (all optional):
 *   data-lg-cols       grid columns at full width          (default 6)
 *   data-lg-visible    tiles on the board at once; the rest
 *                      become the rotation pool             (default: all items)
 *   data-lg-interval   ms between auto-shuffles             (default 10000)
 *   data-lg-swap       tiles swapped per shuffle tick       (default 2)
 *   data-lg-autoplay   "false" → no auto-shuffle            (default true)
 *   data-lg-expand     "false" → tiles are static, no click-to-expand (default true)
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

  var attrNum = (Sestek && Sestek.util && Sestek.util.attrNum) || function (el, name, def) {
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

    var reduce   = prefersReduced();
    var cols     = Math.max(2, attrNum(root, "data-lg-cols", 6));
    var interval = attrNum(root, "data-lg-interval", 10000);
    var swapN    = Math.max(1, attrNum(root, "data-lg-swap", 2));
    var autoplay = root.getAttribute("data-lg-autoplay") !== "false" && !reduce;
    var canExpand = root.getAttribute("data-lg-expand") !== "false";

    var feature  = root.querySelector("[data-lg-feature]");
    root.style.setProperty("--lg-cols", cols);
    root.setAttribute("data-lg-ready", "");

    // The Collection List that actually holds the items — the grid tiles are
    // rendered as direct children of the root, so lift each item up to the root
    // and drop the now-empty CMS wrappers out of the layout.
    var listWrap = items[0].parentElement;

    // Off-grid pool: everything beyond the visible count waits here (kept in the
    // DOM but display:none) and rotates in over time.
    var visibleCount = attrNum(root, "data-lg-visible", items.length);
    visibleCount = Math.max(1, Math.min(visibleCount, items.length));

    // Move every item to be a direct child of the root, in order, then collapse
    // the original Collection wrappers so only our grid drives layout.
    items.forEach(function (it) {
      it.classList.add("lg-item");
      root.appendChild(it);
    });
    if (listWrap && listWrap !== root) {
      var wrap = listWrap;
      while (wrap && wrap !== root) { wrap.style.display = "none"; wrap = wrap.parentElement; }
    }
    // Keep the feature card first in the flow if present.
    if (feature) root.insertBefore(feature, root.firstChild);

    var onGrid = items.slice(0, visibleCount);   // tiles currently placed
    var pool   = items.slice(visibleCount);      // tiles waiting to rotate in
    pool.forEach(function (it) { it.setAttribute("data-lg-pool", ""); });

    // ── Expand / collapse (FLIP) ──────────────────────────────────
    var expanded = null;

    function flip(mutate) {
      var tiles = Array.prototype.slice.call(root.querySelectorAll(".lg-item"));
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
      var t = e.target.closest(".lg-item");
      if (t && onGrid.indexOf(t) !== -1) expandTile(t);
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") collapse(); });

    // ── Auto-shuffle: swap resting tiles with pool tiles ──────────
    var playing = autoplay, timer = null;

    function swapOne() {
      if (!pool.length) return;
      var rest = onGrid.filter(function (t) { return t !== expanded; });
      if (!rest.length) return;
      var gi = Math.floor(Math.random() * rest.length);
      var going = rest[gi];
      var pi = Math.floor(Math.random() * pool.length);
      var coming = pool[pi];

      // Cross-fade: fade the outgoing tile, swap it in place for the incoming
      // one (which takes its grid slot via DOM position), fade the new one in.
      going.setAttribute("data-lg-fade", "");
      var delay = reduce ? 0 : 260;
      setTimeout(function () {
        root.insertBefore(coming, going);
        coming.removeAttribute("data-lg-pool");
        coming.setAttribute("data-lg-fade", "");
        going.setAttribute("data-lg-pool", "");
        going.removeAttribute("data-lg-fade");
        // update bookkeeping
        onGrid[onGrid.indexOf(going)] = coming;
        pool[pi] = going;
        // next frame: fade the incoming tile up
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { coming.removeAttribute("data-lg-fade"); });
        });
      }, delay);
    }

    function tick() {
      if (!playing || expanded) return;   // never reshuffle under an open tile
      for (var i = 0; i < swapN; i++) swapOne();
    }
    function start() { if (autoplay && !timer) timer = setInterval(tick, interval); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    // Pause the shuffle while the pointer is on the grid (reading), like Ramp.
    if (autoplay && global.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      root.addEventListener("mouseenter", function () { playing = false; });
      root.addEventListener("mouseleave", function () { playing = true; });
    }
    // Don't burst-catch-up when the tab was hidden.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    // Re-measure kills a half-open expand cleanly.
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
