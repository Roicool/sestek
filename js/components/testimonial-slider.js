/*!
 * testimonial-slider.js v2.0.0
 * Case-study / testimonial slider for Webflow CMS. Everything lives inside
 * the Collection List — JS never copies content into a separate "stage".
 * Each Collection Item carries BOTH its own small thumbnail trigger AND its
 * own full panel (video player + quote/author/stats, already CMS-bound by
 * Webflow); CSS shows only the active item's panel, laid out full-width.
 * JS just toggles which item is active and mounts/tears down that item's
 * inline video player — no modal.
 *
 * Layout is responsive: on narrow screens the active panel stacks (video on
 * top, content below); thumbnails always sit in their own row.
 *
 * Requires : gsap (global) for the cross-fade — degrades to an instant swap
 *            without it. js/core/utils.js (Sestek.util) loaded first.
 * CSS      : css/components/testimonial-slider.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────────
 *
 *   [data-testimonial]                          ← Collection Wrapper (root)
 *     [Collection List]  role="list"
 *       [data-ts-item]   role="listitem"        ← Collection Item = one case
 *         data-ts-video="[mp4 url]"             ← Cloudflare …/downloads/default.mp4
 *         data-ts-iframe="[stream iframe src]"  ← optional, overrides mp4
 *
 *         [data-ts-thumb-trigger]                ← always-visible small trigger
 *           <img data-ts-thumb src="…" alt="">
 *
 *         [data-ts-panel]                        ← full view, shown only when active
 *           [data-ts-player]                      left: 16:9 video area
 *             <img data-ts-poster-img src="…" alt="">  ← real CMS Image field,
 *                                                          bound in the Designer; its
 *                                                          src is reused as <video poster>
 *             <button data-ts-play aria-label="Play"> … </button>
 *             [data-ts-video-mount]                ← JS mounts <video>/<iframe> here
 *           [data-ts-content]                      right: text column (already CMS-bound)
 *             <img data-ts-logo alt="[brand]">
 *             <blockquote data-ts-quote>…</blockquote>
 *             <span data-ts-author>…</span>
 *             <span data-ts-role>…</span>
 *             [data-ts-stats]
 *               [data-ts-stat data-ts-stat-value="-75%" data-ts-stat-label="…"]
 *             <a data-ts-cta href="…">Voir le cas →</a>
 *
 * Root attributes (all optional):
 *   data-ts-duration   cross-fade seconds            (default 0.45)
 *   data-ts-ease       GSAP ease                      (default "power2.out")
 *   data-ts-autoplay   "true" → play video on select  (default false: show poster)
 *
 * API:
 *   Sestek.initTestimonials()   — wire every [data-testimonial] on the page
 *   returns an array of controllers: { el, to(i), play(), active() }
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;

  function setupInstance(root) {
    if (root._testimonialInit) return null;
    root._testimonialInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-ts-item]"));
    if (!items.length) {
      console.warn("[Sestek Testimonials] need [data-ts-item]s.", root);
      return null;
    }

    var hasGsap = typeof gsap !== "undefined";
    var reduce  = Sestek.util.prefersReducedMotion();
    var duration = attrNum(root, "data-ts-duration", 0.45);
    var ease     = root.getAttribute("data-ts-ease") || "power2.out";
    var autoplay = root.getAttribute("data-ts-autoplay") === "true";

    var active = Math.max(0, items.findIndex(function (it) { return it.classList.contains("is-active"); }));
    if (active < 0) active = 0;

    function panelOf(item) { return item.querySelector("[data-ts-panel]"); }
    function mountOf(item) { return item.querySelector("[data-ts-video-mount]"); }

    // ── Player ────────────────────────────────────────────────────
    function teardownVideo(item) {
      var mount = mountOf(item);
      if (mount) mount.innerHTML = "";
      var poster = item.querySelector("[data-ts-poster-img]");
      var playBtn = item.querySelector("[data-ts-play]");
      if (poster) poster.style.display = "";
      if (playBtn) playBtn.style.display = "";
      item.classList.remove("is-playing");
    }

    function play(item) {
      item = item || items[active];
      var mount = mountOf(item);
      var video = item.getAttribute("data-ts-video") || "";
      var iframeSrc = item.getAttribute("data-ts-iframe") || "";
      if (!mount || (!video && !iframeSrc)) return;

      var posterImg = item.querySelector("[data-ts-poster-img]");
      var node;
      if (iframeSrc) {
        node = document.createElement("iframe");
        node.src = iframeSrc + (iframeSrc.indexOf("?") === -1 ? "?" : "&") + "autoplay=true";
        node.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
        node.setAttribute("allowfullscreen", "");
        node.setAttribute("title", "video");
      } else {
        node = document.createElement("video");
        node.src = video;
        node.controls = true;
        node.playsInline = true;
        node.autoplay = true;
        node.preload = "metadata";
        // Poster comes straight from the CMS-bound <img>, not a data-attribute.
        if (posterImg && posterImg.src) node.poster = posterImg.src;
      }
      mount.innerHTML = "";
      mount.appendChild(node);
      var playBtn = item.querySelector("[data-ts-play]");
      if (posterImg) posterImg.style.display = "none";
      if (playBtn) playBtn.style.display = "none";
      item.classList.add("is-playing");
      if (node.play) { var p = node.play(); if (p && p.catch) p.catch(function () {}); }
    }

    function setActiveClass(i) {
      items.forEach(function (it, idx) {
        var on = idx === i;
        it.classList.toggle("is-active", on);
        if (on) it.setAttribute("aria-current", "true");
        else it.removeAttribute("aria-current");
      });
    }

    function to(i, animate) {
      i = (i + items.length) % items.length;
      if (i === active) return;
      var prevItem = items[active];
      var nextItem = items[i];
      teardownVideo(prevItem);

      var nextPanel = panelOf(nextItem);
      if (animate && hasGsap && !reduce && nextPanel) {
        setActiveClass(i);
        active = i;
        var fadeTargets = Array.prototype.slice.call(nextPanel.children);
        gsap.killTweensOf(fadeTargets);
        gsap.fromTo(fadeTargets,
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: duration, ease: ease, stagger: 0.05, clearProps: "transform" });
        if (autoplay) play(nextItem);
      } else {
        setActiveClass(i);
        active = i;
        if (autoplay) play(nextItem);
      }
    }

    // ── Wire thumbnails ───────────────────────────────────────────
    items.forEach(function (it, idx) {
      var trigger = it.querySelector("[data-ts-thumb-trigger]") || it;
      if (!trigger.hasAttribute("tabindex")) trigger.setAttribute("tabindex", "0");
      if (!trigger.getAttribute("role")) trigger.setAttribute("role", "button");
      if (!trigger.getAttribute("aria-label")) {
        var author = it.querySelector("[data-ts-author]");
        trigger.setAttribute("aria-label", (author ? author.textContent.trim() : "case " + (idx + 1)));
      }
      trigger.addEventListener("click", function () { if (idx !== active) to(idx, true); });
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (idx !== active) to(idx, true); }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); to(active + 1, true); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); to(active - 1, true); }
      });

      var playBtn = it.querySelector("[data-ts-play]");
      if (playBtn) playBtn.addEventListener("click", function () { play(it); });
    });

    // Initial state (no animation)
    setActiveClass(active);
    if (autoplay) play(items[active]);

    return {
      el: root,
      to: function (i) { to(i, true); },
      play: function () { play(items[active]); },
      active: function () { return active; },
    };
  }

  /** Initialise every [data-testimonial] on the page. */
  function initTestimonials(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-testimonial]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initTestimonials = initTestimonials;

})(typeof window !== "undefined" ? window : this);
