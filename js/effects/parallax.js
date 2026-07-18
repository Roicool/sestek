/*!
 * parallax.js v1.0.0
 * Scroll parallax — background image'lar ve normal image'lar için, tamamen
 * data-attribute driven. Scrub'lı ScrollTrigger ile scroll'a birebir kilitli;
 * derinlik hissi veren "slower-than-scroll" hareket.
 *
 * İki mod:
 *
 *   1. NORMAL MOD — data-parallax
 *      Elementin kendisi (img, card, başlık, ne olursa) viewport'tan geçerken
 *      hafifçe sürüklenir. Layout'a dokunmaz, sadece transform.
 *
 *        <img src="…" data-parallax data-parallax-speed="0.2">
 *
 *   2. BACKGROUND MOD — data-parallax="bg"
 *      Attribute'u KONTEYNERE verirsin. İçindeki medya (img/video — yoksa
 *      konteynerin kendi CSS background-image'ı otomatik bir iç katmana
 *      taşınır) kenar açığı vermeyecek kadar ölçeklenir ve konteyner
 *      viewport'tan geçerken içinde yavaşça kayar. Klasik "hero bg parallax".
 *
 *        <div class="hero" data-parallax="bg" data-parallax-speed="0.25">
 *          <img src="…">                  ← ya da hero'ya CSS background-image ver
 *          <div class="hero-content">…</div>
 *        </div>
 *
 *      Konteynere JS `overflow:hidden` + (statikse) `position:relative` basar;
 *      medya mutlak konumlanıp cover'lanır. İçerik (medya olmayan çocuklar)
 *      etkilenmez — sadece z-index ile medyanın üstünde kaldığından emin ol.
 *
 * Attribute'lar (data-parallax dışında hepsi opsiyonel):
 *   data-parallax          "" | "y" → normal mod, "bg" → background mod
 *   data-parallax-speed    hareket miktarı/yönü                      (default 0.2)
 *                            normal: viewport yüksekliğinin oranı — 0.2 → eleman
 *                            geçiş boyunca toplam 0.2×vh sürüklenir.
 *                            bg: medyanın ekstra ölçeği — 0.25 → scale 1.25, taşan
 *                            kısım kayma payı olur. NEGATİF değer yönü çevirir
 *                            (foreground hissi: scroll'dan hızlı).
 *   data-parallax-media    bg modda medya seçici                     (default "img, video")
 *   data-parallax-scale    bg modda ölçek override — speed'den bağımsız daha
 *                          yakın/uzak bir kadraj istersen (>= 1 + |speed| olmalı,
 *                          değilse otomatik yükseltilir)
 *   data-parallax-start    ScrollTrigger start                       (default "top bottom")
 *   data-parallax-end      ScrollTrigger end                         (default "bottom top")
 *   data-parallax-scrub    scrub değeri; sayı = yumuşatma sn         (default true)
 *
 * Sayfanın en üstünde duran (yüklendiğinde zaten görünür) bölümlerde start
 * "clamp(top bottom)" olarak sıkıştırılır — ilk açılışta medya zıplamaz.
 *
 * Requires: gsap + ScrollTrigger (+ Sestek.util). Pin yok → refreshPriority -1.
 * CSS dosyası yok — gerekli stiller JS'ten basılır.
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
    media: "img, video",
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

    var attrNum = util
      ? util.attrNum
      : function (el, a, f) { var v = parseFloat(el.getAttribute(a)); return isNaN(v) ? f : v; };

    els.forEach(function (el) {
      if (el._parallaxInit) return;
      el._parallaxInit = true;

      var mode  = (el.getAttribute("data-parallax") || "y").toLowerCase();
      var speed = attrNum(el, "data-parallax-speed", DEFAULTS.speed);
      if (!speed) return;

      var start = el.getAttribute("data-parallax-start") || DEFAULTS.start;
      var end   = el.getAttribute("data-parallax-end")   || DEFAULTS.end;

      var scrubAttr = el.getAttribute("data-parallax-scrub");
      var scrub = true;
      if (scrubAttr != null && scrubAttr !== "" && scrubAttr !== "true") {
        scrub = isNaN(parseFloat(scrubAttr)) ? true : parseFloat(scrubAttr);
      }

      // Sayfa en üstündeki bölüm: trigger daha yüklenirken start'ı geçmiş olur,
      // clamp'lenmezse medya ilk karede yarı yoldan başlar (zıplama görünür).
      if (start === DEFAULTS.start && el.getBoundingClientRect().top + window.scrollY < window.innerHeight) {
        start = "clamp(top bottom)";
      }

      if (mode === "bg") {
        initBg(el, speed, start, end, scrub);
      } else {
        initSelf(el, speed, start, end, scrub);
      }
    });
  }

  // ── Normal mod — elementin kendisi sürüklenir ────────────────────────────────
  function initSelf(el, speed, start, end, scrub) {
    var drift = function () { return speed * window.innerHeight * 0.5; };

    gsap.fromTo(el,
      { y: function () { return  drift(); } },
      {
        y: function () { return -drift(); },
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: start,
          end: end,
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      });
  }

  // ── Background mod — konteyner sabit, içindeki medya kayar ───────────────────
  function initBg(el, speed, start, end, scrub) {
    var sel   = el.getAttribute("data-parallax-media") || DEFAULTS.media;
    var media = el.querySelector(sel);

    // Medya elementi yoksa konteynerin CSS background-image'ını bir iç katmana
    // taşı — background-position tween'lemekten çok daha akıcı (GPU transform).
    if (!media) {
      var cs = getComputedStyle(el);
      if (!cs.backgroundImage || cs.backgroundImage === "none") {
        console.warn("[Sestek Parallax] data-parallax=\"bg\" ama medya da background-image da yok:", el);
        return;
      }
      media = document.createElement("div");
      media.setAttribute("data-parallax-layer", "");
      media.style.backgroundImage    = cs.backgroundImage;
      media.style.backgroundSize     = "cover";
      media.style.backgroundPosition = cs.backgroundPosition || "center";
      media.style.backgroundRepeat   = "no-repeat";
      el.insertBefore(media, el.firstChild);
      el.style.backgroundImage = "none";
    }

    // Konteyner hazırlığı — taşan medyayı kırp
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    el.style.overflow = "hidden";

    // Medya konteyneri doldursun; taşma payı transform'dan gelecek
    media.style.position = "absolute";
    media.style.top = "0";
    media.style.left = "0";
    media.style.width = "100%";
    media.style.height = "100%";
    if (media.tagName === "IMG" || media.tagName === "VIDEO") {
      media.style.objectFit = "cover";
    }
    media.style.willChange = "transform";

    // scale s → her kenarda h·(s−1)/2 taşma payı. yPercent bu payı birebir
    // tüketir (GSAP translate'i scale'den SONRA, layout px'inde uygular):
    // maks güvenli kayma = ±(s−1)·50 yPercent → kenar açığı matematiksel olarak imkânsız.
    var s = 1 + Math.abs(speed);
    var scaleAttr = parseFloat(el.getAttribute("data-parallax-scale"));
    if (!isNaN(scaleAttr) && scaleAttr >= s) s = scaleAttr;

    var shift = Math.abs(speed) * 50; // kayma her zaman speed'ten; scale override'ı sadece kadrajı büyütür
    var dir   = speed < 0 ? -1 : 1;

    gsap.fromTo(media,
      { scale: s, yPercent: -shift * dir, transformOrigin: "center center", force3D: true },
      {
        yPercent: shift * dir,
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: start,
          end: end,
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: -1,
        },
      });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initParallax = initParallax;

})(typeof window !== "undefined" ? window : this);
