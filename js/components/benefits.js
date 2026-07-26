/*!
 * benefits.js v1.3.0
 * "Data Chaos → Clarity" pinli scroll bölümü. Ortadaki kart scroll'la sola
 * sürüklenir; kaos SVG katmanları sönerken clarity katmanı belirir, "Chaos"
 * kelimesi "Clarity"ye flip olur, soldaki Challenge kartı soluklaşıp sağdaki
 * Solution kartı öne çıkar.
 *
 * v1.1.0 — Kelime flip mesafeleri ÖLÇÜME dayalı: orijinaldeki -25/-75/-87px
 * sabitleri o sitenin fontuna bağlıydı; şimdi Clarity'nin Chaos satırına
 * inme mesafesi (iki kelimenin akıştaki dikey farkı) her refresh'te ölçülür
 * — Sestek tipografisi ne olursa olsun hizalar. v1.2.0: kartın sola iniş
 * telafisi de ölçülü — sabit -20px yerine grid'in gerçek column-gap'i
 * okunur; --benefits-gap artık serbestçe değiştirilebilir. v1.3.0: parallax
 * katmanı adını hak etti — kart sola kayarken şerit data-benefits-parallax-drift
 * px kadar GERİDE kalır (fark hızı = derinlik); önceden yalnız opacity
 * fade'i vardı ve katman kaosun içinde hiç seçilmiyordu. Kalan timeline (kart
 * sürüklenmesi, SVG geçişleri, içerik fade'leri) orijinal oran ve
 * sürelerle aynıdır. refreshPriority (pinli bölüm kuralı),
 * reduced-motion'da statik düzen, idempotent init, çoklu instance.
 *
 * Requires : gsap + ScrollTrigger.
 *
 * ── DOM (yapı orijinalle aynı — yalnız isimler Sestek) ───────────
 *
 *   [data-benefits]                          ← pinlenecek kök section
 *     .benefits__grid
 *       .benefits__card--challenge
 *         [data-benefits-challenge]          ← sol içerik (soluklaşan)
 *       .benefits__card--solution
 *         [data-benefits-solution]           ← sağ içerik (öne çıkan)
 *       [data-benefits-card]                 ← hareketli üst kart
 *         .benefits__stage
 *           .benefits__type
 *             <p>Data</p>
 *             .benefits__flip
 *               [data-benefits-word-from]   ← "Chaos"
 *               [data-benefits-word-to] ← "Clarity"
 *           [data-benefits-from]            ← kaos SVG (başta görünür)
 *           [data-benefits-parallax]         ← kaos parallax SVG (başta görünür)
 *           [data-benefits-to]          ← clarity SVG (başta gizli)
 *
 * Kök attribute'ları (hepsi opsiyonel):
 *   data-benefits-bp        pin breakpoint px — altında statik   (default 1200;
 *                         benefits.css'teki 1199px media'yla senkron tut)
 *   data-benefits-start     ScrollTrigger start                  (default "top 10%")
 *   data-benefits-end       ScrollTrigger end                    (default "bottom top")
 *   data-benefits-priority  refreshPriority — sayfadaki dikey
 *                         konuma göre PROJECT.md tablosundan   (default 1)
 *   data-benefits-parallax-drift  kart kayarken parallax SVG'nin geride
 *                         kalma miktarı px — 0 = kapalı        (default 150;
 *                         taban konum CSS --benefits-parallax-x'ten px okunur)
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

  function setup(root) {
    if (root._benefitsInit) return;                         // idempotent
    root._benefitsInit = true;

    var card        = root.querySelector("[data-benefits-card]");
    var chaosBg     = root.querySelector("[data-benefits-from]");
    var parallax    = root.querySelector("[data-benefits-parallax]");
    var clarity     = root.querySelector("[data-benefits-to]");
    var wordChaos   = root.querySelector("[data-benefits-word-from]");
    var wordClarity = root.querySelector("[data-benefits-word-to]");
    var challenge   = root.querySelector("[data-benefits-challenge]");
    var solution    = root.querySelector("[data-benefits-solution]");

    if (!card || !chaosBg || !parallax || !clarity ||
        !wordChaos || !wordClarity || !challenge || !solution) {
      console.warn("[Sestek Benefits] Eksik parça — DOM sözleşmesine bak.", root);
      return;
    }

    var bp       = num(root, "data-benefits-bp", 1200);
    var priority = num(root, "data-benefits-priority", 1);
    var drift    = num(root, "data-benefits-parallax-drift", 150);
    var startAt  = root.getAttribute("data-benefits-start") || "top 10%";
    var endAt    = root.getAttribute("data-benefits-end") || "bottom top";

    var mm = gsap.matchMedia();
    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        var t = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start: startAt,
            end: endAt,
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,           // ölçülen flip mesafeleri tazelensin
            // Pin, dokümana pin-spacing ekler — sayfadaki diğer pinlerle
            // doğru sıralanması için (PROJECT.md refreshPriority tablosu).
            refreshPriority: priority,
          },
        });

        // Flip mesafesi: Clarity akışta Chaos'un ALTINDA durur; aradaki
        // dikey fark = tam iniş mesafesi. Function-based değerler
        // invalidateOnRefresh ile her refresh'te yeniden ölçülür.
        var lift = function () {
          return Math.max(0, wordClarity.offsetTop - wordChaos.offsetTop);
        };

        // Kartın sola inişinde grid gap'i kadar telafi — ölçülü, gap serbest.
        var gapComp = function () {
          var grid = card.parentElement;
          return -(parseFloat(getComputedStyle(grid).columnGap) || 20);
        };

        // Parallax hedefi MUTLAK hesaplanır ("+=" değil): invalidateOnRefresh
        // relatif tween'i her refresh'te yeniden toplayıp kaydırırdı. Taban,
        // CSS --benefits-parallax-x değişkeninden okunur (px bekler).
        var parallaxX = function () {
          var raw = parseFloat(getComputedStyle(root).getPropertyValue("--benefits-parallax-x"));
          return (isNaN(raw) ? -360 : raw) + drift;
        };

        // ── TIMELINE — orijinal oran/süreler; flip mesafeleri ölçülü ─
        t.addLabel("split");
        t.to(card, { x: "-50%", duration: 4 });
        if (drift) t.to(parallax, { x: parallaxX, duration: 4 }, "split");
        t.to(chaosBg, { opacity: 0, duration: 2 }, "split+=2");
        t.to(parallax, { opacity: 0, duration: 2 }, "split+=2");
        t.to(wordClarity, { opacity: 0.5, y: function () { return -lift() * 0.4; }, duration: 2 }, "split+=2");
        t.to(wordChaos, { opacity: 0.5, y: function () { return -lift() * 0.4; }, duration: 2 }, "split+=2");
        t.to(challenge, { opacity: 0.5, y: 50, duration: 2 }, "split+=2");
        t.to(solution, { opacity: 0.5, y: 50, duration: 2 }, "split+=2");

        t.addLabel("final");
        t.to(card, { xPercent: -100, x: gapComp, duration: 5 }, "final");
        t.to(solution, { opacity: 1, y: 0, duration: 2 }, "final+=1");
        t.to(wordChaos, { opacity: 0, y: function () { return -lift() * 1.35; }, duration: 2 }, "final+=1");
        t.to(wordClarity, { opacity: 1, y: function () { return -lift(); }, duration: 2 }, "final+=1");
        t.to(clarity, { opacity: 1, duration: 3 }, "final+=2");
        // ── /timeline ───────────────────────────────────────────────

        // matchMedia cleanup — bp altına inince veya reduced-motion açılınca:
        // pin sökülür, inline state temizlenir, CSS statik düzeni devralır.
        return function () {
          t.scrollTrigger && t.scrollTrigger.kill();
          t.kill();
          gsap.set([card, chaosBg, parallax, clarity, wordChaos, wordClarity, challenge, solution],
            { clearProps: "all" });
        };
      }
    );
  }

  /**
   * Sayfadaki her [data-benefits] bölümünü bağlar.
   * @param {string} [selector="[data-benefits]"]
   */
  function initBenefits(selector) {
    var roots = document.querySelectorAll(selector || "[data-benefits]");
    if (!roots.length) { console.warn("[Sestek Benefits] No [data-benefits] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek Benefits] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    roots.forEach(setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBenefits = initBenefits;

})(typeof window !== "undefined" ? window : this);
