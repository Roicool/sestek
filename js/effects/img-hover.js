/*!
 * img-hover.js v1.3.2
 * Premium image hover for cards & blog links — NOT a plain CSS scale.
 * Four coordinated layers, all GSAP-scrubbed:
 *   • parallax zoom — the image eases up to `zoom` AND drifts toward the
 *     cursor inside its cropped frame (quickTo-smoothed, inertia feel)
 *   • subtle 3D tilt — the frame leans a few degrees after the pointer
 *     (perspective 800px), like a card catching the light
 *   • one-shot light sweep — a soft diagonal sheen sweeps across the image
 *     once per hover-in
 *   • tonal lift — the image rests slightly desaturated/dimmed and lifts to
 *     full colour on hover (editorial feel)
 *
 * v1.3.2: saha geri bildirimi — varsayılan zoom 1.06 → 1.04 (bazı
 * fotoğraflar bozuk/gerilmiş görünüyordu); sheen (beyaz ışık süpürmesi)
 * artık varsayılan KAPALI — isteyen data-img-hover-shine="true" ile açar.
 *
 * v1.3.1: wrapper içinde birden fazla görsel varsa doğru olanı seçmek
 * için data-img-hover-target eklendi — bu attribute'u taşıyan <img>/<video>
 * hedeflenir; yoksa ilk <img>/<video> alınır (v1.0 davranışı).
 *
 * v1.3.0: v1.0.0 tabanı. Tek düzeltme — aynı <a> içinde birden fazla
 * [data-img-hover] varsa her frame kendi üzerinden dinler (v1.0'da hepsi
 * aynı linke bağlanıp birlikte tetikleniyordu). Tek görselli linklerde
 * davranış v1.0 ile birebir aynı: kartın herhangi bir yerine gelince
 * görsel canlanır.
 *
 * Requires: gsap (global)
 * CSS     : css/effects/img-hover.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────
 *
 *   <a href="/blog/post" class="blog-card">
 *     <div data-img-hover class="blog-card__thumb">
 *       <img src="cover.jpg" alt="">
 *     </div>
 *     <h3>Post title</h3>
 *   </a>
 *
 * Hover, [data-img-hover]'ın en yakın <a> atası üzerinden dinlenir (yoksa
 * elementin kendisi) — kartın herhangi bir yerine gelinca görsel canlanır.
 * Aynı <a> birden fazla frame içeriyorsa her frame kendini dinler.
 * The sheen <span> is injected automatically.
 *
 * ── Attributes (on [data-img-hover]) ─────────────────────────────
 *
 *   data-img-hover              required
 *   data-img-hover-zoom="1.04"  max scale (default 1.04)
 *   data-img-hover-tilt="3.5"   max tilt in degrees (default 3.5, 0 = off)
 *   data-img-hover-pan="2.5"    max cursor-drift as % of frame (default 2.5,
 *                               0 = off; auto-clamped so edges never show)
 *   data-img-hover-shine="true"   enable the light sweep (default OFF)
 *   data-img-hover-tone="false"   disable the tonal lift
 *
 * ── Attribute (on the <img>/<video> itself, optional) ────────────
 *
 *   data-img-hover-target       wrapper içinde birden fazla görsel varsa
 *                               animasyonun hedefi olarak BUNU seç
 *
 * Touch devices (no hover) are skipped entirely; prefers-reduced-motion
 * keeps the resting tone but disables all motion.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var TONE_REST = "saturate(0.85) brightness(0.97)";
  var TONE_LIVE = "saturate(1) brightness(1)";

  /* ══ GEÇİCİ DEBUG — sorun çözülünce kaldırılacak ══ */
  var DEBUG = true;
  function dbg() {
    if (!DEBUG || !global.console) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[ImgHover DEBUG]");
    console.log.apply(console, args);
  }
  /* ══ /GEÇİCİ DEBUG ══ */

  function num(el, attr, fallback) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }

  function off(el, attr) {
    return el.getAttribute(attr) === "false";
  }

  function bind(frame, reduce, index) {
    if (frame._imgHoverInit) {
      dbg("frame#" + index, "SKIP — zaten init edilmiş");
      return;
    }
    frame._imgHoverInit = true;

    /* v1.3.1: birden fazla görsel varsa data-img-hover-target ile elle
     * seçilir; yoksa ilk <img>/<video> (v1.0 davranışı). */
    var img =
      frame.querySelector("img[data-img-hover-target], video[data-img-hover-target]") ||
      frame.querySelector("img, video");
    if (!img) {
      dbg("frame#" + index, "SKIP — içinde <img>/<video> yok", frame);
      return;
    }

    /* v1.3.0 fix: en yakın <a> hover alanıdır — AMA aynı <a> birden fazla
     * frame içeriyorsa v1.0'da hepsi birlikte tetikleniyordu. O durumda
     * her frame kendi üzerinden dinler. */
    var anchor = frame.closest("a");
    var shared =
      anchor && anchor.querySelectorAll("[data-img-hover]").length > 1;
    var trigger = anchor && !shared ? anchor : frame;

    dbg("frame#" + index, "bind OK", {
      trigger: trigger === frame ? "frame (kendisi)" : "<a> atası",
      sharedAnchor: !!shared,
      img: img.tagName.toLowerCase(),
      imgSrc: (img.currentSrc || img.src || "").split("/").pop() || "(yok)",
      explicitTarget: img.hasAttribute("data-img-hover-target"),
      imgCountInFrame: frame.querySelectorAll("img, video").length,
      class: frame.className || "(yok)"
    });

    var zoom  = Math.max(1, num(frame, "data-img-hover-zoom", 1.04));
    var tilt  = Math.max(0, num(frame, "data-img-hover-tilt", 3.5));
    var pan   = Math.max(0, num(frame, "data-img-hover-pan", 2.5));
    /* v1.3.2: sheen varsayılan kapalı — beyaz bant bazı görsellerde çizgi
     * gibi görünüyordu. data-img-hover-shine="true" ile açılır. */
    var shine = frame.getAttribute("data-img-hover-shine") === "true";
    var tone  = !off(frame, "data-img-hover-tone");

    /* Pan asla kırpılmış kenarı açığa çıkarmasın: zoom'un sağladığı taşma
     * payının %90'ı ile sınırla. (scale 1.06 → her kenarda %3 pay) */
    var maxPan = (zoom - 1) * 50 * 0.9;
    if (pan > maxPan) pan = maxPan;

    var sheen = null;
    if (shine) {
      sheen = global.document.createElement("span");
      sheen.className = "img-hover__sheen";
      frame.appendChild(sheen);
    }

    if (tone) gsap.set(img, { filter: TONE_REST });
    if (reduce) return; /* resting tone stays; no motion for reduced-motion */

    gsap.set(trigger, { perspective: 800 });
    gsap.set(frame, { transformOrigin: "50% 50%" });
    gsap.set(img, { scale: 1, xPercent: 0, yPercent: 0, transformOrigin: "50% 50%" });

    var panX = gsap.quickTo(img, "xPercent", { duration: 0.6, ease: "power3" });
    var panY = gsap.quickTo(img, "yPercent", { duration: 0.6, ease: "power3" });
    var rotX = tilt ? gsap.quickTo(frame, "rotationX", { duration: 0.7, ease: "power3" }) : null;
    var rotY = tilt ? gsap.quickTo(frame, "rotationY", { duration: 0.7, ease: "power3" }) : null;

    function enter() {
      dbg("frame#" + index, "ENTER");
      gsap.to(img, { scale: zoom, duration: 0.9, ease: "expo.out", overwrite: "auto" });
      if (tone) gsap.to(img, { filter: TONE_LIVE, duration: 0.55, ease: "power2.out" });
      if (sheen) {
        gsap.fromTo(
          sheen,
          { xPercent: -130, opacity: 1 },
          { xPercent: 130, duration: 0.9, ease: "power2.inOut", delay: 0.05, overwrite: "auto" }
        );
      }
    }

    function move(e) {
      var r = frame.getBoundingClientRect();
      if (!r.width || !r.height) return;
      var nx = (e.clientX - r.left) / r.width - 0.5;  /* -0.5 … 0.5 */
      var ny = (e.clientY - r.top) / r.height - 0.5;
      /* görsel cursor'a doğru süzülür — derinlik hissi */
      panX(nx * 2 * pan);
      panY(ny * 2 * pan);
      if (rotY) rotY(nx * 2 * tilt);
      if (rotX) rotX(ny * -2 * tilt);
    }

    function leave() {
      dbg("frame#" + index, "LEAVE");
      gsap.to(img, { scale: 1, duration: 0.8, ease: "expo.out", overwrite: "auto" });
      if (tone) gsap.to(img, { filter: TONE_REST, duration: 0.55, ease: "power2.out" });
      panX(0);
      panY(0);
      if (rotX) rotX(0);
      if (rotY) rotY(0);
    }

    trigger.addEventListener("mouseenter", enter);
    trigger.addEventListener("mousemove", move);
    trigger.addEventListener("mouseleave", leave);
  }

  /**
   * Wires every matched frame with the premium hover behaviour.
   * @param {string} [selector="[data-img-hover]"]
   */
  function initImgHover(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek ImgHover] GSAP required.");
      return;
    }
    var hoverOk = !global.matchMedia ||
      global.matchMedia("(hover: hover)").matches;
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var frames = global.document.querySelectorAll(selector || "[data-img-hover]");

    dbg("init v1.3.2", {
      frames: frames.length,
      "hover:hover": hoverOk,
      reducedMotion: !!reduce
    });

    /* Touch-only cihazlarda hover yok — hiç bağlanma */
    if (!hoverOk) {
      dbg("İPTAL — (hover: hover) false (dokunmatik cihaz?)");
      return;
    }

    Array.prototype.forEach.call(frames, function (f, i) { bind(f, reduce, i); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initImgHover = initImgHover;

})(typeof window !== "undefined" ? window : this);
