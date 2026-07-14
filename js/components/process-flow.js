/*!
 * process-flow.js v1.0.0
 * Auxia-style looping "flow" animation: a prompt line crossfades, a straight
 * line fills, a curved SVG path draws itself (native stroke-dashoffset — no paid
 * DrawSVGPlugin), segment tags open/close one by one, and a card track slides to
 * the matching card. On loop it fades out and snaps back (never reverse-draws),
 * swaps to the next prompt, and repeats forever.
 *
 * Requires : gsap (global). No Club plugins — draw = getTotalLength() + dashoffset.
 * CSS      : css/components/process-flow.css
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-process-flow]                     root
 *     [data-process-flow-prompt]            one prompt line per phase (stacked,
 *                                           crossfaded); count = number of phases
 *     [data-process-flow-avatar]            start node — colour shifts to accent
 *     [data-process-flow-line]              a line container (position:relative,
 *                                           overflow:hidden). First one fills
 *                                           before the curve, last one after the
 *                                           tags. Each holds:
 *       [data-process-flow-fill]            the fill span (width 0% → 100%)
 *     [data-process-flow-draw]              the drawn <path> (its real length is
 *                                           read with getTotalLength())
 *     [data-process-flow-tag]               one segment tag (count = # cards). Holds:
 *       [data-process-flow-tag-wrap]        width 0 → auto wrapper (NOT the text)
 *       [data-process-flow-tag-text]        the label (optional — colour shifts)
 *     [data-process-flow-viewport]          overflow:hidden clip
 *       [data-process-flow-track]           flex track (sized by JS to N×100%)
 *         [data-process-flow-card]          one card; its FIRST CHILD is animated
 *
 * Root attributes (all optional):
 *   data-process-flow-card-delay    pause after each card, seconds  (default 0.6)
 *   data-process-flow-phase-delay   pause at the end of a phase, s  (default 1.4)
 *
 * Colour tokens (read from CSS custom properties on the root, with fallbacks):
 *   --pf-accent (#0b4fff) · --pf-muted (#c3c2b2)
 *   --pf-tag-active-bg (#d8dade) · --pf-tag-idle-bg (#f0efe3)
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
    var prompts = toArray(root.querySelectorAll("[data-process-flow-prompt]"));
    var avatar = root.querySelector("[data-process-flow-avatar]");
    var fills = toArray(root.querySelectorAll("[data-process-flow-fill]"));
    var draw = root.querySelector("[data-process-flow-draw]");
    var tags = toArray(root.querySelectorAll("[data-process-flow-tag]"));
    var track = root.querySelector("[data-process-flow-track]");
    var cards = toArray(root.querySelectorAll("[data-process-flow-card]"));

    if (!draw || !track || !tags.length || !cards.length) {
      console.warn("[Sestek ProcessFlow] Need [data-process-flow-draw], " +
        "[data-process-flow-track], and matching [data-process-flow-tag]/" +
        "[data-process-flow-card] elements.");
      return;
    }

    // Colours (design lives in CSS; JS only reads them so the timeline stays synced)
    var accent = cssVar(root, "--pf-accent", "#0b4fff");
    var muted = cssVar(root, "--pf-muted", "#c3c2b2");
    var tagActiveBg = cssVar(root, "--pf-tag-active-bg", "#d8dade");
    var tagIdleBg = cssVar(root, "--pf-tag-idle-bg", "#f0efe3");

    var CARD_DELAY = parseFloat(root.getAttribute("data-process-flow-card-delay")) || 0.6;
    var PHASE_DELAY = parseFloat(root.getAttribute("data-process-flow-phase-delay")) || 1.4;

    var segCount = Math.min(tags.length, cards.length);
    var stepPct = 100 / segCount;
    var firstFill = fills[0] || null;
    var lastFill = fills.length ? fills[fills.length - 1] : null;

    function wrapOf(tag) { return tag.querySelector("[data-process-flow-tag-wrap]"); }
    function textOf(tag) { return tag.querySelector("[data-process-flow-tag-text]"); }
    function contentOf(card) { return card.firstElementChild; }

    // Manual "DrawSVG": animate stroke-dashoffset over the path's real length.
    // offset = length → invisible (drawSVG 0%);  offset = 0 → fully drawn.
    var drawLen = draw.getTotalLength();

    // ── Layout the track from the real segment count ──────────────────────────
    gsap.set(track, { width: segCount * 100 + "%" });
    cards.slice(0, segCount).forEach(function (card) {
      gsap.set(card, { width: stepPct + "%" });
    });

    // ── Initial (hidden) state ────────────────────────────────────────────────
    gsap.set(draw, { strokeDasharray: drawLen, strokeDashoffset: drawLen });
    if (fills.length) gsap.set(fills, { width: "0%" });
    tags.forEach(function (tag) {
      var w = wrapOf(tag);
      if (w) gsap.set(w, { width: 0 });
    });
    cards.forEach(function (card) {
      var c = contentOf(card);
      if (c) gsap.set(c, { opacity: 0, y: 12 });
    });
    if (avatar) gsap.set(avatar, { color: muted });
    if (prompts.length) {
      gsap.set(prompts, { opacity: 0 });
      gsap.set(prompts[0], { opacity: 1 });
    }

    // ── Reduced motion: resolve one static frame, no loop ─────────────────────
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (fills.length) gsap.set(fills, { width: "100%" });
      gsap.set(draw, { strokeDashoffset: 0 });
      if (avatar) gsap.set(avatar, { color: accent });
      var t0 = tags[0], w0 = wrapOf(t0), x0 = textOf(t0), c0 = contentOf(cards[0]);
      gsap.set(t0, { backgroundColor: tagActiveBg, color: accent });
      if (w0) gsap.set(w0, { width: "auto" });
      if (x0) gsap.set(x0, { color: accent });
      if (c0) gsap.set(c0, { opacity: 1, y: 0 });
      return;
    }

    // ── Master infinite timeline ──────────────────────────────────────────────
    var tl = gsap.timeline({ repeat: -1, defaults: { ease: "power4.out" } });

    prompts.forEach(function (_, phaseIndex) {
      addPhase();
      addReset(phaseIndex);
    });
    // No prompts? still loop the flow once per cycle.
    if (!prompts.length) { addPhase(); addReset(-1); }

    function addPhase() {
      // 1) first straight line fills
      if (firstFill) tl.to(firstFill, { width: "100%", duration: 0.5 });
      if (avatar) tl.to(avatar, { color: accent, duration: 0.5 }, "<50%");

      // 2) curved SVG line draws itself (dashoffset → 0)
      tl.to(draw, { strokeDashoffset: 0, duration: 0.6 }, "-=0.3");

      // 3) walk the segment tags/cards
      tags.slice(0, segCount).forEach(function (tag, i) {
        var isFirst = i === 0;
        var wrap = wrapOf(tag);
        var text = textOf(tag);

        tl.to(tag, { backgroundColor: tagActiveBg, color: accent, duration: 0.4 },
          isFirst ? "-=0.1" : "<0.3");
        if (wrap) tl.to(wrap, { width: "auto", duration: 0.6 }, "<");
        if (text) tl.to(text, { color: accent, duration: 0.4 }, "<");

        if (!isFirst) {
          var prevWrap = wrapOf(tags[i - 1]);
          if (prevWrap) tl.to(prevWrap, { width: 0, duration: 0.6 }, "<");
          tl.to(track, { xPercent: -stepPct * i, duration: 0.8 }, "<");
        }

        var content = contentOf(cards[i]);
        if (content) tl.to(content, { opacity: 1, y: 0, duration: isFirst ? 0.5 : 0.7 }, "<");
        tl.to({}, { duration: CARD_DELAY });                // empty tween = pure wait
      });

      // 4) second straight line fills to "close" the phase
      if (lastFill && lastFill !== firstFill) {
        tl.to(lastFill, { width: "100%", duration: 0.6 }, "<");
      }
      tl.to({}, { duration: PHASE_DELAY });
    }

    function addReset(phaseIndex) {
      var contents = cards.map(contentOf).filter(Boolean);
      var wraps = tags.map(wrapOf).filter(Boolean);
      var texts = tags.map(textOf).filter(Boolean);
      var fadeTargets = fills.concat([draw]);

      // 1) lines + curve FADE out (never reverse-drawn — matches Auxia)
      tl.to(fadeTargets, { opacity: 0, duration: 0.6 });
      if (contents.length) tl.to(contents, { opacity: 0, y: 12, duration: 0.6 }, "<");
      if (wraps.length) tl.to(wraps, { width: 0, duration: 0.6 }, "<");
      if (avatar) tl.to(avatar, { color: muted, duration: 0.4 }, "<");
      tl.to(tags, { backgroundColor: tagIdleBg, color: muted, duration: 0.4 }, "<");
      if (texts.length) tl.to(texts, { color: muted, duration: 0.4 }, "<");

      // 2) crossfade prompt
      if (prompts.length) {
        var next = (phaseIndex + 1) % prompts.length;
        tl.to(prompts[phaseIndex], { opacity: 0, duration: 0.6 }, "<");
        tl.to(prompts[next], { opacity: 1, duration: 0.6 }, "<");
      }

      // 3) reset the card track, then SNAP everything back (no reverse anim)
      tl.to(track, { xPercent: 0, duration: 0.6 }, "<");
      if (fills.length) tl.set(fills, { width: "0%" });
      tl.set(draw, { strokeDashoffset: drawLen });
      tl.set(fadeTargets, { opacity: 1 });
    }

    root._processFlowTimeline = tl;                         // exposed for debugging
  }

  /**
   * Initializes every process-flow on the page in one call.
   * @param {string} [selector="[data-process-flow]"] narrow the scope if needed
   */
  function initProcessFlow(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek ProcessFlow] GSAP required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-process-flow]");
    if (!roots.length) { console.warn("[Sestek ProcessFlow] No [data-process-flow] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initProcessFlow = initProcessFlow;

})(typeof window !== "undefined" ? window : this);
