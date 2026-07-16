/*!
 * process-flow.js v2.8.1
 * Auxia-style looping journey hero: a left persona stack scrolls one row per
 * phase (active row highlighted), a stepped blue line draws across (DrawSVG),
 * segment pills sit on the line and swap their labels per phase, and three
 * cards (notification / media / checkout) blur-dissolve in and out. One
 * repeat:-1 master timeline, N phases (= persona count).
 *
 * v2.8 — RESPONSIVE RAIL. The line's path is no longer a fixed `d` stretched
 * with preserveAspectRatio="none"; the JS now MEASURES the personas block and
 * the pill row and generates the path from those positions (top segment runs
 * into the active persona row, steps down, then runs through the pill centres
 * to the right edge). Recomputed on resize and after fonts load, so personas
 * can sit statically in the layout flow and the line follows them at every
 * viewport width. Any hardcoded `d`/viewBox on the SVG is just a fallback.
 *
 * Requires : gsap (global) + DrawSVGPlugin + SplitText (both free since GSAP
 *            3.13 — load from the CDN). ScrollSmoother is NOT used; smooth
 *            scroll is Lenis at the site level.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-process-flow]                     root
 *     [data-pf-personas]                     clip that shows the active persona
 *       [data-pf-persona]                    one persona row (count = # phases)
 *         [data-pf-person]                   avatar/icon — colours to accent
 *         [data-pf-person-text]              detail lines — colour to ink
 *     [data-pf-draw]                         the blue <path> drawn with DrawSVG
 *     [data-pf-pill]                         one segment pill (usually 3). Holds:
 *       [data-pf-pill-wrap]                  width 0 -> auto wrapper (NOT text)
 *       [data-pf-pill-text]                  label; data-t0/data-t1/... per phase
 *     [data-pf-col]                          one card column (usually 3). Holds:
 *       [data-pf-card]                       one card per phase (stacked, only
 *                                            the active phase is shown)
 *         [data-pf-splittext]                optional body for a line reveal
 *
 * Playback: the loop starts PAUSED and an IntersectionObserver plays it when
 * the section enters the viewport (20% visible) and pauses it when it leaves.
 * Each phase opens with a staged ~4s prep: line draws fully -> beat ->
 * sparks/pills open -> cards dissolve in.
 *
 * Mobile & tablet (≤991px): a simple SCROLL-driven vertical stack — one card
 * per column (phase 0), personas hidden, and injected [data-pf-vline] grey
 * connector lines between the cards that fill with the accent colour as you
 * scroll (a pill turns active when its connector is full). No loop.
 *
 * Root attributes (all optional):
 *   data-pf-hold        seconds each phase holds before transitioning (default 3.5)
 *   data-pf-draw-dur    line draw / undraw duration in seconds       (default 2.2)
 *   data-pf-mobile      "static" = still frame · "loop" = desktop loop on mobile
 *                       (default = the scroll-filled vertical stack)
 *
 * Colour tokens (read from CSS custom properties on the root, with fallbacks):
 *   --pf-accent (#0b4fff) · --pf-ink (#232323) · --pf-muted (#c3c2b2)
 *   --pf-tag-active-bg (#d8dade) · --pf-tag-idle-bg (#f0efe3) · --pf-tag-idle-bd (#e2e1d3)
 *
 * Rail geometry tokens (optional, px numbers on the root):
 *   --pf-rail-gap-in  (14) gap between the incoming line and the personas
 *   --pf-rail-gap-out (28) gap between the personas and the step-down curve
 *   --pf-rail-radius  (24) corner radius of the step-down
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function cssVar(root, name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  function build(root) {
    if (root._processFlowInit) return;                      // idempotent
    root._processFlowInit = true;

    var toArray = gsap.utils.toArray;
    var personas = toArray(root.querySelectorAll("[data-pf-persona]"));
    var pills = toArray(root.querySelectorAll("[data-pf-pill]"));
    var cols = toArray(root.querySelectorAll("[data-pf-col]"));
    var draw = root.querySelector("[data-pf-draw]");

    // Recover from a common Webflow-build miss: [data-pf-pill] forgotten on the
    // chip. The wrap's parent IS the chip, so the rail measurement, colours and
    // label swaps keep working — but fix the attribute, this is a fallback.
    if (!pills.length) {
      pills = toArray(root.querySelectorAll("[data-pf-pill-wrap]")).map(function (w) { return w.parentElement; });
      if (pills.length) console.warn("[Sestek ProcessFlow] [data-pf-pill] missing on the pill chips — " +
        "recovered them via [data-pf-pill-wrap]. Add data-pf-pill in Webflow.");
    }

    if (!draw || !personas.length || !cols.length) {
      console.warn("[Sestek ProcessFlow] Need [data-pf-draw], [data-pf-persona] " +
        "rows and [data-pf-col] card columns.");
      return;
    }

    var PHASES = personas.length;
    var HOLD = parseFloat(root.getAttribute("data-pf-hold")) || 3.5;
    var DRAW_DUR = parseFloat(root.getAttribute("data-pf-draw-dur")) || 2.2;

    var ACCENT = cssVar(root, "--pf-accent", "#0b4fff");
    var INK = cssVar(root, "--pf-ink", "#232323");
    var MUTED = cssVar(root, "--pf-muted", "#c3c2b2");
    var TAG_ON = cssVar(root, "--pf-tag-active-bg", "#d8dade");
    var TAG_OFF = cssVar(root, "--pf-tag-idle-bg", "#f0efe3");
    var TAG_BD_OFF = cssVar(root, "--pf-tag-idle-bd", "#e2e1d3");

    // cards[col][phase] — one card per column per phase
    var cards = cols.map(function (col) { return toArray(col.querySelectorAll("[data-pf-card]")); });

    function personLines(p) { return p.querySelectorAll("[data-pf-person-text]"); }
    function personIcon(p) { return p.querySelector("[data-pf-person]") || p.querySelector(".pf_persona-icon"); }
    if (personas.length && !personas[0].querySelector("[data-pf-person]") && personIcon(personas[0])) {
      console.warn("[Sestek ProcessFlow] [data-pf-person] missing on the persona icons — " +
        "falling back to .pf_persona-icon. Add data-pf-person in Webflow.");
    }

    // ── Rail: the path is GENERATED from the real layout ─────────────────────
    // Personas sit statically in the flow; we measure them + the pill row and
    // build the stepped path in px (top segment → gap over the personas →
    // quarter-arc step-down → long line through the pill centres). The same
    // `d` goes on every <path> in the rail SVG (grey track(s) + blue draw).
    var svg = draw.ownerSVGElement;
    var drawTweens = [];                      // every DrawSVG tween — invalidated on resize
    var lineFrac = { a: 0, b: 0 };            // currently drawn fraction of the line

    function railNum(name, fallback) {
      var v = parseFloat(cssVar(root, name, ""));
      return isNaN(v) ? fallback : v;
    }

    function layoutRail() {
      if (!svg) return false;
      var box = svg.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return false;   // hidden (mobile) / not laid out

      var clip = root.querySelector("[data-pf-personas]") || personas[0].parentNode;
      var clipR = clip.getBoundingClientRect();
      var rowR = personas[0].getBoundingClientRect();
      // anchor: icon → first text line → the whole row (worst case)
      var anchor = personIcon(personas[0]) || personas[0].querySelector("[data-pf-person-text]") || personas[0];
      var icR = anchor.getBoundingClientRect();

      // y1 = the ACTIVE persona row's icon centre. Measured as an offset within
      // the row, anchored to the clip — the personas' yPercent scroll can never
      // skew it. y2 = the pill row's centre, so pills always sit ON the line.
      var y1 = (clipR.top - box.top) + (icR.top - rowR.top) + icR.height / 2;
      var pillR = (pills[0] || cols[0]).getBoundingClientRect();
      var y2 = pillR.top + pillR.height / 2 - box.top;

      var w = box.width;
      var n = function (v) { return Math.round(v * 100) / 100; };
      var d;

      if (y2 - y1 < 14 || !clipR.width) {                  // degenerate: flat line
        d = "M0 " + n(y2) + "H" + n(w);
      } else {
        var gapIn = railNum("--pf-rail-gap-in", 14);
        var gapOut = railNum("--pf-rail-gap-out", 28);
        var r = Math.max(6, Math.min(railNum("--pf-rail-radius", 24), (y2 - y1) / 2));
        var x1 = Math.max(0, clipR.left - box.left - gapIn);
        var x2 = clipR.right - box.left + gapOut;
        d = "M0 " + n(y1) + "H" + n(x1) +
            "M" + n(x2) + " " + n(y1) +
            "A" + n(r) + " " + n(r) + " 0 0 1 " + n(x2 + r) + " " + n(y1 + r) +
            "V" + n(y2 - r) +
            "A" + n(r) + " " + n(r) + " 0 0 0 " + n(x2 + 2 * r) + " " + n(y2) +
            "H" + n(w);
      }

      svg.setAttribute("viewBox", "0 0 " + n(w) + " " + n(box.height));
      svg.removeAttribute("preserveAspectRatio");          // 1:1 px — no stretching
      toArray(svg.querySelectorAll("path")).forEach(function (p) { p.setAttribute("d", d); });
      return true;
    }

    function applyLineFrac() {
      gsap.set(draw, { drawSVG: (lineFrac.a * 100) + "% " + (lineFrac.b * 100) + "%" });
    }

    /** Re-measure the rail; DrawSVG caches path lengths per tween, so every
     *  draw tween is invalidated (it re-measures on its next play) and the
     *  current drawn fraction is re-applied against the new length. */
    function relayout() {
      if (!layoutRail()) return;
      drawTweens.forEach(function (t) { t.invalidate(); });
      applyLineFrac();
    }

    layoutRail();

    var resizeT = null;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(relayout, 150);
    });
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(relayout);                 // metrics move once fonts land
    }

    // ── Static / initial state ────────────────────────────────────────────────
    gsap.set(draw, { drawSVG: "0% 0%" });
    gsap.set(pills, { color: MUTED, backgroundColor: TAG_OFF, borderColor: TAG_BD_OFF });
    gsap.set(root.querySelectorAll("[data-pf-pill-wrap]"), { width: 0 });
    cards.forEach(function (colCards) { colCards.forEach(function (c) { gsap.set(c, { autoAlpha: 0 }); }); });
    personas.forEach(function (p) {
      gsap.set(personLines(p), { color: MUTED });
      var ic = personIcon(p); if (ic) gsap.set(ic, { color: MUTED });
    });

    /** Resolve phase 0 as a static frame (line drawn, pills open, first cards). */
    function renderStaticPhase0() {
      lineFrac.a = 0; lineFrac.b = 1;
      gsap.set(draw, { drawSVG: "0% 100%" });
      gsap.set(pills, { color: ACCENT, backgroundColor: TAG_ON, borderColor: TAG_ON });
      gsap.set(root.querySelectorAll("[data-pf-pill-wrap]"), { width: "auto" });
      var p0 = personas[0];
      gsap.set(personLines(p0), { color: INK });
      var ic0 = personIcon(p0); if (ic0) gsap.set(ic0, { color: ACCENT });
      cards.forEach(function (colCards) { if (colCards[0]) gsap.set(colCards[0], { autoAlpha: 1 }); });
    }

    /** Mobile/tablet — simple SCROLL-driven vertical stack. No loop, no slider:
     *  each column shows just its phase-0 card, personas stay hidden, and the
     *  grey connector lines injected between the cards fill with the accent
     *  colour as you scroll (and empty again when you scroll back). A pill
     *  turns active the moment its connector is fully filled. */
    function buildMobile() {
      var vlines = [];
      pills.forEach(function (pill) {
        var t = pill.querySelector("[data-pf-pill-text]");
        if (t && t.getAttribute("data-t0")) t.textContent = t.getAttribute("data-t0");

        var line = document.createElement("span");
        line.className = "pf_vline";
        line.setAttribute("data-pf-vline", "");
        var fill = document.createElement("span");
        fill.className = "pf_vline-fill";
        fill.setAttribute("data-pf-vline-fill", "");
        line.appendChild(fill);
        pill.parentNode.insertBefore(line, pill);        // connector above each pill
        vlines.push({ line: line, fill: fill, pill: pill, done: false });
      });

      // Static content: one card per column, pills open with their own labels.
      cols.forEach(function (col, ci) { if (cards[ci][0]) gsap.set(cards[ci][0], { autoAlpha: 1 }); });
      gsap.set(root.querySelectorAll("[data-pf-pill-wrap]"), { width: "auto" });
      vlines.forEach(function (o) { gsap.set(o.fill, { scaleY: 0, transformOrigin: "top" }); });

      // Scroll-linked fill: progress = how far the line has passed 80% of the
      // viewport. Works with native scroll and with Lenis (which drives it).
      var ticking = false;
      function update() {
        ticking = false;
        var trigger = (window.innerHeight || 1) * 0.8;
        vlines.forEach(function (o) {
          var r = o.line.getBoundingClientRect();
          var p = (trigger - r.top) / (r.height || 1);
          p = Math.max(0, Math.min(1, p));
          gsap.set(o.fill, { scaleY: p });
          if (p >= 1 && !o.done) {
            o.done = true;
            gsap.to(o.pill, { color: ACCENT, backgroundColor: TAG_ON, borderColor: TAG_ON, duration: 0.4 });
          } else if (p < 1 && o.done) {
            o.done = false;
            gsap.to(o.pill, { color: MUTED, backgroundColor: TAG_OFF, borderColor: TAG_BD_OFF, duration: 0.3 });
          }
        });
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      update();
    }

    // ── Reduced motion: static phase 0, no loop ───────────────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      renderStaticPhase0();
      return;
    }

    // ── Mobile (≤991px): vertical animated journey by default.
    //    data-pf-mobile="static" → still frame · "loop" → run the desktop loop ─
    var mobileMode = root.getAttribute("data-pf-mobile");
    if (window.matchMedia("(max-width: 991px)").matches && mobileMode !== "loop") {
      if (mobileMode === "static") renderStaticPhase0();
      else buildMobile();
      return;
    }

    // Pre-split notification bodies once (SplitText mutates the DOM — do it a
    // single time, then re-animate the same lines every loop).
    var hasSplit = typeof SplitText !== "undefined";
    var splitLines = cards.map(function (colCards) {
      return colCards.map(function (card) {
        var body = card.querySelector("[data-pf-splittext]");
        if (body && hasSplit) return new SplitText(body, { type: "lines", mask: "lines" }).lines;
        return null;
      });
    });

    // Reveal one phase's cards straight into the master timeline (blur-dissolve +
    // optional SplitText line reveal). fromTo — not from — so the explicit end
    // state survives the initial autoAlpha:0 set and every repeat.
    function revealCards(phase, at) {
      cols.forEach(function (col, ci) {
        var card = cards[ci][phase];
        if (!card) return;
        master.fromTo(card, { autoAlpha: 0, filter: "blur(10px)" },
          { autoAlpha: 1, filter: "blur(0px)", duration: 1.4, ease: "power4.out" }, ci === 0 ? at : "<0.3");
        var lines = splitLines[ci][phase];
        if (lines && lines.length) master.from(lines, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power4.out" }, "<0.25");
        var media = card.querySelector("[data-pf-media]");   // img/video zoom-out on reveal
        if (media) master.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 1.5, ease: "power4.out" }, "<");
      });
    }

    function drawLine() {
      var tl = gsap.timeline().fromTo(draw, { drawSVG: "0% 0%" }, {
        drawSVG: "0% 100%", duration: DRAW_DUR, ease: "none",
        onUpdate: function () { lineFrac.a = 0; lineFrac.b = this.ratio; }
      });
      drawTweens.push(tl);
      return tl;
    }
    function undrawLine(nextPhase) {
      var tl = gsap.timeline().to(draw, {
        drawSVG: "100% 100%", duration: DRAW_DUR, ease: "none",
        onUpdate: function () { lineFrac.a = this.ratio; lineFrac.b = 1; },
        onStart: function () {
          gsap.to(root.querySelectorAll("[data-pf-pill-wrap]"), { width: 0, duration: 0.9, stagger: 0.35, ease: "power4.out" });
          gsap.to(pills, { color: MUTED, backgroundColor: TAG_OFF, borderColor: TAG_BD_OFF, duration: 1.1, stagger: 0.35, ease: "power4.out" });
        },
        onComplete: function () {
          pills.forEach(function (pill) {
            var t = pill.querySelector("[data-pf-pill-text]");
            if (!t) return;
            var v = t.getAttribute("data-t" + nextPhase);
            if (v) t.textContent = v;
          });
        }
      });
      drawTweens.push(tl);
      return tl;
    }

    // ── Master loop ───────────────────────────────────────────────────────────
    // Starts PAUSED — an IntersectionObserver below plays it when the section
    // enters the viewport and pauses it again when it leaves.
    var master = gsap.timeline({ repeat: -1, paused: true });

    for (var p = 0; p < PHASES; p++) {
      (function (phase) {
        var persona = personas[phase];
        var next = (phase + 1) % PHASES;

        // ~4s staged prep: 1) the line draws fully, 2) short beat, 3) the
        // sparks/pills open, 4) then the cards dissolve in.
        var pStart = master.duration();
        master.add(drawLine(), pStart);
        var ic = personIcon(persona);
        if (ic) master.to(ic, { color: ACCENT, duration: 1.1, ease: "power4.out" }, pStart + DRAW_DUR * 0.45);
        master.to(personLines(persona), { color: INK, duration: 1, ease: "power4.out" }, pStart + DRAW_DUR * 0.6);
        var sparkAt = pStart + DRAW_DUR + 0.25;              // sparks only AFTER the line is drawn
        master.to(root.querySelectorAll("[data-pf-pill-wrap]"), { width: "auto", duration: 1, stagger: 0.35, ease: "power4.out" }, sparkAt);
        master.to(pills, { color: ACCENT, backgroundColor: TAG_ON, borderColor: TAG_ON, duration: 1.1, stagger: 0.35, ease: "power4.out" }, sparkAt);
        revealCards(phase, sparkAt + 0.5);
        master.to({}, { duration: HOLD });

        master.add(undrawLine(next));
        master.to(personas, { yPercent: -100 * next, duration: 1, ease: "back.out(1.2)" }, "<30%");
        var outTargets = cards.map(function (c) { return c[phase]; }).filter(Boolean);
        master.to(outTargets, { autoAlpha: 0, filter: "blur(5px)", y: 32, duration: 1, stagger: 0.12, ease: "power4.out" }, "<");
        master.set(outTargets, { filter: "blur(0px)", y: 0 });
        if (next !== 0) {
          if (ic) master.to(ic, { color: MUTED, duration: 0.8 }, "<");
          master.to(personLines(persona), { color: MUTED, duration: 0.8 }, "<");
        } else {
          master.to([root.querySelectorAll("[data-pf-person]"), root.querySelectorAll("[data-pf-person-text]")], { color: MUTED, duration: 0.8 }, "<");
        }
      })(p);
    }

    // ── Viewport control: play in view, pause out of view ────────────────────
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) master.play();
          else master.pause();
        });
      }, { threshold: 0.2 });
      io.observe(root);
    } else {
      master.play();                                        // ancient browsers: just run
    }

    root._processFlowTimeline = master;                     // exposed for debugging
  }

  /**
   * Initializes every process-flow on the page in one call.
   * @param {string} [selector="[data-process-flow]"] narrow the scope if needed
   */
  function initProcessFlow(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek ProcessFlow] GSAP required."); return;
    }
    if (typeof DrawSVGPlugin !== "undefined") gsap.registerPlugin(DrawSVGPlugin);
    else console.warn("[Sestek ProcessFlow] DrawSVGPlugin missing — the line won't draw.");
    if (typeof SplitText !== "undefined") gsap.registerPlugin(SplitText);

    var roots = document.querySelectorAll(selector || "[data-process-flow]");
    if (!roots.length) { console.warn("[Sestek ProcessFlow] No [data-process-flow] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initProcessFlow = initProcessFlow;

})(typeof window !== "undefined" ? window : this);
