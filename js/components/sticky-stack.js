/*!
 * sticky-stack.js v1.0.0
 * Premium "stacking panels", rebuilt — the Linear/Stripe pattern where the
 * covered panel VISIBLY recedes: as the next panel slides up over it, the
 * one beneath scales down, gently lifts and darkens in EXACT proportion to
 * how much it has been covered — and it NEVER fades to transparent. It stays
 * fully visible until the incoming panel physically covers it.
 *
 * (stack-panels.js'in yeniden ele alınmış hali, AYRI dosya — eskisi pin +
 * opacity-dissolve kullanır: küçülen panel yarı yolda şeffaflaşıp "birden
 * kaybolur". Bu versiyonda kaybolma yok; örtülme fizikseldir. Eski sayfalar
 * stack-panels.js ile çalışmaya devam eder, yenilerde bunu kullan.)
 *
 * Mechanics — deliberately boring and bulletproof:
 *   • pinning is native `position: sticky` (JS basar) — GSAP pin yok,
 *     pin-spacing yok, hero/scroll-tabs ile refreshPriority çatışması yok,
 *     ancestor-transform pin kırılması yok
 *   • her panel için TEK scrub'lı ScrollTrigger; sürücü, SONRAKİ panelin
 *     tepesinin viewport altından sticky çizgisine yolculuğudur:
 *     progress 0 → panel dinlenmede, progress 1 → tam gerilemiş. Orantılı,
 *     yön bağımsız, geri sarması kendiliğinden.
 *   • karartma filter değil, JS'in enjekte ettiği overlay div'idir (ucuz
 *     opacity tween'i) — panel içeriği kararırken keskin kalır
 *
 * Requires : gsap + ScrollTrigger registered, Sestek.util (js/core/utils.js)
 * CSS      : css/components/sticky-stack.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────
 *
 *   <div data-sticky-stack>
 *     <section data-sticky-panel> … </section>
 *     <section data-sticky-panel> … </section>
 *     <section data-sticky-panel> … </section>
 *   </div>
 *
 * Panellerin boyutu/arka planı/radius'u Designer'dan: genelde min-height
 * 85-100svh, kendi OPAK background'u ve radius'u olan section'lar. Root'a ve
 * panellere position VERME — sticky düzenini JS + CSS kurar. Panellerin
 * background'u şeffafsa alttaki görüneceği için desen bozulur; opak ver.
 *
 * ── Attributes (root [data-sticky-stack] üzerinde, hepsi opsiyonel) ──
 *
 *   data-sticky-top     sticky üst boşluk, CSS uzunluğu ("0px","8vh"…)
 *                                                           (default "0px")
 *   data-sticky-peek    px — her panel bir öncekinden bu kadar aşağıda
 *                       yapışır; örtülen panellerin üst kenarları görünür
 *                       bir "deste" oluşturur (default 0 = kapalı; 14 dene)
 *   data-sticky-scale   tam örtülen panelin scale'i          (default 0.93)
 *   data-sticky-dim     tam örtülen panelin karartma opaklığı (default 0.35)
 *   data-sticky-blur    tam örtülen panelin blur'u, px       (default 0 = off)
 *   data-sticky-lift    örtülen panelin yukarı toplanması, px (default 24)
 *
 * prefers-reduced-motion: küçülme/karartma çalışmaz; paneller sticky ile
 * sadece üst üste biner — tamamen işlevsel, hareketsiz.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function initStickyStack(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StickyStack] GSAP + ScrollTrigger required.");
      return;
    }
    if (typeof Sestek === "undefined" || typeof Sestek.util === "undefined") {
      console.error("[Sestek StickyStack] Sestek.util required (load js/core/utils.js).");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var roots = global.document.querySelectorAll(selector || "[data-sticky-stack]");
    Array.prototype.forEach.call(roots, bindRoot);
  }

  function bindRoot(root) {
    if (root._stickyStackInit) return;
    root._stickyStackInit = true;

    var num = Sestek.util.attrNum;
    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-sticky-panel]"));
    if (panels.length < 2) {
      console.warn("[Sestek StickyStack] Need >=2 [data-sticky-panel].");
      return;
    }

    var topRaw   = root.getAttribute("data-sticky-top") || "0px";
    var peek     = num(root, "data-sticky-peek", 0);
    var endScale = num(root, "data-sticky-scale", 0.93);
    var dimMax   = num(root, "data-sticky-dim", 0.35);
    var blurMax  = num(root, "data-sticky-blur", 0);
    var lift     = num(root, "data-sticky-lift", 24);

    var reduce = Sestek.util.prefersReducedMotion();

    /* px cinsinden sticky-top ölçümü — ScrollTrigger end'i ve peek hesabı
     * için CSS uzunluğunu ("8vh" vb.) piksele çevir. */
    function toPx(cssLen) {
      var probe = global.document.createElement("div");
      probe.style.position = "absolute";
      probe.style.height = cssLen;
      probe.style.visibility = "hidden";
      global.document.body.appendChild(probe);
      var px = probe.offsetHeight;
      global.document.body.removeChild(probe);
      return px;
    }
    var topPx = toPx(topRaw);

    // ── Sticky düzeni ─────────────────────────────────────────────
    // Sonra gelen panel öncekilerin ÜZERİNE kayar (z-index artan). peek > 0
    // ise her panel bir öncekinden `peek` px aşağıda yapışır → görünür deste.
    panels.forEach(function (panel, i) {
      panel.style.position = "sticky";
      panel.style.top = (topPx + i * peek) + "px";
      panel.style.zIndex = String(i + 1);
      if (!reduce) {
        panel.style.willChange = "transform";
        panel.style.transformOrigin = "center top";
      }
    });

    if (reduce) return; /* sticky binme kalır; hareket yok */

    // ── Örtülme scrub'ı ───────────────────────────────────────────
    // panels[i]'yi panels[i+1] örter. Küçülme her karede örtülme miktarıyla
    // birebir orantılı — panel örtülene kadar gözle görülür şekilde geriler,
    // hiçbir aşamada şeffaflaşmaz.
    panels.forEach(function (panel, i) {
      if (i === panels.length - 1) return; /* son panel örtülmez */

      var dim = global.document.createElement("div");
      dim.className = "sticky-stack__dim";
      panel.appendChild(dim);

      var vars = { scale: endScale, y: -lift, ease: "none", force3D: true };
      if (blurMax > 0) vars.filter = "blur(" + blurMax + "px)";

      var nextTopPx = topPx + (i + 1) * peek;

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: panels[i + 1],
          start: "top bottom",
          end: "top " + nextTopPx + "px",
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: -1, /* pin yok — pinli bölüm kurallarını bozmaz */
        },
      });

      tl.to(panel, vars, 0).to(dim, { opacity: dimMax, ease: "none" }, 0);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStickyStack = initStickyStack;

})(typeof window !== "undefined" ? window : this);
