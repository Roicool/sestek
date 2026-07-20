/*!
 * count-up.js v1.1.0
 * Viewport count-up — numbers roll from a start value to the value you set,
 * the moment the element scrolls into view. Fully data-attribute driven.
 *
 * Webflow note: custom attributes require BOTH a name and a value, so set
 * the target as the value (data-counter="1250") — the visible text can be
 * anything (e.g. "0"). Add the sign you want appended with
 * data-counter-suffix ("+", "%", " try", " ms"…) and any leading sign with
 * data-counter-prefix ("%", "$"…). Outside Webflow you can still leave
 * data-counter empty and let the script parse everything from the text.
 *
 * The final value can also LIVE IN THE HTML (SEO / no-JS safe): write the
 * finished number in the element and the script parses it — prefix, number,
 * decimals, thousands separators and suffix are all detected automatically:
 *   <div data-counter="1250" data-counter-suffix="+">0</div>  → 0 → 1,250+
 *   <div data-counter="98.6" data-counter-prefix="%">0</div>  → 0 → %98.6
 *   <div data-counter>1,250,000+</div>   → rolls 0 → 1,250,000+ (parsed from text)
 *   <div data-counter>%98.6</div>        → rolls  0 → %98.6     (parsed from text)
 *
 * Premium details baked in:
 *   • tabular-nums + reserved width — digits roll in place, zero layout shift
 *   • expo.out ease — rushes up fast, lands with a long satisfying settle
 *   • ScrollTrigger viewport enter, replays or plays once (your choice)
 *   • Intl.NumberFormat locale support (1.250.000 for tr-TR, 1,250,000 for en-US)
 *   • prefers-reduced-motion → value is set instantly, no motion
 *
 * Two ways to use it:
 *   1. Sestek.initCountUp()          — declarative, scans [data-counter] (no JS)
 *   2. Sestek.countUp(el, opts)      — programmatic, returns the GSAP tween
 *
 * Requires: gsap + ScrollTrigger registered. Core: js/core/utils.js
 *
 * DOM (Webflow):
 *   <span class="stat_number" data-counter data-counter-duration="2.4">12,500+</span>
 *
 * Attributes (all optional except data-counter):
 *   data-counter            target number. Empty → parsed from the element's text
 *                         (recommended: keep the real value in the HTML).
 *   data-counter-from       number the roll starts from                 (default 0)
 *   data-counter-duration   roll duration in seconds                    (default 2)
 *   data-counter-delay      delay before it starts, in seconds          (default 0)
 *   data-counter-ease       GSAP ease of the roll                (default "expo.out")
 *   data-counter-decimals   decimal places. Empty → inferred from the target text.
 *   data-counter-separator  thousands separator character, e.g. "," or "."
 *                         Empty → whatever the original text used (or none).
 *   data-counter-locale     BCP-47 locale for Intl formatting, e.g. "tr-TR".
 *                         Overrides data-counter-separator/decimal detection.
 *   data-counter-prefix     text before the number. Empty → parsed from text.
 *   data-counter-suffix     text after the number.  Empty → parsed from text.
 *   data-counter-start      ScrollTrigger start position          (default "top 85%")
 *   data-counter-once       default true: counts once and stays. "false" →
 *                         re-rolls on every viewport enter (resets on leave-back).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    from: 0,
    duration: 2,
    delay: 0,
    ease: "expo.out",
    start: "top 85%",
    once: true,
  };

  // Shared helpers from js/core/utils.js (core layer).
  var attrNum = Sestek.util.attrNum;

  /**
   * Parse a stat string like "+$1,250,000.50M " into its pieces so the roll
   * can reproduce the author's exact formatting at every frame.
   * @param {string} text
   * @returns {{prefix:string,value:number,decimals:number,separator:string,suffix:string}|null}
   */
  function parseStat(text) {
    // number = digits with optional . or , group/decimal marks: 1,250,000.50
    var m = (text || "").match(/(-?[\d.,]*\d)/);
    if (!m) return null;

    var raw = m[1];
    var prefix = text.slice(0, m.index);
    var suffix = text.slice(m.index + raw.length);

    // Decide which mark (if any) is the decimal point: the LAST . or , counts
    // as decimal only when it isn't a 3-digit thousands group ("1,250" → group,
    // "98,6" → decimal). Everything else is a thousands separator.
    var lastDot = raw.lastIndexOf(".");
    var lastComma = raw.lastIndexOf(",");
    var decPos = Math.max(lastDot, lastComma);
    var decMark = "";
    if (decPos > -1) {
      var tail = raw.length - decPos - 1;
      var mark = raw.charAt(decPos);
      var others = raw.split(mark).length - 1;
      // decimal when: tail isn't a clean 3-digit group, and the mark appears once
      if (tail !== 3 && others === 1) decMark = mark;
      else if (tail === 3 && others === 1 && lastDot > -1 && lastComma > -1) {
        // both marks present, e.g. "1.250,000" → the later one is decimal
        decMark = mark;
      }
    }

    var intPart = decMark ? raw.slice(0, raw.lastIndexOf(decMark)) : raw;
    var decPart = decMark ? raw.slice(raw.lastIndexOf(decMark) + 1) : "";
    var separator = "";
    var sepMatch = intPart.match(/[.,]/);
    if (sepMatch) separator = sepMatch[0];

    var value = parseFloat(intPart.replace(/[.,]/g, "") + (decPart ? "." + decPart : ""));
    if (isNaN(value)) return null;

    return {
      prefix: prefix,
      value: value,
      decimals: decPart.length,
      separator: separator,
      decimal: decMark,
      suffix: suffix,
    };
  }

  /**
   * Build the formatter used on every tick — one closure, zero per-frame work
   * beyond the string assembly itself.
   */
  function makeFormatter(cfg) {
    if (cfg.locale) {
      var nf = new Intl.NumberFormat(cfg.locale, {
        minimumFractionDigits: cfg.decimals,
        maximumFractionDigits: cfg.decimals,
      });
      return function (v) { return cfg.prefix + nf.format(v) + cfg.suffix; };
    }
    return function (v) {
      var s = v.toFixed(cfg.decimals);
      var parts = s.split(".");
      if (cfg.separator) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, cfg.separator);
      }
      // decimal mark: whatever the original text used; otherwise "," when the
      // thousands separator is "." (tr style), else "."
      var mark = cfg.decimal || (cfg.separator === "." ? "," : ".");
      var dec = parts[1] ? mark + parts[1] : "";
      return cfg.prefix + parts[0] + dec + cfg.suffix;
    };
  }

  /**
   * Count a single element up when it enters the viewport.
   *
   * @param {HTMLElement} el
   * @param {object} [opts]  same keys as the data-attributes (camelCase)
   * @returns {gsap.core.Tween|null}
   */
  function countUp(el, opts) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek countUp] GSAP + ScrollTrigger required.");
      return null;
    }
    if (!el || el._countUpInit) return null;
    el._countUpInit = true;

    var o = opts || {};
    var parsed = parseStat(el.textContent) || { prefix: "", value: 0, decimals: 0, separator: "", suffix: "" };

    var target = o.value != null ? o.value : attrNum(el, "data-counter", parsed.value);
    var from = o.from != null ? o.from : attrNum(el, "data-counter-from", DEFAULTS.from);
    var duration = o.duration != null ? o.duration : attrNum(el, "data-counter-duration", DEFAULTS.duration);
    var delay = o.delay != null ? o.delay : attrNum(el, "data-counter-delay", DEFAULTS.delay);
    var decimals = o.decimals != null ? o.decimals : attrNum(el, "data-counter-decimals", parsed.decimals);
    var ease = o.ease || el.getAttribute("data-counter-ease") || DEFAULTS.ease;
    var start = o.start || el.getAttribute("data-counter-start") || DEFAULTS.start;
    var locale = o.locale || el.getAttribute("data-counter-locale") || "";
    var once = o.once != null ? o.once
      : el.getAttribute("data-counter-once") !== null ? Sestek.util.flag(el.getAttribute("data-counter-once"))
      : DEFAULTS.once;

    var sepAttr = o.separator != null ? o.separator : el.getAttribute("data-counter-separator");
    var format = makeFormatter({
      prefix: o.prefix != null ? o.prefix : (el.getAttribute("data-counter-prefix") || parsed.prefix),
      suffix: o.suffix != null ? o.suffix : (el.getAttribute("data-counter-suffix") || parsed.suffix),
      separator: sepAttr != null ? sepAttr : parsed.separator,
      decimal: parsed.decimal,
      decimals: decimals,
      locale: locale,
    });

    if (Sestek.util.prefersReducedMotion()) {
      el.textContent = format(target);
      return null;
    }

    // Zero layout shift: digits roll in equal-width slots, and the element
    // reserves the width of its FINAL text up front — siblings never move.
    // Range measures the text itself (offsetWidth would return the container
    // width on block elements and lie on inline ones mid-line).
    el.style.fontVariantNumeric = "tabular-nums";
    el.textContent = format(target);
    var range = document.createRange();
    range.selectNodeContents(el);
    var w = range.getBoundingClientRect().width;
    if (w > 0) el.style.minWidth = Math.ceil(w) + "px";
    el.textContent = format(from);

    var state = { value: from };

    return gsap.to(state, {
      value: target,
      duration: duration,
      delay: delay,
      ease: ease,
      onUpdate: function () { el.textContent = format(state.value); },
      onComplete: function () { el.textContent = format(target); },
      scrollTrigger: {
        trigger: el,
        start: start,
        once: once,
        // Same tier as reveal.js: refresh AFTER pinned triggers so "top 85%"
        // measures against the real (post-pin-spacing) document height.
        refreshPriority: -1,
        // Replay mode: restart the roll on every enter, snap back on leave-back.
        toggleActions: once ? "play none none none" : "restart none none reset",
        onLeaveBack: once ? undefined : function () { el.textContent = format(from); },
      },
    });
  }

  /**
   * Initialise every [data-counter] element on the page.
   * @param {string} [selector="[data-counter]"]
   * @returns {Array<gsap.core.Tween>}
   */
  function initCountUp(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek initCountUp] GSAP + ScrollTrigger required.");
      return [];
    }
    var els = document.querySelectorAll(selector || "[data-counter]");
    var tweens = [];
    Array.prototype.forEach.call(els, function (el) {
      var t = countUp(el);
      if (t) tweens.push(t);
    });

    // Same late-layout guard as reveal.js: re-measure trigger positions once
    // fonts/images/CMS content have settled the final document height.
    if (typeof ScrollTrigger !== "undefined") {
      if (document.readyState === "complete") {
        ScrollTrigger.refresh();
      } else {
        window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
      }
    }

    return tweens;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.countUp = countUp;
  global.Sestek.initCountUp = initCountUp;

})(typeof window !== "undefined" ? window : this);
