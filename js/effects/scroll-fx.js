/*!
 * scroll-fx.js v1.2.0
 *
 * FOUC guard (optional but recommended): add to the page <head>
 *   <style>html.w-mod-js [data-text-fill], html.w-mod-js [data-scale-in] { opacity: 0; }</style>
 * so elements don't flash in their final state before this script runs;
 * init reveals each element the moment its start state is applied.
 * (w-mod-js = Webflow's "JS available" class → no-JS visitors still see content.)
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
 *      Images/sections enter the viewport slightly scaled + lowered and
 *      settle into place with a power2.out ease (fast rise, soft landing).
 *      If the element wraps a single img/video, the media counter-zooms
 *      (outside settles while the inside pulls back) — automatic.
 *      Optionally the element's HEIGHT animates to natural value too.
 *      The bare attribute needs NO other configuration.
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
 * Attributes — [data-scale-in] (all optional; defaults are the look):
 *   data-si-scale="0.94"       starting scale.
 *   data-si-delay="0.3"        hold fraction at the start of the scroll
 *                              range (0.3 = motion starts 30% in) — give
 *                              siblings 0 / 0.15 / 0.3 for a stagger.
 *   data-si-y="48"             starting rise offset in px.
 *   data-si-fade="false"       disable the opacity fade (default: on).
 *   data-si-zoom="false"       disable auto media counter-zoom; "true"
 *                              forces it even for non-single-media boxes.
 *   data-si-zoom-scale="1.15"  inner media starting scale.
 *   data-si-height="true"      also animate height from scaled → natural
 *                              (pushes surrounding layout — that's the point).
 *   data-si-origin="center bottom"  transform-origin.
 *   data-si-start="top 92%"    ScrollTrigger start.
 *   data-si-end="top 42%"      ScrollTrigger end.
 *   data-si-scrub="1"          scrub smoothing in seconds ("true" = direct).
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

  function scrubVal(el, name, fallback) {
    var v = el.getAttribute(name);
    if (v === "true") return true;
    if (v === null || v === "") return fallback;
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

  /* FOUC koruması: sayfaya
       html.w-mod-js [data-text-fill], html.w-mod-js [data-scale-in] { opacity: 0; }
     eklersen, ilk boyamada "dolu başlık / tam boy görsel" bir an görünüp
     sonra başlangıç haline zıplamaz. init her elemanı burada geri açar;
     GSAP'ın kendi başlangıç değerleri (dim/scale) aynı karede uygulanır. */
  function unveil(el) {
    el.style.opacity = "1"; /* gizleme kuralını ezer; GSAP gerekirse üstüne yazar */
  }

  function buildTextFill(el, reduce) {
    if (el.__sfxBuilt) return;
    el.__sfxBuilt = true;

    var spans = splitWords(el);
    unveil(el);
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
          scrub: scrubVal(el, "data-tf-scrub", 0.5)
        }
      });
  }

  /* ── 2. Scale in ──────────────────────────────────────────────── */

  function buildScaleIn(el, reduce) {
    if (el.__sfxBuilt) return;
    el.__sfxBuilt = true;
    unveil(el);
    if (reduce) return; /* final state = orijinal boyut */

    var scale = num(el.getAttribute("data-si-scale"), 0.94);
    var rise = num(el.getAttribute("data-si-y"), 48);
    var fade = flag(el, "data-si-fade", true);
    var animHeight = flag(el, "data-si-height", false);

    /* İç parallax zoom: kutunun tek çocuğu bir medya elemanıysa (img/
       video/picture) dışarısı otururken içi hafifçe geri çekilir —
       "premium reveal" hissinin asıl kaynağı. data-si-zoom ile zorla
       aç/kapat. Metin içeren section'larda kendiliğinden devreye girmez. */
    var media = null;
    if (!/^(IMG|VIDEO)$/.test(el.tagName) && el.children.length === 1 &&
        /^(IMG|VIDEO|PICTURE)$/.test(el.children[0].tagName)) {
      media = el.children[0];
    }
    var zoom = flag(el, "data-si-zoom", !!media)
      ? (media || el.querySelector("img, video, picture"))
      : null;

    var st = {
      trigger: el,
      start: str(el, "data-si-start", "top 92%"),
      end: str(el, "data-si-end", "top 42%"),
      scrub: scrubVal(el, "data-si-scrub", 1),
      invalidateOnRefresh: true
    };
    if (animHeight) {
      /* Bittikten sonra inline height'ı bırak → tekrar auto (responsive). */
      st.onLeave = function () { el.style.height = ""; };
    }

    /* data-si-delay: scroll aralığının başında bekleme payı (oran).
       0.3 → aralığın ilk %30'unda eleman başlangıç halinde bekler,
       hareket sonra başlar. Yan yana kartları 0 / 0.15 / 0.3 vererek
       merdiven gibi geciktirebilirsin. Scrub olduğu için geri sarma
       aynen çalışır. */
    var delay = Math.max(0, num(el.getAttribute("data-si-delay"), 0));

    var tl = gsap.timeline({
      /* power2.out: hareketin çoğu erken biter, sona doğru yumuşakça
         "yerine oturur" — scrub'la birlikte lineer çiğliği kırar. */
      defaults: { ease: "power2.out", duration: 1 },
      scrollTrigger: st
    });

    var from = { scale: scale, y: rise };
    var to = {
      scale: 1,
      y: 0,
      transformOrigin: str(el, "data-si-origin", "center bottom")
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
    }

    tl.fromTo(el, from, to, delay);

    if (zoom) {
      el.style.overflow = "hidden";
      tl.fromTo(zoom,
        { scale: num(el.getAttribute("data-si-zoom-scale"), 1.15) },
        { scale: 1, transformOrigin: "center center" }, delay);
    }
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
