/*!
 * btn-glow.js v1.1.0
 * Rotating gradient border button — Sestek brand colors
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function initBtnGlow() {
    if (typeof gsap === "undefined") {
      console.error("[Sestek BtnGlow] GSAP required."); return;
    }

    var btns = Array.from(document.querySelectorAll("[data-btn-glow]"));
    if (!btns.length) return;

    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    btns.forEach(function (btn) {
      if (btn._btnGlowInit) return;
      btn._btnGlowInit = true;

      var ring = btn.querySelector(".btn-glow__ring");
      var face = btn.querySelector(".btn-glow__face");

      if (!ring || !face) {
        console.warn("[Sestek BtnGlow] Missing .btn-glow__ring or .btn-glow__face inside", btn);
        return;
      }

      gsap.set(ring, { xPercent: -50, yPercent: -50 });

      var rotateTween = null;

      if (!reducedMotion) {
        rotateTween = gsap.to(ring, {
          rotation: 360,
          duration: 4,
          repeat  : -1,
          ease    : "none",
        });
      }

      // ── Hover ───────────────────────────────────────────────────
      btn.addEventListener("mouseenter", function () {
        // Rotation yavaşlar — "odaklanma" hissi
        if (rotateTween) {
          gsap.to(rotateTween, { timeScale: 0.4, duration: 0.5, ease: "power2.out" });
        }

        // Border kalınlaşır
        gsap.to(face, {
          margin  : "2.5px",
          duration: 0.5,
          ease    : "expo.out",
        });

        // Glow — brand renkleriyle dışa yayılan ışık
        gsap.to(btn, {
          boxShadow: "0 0 18px rgba(236,0,140,0.30), 0 0 40px rgba(0,255,235,0.15)",
          duration : 0.5,
          ease     : "power2.out",
        });
      });

      btn.addEventListener("mouseleave", function () {
        // Rotation normal hıza döner
        if (rotateTween) {
          gsap.to(rotateTween, { timeScale: 1, duration: 0.8, ease: "power2.inOut" });
        }

        // Border inceleir
        gsap.to(face, {
          margin  : "1.5px",
          duration: 0.5,
          ease    : "expo.out",
        });

        // Glow söner
        gsap.to(btn, {
          boxShadow: "0 0 0px rgba(236,0,140,0)",
          duration : 0.5,
          ease     : "power2.out",
        });
      });
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBtnGlow = initBtnGlow;

})(typeof window !== "undefined" ? window : this);
