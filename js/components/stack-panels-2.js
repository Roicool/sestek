/*!
 * stack-panels-2.js v2.1.0
 *
 * Changelog
 * v2.1.0 — GERÇEK 3D derinlik: RECEDE artık düz scale değil, panelin kendi
 *          perspektifinde translateZ ile ekranın İÇİNE çekilme (+ hafif
 *          rotateX ile arkaya yatma). VANISH'te panel daha da derine düşerek
 *          buharlaşır — "uzaklaşıp yok olma" hissi. transformPerspective
 *          per-element uygulanır; ancestor'a perspective KOYULMAZ (pin'in
 *          position:fixed'ini kırar — PROJECT.md Kural 3). data-sp-depth="0"
 *          ile v2.0'ın düz scale recede'ine dönülebilir.
 * stack-panels.js'in premium yeniden ele alınışı — AYNI desen (panel pinlenir,
 * sonraki üzerine kayar, alttaki KÜÇÜLÜP KAYBOLUR), AYNI DOM/attribute
 * sözleşmesi ([data-stack-panels] / [data-sp-panel] / [data-sp-inner]) —
 * script URL'ini değiştirmek yeterli, Webflow'da hiçbir şey ellenmiyor.
 * Eski dosya (stack-panels.js) eski sayfalar için olduğu gibi durur.
 *
 * v1'in derdi: dissolve, scale ile AYNI ANDA opacity'yi 0.5'e düşürüyordu —
 * küçülme daha başlamadan panel hayalete dönüyor, "küçülen direkt
 * gözükmüyor"du. v2'nin koreografisi üç net faza ayrılır:
 *
 *   HOLD    — panel ortada, tam okunur (scale 1, opacity 1)
 *   RECEDE  — küçülmenin TAMAMI opacity 1'de, gözle görülür yaşanır:
 *             scale → endScale, üzerine oranla koyulaşan karartma (overlay,
 *             içerik keskin kalır), hafif desatürasyon ve yukarı toplanma.
 *             Geri çekilme hissi şeffaflıktan değil karartmadan gelir.
 *   VANISH  — son çeyrekte kısa ve temiz buharlaşma: opacity → 0 + blur,
 *             minik bir ekstra küçülmeyle. Panel kaybolur — ama artık
 *             kayboluşunu İZLEMİŞ olursun.
 *
 * Ekstra premium katman: GELEN panel 0.98 scale'de süzülür, pin konumuna
 * oturduğu anda 1'e "yerleşir" ve alttakine yumuşak bir temas gölgesi
 *düşürür — katmanlar gerçekten ayrışır.
 *
 * Tall panel fake-scroll, pin-blocker guard'ı, refreshPriority düzeni ve
 * reduced-motion davranışı v1'den aynen taşındı.
 *
 * Requires: gsap + ScrollTrigger (globals), Sestek.util (js/core/utils.js).
 * CSS     : css/components/stack-panels-2.css
 *
 * DOM (v1 ile birebir aynı):
 *   [data-stack-panels]              root (plain wrapper, no pin itself)
 *     [data-sp-panel]                one panel — ALL but the last one pin
 *       [data-sp-inner]              OPTIONAL: viewport'tan uzun içerik için
 *
 * Root attributes (v1'dekiler korunur, yenileri eklendi):
 *   data-sp-hold             dissolve başlamadan tam okunur bekleme oranı
 *                                                              (default 0.4)
 *   data-sp-depth            RECEDE'de panelin ekranın içine çekildiği
 *                            translateZ mesafesi, px — gerçek 3D derinlik
 *                            (default 160; 0 = kapat, düz scale kullanılır)
 *   data-sp-tilt             RECEDE'de arkaya yatma, derece (rotateX)
 *                                                              (default 4)
 *   data-sp-perspective      panelin kendi perspektif derinliği, px
 *                                                              (default 1200)
 *   data-sp-scale            SADECE data-sp-depth="0" iken: RECEDE sonunda
 *                            panelin scale'i                   (default 0.9)
 *   data-sp-fade-portion     VANISH fazının dissolve içindeki payı
 *                                                              (default 0.25)
 *   data-sp-dim              RECEDE sonunda karartma opaklığı  (default 0.35)
 *   data-sp-desat            RECEDE sonunda saturate değeri    (default 0.9,
 *                            1 = off)
 *   data-sp-blur             VANISH'te ulaşılan blur, px       (default 6,
 *                            0 = off)
 *   data-sp-lift             RECEDE boyunca yukarı toplanma, px (default 20)
 *   data-sp-settle           gelen panelin süzülme scale'i     (default 0.98,
 *                            1 = off)
 *   data-sp-shadow           gelen panelin temas gölgesi opaklığı
 *                                                              (default 0.3,
 *                            0 = off)
 *   data-sp-scrub            ScrollTrigger scrub               (default true)
 *   data-sp-refresh-priority-start   v1 ile aynı (PROJECT.md Kural 1)
 *                                                              (default 0)
 *
 * (v1'in data-sp-mid-fade'i bilinçli olarak YOK — erken şeffaflaşma tam da
 * düzeltilen kusurdu.)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function attrNum(el, attr, fallback) {
    if (global.Sestek && Sestek.util && Sestek.util.attrNum) {
      return Sestek.util.attrNum(el, attr, fallback);
    }
    var v = parseFloat(el.getAttribute(attr));
    return isNaN(v) ? fallback : v;
  }
  function prefersReduced() {
    if (global.Sestek && Sestek.util && Sestek.util.prefersReducedMotion) {
      return Sestek.util.prefersReducedMotion();
    }
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function warn(msg, el) {
    if (global.console && global.console.warn) {
      global.console.warn("[Sestek StackPanels2] " + msg, el || "");
    }
  }

  // Pin uses position:fixed — ancestor'da transform/filter/perspective/
  // will-change varsa pin kayar (PROJECT.md Kural 3). Bozuk pinlemektense
  // düz akışa düş.
  function pinBlocker(el, stopAt) {
    for (var p = el.parentElement; p && p !== stopAt; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.filter !== "none" ||
          cs.perspective !== "none" || cs.willChange.indexOf("transform") > -1) return p;
    }
    return null;
  }

  function wire(root) {
    if (root._stackPanelsInit) return;
    root._stackPanelsInit = true;

    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-sp-panel]"));
    if (panels.length < 2) {
      warn("Need at least 2 [data-sp-panel] children (the last one never pins).", root);
      return;
    }

    var holdFrac    = attrNum(root, "data-sp-hold", 0.4);
    var endScale    = attrNum(root, "data-sp-scale", 0.9);
    var depth       = attrNum(root, "data-sp-depth", 160);
    var tilt        = attrNum(root, "data-sp-tilt", 4);
    var persp       = attrNum(root, "data-sp-perspective", 1200);
    var fadePortion = attrNum(root, "data-sp-fade-portion", 0.25);
    var dimMax      = attrNum(root, "data-sp-dim", 0.35);
    var desat       = attrNum(root, "data-sp-desat", 0.9);
    var blurPx      = attrNum(root, "data-sp-blur", 6);
    var liftPx      = attrNum(root, "data-sp-lift", 20);
    var settle      = attrNum(root, "data-sp-settle", 0.98);
    var shadowOp    = attrNum(root, "data-sp-shadow", 0.3);
    var scrubA      = root.getAttribute("data-sp-scrub");
    var scrub       = scrubA === "false" ? false : (scrubA ? (parseFloat(scrubA) || true) : true);
    var priorityStart = attrNum(root, "data-sp-refresh-priority-start", 0);

    if (prefersReduced()) {
      root.setAttribute("data-sp-reduced", "");
      return; // düz akış — CSS halleder
    }

    var blocker = pinBlocker(root, document.body);
    if (blocker) {
      warn("Pin DISABLED — ancestor has transform/filter/perspective/will-change; " +
           "falling back to plain stacked-in-flow panels (PROJECT.md Kural 3).", blocker);
      root.setAttribute("data-sp-reduced", "");
      return;
    }

    var triggers = [];

    // ── Gelen panelin settle + temas gölgesi ──────────────────────
    // İlk panel hariç her panel, viewport'a girişinden pin konumuna (center
    // center) oturana dek hafifçe küçük süzülür ve yerleşir; üst kenarından
    // alttaki panele düşen gölge yaklaştıkça koyulaşır.
    panels.forEach(function (panel, i) {
      if (i === 0) return;
      if (settle >= 1 && shadowOp <= 0) return;

      var shadowFrom = "0px -16px 40px -16px rgba(10, 10, 14, 0)";
      var shadowTo   = "0px -16px 40px -16px rgba(10, 10, 14, " + shadowOp + ")";

      var arrive = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          start: "top bottom",
          end: "center center",
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: priorityStart - i,
        },
      });
      if (settle < 1) {
        arrive.fromTo(panel, { scale: settle },
          { scale: 1, ease: "none", force3D: true, immediateRender: true }, 0);
      }
      if (shadowOp > 0) {
        arrive.fromTo(panel, { boxShadow: shadowFrom },
          { boxShadow: shadowTo, ease: "none", immediateRender: true }, 0);
      }
      triggers.push(arrive);
    });

    // ── Pin + üç fazlı dissolve ───────────────────────────────────
    panels.slice(0, -1).forEach(function (panel, i) {
      var inner   = panel.querySelector("[data-sp-inner]");
      var windowH = window.innerHeight;
      var innerH  = inner ? inner.offsetHeight : panel.offsetHeight;
      var diff    = innerH - windowH;
      var fakeRatio = diff > 0 ? diff / (diff + windowH) : 0;

      if (fakeRatio) {
        panel.style.marginBottom = innerH * fakeRatio + "px";
      }

      // Karartma katmanı — RECEDE'in "geri çekilme" hissi buradan gelir,
      // şeffaflıktan değil. Overlay olduğu için içerik keskin kalır.
      var dim = document.createElement("div");
      dim.className = "stack-panels__dim";
      panel.appendChild(dim);

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          start: fakeRatio ? "bottom bottom" : "center center",
          end: function () {
            return fakeRatio ? "+=" + inner.offsetHeight : "bottom top";
          },
          pin: panel,
          pinSpacing: false,
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: priorityStart - i,
        },
      });

      if (fakeRatio) {
        tl.to(inner, {
          yPercent: -100,
          y: windowH,
          ease: "none",
          duration: 1 / (1 - fakeRatio) - 1,
        });
      }

      // HOLD — panel tam okunur
      if (!fakeRatio && holdFrac > 0 && holdFrac < 1) {
        tl.to({}, { duration: (holdFrac / (1 - holdFrac)), ease: "none" });
      }

      // RECEDE — geri çekilmenin tamamı opacity 1'de, görünür.
      // depth > 0 (varsayılan): panel KENDİ perspektifinde translateZ ile
      // ekranın içine çekilir + hafif rotateX ile arkaya yatar — gerçek 3D
      // uzaklaşma. depth = 0: v2.0'ın düz scale recede'i.
      var recedeDur = 1 - fadePortion;
      var recedeFrom = { y: 0 };
      var recedeTo = {
        y: -liftPx,
        duration: recedeDur,
        ease: "none",
        force3D: true,
        immediateRender: false,
      };
      if (depth > 0) {
        recedeFrom.z = 0;
        recedeFrom.rotateX = 0;
        recedeFrom.transformPerspective = persp;
        recedeTo.z = -depth;
        recedeTo.rotateX = tilt;
        recedeTo.transformPerspective = persp;
      } else {
        recedeFrom.scale = 1;
        recedeTo.scale = endScale;
      }
      if (desat < 1) {
        recedeFrom.filter = "saturate(1) blur(0px)";
        recedeTo.filter = "saturate(" + desat + ") blur(0px)";
      }
      tl.fromTo(panel, recedeFrom, recedeTo);
      tl.to(dim, { opacity: dimMax, duration: recedeDur, ease: "none" }, "<");

      // VANISH — panel daha da derine düşerek buharlaşır
      var vanish = {
        opacity: 0,
        duration: fadePortion,
        ease: "none",
      };
      if (depth > 0) {
        vanish.z = -depth * 1.6;
        vanish.rotateX = tilt * 1.5;
      } else {
        vanish.scale = endScale - 0.03;
      }
      if (blurPx > 0) {
        vanish.filter = "saturate(" + (desat < 1 ? desat : 1) + ") blur(" + blurPx + "px)";
      }
      tl.to(panel, vanish);

      triggers.push(tl);
    });

    root._stackPanelsDestroy = function () {
      triggers.forEach(function (tl) {
        tl.scrollTrigger && tl.scrollTrigger.kill();
        tl.kill();
      });
      gsap.set(panels, { clearProps: "all" });
    };
  }

  /** Initialise every [data-stack-panels] on the page. */
  function initStackPanels(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StackPanels2] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    var roots = document.querySelectorAll(selector || "[data-stack-panels]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStackPanels = initStackPanels;

})(typeof window !== "undefined" ? window : this);
