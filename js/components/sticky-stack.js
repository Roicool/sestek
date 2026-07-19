/*!
 * sticky-stack.js v1.1.0
 *
 * Changelog
 * v1.1.0 — premium depth pass:
 *   • incoming settle: gelen panel 0.97 scale'de süzülür, sticky çizgisine
 *     oturduğu anda 1'e "yerleşir" — kartın rafa oturma hissi
 *   • contact shadow: gelen panel, alttaki panelin üzerine yaklaştıkça
 *     koyulaşan yumuşak bir gölge düşürür — katmanlar gerçekten ayrışır
 *   • desaturation: örtülen panel kararırken hafifçe solar (saturate) —
 *     editoryal recede hissi
 *   Hepsi opsiyonel ve attribute'la kapatılabilir.
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
 *   data-sticky-settle  gelen panelin yaklaşırken scale'i — sticky çizgisine
 *                       oturunca 1'e yerleşir              (default 0.97, 1 = off)
 *   data-sticky-shadow  gelen panelin alttakine düşürdüğü temas gölgesinin
 *                       opaklığı                           (default 0.35, 0 = off)
 *   data-sticky-desat   tam örtülen panelin saturate değeri (default 0.9, 1 = off)
 *
 * Not: panellere ≥ ~90svh yükseklik ver — çok kısa panellerde "geliş" ve
 * "örtülme" fazları üst üste binip titreme yapabilir.
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
    var settle   = num(root, "data-sticky-settle", 0.97);
    var shadowOp = num(root, "data-sticky-shadow", 0.35);
    var desat    = num(root, "data-sticky-desat", 0.9);

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

    // ── Geliş scrub'ı (incoming settle + temas gölgesi) ───────────
    // İlk panel dışındaki her panel, viewport'a girişinden sticky çizgisine
    // oturana dek hafifçe küçük (settle) süzülür ve 1'e "yerleşir"; aynı
    // yolculukta üst kenarından alttaki panele düşen temas gölgesi koyulaşır.
    panels.forEach(function (panel, i) {
      if (i === 0) return;

      var myTopPx = topPx + i * peek;
      var shadowFrom = "0px -18px 44px -18px rgba(10, 10, 14, 0)";
      var shadowTo   = "0px -18px 44px -18px rgba(10, 10, 14, " + shadowOp + ")";

      var arrive = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          start: "top bottom",
          end: "top " + myTopPx + "px",
          scrub: true,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      });

      if (settle < 1) {
        arrive.fromTo(panel,
          { scale: settle },
          { scale: 1, ease: "none", force3D: true, immediateRender: true }, 0);
      }
      if (shadowOp > 0) {
        arrive.fromTo(panel,
          { boxShadow: shadowFrom },
          { boxShadow: shadowTo, ease: "none", immediateRender: true }, 0);
      }
    });

    // ── Örtülme scrub'ı ───────────────────────────────────────────
    // panels[i]'yi panels[i+1] örter. Küçülme her karede örtülme miktarıyla
    // birebir orantılı — panel örtülene kadar gözle görülür şekilde geriler,
    // hiçbir aşamada şeffaflaşmaz; kararırken hafifçe solar (desat).
    panels.forEach(function (panel, i) {
      if (i === panels.length - 1) return; /* son panel örtülmez */

      var dim = global.document.createElement("div");
      dim.className = "sticky-stack__dim";
      panel.appendChild(dim);

      var fromVars = { scale: 1, y: 0 };
      var toVars   = { scale: endScale, y: -lift, ease: "none", force3D: true };
      /* filter başlangıcını AÇIKÇA ver — "none"dan interpole edilirse GSAP
       * saturate'i 0'dan başlatır (panel önce grileşip geri canlanır). */
      var fromF = [], toF = [];
      if (blurMax > 0) { fromF.push("blur(0px)"); toF.push("blur(" + blurMax + "px)"); }
      if (desat < 1)   { fromF.push("saturate(1)"); toF.push("saturate(" + desat + ")"); }
      if (toF.length) { fromVars.filter = fromF.join(" "); toVars.filter = toF.join(" "); }

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

      /* immediateRender:false — geliş fazındaki settle durumunu ezmesin */
      tl.fromTo(panel, fromVars, mergeIR(toVars), 0)
        .to(dim, { opacity: dimMax, ease: "none" }, 0);

      function mergeIR(v) { v.immediateRender = false; return v; }
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStickyStack = initStickyStack;

})(typeof window !== "undefined" ? window : this);
