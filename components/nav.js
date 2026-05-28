/*!
 * nav.js v2.0.0
 * Mega-menu navbar — desktop hover panels + mobile slide-level menu
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v2.0.0 — full rewrite: 4-col panel layout, mobile level system,
 *           slider nav, back/brand cross-fade, body scroll lock,
 *           overlay gradient, cross-fade panel switch, full _destroy API
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  /**
   * Initialises the navigation component.
   * @param {string} [selector="[data-nav]"]
   * @returns {{ _destroy: Function } | undefined}
   */
  function initNav(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Nav] GSAP is required but not found.");
      return;
    }

    var nav = document.querySelector(selector || "[data-nav]");
    if (!nav) return;

    // ── Element refs ──────────────────────────────────────────────
    var triggers     = Array.from(nav.querySelectorAll("[data-nav-trigger]"));
    var panels       = Array.from(nav.querySelectorAll("[data-nav-panel]"));
    var dropdown     = nav.querySelector("[data-nav-dropdown]");
    var overlay      = nav.querySelector("[data-nav-overlay]");
    var navBar       = nav.querySelector("[data-nav-bar]");
    var hamburger    = nav.querySelector("[data-nav-hamburger]");
    var mobileMenu   = nav.querySelector("[data-nav-mobile]");
    var mobileClose  = nav.querySelector("[data-nav-mobile-close]");
    var mobileBack   = nav.querySelector("[data-nav-mobile-back]");
    var mobileBrand  = nav.querySelector("[data-nav-mobile-brand]");
    var mobileSlider = nav.querySelector("[data-nav-mobile-slider]");
    var mobileSub    = nav.querySelector("[data-nav-mobile-sub]");

    // Dropdown is the animatable height-container; bail hard without it.
    if (!dropdown) return;

    // ── Listeners registry ────────────────────────────────────────
    // Collecting all listeners so _destroy can remove every one.
    var _listeners = [];

    function on(el, type, fn) {
      if (!el) return;
      el.addEventListener(type, fn);
      _listeners.push({ el: el, type: type, fn: fn });
    }

    // ── Desktop state ─────────────────────────────────────────────
    var activeId   = null;
    var isOpen     = false;
    var closeTimer = null;

    // ── Panel helpers ─────────────────────────────────────────────
    function getPanel(id) {
      return nav.querySelector("[data-nav-panel='" + id + "']");
    }

    function getTrigger(id) {
      return nav.querySelector("[data-nav-trigger='" + id + "']");
    }

    /**
     * Briefly positions the panel as relative+invisible to read offsetHeight
     * without triggering a visible flash or a CSS transition.
     */
    function measurePanelHeight(id) {
      var p = getPanel(id);
      if (!p) return 0;
      var prevOpacity  = p.style.opacity;
      var prevPosition = p.style.position;
      p.style.opacity  = "0";
      p.style.position = "relative";
      var h = p.offsetHeight;
      p.style.opacity  = prevOpacity;
      p.style.position = prevPosition;
      return h;
    }

    function hideAllPanels() {
      panels.forEach(function (p) {
        p.classList.remove("is-active");
        gsap.set(p, { opacity: 0, pointerEvents: "none" });
      });
      triggers.forEach(function (t) {
        t.setAttribute("data-state", "closed");
      });
    }

    function activatePanel(id) {
      var p = getPanel(id);
      if (!p) return;
      p.classList.add("is-active");
      gsap.set(p, { opacity: 1, pointerEvents: "auto" });
      var t = getTrigger(id);
      if (t) t.setAttribute("data-state", "open");
    }

    // ── Open / switch ─────────────────────────────────────────────
    function openPanel(id) {
      clearTimeout(closeTimer);

      var targetPanel = getPanel(id);
      if (!targetPanel) return;

      var h = measurePanelHeight(id);

      if (!isOpen) {
        // First open: animate height from 0, no cross-fade needed.
        isOpen = true;
        nav.classList.add("nav--open");
        hideAllPanels();
        activatePanel(id);

        gsap.fromTo(dropdown,
          { height: 0 },
          { height: h, duration: 0.28, ease: "power3.out" }
        );

        if (overlay) {
          gsap.to(overlay, { opacity: 1, duration: 0.25, ease: "power2.out" });
        }

      } else if (activeId !== id) {
        // Already open: cross-fade outgoing → incoming, adjust height in parallel.
        var oldPanel    = getPanel(activeId);
        var prevTrigger = getTrigger(activeId);

        gsap.to(dropdown, { height: h, duration: 0.22, ease: "power2.inOut" });

        if (prevTrigger) prevTrigger.setAttribute("data-state", "closed");

        if (oldPanel) {
          gsap.to(oldPanel, {
            opacity  : 0,
            duration : 0.12,
            ease     : "power1.in",
            onComplete: function () {
              oldPanel.classList.remove("is-active");
              gsap.set(oldPanel, { pointerEvents: "none" });
              activatePanel(id);
              gsap.fromTo(targetPanel,
                { opacity: 0 },
                { opacity: 1, duration: 0.16, ease: "power1.out" }
              );
            },
          });
        } else {
          activatePanel(id);
        }

        activeId = id;
        return; // trigger state handled inside onComplete via activatePanel
      }

      // Sync outgoing trigger state when there was no oldPanel branch.
      if (activeId && activeId !== id) {
        var pt = getTrigger(activeId);
        if (pt) pt.setAttribute("data-state", "closed");
      }

      activeId = id;
    }

    // ── Close ─────────────────────────────────────────────────────
    function scheduleClose() {
      clearTimeout(closeTimer);
      // 180 ms grace period — lets the cursor travel from trigger to panel
      // without accidentally closing the dropdown.
      closeTimer = setTimeout(closeDropdown, 180);
    }

    function closeDropdown() {
      if (!isOpen) return;
      isOpen   = false;
      activeId = null;
      nav.classList.remove("nav--open");

      gsap.to(dropdown, { height: 0, duration: 0.22, ease: "power3.in" });

      if (overlay) {
        gsap.to(overlay, {
          opacity   : 0,
          duration  : 0.2,
          ease      : "power2.in",
          onComplete: hideAllPanels,
        });
      } else {
        gsap.delayedCall(0.22, hideAllPanels);
      }

      triggers.forEach(function (t) {
        t.setAttribute("data-state", "closed");
      });
    }

    // ── Trigger bindings ──────────────────────────────────────────
    triggers.forEach(function (trigger) {
      var id = trigger.dataset.navTrigger;
      if (!id) return;

      on(trigger, "mouseenter", function () { openPanel(id); });
      // keyboard users can tab-focus a trigger to open the panel
      on(trigger, "focus", function () { openPanel(id); });
      on(trigger, "click", function () {
        if (activeId === id && isOpen) closeDropdown();
        else openPanel(id);
      });
    });

    // ── Nav-bar + dropdown hover area ─────────────────────────────
    if (navBar) {
      on(navBar, "mouseleave", scheduleClose);
      // Cancel any pending close when re-entering the bar.
      on(navBar, "mouseenter", function () { clearTimeout(closeTimer); });
    }

    on(dropdown, "mouseleave", scheduleClose);
    on(dropdown, "mouseenter", function () { clearTimeout(closeTimer); });

    // ── Global dismissals ─────────────────────────────────────────
    on(document, "click", function (e) {
      if (!nav.contains(e.target)) closeDropdown();
    });

    on(document, "keydown", function (e) {
      if (e.key === "Escape") {
        closeDropdown();
        closeMobileMenu();
      }
    });

    // ── Mobile state ──────────────────────────────────────────────
    var mobileIsOpen  = false;
    var mobileAtLevel = 0; // 0 = main list, 1 = sub-panel

    function openMobileMenu() {
      if (mobileIsOpen || !mobileMenu) return;
      mobileIsOpen = true;
      nav.classList.add("nav--mobile-open");
      // Prevent body scroll while the full-screen menu is visible.
      document.body.style.overflow = "hidden";
      mobileMenu.removeAttribute("aria-hidden");
      if (hamburger) hamburger.setAttribute("data-state", "open");

      gsap.fromTo(mobileMenu,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.28, ease: "power3.out" }
      );
    }

    function closeMobileMenu() {
      if (!mobileIsOpen || !mobileMenu) return;

      // If mid-level, snap back instantly so DOM resets cleanly.
      if (mobileAtLevel === 1) snapToLevel0(false);

      mobileIsOpen = false;
      nav.classList.remove("nav--mobile-open");
      document.body.style.overflow = "";
      if (hamburger) hamburger.setAttribute("data-state", "closed");

      gsap.to(mobileMenu, {
        opacity   : 0,
        y         : 12,
        duration  : 0.2,
        ease      : "power2.in",
        onComplete: function () {
          mobileMenu.setAttribute("aria-hidden", "true");
        },
      });
    }

    // ── Mobile level 0 → 1 ───────────────────────────────────────
    function goToSubPanel(id) {
      var desktopPanel = getPanel(id);
      if (!desktopPanel || !mobileSub || !mobileSlider) return;

      // Inject the desktop panel's full markup. CSS (.nav__mobile-screen--sub
      // .nav__col--featured { display:none }) automatically hides the featured
      // column so the layout collapses to a single stacked column.
      mobileSub.innerHTML = desktopPanel.innerHTML;
      mobileAtLevel = 1;

      gsap.to(mobileSlider, {
        x        : -window.innerWidth,
        duration : 0.38,
        ease     : "power3.inOut",
      });

      crossFade(mobileBrand, mobileBack);
    }

    // ── Mobile level 1 → 0 ───────────────────────────────────────
    function snapToLevel0(animate) {
      if (!mobileSlider) return;
      mobileAtLevel = 0;

      gsap.to(mobileSlider, {
        x        : 0,
        duration : animate === false ? 0 : 0.35,
        ease     : "power3.inOut",
        onComplete: function () {
          // Discard injected sub-panel markup after the slide completes so
          // stale content never shows up on subsequent sub-panel visits.
          if (mobileSub) mobileSub.innerHTML = "";
        },
      });

      crossFade(mobileBack, mobileBrand);
    }

    // ── Brand / back cross-fade helper ────────────────────────────
    function crossFade(from, to) {
      if (from) {
        gsap.to(from, {
          opacity  : 0,
          duration : 0.15,
          ease     : "power1.in",
          onComplete: function () {
            from.style.display = "none";
            if (to) {
              to.style.display = "";
              gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power1.out" });
            }
          },
        });
      } else if (to) {
        to.style.display = "";
        gsap.fromTo(to, { opacity: 0 }, { opacity: 1, duration: 0.15, ease: "power1.out" });
      }
    }

    // ── Mobile bindings ───────────────────────────────────────────
    on(hamburger,   "click", openMobileMenu);
    on(mobileClose, "click", closeMobileMenu);
    on(mobileBack,  "click", function () { snapToLevel0(true); });

    // Delegate trigger clicks inside mobile list — avoids binding per-item.
    if (mobileMenu) {
      on(mobileMenu, "click", function (e) {
        var trigger = e.target.closest("[data-nav-mobile-trigger]");
        if (trigger) {
          e.preventDefault();
          goToSubPanel(trigger.dataset.navMobileTrigger);
        }
      });
    }

    // ── Initial state ─────────────────────────────────────────────
    gsap.set(dropdown, { height: 0 });
    if (overlay) gsap.set(overlay, { opacity: 0 });
    hideAllPanels();

    if (mobileMenu) {
      mobileMenu.setAttribute("aria-hidden", "true");
      gsap.set(mobileMenu, { opacity: 0, y: 12 });
    }

    if (mobileBack)   mobileBack.style.display  = "none";
    if (mobileBrand)  mobileBrand.style.display  = "";
    if (mobileSlider) gsap.set(mobileSlider, { x: 0 });

    // ── Public API ────────────────────────────────────────────────
    var instance = {
      _destroy: function () {
        clearTimeout(closeTimer);
        gsap.killTweensOf(dropdown);
        if (overlay)      gsap.killTweensOf(overlay);
        if (mobileMenu)   gsap.killTweensOf(mobileMenu);
        if (mobileSlider) gsap.killTweensOf(mobileSlider);
        panels.forEach(function (p) { gsap.killTweensOf(p); });
        document.body.style.overflow = "";

        _listeners.forEach(function (l) {
          l.el.removeEventListener(l.type, l.fn);
        });
        _listeners.length = 0;
      },
    };

    return instance;
  }

  global.Sestek         = global.Sestek || {};
  global.Sestek.initNav = initNav;

})(typeof window !== "undefined" ? window : this);
