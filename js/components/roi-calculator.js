/*!
 * roi-calculator.js v3.0.0  (was savings-calculator.js v2.1.0)
 * Ramp-style live ROI calculator — custom div-based slider (Radix-like
 * structure, no native <input type=range>, so Webflow CSS can't break it)
 * and a NumberFlow-style rolling counter: every digit is a vertical strip
 * that rolls to its new value (CSS transitions — works with or without gsap).
 * Fully data-attribute driven — configure everything from Webflow.
 *
 * v3: the SLIDER is now "Number of agents"; "Total inquiries (monthly)" and
 * "Cost per agent" are the two number inputs. Formula = the original sestek.com
 * ROI page (calculate_roi):
 *   totalCostOfAgents = agents × costPerAgent
 *   costPerCall       = totalCostOfAgents / inquiries
 *   costPerCallAfter  = costPerCall × (1 − rate)
 *   monthly           = inquiries × (costPerCall − costPerCallAfter)
 *                     = totalCostOfAgents × rate      (inquiries cancels out —
 *                       it only shapes the per-call figures, not the total)
 *   annual            = monthly × 12
 *   fte               = monthly / costPerAgent
 *
 * DOM (Webflow):
 *   <section data-savings-calc>
 *     <div class="sv-calc__slider">
 *       <div class="sv-calc__bubble" data-sv-bubble>250</div>
 *       <div class="sv-calc__track" data-sv-track>
 *         <div class="sv-calc__fill" data-sv-fill></div>
 *         <div class="sv-calc__thumb" data-sv-thumb tabindex="0"
 *              aria-label="Number of agents"></div>
 *       </div>
 *       <div class="sv-calc__slider-label">Number of agents</div>
 *     </div>
 *     <div class="sv-calc__inputs">
 *       <label>Cost per agent ($/month)      <input type="number" data-sv-cost value="3000"></label>
 *       <label>Total inquiries (monthly)     <input type="number" data-sv-inquiries value="50000"></label>
 *     </div>
 *     <div class="sv-calc__result">
 *       <span data-sv-total>$0</span><span class="sv-calc__per">/Year</span>
 *     </div>
 *     <!-- optional extra outputs (plain text, any element): -->
 *     <span data-sv-monthly></span> <span data-sv-fte></span>
 *     <span data-sv-total-cost></span> <span data-sv-cost-per-call></span>
 *     <span data-sv-cost-per-call-after></span>
 *   </section>
 *
 * Attributes on [data-savings-calc] (all optional):
 *   data-sv-rate       cost decrease after automation: 0.7 or 70 (%)  (default 0.7)
 *   data-sv-min        slider minimum, number of agents               (default 5)
 *   data-sv-max        slider maximum, number of agents            (default 5000)
 *   data-sv-start      slider starting value — omit to start at the middle
 *   data-sv-currency   currency prefix on the big number            (default "$")
 *   data-sv-duration   digit roll duration in seconds             (default 0.9)
 *
 * Input defaults: put value="" on the [data-sv-cost] / [data-sv-inquiries]
 * inputs in the HTML (fallbacks: 3000 / 50000). A legacy [data-sv-agents]
 * input is accepted as the inquiries input (with a console warning).
 *
 * Init: Sestek.initRoiCalc() — scans [data-savings-calc].
 *       Sestek.initSavingsCalc() kept as an alias.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    rate: 0.7,
    min: 5,
    max: 5000,
    currency: "$",
    duration: 0.9,
    cost: 3000,
    inquiries: 50000,
  };

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

  /* Original calculate_roi(), untouched maths. inquiries = 0 only kills the
     per-call figures; the total is agents × cost × rate regardless. */
  function computeRoi(agents, costPerAgent, inquiries, rate) {
    var totalCost = agents * costPerAgent;
    var costPerCall = inquiries > 0 ? totalCost / inquiries : 0;
    var costPerCallAfter = costPerCall * (1 - rate);
    var monthly = totalCost * rate;                 // = inquiries × (costPerCall − costPerCallAfter)
    return {
      totalCost: totalCost,
      costPerCall: costPerCall,
      costPerCallAfter: costPerCallAfter,
      monthly: monthly,
      annual: Math.round(monthly * 12),
      fte: costPerAgent > 0 ? monthly / costPerAgent : 0,
    };
  }

  /* Log mapping: slider t∈[0,1] → agents, so the low end stays usable. */
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

  /* ── NumberFlow-style rolling counter ─────────────────────────
     Each character is a column; digit columns hold a 0-9 strip that
     rolls (CSS transition on transform) to the new digit. Columns are
     aligned from the RIGHT so units keep their identity as the number
     grows/shrinks. */
  function createRoller(host, reduceMotion, durationSec) {
    host.textContent = "";
    host.classList.add("sv-num");
    var cols = [];                       // left → right

    // Hidden measurer: non-digit chars ($ , .) get their real width in em,
    // so column widths can transition smoothly when the number grows/shrinks.
    var measure = document.createElement("span");
    measure.className = "sv-num__measure";
    measure.setAttribute("aria-hidden", "true");
    host.appendChild(measure);
    var emCache = {};
    function charEm(ch) {
      if (emCache[ch] == null) {
        measure.textContent = ch;
        var fs = parseFloat(getComputedStyle(host).fontSize) || 16;
        emCache[ch] = measure.getBoundingClientRect().width / fs;
      }
      return emCache[ch];
    }

    function makeCol() {
      var col = document.createElement("span");
      col.className = "sv-num__col";
      col.setAttribute("aria-hidden", "true");
      return col;
    }
    function makeStrip() {
      var strip = document.createElement("span");
      strip.className = "sv-num__strip";
      for (var d = 0; d <= 9; d++) {
        var s = document.createElement("span");
        s.textContent = d;
        strip.appendChild(s);
      }
      return strip;
    }
    function setCol(c, ch) {
      var isDigit = ch >= "0" && ch <= "9";
      if (isDigit) {
        if (!c.strip) {
          c.el.textContent = "";
          c.el.classList.add("sv-num__col--digit");
          c.strip = makeStrip();
          c.el.appendChild(c.strip);
          if (!reduceMotion) void c.el.offsetWidth;   // flush → first roll animates
        }
        c.strip.style.transform = "translateY(" + (-(+ch) * 10) + "%)";
        c.el.style.width = "1ch";
      } else {
        if (c.strip) { c.el.removeChild(c.strip); c.strip = null; }
        c.el.classList.remove("sv-num__col--digit");
        if (c.el.textContent !== ch) c.el.textContent = ch;
        c.el.style.width = charEm(ch) + "em";
      }
      c.ch = ch;
    }

    /* Leaving columns collapse (width → 0, fade) then get removed —
       no more snap when the number loses a digit. */
    function retire(c) {
      if (reduceMotion) {
        if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
        return;
      }
      c.el.style.width = "0px";
      c.el.style.opacity = "0";
      setTimeout(function () {
        if (c.el.parentNode) c.el.parentNode.removeChild(c.el);
      }, durationSec * 1000 + 50);
    }

    return function set(str) {
      host.setAttribute("aria-label", str);
      var chars = str.split("");
      while (cols.length < chars.length) {            // grow at the LEFT
        var col = makeCol();
        col.style.width = "0px";                      // expands to its width
        col.style.opacity = "0";
        host.insertBefore(col, host.firstChild);
        if (!reduceMotion) void col.offsetWidth;      // flush → width animates
        col.style.opacity = "1";
        cols.unshift({ el: col, strip: null, ch: null });
      }
      while (cols.length > chars.length) retire(cols.shift());  // shrink at LEFT
      for (var i = 0; i < chars.length; i++) setCol(cols[i], chars[i]);
    };
  }

  /**
   * Initializes every ROI calculator on the page.
   * @param {string} [selector="[data-savings-calc]"]
   */
  function initRoiCalc(selector) {
    var nodes = document.querySelectorAll(selector || "[data-savings-calc]");
    if (!nodes.length) { console.warn("[Sestek RoiCalc] No element found."); return; }
    Array.prototype.forEach.call(nodes, setup);
  }

  function setup(root) {
    if (root._svCalcInit) return;                       // idempotent
    root._svCalcInit = true;

    var a = function (name) { return root.getAttribute("data-sv-" + name); };
    var rate = num(a("rate"), DEFAULTS.rate);
    if (rate > 1) rate = rate / 100;                    // "70" → 0.7
    var o = {
      rate:     clamp01(rate),
      min:      Math.max(1, num(a("min"), DEFAULTS.min)),
      max:      Math.max(2, num(a("max"), DEFAULTS.max)),
      currency: a("currency") != null ? a("currency") : DEFAULTS.currency,
      duration: num(a("duration"), DEFAULTS.duration),
    };

    var el = {
      track     : root.querySelector("[data-sv-track]"),
      thumb     : root.querySelector("[data-sv-thumb]"),
      bubble    : root.querySelector("[data-sv-bubble]"),
      cost      : root.querySelector("[data-sv-cost]"),
      inquiries : root.querySelector("[data-sv-inquiries]"),
      total     : root.querySelector("[data-sv-total]"),
    };
    if (!el.inquiries) {
      // v2 markup: the second input was "Number of agents". Agents now live on
      // the slider, so that input becomes "Total inquiries" — rename it in Webflow.
      el.inquiries = root.querySelector("[data-sv-agents]");
      if (el.inquiries) console.warn("[Sestek RoiCalc] [data-sv-agents] input is used as Total inquiries — rename it to data-sv-inquiries.");
    }
    var missing = Object.keys(el).filter(function (k) { return !el[k]; });
    if (missing.length) {
      console.warn("[Sestek RoiCalc] Missing elements:", missing.join(", ")); return;
    }
    // Optional plain-text outputs (the original ROI page showed these too)
    var out = {
      monthly          : root.querySelector("[data-sv-monthly]"),
      fte              : root.querySelector("[data-sv-fte]"),
      totalCost        : root.querySelector("[data-sv-total-cost]"),
      costPerCall      : root.querySelector("[data-sv-cost-per-call]"),
      costPerCallAfter : root.querySelector("[data-sv-cost-per-call-after]"),
    };

    // ── State — no data-sv-start → start dead centre ───────────
    var t = a("start") != null
      ? clamp01(Math.log(num(a("start"), o.min) / o.min) / Math.log(o.max / o.min))
      : 0.5;
    if (!el.cost.value)      el.cost.value      = DEFAULTS.cost;       // or value="" in HTML
    if (!el.inquiries.value) el.inquiries.value = DEFAULTS.inquiries;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.style.setProperty("--sv-num-dur", (reduceMotion ? 0 : o.duration) + "s");
    var setNumber = createRoller(el.total, reduceMotion, o.duration);

    function currentAgents() { return tToValue(t, o.min, o.max); }

    function paintSlider() {
      var agents = currentAgents();
      el.bubble.textContent = abbreviate(agents);
      // One source of truth: bubble, thumb and label all ride --sv-left,
      // the fill stretches to --sv-fill (see CSS).
      root.style.setProperty("--sv-left", (t * 100) + "%");
      root.style.setProperty("--sv-fill", (t * 100) + "%");
      el.thumb.setAttribute("aria-valuenow", agents);
      el.thumb.setAttribute("aria-valuetext", abbreviate(agents) + " agents");
    }

    function setText(node, text) { if (node && node.textContent !== text) node.textContent = text; }
    function money2(n) { return o.currency + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    function update() {
      var agents    = currentAgents();
      var cost      = Math.max(0, num(el.cost.value, 0));
      var inquiries = Math.max(0, num(el.inquiries.value, 0));
      paintSlider();
      var r = computeRoi(agents, cost, inquiries, o.rate);
      setNumber(formatMoney(r.annual, o.currency));
      setText(out.monthly,          formatMoney(r.monthly, o.currency));
      setText(out.fte,              String(Math.round(r.fte)));
      setText(out.totalCost,        formatMoney(r.totalCost, o.currency));
      setText(out.costPerCall,      money2(r.costPerCall));
      setText(out.costPerCallAfter, money2(r.costPerCallAfter));
    }

    // ── Drag / click (pointer events on the whole track) ───────
    function tFromEvent(e) {
      var r = el.track.getBoundingClientRect();
      return clamp01((e.clientX - r.left) / r.width);
    }
    el.track.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      el.track.setPointerCapture(e.pointerId);
      el.thumb.focus({ preventScroll: true });
      t = tFromEvent(e); update();
    });
    el.track.addEventListener("pointermove", function (e) {
      if (!el.track.hasPointerCapture || !el.track.hasPointerCapture(e.pointerId)) return;
      t = tFromEvent(e); update();
    });

    // ── Keyboard (arrows / Home / End / PageUp / PageDown) ─────
    el.thumb.setAttribute("role", "slider");
    el.thumb.setAttribute("aria-valuemin", o.min);
    el.thumb.setAttribute("aria-valuemax", o.max);
    if (!el.thumb.hasAttribute("tabindex")) el.thumb.setAttribute("tabindex", "0");
    el.thumb.addEventListener("keydown", function (e) {
      var step = 0.02, big = 0.1, was = t;
      switch (e.key) {
        case "ArrowRight": case "ArrowUp":   t = clamp01(t + step); break;
        case "ArrowLeft":  case "ArrowDown": t = clamp01(t - step); break;
        case "PageUp":   t = clamp01(t + big); break;
        case "PageDown": t = clamp01(t - big); break;
        case "Home": t = 0; break;
        case "End":  t = 1; break;
        default: return;
      }
      e.preventDefault();
      if (t !== was) update();
    });

    // ── Number inputs ──────────────────────────────────────────
    el.cost.addEventListener("input", update);
    el.inquiries.addEventListener("input", update);

    update();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initRoiCalc = initRoiCalc;
  global.Sestek.initSavingsCalc = initRoiCalc;          // v2 alias — home page calls this

})(typeof window !== "undefined" ? window : this);
