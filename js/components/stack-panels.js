/*!
 * stack-panels.js v1.3.0
 * v1.3.0 — SAĞLAMLAŞTIRMA (zıplama/atlama vakaları):
 * · KRİTİK: ScrollTrigger her pinli paneli init anında bir "pin-spacer"
 *   div'ine sarar — o andan itibaren CSS'teki
 *   [data-sp-panel] ~ [data-sp-panel] { z-index:2 } kardeş seçicisi HİÇBİR
 *   panele eşleşmez (paneller artık kardeş değil, her biri kendi spacer'ının
 *   tek çocuğu). Katmanlama DOM boyama sırasının şansına kalıyordu: son kart
 *   girerken arkaya giden kartın ÖNE boyanması / yukarı scroll'da arkadaki
 *   kartın "zıplayarak" belirmesi bunun belirtisi. z-index artık JS'ten her
 *   panele INLINE yazılır (sıra = DOM sırası, sonraki üstte) — spacer
 *   sarmalamasından etkilenmez. Var olan inline z-index'e dokunulmaz.
 * · anticipatePin BİLE BİLE YOK: denendi, sıçramalı scroll girdisinde
 *   (trackpad flick, sentetik scroll) pin'i erken kurup panelin merkeze
 *   40px'e varan SIÇRAMASINA yol açtığı ölçüldü — çözdüğünden büyük atlama
 *   yaratıyor, ekleme.
 * · Tall panel fake-scroll tween'inin y değeri artık function-based: viewport
 *   yüksekliği değişince (mobil adres çubuğu, resize) refresh'te taze
 *   window.innerHeight ile yeniden hesaplanır — bayat mesafe kaynaklı
 *   içerik zıplaması kalmaz (invalidateOnRefresh zaten açıktı).
 * v1.2.1 — KRİTİK: [data-sp-inner]'sız bir panel viewport'tan uzunsa init
 * TypeError ile çöküyordu (fake-scroll marjı null inner'dan offsetHeight
 * okuyordu) → section'ın TÜM pinleri sessizce yok oluyordu. Panel yüksek
 * ekranda sığdığı için hata sadece kısa ekranlarda görünüyordu ("bazen
 * kurulmuyor" vakasının gerçek kök nedeni). Artık inner yoksa fake-scroll
 * atlanır, panel normal pinlenir ve konsola yol gösteren bir uyarı düşer.
 * v1.2.0 — pinBlocker artık kalıcı pes etmiyor: init anında bir ata elemanda
 * süren giriş/reveal animasyonunun bıraktığı transform, pin'i SONSUZA DEK
 * kapatıyordu ("hızlı makinede kuruluyor, yavaşta bazen kurulmuyor" vakası).
 * Engel şimdi 1.5sn aralıklı probe'larla izlenir: temizlenirse pinler kurulur
 * ve guard'lı refresh çağrılır; ~12sn sonunda hâlâ duruyorsa gerçek engel
 * sayılır ve düz akış fallback'inde kalınır.
 * v1.1.0 — geç büyüyen içerik sağlamlığı: tall panellerin fake-scroll marjı
 * artık her ScrollTrigger refresh'inin ölçüm ÖNCESİNDE (refreshInit) taze
 * içerik boyundan yeniden yazılır — font/görsel geç gelince marj bayat
 * kalmıyor. (İçeriği sonradan viewport'u AŞAN normal panel yapısal olarak
 * yeniden kurulmaz — panel boylarını baştan 100svh+ tutun.)
 * "Stacking panels" scrollytelling: each panel (but the last) pins in place
 * with pinSpacing:false, then — as you keep scrolling and the NEXT panel
 * slides up over it — scales down and fades away, so panels visually stack
 * and dissolve one into the next (the classic GSAP "stacking cards" pattern).
 *
 * Tall panels (content taller than the viewport) get a "fake scroll" phase
 * first: the inner content translates up to reveal the rest before the
 * scale/fade kicks in, so nothing is skipped.
 *
 * IMPORTANT: each panel should be at least one viewport tall (the effect pins
 * a full-screen panel and dissolves it as the next covers it — that's the
 * nature of it). Give [data-sp-panel] min-height: 100svh in the Designer (or
 * whatever full-screen value you use). The pin starts when the panel fills the
 * screen ("bottom bottom") and releases as the next panel covers it.
 *
 * This is a SEPARATE component from pin-slider.js (horizontal slide) and
 * scroll-stack.js (list + receding card deck) — different visual, its own
 * DOM/attributes. Do not mix them into the same root.
 *
 * Requires: gsap + ScrollTrigger (globals), Sestek.util (js/core/utils.js).
 * CSS     : css/components/stack-panels.css
 *
 * DOM:
 *   [data-stack-panels]              root (plain wrapper, no pin itself)
 *     [data-sp-panel]                one panel — ALL but the last one pin
 *       [data-sp-inner]              OPTIONAL: content wrapper. Only needed
 *                                    when the panel's content can be taller
 *                                    than the viewport — enables the
 *                                    fake-scroll phase. Omit for panels that
 *                                    always fit one screen.
 *
 * Root attributes:
 *   data-sp-hold             fraction of the pinned scroll the card stays fully
 *                            settled/readable (scale 1, opacity 1) BEFORE it
 *                            starts to dissolve. 0 = dissolve immediately.
 *                            Raise it if the card fades before you can read it.
 *                                                                 (default 0.5)
 *   data-sp-scale            end scale of an outgoing panel      (default 0.7)
 *   data-sp-fade-portion     fraction of the outgoing tween spent on the
 *                            final quick fade-to-0 (vs. the scale+mid-fade
 *                            portion before it)                  (default 0.1)
 *   data-sp-mid-fade         opacity reached at the end of the scale portion,
 *                            right before the quick fade-to-0    (default 0.5)
 *   data-sp-blur             px blur on the outgoing card at full dissolve —
 *                            depth-of-field, makes it recede behind the incoming
 *                            card. 0 = off.                       (default 4)
 *   data-sp-lift             px the outgoing card drifts upward as it dissolves,
 *                            for a subtle "lifted away" feel. 0 = off (default 0)
 *   data-sp-scrub            ScrollTrigger scrub value/seconds   (default true)
 *   data-sp-refresh-priority-start
 *                            refreshPriority of the FIRST panel; each next
 *                            panel gets one less (see PROJECT.md "ScrollTrigger
 *                            — Pinli Bölüm Kuralları" Kural 1). MUST stay below
 *                            anything pinned ABOVE this on the page — e.g. a
 *                            hero pinned at priority 2. Default 0 keeps the run
 *                            under a typical hero; raise/lower only if your page
 *                            order needs it.                       (default 0)
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
      global.console.warn("[Sestek StackPanels] " + msg, el || "");
    }
  }

  // Pin uses position:fixed — a transform/filter/perspective/will-change on ANY
  // ancestor re-bases it and the pin visibly slips (PROJECT.md Kural 3).
  // Degrade to the plain no-pin fallback instead of pinning broken.
  function pinBlocker(el, stopAt) {
    for (var p = el.parentElement; p && p !== stopAt; p = p.parentElement) {
      var cs = getComputedStyle(p);
      if (cs.transform !== "none" || cs.filter !== "none" ||
          cs.perspective !== "none" || cs.willChange.indexOf("transform") > -1) return p;
    }
    return null;
  }

  function wire(root) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek StackPanels] GSAP + ScrollTrigger required."); return;
    }
    if (root._stackPanelsInit) return;
    root._stackPanelsInit = true;

    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-sp-panel]"));
    if (panels.length < 2) {
      warn("Need at least 2 [data-sp-panel] children (the last one never pins).", root);
      return;
    }

    var endScale   = attrNum(root, "data-sp-scale", 0.7);
    var fadePortion = attrNum(root, "data-sp-fade-portion", 0.1);
    var midFade    = attrNum(root, "data-sp-mid-fade", 0.5);
    // Premium depth: the outgoing card blurs (depth-of-field, recedes behind the
    // incoming one) and can drift slightly up. Both purely optional.
    var blurPx     = attrNum(root, "data-sp-blur", 4);   // px blur at full dissolve
    var liftPx     = attrNum(root, "data-sp-lift", 0);   // px upward drift (0 = off)
    // Readable HOLD before the dissolve: fraction of the pinned scroll the card
    // stays fully settled (scale 1, opacity 1) so it can actually be READ before
    // it starts scaling/fading. 0 = dissolve immediately (old behaviour).
    var holdFrac   = attrNum(root, "data-sp-hold", 0.5);
    var scrubA     = root.getAttribute("data-sp-scrub");
    var scrub      = scrubA === "false" ? false : (scrubA ? (parseFloat(scrubA) || true) : true);
    // refreshPriority of the FIRST panel; each next panel gets one less. MUST
    // stay BELOW anything pinned ABOVE this component on the page (e.g. a hero
    // at priority 2) — a higher value makes these panels refresh before that
    // hero, so they measure their start BEFORE the hero's pin-spacing exists
    // and land in the wrong place (PROJECT.md Kural 1). Default 0 → this whole
    // run sits under a typical hero and in page order among itself.
    var priorityStart = attrNum(root, "data-sp-refresh-priority-start", 0);

    if (prefersReduced()) {
      root.setAttribute("data-sp-reduced", "");
      return; // plain stacked-in-flow panels, no pin/scrub — CSS handles the rest
    }

    var blocker = pinBlocker(root, document.body);
    if (blocker) {
      // GEÇİCİ olabilir: init anında süren bir giriş/reveal animasyonu ata
      // elemanda transform bırakmış olabilir (yavaş makinede DCL'e sarkar).
      // Kalıcı vazgeçmek yerine izle: temizlenirse kur, ~12sn sonunda hâlâ
      // duruyorsa gerçek engel say (PROJECT.md Kural 3 fallback'i).
      warn("Pin ERTELENDİ — bir ancestor'da transform/filter/perspective/" +
           "will-change var (muhtemelen süren bir giriş animasyonu). " +
           "Temizlenirse pinler kurulacak.", blocker);
      root.setAttribute("data-sp-reduced", "");
      var tries = 0;
      var probe = setInterval(function () {
        if (!pinBlocker(root, document.body)) {
          clearInterval(probe);
          root.removeAttribute("data-sp-reduced");
          root._stackPanelsInit = false;          // wire yeniden koşabilsin
          wire(root);
          // Geç kurulan pinlerin start'ları jank-guard'lı refresh ile otursun.
          if (global.Sestek && Sestek.refreshScroll) Sestek.refreshScroll();
          else ScrollTrigger.refresh();
        } else if (++tries >= 8) {
          clearInterval(probe);
          warn("Pin DISABLED — ancestor'daki transform kalıcı; düz akış " +
               "fallback'inde kalınıyor (PROJECT.md Kural 3).",
               pinBlocker(root, document.body));
        }
      }, 1500);
      return;
    }

    // Stacking order INLINE olarak yazılır: ScrollTrigger pin kurulur kurulmaz
    // panelleri pin-spacer'lara sardığı için stack-panels.css'teki
    // [data-sp-panel] ~ [data-sp-panel] kardeş kuralı ölür — sonraki panelin
    // öncekinin ÜSTÜNE boyanması garantisi buradan gelir. Elle verilmiş bir
    // inline z-index varsa ona saygı duyulur.
    panels.forEach(function (panel, idx) {
      if (!panel.style.zIndex) panel.style.zIndex = String(idx + 1);
    });

    var triggers = [];
    var marginRefreshers = [];
    // The LAST panel never pins/dissolves — it's the final resting layer.
    panels.slice(0, -1).forEach(function (panel, i) {
      var inner   = panel.querySelector("[data-sp-inner]");
      var windowH = window.innerHeight;
      var innerH  = inner ? inner.offsetHeight : panel.offsetHeight;
      var diff    = innerH - windowH;
      // Portion (0–1) of the pinned scroll spent "fake-scrolling" the inner
      // content up before the scale/fade phase — ONLY when a panel's content is
      // taller than the viewport AND an [data-sp-inner] wrapper exists (the
      // fake-scroll translates that wrapper — without it fake-scroll is
      // imkânsız, panel normal ortalanmış pin'e düşer, çökmez).
      var fakeRatio = inner && diff > 0 ? diff / (diff + windowH) : 0;
      if (!inner && diff > 0) {
        warn("Panel içeriği viewport'tan " + Math.round(diff) + "px uzun ama " +
             "[data-sp-inner] sarıcısı yok — fake-scroll yapılamaz, panel normal " +
             "pinlenir (taşan kısım okunmadan çözülebilir). Ya içeriği " +
             "[data-sp-inner] ile sarın ya da kısa ekranda içeriği küçültün.", panel);
      }

      // Only tall panels need extra reserved scroll space (see fakeRatio). With
      // pinSpacing:false ScrollTrigger reserves none, so add exactly the
      // fake-scroll distance as margin — verbatim from the reference technique.
      if (fakeRatio) {
        var applyMargin = function () {
          var wh = window.innerHeight;
          var ih = inner.offsetHeight;
          var d = ih - wh;
          panel.style.marginBottom = (d > 0 ? ih * (d / (d + wh)) : 0) + "px";
        };
        applyMargin();
        marginRefreshers.push(applyMargin);   // refreshInit'te taze ölçümle
      }

      // Normal panels pin CENTRED (start "center center") so the card is fully
      // settled in the middle of the screen — readable — before anything moves.
      // Tall panels keep the reference "bottom bottom" (their fake-scroll needs
      // the panel fully in view first). Release for a normal panel is as its top
      // passes the viewport top — exactly when the NEXT panel has slid up over
      // it, so the scale+fade reads as "the top card dissolving as the next
      // takes its place".
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: panel,
          start: fakeRatio ? "bottom bottom" : "center center",
          end: function () {
            return fakeRatio ? "+=" + inner.offsetHeight : "bottom top";
          },
          pin: panel,
          pinSpacing: false,        // overlap the next panel, don't reserve space
          scrub: scrub,
          invalidateOnRefresh: true,
          refreshPriority: priorityStart - i,   // page-order priority, Kural 1
        },
      });

      if (fakeRatio) {
        tl.to(inner, {
          yPercent: -100,
          // function-based: invalidateOnRefresh her refresh'te taze viewport
          // yüksekliğiyle yeniden çözer (mobil adres çubuğu / resize) — bayat
          // windowH ile içerik yanlış mesafeye taşınıp zıplamasın.
          y: function () { return window.innerHeight; },
          ease: "none",
          duration: 1 / (1 - fakeRatio) - 1,
        });
      }
      // HOLD: keep the card fully settled/readable for the first holdFrac of the
      // pinned scroll, THEN dissolve — so the scale/fade never starts before the
      // card is centred and legible. (Skipped for tall panels: their fake-scroll
      // above already provides the reading time.) An empty tween just consumes
      // timeline time; scrub maps it onto real scroll distance.
      if (!fakeRatio && holdFrac > 0 && holdFrac < 1) {
        tl.to({}, { duration: (holdFrac / (1 - holdFrac)), ease: "none" });
      }
      // The premium beat: outgoing panel scales down + dims (+ optional blur/
      // upward drift for depth), then a quick final fade to 0 — same shape as
      // the reference (0.9 scale/dim, 0.1 fade), enriched.
      var fromVars = { scale: 1, opacity: 1 };
      var toVars   = { scale: endScale, opacity: midFade, duration: 1 - fadePortion, ease: "none" };
      if (blurPx > 0) { fromVars.filter = "blur(0px)"; toVars.filter = "blur(" + blurPx + "px)"; }
      if (liftPx)     { fromVars.y = 0; toVars.y = -liftPx; }
      tl.fromTo(panel, fromVars, toVars)
        .to(panel, { opacity: 0, duration: fadePortion, ease: "none" });

      triggers.push(tl);
    });

    var onRefreshInit = null;
    if (marginRefreshers.length) {
      onRefreshInit = function () { marginRefreshers.forEach(function (f) { f(); }); };
      ScrollTrigger.addEventListener("refreshInit", onRefreshInit);
    }

    root._stackPanelsDestroy = function () {
      if (onRefreshInit) ScrollTrigger.removeEventListener("refreshInit", onRefreshInit);
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
      console.error("[Sestek StackPanels] GSAP + ScrollTrigger required."); return;
    }
    var roots = document.querySelectorAll(selector || "[data-stack-panels]");
    if (!roots.length) return;
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStackPanels = initStackPanels;

})(typeof window !== "undefined" ? window : this);
