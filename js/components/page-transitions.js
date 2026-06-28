/*!
 * page-transitions.js v1.1.0
 * Companion to css/components/page-transitions.css.
 *
 * Changelog
 * v1.1.0 — honours prefers-reduced-motion: forces the minimal fade and disables
 *          the directional slide + shared-element image morph. Native cross-document
 * View Transitions need no JS for the basic fade — this file adds the two
 * things CSS alone can't do:
 *
 *   1. Directional slide — detects forward vs back/up navigation and tags the
 *      transition with the `pt-back` type so the slide reverses correctly.
 *   2. Shared-element image morph — when you click a blog card, its image is
 *      tagged `view-transition-name: pt-hero`; on the destination article the
 *      hero image gets the same name, so the browser morphs one into the
 *      other across the page load.
 *
 * It also (optionally) remembers the chosen feel across navigations so the
 * demo's mode switcher works — production can just pass a fixed `mode`.
 *
 * Everything is feature-detected: browsers without cross-document View
 * Transitions (Firefox/Safari today) simply never fire these events and
 * navigate normally. No fallback code, no errors.
 *
 * ── DOM (opt-in, only where you want the morph) ──────────────────────
 *
 *   <!-- blog listing: each card links to its article -->
 *   <a class="post-card" href="/blog/my-article" data-pt-card>
 *     <img data-pt-card-img src="thumb.jpg" alt="">
 *     …
 *   </a>
 *
 *   <!-- article page: the hero image that the thumb morphs into -->
 *   <img data-pt-hero-img src="hero.jpg" alt="">
 *
 *   <!-- persistent shell (handled in CSS, shown here for completeness) -->
 *   <nav data-pt-persist="nav">…</nav>
 *   <footer data-pt-persist="footer">…</footer>
 *
 * API:
 *   Sestek.initPageTransitions({ mode, morph, remember })
 *     mode     "fade" | "wipe" | "slide"   (default: <html data-pt> or "fade")
 *     morph    enable the image morph       (default: true)
 *     remember persist mode across nav in   (default: false)
 *              sessionStorage — used by the demo switcher
 *   Sestek.setPageTransition(mode)  — switch feel at runtime (persists)
 *
 * CSS: css/components/page-transitions.css
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var STORE_KEY = "sestek-pt";
  var MODES = { fade: 1, wipe: 1, slide: 1 };
  var config = { mode: "fade", morph: true, remember: false };

  var doc = global.document;
  var root = doc.documentElement;

  /* Honour prefers-reduced-motion. The actual transition is browser-driven
     (CSS View Transitions), but JS can strip the motion-heavy parts: force the
     lightest mode and disable the directional slide + image morph, leaving only
     the minimal default cross-fade. Inlined (not Sestek.util) so this file stays
     fully standalone — it has no other dependency, not even GSAP. */
  function prefersReducedMotion() {
    return typeof global.matchMedia === "function" &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function readStored() {
    try {
      return global.sessionStorage ? global.sessionStorage.getItem(STORE_KEY) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStored(mode) {
    try {
      if (global.sessionStorage) global.sessionStorage.setItem(STORE_KEY, mode);
    } catch (e) { /* private mode / disabled — ignore */ }
  }

  function applyMode(mode) {
    if (!MODES[mode]) mode = "fade";
    config.mode = mode;
    root.setAttribute("data-pt", mode);
  }

  /* Resolve which way the user is going so the slide can reverse on "back".
     Uses the Navigation API history-entry indices when available (Chromium);
     anything else (or a fresh push) is treated as forward. */
  function isBackNavigation(activation) {
    if (!activation) return false;
    if (activation.navigationType === "traverse" &&
        activation.from && activation.entry &&
        typeof activation.from.index === "number" &&
        typeof activation.entry.index === "number") {
      return activation.entry.index < activation.from.index;
    }
    return false;
  }

  function resolveHref(a) {
    // Normalise to a comparable absolute URL (handles relative hrefs).
    try {
      return new URL(a.getAttribute("href"), doc.baseURI).href;
    } catch (e) {
      return null;
    }
  }

  /* On the OUTGOING page: tag the clicked card's image so it can morph, and
     mark the transition's direction. Fires before the old snapshot is taken. */
  function onPageSwap(e) {
    var vt = e.viewTransition;
    if (!vt) return;

    var activation = e.activation || (global.navigation && global.navigation.activation);

    if (config.mode === "slide" && isBackNavigation(activation) && vt.types && vt.types.add) {
      vt.types.add("pt-back");
    }

    if (config.morph && activation && activation.entry) {
      var destUrl = activation.entry.url;
      var cards = doc.querySelectorAll("[data-pt-card]");
      for (var i = 0; i < cards.length; i++) {
        if (resolveHref(cards[i]) === destUrl) {
          var img = cards[i].querySelector("[data-pt-card-img]") || cards[i];
          img.style.viewTransitionName = "pt-hero";
          // Clean up once the snapshot is captured so a repeat nav re-tags cleanly.
          vt.finished.then(function () { img.style.viewTransitionName = ""; });
          break;
        }
      }
    }
  }

  /* On the INCOMING page: tag the hero image as the morph target and re-assert
     direction (cross-document types are set per-document). Fires before the
     new page's first render. */
  function onPageReveal(e) {
    var vt = e.viewTransition;
    if (!vt) return;

    var activation = global.navigation && global.navigation.activation;

    if (config.mode === "slide" && isBackNavigation(activation) && vt.types && vt.types.add) {
      vt.types.add("pt-back");
    }

    if (config.morph) {
      var hero = doc.querySelector("[data-pt-hero-img]");
      if (hero) {
        hero.style.viewTransitionName = "pt-hero";
        vt.finished.then(function () { hero.style.viewTransitionName = ""; });
      }
    }
  }

  function initPageTransitions(options) {
    options = options || {};
    if (typeof options.morph === "boolean") config.morph = options.morph;
    if (typeof options.remember === "boolean") config.remember = options.remember;

    // Priority: remembered (demo) > explicit option > existing <html> attr > fade.
    var mode = (config.remember && readStored()) ||
               options.mode ||
               root.getAttribute("data-pt") ||
               "fade";

    // Reduced motion: drop to the lightest fade and turn off morph so the
    // onPageSwap/onPageReveal handlers skip the slide types and image morph.
    if (prefersReducedMotion()) {
      mode = "fade";
      config.morph = false;
    }

    applyMode(mode);
    if (config.remember) writeStored(config.mode);

    // Cross-document View Transition lifecycle (Chromium). Absent elsewhere.
    if ("onpageswap" in global) {
      global.addEventListener("pageswap", onPageSwap);
    }
    if ("onpagereveal" in global) {
      global.addEventListener("pagereveal", onPageReveal);
    }
  }

  /* Switch feel at runtime + persist, so the very next navigation uses it.
     (Used by the demo's mode buttons.) */
  function setPageTransition(mode) {
    config.remember = true;
    applyMode(mode);
    writeStored(config.mode);
    return config.mode;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initPageTransitions = initPageTransitions;
  global.Sestek.setPageTransition = setPageTransition;
})(typeof window !== "undefined" ? window : this);
