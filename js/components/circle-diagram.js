/*!
 * circle-diagram.js v2.0.0
 * Planhat-style circular diagram: N items (dot + label) sit evenly on a ring,
 * one item is active at a time, and a detail card (small tag + body text)
 * mirrors the active item.
 *
 * v2.0.0 — CONSISTENT sync model. The rotating conic-gradient connector IS the
 *          autoplay: it spins clockwise at a constant speed and whenever its
 *          bright tip passes a node, that node becomes active and the card
 *          swaps — tip position and active item can never disagree. Hover
 *          (mouse) or tap (touch) interrupts: the tip sweeps to that node and
 *          holds; when the pointer leaves (or after data-cd-resume seconds on
 *          touch/keyboard) the spin resumes from where it stands. The old
 *          interval-based data-cd-autoplay is gone — data-cd-spin is the loop.
 * v1.2.0 — ring built the way the Framer reference does it: ONE injected div
 *          ([data-cd-connector]) whose background is a conic-gradient (faint
 *          line most of the way, blending to ink over the last degrees = the
 *          comet tail), hollowed into a 1px ring by a CSS radial mask, and
 *          simply ROTATED. Transform-only → GPU-cheap. Gradient / mask /
 *          thickness live in CSS (.cd_connector) — JS only rotates it.
 *
 * Requires : gsap (global) for the spin loop and animated swaps. Loads fine
 *            before gsap (probed lazily, per call). Without gsap the diagram
 *            still works: hover/tap activates, the connector sweep falls back
 *            to the CSS transition on .cd_connector, no spin loop.
 *            prefers-reduced-motion: no spin, instant swaps.
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-circle-diagram]                    root
 *     [data-cd-stage]                        square area holding the ring
 *       [data-cd-item]                       one node (ideally a <button>).
 *                                            data-cd-title="Input"   card tag
 *                                            data-cd-text="..."      card body
 *                                            data-cd-angle="-90"     optional
 *                                            angle override in degrees
 *                                            (0 = right, -90 = top)
 *         [data-cd-dot]                      the dot on the ring
 *         [data-cd-label]                    the label next to the dot
 *     [data-cd-card]                         detail card (bottom-right)
 *       [data-cd-card-title]                 gets the active item's title
 *       [data-cd-card-text]                  gets the active item's text
 *
 * JS injects the connector ring into the stage, positions each item on it
 * (evenly, starting at the top, or per data-cd-angle) and stamps
 * data-cd-side="top|right|bottom|left" on it so CSS can put the label on the
 * outside of the ring. Active item gets the class `is-active` (+ aria-current).
 *
 * Root attributes (all optional):
 *   data-cd-start      index of the initially active item          (default 0)
 *   data-cd-spin       seconds per revolution — the loop speed. With N evenly
 *                      spaced items each step lasts spin/N seconds.
 *                      (default 14; "0" disables the loop entirely)
 *   data-cd-resume     seconds after a tap / keyboard pick before the spin
 *                      resumes (mouse hover resumes on leave)      (default 3)
 *
 * Colour tokens (used by the CSS, with fallbacks):
 *   --cd-ink (#fff) · --cd-muted (rgba(255,255,255,.45)) · --cd-line (rgba(255,255,255,.15))
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function build(root) {
    if (root._circleDiagramInit) return;                    // idempotent
    root._circleDiagramInit = true;

    var stage = root.querySelector("[data-cd-stage]");
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-cd-item]"));
    var card = root.querySelector("[data-cd-card]");
    var cardTitle = card ? card.querySelector("[data-cd-card-title]") : null;
    var cardText = card ? card.querySelector("[data-cd-card-text]") : null;

    if (!stage || !items.length) {
      console.warn("[Sestek CircleDiagram] Need [data-cd-stage] and [data-cd-item] nodes.");
      return;
    }

    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var spinAttr = root.getAttribute("data-cd-spin");
    var SPIN = spinAttr === null ? 14 : parseFloat(spinAttr) || 0;
    var RESUME = parseFloat(root.getAttribute("data-cd-resume")) || 3;

    // gsap is probed lazily (per call, cheap) so it still counts if it loads
    // AFTER this script — e.g. Webflow footer order. The first time gsap
    // drives the connector we kill the CSS transition on it, otherwise the
    // transition re-tweens every gsap frame and the slow spin looks frozen.
    function gs() { return typeof gsap !== "undefined"; }
    var gsapDrives = false;
    function claimConnector() {
      if (!gsapDrives) { gsapDrives = true; connector.style.transition = "none"; }
    }

    // ── Injected ring: ONE conic-gradient connector, hollowed by a CSS mask ──
    // The Framer reference's technique: the gradient is the faint base line
    // most of the way round, blending to ink over the last degrees (the comet
    // tail, tip at 12 o'clock at rotation 0). Rotating the div moves the tip —
    // transform-only, so it never repaints. Styling lives in CSS (.cd_connector).
    var connector = document.createElement("div");
    connector.className = "cd_connector";
    connector.setAttribute("data-cd-connector", "");
    connector.setAttribute("aria-hidden", "true");
    stage.insertBefore(connector, stage.firstChild);

    // ── Place every item on the ring ─────────────────────────────────────────
    // Even distribution starting at the top (-90°), or data-cd-angle override.
    // data-cd-side lets CSS flip the label to the outside of the ring.
    var angles = items.map(function (item, i) {
      var deg = parseFloat(item.getAttribute("data-cd-angle"));
      if (isNaN(deg)) deg = -90 + (360 / items.length) * i;
      var rad = deg * Math.PI / 180;
      item.style.left = (50 + 50 * Math.cos(rad)) + "%";
      item.style.top = (50 + 50 * Math.sin(rad)) + "%";

      var norm = ((deg % 360) + 360) % 360;                 // 0..360, 0 = right
      var side = "right";
      if (norm > 245 && norm < 295) side = "top";
      else if (norm > 65 && norm < 115) side = "bottom";
      else if (norm > 115 && norm <= 245) side = "left";
      item.setAttribute("data-cd-side", side);

      if (item.tagName !== "BUTTON" && item.tagName !== "A") item.setAttribute("tabindex", "0");
      return deg;
    });

    // Connector rotation that parks the tip on item i (tip sits at -90° at 0).
    var tipRots = angles.map(function (d) { return (((d + 90) % 360) + 360) % 360; });

    /** The item whose node the tip passed last, for a given rotation. */
    function idxForRot(rot) {
      var t = ((rot % 360) + 360) % 360 + 0.001;            // epsilon: exact hits count
      var best = -1, bestRot = -Infinity;
      for (var i = 0; i < tipRots.length; i++) {
        if (tipRots[i] <= t && tipRots[i] > bestRot) { bestRot = tipRots[i]; best = i; }
      }
      if (best === -1) {                                    // before the first node: wrap
        for (var j = 0; j < tipRots.length; j++) {
          if (tipRots[j] > bestRot) { bestRot = tipRots[j]; best = j; }
        }
      }
      return best;
    }

    // ── Active state + card swap (does NOT touch the connector) ─────────────
    var active = -1;

    function fillCard(item) {
      var label = item.querySelector("[data-cd-label]");
      if (cardTitle) cardTitle.textContent = item.getAttribute("data-cd-title") ||
        (label ? label.textContent : "");
      if (cardText) cardText.textContent = item.getAttribute("data-cd-text") || "";
    }

    function applyActive(i, animate) {
      if (i === active || !items[i]) return;
      active = i;

      items.forEach(function (item, k) {
        item.classList.toggle("is-active", k === i);
        if (k === i) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });

      if (!card) return;
      if (animate && !reduced && gs()) {
        gsap.killTweensOf(card);
        gsap.to(card, {
          autoAlpha: 0, filter: "blur(6px)", duration: 0.22, ease: "power2.in",
          onComplete: function () {
            fillCard(items[i]);
            gsap.to(card, { autoAlpha: 1, filter: "blur(0px)", duration: 0.45, ease: "power3.out" });
          }
        });
      } else {
        fillCard(items[i]);
      }
    }

    // ── The loop: constant spin, tip drives the active item ──────────────────
    var inView = false;
    var hoverHeld = false;                                  // mouse parked on a node
    var spinTween = null;
    var resumeTimer = null;
    var arcRot = tipRots[0] || 0;                           // no-gsap fallback tracker

    function stopSpin() {
      if (spinTween) { spinTween.kill(); spinTween = null; }
    }

    function startSpin() {
      if (spinTween || !inView || hoverHeld || reduced || !gs() || SPIN <= 0) return;
      if (gsap.isTweening(connector)) return;               // a sweep is running; it restarts us
      claimConnector();
      spinTween = gsap.to(connector, {
        rotation: "+=360", duration: SPIN, ease: "none", repeat: -1,
        onUpdate: function () {
          var idx = idxForRot(parseFloat(gsap.getProperty(connector, "rotation")) || 0);
          if (idx !== active) applyActive(idx, true);       // tip crossed a node
        }
      });
    }

    function clearResume() {
      if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
    }
    function scheduleResume() {
      clearResume();
      if (hoverHeld || reduced || SPIN <= 0) return;
      resumeTimer = setTimeout(startSpin, RESUME * 1000);
    }

    /** Sweep the tip to item i (shortest clockwise), then hand back to the loop. */
    function sweepTo(i) {
      var cur = gs() ? (parseFloat(gsap.getProperty(connector, "rotation")) || 0) : arcRot;
      var delta = (((tipRots[i] - cur) % 360) + 360) % 360;
      var target = cur + delta;
      if (!reduced && gs()) {
        gsap.killTweensOf(connector);
        claimConnector();
        gsap.to(connector, { rotation: target, duration: 1, ease: "power3.inOut", onComplete: scheduleResume });
      } else if (gs()) {
        gsap.set(connector, { rotation: target });
        scheduleResume();
      } else {
        connector.style.transform = "rotate(" + target + "deg)";  // CSS transition animates
      }
      arcRot = target;
    }

    /** User picked item i: interrupt the loop, park the tip on it. */
    function engage(i) {
      clearResume();
      stopSpin();
      applyActive(i, true);
      sweepTo(i);
    }

    // ── Interaction: mouse hover holds, tap/click everywhere, keyboard too ──
    // pointerenter + pointerType check: touch taps never fire a "mouse"
    // pointerenter, so iOS's sticky-hover problem can't happen, and hybrid
    // (touchscreen laptop) mice still hover.
    items.forEach(function (item, i) {
      item.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        hoverHeld = true;
        engage(i);
      });
      item.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") return;
        hoverHeld = false;
        scheduleResume();
      });
      item.addEventListener("click", function () { engage(i); });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); engage(i); }
      });
    });

    // ── Initial frame: tip parked on the start item, no animation ───────────
    var start = parseInt(root.getAttribute("data-cd-start"), 10) || 0;
    applyActive(start, false);
    arcRot = tipRots[start] || 0;
    if (gs()) { claimConnector(); gsap.set(connector, { rotation: arcRot }); }
    else connector.style.transform = "rotate(" + arcRot + "deg)";

    // ── Viewport gate: loop only while the section is on screen ─────────────
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          inView = e.isIntersecting;
          if (inView) { if (spinTween) spinTween.play(); else startSpin(); }
          else if (spinTween) spinTween.pause();
        });
      }, { threshold: 0.15 });
      io.observe(root);
    } else {
      inView = true;
      startSpin();
    }
  }

  /**
   * Initializes every circle-diagram on the page in one call.
   * @param {string} [selector="[data-circle-diagram]"] narrow the scope if needed
   */
  function initCircleDiagram(selector) {
    var roots = document.querySelectorAll(selector || "[data-circle-diagram]");
    if (!roots.length) { console.warn("[Sestek CircleDiagram] No [data-circle-diagram] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCircleDiagram = initCircleDiagram;

})(typeof window !== "undefined" ? window : this);
