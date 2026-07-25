/*!
 * hover-reveal.js v1.0.0
 * Pointer-origin colour reveal for cards: on desktop hover (or keyboard
 * focus) a colour layer expands from the cursor's entry point with a GSAP
 * clip-path circle — text colours shift on the same timeline. On touch
 * devices a tap toggles the reveal (tapping another card or outside closes
 * it); Swiper's preventClicks keeps swipe gestures from triggering it.
 *
 * Colours come from data-attributes and accept hex/rgb, bare RC tokens
 * ("--brand-primary--600") or var() wrappers — tokens resolve from computed
 * style (Sestek.util.resolveColor), so scope overrides work.
 *
 * prefers-reduced-motion: no animation — colours swap instantly.
 *
 * Requires : gsap. Load js/core/utils.js first (token resolve).
 *
 * All behaviour is data-attribute driven — DOM contract below.
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Initializes every hover-reveal card on the page.
   *
   * Root element  [data-hover-reveal] supports:
   *   data-hover-reveal-bg        reveal layer colour (token | hex | var())
   *   data-hover-reveal-color     target colour for ALL marked text children
   *   data-hover-reveal-border    optional border-color tween target
   *   data-hover-reveal-duration  reveal duration in seconds   (default 0.7)
   *   data-hover-reveal-ease      GSAP ease for the expand     (default "power3.out")
   *
   * Children:
   *   [data-hover-reveal-text]    text that changes colour. Value = its own
   *                               target colour; empty → root's ...-color.
   *
   * The layer element is injected by JS as the first child; card content is
   * lifted above it by hover-reveal.css. Root gets `is-revealed` while open.
   *
   * @param {string} [selector="[data-hover-reveal]"]
   * @returns {Array} controllers: { el, active, show(), hide(), _destroy() }
   */
  function initHoverReveal(selector) {
    var roots = document.querySelectorAll(selector || "[data-hover-reveal]");
    if (!roots.length) { console.warn("[Sestek HoverReveal] No [data-hover-reveal] found."); return []; }
    if (typeof gsap === "undefined") {
      console.error("[Sestek HoverReveal] GSAP required."); return [];
    }

    var util    = (global.Sestek && global.Sestek.util) || null;
    var resolve = util ? util.resolveColor
      : function (v) { return v; };
    var reduced = util ? util.prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Hover-capable pointer? Touch-only devices manage the reveal with taps.
    var hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    var instances = [];
    roots.forEach(function (root) {
      var c = setup(root, resolve, reduced, hoverable);
      if (c) instances.push(c);
    });

    // Touch: tapping outside any open card closes it (polite single-active).
    if (!hoverable && instances.length) {
      document.addEventListener("click", function (e) {
        instances.forEach(function (c) {
          if (c.active && !c.el.contains(e.target)) c.hide();
        });
      });
    }

    return instances;
  }

  function setup(root, resolve, reduced, hoverable) {
    if (root._hrvInit) return null;                       // idempotent
    root._hrvInit = true;

    var num = function (attr, fallback) {
      var raw = root.getAttribute(attr);
      if (raw == null || raw === "") return fallback;
      var v = parseFloat(raw);
      return isNaN(v) ? fallback : v;
    };

    var bgAttr     = root.getAttribute("data-hover-reveal-bg");
    var colorAttr  = root.getAttribute("data-hover-reveal-color");
    var borderAttr = root.getAttribute("data-hover-reveal-border");
    var duration   = num("data-hover-reveal-duration", 0.7);
    var ease       = root.getAttribute("data-hover-reveal-ease") || "power3.out";

    // Reveal layer — injected as first child; CSS positions + clips it.
    var layer = null;
    if (bgAttr) {
      layer = document.createElement("span");
      layer.setAttribute("data-hover-reveal-layer", "");
      layer.setAttribute("aria-hidden", "true");
      layer.style.backgroundColor = resolve(bgAttr, root);
      root.insertBefore(layer, root.firstChild);
    }

    // Text targets: own attribute value wins, else the root-level colour.
    // Originals are captured once at init so interrupted tweens return true.
    var texts = Array.prototype.slice.call(
      root.querySelectorAll("[data-hover-reveal-text]")
    ).map(function (el) {
      var to = el.getAttribute("data-hover-reveal-text") || colorAttr || "";
      return { el: el, to: resolve(to, el), from: getComputedStyle(el).color };
    }).filter(function (t) { return t.to; });

    var borderTo   = borderAttr ? resolve(borderAttr, root) : null;
    var borderFrom = borderTo ? getComputedStyle(root).borderColor : null;

    /** Pointer position relative to the card + covering radius. */
    function originOf(e) {
      var r = root.getBoundingClientRect();
      var x = e && typeof e.clientX === "number" ? e.clientX - r.left : r.width / 2;
      var y = e && typeof e.clientY === "number" ? e.clientY - r.top : r.height / 2;
      x = Math.max(0, Math.min(r.width, x));
      y = Math.max(0, Math.min(r.height, y));
      var R = Math.ceil(Math.max(
        Math.hypot(x, y),
        Math.hypot(r.width - x, y),
        Math.hypot(x, r.height - y),
        Math.hypot(r.width - x, r.height - y)
      ));
      return { x: x, y: y, R: R };
    }

    var active = false;

    function show(e) {
      if (active) return;
      active = true;
      root.classList.add("is-revealed");
      var o = originOf(e);

      if (reduced) {
        if (layer) gsap.set(layer, { clipPath: "none" });
        texts.forEach(function (t) { gsap.set(t.el, { color: t.to }); });
        if (borderTo) gsap.set(root, { borderColor: borderTo });
        return;
      }
      if (layer) {
        gsap.killTweensOf(layer);
        gsap.set(layer, { clipPath: "circle(0px at " + o.x + "px " + o.y + "px)" });
        gsap.to(layer, {
          clipPath: "circle(" + o.R + "px at " + o.x + "px " + o.y + "px)",
          duration: duration, ease: ease,
        });
      }
      texts.forEach(function (t, i) {
        gsap.killTweensOf(t.el);
        // Hafif gecikme + stagger: renk, dalga karta yayılırken değişir.
        gsap.to(t.el, { color: t.to, duration: duration * 0.85, ease: ease, delay: 0.05 + i * 0.04 });
      });
      if (borderTo) {
        gsap.killTweensOf(root);
        gsap.to(root, { borderColor: borderTo, duration: duration * 0.85, ease: ease });
      }
    }

    function hide(e) {
      if (!active) return;
      active = false;
      root.classList.remove("is-revealed");
      var o = originOf(e);

      if (reduced) {
        if (layer) gsap.set(layer, { clipPath: "circle(0px at 50% 50%)" });
        texts.forEach(function (t) { gsap.set(t.el, { color: t.from }); });
        if (borderFrom) gsap.set(root, { borderColor: borderFrom });
        return;
      }
      if (layer) {
        gsap.killTweensOf(layer);
        // Çıkış noktasına doğru büzülür — origin'ler string tween'iyle kayar.
        gsap.to(layer, {
          clipPath: "circle(0px at " + o.x + "px " + o.y + "px)",
          duration: duration * 0.8, ease: "power2.inOut",
        });
      }
      texts.forEach(function (t, i) {
        gsap.killTweensOf(t.el);
        gsap.to(t.el, { color: t.from, duration: duration * 0.7, ease: "power2.inOut", delay: i * 0.03 });
      });
      if (borderFrom) {
        gsap.killTweensOf(root);
        gsap.to(root, { borderColor: borderFrom, duration: duration * 0.7, ease: "power2.inOut" });
      }
    }

    // ── Bindings ─────────────────────────────────────────────────
    // Touch pointer'ları enter/leave'den hariç: dokunmatikte pointer tap
    // sonrası "kalkar" ve leave anında ateşlenir (aç-kapa flash yapar) —
    // dokunmatik click-toggle ile yönetilir (aşağıda).
    function onEnter(e) { if (e.pointerType === "touch") return; show(e); }
    function onLeave(e) { if (e.pointerType === "touch") return; hide(e); }
    function onClick(e) {
      // Mouse click'i hover yönetir; touch tap (veya hover'sız cihazda her
      // tık) toggle eder. Swiper preventClicks: swipe sırasında click gelmez.
      if (hoverable && e.pointerType !== "touch") return;
      if (active) hide(e); else show(e);
    }
    function onFocusIn()  { show(null); }
    function onFocusOut(e) { if (!root.contains(e.relatedTarget)) hide(null); }

    // Enter/leave yalnız hover-yetenekli cihazlarda: hover'sız cihazda
    // mouse-benzeri bir pointer enter+click üretip aç-kapa çakışması yapardı.
    if (hoverable) {
      root.addEventListener("pointerenter", onEnter);
      root.addEventListener("pointerleave", onLeave);
    }
    root.addEventListener("click", onClick);
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);

    function destroy() {
      root.removeEventListener("pointerenter", onEnter);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("click", onClick);
      root.removeEventListener("focusin", onFocusIn);
      root.removeEventListener("focusout", onFocusOut);
      if (layer) { gsap.killTweensOf(layer); layer.remove(); }
      texts.forEach(function (t) { gsap.killTweensOf(t.el); gsap.set(t.el, { clearProps: "color" }); });
      gsap.killTweensOf(root);
      root.classList.remove("is-revealed");
      root._hrvInit = false;
    }

    return {
      el: root,
      get active() { return active; },
      show: show,
      hide: hide,
      _destroy: destroy,
    };
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHoverReveal = initHoverReveal;

})(typeof window !== "undefined" ? window : this);
