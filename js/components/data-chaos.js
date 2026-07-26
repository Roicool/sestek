/*!
 * data-chaos.js v1.0.0
 * "Data Chaos → Clarity" pinli scroll bölümü. Ortadaki kart scroll'la sola
 * sürüklenir; kaos SVG katmanları sönerken clarity katmanı belirir, "Chaos"
 * kelimesi "Clarity"ye flip olur, soldaki Challenge kartı soluklaşıp sağdaki
 * Solution kartı öne çıkar.
 *
 * TIMELINE ORİJİNALİN BİREBİR AYNISIDIR — label'lar, süreler, pozisyonlar ve
 * değerler değiştirilmemiştir; yalnız seçiciler data-attribute'a ve kök
 * scope'una çevrilmiştir. Eklenenler animasyonu değiştirmez:
 * refreshPriority (pinli bölüm kuralı), prefers-reduced-motion'da pin'siz
 * statik düzen, idempotent init, çoklu instance.
 *
 * Requires : gsap + ScrollTrigger.
 *
 * ── DOM (yapı orijinalle aynı — yalnız isimler Sestek) ───────────
 *
 *   [data-dchaos]                          ← pinlenecek kök section
 *     .dchaos__grid
 *       .dchaos__card--challenge
 *         [data-dchaos-challenge]          ← sol içerik (soluklaşan)
 *       .dchaos__card--solution
 *         [data-dchaos-solution]           ← sağ içerik (öne çıkan)
 *       [data-dchaos-card]                 ← hareketli üst kart
 *         .dchaos__stage
 *           .dchaos__type
 *             <p>Data</p>
 *             .dchaos__flip
 *               [data-dchaos-word-chaos]   ← "Chaos"
 *               [data-dchaos-word-clarity] ← "Clarity"
 *           [data-dchaos-chaos]            ← kaos SVG (başta görünür)
 *           [data-dchaos-parallax]         ← kaos parallax SVG (başta görünür)
 *           [data-dchaos-clarity]          ← clarity SVG (başta gizli)
 *
 * Kök attribute'ları (hepsi opsiyonel):
 *   data-dchaos-bp        pin breakpoint px — altında statik   (default 1200;
 *                         data-chaos.css'teki 1199px media'yla senkron tut)
 *   data-dchaos-start     ScrollTrigger start                  (default "top 10%")
 *   data-dchaos-end       ScrollTrigger end                    (default "bottom top")
 *   data-dchaos-priority  refreshPriority — sayfadaki dikey
 *                         konuma göre PROJECT.md tablosundan   (default 1)
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
    if (root._dchaosInit) return;                         // idempotent
    root._dchaosInit = true;

    var card        = root.querySelector("[data-dchaos-card]");
    var chaosBg     = root.querySelector("[data-dchaos-chaos]");
    var parallax    = root.querySelector("[data-dchaos-parallax]");
    var clarity     = root.querySelector("[data-dchaos-clarity]");
    var wordChaos   = root.querySelector("[data-dchaos-word-chaos]");
    var wordClarity = root.querySelector("[data-dchaos-word-clarity]");
    var challenge   = root.querySelector("[data-dchaos-challenge]");
    var solution    = root.querySelector("[data-dchaos-solution]");

    if (!card || !chaosBg || !parallax || !clarity ||
        !wordChaos || !wordClarity || !challenge || !solution) {
      console.warn("[Sestek DataChaos] Eksik parça — DOM sözleşmesine bak.", root);
      return;
    }

    var bp       = num(root, "data-dchaos-bp", 1200);
    var priority = num(root, "data-dchaos-priority", 1);
    var startAt  = root.getAttribute("data-dchaos-start") || "top 10%";
    var endAt    = root.getAttribute("data-dchaos-end") || "bottom top";

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
            // Pin, dokümana pin-spacing ekler — sayfadaki diğer pinlerle
            // doğru sıralanması için (PROJECT.md refreshPriority tablosu).
            refreshPriority: priority,
          },
        });

        // ── ORİJİNAL TIMELINE — birebir, DOKUNULMADI ────────────────
        t.addLabel("split");
        t.to(card, { x: "-50%", duration: 4 });
        t.to(chaosBg, { opacity: 0, duration: 2 }, "split+=2");
        t.to(parallax, { opacity: 0, duration: 2 }, "split+=2");
        t.to(wordClarity, { opacity: 0.5, transform: "translateY(-25px) translateX(0)", duration: 2 }, "split+=2");
        t.to(wordChaos, { opacity: 0.5, transform: "translateY(-25px) translateX(0)", duration: 2 }, "split+=2");
        t.to(challenge, { opacity: 0.5, transform: "translateY(50px) translateX(0)", duration: 2 }, "split+=2");
        t.to(solution, { opacity: 0.5, transform: "translateY(50px) translateX(0)", duration: 2 }, "split+=2");

        t.addLabel("final");
        t.to(card, { xPercent: -100, x: -20, duration: 5 }, "final");
        t.to(solution, { opacity: 1, transform: "translateY(0) translateX(0)", duration: 2 }, "final+=1");
        t.to(wordChaos, { opacity: 0, transform: "translateY(-75px) translateX(0)", duration: 2 }, "final+=1");
        t.to(wordClarity, { opacity: 1, transform: "translateY(-87px) translateX(0)", duration: 2 }, "final+=1");
        t.to(clarity, { opacity: 1, duration: 3 }, "final+=2");
        // ── /orijinal timeline ──────────────────────────────────────

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
   * Sayfadaki her [data-dchaos] bölümünü bağlar.
   * @param {string} [selector="[data-dchaos]"]
   */
  function initDataChaos(selector) {
    var roots = document.querySelectorAll(selector || "[data-dchaos]");
    if (!roots.length) { console.warn("[Sestek DataChaos] No [data-dchaos] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek DataChaos] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    roots.forEach(setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initDataChaos = initDataChaos;

})(typeof window !== "undefined" ? window : this);
