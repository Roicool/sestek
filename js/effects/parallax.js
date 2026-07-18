/*!
 * parallax.js v2.0.0
 * Scroll parallax — absolute background image'lar ve normal image'lar için,
 * tamamen data-attribute driven. Scrub'lı ScrollTrigger ile scroll'a kilitli.
 *
 * Changelog
 * v2.0.0 — bg modu absolute <img> düzenine göre yeniden yazıldı (Sestek
 *          sayfaları CSS background-image kullanmıyor): attribute artık
 *          KONTEYNERE değil doğrudan IMG'E verilir, script sarmalayıcıyı
 *          kendisi bulup hazırlar. Görsel boyutu derdi bitti — img section'a
 *          cover'lanır ve kayma payı scale'den gelir; section'dan uzun görsel
 *          koymak GEREKMEZ, kenar açığı matematiksel olarak imkânsız.
 *          Pinli sayfalar için data-parallax-pinned → ScrollTrigger
 *          pinnedContainer desteği. Premium dokunuş: data-parallax-zoom
 *          (scroll boyunca yavaş zoom). Trigger artık asla animate edilen
 *          elemanın kendisi değil (bg modda sarmalayıcı) → refresh stabil.
 * v1.0.0 — ilk sürüm.
 *
 * İki mod:
 *
 *   1. BACKGROUND MOD — data-parallax="bg" (absolute duran img'in KENDİSİNE)
 *
 *        <section class="hero">                    ← position:relative (yoksa JS basar)
 *          <img class="hero-bg" src="…"
 *               data-parallax="bg" data-parallax-speed="0.25">
 *          <div class="hero-content">…</div>       ← z-index ile img'in üstünde tut
 *        </section>
 *
 *      Script img'i parent'ına (ya da data-parallax-trigger ile seçtiğin
 *      ancestor'a) cover'lar: absolute + inset 0 + object-fit:cover, sonra
 *      1+|speed| kadar ölçekleyip section viewport'tan geçerken kaydırır.
 *      Parent'a overflow:hidden basılır (data-parallax-clip="false" ile kapat).
 *
 *      ► Görsel boyutu: section'dan uzun/kısa olması ÖNEMSİZ — kaynak dosyanın
 *        boyutu ne olursa olsun cover + scale her zaman doğru sonucu verir.
 *        Sadece çözünürlük yeterli olsun: section genişliği × (1+speed) kadar.
 *
 *   2. NORMAL MOD — data-parallax
 *      Elementin kendisi (img, card, başlık) viewport'tan geçerken hafifçe
 *      sürüklenir. Layout'a dokunmaz, sadece transform.
 *
 *        <img src="…" data-parallax data-parallax-speed="0.2">
 *
 * Attribute'lar (data-parallax dışında hepsi opsiyonel):
 *   data-parallax          "" | "y" → normal mod, "bg" → background mod
 *   data-parallax-speed    hareket miktarı/yönü                      (default 0.2)
 *                            normal: viewport yüksekliğinin oranı — 0.2 → eleman
 *                            geçiş boyunca toplam 0.2×vh sürüklenir.
 *                            bg: img'in ekstra ölçeği — 0.25 → scale 1.25, taşan
 *                            kısım kayma payı olur. NEGATİF değer yönü çevirir
 *                            (foreground hissi: scroll'dan hızlı).
 *   data-parallax-zoom     bg modda premium yavaş zoom — scroll boyunca scale
 *                          bu çarpana kadar büyür, örn. 1.15    (default 1, kapalı)
 *   data-parallax-trigger  bg modda sarmalayıcı/trigger seçici (closest ile
 *                          aranır)                               (default parent)
 *   data-parallax-clip     "false" → sarmalayıcıya overflow:hidden basma
 *   data-parallax-pinned   pinli bir bölümün İÇİNDEYSE pinli konteynerin
 *                          seçicisi (closest ile aranır) → ScrollTrigger
 *                          pinnedContainer olarak geçilir; start/end pin
 *                          süresini hesaba katar. Pinli sayfalarda şart.
 *   data-parallax-start    ScrollTrigger start                   (default "top bottom")
 *   data-parallax-end      ScrollTrigger end                     (default "bottom top")
 *   data-parallax-scrub    scrub değeri; sayı = yumuşatma sn     (default true —
 *                          Lenis zaten atalet veriyor; Lenis'siz sayfada 0.6 öner)
 *
 * Sayfanın en üstünde duran (yüklendiğinde zaten görünür) bölümlerde start
 * "clamp(top bottom)" olarak sıkıştırılır — ilk açılışta görsel zıplamaz.
 *
 * Pinli bölümlerle birlikte kullanım (ÖNEMLİ — docs/PROJECT.md kuralları):
 *   • Pin YOK bu efektte → refreshPriority: -1 (reveal.js ile aynı seviye),
 *     pinli component'lerin spacing hesabını asla bozmaz.
 *   • Parallax elemanı pinli bir bölümün İÇİNDEyse data-parallax-pinned ver;
 *     verilmezse pin süresi boyunca start/end kayar ve efekt erken biter.
 *   • invalidateOnRefresh: true → her refresh'te mesafeler yeniden ölçülür
 *     (CMS load, resize, font — lenis-init'in refresh zinciriyle uyumlu).
 *
 * Requires: gsap + ScrollTrigger (+ Sestek.util). CSS dosyası yok.
 *
 * Webflow init:
 *   document.addEventListener('DOMContentLoaded', function () {
 *     Sestek.initParallax();
 *   });
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    speed: 0.2,
    start: "top bottom",
    end: "bottom top",
  };

  function initParallax() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek Parallax] GSAP + ScrollTrigger required.");
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    var els = Array.from(document.querySelectorAll("[data-parallax]"));
    if (!els.length) return;

    var util = (global.Sestek && global.Sestek.util) || null;
    var reduce = util
      ? util.prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // hiç kurma — statik sayfa zaten doğru görünüyor

    els.forEach(function (el) {
      if (el._parallaxInit) return;
      el._parallaxInit = true;

      var mode  = (el.getAttribute("data-parallax") || "y").toLowerCase();
      var speed = attrNum(el, "data-parallax-speed", DEFAULTS.speed);
      if (!speed) return;

      if (mode === "bg") initBg(el, speed);
      else               initSelf(el, speed);
    });

    // ── Ortak ScrollTrigger config ─────────────────────────────────────────────
    // trigger = bg modda sarmalayıcı, normal modda elemanın kendisi.
    function buildTrigger(el, trigger) {
      var start = el.getAttribute("data-parallax-start") || DEFAULTS.start;
      var end   = el.getAttribute("data-parallax-end")   || DEFAULTS.end;

      // Sayfa en üstündeki bölüm: trigger daha yüklenirken start'ı geçmiş olur,
      // clamp'lenmezse görsel ilk karede yarı yoldan başlar (zıplama görünür).
      if (start === DEFAULTS.start &&
          trigger.getBoundingClientRect().top + window.scrollY < window.innerHeight) {
        start = "clamp(top bottom)";
      }

      var scrubAttr = el.getAttribute("data-parallax-scrub");
      var scrub = true;
      if (scrubAttr != null && scrubAttr !== "" && scrubAttr !== "true") {
        scrub = isNaN(parseFloat(scrubAttr)) ? true : parseFloat(scrubAttr);
      }

      var st = {
        trigger: trigger,
        start: start,
        end: end,
        scrub: scrub,
        invalidateOnRefresh: true,
        refreshPriority: -1, // pin yok — pinli component'lerden SONRA refresh olur
      };

      // Pinli bölüm içindeyse: pin süresi start/end hesabına katılmalı,
      // yoksa efekt pin boyunca donuk kalır ya da erken biter.
      var pinnedSel = el.getAttribute("data-parallax-pinned");
      if (pinnedSel) {
        var pinned = el.closest(pinnedSel);
        if (pinned) st.pinnedContainer = pinned;
        else console.warn("[Sestek Parallax] data-parallax-pinned eşleşmedi:", pinnedSel, el);
      }
      return st;
    }

    // ── Normal mod — elementin kendisi sürüklenir ─────────────────────────────
    function initSelf(el, speed) {
      var drift = function () { return speed * window.innerHeight * 0.5; };

      gsap.fromTo(el,
        { y: function () { return  drift(); } },
        {
          y: function () { return -drift(); },
          ease: "none",
          scrollTrigger: buildTrigger(el, el),
        });
    }

    // ── Background mod — absolute img, sarmalayıcı içinde kayar ───────────────
    function initBg(img, speed) {
      var sel  = img.getAttribute("data-parallax-trigger");
      var wrap = sel ? img.closest(sel) : img.parentElement;
      if (!wrap || wrap === document.body) {
        console.warn("[Sestek Parallax] bg modda sarmalayıcı bulunamadı:", img);
        return;
      }

      // Sarmalayıcı hazırlığı — taşan img'i kırp
      if (getComputedStyle(wrap).position === "static") wrap.style.position = "relative";
      if (img.getAttribute("data-parallax-clip") !== "false") wrap.style.overflow = "hidden";

      // Img sarmalayıcıyı doldursun; kaynak dosyanın boyutu ÖNEMSİZ —
      // cover her zaman kadrajı doldurur, kayma payı scale'den gelir.
      img.style.position  = "absolute";
      img.style.top       = "0";
      img.style.left      = "0";
      img.style.width     = "100%";
      img.style.height    = "100%";
      img.style.objectFit = "cover";
      img.style.willChange = "transform";

      // scale s → her kenarda h·(s−1)/2 taşma payı. yPercent bu payı birebir
      // tüketir (GSAP translate'i scale'den SONRA, layout px'inde uygular):
      // maks güvenli kayma = ±(s−1)·50 yPercent → kenar açığı imkânsız.
      // data-parallax-zoom scale'i progress boyunca sadece BÜYÜTÜR, pay azalmaz.
      var s     = 1 + Math.abs(speed);
      var zoom  = attrNum(img, "data-parallax-zoom", 1);
      var shift = Math.abs(speed) * 50;
      var dir   = speed < 0 ? -1 : 1;

      var to = {
        yPercent: shift * dir,
        ease: "none",
        scrollTrigger: buildTrigger(img, wrap),
      };
      if (zoom > 1) to.scale = s * zoom;

      gsap.fromTo(img,
        { scale: s, yPercent: -shift * dir, transformOrigin: "center center", force3D: true },
        to);
    }
  }

  // Numeric data-attribute reader — utils.js varsa oradan, yoksa lokal fallback.
  function attrNum(el, attr, fallback) {
    if (global.Sestek && global.Sestek.util) return global.Sestek.util.attrNum(el, attr, fallback);
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initParallax = initParallax;

})(typeof window !== "undefined" ? window : this);
