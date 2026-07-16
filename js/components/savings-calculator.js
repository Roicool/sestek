/*!
 * savings-calculator.js v2.1.0
 * Ramp-style live savings calculator — custom div-based slider (Radix-like
 * structure, no native <input type=range>, so Webflow CSS can't break it)
 * and a NumberFlow-style rolling counter: every digit is a vertical strip
 * that rolls to its new value (CSS transitions — works with or without gsap).
 * Fully data-attribute driven — configure everything from Webflow.
 *
 * Formula (annual saving):
 *   costPerInquiry = costPerAgent / capacity        (capacity: inquiries one
 *   handled        = totalInquiries × rate           agent handles per month)
 *   monthly        = handled × costPerInquiry, capped at agents × costPerAgent
 *   annual         = monthly × 12
 *
 * DOM (Webflow):
 *   <section data-savings-calc>
 *     <div class="sv-calc__slider">
 *       <div class="sv-calc__bubble" data-sv-bubble>50K</div>
 *       <div class="sv-calc__track" data-sv-track>
 *         <div class="sv-calc__fill" data-sv-fill></div>
 *         <div class="sv-calc__thumb" data-sv-thumb tabindex="0"
 *              aria-label="Total inquiries per month"></div>
 *       </div>
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
 *   data-sv-start      slider starting value — omit to start at the middle
 *   data-sv-currency   currency prefix on the big number            (default "$")
 *   data-sv-duration   digit roll duration in seconds             (default 0.9)
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
    currency: "$",
    duration: 0.9,
    cost: 1500,
    agents: 250,
  };

  function num(v, fallback) {
    var n = parseFloat(v);
    return isFinite(n) ? n : fallback;
  }
  function clamp01(t) { return Math.max(0, Math.min(1, t)); }

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
      currency: a("currency") != null ? a("currency") : DEFAULTS.currency,
      duration: num(a("duration"), DEFAULTS.duration),
    };

    var el = {
      track  : root.querySelector("[data-sv-track]"),
      thumb  : root.querySelector("[data-sv-thumb]"),
      bubble : root.querySelector("[data-sv-bubble]"),
      cost   : root.querySelector("[data-sv-cost]"),
      agents : root.querySelector("[data-sv-agents]"),
      total  : root.querySelector("[data-sv-total]"),
    };
    var missing = Object.keys(el).filter(function (k) { return !el[k]; });
    if (missing.length) {
      console.warn("[Sestek SavingsCalc] Missing elements:", missing.join(", ")); return;
    }

    // ── State — no data-sv-start → start dead centre ───────────
    var t = a("start") != null
      ? clamp01(Math.log(num(a("start"), o.min) / o.min) / Math.log(o.max / o.min))
      : 0.5;
    if (!el.cost.value)   el.cost.value   = DEFAULTS.cost;   // or value="" in HTML
    if (!el.agents.value) el.agents.value = DEFAULTS.agents;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.style.setProperty("--sv-num-dur", (reduceMotion ? 0 : o.duration) + "s");
    var setNumber = createRoller(el.total, reduceMotion, o.duration);

    function currentInquiries() { return tToValue(t, o.min, o.max); }

    function paintSlider() {
      var inquiries = currentInquiries();
      el.bubble.textContent = abbreviate(inquiries);
      // One source of truth: bubble, thumb and label all ride --sv-left,
      // the fill stretches to --sv-fill (see CSS).
      root.style.setProperty("--sv-left", (t * 100) + "%");
      root.style.setProperty("--sv-fill", (t * 100) + "%");
      el.thumb.setAttribute("aria-valuenow", inquiries);
      el.thumb.setAttribute("aria-valuetext", abbreviate(inquiries) + " inquiries per month");
    }

    function update() {
      var inquiries = currentInquiries();
      var cost   = Math.max(0, num(el.cost.value, 0));
      var agents = Math.max(0, num(el.agents.value, 0));
      paintSlider();
      setNumber(formatMoney(computeAnnualSaving(inquiries, cost, agents, o), o.currency));
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
    el.agents.addEventListener("input", update);

    update();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSavingsCalc = initSavingsCalc;

})(typeof window !== "undefined" ? window : this);
