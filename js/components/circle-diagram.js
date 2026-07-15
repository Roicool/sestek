/*!
 * circle-diagram.js v1.1.0
 * Planhat-style circular diagram: N items (dot + label) sit evenly on a ring,
 * one item is active at a time, and a detail card (small tag + body text)
 * mirrors the active item. Desktop: hover activates. Mobile / touch: tap
 * activates. Optional autoplay steps through the items until the user
 * interacts.
 *
 * v1.1.0 — the ring is now an injected SVG (faint base circle + a bright arc
 *          segment that TRAVELS clockwise to the active item, like the
 *          reference); hover switching rewired to pointerenter (pointerType
 *          "mouse") so it works regardless of matchMedia hover quirks.
 *          The old [data-cd-ring] div is no longer needed — remove it.
 *
 * Requires : nothing hard — works standalone. If gsap (global) is present the
 *            card swap gets a blur-dissolve and the arc travel is tweened;
 *            otherwise both swap instantly. prefers-reduced-motion always
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
 * JS injects the ring SVG into the stage, positions each item on it (evenly,
 * starting at the top, or per data-cd-angle) and stamps
 * data-cd-side="top|right|bottom|left" on it so CSS can put the label on the
 * outside of the ring. Active item gets the class `is-active` (+ aria-current).
 *
 * Root attributes (all optional):
 *   data-cd-start      index of the initially active item        (default 0)
 *   data-cd-arc        arc segment length in % of the circle     (default 10)
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

  var SVG_NS = "http://www.w3.org/2000/svg";

  function cssVar(root, name, fallback) {
    var v = getComputedStyle(root).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

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
    var INK = cssVar(root, "--cd-ink", "#fff");
    var LINE = cssVar(root, "--cd-line", "rgba(255,255,255,.18)");
    var ARC = Math.min(Math.max(parseFloat(root.getAttribute("data-cd-arc")) || 10, 2), 40);

    // ── Injected ring: faint base circle + bright travelling arc ─────────────
    // pathLength=100 normalizes the circumference so dash math is in %.
    // The arc segment ends at 0° (3 o'clock) at rotation 0; rotating the
    // element by the active item's angle parks the arc's tip on its dot.
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "cd_svg");
    svg.setAttribute("aria-hidden", "true");

    function ring(stroke, width) {
      var c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", "50"); c.setAttribute("cy", "50"); c.setAttribute("r", "49.5");
      c.setAttribute("fill", "none");
      c.setAttribute("stroke", stroke);
      c.setAttribute("stroke-width", width);
      c.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(c);
      return c;
    }
    ring(LINE, "1");
    var arc = ring(INK, "1");
    arc.setAttribute("pathLength", "100");
    arc.setAttribute("stroke-linecap", "round");
    arc.setAttribute("stroke-dasharray", ARC + " " + (100 - ARC));
    arc.setAttribute("stroke-dashoffset", String(ARC));     // segment ends at 0°
    arc.setAttribute("opacity", "0.9");
    stage.insertBefore(svg, stage.firstChild);

    var arcRot = 0;                                         // current rotation (deg)
    function moveArc(deg, animate) {
      var delta = (((deg - arcRot) % 360) + 360) % 360;     // always clockwise
      if (delta === 0 && animate) delta = 360;              // full lap on repeat
      var target = arcRot + delta;
      if (animate && !reduced && hasGsap) {
        gsap.to(arc, { rotation: target, svgOrigin: "50 50", duration: 1.1, ease: "power3.inOut" });
      } else {
        if (hasGsap) gsap.set(arc, { rotation: target, svgOrigin: "50 50" });
        else arc.setAttribute("transform", "rotate(" + target + " 50 50)");
      }
      arcRot = target;
    }

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
