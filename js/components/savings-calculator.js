/*!
 * savings-calculator.js v1.0.0
 * Ramp-style live savings calculator — slider (total inquiries) + two number
 * inputs (cost per agent, number of agents) drive a big animated total.
 * Uses gsap when present; otherwise a built-in rAF tween — no hard dependency.
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    // Formula assumptions (Sestek Virtual Agent savings model)
    automationRate: 0.7,     // share of inquiries the Virtual Agent handles
    inquiriesPerAgent: 600,  // inquiries one human agent handles per month
    // Slider range (monthly inquiries) — mapped logarithmically like Ramp
    minInquiries: 1000,
    maxInquiries: 500000,
    startInquiries: 50000,
    // Input defaults
    costPerAgent: 1500,      // monthly fully-loaded cost of one agent ($)
    numberOfAgents: 250,
    currency: "$",
    period: "/Year",
  };

  /**
   * Annual saving:
   *   costPerInquiry  = costPerAgent / inquiriesPerAgent
   *   handledByVA     = totalInquiries × automationRate
   *   monthlySaving   = handledByVA × costPerInquiry  (capped at total payroll)
   *   annualSaving    = monthlySaving × 12
   */
  function computeAnnualSaving(inquiries, costPerAgent, agents, opts) {
    var costPerInquiry = costPerAgent / opts.inquiriesPerAgent;
    var monthly = inquiries * opts.automationRate * costPerInquiry;
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
   * @param {object} [options] overrides for DEFAULTS
   */
  function initSavingsCalc(selector, options) {
    var nodes = document.querySelectorAll(selector || "[data-savings-calc]");
    if (!nodes.length) { console.warn("[Sestek SavingsCalc] No element found."); return; }
    Array.prototype.forEach.call(nodes, function (root) { setup(root, options); });
  }

  function setup(root, options) {
    if (root._svCalcInit) return;                       // idempotent
    root._svCalcInit = true;

    var opts = {};
    for (var k in DEFAULTS) opts[k] = DEFAULTS[k];
    for (var o in (options || {})) opts[o] = options[o];
    // Per-instance overrides via data attributes
    if (root.dataset.svRate)     opts.automationRate    = parseFloat(root.dataset.svRate);
    if (root.dataset.svCapacity) opts.inquiriesPerAgent = parseFloat(root.dataset.svCapacity);

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
    var startT = Math.log(opts.startInquiries / opts.minInquiries) /
                 Math.log(opts.maxInquiries / opts.minInquiries);
    el.range.value = Math.round(startT * 1000);
    if (!el.cost.value)   el.cost.value   = opts.costPerAgent;
    if (!el.agents.value) el.agents.value = opts.numberOfAgents;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var shown = { val: 0 };                             // tweened display value
    var rafId = null;

    /* rAF fallback tween (power3.out) for pages without gsap */
    function rafTween(target) {
      if (rafId) cancelAnimationFrame(rafId);
      var from = shown.val, start = null, DUR = 600;
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
      return tToValue(el.range.value / 1000, opts.minInquiries, opts.maxInquiries);
    }

    function render() {
      el.total.textContent = formatMoney(shown.val, opts.currency);
    }

    function positionBubble() {
      var t = el.range.value / 1000;
      el.bubble.textContent = abbreviate(currentInquiries());
      // Track thumb centre: offset by half thumb width at the extremes
      var thumb = 24; // must match --sv-thumb-size in CSS
      el.bubble.style.left =
        "calc(" + (t * 100) + "% + " + ((0.5 - t) * thumb) + "px)";
      root.style.setProperty("--sv-fill", (t * 100) + "%");
    }

    function update(instant) {
      var inquiries = currentInquiries();
      var cost   = Math.max(0, parseFloat(el.cost.value)   || 0);
      var agents = Math.max(0, parseFloat(el.agents.value) || 0);
      var target = computeAnnualSaving(inquiries, cost, agents, opts);

      positionBubble();

      if (instant || reduceMotion) {
        shown.val = target; render(); return;
      }
      if (typeof gsap !== "undefined") {
        gsap.to(shown, {
          val: target,
          duration: 0.6,
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
