/*!
 * nav.js v2.2.0
 * Mega-menu navbar — desktop hover panels + mobile slide-level menu
 * Requires: gsap (global)
 * Optional: Sestek.stopScroll/startScroll (Lenis) — locks virtual scroll too
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v2.2.0 — fix rapid panel-switch race (stale onComplete activating the wrong
 *           panel / stacked tweens / "gap" frame). Single reconciling open
 *           path with simultaneous cross-fade + directional micro-slide, every
 *           in-flight tween killed/overwritten first. Pending close-reset is
 *           cancelled on reopen. Adds aria-haspopup/expanded/controls, ↓-to-open,
 *           Esc returns focus, and prefers-reduced-motion support.
 * v2.1.1 — mobile menu also stops Lenis (virtual scroll) while open
 * v2.1.0 — auto-hide: [data-nav-hide] sections slide the nav off-screen
 *           while they cover the viewport (pin-friendly), back on exit
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
    var activeId     = null;
    var isOpen       = false;
    var closeTimer   = null;
    var pendingReset = null;   // GSAP delayedCall that resets panels after close

    // Honour reduced-motion: snap instead of animate (kept live via listener).
    var reduceMotion = false;
    var _mq = null, _onMq = null;
    if (global.matchMedia) {
      _mq = global.matchMedia("(prefers-reduced-motion: reduce)");
      reduceMotion = _mq.matches;
      _onMq = function (e) { reduceMotion = e.matches; };
      if (_mq.addEventListener) _mq.addEventListener("change", _onMq);
      else if (_mq.addListener) _mq.addListener(_onMq); // Safari < 14
    }

    // ── Panel helpers ─────────────────────────────────────────────
    function getPanel(id) {
      return nav.querySelector("[data-nav-panel='" + id + "']");
    }

    function getTrigger(id) {
      return nav.querySelector("[data-nav-trigger='" + id + "']");
    }

    function triggerIndex(id) {
      for (var i = 0; i < triggers.length; i++) {
        if (triggers[i].dataset.navTrigger === id) return i;
      }
      return -1;
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

    /** Sync a trigger's visual + a11y open state. */
    function markTrigger(t, open) {
      t.setAttribute("data-state", open ? "open" : "closed");
      t.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function hideAllPanels() {
      panels.forEach(function (p) {
        gsap.killTweensOf(p);
        p.classList.remove("is-active");
        gsap.set(p, { opacity: 0, x: 0, y: 0, pointerEvents: "none" });
      });
      triggers.forEach(function (t) { markTrigger(t, false); });
    }

    // ── Open / switch — single reconciling path ───────────────────
    /*
     * One function drives BOTH first-open and panel-to-panel switching. Each
     * call reconciles the entire state straight from the requested id, so no
     * matter how fast the user hovers across triggers it can never:
     *   • run a stale onComplete that activates the wrong (intermediate) panel,
     *   • stack height/opacity tweens that fight each other, or
     *   • show a "gap" frame where no panel is visible.
     * The outgoing panel fades out while the incoming fades in at the SAME time
     * (true cross-fade), the container height morphs in parallel, and every
     * in-flight tween is killed/overwritten first.
     */
    function openPanel(id) {
      clearTimeout(closeTimer);
      if (pendingReset) { pendingReset.kill(); pendingReset = null; }

      var targetPanel = getPanel(id);
      if (!targetPanel) return;
      if (isOpen && id === activeId) return; // already showing this one

      var wasOpen = isOpen;
      var fromId  = activeId;
      var h       = measurePanelHeight(id);
      // Slide direction follows the trigger order (left→right vs right→left).
      var dir = (wasOpen && fromId !== null)
        ? (triggerIndex(id) > triggerIndex(fromId) ? 1 : -1)
        : 0;

      isOpen   = true;
      activeId = id;
      nav.classList.add("nav--open");

      gsap.killTweensOf(dropdown);

      // Fade out every panel that isn't the target — simultaneously.
      panels.forEach(function (p) {
        if (p === targetPanel) return;
        gsap.killTweensOf(p);
        p.classList.remove("is-active");
        if (reduceMotion || gsap.getProperty(p, "opacity") === 0) {
          gsap.set(p, { opacity: 0, x: 0, y: 0, pointerEvents: "none" });
        } else {
          gsap.to(p, {
            opacity: 0, duration: 0.18, ease: "power2.out", overwrite: true,
            onComplete: function () { gsap.set(p, { pointerEvents: "none", x: 0, y: 0 }); },
          });
        }
      });

      // Activate the target up-front (state is never deferred to a callback).
      gsap.killTweensOf(targetPanel);
      targetPanel.classList.add("is-active");
      gsap.set(targetPanel, { pointerEvents: "auto" });

      triggers.forEach(function (t) { markTrigger(t, t.dataset.navTrigger === id); });

      if (reduceMotion) {
        gsap.set(dropdown, { height: h });
        gsap.set(targetPanel, { opacity: 1, x: 0, y: 0 });
        if (overlay) gsap.set(overlay, { opacity: 1 });
        return;
      }

      // Height morphs from its CURRENT value (0 closed, old height when
      // switching, mid-value when reopening during a close) → never jumps.
      gsap.to(dropdown, { height: h, duration: wasOpen ? 0.26 : 0.3, ease: "power3.out" });

      if (overlay) {
        gsap.to(overlay, { opacity: 1, duration: 0.25, ease: "power2.out" });
      }

      // Incoming reveal: a small directional slide when switching panels, a
      // gentle lift on first open.
      var fromVars = wasOpen ? { opacity: 0, x: dir * 18, y: 0 }
                             : { opacity: 0, x: 0, y: 8 };
      gsap.fromTo(targetPanel, fromVars, {
        opacity: 1, x: 0, y: 0, duration: 0.26, ease: "power3.out", overwrite: true,
      });
    }

    // ── Close ─────────────────────────────────────────────────────
    function scheduleClose() {
      clearTimeout(closeTimer);
      // 180 ms grace period — lets the cursor travel from trigger to panel
      // without accidentally closing the dropdown.
      closeTimer = setTimeout(function () { closeDropdown(); }, 180);
    }

    function closeDropdown(opts) {
      if (!isOpen) return;
      isOpen = false;
      var closingId = activeId;
      activeId = null;
      nav.classList.remove("nav--open");

      triggers.forEach(function (t) { markTrigger(t, false); });

      gsap.killTweensOf(dropdown);
      if (pendingReset) { pendingReset.kill(); pendingReset = null; }

      if (reduceMotion) {
        gsap.set(dropdown, { height: 0 });
        if (overlay) gsap.set(overlay, { opacity: 0 });
        hideAllPanels();
      } else {
        gsap.to(dropdown, { height: 0, duration: 0.24, ease: "power3.inOut" });
        if (overlay) {
          gsap.to(overlay, { opacity: 0, duration: 0.2, ease: "power2.in" });
        }
        // Reset panels after the collapse. Tracked so a reopen within the
        // window cancels it (else it would wipe the freshly-opened panel).
        pendingReset = gsap.delayedCall(0.24, function () {
          pendingReset = null;
          hideAllPanels();
        });
      }

      // Keyboard close returns focus to the trigger that was open.
      if (opts && opts.focus && closingId) {
        var t = getTrigger(closingId);
        if (t) t.focus();
      }
    }

    // ── Trigger bindings ──────────────────────────────────────────
    triggers.forEach(function (trigger) {
      var id = trigger.dataset.navTrigger;
      if (!id) return;

      // a11y: announce the trigger controls a pop-up panel.
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      var panel = getPanel(id);
      if (panel) {
        if (!panel.id) panel.id = "nav-panel-" + id;
        trigger.setAttribute("aria-controls", panel.id);
      }

      on(trigger, "mouseenter", function () { openPanel(id); });
      on(trigger, "click", function () {
        if (activeId === id && isOpen) closeDropdown();
        else openPanel(id);
      });
      // Keyboard: open with Enter/Space/↓ (click already covers Enter/Space on
      // a <button>; ArrowDown opens without following a link).
      on(trigger, "keydown", function (e) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          openPanel(id);
        }
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
        closeDropdown({ focus: true });   // return focus to the open trigger
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
      // overflow:hidden alone doesn't stop Lenis (virtual scroll) — stop it too.
      document.body.style.overflow = "hidden";
      if (global.Sestek && typeof global.Sestek.stopScroll === "function") {
        global.Sestek.stopScroll();
      }
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
      if (global.Sestek && typeof global.Sestek.startScroll === "function") {
        global.Sestek.startScroll();
      }
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

    // ── Adaptive theme (light/dark background detection) ─────────
    // Sections declare their background via [data-nav-theme="light|dark"].
    // When a light-background section scrolls behind the nav bar,
    // .nav--on-light is toggled so CSS variables flip text to dark.
    var _themeObserver = null;

    (function initAdaptiveTheme() {
      var themed = Array.from(document.querySelectorAll("[data-nav-theme]"));
      if (!themed.length || !("IntersectionObserver" in window)) return;

      var navH = nav.offsetHeight || 60;

      _themeObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var isLight = entry.target.dataset.navTheme === "light";
              nav.classList.toggle("nav--on-light", isLight);
            }
          });
        },
        {
          // The observation band is exactly the nav bar's height at the top.
          rootMargin: "-" + navH + "px 0px -" + (window.innerHeight - navH - 1) + "px 0px",
          threshold: 0,
        }
      );

      themed.forEach(function (el) { _themeObserver.observe(el); });
    })();

    // ── Auto-hide on [data-nav-hide] sections ────────────────────
    // Any section with [data-nav-hide] slides the nav off the top while it
    // covers the viewport (e.g. a pinned scroll-tabs section), then the nav
    // eases back when the section ends. Works with pinned sections because
    // the observed element stays fixed across the top of the viewport.
    var _hideObserver = null;

    (function initNavHide() {
      var hideEls = Array.from(document.querySelectorAll("[data-nav-hide]"));
      if (!hideEls.length || !("IntersectionObserver" in window)) return;

      _hideObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              nav.classList.add("nav--hidden");
              closeDropdown();     // tidy up any open mega-menu before hiding
            } else {
              nav.classList.remove("nav--hidden");
            }
          });
        },
        // Root collapses to a 1px line at the very top of the viewport.
        // The section "intersects" only while it spans that line — i.e. while
        // its top is above and its bottom below the viewport top edge.
        { rootMargin: "0px 0px -100% 0px", threshold: 0 }
      );

      hideEls.forEach(function (el) { _hideObserver.observe(el); });
    })();

    // ── Public API ────────────────────────────────────────────────
    var instance = {
      _destroy: function () {
        clearTimeout(closeTimer);
        if (pendingReset) { pendingReset.kill(); pendingReset = null; }
        if (_mq && _onMq) {
          if (_mq.removeEventListener) _mq.removeEventListener("change", _onMq);
          else if (_mq.removeListener) _mq.removeListener(_onMq);
        }
        gsap.killTweensOf(dropdown);
        if (overlay)      gsap.killTweensOf(overlay);
        if (mobileMenu)   gsap.killTweensOf(mobileMenu);
        if (mobileSlider) gsap.killTweensOf(mobileSlider);
        panels.forEach(function (p) { gsap.killTweensOf(p); });
        document.body.style.overflow = "";
        if (_themeObserver) _themeObserver.disconnect();
        if (_hideObserver)  _hideObserver.disconnect();

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
