/*!
 * demo-builder.js v0.3.0
 * Two-state "request a voice-AI demo" widget. State 1 (selecting): an intro on
 * the left + a list of industry sectors on the right. Pick a sector and it
 * cross-fades into State 2 (form): the selecting halves (intro + sectors) fade
 * and lift away, then the form halves (the sector's description + a lead form)
 * bloom in. A back button returns to State 1. Webflow owns ALL visual design —
 * this only drives state, motion, locale and submit.
 *
 * Requires : gsap (global) for the transition. ScrollTrigger / Flip NOT needed.
 *   <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
 * (Without gsap the widget still works — it just swaps states instantly.)
 *
 * CSS : css/components/demo-builder.css (owns the state layout + show/hide)
 *
 * DOM (Webflow — design everything inside; only the attributes matter):
 *   [data-demo]                                root
 *     [data-demo-stage]                        the morphing 2-column grid
 *       [data-demo-intro]                      LEFT — shown while selecting
 *       [data-demo-detail]                     LEFT — shown in form state
 *         [data-demo-back]                     back button
 *         [data-demo-detail-block="banking"]   per-sector copy (matching one shown)
 *         [data-demo-detail-block="retail"]    …
 *       [data-demo-sectors]                    RIGHT — shown while selecting
 *         [data-demo-sector="banking"]         a sector card (acts as a button)
 *         [data-demo-sector="retail"]          …
 *       [data-demo-panel]                      RIGHT — shown in form state
 *         [data-demo-form]                     the <form> (name + phone …)
 *           [data-demo-phone]                  phone field (or name="phone")
 *           [data-demo-kvkk]                   KVKK consent row — TR only (CSS hides in EN)
 *         [data-demo-calling]                  optional "AI is calling you…" takeover
 *
 * Optional:
 *   [data-demo-active-label]   anywhere inside → filled with the sector's name
 *   ?demo-sector=banking       deep-links straight into that sector's form state
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var doc = global.document;

  function slice(list) { return Array.prototype.slice.call(list || []); }
  function filterEls(list) { return list.filter(function (el) { return !!el; }); }
  function prefersReduced() {
    return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function hasGsap() { return typeof global.gsap !== "undefined"; }
  function isTR() {
    return (doc.documentElement.lang || "").toLowerCase().indexOf("tr") === 0;
  }

  /** Initialise every [data-demo] on the page. */
  function initDemoBuilder(selector) {
    var roots = slice(doc.querySelectorAll(selector || "[data-demo]"));
    roots.forEach(setup);
    return roots;
  }

  function setup(root) {
    if (root._demoInit) return;
    root._demoInit = true;
    root._demoState = "selecting";

    // Sector cards act as buttons.
    slice(root.querySelectorAll("[data-demo-sector]")).forEach(function (card) {
      if (!card.hasAttribute("role")) card.setAttribute("role", "button");
      if (!card.hasAttribute("tabindex") && card.tagName !== "BUTTON" && card.tagName !== "A") {
        card.setAttribute("tabindex", "0");
      }
      card.addEventListener("click", function (e) {
        e.preventDefault();
        selectSector(root, card, card.getAttribute("data-demo-sector"), !prefersReduced());
      });
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          selectSector(root, card, card.getAttribute("data-demo-sector"), !prefersReduced());
        }
      });
    });

    var back = root.querySelector("[data-demo-back]");
    if (back) back.addEventListener("click", function (e) {
      e.preventDefault();
      goBack(root, !prefersReduced());
    });

    wireForm(root);

    // Deep-link: ?demo-sector=banking opens that sector straight away.
    var match = (global.location.search || "").match(/[?&]demo-sector=([^&]+)/);
    if (match) {
      var key  = decodeURIComponent(match[1]);
      var card = root.querySelector('[data-demo-sector="' + cssEsc(key) + '"]');
      if (card) selectSector(root, card, key, false);
    }
  }

  // ── State 1 → 2 ─────────────────────────────────────────────────
  function selectSector(root, card, key, animate) {
    if (root._demoState === "form" || !card) return;
    root._demoState = "form";

    showDetailBlock(root, key);
    setLabel(root, card);

    // Robust cross-fade — NO Flip, NO reparenting, NO absolute positioning.
    // (Flip's absolute/reparent morph fought Webflow's nested, padded, styled
    //  containers and flung elements to wrong spots.) The selecting halves fade
    //  + lift away, the state commits (CSS swaps which halves show), then the
    //  form halves bloom up. Everything animates within its own box, so it can
    //  never fly off — works with any background, padding or nesting.
    var outgoing  = filterEls([root.querySelector("[data-demo-intro]"),
                               root.querySelector("[data-demo-sectors]")]);
    var incomingF = function () {
      return filterEls([root.querySelector("[data-demo-detail]"),
                        root.querySelector("[data-demo-panel]")]);
    };

    function reveal() {
      root.classList.add("is-form");
      root.setAttribute("data-demo-active", key);
      if (animate && hasGsap()) {
        global.gsap.set(outgoing, { clearProps: "all" });
        global.gsap.fromTo(incomingF(), { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out",
            clearProps: "opacity,transform" });
      }
      focusFirstField(root);
    }

    if (animate && hasGsap() && outgoing.length) {
      global.gsap.to(outgoing, { opacity: 0, y: -12, duration: 0.3, ease: "power2.in", onComplete: reveal });
    } else {
      reveal();
    }
  }

  // ── State 2 → 1 ─────────────────────────────────────────────────
  function goBack(root, animate) {
    if (root._demoState !== "form") return;
    root._demoState = "selecting";
    root.classList.remove("is-calling");

    var backKey  = root.getAttribute("data-demo-active");
    var outgoing = filterEls([root.querySelector("[data-demo-detail]"),
                              root.querySelector("[data-demo-panel]")]);
    var incomingF = function () {
      return filterEls([root.querySelector("[data-demo-intro]"),
                        root.querySelector("[data-demo-sectors]")]);
    };

    function reveal() {
      root.classList.remove("is-form");
      root.removeAttribute("data-demo-active");
      if (animate && hasGsap()) {
        global.gsap.set(outgoing, { clearProps: "all" });
        global.gsap.fromTo(incomingF(), { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out",
            clearProps: "opacity,transform" });
      } else {
        incomingF().forEach(function (el) { el.style.opacity = ""; el.style.transform = ""; });
      }
      var card = backKey && root.querySelector('[data-demo-sector="' + cssEsc(backKey) + '"]');
      if (card && card.focus) card.focus();
    }

    if (animate && hasGsap() && outgoing.length) {
      global.gsap.to(outgoing, { opacity: 0, y: -12, duration: 0.3, ease: "power2.in", onComplete: reveal });
    } else {
      reveal();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────
  function showDetailBlock(root, key) {
    slice(root.querySelectorAll("[data-demo-detail-block]")).forEach(function (b) {
      b.style.display = b.getAttribute("data-demo-detail-block") === key ? "" : "none";
    });
  }

  function setLabel(root, card) {
    var name = card.getAttribute("data-demo-sector-name") ||
      (card.querySelector("[data-demo-sector-title]") || {}).textContent || "";
    slice(root.querySelectorAll("[data-demo-active-label]")).forEach(function (el) {
      el.textContent = name;
    });
  }

  function focusFirstField(root) {
    var field = root.querySelector("[data-demo-panel] input, [data-demo-panel] select, [data-demo-panel] textarea");
    if (field && field.focus) {
      try { field.focus({ preventScroll: true }); } catch (e) { field.focus(); }
    }
  }

  function wireForm(root) {
    var form = root.querySelector("[data-demo-form]");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(root, form)) return;

      // UI-only for now: flip the form area to the "AI is calling you" state.
      // Wire the dialer here later (POST phone + data-demo-active sector).
      root.classList.add("is-calling");
      var calling = root.querySelector("[data-demo-calling]");
      if (calling && hasGsap()) {
        global.gsap.fromTo(calling, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45 });
      }
    });
  }

  function validate(root, form) {
    var phone = form.querySelector("[data-demo-phone], [name='phone']");
    if (phone && !String(phone.value || "").trim()) {
      phone.focus();
      return false;
    }
    if (isTR()) {
      var kvkk = form.querySelector("[data-demo-kvkk] input[type='checkbox'], input[name='kvkk']");
      if (kvkk && !kvkk.checked) {
        kvkk.focus();
        return false;
      }
    }
    return true;
  }

  // Minimal CSS.escape fallback for attribute-value selectors.
  function cssEsc(s) {
    if (global.CSS && global.CSS.escape) return global.CSS.escape(s);
    return String(s).replace(/["\\\]]/g, "\\$&");
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initDemoBuilder = initDemoBuilder;

})(typeof window !== "undefined" ? window : this);
