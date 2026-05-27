/*!
 * btn-glow.js v1.0.0
 * Rotating gradient border button — Sestek brand colors
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /**
   * Initializes all [data-btn-glow] buttons on the page.
   * Safe to call multiple times — skips already-initialized buttons.
   */
  function initBtnGlow() {
    if (typeof gsap === "undefined") {
      console.error("[Sestek BtnGlow] GSAP required."); return;
    }

    var btns = Array.from(document.querySelectorAll("[data-btn-glow]"));
    if (!btns.length) return;

    // Prefers-reduced-motion: skip rotation, keep static gradient
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    btns.forEach(function (btn) {
      if (btn._btnGlowInit) return; // skip already initialized
      btn._btnGlowInit = true;

      var ring = btn.querySelector(".btn-glow__ring");
      var face = btn.querySelector(".btn-glow__face");

      if (!ring || !face) {
        console.warn("[Sestek BtnGlow] Missing .btn-glow__ring or .btn-glow__face inside", btn);
        return;
      }

      // Center the ring — GSAP owns the transform, not CSS
      gsap.set(ring, { xPercent: -50, yPercent: -50 });

      if (!reducedMotion) {
        // Continuous rotation — conic-gradient spins around the pill
        gsap.to(ring, {
          rotation     : 360,
          duration     : 4,
          repeat       : -1,
          ease         : "none",
        });
      }

      // ── Hover: border thickens ──────────────────────────────────
      var hoverTween = null;

      btn.addEventListener("mouseenter", function () {
        if (hoverTween) hoverTween.kill();
        hoverTween = gsap.to(face, {
          margin  : "2.5px",
          duration: 0.25,
          ease    : "power2.out",
        });
      });

      btn.addEventListener("mouseleave", function () {
        if (hoverTween) hoverTween.kill();
        hoverTween = gsap.to(face, {
          margin  : "1.5px",
          duration: 0.25,
          ease    : "power2.out",
        });
      });
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initBtnGlow = initBtnGlow;

})(typeof window !== "undefined" ? window : this);
