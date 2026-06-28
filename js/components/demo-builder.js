/*!
 * demo-builder.js v0.2.0
 * Two-state "request a voice-AI demo" widget. State 1 (selecting): an intro on
 * the left + a list of industry sectors on the right. Pick a sector and it
 * FLIP-animates into State 2 (form): the chosen sector card slides to the LEFT
 * (its description appears under it) and a lead form expands on the RIGHT. A
 * back button returns to State 1. Webflow owns ALL visual design — this only
 * drives state, motion, locale and submit.
 *
 * Requires : gsap (global) + Flip plugin (global). ScrollTrigger NOT needed.
 *   <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/Flip.min.js"></script>
 * (Flip is free in GSAP 3.12+. Without it the widget still works — instant, no
 *  position morph. Without gsap at all it falls back to plain class toggles.)
 *
 * CSS : css/components/demo-builder.css (owns the state layout + show/hide)
 *
 * DOM (Webflow — design everything inside; only the attributes matter):
 *   [data-demo]                                root
 *     [data-demo-stage]                        the morphing 2-column grid
 *       [data-demo-intro]                      LEFT — shown while selecting
 *       [data-demo-detail]                     LEFT — shown in form state
 *         [data-demo-back]                     back button
 *         [data-demo-detail-host]              the chosen card is moved in here
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
  function prefersReduced() {
    return global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function hasGsap() { return typeof global.gsap !== "undefined"; }
  function hasFlip() { return typeof global.Flip !== "undefined"; }
  function isTR() {
    return (doc.documentElement.lang || "").toLowerCase().indexOf("tr") === 0;
  }

  /** Initialise every [data-demo] on the page. */
  function initDemoBuilder(selector) {
    if (hasGsap() && hasFlip()) global.gsap.registerPlugin(global.Flip);
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

    var host    = root.querySelector("[data-demo-detail-host]");
    var intro   = root.querySelector("[data-demo-intro]");
    var sectors = root.querySelector("[data-demo-sectors]");
    var panel   = root.querySelector("[data-demo-panel]");

    // Remember the card's home slot so back can restore its exact position.
    card._demoHome = { parent: card.parentNode, next: card.nextElementSibling };

    showDetailBlock(root, key);
    setLabel(root, card);

    // The OTHER cards + the intro are what leave the selecting view; the chosen
    // card travels to the detail slot. Capturing them all in ONE Flip state and
    // committing the layout once gives a single smooth timeline (no two-phase
    // fade-then-flip stutter). absolute:true pins the leaving cards out of flow
    // as they fade + shrink in place, so the remaining items never jump to
    // backfill the gap — they make room instead of repositioning.
    var others = slice(sectors ? sectors.querySelectorAll("[data-demo-sector]") : [])
      .filter(function (c) { return c !== card; });
    var leaving = others.concat(intro ? [intro] : []);

    if (!animate || !hasGsap() || !hasFlip()) {
      if (host) host.appendChild(card);
      root.classList.add("is-form");
      root.setAttribute("data-demo-active", key);
      focusFirstField(root);
      return;
    }

    var state = global.Flip.getState([card].concat(leaving), { props: "opacity" });

    if (host) host.appendChild(card);
    root.classList.add("is-form");
    root.setAttribute("data-demo-active", key);

    global.Flip.from(state, {
      duration: 0.7,
      ease: "power2.inOut",
      absolute: true,
      nested: true,
      onLeave: function (els) {
        return global.gsap.to(els, {
          opacity: 0, scale: 0.9, duration: 0.4,
          stagger: { each: 0.05, from: "end" }, ease: "power2.in",
        });
      },
    });

    // Entering content (description + form) is animated OUTSIDE Flip and with a
    // small delay, so the travelling card — now inside the detail column — is
    // never wrapped in a fading parent, and the form blooms in just after the
    // card lands. Reads as a staged, premium timeline rather than one pop.
    var enter = [];
    var block = root.querySelector('[data-demo-detail-block="' + cssEsc(key) + '"]');
    if (block) enter.push(block);
    if (panel) enter = enter.concat(slice(panel.children));
    if (enter.length) {
      global.gsap.fromTo(enter, { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.06, delay: 0.18,
          ease: "power3.out", clearProps: "opacity,transform" });
    }

    focusFirstField(root);
  }

  // ── State 2 → 1 ─────────────────────────────────────────────────
  function goBack(root, animate) {
    if (root._demoState !== "form") return;
    root._demoState = "selecting";
    root.classList.remove("is-calling");

    var key     = root.getAttribute("data-demo-active");
    var card    = key && root.querySelector('[data-demo-sector="' + cssEsc(key) + '"]');
    var intro   = root.querySelector("[data-demo-intro]");
    var sectors = root.querySelector("[data-demo-sectors]");
    var panel   = root.querySelector("[data-demo-panel]");

    var others = slice(sectors ? sectors.querySelectorAll("[data-demo-sector]") : [])
      .filter(function (c) { return c !== card; });
    var entering = others.concat(intro ? [intro] : []);

    if (!animate || !hasGsap() || !hasFlip() || !card) {
      if (card && card._demoHome) card._demoHome.parent.insertBefore(card, card._demoHome.next);
      root.classList.remove("is-form");
      root.removeAttribute("data-demo-active");
      entering.forEach(function (el) { el.style.opacity = ""; el.style.transform = ""; });
      if (card && card.focus) card.focus();
      return;
    }

    // Quietly drop the form side first so it doesn't pop, then flip the card
    // home while the other cards + intro bloom back in (the mirror of select).
    if (panel) global.gsap.to(slice(panel.children), { opacity: 0, duration: 0.2, ease: "power1.in" });

    var state = global.Flip.getState([card].concat(entering), { props: "opacity" });

    card._demoHome.parent.insertBefore(card, card._demoHome.next);
    root.classList.remove("is-form");
    root.removeAttribute("data-demo-active");

    global.Flip.from(state, {
      duration: 0.6,
      ease: "power2.inOut",
      absolute: true,
      nested: true,
      onEnter: function (els) {
        return global.gsap.fromTo(els, { opacity: 0, scale: 0.92 },
          { opacity: 1, scale: 1, duration: 0.45, stagger: { each: 0.05 },
            ease: "power2.out", clearProps: "opacity,transform" });
      },
    });

    if (card && card.focus) card.focus();
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
