/*!
 * img-hover.js v1.2.1
 *
 * Changelog
 * v1.2.1 — background-image çocuk elementte de yakalanır: görsel çoğu
 *   Webflow yapısında [data-img-hover]'ın KENDİSİNDE değil, içindeki bir
 *   div'in background'undadır. Artık önce frame, sonra çocuklar taranır.
 * v1.2.0 — iki gerçek sahada teşhis edilen kusur:
 *   • (hover: hover) → (any-hover: hover): (hover) BİRİNCİL girdiye bakar,
 *     fareli dokunmatik laptop'ları "touch" sanıp efekti HİÇ bağlamıyordu.
 *     any-hover, herhangi bir girdi hover yapabiliyorsa çalışır.
 *   • background-image desteği: [data-img-hover] içinde <img>/<video> yoksa
 *     ama elementin kendisi bir arka plan görseli ise, onu kopyalayan bir
 *     katman enjekte edilip o zoom'lanır (Webflow "background image"
 *     bölümleri artık çalışıyor).
 * Premium image hover for cards & blog links — NOT a plain CSS scale.
 * Four coordinated layers, all GSAP-scrubbed:
 *   • parallax zoom — the image eases up to `zoom` AND drifts toward the
 *     cursor inside its cropped frame (quickTo-smoothed, inertia feel)
 *   • subtle 3D tilt — the frame leans a few degrees after the pointer
 *     (self-contained transformPerspective), like a card catching the light
 *   • one-shot light sweep — a soft diagonal sheen sweeps across the image
 *     once per hover-in
 *   • tonal lift — the image rests slightly desaturated/dimmed and lifts to
 *     full colour on hover (editorial feel)
 *
 * Changelog
 * v1.1.0 — her görsel artık BAĞIMSIZ ve LİNK GEREKTİRMEZ. Varsayılan tetik
 *          artık [data-img-hover] elementinin kendisidir — v1.0'daki
 *          closest("a") davranışı, tek bir <a> içinde birden fazla görsel
 *          olduğunda (Webflow'da sık) hepsini birden tetikliyordu. Tüm
 *          kart/link üzerinden tetikleme hâlâ mümkün:
 *          data-img-hover-trigger="link"  → en yakın <a>
 *          data-img-hover-trigger=".card" → en yakın eşleşen ata (selector)
 *          Tilt artık transformPerspective ile kendi kendine yeter (parent'a
 *          perspective bağımlılığı yok).
 *
 * Requires: gsap (global)
 * CSS     : css/effects/img-hover.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────
 *
 *   <div data-img-hover class="thumb">      ← link ŞART DEĞİL
 *     <img src="cover.jpg" alt="">
 *   </div>
 *
 * Tüm kartın (başlık dahil) tetiklemesini istersen kartın kendi
 * sarmalayıcısını işaret et — paylaşılan bir liste linkini DEĞİL:
 *
 *   <a href="/blog/post" class="blog-card">
 *     <div data-img-hover data-img-hover-trigger="link" class="thumb">
 *       <img src="cover.jpg" alt="">
 *     </div>
 *     <h3>Post title</h3>
 *   </a>
 *
 * The sheen <span> is injected automatically.
 *
 * ── Attributes (on [data-img-hover]) ─────────────────────────────
 *
 *   data-img-hover              required
 *   data-img-hover-trigger      hover'ı dinleyecek eleman:
 *                               yok (default) → çerçevenin KENDİSİ (bağımsız)
 *                               "link"         → en yakın <a> atası
 *                               "<selector>"   → en yakın eşleşen ata
 *                                                (örn. ".blog-card")
 *   data-img-hover-zoom="1.06"  max scale (default 1.06)
 *   data-img-hover-tilt="3.5"   max tilt in degrees (default 3.5, 0 = off)
 *   data-img-hover-pan="2.5"    max cursor-drift as % of frame (default 2.5,
 *                               0 = off; auto-clamped so edges never show)
 *   data-img-hover-shine="false"  disable the light sweep
 *   data-img-hover-tone="false"   disable the tonal lift
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

  function num(el, attr, fallback) {
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }

  function off(el, attr) {
    return el.getAttribute(attr) === "false";
  }

  /** Resolve the element that listens for hover, per data-img-hover-trigger. */
  function resolveTrigger(frame) {
    var t = frame.getAttribute("data-img-hover-trigger");
    if (!t) return frame;                         // default: bağımsız çerçeve
    if (t === "link") return frame.closest("a") || frame;
    try {
      return frame.closest(t) || frame;           // selector (ör. ".blog-card")
    } catch (e) {
      return frame;                               // geçersiz selector → çerçeve
    }
  }

  function hasBg(el) {
    var v = global.getComputedStyle(el).backgroundImage;
    return v && v !== "none" && v.indexOf("url(") !== -1;
  }

  /* Zoom hedefini çöz (öncelik sırası):
   *   1. içindeki <img>/<video>
   *   2. frame'in KENDİSİ background-image ise → kopyalayan katman enjekte et
   *   3. bir ÇOCUK elementte background-image varsa → o elementi doğrudan
   *      zoom hedefi yap (Webflow'da görsel çoğu zaman iç bir div'in
   *      background'udur; frame sadece sarmalayıcıdır)
   * Hiçbiri yoksa null → efekt bağlanmaz. */
  function resolveTarget(frame) {
    var media = frame.querySelector("img, video");
    if (media) return media;

    if (hasBg(frame)) {
      var cs = global.getComputedStyle(frame);
      var layer = global.document.createElement("div");
      layer.className = "img-hover__bg";
      layer.style.backgroundImage = cs.backgroundImage;
      layer.style.backgroundSize =
        cs.backgroundSize && cs.backgroundSize !== "auto" ? cs.backgroundSize : "cover";
      layer.style.backgroundPosition = cs.backgroundPosition || "center";
      layer.style.backgroundRepeat = "no-repeat";
      /* Frame'in kendi arka planını gizle — çift boyama/kenar sızması olmasın */
      frame.style.backgroundImage = "none";
      frame.insertBefore(layer, frame.firstChild);
      return layer;
    }

    /* Çocuklarda background-image ara — frame'i kaplayan ilk uygun eleman */
    var kids = frame.querySelectorAll("*");
    for (var i = 0; i < kids.length; i++) {
      if (hasBg(kids[i])) return kids[i];
    }
    return null;
  }

  function bind(frame, reduce) {
    if (frame._imgHoverInit) return;
    frame._imgHoverInit = true;

    var img = resolveTarget(frame);
    if (!img) return; /* ne <img>/<video> ne de background-image → atla */

    var trigger = resolveTrigger(frame);
    var zoom  = Math.max(1, num(frame, "data-img-hover-zoom", 1.06));
    var tilt  = Math.max(0, num(frame, "data-img-hover-tilt", 3.5));
    var pan   = Math.max(0, num(frame, "data-img-hover-pan", 2.5));
    var shine = !off(frame, "data-img-hover-shine");
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

    /* Tilt kendi kendine yeter: perspective, frame'in KENDİ transform'una
     * gömülü (transformPerspective) — parent'a perspective set etmeye gerek
     * yok, bu yüzden trigger başka bir eleman olsa bile tilt doğru görünür. */
    gsap.set(frame, { transformPerspective: 800, transformOrigin: "50% 50%" });
    gsap.set(img, { scale: 1, xPercent: 0, yPercent: 0, transformOrigin: "50% 50%" });

    var panX = gsap.quickTo(img, "xPercent", { duration: 0.6, ease: "power3" });
    var panY = gsap.quickTo(img, "yPercent", { duration: 0.6, ease: "power3" });
    var rotX = tilt ? gsap.quickTo(frame, "rotationX", { duration: 0.7, ease: "power3" }) : null;
    var rotY = tilt ? gsap.quickTo(frame, "rotationY", { duration: 0.7, ease: "power3" }) : null;

    /* Rect'i hover başında ölç (tilt henüz uygulanmadan, temiz kutu) ve
     * scroll/resize'da tazele — her mousemove'da rotasyonlu kutuyu okumak
     * yerine, böylece pan hesabı titremez. */
    var rect = null;
    function measure() { rect = frame.getBoundingClientRect(); }

    function enter() {
      measure();
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
      if (!rect || !rect.width || !rect.height) measure();
      if (!rect.width || !rect.height) return;
      var nx = (e.clientX - rect.left) / rect.width - 0.5;  /* -0.5 … 0.5 */
      var ny = (e.clientY - rect.top) / rect.height - 0.5;
      /* görsel cursor'a doğru süzülür — derinlik hissi */
      panX(nx * 2 * pan);
      panY(ny * 2 * pan);
      if (rotY) rotY(nx * 2 * tilt);
      if (rotX) rotX(ny * -2 * tilt);
    }

    function leave() {
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
    global.addEventListener("scroll", measure, { passive: true });
    global.addEventListener("resize", measure);
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
    /* Fareyle hover YAPILAMAYAN cihazlarda (saf dokunmatik) bağlanma.
     * (any-hover: hover) kullanılır — (hover: hover) BİRİNCİL girdiye bakar ve
     * fareli dokunmatik laptop'ları yanlışlıkla dışlar; any-hover ise HERHANGİ
     * bir girdi hover yapabiliyorsa true döner. */
    var mm = global.matchMedia;
    var canHover = mm
      ? (mm("(any-hover: hover)").matches ||
         /* çok eski tarayıcı any-hover bilmiyorsa hover'a düş */
         (!mm("(any-hover: hover)").media && mm("(hover: hover)").matches))
      : true;
    if (!canHover) return;
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var frames = global.document.querySelectorAll(selector || "[data-img-hover]");
    Array.prototype.forEach.call(frames, function (f) { bind(f, reduce); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initImgHover = initImgHover;

})(typeof window !== "undefined" ? window : this);
