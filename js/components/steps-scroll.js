/*!
 * steps-scroll.js v1.0.0
 * Sticky-image step list (NOT pinned — the page scrolls normally):
 *   • LEFT  — step text zones flow with the scroll.
 *   • RIGHT — a sticky image frame; one stacked image per step.
 * The ACTIVE step is resolved from pure geometry: the last zone whose text
 * block's bottom edge has scrolled up past the image frame's bottom edge.
 * On change, the incoming image slides up from below while the previous one
 * pushes up, dims, and sits behind (CSS keyframes do the motion — JS only
 * swaps classes). Scrolling back plays the same choreography downward
 * (root gets .is-reverse).
 *
 * Geometry is checked on requestAnimationFrame (Lenis/GSAP-driven scroll
 * makes native scroll events unreliable); an IntersectionObserver gates the
 * loop so it idles while the section is off-screen.
 *
 * Requires : nothing — no gsap, pure DOM + CSS animations.
 * CSS      : css/components/steps-scroll.css (the .is-active / .is-prev /
 *            .is-reverse choreography — timing via --stsc-* tokens).
 *
 * DOM contract (Webflow — only the attributes matter, design is yours):
 *   [data-steps-scroll]                 root (gets .is-reverse when going up)
 *     [data-stsc-zone]                  one step's text zone (N total)
 *       [data-stsc-content]             optional: the text block whose BOTTOM
 *                                       edge is the trigger reference
 *                                       (defaults to the zone itself)
 *     [data-stsc-image-wrap]            the sticky image frame (overflow
 *                                       hidden lives in CSS)
 *       [data-stsc-image]               one image layer per step — order must
 *                                       match the zones. Active gets
 *                                       .is-active, outgoing gets .is-prev.
 *
 * Behaviour classes JS toggles (style them in CSS):
 *   .is-active   incoming/front image        .is-prev   outgoing, dimmed
 *   .is-reverse  on the ROOT while the last change was backwards
 *
 * Reduced motion: the CSS kills the keyframes (instant cuts); JS logic is
 * identical.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function build(root) {
    if (root._stepsScrollInit) return;                      // idempotent
    root._stepsScrollInit = true;

    var zones = Array.prototype.slice.call(root.querySelectorAll("[data-stsc-zone]"));
    var imageWrap = root.querySelector("[data-stsc-image-wrap]");
    var images = imageWrap ? Array.prototype.slice.call(root.querySelectorAll("[data-stsc-image]")) : [];

    if (!zones.length || !images.length || !imageWrap) {
      console.warn("[Sestek StepsScroll] Need [data-stsc-zone] rows, " +
        "[data-stsc-image-wrap] and [data-stsc-image] layers.");
      return;
    }

    // Each zone's inner text block — its bottom edge is the trigger reference.
    var blocks = zones.map(function (z) {
      return z.querySelector("[data-stsc-content]") || z;
    });

    var current = 0;
    images[0].classList.add("is-active");                   // first frame visible from t0

    function setActive(idx) {
      if (idx === current) return;
      var prev = current;
      root.classList.toggle("is-reverse", idx < prev);
      images.forEach(function (img, i) {
        img.classList.remove("is-active", "is-prev");
        if (i === prev) img.classList.add("is-prev");
      });
      var incoming = images[idx];
      if (incoming) {
        void incoming.offsetWidth;                          // restart the CSS animation
        incoming.classList.add("is-active");
      }
      current = idx;
    }

    /** Last step whose text block's bottom passed the image frame's bottom. */
    function resolveIdx() {
      var imageBottom = imageWrap.getBoundingClientRect().bottom;
      var idx = 0;
      for (var i = 0; i < blocks.length; i++) {
        if (blocks[i].getBoundingClientRect().bottom <= imageBottom + 1) idx = i;
      }
      return idx;
    }

    // rAF geometry loop, gated by viewport visibility.
    var rafId = null;
    function tick() {
      setActive(resolveIdx());
      rafId = requestAnimationFrame(tick);
    }
    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && rafId === null) tick();
          else if (!entry.isIntersecting && rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        });
      });
      io.observe(root);
    } else {
      tick();
    }
  }

  /**
   * Initializes every steps-scroll section on the page in one call.
   * @param {string} [selector="[data-steps-scroll]"] narrow the scope if needed
   */
  function initStepsScroll(selector) {
    var roots = document.querySelectorAll(selector || "[data-steps-scroll]");
    if (!roots.length) { console.warn("[Sestek StepsScroll] No [data-steps-scroll] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStepsScroll = initStepsScroll;

})(typeof window !== "undefined" ? window : this);
