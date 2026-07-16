/*!
 * savings-calculator.js v1.1.0
 * Ramp-style live savings calculator — slider (total inquiries) + two number
 * inputs (cost per agent, number of agents) drive a big animated total.
 * Fully data-attribute driven — configure everything from Webflow, no JS opts.
 * Uses gsap when present; otherwise a built-in rAF tween — no hard dependency.
 *
 * Formula (annual saving):
 *   costPerInquiry = costPerAgent / capacity        (capacity: inquiries one
 *   handled        = totalInquiries × rate           agent handles per month)
 *   monthly        = handled × costPerInquiry, capped at agents × costPerAgent
 *   annual         = monthly × 12
 *
 * DOM (Webflow):
 *   <section data-savings-calc data-sv-rate="0.7" data-sv-capacity="600">
 *     <div class="sv-calc__slider">
 *       <div class="sv-calc__bubble" data-sv-bubble>50K</div>
 *       <input type="range" data-sv-range aria-label="Total inquiries per month">
 *       <div class="sv-calc__slider-label">Total Inquiries (monthly)</div>
 *     </div>
 *     <div class="sv-calc__inputs">
 *       <label>Cost per agent <input type="number" data-sv-cost value="1500"></label>
 *       <label>Number of agents <input type="number" data-sv-agents value="250"></label>
 *     </div>
 *     <div class="sv-calc__result">
 *       <span data-sv-total>$0</span><span class="sv-calc__per">/Year</span>
 *     </div>
 *   </section>
 *
 * Attributes on [data-savings-calc] (all optional):
 *   data-sv-rate       share of inquiries the Virtual Agent handles (default 0.7)
 *   data-sv-capacity   inquiries one human agent handles per month  (default 600)
 *   data-sv-min        slider minimum, monthly inquiries          (default 1000)
 *   data-sv-max        slider maximum, monthly inquiries        (default 500000)
 *   data-sv-start      slider starting value                     (default 50000)
 *   data-sv-currency   currency prefix on the big number            (default "$")
 *   data-sv-duration   count animation duration in seconds        (default 0.6)
 *
 * Input defaults: put value="" on the [data-sv-cost] / [data-sv-agents]
 * inputs in the HTML (fallbacks: 1500 / 250).
 *
 * Init: Sestek.initSavingsCalc() — scans [data-savings-calc].
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    rate: 0.7,
    capacity: 600,
    min: 1000,
    max: 500000,
    start: 50000,
    currency: "$",
    duration: 0.6,
    cost: 1500,
    agents: 250,
  };

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }

  function computeAnnualSaving(inquiries, costPerAgent, agents, o) {
    var costPerInquiry = costPerAgent / o.capacity;
    var monthly = inquiries * o.rate * costPerInquiry;
    var payroll = agents * costPerAgent;
    if (payroll > 0) monthly = Math.min(monthly, payroll);
    return Math.round(monthly * 12);
  }

  /* Log mapping: slider t∈[0,1] → inquiries, so the low end stays usable. */
  function tToValue(t, min, max) {
    return Math.round(min * Math.pow(max / min, t));
  }

  function abbreviate(n) {
    if (n >= 1e6) return trimZero(n / 1e6) + "M";
    if (n >= 1e3) return trimZero(n / 1e3) + "K";
    return String(n);
  }
  function trimZero(x) {
    var s = (Math.round(x * 10) / 10).toFixed(1);
    return s.replace(/\.0$/, "");
  }

  function formatMoney(n, currency) {
    return currency + Math.round(n).toLocaleString("en-US");
  }

  /**
   * Initializes every savings calculator on the page.
   * @param {string} [selector="[data-savings-calc]"]
   */
  function initSavingsCalc(selector) {
    var nodes = document.querySelectorAll(selector || "[data-savings-calc]");
    if (!nodes.length) { console.warn("[Sestek SavingsCalc] No element found."); return; }
    Array.prototype.forEach.call(nodes, setup);
  }

  function setup(root) {
    if (root._svCalcInit) return;                       // idempotent
    root._svCalcInit = true;

    var a = function (name) { return root.getAttribute("data-sv-" + name); };
    var o = {
      rate:     num(a("rate"),     DEFAULTS.rate),
      capacity: num(a("capacity"), DEFAULTS.capacity),
      min:      num(a("min"),      DEFAULTS.min),
      max:      num(a("max"),      DEFAULTS.max),
      start:    num(a("start"),    DEFAULTS.start),
      currency: a("currency") != null ? a("currency") : DEFAULTS.currency,
      duration: num(a("duration"), DEFAULTS.duration),
    };

    var el = {
      range  : root.querySelector("[data-sv-range]"),
      bubble : root.querySelector("[data-sv-bubble]"),
      cost   : root.querySelector("[data-sv-cost]"),
      agents : root.querySelector("[data-sv-agents]"),
      total  : root.querySelector("[data-sv-total]"),
    };
    var missing = Object.keys(el).filter(function (k) { return !el[k]; });
    if (missing.length) {
      console.warn("[Sestek SavingsCalc] Missing elements:", missing.join(", ")); return;
    }

    // Range input works on t ∈ [0,1000] for smoothness; value derived via log map.
    el.range.min = 0; el.range.max = 1000; el.range.step = 1;
    var startT = Math.log(o.start / o.min) / Math.log(o.max / o.min);
    el.range.value = Math.round(Math.max(0, Math.min(1, startT)) * 1000);
    if (!el.cost.value)   el.cost.value   = DEFAULTS.cost;   // or value="" in HTML
    if (!el.agents.value) el.agents.value = DEFAULTS.agents;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shown = { val: 0 };                             // tweened display value
    var rafId = null;

    /* rAF fallback tween (power3.out) for pages without gsap */
    function rafTween(target) {
      if (rafId) cancelAnimationFrame(rafId);
      var from = shown.val, start = null, DUR = o.duration * 1000;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / DUR, 1);
        var e = 1 - Math.pow(1 - p, 3);
        shown.val = from + (target - from) * e;
        render();
        if (p < 1) rafId = requestAnimationFrame(step);
      }
      rafId = requestAnimationFrame(step);
    }

    function currentInquiries() {
      return tToValue(el.range.value / 1000, o.min, o.max);
    }

    function render() {
      el.total.textContent = formatMoney(shown.val, o.currency);
    }

    function positionBubble() {
      var t = el.range.value / 1000;
      el.bubble.textContent = abbreviate(currentInquiries());
      // Thumb centre: offset by half thumb width at the extremes.
      // Bubble AND label both ride this var (see CSS --sv-left).
      var thumb = 16; // must match --sv-thumb-size in CSS
      root.style.setProperty("--sv-left",
        "calc(" + (t * 100) + "% + " + ((0.5 - t) * thumb) + "px)");
      root.style.setProperty("--sv-fill", (t * 100) + "%");
    }

    function update(instant) {
      var inquiries = currentInquiries();
      var cost   = Math.max(0, num(el.cost.value, 0));
      var agents = Math.max(0, num(el.agents.value, 0));
      var target = computeAnnualSaving(inquiries, cost, agents, o);

      positionBubble();

      if (instant || reduceMotion) {
        shown.val = target; render(); return;
      }
      if (typeof gsap !== "undefined") {
        gsap.to(shown, {
          val: target,
          duration: o.duration,
          ease: "power3.out",
          overwrite: true,
          onUpdate: render,
        });
      } else {
        rafTween(target);
      }
    }

    el.range.addEventListener("input", function () { update(false); });
    el.cost.addEventListener("input", function () { update(false); });
    el.agents.addEventListener("input", function () { update(false); });
    window.addEventListener("resize", positionBubble);

    update(true);                                       // first paint: no tween
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSavingsCalc = initSavingsCalc;

})(typeof window !== "undefined" ? window : this);
