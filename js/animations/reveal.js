/*!
 * reveal.js v1.4.0
 * Size-reveal entrance — the "Webflow grow-in" look, fully data-attribute driven.
 *
 * Changelog
 * v1.4.0 — GÖLGE EASING'İ: clip animasyonu boyunca box-shadow kutuya
 *          kırpılıyor, bitişte clip-path:none yazılınca gölge PAT diye
 *          beliriyordu. Artık reveal tamamlanınca clip yok edilmez;
 *          NEGATİF inset'e doğru ikinci bir kısa tween ile dışa büyütülür —
 *          gölge kenardan yumuşakça sızar, sonra clip tamamen kalkar.
 *          Taşma payı CSS box-shadow'dan OTOMATİK ölçülür (blur+spread+
 *          offset); filter/drop-shadow gibi ölçülemeyen efektler için
 *          data-reveal-shadow="120" ile elle verilebilir, "0" kapatır.
 * v1.3.0 — TEK YÖN default (tasarım isteği): çift yönlü hal çok oynak
 *          bulundu. Artık her reveal BİR KEZ oynar ve açık kalır; geri
 *          scroll'da kapanıp yeniden oynamaz (trigger once ile ölür —
 *          maliyeti de sıfırlanır). Eski davranış isteyen eleman için:
 *          data-reveal-once="false" → çift yönlü play/reverse geri gelir.
 * v1.2.1 — reveal bitince clip kaldırılır: inset(0%) inline kalıyor ve kutu
 *          dışına çizilen her şeyi (box-shadow, glow) sonsuza dek kesiyordu.
 *          onComplete artık clip-path:none yazar (clearProps DEĞİL — reveal.css
 *          anti-flash kuralı geri uygulanıp elemanı gizlerdi) ve kimlik
 *          transform'unu temizler (pinli torunlara containing block
 *          bırakmasın). Load refresh'i Sestek.refreshScroll guard'ından akar.
 * v1.2.0 — bidirectional by default: plays every time the element enters the
 *          viewport (from either direction) and reverses every time it leaves.
 *          Set data-reveal-once="true" for the old play-once behaviour.
 *
 * The element does NOT slide in from offscreen (old WordPress style). Instead it
 * appears to GROW from zero to its own CSS-defined size as it scrolls into view:
 *   data-reveal="left"  / "right"  → looks like its WIDTH  expands 0 → CSS width
 *   data-reveal="top"   / "bottom" → looks like its HEIGHT expands 0 → CSS height
 *
 * It does this WITHOUT touching layout: the element keeps its real box (no reflow,
 * no content squish, siblings never jump) and is unveiled with an animated
 * `clip-path: inset(...)` anchored to the chosen edge — so the visible box appears
 * to scale up to the exact value you set in CSS. GPU-composited, 60fps, zero thrash.
 *
 * Two ways to use it:
 *   1. Sestek.initReveal()                 — declarative, scans [data-reveal] and
 *                                            wires a ScrollTrigger for each (no JS)
 *   2. Sestek.reveal(el, opts)             — programmatic, returns the GSAP tween
 *
 * Requires: gsap + ScrollTrigger registered.
 * CSS : css/animations/reveal.css   (owns the pre-reveal hidden state / anti-flash)
 *
 * DOM (Webflow):
 *   <div class="card" data-reveal="left" data-reveal-delay="0.1">…</div>
 *
 * Attributes (all optional except data-reveal):
 *   data-reveal           "left" | "right" | "top" | "bottom"   anchor edge / grow
 *                         direction. left/right grow width, top/bottom grow height.
 *                         (default "left")
 *   data-reveal-duration  reveal duration in seconds — the speed      (default 1.1)
 *   data-reveal-delay     delay before it starts, in seconds          (default 0)
 *   data-reveal-ease      GSAP ease for the grow                (default "expo.out")
 *   data-reveal-scale     optional inner zoom-settle, e.g. 1.08 → 1   (default 1,
 *                         off). Adds the premium Webflow image-reveal depth.
 *   data-reveal-start     ScrollTrigger start position          (default "top 85%")
 *   data-reveal-once      default TRUE (v1.3.0): plays once, stays revealed.
 *                         "false" → bidirectional: plays on every viewport
 *                         enter (down OR back up), reverses on every leave.
 *   data-reveal-shadow    gölge sızma payı px (v1.4.0). Default "auto":
 *                         computed box-shadow'dan ölçülür. Sayı → elle pay
 *                         (drop-shadow/glow gibi ölçülemeyenler için).
 *                         "0" → gölge fazı yok, eski anlık davranış.
 *   data-reveal-shadow-duration   gölge fazının süresi sn (default 0.5)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  // Collapsed clip per anchor edge — inset(top right bottom left). Each collapses
  // from the OPPOSITE side so the box stays pinned to the named edge and appears
  // to grow toward the other (matches reveal.css and reads as a size grow).
  var HIDDEN = {
    left:   "inset(0% 100% 0% 0%)",   // pinned left   → width grows right
    right:  "inset(0% 0% 0% 100%)",   // pinned right  → width grows left
    top:    "inset(0% 0% 100% 0%)",   // pinned top    → height grows down
    bottom: "inset(100% 0% 0% 0%)",   // pinned bottom → height grows up
  };
  var SHOWN = "inset(0% 0% 0% 0%)";   // fully revealed — element at its CSS size

  // transform-origin so an optional data-reveal-scale settles toward the anchor.
  var ORIGIN = {
    left: "left center", right: "right center",
    top: "center top",   bottom: "center bottom",
  };

  var DEFAULTS = {
    duration: 1.1,
    delay: 0,
    ease: "expo.out",
    start: "top 85%",
    once: true,
    scale: 1,
  };

  // Numeric data-attribute reader — utils.js varsa oradan, yoksa yerel fallback.
  // (Eski hali tepe seviyede Sestek.util.attrNum okuyordu: utils.js yüklenmez
  // ya da SONRA yüklenirse IIFE burada ölüyor, initReveal hiç doğmuyordu —
  // tek-script-eksik hata sınıfı. Stack-panels'teki desenle aynı.)
  /**
   * Computed box-shadow'dan dışa taşma payını ölç (px). Çoklu gölgeleri
   * üst seviye virgüllerden ayırır (renklerin içindeki virgüllere takılmaz);
   * inset gölgeler dışa taşmadığı için atlanır.
   * extent = max(|offset-x|, |offset-y|) + blur + spread, + 8px tampon.
   */
  function shadowExtent(el) {
    var bs = getComputedStyle(el).boxShadow;
    if (!bs || bs === "none") return 0;
    var parts = [], depth = 0, start = 0, i;
    for (i = 0; i < bs.length; i++) {
      var ch = bs.charAt(i);
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && !depth) { parts.push(bs.slice(start, i)); start = i + 1; }
    }
    parts.push(bs.slice(start));
    var max = 0;
    parts.forEach(function (p) {
      if (p.indexOf("inset") !== -1) return;
      var n = (p.match(/-?\d*\.?\d+px/g) || []).map(parseFloat);
      if (!n.length) return;
      var ox = Math.abs(n[0] || 0), oy = Math.abs(n[1] || 0);
      var blur = n[2] || 0, spread = n[3] || 0;
      max = Math.max(max, Math.max(ox, oy) + blur + spread);
    });
    return max ? Math.ceil(max) + 8 : 0;
  }

  var attrNum = (global.Sestek && Sestek.util && Sestek.util.attrNum) ||
    function (el, attr, fallback) {
      var raw = el.getAttribute(attr);
      if (raw == null || raw === "") return fallback;
      var v = parseFloat(raw);
      return isNaN(v) ? fallback : v;
    };

  /**
   * Reveal a single element. Sets its collapsed clip immediately, then grows it
   * to full size when it enters the viewport.
   *
   * @param {HTMLElement} el
   * @param {object} [opts]  same keys as the data-attributes (camelCase optional)
   * @returns {gsap.core.Tween|null}
   */
  function reveal(el, opts) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek reveal] GSAP + ScrollTrigger required.");
      return null;
    }
    if (!el || el._revealInit) return null;
    el._revealInit = true;

    var o = opts || {};
    var dir = (o.direction || el.getAttribute("data-reveal") || "left").toLowerCase();
    if (!HIDDEN[dir]) dir = "left";

    var duration = o.duration != null ? o.duration : attrNum(el, "data-reveal-duration", DEFAULTS.duration);
    var delay    = o.delay    != null ? o.delay    : attrNum(el, "data-reveal-delay", DEFAULTS.delay);
    var scale    = o.scale    != null ? o.scale    : attrNum(el, "data-reveal-scale", DEFAULTS.scale);
    var ease     = o.ease     || el.getAttribute("data-reveal-ease")  || DEFAULTS.ease;
    var start    = o.start    || el.getAttribute("data-reveal-start") || DEFAULTS.start;
    var onceAttr = el.getAttribute("data-reveal-once");
    var once     = o.once != null ? o.once
                 : onceAttr == null ? DEFAULTS.once
                 : onceAttr !== "false";
    var shadowAttr = o.shadow != null ? String(o.shadow)
                   : el.getAttribute("data-reveal-shadow");
    var shadowDur  = o.shadowDuration != null ? o.shadowDuration
                   : attrNum(el, "data-reveal-shadow-duration", 0.5);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(el, { clearProps: "clip-path,transform" });
      return null;
    }

    // Collapsed start state (also covers above-the-fold elements if the CSS
    // anti-flash guard wasn't armed in <head>).
    gsap.set(el, {
      clipPath: HIDDEN[dir],
      scale: scale !== 1 ? scale : 1,
      transformOrigin: ORIGIN[dir],
      force3D: true,
    });
    el.style.willChange = "clip-path, transform";

    // Reveal tamamen bitince clip'i kaldır + kimlik transform'unu temizle.
    // inline "none" (clearProps DEĞİL — reveal.css collapsed kuralı geri
    // uygulanıp elemanı gizlerdi); transform temizliği pinli torunlara
    // containing block bırakmasın diye.
    function finishClip() {
      el._revealShadowTween = null;
      el.style.clipPath = "none";
      el.style.webkitClipPath = "none";
      gsap.set(el, { clearProps: "transform,translate,rotate,scale" });
    }

    // Reverse başlarken (bidirectional mod) gölge fazı iptal — ana tween
    // clip'i geri devralır, gölge anında kırpılır (kaybolma yönünde doğal).
    function killShadowPhase() {
      if (el._revealShadowTween) {
        el._revealShadowTween.kill();
        el._revealShadowTween = null;
      }
    }

    return gsap.to(el, {
      clipPath: SHOWN,
      scale: 1,
      duration: duration,
      delay: delay,
      ease: ease,
      scrollTrigger: {
        trigger: el,
        start: start,
        once: once,
        // Negative priority → these refresh AFTER pinned triggers (priority ≥ 0),
        // so by the time a reveal measures its start/end the pin-spacing above it
        // already exists and "top 85%" resolves against the real document height.
        refreshPriority: -1,
        // Bidirectional: play on every enter (either direction), reverse on
        // every leave — scroll down past it and back up, it re-reveals.
        toggleActions: once ? "play none none none" : "play reverse play reverse",
        onLeave: killShadowPhase,
        onLeaveBack: killShadowPhase,
      },
      onComplete: function () {
        el.style.willChange = "auto";
        // GÖLGE FAZI (v1.4.0): clip animasyon boyunca box-shadow'u kesiyor;
        // "none"a anında geçmek gölgeyi PAT diye gösterirdi. Clip'i negatif
        // inset'e doğru kısa bir tween'le DIŞA büyüt → gölge kenardan
        // yumuşakça sızar, sonra clip tamamen kalkar. Pay: attribute > auto
        // ölçüm (computed box-shadow) > gölge yoksa faz atlanır.
        var bleed;
        if (shadowAttr === "0" || shadowAttr === "false" || shadowAttr === "none") {
          bleed = 0;
        } else if (shadowAttr != null && shadowAttr !== "" && shadowAttr !== "auto") {
          bleed = parseFloat(shadowAttr) || 0;
        } else {
          bleed = shadowExtent(el);
        }
        if (bleed > 0) {
          var out = "inset(" + -bleed + "px " + -bleed + "px " + -bleed + "px " + -bleed + "px)";
          el._revealShadowTween = gsap.fromTo(el,
            { clipPath: "inset(0px 0px 0px 0px)" },
            { clipPath: out, duration: shadowDur, ease: "power2.out", onComplete: finishClip }
          );
        } else {
          finishClip();
        }
      },
      onReverseComplete: function () { el.style.willChange = "clip-path, transform"; },
    });
  }

  /**
   * Initialise every [data-reveal] element on the page.
   * @param {string} [selector="[data-reveal]"]
   * @returns {Array<gsap.core.Tween>}
   */
  function initReveal(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek initReveal] GSAP + ScrollTrigger required.");
      return [];
    }
    // Arm the CSS anti-flash guard (no-op if already added in <head>).
    document.documentElement.classList.add("reveal-armed");

    var els = document.querySelectorAll(selector || "[data-reveal]");
    var tweens = [];
    Array.prototype.forEach.call(els, function (el) {
      var t = reveal(el);
      if (t) tweens.push(t);
    });

    // Triggers created on DOMContentLoaded are measured before images/fonts
    // settle the layout — and before pins below them finish adding pin-spacing.
    // Re-measure once everything has loaded so every start/end lands correctly.
    if (typeof ScrollTrigger !== "undefined") {
      // Ham ScrollTrigger.refresh() DEĞİL: lenis-init'in jank-guard'ı varsa
      // oradan akar (debounce + scroll-idle bekler), yoksa ham refresh'e düşer.
      var doRefresh = function () {
        if (global.Sestek && Sestek.refreshScroll) Sestek.refreshScroll();
        else ScrollTrigger.refresh();
      };
      if (document.readyState === "complete") {
        doRefresh();
      } else {
        window.addEventListener("load", doRefresh, { once: true });
      }
    }

    return tweens;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.reveal = reveal;
  global.Sestek.initReveal = initReveal;

})(typeof window !== "undefined" ? window : this);
