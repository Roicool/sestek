/*!
 * section-shrink.js v1.1.0
 * Full-bleed → container "oturma" efekti: section viewport'a girerken tam
 * genişlik başlar, scroll'la hedef container genişliğine (default
 * --container--2xl) büzülür; kenarlarına radius gelir. Geri sarınca açılır.
 *
 * MEKANİZMA — clip-path: inset(0 Xpx round R):
 *   Genişlik/max-width ANİMASYONU YOK — her frame reflow tetiklerdi ve
 *   çevresindeki akışı oynatırdı. Bunun yerine kutu akışta tam genişlik
 *   kalır, yalnız BOYASI kırpılır: komşu section'lar hiç etkilenmez,
 *   pin'li bölüm kurallarıyla da çakışmaz (transform kullanılmaz).
 *   Bu yüzden section İÇİNDEKİ içerik zaten bir container'da durmalı
 *   (site deseninde öyle) — kırpılan yalnız arka plandır.
 *
 * Hedef görünür genişlik diğer container'larla AYNI matematik:
 *   min(max, sectionGenişliği − 2×gutter)  → kenar boşluğu view-px ile eş.
 * Değerler CSS uzunluğu olarak verilir (var()/rem/px…), px'e prob ile
 * çevrilir ve her ScrollTrigger refresh'inde YENİDEN ölçülür
 * (invalidateOnRefresh) — resize/breakpoint'te hedef güncel kalır.
 *
 * Kurulmama halleri: JS yok → tam genişlik kalır (çizime engel yok).
 * bp altı (mobil) → efekt yok, Designer düzeni neyse o. Reduced motion →
 * animasyonsuz, DURGUN SON HAL (container'a oturmuş) uygulanır.
 *
 * v1.1.0 — ÜSTTEKİ PİNLİ BÖLÜMLERLE UYUM:
 *   · refreshPriority default -1 (reveal.js kuralı): pin DEĞİLİZ; tüm
 *     pinler ölçülüp spacer'ları yerine oturDUKTAN SONRA ölçülürüz. Aksi
 *     halde start/end üstteki pin mesafeleri kadar erken hesaplanır ve
 *     section görünmeden animasyon bitmiş olur ("hep küçük geliyor" bug'ı).
 *   · Lift: köke position:relative + z-index:1 basılır (varsa dokunulmaz) —
 *     viewport'tan uzun pinli bir bölümün ardından gelirken giriş, pinli
 *     elementin (transform'lu → üstte boyanır) arkasında kaybolmasın,
 *     önünden perde gibi görünsün. data-shrink-lift="false" ile kapanır;
 *     pin yoksa görünür bir etkisi zaten olmaz.
 *
 * Requires : gsap + ScrollTrigger.
 *
 * Kök [data-shrink] attribute'ları (hepsi opsiyonel):
 *   data-shrink-max     hedef genişlik (CSS uzunluğu)
 *                                    (default var(--container--2xl, 96rem))
 *   data-shrink-gutter  min kenar boşluğu (default var(--view--px, 16px))
 *   data-shrink-radius  bitiş border-radius (default var(--radius--xl, 1.25rem))
 *   data-shrink-bp      efekt breakpoint'i px — altında kapalı (default 992)
 *   data-shrink-start   ScrollTrigger start   (default "top bottom")
 *   data-shrink-end     ScrollTrigger end     (default "top 30%")
 *   data-shrink-scrub   scrub yumuşatması sn — örn "0.5" (default true = kilitli)
 *   data-shrink-priority  refreshPriority     (default -1 — pinlerden sonra ölç)
 *   data-shrink-lift    "false" → relative + z-index:1 yükseltmesi kapalı
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * CSS uzunluğunu (var()/rem/px/vw…) elementin bağlamında px'e çevirir.
   * Prob: köke eklenen görünmez bir div'e width olarak basılır, ölçülür.
   */
  function toPx(root, cssLen) {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:0;" +
      "width:" + cssLen + ";";
    root.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    root.removeChild(probe);
    return px;
  }

  function setup(root) {
    if (root._shrinkInit) return;                          // idempotent
    root._shrinkInit = true;

    var maxLen    = root.getAttribute("data-shrink-max")    || "var(--container--2xl, 96rem)";
    var gutterLen = root.getAttribute("data-shrink-gutter") || "var(--view--px, 16px)";
    var radiusLen = root.getAttribute("data-shrink-radius") || "var(--radius--xl, 1.25rem)";
    var bp        = num(root, "data-shrink-bp", 992);
    var startAt   = root.getAttribute("data-shrink-start")  || "top bottom";
    var endAt     = root.getAttribute("data-shrink-end")    || "top 30%";
    var scrubRaw  = root.getAttribute("data-shrink-scrub");
    var scrub     = scrubRaw ? (parseFloat(scrubRaw) || true) : true;
    var priority  = num(root, "data-shrink-priority", -1);
    var lift      = root.getAttribute("data-shrink-lift") !== "false";

    // Bitiş clip'i — her refresh'te yeniden ölçülür (function-based).
    var endClip = function () {
      var w      = root.clientWidth;
      var maxPx  = toPx(root, maxLen);
      var gutPx  = toPx(root, gutterLen);
      var radPx  = toPx(root, radiusLen);
      var target = Math.min(maxPx, w - 2 * gutPx);
      var inset  = Math.max(0, (w - target) / 2);
      return "inset(0px " + inset.toFixed(2) + "px round " + radPx.toFixed(2) + "px)";
    };

    var mm = gsap.matchMedia();

    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        // Lift: üstteki pinli (transform'lu) elementin önünden görünür giriş.
        var lifted = [];
        if (lift) {
          var cs = getComputedStyle(root);
          if (cs.position === "static") { root.style.position = "relative"; lifted.push("position"); }
          if (cs.zIndex === "auto")     { root.style.zIndex = "1";          lifted.push("zIndex"); }
        }

        var t = gsap.fromTo(root,
          { clipPath: "inset(0px 0px round 0px)" },
          {
            clipPath: endClip,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: startAt,
              end: endAt,
              scrub: scrub,
              invalidateOnRefresh: true,           // hedef px'ler tazelensin
              // Pin DEĞİLİZ: tüm pinler spacer'larını oturttuktan SONRA
              // ölçülmeliyiz — yoksa üstte pin varsa start/end erken kalır.
              refreshPriority: priority,
            },
          }
        );
        return function () {
          t.scrollTrigger && t.scrollTrigger.kill();
          t.kill();
          gsap.set(root, { clearProps: "clipPath" });
          lifted.forEach(function (p) { root.style[p] = ""; });
        };
      }
    );

    // Reduced motion: animasyon yok, durgun SON hal (container'a oturmuş).
    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: reduce)",
      function () {
        gsap.set(root, { clipPath: endClip() });
        return function () { gsap.set(root, { clearProps: "clipPath" }); };
      }
    );
  }

  /**
   * Sayfadaki her [data-shrink] section'ını bağlar.
   * @param {string} [selector="[data-shrink]"]
   */
  function initSectionShrink(selector) {
    var roots = document.querySelectorAll(selector || "[data-shrink]");
    if (!roots.length) { console.warn("[Sestek SectionShrink] No [data-shrink] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek SectionShrink] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    roots.forEach(setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSectionShrink = initSectionShrink;

})(typeof window !== "undefined" ? window : this);
