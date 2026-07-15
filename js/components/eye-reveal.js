/*!
 * eye-reveal.js v1.0.0
 * Pinned "eye opening" image reveal with copy + notification toasts:
 *   1. As the section approaches, a vertical progress line fills (scrubbed)
 *   2. The section pins; a clip-path "eye" reveal opens the image from its
 *      center while the image itself settles from a 1.3 counter-zoom
 *   3. The reveal timeline is NOT scrubbed — pin progress ratchets a proxy
 *      (forward-only, 1.2s catch-up tween) so the animation always plays
 *      smoothly and never runs backwards on up-scroll
 *   4. Left copy block staggers in (eyebrow → title → text → button);
 *      AFTER the image has settled, the notification toasts pop in one
 *      after another (back.out, y+scale+fade)
 *   5. Once complete and left behind, the pin KILLS ITSELF: the pin-spacer
 *      height is removed and the scroll position compensated (via Lenis
 *      when available) — the section becomes static, one-shot
 *
 * Requires : gsap + ScrollTrigger. Lenis optional (window.lenisInstance).
 *
 * DOM contract:
 *   [data-eye-reveal]          root; config attributes below
 *     [data-eye-track]           full-height track
 *       [data-eye-sticky]         sticky/pinned inner
 *         [data-eye-progress]      vertical progress line (scaleY 0→1)
 *         [data-eye-frame]         clip-path reveal target
 *           [data-eye-img]          the image (counter-zoom)
 *         [data-eye-copy]          left copy block — its CHILDREN stagger in
 *         [data-eye-toast]         notification chip (2+, pop in sequence)
 *
 * Root config attributes:
 *   data-eye-end        pin scroll distance            (default "100%")
 *   data-eye-complete   fraction of pin progress at
 *                       which the reveal finishes      (default 0.7)
 *   data-eye-catchup    proxy catch-up tween seconds   (default 1.2)
 *   data-eye-priority   ScrollTrigger refreshPriority  (default 0)
 *   data-eye-once       kill pin after completion      (default "true")
 *
 * CSS contract (see component CSS): the reveal is driven by two registered
 * custom properties — --eye-scale (frame clip-path) and --eye-img-scale
 * (image counter-zoom). GSAP tweens the variables.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function initEyeReveal(selector) {
    var root = document.querySelector(selector || "[data-eye-reveal]");
    if (!root) { console.warn("[Sestek EyeReveal] No [data-eye-reveal] found."); return; }
    if (root._eyeRevealInit) return;                      // idempotent
    root._eyeRevealInit = true;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek EyeReveal] GSAP + ScrollTrigger required."); return;
    }

    gsap.registerPlugin(ScrollTrigger);

    var frame    = root.querySelector("[data-eye-frame]");
    var img      = root.querySelector("[data-eye-img]");
    var progress = root.querySelector("[data-eye-progress]");
    var copy     = root.querySelector("[data-eye-copy]");
    var toasts   = Array.from(root.querySelectorAll("[data-eye-toast]"));
    var copyKids = copy ? Array.from(copy.children) : [];

    if (!frame || !img) {
      console.warn("[Sestek EyeReveal] [data-eye-frame] and [data-eye-img] required."); return;
    }

    var endDist   = root.getAttribute("data-eye-end") || "100%";
    var complete  = num(root, "data-eye-complete", 0.7);
    var catchup   = num(root, "data-eye-catchup", 1.2);
    var priority  = num(root, "data-eye-priority", 0);
    var once      = root.getAttribute("data-eye-once") !== "false";

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function showStatic() {
      gsap.set(frame, { "--eye-scale": 1 });
      gsap.set(img, { "--eye-img-scale": 1 });
      if (copyKids.length) gsap.set(copyKids, { autoAlpha: 1, y: 0 });
      if (toasts.length) gsap.set(toasts, { autoAlpha: 1, y: 0, scale: 1 });
      if (progress) gsap.set(progress, { scaleY: 1 });
    }

    if (reduce) { showStatic(); return; }

    var mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 992px)",
      isMobile: "(max-width: 991px)",
    }, function (context) {
      if (!context.conditions.isDesktop) {
        // Mobile: no pin, no reveal — everything visible, section static.
        showStatic();
        return;
      }

      // ── Primed states ─────────────────────────────────────────────
      gsap.set(frame, { "--eye-scale": 0 });
      gsap.set(img, { "--eye-img-scale": 1.3 });
      if (copyKids.length) gsap.set(copyKids, { autoAlpha: 0, y: 26 });
      if (toasts.length) gsap.set(toasts, { autoAlpha: 0, y: 24, scale: 0.92 });
      if (progress) gsap.set(progress, { scaleY: 0, transformOrigin: "top center" });

      // iOS Safari URL-bar collapse fires height-only resizes — ignore them.
      var lastW = window.innerWidth;
      var onResize = function () {
        if (window.innerWidth === lastW) return;
        lastW = window.innerWidth;
        ScrollTrigger.refresh();
      };
      window.addEventListener("resize", onResize);

      // ── Approach: progress line fills as the section scrolls into view ──
      if (progress) {
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "top top",
            scrub: 1.2,
            refreshPriority: priority,
            invalidateOnRefresh: true,
          },
        }).to(progress, { scaleY: 1, duration: 1 }, 0);
      }

      // ── The reveal timeline (paused; driven by the ratchet proxy) ──
      var tlReveal = gsap.timeline({ paused: true });

      tlReveal.fromTo(frame,
        { "--eye-scale": 0 },
        { "--eye-scale": 1, duration: 0.7, ease: "power3.out" }, 0);
      tlReveal.fromTo(img,
        { "--eye-img-scale": 1.3 },
        { "--eye-img-scale": 1, duration: 0.7, ease: "power3.out" }, 0);

      // Left copy: eyebrow → title → text → button, staggered.
      if (copyKids.length) {
        tlReveal.to(copyKids, {
          autoAlpha: 1, y: 0,
          duration: 0.55, ease: "power3.out",
          stagger: 0.09,
        }, 0.3);
      }

      // Toasts: only after the image has fully settled (0.7), one by one.
      toasts.forEach(function (t, i) {
        tlReveal.to(t, {
          autoAlpha: 1, y: 0, scale: 1,
          duration: 0.55, ease: "back.out(1.7)",
        }, 0.85 + i * 0.28);
      });

      // ── Ratchet: pin progress only ever pushes the proxy FORWARD ──
      var maxP = 0;
      var killed = false;
      var pendingKill = false;
      var st;
      var proxy = { p: 0 };
      var applyProxy = function () { tlReveal.progress(proxy.p); };

      var killNow = function () {
        if (killed || !once) return;
        if (window.scrollY < st.end - 10) { pendingKill = false; return; }
        killed = true;
        var lenis = global.lenisInstance;
        var spacer = root.parentElement;
        var extra = spacer && spacer.classList.contains("pin-spacer")
          ? spacer.offsetHeight - root.offsetHeight
          : 0;
        var newY = Math.max(0, window.scrollY - extra);

        if (lenis) lenis.stop();
        st.kill(true);
        ScrollTrigger.refresh();

        if (lenis) {
          lenis.scrollTo(newY, { immediate: true, force: true });
          setTimeout(function () { lenis.start(); }, 80);
        } else {
          window.scrollTo(0, newY);
        }
      };

      st = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "+=" + endDist,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        refreshPriority: priority,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (killed) return;
          var target = Math.min(self.progress / complete, 1);
          if (target > maxP) {
            maxP = target;
            gsap.to(proxy, {
              p: maxP,
              duration: catchup,
              ease: "none",
              overwrite: true,
              onUpdate: applyProxy,
            });
          }
        },
        onLeave: function () {
          if (killed || pendingKill) return;
          gsap.killTweensOf(proxy);
          proxy.p = 1;
          tlReveal.progress(1);
          if (once) {
            pendingKill = true;
            setTimeout(killNow, 150);
          }
        },
      });

      return function () { window.removeEventListener("resize", onResize); };
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initEyeReveal = initEyeReveal;

})(typeof window !== "undefined" ? window : this);
