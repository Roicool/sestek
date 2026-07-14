/*!
 * process-flow.js v2.0.0
 * Auxia-style looping journey hero: a left persona stack scrolls one row per
 * phase (active row highlighted), a stepped blue line draws across (DrawSVG),
 * segment pills sit on the line and swap their labels per phase, and three
 * cards (notification / media / checkout) blur-dissolve in and out. One
 * repeat:-1 master timeline, N phases (= persona count).
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
 * Root attributes (all optional):
 *   data-pf-hold        seconds each phase holds before transitioning (default 2)
 *   data-pf-draw-dur    line draw / undraw duration in seconds       (default 1.5)
 *
 * Colour tokens (read from CSS custom properties on the root, with fallbacks):
 *   --pf-accent (#0b4fff) · --pf-ink (#232323) · --pf-muted (#c3c2b2)
 *   --pf-tag-active-bg (#d8dade) · --pf-tag-idle-bg (#f0efe3) · --pf-tag-idle-bd (#e2e1d3)
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

    if (!draw || !personas.length || !cols.length) {
      console.warn("[Sestek ProcessFlow] Need [data-pf-draw], [data-pf-persona] " +
        "rows and [data-pf-col] card columns.");
      return;
    }

    var PHASES = personas.length;
    var HOLD = parseFloat(root.getAttribute("data-pf-hold")) || 2;
    var DRAW_DUR = parseFloat(root.getAttribute("data-pf-draw-dur")) || 1.5;

    var ACCENT = cssVar(root, "--pf-accent", "#0b4fff");
    var INK = cssVar(root, "--pf-ink", "#232323");
    var MUTED = cssVar(root, "--pf-muted", "#c3c2b2");
    var TAG_ON = cssVar(root, "--pf-tag-active-bg", "#d8dade");
    var TAG_OFF = cssVar(root, "--pf-tag-idle-bg", "#f0efe3");
    var TAG_BD_OFF = cssVar(root, "--pf-tag-idle-bd", "#e2e1d3");

    // cards[col][phase] — one card per column per phase
    var cards = cols.map(function (col) { return toArray(col.querySelectorAll("[data-pf-card]")); });

    function personLines(p) { return p.querySelectorAll("[data-pf-person-text]"); }
    function personIcon(p) { return p.querySelector("[data-pf-person]"); }

    // ── Static / initial state ────────────────────────────────────────────────
    gsap.set(draw, { drawSVG: "0% 0%" });
    gsap.set(pills, { color: MUTED, backgroundColor: TAG_OFF, borderColor: TAG_BD_OFF });
    gsap.set(root.querySelectorAll("[data-pf-pill-wrap]"), { width: 0 });
    cards.forEach(function (colCards) { colCards.forEach(function (c) { gsap.set(c, { autoAlpha: 0 }); }); });
    personas.forEach(function (p) {
      gsap.set(personLines(p), { color: MUTED });
      var ic = personIcon(p); if (ic) gsap.set(ic, { color: MUTED });
    });

    // ── Reduced motion: resolve phase 0 statically, no loop ───────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(draw, { drawSVG: "0% 100%" });
      gsap.set(pills, { color: ACCENT, backgroundColor: TAG_ON, borderColor: TAG_ON });
      gsap.set(root.querySelectorAll("[data-pf-pill-wrap]"), { width: "auto" });
      var p0 = personas[0];
      gsap.set(personLines(p0), { color: INK });
      var ic0 = personIcon(p0); if (ic0) gsap.set(ic0, { color: ACCENT });
      cards.forEach(function (colCards) { if (colCards[0]) gsap.set(colCards[0], { autoAlpha: 1 }); });
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
    function revealCards(phase) {
      cols.forEach(function (col, ci) {
        var card = cards[ci][phase];
        if (!card) return;
        master.fromTo(card, { autoAlpha: 0, filter: "blur(10px)" },
          { autoAlpha: 1, filter: "blur(0px)", duration: 1.4, ease: "power4.out" }, ci === 0 ? "<0.2" : "<");
        var lines = splitLines[ci][phase];
        if (lines) master.from(lines, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.08, ease: "power4.out" }, "<0.25");
      });
    }

    function drawLine() {
      return gsap.timeline().fromTo(draw, { drawSVG: "0% 0%" },
        { drawSVG: "0% 100%", duration: DRAW_DUR, ease: "none" });
    }
    function undrawLine(nextPhase) {
      return gsap.timeline().to(draw, {
        drawSVG: "100% 100%", duration: DRAW_DUR, ease: "none",
        onStart: function () {
          gsap.to(root.querySelectorAll("[data-pf-pill-wrap]"), { width: 0, duration: 0.9, stagger: 0.25, ease: "power4.out" });
          gsap.to(pills, { color: MUTED, backgroundColor: TAG_OFF, borderColor: TAG_BD_OFF, duration: 1.1, stagger: 0.25, ease: "power4.out" });
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
    }

    // ── Master loop ───────────────────────────────────────────────────────────
    var master = gsap.timeline({ repeat: -1 });

    for (var p = 0; p < PHASES; p++) {
      (function (phase) {
        var persona = personas[phase];
        var next = (phase + 1) % PHASES;

        master.add(drawLine());
        var ic = personIcon(persona);
        if (ic) master.to(ic, { color: ACCENT, duration: 1.1, ease: "power4.out" }, "<0.9");
        master.to(personLines(persona), { color: INK, duration: 1, ease: "power4.out" }, "<0.3");
        master.to(root.querySelectorAll("[data-pf-pill-wrap]"), { width: "auto", duration: 1, stagger: 0.25, ease: "power4.out" }, "<0.1");
        master.to(pills, { color: ACCENT, backgroundColor: TAG_ON, borderColor: TAG_ON, duration: 1.1, stagger: 0.25, ease: "power4.out" }, "<");
        revealCards(phase);
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
