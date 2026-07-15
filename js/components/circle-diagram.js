/*!
 * circle-diagram.js v1.3.0
 * Planhat-style circular diagram: N items (dot + label) sit evenly on a ring,
 * one item is active at a time, and a detail card (small tag + body text)
 * mirrors the active item. Desktop: hover activates. Mobile / touch: tap
 * activates. Optional autoplay steps through the items until the user
 * interacts.
 *
 * v1.3.0 — idle spin: the connector rotates continuously (slow, linear) while
 *          the section is in view; on hover/tap/autoplay it sweeps to the
 *          active item, then resumes spinning from there. data-cd-spin sets
 *          seconds per revolution (default 14, "0" disables). Needs gsap;
 *          without it the connector only moves on activation (CSS transition).
 * v1.2.0 — ring rebuilt the way the Framer reference actually does it: ONE
 *          injected div ([data-cd-connector]) whose background is a
 *          conic-gradient (faint line most of the way, blending to ink over
 *          the last degrees = the comet tail), hollowed into a 1px ring by a
 *          CSS radial mask, and simply ROTATED so the bright tip parks on the
 *          active item. Transform-only → GPU-cheap. The gradient/mask/thickness
 *          all live in CSS (.cd_connector) — JS only rotates it.
 * v1.1.0 — hover switching rewired to pointerenter (pointerType "mouse") so
 *          it works regardless of matchMedia hover quirks.
 *          The old [data-cd-ring] div is no longer needed — remove it.
 *
 * Requires : nothing hard — works standalone. If gsap (global) is present the
 *            card swap gets a blur-dissolve and the connector rotation is
 *            tweened; without gsap the rotation falls back to the CSS
 *            transition on .cd_connector. prefers-reduced-motion always
 *            forces the instant swap.
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
 * JS injects the connector ring into the stage, positions each item on it (evenly,
 * starting at the top, or per data-cd-angle) and stamps
 * data-cd-side="top|right|bottom|left" on it so CSS can put the label on the
 * outside of the ring. Active item gets the class `is-active` (+ aria-current).
 *
 * Root attributes (all optional):
 *   data-cd-start      index of the initially active item        (default 0)
 *   data-cd-spin       seconds per idle revolution of the connector
 *                      (default 14; "0" disables the idle spin)
 *   data-cd-autoplay   seconds per step; steps through the items while the
 *                      section is in view and STOPS for good on first user
 *                      interaction. Omit = no autoplay.
 *
 * Colour tokens (read from CSS custom properties on the root, with fallbacks):
 *   --cd-ink (#fff) · --cd-muted (rgba(255,255,255,.55)) · --cd-line (rgba(255,255,255,.18))
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
    var hasGsap = typeof gsap !== "undefined";

    // ── Injected ring: ONE conic-gradient connector, hollowed by a CSS mask ──
    // Exactly the Framer reference's technique: the gradient is the faint base
    // line most of the way round, blending to ink over the last degrees (the
    // comet tail, tip at 12 o'clock at rotation 0). Rotating the div parks the
    // tip on the active item — transform-only, so it never repaints.
    // Gradient / mask / thickness live in CSS (.cd_connector).
    var connector = document.createElement("div");
    connector.className = "cd_connector";
    connector.setAttribute("data-cd-connector", "");
    connector.setAttribute("aria-hidden", "true");
    stage.insertBefore(connector, stage.firstChild);

    // Idle spin: slow endless clockwise rotation while nothing is happening.
    // Activation kills it, sweeps to the item, then hands back to the spin.
    var spinAttr = root.getAttribute("data-cd-spin");
    var SPIN = spinAttr === null ? 14 : parseFloat(spinAttr) || 0;
    var spinning = false;                                   // wants-to-spin flag (viewport)
    var spinTween = null;

    function startSpin() {
      if (!spinning || spinTween || reduced || !hasGsap || SPIN <= 0) return;
      if (gsap.isTweening(connector)) return;               // a sweep is running; it restarts us
      spinTween = gsap.to(connector, { rotation: "+=360", duration: SPIN, ease: "none", repeat: -1 });
    }
    function stopSpin() {
      if (spinTween) { spinTween.kill(); spinTween = null; }
    }

    var arcRot = 0;                                         // rotation fallback tracker (deg)
    function moveArc(deg, animate) {
      var cur = hasGsap ? (parseFloat(gsap.getProperty(connector, "rotation")) || 0) : arcRot;
      var tip = deg + 90;                                   // gradient tip sits at -90° (top)
      var delta = (((tip - cur) % 360) + 360) % 360;        // always clockwise
      if (delta === 0 && animate) delta = 360;              // full lap on repeat
      var target = cur + delta;
      stopSpin();
      if (animate && !reduced && hasGsap) {
        gsap.killTweensOf(connector);
        gsap.to(connector, { rotation: target, duration: 1.2, ease: "power3.inOut", onComplete: startSpin });
      } else if (hasGsap) {
        gsap.set(connector, { rotation: target });
        startSpin();
      } else {
        // no gsap: the CSS transition on .cd_connector animates this
        connector.style.transform = "rotate(" + target + "deg)";
      }
      arcRot = target;
    }

    // Spin only while the section is actually on screen.
    if (typeof IntersectionObserver !== "undefined") {
      var spinIo = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          spinning = e.isIntersecting;
          if (spinning) { if (spinTween) spinTween.play(); else startSpin(); }
          else if (spinTween) spinTween.pause();
        });
      }, { threshold: 0.15 });
      spinIo.observe(root);
    } else { spinning = true; }

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

    // ── Active state + card swap ─────────────────────────────────────────────
    var active = -1;

    function fillCard(item) {
      var label = item.querySelector("[data-cd-label]");
      if (cardTitle) cardTitle.textContent = item.getAttribute("data-cd-title") ||
        (label ? label.textContent : "");
      if (cardText) cardText.textContent = item.getAttribute("data-cd-text") || "";
    }

    function setActive(i, animate) {
      if (i === active || !items[i]) return;
      active = i;

      items.forEach(function (item, k) {
        item.classList.toggle("is-active", k === i);
        if (k === i) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });

      moveArc(angles[i], animate);

      if (!card) return;
      if (animate && !reduced && hasGsap) {
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

    // ── Interaction: mouse hover switches, tap/click everywhere ─────────────
    // pointerenter + pointerType check instead of a matchMedia(hover) gate:
    // touch taps never fire a "mouse" pointerenter, so iOS's sticky-hover
    // problem can't happen, and hybrid (touchscreen laptop) mice still hover.
    var interacted = false;
    function userPick(i) {
      interacted = true;                                    // kills autoplay for good
      setActive(i, true);
    }

    items.forEach(function (item, i) {
      item.addEventListener("click", function () { userPick(i); });
      item.addEventListener("pointerenter", function (e) {
        if (e.pointerType === "mouse") userPick(i);
      });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); userPick(i); }
      });
    });

    // Initial frame — no animation, just the resolved state.
    setActive(parseInt(root.getAttribute("data-cd-start"), 10) || 0, false);

    // ── Optional autoplay: step while in view, stop on first interaction ─────
    var step = parseFloat(root.getAttribute("data-cd-autoplay"));
    if (step > 0 && !reduced) {
      var timer = null;
      function play() {
        if (timer || interacted) return;
        timer = setInterval(function () {
          if (interacted) { clearInterval(timer); timer = null; return; }
          setActive((active + 1) % items.length, true);
        }, step * 1000);
      }
      function pause() { if (timer) { clearInterval(timer); timer = null; } }

      if (typeof IntersectionObserver !== "undefined") {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) play(); else pause(); });
        }, { threshold: 0.25 });
        io.observe(root);
      } else { play(); }
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
