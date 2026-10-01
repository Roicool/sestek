/*!
 * lenis-init.js v1.5.1
 * Lenis smooth scroll — optional GSAP ScrollTrigger sync + stale-height guard
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.5.1 — Geç güvenlik refresh'leri (500/1500 ms) artık KOŞULLU: gerçek
 *          `load` geldiyse ScrollTrigger zaten kendi load-refresh'ini atmış
 *          olur; sayfa yüksekliği o ölçümden beri değişmediyse ikinci ve
 *          üçüncü tam refresh (her trigger için layout) atlanır. Mobil
 *          Lighthouse'ta lenis-init'e yazılan CPU'nun büyük kısmı bu
 *          refresh'lerin yerleşim maliyetiydi. 4 sn asılı-load sigortasıyla
 *          gelen settle'da refresh yine koşulsuz koşar (load-refresh hiç
 *          gelmemiştir). Pin bekçisi değişmeden sürer.
 * v1.5.0 — NATİVE MOD (mobil ana-iş-parçacığı diyeti): dokunmatik cihazda
 *          Lenis zaten hissedilmez (touch kaydırma tarayıcıya bırakılır,
 *          smoothTouch kapalı) ama her karede lenis.raf + ScrollTrigger.update
 *          koşuyor, Lighthouse mobilde 4× CPU yavaşlatmayla ölçülünce
 *          lenis-init + gsap başlı başına uzun görev üretiyordu. Yeni `native`
 *          seçeneği (varsayılan "touch" = hover:none & pointer:coarse) bu
 *          cihazlarda Lenis'i HİÇ kurmaz: ScrollTrigger doğrudan tarayıcı
 *          scroll'unu dinler, global.lenisInstance null kalır (tüm tüketiciler
 *          zaten null'a karşı korumalı ve native scrollTo'ya düşüyor). Bayat
 *          yükseklik gözcüsü, geç refresh'ler ve pin bekçisi native modda da
 *          kurulur (tablet 768–991 hâlâ pinli bölümler taşır); scroll-idle
 *          kontrolü Lenis yerine pasif scroll zaman damgasıyla yapılır.
 *          Sestek.scrollTo native modda window.scrollTo({behavior:"smooth"})
 *          ile offset/immediate'i onurlandırır (uyarı basmaz). destroyLenis
 *          gözcüyü örnek olmasa da söker. `native: false` eski davranış,
 *          `native: 992` → viewport o genişliğin altındaysa native.
 * v1.4.0 — ASILI-LOAD SİGORTASI: yükseklik gözcüsü ve geç güvenlik
 *          refresh'leri yalnız `load`'a bağlıydı; takılı bir üçüncü parti
 *          kaynak (proxy/antivirüsün kararttığı tracker vb.) load'u sonsuza
 *          dek asarsa gözcü hiç açılmıyor, ScrollTrigger'ın load-refresh'i de
 *          gelmiyor ve DCL'de ölçülen start'lar KALICI bayat kalıyordu —
 *          geç yüklenen medya kadar kayan pinler sectionları üst üste
 *          bindiriyordu (yalnız o makinelerde görünen bug). Artık load YA DA
 *          init'ten 4 sn sonra (hangisi önce) gözcü açılır + telafi refresh'i
 *          koşar. Ayrıca refreshScroll'un scroll-idle beklemesi ~3 sn'lik
 *          tavana bağlandı (sonsuz erteleme olamaz).
 * v1.4.1 — PİN BEKÇİSİ (jenerik güvenlik ağı): settle'dan sonra her pinli
 *          trigger'ın "start − çapa konumu" farkı kalibre edilir ve
 *          periyodik yoklanır (2.5s / 6s / 12s). BİLİNMEYEN bir kaynaktan
 *          ölçüm kayması oluşursa (yükseklik değişmeden pozisyon kayması,
 *          gözcünün göremediği her durum) tek düzeltici refreshScroll atılır.
 *          Scroll halindeyken yoklamaz; kayma yoksa maliyeti birkaç
 *          getBoundingClientRect'ten ibarettir.
 * v1.3.1 — refreshes no longer cause scroll jank: ScrollTrigger.refresh()
 *          is expensive (re-measures every trigger), so firing it while the
 *          page is still loading images (height changes constantly) or while
 *          the user is mid-scroll produced a stutter-then-catch-up feel.
 *          Now: body-height observer stays silent until window load, and any
 *          pending refresh waits for Lenis to go idle before running.
 * v1.3.0 — dynamic-content refresh plumbing (fixes "can't scroll to the
 *          bottom" / mispositioned triggers after CMS filter/load, lazy
 *          images, accordions…):
 *            • Sestek.refreshScroll() — debounced lenis.resize() +
 *              ScrollTrigger.refresh(), safe to call from anywhere
 *            • auto-hooks Finsweet cmsfilter/cmsload `renderitems`
 *            • ResizeObserver on <body> height as a catch-all
 *            • late safety refreshes after window load (500ms / 1500ms)
 *          All of it torn down by destroyLenis().
 * v1.2.1 — destroyLenis() now removes the real ticker wrapper (was a no-op),
 *          cancels the no-GSAP rAF fallback, and initLenis() is idempotent.
 * v1.2.0 — lighter, more perceptible default feel: duration 1.2→1.05,
 *          easing expo-out→cubic-out (longer glide tail, not heavy)
 * v1.1.0 — initial smooth-scroll + ScrollTrigger sync
 */

(function (global) {
  "use strict";

  /**
   * Initializes Lenis smooth scroll.
   * GSAP and ScrollTrigger are optional — if present they are wired automatically.
   * When you later add ScrollTrigger animations, load gsap + ScrollTrigger before
   * this file and the sync happens without any extra code.
   *
   * Required globals : Lenis (only when a Lenis instance will be created —
   *                    in native mode the library may be absent entirely)
   * Optional globals : gsap, ScrollTrigger
   *
   * Options mirror the Lenis constructor API:
   *   duration         – scroll duration in seconds (default: 1.05)
   *   easing           – easing function (default: cubic out)
   *   lerp             – frame-based smoothing (pass e.g. 0.1 to use lerp mode
   *                      instead of duration/easing — Lenis prefers lerp when set)
   *   orientation      – "vertical" | "horizontal" (default: "vertical")
   *   smoothWheel      – smooth mouse wheel (default: true)
   *   wheelMultiplier  – wheel speed multiplier (default: 1)
   *   touchMultiplier  – touch speed multiplier (default: 2)
   *   infinite         – infinite scroll (default: false)
   *
   * Sestek-only option (stripped before reaching Lenis):
   *   native           – when to SKIP Lenis and leave scrolling to the browser
   *                      (ScrollTrigger then reads native scroll directly):
   *                        "touch" (default) – hover:none & pointer:coarse
   *                                            devices (phones, tablets)
   *                        <number>          – viewport narrower than N px
   *                        true              – always native
   *                        false             – always Lenis (pre-1.5 behaviour)
   *                      The stale-height guard runs in both modes.
   */
  // Module-scoped handles so destroyLenis() can tear down exactly what
  // initLenis() created — the ticker callback is an anonymous wrapper (not
  // lenis.raf), the no-GSAP fallback runs its own requestAnimationFrame loop,
  // and the refresh plumbing owns a timer + ResizeObserver + load timeouts.
  var tickerCallback = null;
  var rafId = null;
  var refreshTimer = null;
  var bodyObserver = null;
  var lateTimeouts = [];
  var guardActive = false;
  var nativeMode = false;
  var lastNativeScroll = 0;
  var nativeScrollListener = null;
  var lastRefreshHeight = -1;

  function pageHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  }

  function wantsNative(native) {
    if (native === true) return true;
    if (!native) return false;
    if (typeof native === "number") return global.innerWidth < native;
    if (native === "touch") {
      return !!(global.matchMedia &&
        global.matchMedia("(hover: none) and (pointer: coarse)").matches);
    }
    return false;
  }

  // "Is the page still moving?" — Lenis exposes velocity; in native mode a
  // passive scroll listener stamps the last scroll event instead.
  function isScrolling() {
    var lenis = global.lenisInstance;
    if (lenis) return !!(lenis.isScrolling || Math.abs(lenis.velocity || 0) > 0.05);
    return nativeMode && (performance.now() - lastNativeScroll) < 120;
  }

  /**
   * Debounced "the page height may have changed" handler: re-measures the
   * Lenis scroll limit AND re-computes every ScrollTrigger's start/end.
   *
   * This is THE fix for the classic Lenis-on-CMS symptoms — page won't scroll
   * all the way down after filtering/load-more, pinned sections release at the
   * wrong point, reveals fire mid-screen — all caused by measurements taken
   * against a height that later changed. Call it after ANY dynamic content
   * change; the 200ms debounce collapses bursts (e.g. a filter re-render)
   * into a single re-measure.
   *
   * Jank guard: ScrollTrigger.refresh() re-measures every trigger and forces
   * layout — running it while the user is mid-scroll makes the page hitch
   * (stutter, then catch up). So if the page is still moving when the
   * debounce fires, the refresh re-arms and waits for the scroll to go idle;
   * the re-measure then runs once, invisibly, between gestures.
   */
  function refreshScroll() {
    if (refreshTimer) clearTimeout(refreshTimer);
    var tries = 0;
    refreshTimer = setTimeout(function tick() {
      // Still scrolling (user gesture or scrollTo in flight)? Check again
      // shortly — never re-measure under the user's finger/wheel. Capped:
      // ~3s sonra yine de koşar (idle hiç gelmezse ölçümler sonsuza dek
      // bayat kalamaz — kısa bir hitch, kalıcı bozuk pinden iyidir).
      if (tries++ < 20 && isScrolling()) {
        refreshTimer = setTimeout(tick, 150);
        return;
      }
      refreshTimer = null;
      var lenis = global.lenisInstance;
      if (lenis) lenis.resize();
      lastRefreshHeight = pageHeight();
      if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
    }, 200);
  }

  // Late safety pass: only pay for a full refresh when the page height moved
  // since the last measured one. ScrollTrigger's own load-refresh counts as
  // a measurement when `load` really fired.
  function refreshIfChanged() {
    if (lastRefreshHeight === pageHeight()) return;
    refreshScroll();
  }

  // ── Stale-height guard ──────────────────────────────────────────────
  // Everything below exists to keep Lenis' limit and ScrollTrigger's
  // positions honest when the page height changes AFTER init. Installed in
  // both Lenis and native mode — tablets still carry pinned sections.
  function installGuard() {
    guardActive = true;

    // Finsweet CMS Filter / CMS Load — refresh after every re-render
    // (filtering, pagination, load-more, infinite scroll). Pushing to
    // fsAttributes is the official callback API and harmless if Finsweet
    // never loads (it stays an inert array). Guarded on guardActive so a
    // late Finsweet render after destroyLenis() is a no-op.
    global.fsAttributes = global.fsAttributes || [];
    ["cmsfilter", "cmsload"].forEach(function (key) {
      global.fsAttributes.push([key, function (instances) {
        instances.forEach(function (instance) {
          instance.on("renderitems", function () {
            if (guardActive) refreshScroll();
          });
        });
      }]);
    });

    // Catch-all: ANY body height change (lazy images/embeds, accordions,
    // tabs, custom async content) schedules a debounced refresh.
    //
    // Silent until window load: while assets stream in, the body height
    // changes constantly — refreshing on each change made scrolling stutter
    // during load ("heavy, then snaps back"). ScrollTrigger already refreshes
    // itself on load, and our late passes below cover post-load settling, so
    // pre-load observer events carry no information worth the jank.
    var loadSettled = false;
    if (typeof ResizeObserver !== "undefined") {
      var lastHeight = document.body.scrollHeight;
      bodyObserver = new ResizeObserver(function () {
        // load bitene YA DA 4sn sigortası devralana kadar sessiz.
        if (!loadSettled && document.readyState !== "complete") return;
        var h = document.body.scrollHeight;
        if (h !== lastHeight) {
          lastHeight = h;
          refreshScroll();
        }
      });
      bodyObserver.observe(document.body);
    }

    // Late safety refreshes: fonts/images that settle after `load` without
    // changing body height enough to trip the observer (or on browsers
    // without ResizeObserver). Routed through refreshScroll() so they too
    // wait for scroll-idle instead of hitching an in-flight gesture.
    // ── Pin bekçisi: start'lar ile gerçek konumlar arasındaki farkı
    // kalibre et, sonra yokla — kayma varsa tek düzeltici refresh.
    // Çapa: pin-spacer (varsa) — pin aktifken de konumu akışta sabittir.
    var sentryBase = typeof WeakMap !== "undefined" ? new WeakMap() : null;
    var sentry = function () {
      if (typeof ScrollTrigger === "undefined" || !sentryBase) return;
      if (isScrolling()) return;
      var drifted = false;
      ScrollTrigger.getAll().forEach(function (t) {
        if (!t.pin) return;
        var anchor = t.spacer || t.trigger;
        if (!anchor || !anchor.getBoundingClientRect) return;
        var top = anchor.getBoundingClientRect().top +
          (global.scrollY != null ? global.scrollY : global.pageYOffset || 0);
        var off = t.start - top;
        if (sentryBase.has(t)) {
          if (Math.abs(off - sentryBase.get(t)) > 40) drifted = true;
        } else {
          sentryBase.set(t, off);
        }
      });
      if (drifted) {
        sentryBase = new WeakMap();          // refresh sonrası yeniden kalibre
        refreshScroll();
      }
    };

    var settle = function (fromLoad) {
      if (loadSettled) return;
      loadSettled = true;
      var late = refreshScroll;
      if (fromLoad === true) {
        lastRefreshHeight = pageHeight();   // ScrollTrigger'ın load-refresh ölçümü
        late = refreshIfChanged;
      }
      lateTimeouts.push(
        setTimeout(late, 500),
        setTimeout(late, 1500),
        setTimeout(sentry, 2500),            // kalibrasyon (refresh'ler oturdu)
        setTimeout(sentry, 6000),            // yoklama 1
        setTimeout(sentry, 12000)            // yoklama 2 — geç sürprizler
      );
    };
    if (document.readyState === "complete") {
      settle(true);
    } else {
      global.addEventListener("load", function () { settle(true); }, { once: true });
      // ASILI-LOAD SİGORTASI: takılı bir kaynak load'u sonsuza dek asarsa
      // (kurumsal proxy/adblock karartması) 4 sn sonra devral — gözcü açılır,
      // telafi refresh'leri koşar. ScrollTrigger'ın kendi load-refresh'inin
      // yerini de bu telafi doldurur.
      lateTimeouts.push(setTimeout(settle, 4000));
    }
  }

  function teardownGuard() {
    guardActive = false;
    if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null; }
    if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
    lateTimeouts.forEach(clearTimeout);
    lateTimeouts = [];
    if (nativeScrollListener) {
      global.removeEventListener("scroll", nativeScrollListener);
      nativeScrollListener = null;
    }
    nativeMode = false;
    lastRefreshHeight = -1;
  }

  function initLenis(options) {
    // Idempotent — a second call would otherwise add a second ticker handler
    // and a second Lenis instance, doubling every scroll delta.
    if (global.lenisInstance) return global.lenisInstance;
    if (guardActive) return null;

    var opts = Object.assign({}, options || {});
    var native = Object.prototype.hasOwnProperty.call(opts, "native") ? opts.native : "touch";
    delete opts.native;

    if (wantsNative(native)) {
      // Native mode: no Lenis, no per-frame ticker. ScrollTrigger reads the
      // browser's own scroll; only the height guard is installed.
      nativeMode = true;
      nativeScrollListener = function () { lastNativeScroll = performance.now(); };
      global.addEventListener("scroll", nativeScrollListener, { passive: true });
      installGuard();
      return null;
    }

    if (typeof Lenis === "undefined") {
      console.error("[Sestek] Lenis is not loaded.");
      return null;
    }

    var defaults = {
      // Light but perceptible glide — short enough to feel responsive, not heavy.
      duration: 1.05,
      easing: function (t) {
        return 1 - Math.pow(1 - t, 3); // cubic out — gentle, noticeable tail
      },
      orientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
    };

    var config = Object.assign({}, defaults, opts);
    var lenis = new Lenis(config);
    var hasGsap = typeof gsap !== "undefined";
    var hasScrollTrigger = hasGsap && typeof ScrollTrigger !== "undefined";

    if (hasGsap) {
      // Drive Lenis via GSAP ticker for frame-perfect sync. Keep the wrapper
      // reference so destroyLenis() can remove this exact callback.
      tickerCallback = function (time) {
        lenis.raf(time * 1000);
      };
      gsap.ticker.add(tickerCallback);
      // Prevent GSAP from adding its own lag smoothing on top of Lenis
      gsap.ticker.lagSmoothing(0);
    } else {
      // Fallback: drive Lenis with requestAnimationFrame. Track the frame id
      // so destroyLenis() can cancel the loop.
      (function raf(time) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      })(performance.now());
    }

    if (hasScrollTrigger) {
      // ScrollTrigger reads native scroll — keep it in sync with Lenis virtual scroll
      lenis.on("scroll", ScrollTrigger.update);
    }

    // Expose on global for external access (e.g. anchor links, modals)
    global.lenisInstance = lenis;

    installGuard();

    return lenis;
  }

  function resolveTop(target, options) {
    var offset = (options && typeof options.offset === "number") ? options.offset : 0;
    var y = global.scrollY != null ? global.scrollY : global.pageYOffset || 0;
    if (typeof target === "number") return target + offset;
    if (target === "top") return offset;
    if (target === "bottom") return document.documentElement.scrollHeight + offset;
    var el = typeof target === "string" ? document.querySelector(target) : target;
    if (!el || !el.getBoundingClientRect) return null;
    return el.getBoundingClientRect().top + y + offset;
  }

  /**
   * Smoothly scrolls to a target element or numeric position.
   * In native mode falls back to window.scrollTo (honours `offset` and
   * `immediate`; duration/easing are the browser's own).
   * @param {string|number|HTMLElement} target
   * @param {object} [options] – Lenis scrollTo options
   */
  function scrollTo(target, options) {
    options = options || {};
    if (global.lenisInstance) {
      global.lenisInstance.scrollTo(target, options);
      return;
    }
    if (!nativeMode) {
      console.warn("[Sestek] Lenis is not initialized. Call initLenis() first.");
      return;
    }
    var top = resolveTop(target, options);
    if (top == null) return;
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var behavior = (options.immediate || options.duration === 0 || reduce) ? "auto" : "smooth";
    try {
      global.scrollTo({ top: top, behavior: behavior });
    } catch (e) {
      global.scrollTo(0, top);
    }
    if (typeof options.onComplete === "function") {
      setTimeout(options.onComplete, behavior === "auto" ? 0 : 500);
    }
  }

  /** Temporarily stops Lenis (e.g. when a modal is open). No-op in native mode. */
  function stopScroll() {
    if (global.lenisInstance) global.lenisInstance.stop();
  }

  /** Resumes Lenis after stopScroll(). No-op in native mode. */
  function startScroll() {
    if (global.lenisInstance) global.lenisInstance.start();
  }

  /**
   * Destroys the Lenis instance and cleans up the ticker/raf loop plus the
   * refresh plumbing. Call this before navigating away in SPA contexts.
   * Also tears down the native-mode guard when no instance exists.
   */
  function destroyLenis() {
    teardownGuard();
    if (!global.lenisInstance) return;
    // Remove the actual wrapper we added to the ticker (not lenis.raf, which
    // was never the registered callback).
    if (typeof gsap !== "undefined" && tickerCallback) {
      gsap.ticker.remove(tickerCallback);
    }
    tickerCallback = null;
    // Cancel the no-GSAP fallback loop if it was the active driver.
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    global.lenisInstance.destroy();
    global.lenisInstance = null;
  }

  // Public API
  global.Sestek = global.Sestek || {};
  global.Sestek.initLenis = initLenis;
  global.Sestek.refreshScroll = refreshScroll;
  global.Sestek.scrollTo = scrollTo;
  global.Sestek.stopScroll = stopScroll;
  global.Sestek.startScroll = startScroll;
  global.Sestek.destroyLenis = destroyLenis;
  global.Sestek.isNativeScroll = function () { return nativeMode; };
})(typeof window !== "undefined" ? window : this);
