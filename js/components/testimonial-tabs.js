/*!
 * testimonial-tabs.js v1.0.0
 * CMS-driven auto-advancing testimonial tabs:
 *   1. Panels come from ONE Webflow Collection List ([data-ttabs-panel],
 *      no indexes — collection items can't carry per-item attributes).
 *      Everything is indexed by DOM order.
 *   2. Tabs are BUILT BY JS inside [data-ttabs-nav]: one button per panel,
 *      showing the client logo (cloned from the panel's [data-ttabs-logo])
 *      with a progress bar underneath. No second Collection List needed.
 *   3. The active tab's bar fills in real time (data-ttabs-duration s);
 *      when full, the component advances to the next panel (looping).
 *   4. Panel transition (GSAP): image cross-fade with a zoom settle; the
 *      white card slides in from the right with its children staggered
 *      (logo → quote → person → button); the stat rises from below.
 *   5. Clicking a tab jumps to that panel and restarts the cycle. Hovering
 *      the stage pauses the timer; leaving resumes. Off-screen, the cycle
 *      pauses entirely (IntersectionObserver).
 *
 * Requires : gsap. (ScrollTrigger NOT required — nothing is scroll-driven.)
 *
 * DOM contract (all children live inside the SAME collection item):
 *   [data-testimonial-tabs]      root; config attributes below
 *   [data-ttabs-nav]             EMPTY container — JS builds the tabs
 *   [data-ttabs-panel]           one per CMS item (inside the Collection List)
 *     [data-ttabs-company]        hidden text: client name (aria/tooltip)
 *     [data-ttabs-img]            stage image
 *     [data-ttabs-stat]           bottom-left stat block
 *     [data-ttabs-card]           white testimonial card
 *       [data-ttabs-logo]          client logo (also cloned into the tab)
 *       [data-ttabs-quote]         testimonial text
 *       [data-ttabs-person]        name + role block
 *       [data-ttabs-btn]           read-more button
 *
 * Root config attributes:
 *   data-ttabs-duration    seconds per tab                (default 6)
 *   data-ttabs-ease        ease for card/stat entrances   (default "power3.out")
 *   data-ttabs-bar-height  progress bar thickness, px     (default 2)
 *   data-ttabs-logo-h      tab logo height, px            (default 28)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /** Parse a numeric data-attribute with a fallback. */
  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  function initTestimonialTabs(selector) {
    var root = document.querySelector(selector || "[data-testimonial-tabs]");
    if (!root) { console.warn("[Sestek TestimonialTabs] No [data-testimonial-tabs] found."); return; }
    if (root._ttabsInit) return;                          // idempotent
    root._ttabsInit = true;
    if (typeof gsap === "undefined") {
      console.error("[Sestek TestimonialTabs] GSAP required."); return;
    }

    var nav    = root.querySelector("[data-ttabs-nav]");
    var panels = Array.from(root.querySelectorAll("[data-ttabs-panel]"));
    var n = panels.length;
    if (!n) { console.warn("[Sestek TestimonialTabs] No [data-ttabs-panel] items (is the Collection List empty?)."); return; }

    var duration  = num(root, "data-ttabs-duration", 6);
    var ease      = root.getAttribute("data-ttabs-ease") || "power3.out";
    var barH      = num(root, "data-ttabs-bar-height", 2);
    var logoH     = num(root, "data-ttabs-logo-h", 28);

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /** Per-panel parts, resolved once. Indexing = DOM order (CMS order). */
    var parts = panels.map(function (p) {
      return {
        panel:   p,
        company: (p.querySelector("[data-ttabs-company]") || {}).textContent || "",
        logo:    p.querySelector("[data-ttabs-logo]"),
        img:     p.querySelector("[data-ttabs-img]"),
        stat:    p.querySelector("[data-ttabs-stat]"),
        card:    p.querySelector("[data-ttabs-card]"),
      };
    });

    // ── Build tabs: logo + progress bar per panel (JS owns structure) ──
    var fills = [];
    var tabs  = [];
    if (nav) {
      nav.innerHTML = "";
      parts.forEach(function (part, i) {
        var tab = document.createElement("button");
        tab.type = "button";
        tab.setAttribute("aria-label", (part.company || "Testimonial " + (i + 1)).trim());
        tab.style.cssText =
          "display:flex;flex-direction:column;align-items:center;row-gap:10px;" +
          "background:none;border:0;padding:6px 2px;cursor:pointer;" +
          "opacity:.45;transition:opacity .3s ease;";

        var logoBox = document.createElement("div");
        logoBox.style.cssText = "height:" + logoH + "px;display:flex;align-items:center;";
        var src = part.logo && (part.logo.currentSrc || part.logo.src);
        if (src) {
          var im = document.createElement("img");
          im.src = src;
          im.alt = (part.company || "").trim();
          im.style.cssText = "max-height:100%;width:auto;display:block;";
          logoBox.appendChild(im);
        } else {
          var tx = document.createElement("span");
          tx.textContent = (part.company || "Item " + (i + 1)).trim();
          tx.style.cssText = "font-size:14px;font-weight:600;white-space:nowrap;";
          logoBox.appendChild(tx);
        }

        var track = document.createElement("span");
        track.style.cssText =
          "display:block;width:100%;height:" + barH + "px;border-radius:9999px;" +
          "background:rgba(0,0,0,.12);overflow:hidden;";
        var fill = document.createElement("span");
        fill.style.cssText =
          "display:block;width:0%;height:100%;border-radius:9999px;background:#111;";
        track.appendChild(fill);

        tab.appendChild(logoBox);
        tab.appendChild(track);
        nav.appendChild(tab);
        fills.push(fill);
        tabs.push(tab);

        tab.addEventListener("click", function () { goTo(i, true); });
        tab.addEventListener("mouseenter", function () { if (i !== active) tab.style.opacity = ".75"; });
        tab.addEventListener("mouseleave", function () { if (i !== active) tab.style.opacity = ".45"; });
      });
    }

    // ── State ──────────────────────────────────────────────────────
    var active    = -1;
    var fillTween = null;
    var swapTl    = null;
    var inView    = true;
    var hovering  = false;

    function setTabState(idx) {
      tabs.forEach(function (t, i) { t.style.opacity = i === idx ? "1" : ".45"; });
      fills.forEach(function (f, i) {
        // Past tabs read as "done", upcoming as empty — like a story bar.
        if (i < idx) f.style.width = "100%";
        if (i > idx) f.style.width = "0%";
      });
    }

    /** Start (or restart) the active tab's real-time fill. */
    function startTimer(idx) {
      if (fillTween) fillTween.kill();
      if (!fills[idx] || reduce) return;
      gsap.set(fills[idx], { width: "0%" });
      fillTween = gsap.to(fills[idx], {
        width: "100%",
        duration: duration,
        ease: "none",
        paused: !inView || hovering,
        onComplete: function () { goTo((active + 1) % n, false); },
      });
    }

    /** Animate panel idx in (and the previous one out). */
    function goTo(idx, fromClick) {
      if (idx === active) { if (fromClick) startTimer(idx); return; }
      var prev = active;
      active = idx;
      setTabState(idx);

      if (swapTl) swapTl.kill();

      var inc = parts[idx];
      var out = prev >= 0 ? parts[prev] : null;

      if (reduce) {
        if (out) gsap.set(out.panel, { autoAlpha: 0 });
        gsap.set(inc.panel, { autoAlpha: 1 });
        return;
      }

      var cardKids = inc.card ? Array.from(inc.card.children) : [];

      swapTl = gsap.timeline();
      if (out) {
        swapTl.to(out.panel, { autoAlpha: 0, duration: 0.45, ease: "power2.inOut" }, 0);
      }
      swapTl.set(inc.panel, { autoAlpha: 1 }, 0);
      if (inc.img) {
        swapTl.fromTo(inc.img, { scale: 1.06 }, { scale: 1, duration: 1.1, ease: "power2.out" }, 0);
      }
      if (inc.card) {
        swapTl.fromTo(inc.card,
          { x: 64, autoAlpha: 0 },
          { x: 0, autoAlpha: 1, duration: 0.7, ease: ease }, 0.15);
        if (cardKids.length) {
          swapTl.fromTo(cardKids,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.5, ease: ease, stagger: 0.08 }, 0.3);
        }
      }
      if (inc.stat) {
        swapTl.fromTo(inc.stat,
          { y: 28, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6, ease: ease }, 0.35);
      }

      startTimer(idx);
    }

    // ── Pause/resume: hover + viewport ─────────────────────────────
    root.addEventListener("mouseenter", function () {
      hovering = true;
      if (fillTween) fillTween.pause();
    });
    root.addEventListener("mouseleave", function () {
      hovering = false;
      if (fillTween && inView) fillTween.play();
    });

    if (typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (!fillTween) return;
        if (inView && !hovering) fillTween.play();
        else fillTween.pause();
      }, { threshold: 0.25 });
      io.observe(root);
    }

    // ── Init: hide all, show first ─────────────────────────────────
    panels.forEach(function (p) { gsap.set(p, { autoAlpha: 0 }); });
    goTo(0, false);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initTestimonialTabs = initTestimonialTabs;

})(typeof window !== "undefined" ? window : this);
