/*!
 * glossary-nav.js v1.0.0
 * Glossary A–Z letter bar — fixed bottom-center pill. Click a letter to
 * scroll to its section (routed through Lenis via Sestek.scrollTo when
 * present), the indicator disc glides to whichever section owns the
 * viewport, letters with no matching section auto-disable, and the bar
 * itself only shows while the glossary content is on screen.
 *
 * Requires : nothing (Lenis + Sestek.scrollTo used when available).
 * CSS      : css/components/glossary-nav.css
 *
 * DOM contract (Webflow — only the attributes matter, design is CSS's):
 *   [data-glossary-nav]                  fixed bar (nav element, anywhere in body)
 *     [data-glossary-nav-track]          the letter row
 *       [data-glossary-nav-letter="A"]   one letter — <a>, value falls back to
 *                                        the element's own text ("A"…"Z")
 *   Page content:
 *   [data-glossary-nav-scope]            optional — wrapper around the glossary
 *                                        content; the bar is visible only while
 *                                        this element is on screen. Omit it and
 *                                        the bar is always visible.
 *   [data-glossary-section="A"]          one per letter — the block the matching
 *                                        letter scrolls to. Letters without a
 *                                        section get .is-disabled automatically.
 *
 * Root attributes (all optional):
 *   data-glossary-nav-offset   px between viewport top and the section when
 *                              scrolled to; also the tracking line (default 96)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var CLICK_LOCK_MS = 1100; // keep the clicked letter active while Lenis flies

  function build(root) {
    if (root._glossaryNavInit) return;                      // idempotent
    root._glossaryNavInit = true;

    var track = root.querySelector("[data-glossary-nav-track]");
    var letters = Array.from(root.querySelectorAll("[data-glossary-nav-letter]"));
    if (!track || !letters.length) {
      console.warn("[Sestek GlossaryNav] Need a [data-glossary-nav-track] with [data-glossary-nav-letter]s.");
      return;
    }

    var offset = parseFloat(root.getAttribute("data-glossary-nav-offset"));
    if (isNaN(offset)) offset = 96;

    var scope = document.querySelector("[data-glossary-nav-scope]");
    var reduce = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Letter ↔ section pairing ───────────────────────────────────
    function letterKey(el) {
      var v = el.getAttribute("data-glossary-nav-letter") || el.textContent || "";
      return v.trim().charAt(0).toUpperCase();
    }

    var pairs = []; // { letter, section, key } — only letters that have a section
    letters.forEach(function (el) {
      var key = letterKey(el);
      var section = key
        ? document.querySelector('[data-glossary-section="' + key + '"],[data-glossary-section="' + key.toLowerCase() + '"]')
        : null;
      if (section) {
        pairs.push({ letter: el, section: section, key: key });
      } else {
        el.classList.add("is-disabled");
        el.setAttribute("aria-disabled", "true");
        el.setAttribute("tabindex", "-1");
      }
    });

    if (!pairs.length) {
      console.warn("[Sestek GlossaryNav] No [data-glossary-section] blocks match the letters.");
      return;
    }

    // ── Indicator disc (JS-owned; CSS transition does the gliding) ─
    var indicator = document.createElement("span");
    indicator.className = "glossary-nav__indicator is-idle";
    indicator.setAttribute("aria-hidden", "true");
    track.insertBefore(indicator, track.firstChild);

    var active = null;      // currently active letter element
    var lockUntil = 0;      // timestamp — tracking paused after a click

    function syncOverflow() {
      track.classList.toggle("is-overflowing", track.scrollWidth > track.clientWidth + 1);
    }

    function placeIndicator() {
      if (!active) { indicator.classList.add("is-idle"); return; }
      indicator.classList.remove("is-idle");
      indicator.style.width = active.offsetWidth + "px";
      indicator.style.transform = "translateX(" + active.offsetLeft + "px)";
    }

    /** Keep the active letter visible inside the (possibly scrolling) track. */
    function revealInTrack(el) {
      if (track.scrollWidth <= track.clientWidth + 1) return;
      var target = el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2;
      track.scrollTo({
        left: Math.max(0, Math.min(target, track.scrollWidth - track.clientWidth)),
        behavior: reduce ? "auto" : "smooth",
      });
    }

    function setActive(el) {
      if (el === active) return;
      if (active) {
        active.classList.remove("is-active");
        active.removeAttribute("aria-current");
      }
      active = el;
      if (active) {
        active.classList.add("is-active");
        active.setAttribute("aria-current", "true");
        revealInTrack(active);
      }
      placeIndicator();
    }

    // ── Click → scroll to section ──────────────────────────────────
    pairs.forEach(function (pair) {
      pair.letter.addEventListener("click", function (e) {
        e.preventDefault();
        lockUntil = Date.now() + CLICK_LOCK_MS;
        setActive(pair.letter);

        var top = pair.section.getBoundingClientRect().top +
                  (global.pageYOffset || 0) - offset;

        // Prefer Lenis for an engine-consistent scroll (same as pagination.js).
        if (typeof global.Sestek !== "undefined" &&
            typeof global.Sestek.scrollTo === "function" &&
            global.lenisInstance) {
          global.Sestek.scrollTo(top, {
            duration: reduce ? 0 : 1,
            easing: function (t) { return 1 - Math.pow(1 - t, 3); },
          });
        } else {
          global.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" });
        }
      });
    });

    // ── Scroll tracking — active letter + bar visibility ───────────
    function update() {
      var vh = global.innerHeight || 0;
      syncOverflow();

      // Bar visibility: only while the glossary content occupies the viewport.
      if (scope) {
        var s = scope.getBoundingClientRect();
        root.classList.toggle("is-visible", s.top < vh * 0.85 && s.bottom > vh * 0.5);
      } else {
        root.classList.add("is-visible");
      }

      if (Date.now() < lockUntil) return;

      // Active letter: last section whose top has crossed the tracking line.
      var line = offset + 8;
      var current = null;
      for (var i = 0; i < pairs.length; i++) {
        var rect = pairs[i].section.getBoundingClientRect();
        if (rect.top <= line) current = pairs[i];
      }
      setActive(current ? current.letter : null);
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    }

    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll, { passive: true });
    // Fonts/images shifting layout after load move the letters — re-measure.
    global.addEventListener("load", function () { placeIndicator(); update(); });
    update();
  }

  /**
   * Initializes every glossary nav on the page in one call.
   * @param {string} [selector="[data-glossary-nav]"] narrow the scope if needed
   */
  function initGlossaryNav(selector) {
    var roots = document.querySelectorAll(selector || "[data-glossary-nav]");
    if (!roots.length) { console.warn("[Sestek GlossaryNav] No [data-glossary-nav] found."); return; }
    roots.forEach(build);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initGlossaryNav = initGlossaryNav;

})(typeof window !== "undefined" ? window : this);
