/*!
 * nav.js v1.0.0
 * Ramp-style navbar — frosted glass, animated mega-menu dropdown
 * Requires: gsap (global)
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  function initNav(selector) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Nav] GSAP required.");
      return;
    }

    var nav = document.querySelector(selector || "[data-nav]");
    if (!nav) return;

    var triggers   = Array.from(nav.querySelectorAll("[data-nav-trigger]"));
    var panels     = Array.from(nav.querySelectorAll("[data-nav-panel]"));
    var dropdown   = nav.querySelector("[data-nav-dropdown]");
    var overlay    = nav.querySelector("[data-nav-overlay]");
    var hamburger  = nav.querySelector("[data-nav-hamburger]");
    var mobileMenu = nav.querySelector("[data-nav-mobile]");

    if (!dropdown) return;

    // ── State ─────────────────────────────────────────────────
    var activeId    = null;
    var isOpen      = false;
    var closeTimer  = null;

    // ── Panel helpers ─────────────────────────────────────────
    function getPanel(id) {
      return nav.querySelector("[data-nav-panel='" + id + "']");
    }

    function getTrigger(id) {
      return nav.querySelector("[data-nav-trigger='" + id + "']");
    }

    function panelHeight(id) {
      var p = getPanel(id);
      if (!p) return 0;
      // Measure natural height without animation constraints
      var prev = p.style.display;
      p.style.display = "block";
      var h = p.offsetHeight;
      p.style.display = prev;
      return h;
    }

    // ── Open / switch panel ───────────────────────────────────
    function openPanel(id) {
      clearTimeout(closeTimer);

      var targetPanel = getPanel(id);
      if (!targetPanel) return;

      var h = panelHeight(id);

      if (!isOpen) {
        // First open — animate height from 0
        isOpen = true;
        nav.classList.add("nav--open");

        // Show correct panel instantly before animating
        hideAllPanels();
        showPanel(id);

        gsap.fromTo(dropdown, { height: 0 }, {
          height   : h,
          duration : 0.28,
          ease     : "power3.out",
        });
        gsap.to(overlay, { opacity: 1, duration: 0.25, ease: "power2.out" });

      } else if (activeId !== id) {
        // Switch panel — cross-fade + adjust height if needed
        var oldPanel = getPanel(activeId);

        gsap.to(dropdown, { height: h, duration: 0.22, ease: "power2.inOut" });

        if (oldPanel) {
          gsap.to(oldPanel, {
            opacity  : 0,
            duration : 0.12,
            ease     : "power1.in",
            onComplete: function () {
              oldPanel.classList.remove("is-active");
              oldPanel.style.pointerEvents = "none";
              showPanel(id);
              gsap.fromTo(targetPanel, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "power1.out" });
            },
          });
          return; // showPanel called in onComplete
        } else {
          showPanel(id);
        }
      }

      // Update trigger states
      if (activeId && activeId !== id) {
        var prevTrigger = getTrigger(activeId);
        if (prevTrigger) prevTrigger.setAttribute("data-state", "closed");
      }
      var currTrigger = getTrigger(id);
      if (currTrigger) currTrigger.setAttribute("data-state", "open");

      activeId = id;
    }

    function showPanel(id) {
      var p = getPanel(id);
      if (!p) return;
      p.classList.add("is-active");
      p.style.pointerEvents = "auto";
      gsap.set(p, { opacity: 1 });

      var t = getTrigger(id);
      if (t) t.setAttribute("data-state", "open");
    }

    function hideAllPanels() {
      panels.forEach(function (p) {
        p.classList.remove("is-active");
        p.style.pointerEvents = "none";
        gsap.set(p, { opacity: 0 });
      });
      triggers.forEach(function (t) {
        t.setAttribute("data-state", "closed");
      });
    }

    // ── Close ─────────────────────────────────────────────────
    function scheduleClose() {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(closeDropdown, 180);
    }

    function closeDropdown() {
      if (!isOpen) return;
      isOpen   = false;
      activeId = null;
      nav.classList.remove("nav--open");

      gsap.to(dropdown, { height: 0, duration: 0.22, ease: "power3.in" });
      gsap.to(overlay,  { opacity: 0, duration: 0.2,  ease: "power2.in",
        onComplete: hideAllPanels,
      });

      triggers.forEach(function (t) {
        t.setAttribute("data-state", "closed");
      });
    }

    // ── Trigger events ────────────────────────────────────────
    triggers.forEach(function (trigger) {
      var id = trigger.dataset.navTrigger;
      if (!id) return;

      trigger.addEventListener("mouseenter", function () {
        openPanel(id);
      });

      trigger.addEventListener("focus", function () {
        openPanel(id);
      });

      trigger.addEventListener("click", function () {
        if (activeId === id && isOpen) {
          closeDropdown();
        } else {
          openPanel(id);
        }
      });
    });

    // ── Nav-area mouse leave / enter ──────────────────────────
    var navBar = nav.querySelector("[data-nav-bar]");
    if (navBar) {
      navBar.addEventListener("mouseleave", scheduleClose);
      navBar.addEventListener("mouseenter", function () {
        clearTimeout(closeTimer);
      });
    }

    if (dropdown) {
      dropdown.addEventListener("mouseleave", scheduleClose);
      dropdown.addEventListener("mouseenter", function () {
        clearTimeout(closeTimer);
      });
    }

    // ── Click outside ─────────────────────────────────────────
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) closeDropdown();
    });

    // ── Escape ────────────────────────────────────────────────
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeDropdown();
    });

    // ── Mobile hamburger ──────────────────────────────────────
    var mobileOpen = false;

    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () {
        mobileOpen = !mobileOpen;
        hamburger.setAttribute("data-state", mobileOpen ? "open" : "closed");
        nav.classList.toggle("nav--mobile-open", mobileOpen);

        if (mobileOpen) {
          mobileMenu.removeAttribute("aria-hidden");
          gsap.fromTo(mobileMenu,
            { opacity: 0, y: -8 },
            { opacity: 1, y: 0, duration: 0.25, ease: "power3.out" }
          );
        } else {
          gsap.to(mobileMenu, {
            opacity  : 0,
            y        : -8,
            duration : 0.18,
            ease     : "power2.in",
            onComplete: function () {
              mobileMenu.setAttribute("aria-hidden", "true");
            },
          });
        }
      });
    }

    // ── Initial state ─────────────────────────────────────────
    gsap.set(dropdown, { height: 0 });
    if (overlay) gsap.set(overlay, { opacity: 0 });
    hideAllPanels();
  }

  global.Sestek         = global.Sestek || {};
  global.Sestek.initNav = initNav;

})(typeof window !== "undefined" ? window : this);
