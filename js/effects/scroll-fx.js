/*!
 * scroll-fx.js v1.0.0
 * Scroll-scrubbed micro effects (GSAP + ScrollTrigger). Fully reversible:
 * everything is scrub-driven, so scrolling back rewinds the animation —
 * nothing is one-shot.
 *
 *   1. Text fill — [data-text-fill]
 *      Heading text "fills in" word by word while it scrolls through the
 *      viewport (dim → full colour, reading order). Words are wrapped in
 *      spans automatically; wrapping/line breaks stay natural.
 *
 *   2. Scale in — [data-scale-in]
 *      Images/sections enter the viewport scaled down (or up) and settle
 *      to their original size. Optionally the element's HEIGHT animates
 *      to its natural value too, so surrounding content eases into place.
 *
 * Dependencies: gsap + ScrollTrigger registered. No CSS file needed.
 *
 * API:
 *   Sestek.initScrollFx()   — wire every [data-text-fill] / [data-scale-in]
 *
 * Attributes — [data-text-fill] (all optional):
 *   data-tf-base="0.18"        dim opacity words start at (0-1).
 *   data-tf-start="top 85%"    ScrollTrigger start.
 *   data-tf-end="top 35%"      ScrollTrigger end.
 *   data-tf-scrub="0.5"        scrub smoothing in seconds ("true" = direct).
 *   data-tf-stagger="0.6"      overlap between words (0 = all together,
 *                              1 = strictly one after another).
 *
 * Attributes — [data-scale-in] (all optional):
 *   data-si-scale="0.8"        starting scale (e.g. 1.15 = zoom-out enter).
 *   data-si-height="true"      also animate height from scaled → natural
 *                              (pushes surrounding layout — that's the point).
 *   data-si-origin="center top" transform-origin.
 *   data-si-start="top 90%"    ScrollTrigger start.
 *   data-si-end="top 40%"      ScrollTrigger end.
 *   data-si-scrub="0.5"        scrub smoothing ("true" = direct).
 *   data-si-fade="true"        fade opacity in alongside the scale.
 *
 * prefers-reduced-motion: everything renders in its final state, no motion.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function str(el, name, fallback) {
    var v = el.getAttribute(name);
    return v === null || v === "" ? fallback : v;
  }

  function flag(el, name, fallback) {
    var v = el.getAttribute(name);
    if (v === null || v === "") return fallback;
    return v !== "false" && v !== "0";
  }

  function scrubVal(el, name) {
    var v = el.getAttribute(name);
    if (v === null || v === "" || v === "true") return v === "true" ? true : 0.5;
    var n = parseFloat(v);
    return isNaN(n) ? true : n;
  }

  /* ── 1. Text fill ─────────────────────────────────────────────── */

  /* Metni kelime span'lerine böler; boşluklar text node olarak kalır,
     satır kaymaları doğal akışta çözülür. Ekran okuyucular için orijinal
     metin aria-label'a taşınır. */
  function splitWords(el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text.replace(/\s+/g, " ").trim());
    el.textContent = "";
    var frag = document.createDocumentFragment();
    var parts = text.split(/(\s+)/);
    var spans = [];
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      if (/^\s+$/.test(parts[i])) {
        frag.appendChild(document.createTextNode(" "));
      } else {
        var s = document.createElement("span");
        s.setAttribute("aria-hidden", "true");
        s.textContent = parts[i];
        frag.appendChild(s);
        spans.push(s);
      }
    }
    el.appendChild(frag);
    return spans;
  }

  function buildTextFill(el, reduce) {
    if (el.__sfxBuilt) return;
    el.__sfxBuilt = true;

    var spans = splitWords(el);
    if (!spans.length) return;
    if (reduce) return; /* final state = zaten dolu */

    var base = Math.max(0, Math.min(1, num(el.getAttribute("data-tf-base"), 0.18)));
    var overlap = Math.max(0, Math.min(1, num(el.getAttribute("data-tf-stagger"), 0.6)));

    /* Toplam süre 1 birim; kelimeler okunma sırasıyla, overlap oranında
       iç içe geçerek dolar. */
    var each = 1 / (1 + (spans.length - 1) * overlap);

    gsap.fromTo(spans,
      { opacity: base },
      {
        opacity: 1,
        ease: "none",
        duration: each,
        stagger: each * overlap,
        scrollTrigger: {
          trigger: el,
          start: str(el, "data-tf-start", "top 85%"),
          end: str(el, "data-tf-end", "top 35%"),
          scrub: scrubVal(el, "data-tf-scrub")
        }
      });
  }

  /* ── 2. Scale in ──────────────────────────────────────────────── */

  function buildScaleIn(el, reduce) {
    if (el.__sfxBuilt) return;
    el.__sfxBuilt = true;
    if (reduce) return; /* final state = orijinal boyut */

    var scale = num(el.getAttribute("data-si-scale"), 0.8);
    var animHeight = flag(el, "data-si-height", false);
    var fade = flag(el, "data-si-fade", false);

    var from = { scale: scale };
    var to = {
      scale: 1,
      ease: "none",
      transformOrigin: str(el, "data-si-origin", "center top"),
      scrollTrigger: {
        trigger: el,
        start: str(el, "data-si-start", "top 90%"),
        end: str(el, "data-si-end", "top 40%"),
        scrub: scrubVal(el, "data-si-scrub"),
        invalidateOnRefresh: true
      }
    };

    if (fade) { from.opacity = 0; to.opacity = 1; }

    if (animHeight) {
      /* Doğal yükseklik her refresh'te yeniden ölçülür (responsive).
         Ölçüm için height'ı geçici olarak temizleriz. */
      from.height = function () {
        el.style.height = "";
        return el.offsetHeight * Math.min(scale, 1);
      };
      to.height = function () {
        var h = el.style.height;
        el.style.height = "";
        var natural = el.offsetHeight;
        el.style.height = h;
        return natural;
      };
      to.scrollTrigger.onLeave = function () { el.style.height = ""; };
    }

    gsap.fromTo(el, from, to);
  }

  /* ── init ─────────────────────────────────────────────────────── */

  function initScrollFx() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    var reduce =
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Tek sorgu = belge sırası → ScrollTrigger'lar sayfa düzeninde
       kurulur, refresh sırası doğru olur. */
    var els = document.querySelectorAll("[data-text-fill], [data-scale-in]");
    for (var i = 0; i < els.length; i++) {
      if (els[i].hasAttribute("data-text-fill")) buildTextFill(els[i], reduce);
      else buildScaleIn(els[i], reduce);
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollFx = initScrollFx;
})(window);
