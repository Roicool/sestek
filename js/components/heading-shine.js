/*!
 * heading-shine.js v1.0.0
 * Viewport sync for heading-shine.css — the shine sweep RESTARTS the moment
 * the heading enters the viewport, so the pass is always seen instead of
 * being caught mid-cycle (or missed) depending on page-load timing. While
 * off-screen the animation is paused (free perf win); every re-entry
 * restarts the sweep from the beginning.
 *
 * Optional: without this script, heading-shine.css keeps its page-load
 * looping behaviour — nothing breaks.
 *
 * Requires: nothing (vanilla, no GSAP)
 * CSS     : css/components/heading-shine.css (and/or heading-shine-rte.css)
 *
 * Targets every element whose computed animation is a sestek-heading-shine
 * keyframe — [data-heading-mask] elementleri ve heading-shine-rte.css'in
 * seçtiği h2 bold'ları otomatik kapsanır, ekstra attribute gerekmez.
 *
 * API:
 *   Sestek.initHeadingShine()   — wire every shining element on the page
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var THRESHOLD = 0.4; /* başlığın ~%40'ı görününce süpürme başlar */

  function isShining(el) {
    var name = global.getComputedStyle(el).animationName || "";
    return name.indexOf("sestek-heading-shine") !== -1;
  }

  function restart(el) {
    /* animasyonu sıfırdan başlat: kaldır → reflow → geri ver */
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    el.style.animationPlayState = "running";
  }

  function pause(el) {
    el.style.animationPlayState = "paused";
  }

  function initHeadingShine(selector) {
    if (global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; /* CSS zaten animasyonu kapatıyor */
    }

    var candidates = global.document.querySelectorAll(
      selector || '[data-heading-mask], h2 b, h2 strong'
    );
    var targets = Array.prototype.filter.call(candidates, isShining);
    if (!targets.length) return;

    if (!("IntersectionObserver" in global)) return; /* eski tarayıcı: CSS loop'u kalır */

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) restart(entry.target);
        else pause(entry.target);
      });
    }, { threshold: THRESHOLD });

    targets.forEach(function (el) {
      pause(el); /* giriş anına kadar bekle — ilk süpürme kaçmasın */
      observer.observe(el);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHeadingShine = initHeadingShine;

})(typeof window !== "undefined" ? window : this);
