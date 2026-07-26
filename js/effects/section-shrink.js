/*!
 * section-shrink.js v2.0.0
 * Full-bleed → container "oturma" efekti: element viewport'a girerken tam
 * genişlik başlar, scroll'la hedef container genişliğine (default
 * --container--2xl) büzülür; kenarlarına radius gelir. Geri sarınca açılır.
 *
 * [data-shrink] ARTIK HERHANGİ BİR ELEMENTE verilebilir (v2.0.0): section'ın
 * kendisi YA DA içindeki full-bleed medya/arka plan sarmalayıcısı — önerilen
 * ikincisi: metin container'ı dışarıda kalır, kırpılan yalnız medya olur.
 * Trigger elementin kendisidir (kendi viewport girişi).
 *
 * MEKANİZMA — clip-path: inset(0 Xpx round R):
 *   Genişlik/max-width ANİMASYONU YOK — her frame reflow tetiklerdi ve
 *   çevresindeki akışı oynatırdı. Kutu akışta tam genişlik kalır, yalnız
 *   BOYASI kırpılır: komşular etkilenmez, pin kurallarıyla çakışmaz.
 *
 *   v2.0.0: clip-path STRING'İ TWEEN'LENMEZ. Tarayıcı inset kısaltması
 *   ("inset(0px 0px round 0px)" → "inset(0px)") gibi serileştirmeler GSAP
 *   string eşleştirmesini bozup ara değersiz SON DEĞERE ATLAMAYA yol
 *   açabiliyordu. Artık 0→1 arası tek bir SAYI scrub'lanır; clip-path her
 *   frame o sayıdan kurulur — atlama yapısal olarak imkânsız.
 *
 * Hedef görünür genişlik diğer container'larla AYNI matematik:
 *   min(max, elementGenişliği − 2×gutter)  → kenar boşluğu view-px ile eş.
 * Değerler CSS uzunluğu olarak verilir (var()/rem/px…), prob ile px'e
 * çevrilir ve her ScrollTrigger refresh'inde YENİDEN ölçülür.
 *
 * ÜSTTEKİ PİNLİ BÖLÜMLERLE UYUM (v1.1.0):
 *   · refreshPriority default -1 (reveal.js kuralı): pin DEĞİLİZ; tüm
 *     pinler spacer'larını oturttuktan SONRA ölçülürüz.
 *   · Lift: elemente position:relative + z-index:1 basılır (varsa
 *     dokunulmaz) — viewport'tan uzun pinli (transform'lu → üstte boyanan)
 *     bölümün ardından giriş arkada kaybolmaz, önünden perde gibi görünür.
 *     data-shrink-lift="false" kapatır; pin yoksa görünür etkisi yoktur.
 *
 * Kurulmama halleri: JS yok → tam genişlik kalır (çizime engel yok).
 * bp altı (mobil) → efekt yok, Designer düzeni neyse o. Reduced motion →
 * animasyonsuz, DURGUN SON HAL (container'a oturmuş) uygulanır.
 *
 * DİKKAT: kırpılan elemente CSS transition VERME (özellikle "all") — her
 * frame yazılan clip-path ile yarışıp takılma/atlama hissi yaratır.
 *
 * Requires : gsap + ScrollTrigger.
 *
 * [data-shrink] attribute'ları (hepsi opsiyonel):
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
   * Prob ebeveyne eklenir (element <img> gibi çocuk alamayan bir şey
   * olabilir); CSS değişkenleri kalıtımla aynı çözülür.
   */
  function toPx(el, cssLen) {
    var host = el.parentElement || el;
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none;height:0;" +
      "width:" + cssLen + ";";
    host.appendChild(probe);
    var px = probe.getBoundingClientRect().width;
    host.removeChild(probe);
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

    // Hedef px'ler — refresh'te yeniden ölçülür.
    var target = { inset: 0, radius: 0 };
    var measure = function () {
      var w     = root.clientWidth;
      var maxPx = toPx(root, maxLen);
      var gutPx = toPx(root, gutterLen);
      target.radius = toPx(root, radiusLen);
      var vis = Math.min(maxPx, w - 2 * gutPx);
      target.inset = Math.max(0, (w - vis) / 2);
    };

    // Scrub'lanan şey SAYI (0→1); clip her frame bu sayıdan kurulur.
    var proxy = { p: 0 };
    var apply = function () {
      root.style.clipPath = "inset(0px " +
        (target.inset  * proxy.p).toFixed(2) + "px round " +
        (target.radius * proxy.p).toFixed(2) + "px)";
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

        measure();
        var t = gsap.fromTo(proxy, { p: 0 }, {
          p: 1,
          ease: "none",
          onUpdate: apply,
          scrollTrigger: {
            trigger: root,
            start: startAt,
            end: endAt,
            scrub: scrub,
            // Pin DEĞİLİZ: tüm pinler spacer'larını oturttuktan SONRA
            // ölçülmeliyiz — yoksa üstte pin varsa start/end erken kalır.
            refreshPriority: priority,
            // Konumlar tazelenince hedef px'leri de tazele ve mevcut
            // progress'le yeniden uygula (resize/font yüklenmesi).
            onRefresh: function () { measure(); apply(); },
          },
        });

        return function () {
          t.scrollTrigger && t.scrollTrigger.kill();
          t.kill();
          proxy.p = 0;
          root.style.clipPath = "";
          lifted.forEach(function (p) { root.style[p] = ""; });
        };
      }
    );

    // Reduced motion: animasyon yok, durgun SON hal (container'a oturmuş).
    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: reduce)",
      function () {
        measure();
        proxy.p = 1;
        apply();
        return function () { proxy.p = 0; root.style.clipPath = ""; };
      }
    );
  }

  /**
   * Sayfadaki her [data-shrink] elementini bağlar.
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
