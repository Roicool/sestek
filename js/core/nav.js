/*!
 * nav.js v2.6.0
 * Mega-menu navbar — desktop hover panels + mobile slide-level menu
 * Requires: gsap (global)
 * Optional: Sestek.stopScroll/startScroll (Lenis) — locks virtual scroll too
 * https://github.com/roicool/sestek
 *
 * Changelog
 * v2.6.0 — the dropdown now MORPHS width as well as height: each mega-menu is
 *           measured at its own natural width (capped to the bar) and the
 *           container glides between differently-sized menus, growing from /
 *           collapsing to a centred point with an expo morph — a premium
 *           magic-move feel. The active panel is pinned to its measured width
 *           so its columns stay rigid while the box reveals them. Pair with the
 *           CSS that ties the dropdown shadow to .nav--open so the shadow fades
 *           in on open and lifts off the page once every menu is closed.
 * v2.5.0 — remove the adaptive light/dark theme system entirely
 *           ([data-nav-theme], .nav--on-light/.nav--on-dark, Sestek.setNavTheme,
 *           the ScrollTrigger/IntersectionObserver detection). The bar now uses
 *           one fixed background colour; use [data-nav-autohide] so it slides
 *           cleanly out of the way on scroll-down instead of changing colour.
 * v2.4.0 — add [data-nav-autohide] on the nav root: hides the bar (slide up +
 *           fade, via .nav--hidden) while scrolling down, brings it back while
 *           scrolling up. rAF-throttled scroll listener, ignores small jitter,
 *           never hides at the very top, and steps aside while a mega-menu is
 *           open.
 * v2.3.2 — add Sestek.setNavTheme("dark"|"light"|"auto") for cases auto-detect
 *           can't see (pinned hero whose bg changes via a scrubbed animation,
 *           or any scripted moment). Manual mode pauses auto-detection; "auto"
 *           resumes it and re-evaluates. Also on instance as .setTheme().
 * v2.3.1 — adaptive theme now toggles BOTH .nav--on-light and .nav--on-dark so
 *           it works whether the bar's default is dark (style on-light) or
 *           light (style on-dark). [data-nav-theme] can sit on inner blocks,
 *           not just sections, to mark light/dark zones within one section.
 * v2.3.0 — richer open animation: inner items now cascade in (stagger) over an
 *           expo.out height morph + subtle scale, so panels feel alive instead
 *           of a flat fade. Adds a sliding active-trigger indicator (underline
 *           that glides under the open menu) — auto-created, or bring your own
 *           [data-nav-indicator]; disable with initNav(sel, { indicator:false }).
 *           Mark custom cascade items with [data-nav-stagger]. Adaptive theme
 *           ([data-nav-theme]) now uses ScrollTrigger when available so it stays
 *           correct on pages that PIN sections (IntersectionObserver fallback).
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
  function initNav(selector, options) {
    if (typeof gsap === "undefined") {
      console.error("[Sestek Nav] GSAP is required but not found.");
      return;
    }

    options = options || {};

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

    // ── Active-trigger indicator (sliding underline) ──────────────
    // A small bar that slides under the open trigger so it's always clear
    // which mega-menu is active. Opt-in element [data-nav-indicator] is used
    // if present; otherwise one is created (unless options.indicator === false)
    // and parented to the position:relative nav bar. Colour/height come from
    // CSS (--nav-indicator-color / styling [data-nav-indicator] in Webflow).
    var indicator = nav.querySelector("[data-nav-indicator]");
    if (!indicator && options.indicator !== false && navBar) {
      indicator = document.createElement("span");
      indicator.setAttribute("data-nav-indicator", "");
      navBar.appendChild(indicator);
    }
    if (indicator) {
      // The indicator is absolutely positioned against the bar, so the bar must
      // be a positioning context. (The component CSS already sets this, but the
      // nav may be built in Webflow without it.)
      var host = indicator.parentElement || navBar;
      if (host && global.getComputedStyle &&
          global.getComputedStyle(host).position === "static") {
        host.style.position = "relative";
      }
    }
    if (indicator) {
      // Inline fallbacks so it works even without the component CSS loaded.
      var iSt = indicator.style;
      if (!iSt.position) iSt.position = "absolute";
      iSt.bottom = iSt.bottom || "0";
      iSt.left = "0";
      iSt.pointerEvents = "none";
      if (!iSt.height) iSt.height = "2px";
      if (!iSt.borderRadius) iSt.borderRadius = "2px";
      if (!iSt.background) iSt.background = "var(--nav-indicator-color, currentColor)";
      gsap.set(indicator, { opacity: 0, width: 0, x: 0 });
    }

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
     * Briefly positions the panel as relative + shrink-to-content + invisible
     * to read BOTH its natural width and height (no visible flash, no CSS
     * transition). Width is capped to the available bar width so a very wide
     * panel can never overflow the page. This is what lets each mega-menu have
     * its own width and the container morph between them.
     */
    function measurePanel(id) {
      var p = getPanel(id);
      if (!p) return { w: 0, h: 0 };
      var s = p.style;
      var prev = {
        opacity : s.opacity, position: s.position, width: s.width,
        maxWidth: s.maxWidth, left: s.left, right: s.right,
      };
      s.opacity  = "0";
      s.position = "relative";
      s.left     = "auto";
      s.right    = "auto";
      s.width    = "max-content";
      // Cap to the wrap's width so an over-wide panel doesn't break the page.
      var capEl = (dropdown.parentElement || dropdown);
      var cap   = capEl.clientWidth || 0;
      if (cap) s.maxWidth = cap + "px";
      var w = p.offsetWidth;
      var h = p.offsetHeight;
      s.opacity  = prev.opacity;
      s.position = prev.position;
      s.width    = prev.width;
      s.maxWidth = prev.maxWidth;
      s.left     = prev.left;
      s.right    = prev.right;
      return { w: w, h: h };
    }

    /** Sync a trigger's visual + a11y open state. */
    function markTrigger(t, open) {
      t.setAttribute("data-state", open ? "open" : "closed");
      t.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function hideAllPanels() {
      panels.forEach(function (p) {
        gsap.killTweensOf(p);
        gsap.killTweensOf(staggerTargets(p));
        p.classList.remove("is-active");
        gsap.set(p, { opacity: 0, x: 0, y: 0, pointerEvents: "none" });
        // Drop the pinned measure-width so it's re-read fresh next open.
        p.style.width = "";
        p.style.right = "";
      });
      triggers.forEach(function (t) { markTrigger(t, false); });
    }

    /*
     * Inner elements to cascade in when a panel opens — this stagger is what
     * makes the menu feel alive instead of a flat fade. Preference order:
     *   1. anything you explicitly mark [data-nav-stagger]
     *   2. the component's item types (icon/plain/highlight/featured cards)
     *   3. the columns, as a last resort
     * Cached per panel so we don't re-query on every hover.
     */
    var _staggerCache = {};
    function staggerTargets(panel) {
      if (!panel) return [];
      var key = panel.getAttribute("data-nav-panel") || "";
      if (_staggerCache[key]) return _staggerCache[key];
      var sel = panel.querySelectorAll("[data-nav-stagger]");
      if (!sel.length) {
        sel = panel.querySelectorAll(
          ".nav__item-icon, .nav__item-plain, .nav__item-highlight, .nav__featured-card"
        );
      }
      if (!sel.length) sel = panel.querySelectorAll(".nav__col");
      var arr = Array.prototype.slice.call(sel);
      _staggerCache[key] = arr;
      return arr;
    }

    // ── Active-trigger indicator movement ─────────────────────────
    function moveIndicator(trigger) {
      if (!indicator || !trigger) return;
      var host = indicator.offsetParent || navBar;
      var hostRect = host.getBoundingClientRect();
      var r = trigger.getBoundingClientRect();
      var x = r.left - hostRect.left;
      if (reduceMotion) {
        gsap.set(indicator, { x: x, width: r.width, opacity: 1 });
      } else {
        gsap.to(indicator, {
          x: x, width: r.width, opacity: 1,
          duration: 0.34, ease: "power3.out", overwrite: true,
        });
      }
    }

    function hideIndicator() {
      if (!indicator) return;
      if (reduceMotion) gsap.set(indicator, { opacity: 0 });
      else gsap.to(indicator, { opacity: 0, duration: 0.2, ease: "power2.out", overwrite: true });
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
      var dim     = measurePanel(id);
      var h       = dim.h;
      var w       = dim.w;
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
      // Pin the panel to its measured width so its columns stay rigid while the
      // container morphs around it — the box reveals the panel, it doesn't
      // squeeze it. (right:auto lets the explicit width take effect.)
      targetPanel.style.right = "auto";
      targetPanel.style.width = w + "px";

      triggers.forEach(function (t) { markTrigger(t, t.dataset.navTrigger === id); });
      moveIndicator(getTrigger(id));

      var items = staggerTargets(targetPanel);

      if (reduceMotion) {
        gsap.set(dropdown, { width: w, height: h });
        gsap.set(targetPanel, { opacity: 1, x: 0, y: 0, scale: 1 });
        if (items.length) gsap.set(items, { opacity: 1, y: 0 });
        if (overlay) gsap.set(overlay, { opacity: 1 });
        return;
      }

      // The container MORPHS both width and height from its CURRENT values
      // (0×0 when closed → grows from centre; old panel's size when switching →
      // glides between two differently-sized menus) so it never jumps. expo.out
      // gives a snappier, more dynamic settle than a flat power-curve.
      gsap.to(dropdown, {
        width   : w,
        height  : h,
        duration: wasOpen ? 0.44 : 0.5,
        ease    : "expo.out",
      });

      if (overlay) {
        gsap.to(overlay, { opacity: 1, duration: 0.3, ease: "power2.out" });
      }

      // The container itself comes in quick + subtle (a directional drift when
      // switching, a touch of depth via scale) — the *content* below carries
      // the motion via the stagger, so the panel never feels like a flat fade.
      gsap.killTweensOf(items);
      var fromVars = wasOpen
        ? { opacity: 0, x: dir * 26, scale: 0.985, y: 0 }
        : { opacity: 0, x: 0, y: 6, scale: 0.99 };
      gsap.fromTo(targetPanel, fromVars, {
        opacity: 1, x: 0, y: 0, scale: 1,
        duration: 0.3, ease: "power3.out", overwrite: true,
      });

      // Cascade the inner items in — the signature "alive" motion.
      if (items.length) {
        gsap.fromTo(items,
          { opacity: 0, y: 14 },
          {
            opacity: 1, y: 0,
            duration: 0.5, ease: "power3.out", overwrite: true,
            stagger: { each: 0.04, from: dir < 0 ? "end" : "start" },
          }
        );
      }
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
      hideIndicator();

      gsap.killTweensOf(dropdown);
      if (pendingReset) { pendingReset.kill(); pendingReset = null; }

      if (reduceMotion) {
        gsap.set(dropdown, { width: 0, height: 0 });
        if (overlay) gsap.set(overlay, { opacity: 0 });
        hideAllPanels();
      } else {
        // Collapse both axes back to a point — the box closes the way it opened.
        gsap.to(dropdown, { width: 0, height: 0, duration: 0.32, ease: "expo.inOut" });
        if (overlay) {
          gsap.to(overlay, { opacity: 0, duration: 0.26, ease: "power2.in" });
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

    // Keep the active-trigger indicator aligned when the layout reflows.
    on(global, "resize", function () {
      if (isOpen && activeId) moveIndicator(getTrigger(activeId));
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
    // Closed = zero on both axes so the first open grows from a point (centred
    // horizontally via the dropdown's auto margins).
    gsap.set(dropdown, { width: 0, height: 0 });
    if (overlay) gsap.set(overlay, { opacity: 0 });
    hideAllPanels();

    if (mobileMenu) {
      mobileMenu.setAttribute("aria-hidden", "true");
      gsap.set(mobileMenu, { opacity: 0, y: 12 });
    }

    if (mobileBack)   mobileBack.style.display  = "none";
    if (mobileBrand)  mobileBrand.style.display  = "";
    if (mobileSlider) gsap.set(mobileSlider, { x: 0 });

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

    // ── Auto-hide on scroll direction ─────────────────────────────
    // Opt-in via [data-nav-autohide] on the nav root: the bar slides away
    // while scrolling down and eases back in while scrolling up — no theme
    // detection needed, just give it one fixed background colour in CSS.
    // Independent of the [data-nav-hide] (section-coverage) mechanism above;
    // reuses the same .nav--hidden slide+fade so both share one CSS rule.
    (function initScrollAutoHide() {
      if (!nav.hasAttribute("data-nav-autohide")) return;

      var lastY     = global.pageYOffset || document.documentElement.scrollTop || 0;
      var ticking   = false;
      var threshold = 8;  // ignore trackpad/sub-pixel jitter
      var topGuard  = (navBar && navBar.offsetHeight) || nav.offsetHeight || 60;

      function update() {
        ticking = false;
        var y     = global.pageYOffset || document.documentElement.scrollTop || 0;
        var delta = y - lastY;

        if (isOpen) { lastY = y; return; } // leave the bar alone mid mega-menu

        if (y <= topGuard) {
          nav.classList.remove("nav--hidden");
        } else if (delta > threshold) {
          nav.classList.add("nav--hidden");
          closeDropdown();
        } else if (delta < -threshold) {
          nav.classList.remove("nav--hidden");
        }
        lastY = y;
      }

      on(global, "scroll", function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      });
    })();

    // ── Public API ────────────────────────────────────────────────
    var instance = {
      _destroy: function () {
        clearTimeout(closeTimer);
        if (pendingReset) { pendingReset.kill(); pendingReset = null; }
        if (indicator) gsap.killTweensOf(indicator);
        panels.forEach(function (p) { gsap.killTweensOf(staggerTargets(p)); });
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
        if (_hideObserver) _hideObserver.disconnect();

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
