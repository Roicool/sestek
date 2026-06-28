/*!
 * testimonial-slider.js v1.0.0
 * Case-study / testimonial slider for Webflow CMS. A large stage on the left
 * plays a video inline (no modal) while the right column shows the matching
 * quote, author, brand logo and stats. A thumbnail strip (the CMS Collection
 * List itself) switches between cases; the right column cross-fades elegantly.
 *
 * Layout is responsive: on narrow screens the stage stacks (video on top,
 * content below) and the thumbnail strip scrolls horizontally.
 *
 * Requires : gsap (global) for the cross-fade — degrades to an instant swap
 *            without it. js/core/utils.js (Sestek.util) loaded first.
 * CSS      : css/components/testimonial-slider.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────────
 *
 *   [data-testimonial]                         ← section root
 *
 *     [data-ts-stage]                          ← the big display (NOT in the CMS list)
 *       [data-ts-player]                       ← left: 16:9 video area
 *         <img  data-ts-poster-img alt="">     ← poster, set by JS
 *         <button data-ts-play aria-label="Play"> … </button>
 *         [data-ts-video-mount]                ← JS mounts <video>/<iframe> here
 *       [data-ts-content]                       ← right: text column (animated)
 *         <img data-ts-logo alt="">
 *         <blockquote data-ts-quote></blockquote>
 *         <span data-ts-author></span>
 *         <span data-ts-role></span>
 *         [data-ts-stats]                       ← stats container
 *           [data-ts-stat-template]             ← cloned per stat (optional)
 *             <span data-ts-stat-value></span>
 *             <span data-ts-stat-label></span>
 *         <a data-ts-cta href="#"></a>          ← optional
 *
 *     [Collection List]  role="list"
 *       [data-ts-item]   role="listitem"        ← Collection Item = one case
 *         data-ts-video="[mp4 url]"             ← Cloudflare …/downloads/default.mp4
 *         data-ts-poster="[poster url]"         ← Cloudflare …/thumbnails/thumbnail.jpg
 *         data-ts-iframe="[stream iframe src]"  ← optional, overrides mp4
 *         <img  data-ts-thumb src="…" alt="">   ← visible thumbnail
 *         <!-- the carriers below are hidden by CSS; JS reads them -->
 *         <img  data-ts-logo  src="…" alt="[brand]">
 *         <div  data-ts-quote>…</div>
 *         <div  data-ts-author>…</div>
 *         <div  data-ts-role>…</div>
 *         <div  data-ts-stat data-ts-stat-value="-75%" data-ts-stat-label="…"></div>
 *         <div  data-ts-stat data-ts-stat-value="x3"   data-ts-stat-label="…"></div>
 *         <a    data-ts-cta href="…">Voir le cas →</a>
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

  /** Read the text/HTML/src carriers + data-attributes of one Collection Item. */
  function readItem(item) {
    function el(sel) { return item.querySelector(sel); }
    function html(sel) { var e = el(sel); return e ? e.innerHTML.trim() : ""; }
    function text(sel) { var e = el(sel); return e ? e.textContent.trim() : ""; }
    function src(sel) { var e = el(sel); return e ? (e.getAttribute("src") || "") : ""; }

    var stats = [];
    Array.prototype.forEach.call(item.querySelectorAll("[data-ts-stat]"), function (s) {
      // Value/label can come from child elements (Webflow text binding) or
      // straight from data-attributes — child elements win when present.
      var vEl = s.querySelector("[data-ts-stat-value]");
      var lEl = s.querySelector("[data-ts-stat-label]");
      var value = (vEl ? vEl.textContent : s.getAttribute("data-ts-stat-value") || "").trim();
      var label = (lEl ? lEl.textContent : s.getAttribute("data-ts-stat-label") || "").trim();
      if (value || label) stats.push({ value: value, label: label });
    });

    var ctaEl = el("[data-ts-cta]");
    return {
      video:   item.getAttribute("data-ts-video") || "",
      iframe:  item.getAttribute("data-ts-iframe") || "",
      poster:  item.getAttribute("data-ts-poster") || src("[data-ts-thumb]"),
      logo:    src("[data-ts-logo]"),
      logoAlt: (el("[data-ts-logo]") && el("[data-ts-logo]").getAttribute("alt")) || "",
      quote:   html("[data-ts-quote]"),
      author:  text("[data-ts-author]"),
      role:    text("[data-ts-role]"),
      stats:   stats,
      ctaHref: ctaEl ? (ctaEl.getAttribute("href") || "") : "",
      ctaText: ctaEl ? ctaEl.textContent.trim() : "",
    };
  }

  /** Set text/HTML on a stage slot if both the slot and a value exist. */
  function fill(stage, sel, value, asHtml) {
    var node = stage.querySelector(sel);
    if (!node) return;
    if (value) {
      if (asHtml) node.innerHTML = value; else node.textContent = value;
      node.removeAttribute("hidden");
    } else {
      node.textContent = "";
      node.setAttribute("hidden", "");
    }
  }

  function setupInstance(root) {
    if (root._testimonialInit) return null;
    root._testimonialInit = true;

    var stage = root.querySelector("[data-ts-stage]");
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-ts-item]"));
    if (!stage || !items.length) {
      console.warn("[Sestek Testimonials] need [data-ts-stage] and [data-ts-item]s.", root);
      return null;
    }

    var hasGsap = typeof gsap !== "undefined";
    var reduce  = Sestek.util.prefersReducedMotion();
    var duration = attrNum(root, "data-ts-duration", 0.45);
    var ease     = root.getAttribute("data-ts-ease") || "power2.out";
    var autoplay = root.getAttribute("data-ts-autoplay") === "true";

    var data = items.map(readItem);

    // Stage slots
    var posterImg = stage.querySelector("[data-ts-poster-img]");
    var playBtn   = stage.querySelector("[data-ts-play]");
    var mount     = stage.querySelector("[data-ts-video-mount]");
    var content   = stage.querySelector("[data-ts-content]");
    var statsBox  = stage.querySelector("[data-ts-stats]");
    var statTpl   = statsBox ? statsBox.querySelector("[data-ts-stat-template]") : null;
    if (statTpl) statTpl.remove(); // keep as a clone source only

    var active = Math.max(0, items.findIndex(function (it) { return it.classList.contains("is-active"); }));
    if (active < 0) active = 0;

    // ── Stats rendering ───────────────────────────────────────────
    function renderStats(stats) {
      if (!statsBox) return;
      statsBox.innerHTML = "";
      stats.forEach(function (st) {
        var node;
        if (statTpl) {
          node = statTpl.cloneNode(true);
          node.removeAttribute("data-ts-stat-template");
          var v = node.querySelector("[data-ts-stat-value]");
          var l = node.querySelector("[data-ts-stat-label]");
          if (v) v.textContent = st.value;
          if (l) l.textContent = st.label;
        } else {
          node = document.createElement("div");
          node.setAttribute("data-ts-stat", "");
          node.innerHTML =
            '<span data-ts-stat-value>' + st.value + '</span>' +
            '<span data-ts-stat-label>' + st.label + '</span>';
        }
        statsBox.appendChild(node);
      });
    }

    // ── Player ────────────────────────────────────────────────────
    function teardownVideo() {
      if (mount) mount.innerHTML = "";
      if (posterImg) posterImg.style.display = "";
      if (playBtn) playBtn.style.display = "";
      root.classList.remove("is-playing");
    }

    function play() {
      var d = data[active];
      if (!mount || (!d.video && !d.iframe)) return;
      var node;
      if (d.iframe) {
        node = document.createElement("iframe");
        node.src = d.iframe + (d.iframe.indexOf("?") === -1 ? "?" : "&") + "autoplay=true";
        node.setAttribute("allow", "autoplay; fullscreen; picture-in-picture");
        node.setAttribute("allowfullscreen", "");
        node.setAttribute("title", d.author || "video");
      } else {
        node = document.createElement("video");
        node.src = d.video;
        node.controls = true;
        node.playsInline = true;
        node.autoplay = true;
        node.preload = "metadata";
        if (d.poster) node.poster = d.poster;
      }
      mount.innerHTML = "";
      mount.appendChild(node);
      if (posterImg) posterImg.style.display = "none";
      if (playBtn) playBtn.style.display = "none";
      root.classList.add("is-playing");
      if (node.play) { var p = node.play(); if (p && p.catch) p.catch(function () {}); }
    }

    // ── Content swap ──────────────────────────────────────────────
    function paint(i) {
      var d = data[i];
      if (posterImg) { posterImg.src = d.poster; posterImg.alt = d.author || ""; }
      var logo = stage.querySelector("[data-ts-logo]");
      if (logo) {
        if (d.logo) { logo.src = d.logo; logo.alt = d.logoAlt; logo.removeAttribute("hidden"); }
        else logo.setAttribute("hidden", "");
      }
      fill(stage, "[data-ts-quote]", d.quote, true);
      fill(stage, "[data-ts-author]", d.author, false);
      fill(stage, "[data-ts-role]", d.role, false);
      renderStats(d.stats);
      var cta = stage.querySelector("[data-ts-cta]");
      if (cta) {
        if (d.ctaHref) { cta.href = d.ctaHref; cta.removeAttribute("hidden"); }
        else cta.setAttribute("hidden", "");
        if (d.ctaText) cta.textContent = d.ctaText;
      }
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
      teardownVideo();
      setActiveClass(i);

      var run = function () {
        active = i;
        paint(i);
        if (autoplay) play();
      };

      if (animate && hasGsap && !reduce && content) {
        var fadeTargets = Array.prototype.slice.call(content.children);
        gsap.killTweensOf(fadeTargets);
        var tl = gsap.timeline();
        tl.to(fadeTargets, { autoAlpha: 0, y: 10, duration: duration * 0.45, ease: "power2.in", stagger: 0.03 })
          .add(function () { run(); })
          .fromTo(Array.prototype.slice.call(content.children),
            { autoAlpha: 0, y: -10 },
            { autoAlpha: 1, y: 0, duration: duration, ease: ease, stagger: 0.05, clearProps: "transform" });
        // Poster crossfade
        if (posterImg) {
          gsap.fromTo(posterImg, { autoAlpha: 0.4 }, { autoAlpha: 1, duration: duration, ease: ease });
        }
      } else {
        run();
      }
    }

    // ── Wire thumbnails ───────────────────────────────────────────
    items.forEach(function (it, idx) {
      if (!it.hasAttribute("tabindex")) it.setAttribute("tabindex", "0");
      if (!it.getAttribute("role")) it.setAttribute("role", "button");
      if (!it.getAttribute("aria-label")) {
        it.setAttribute("aria-label", (data[idx].author || "case") + (data[idx].role ? " — " + data[idx].role : ""));
      }
      it.addEventListener("click", function () { if (idx !== active) to(idx, true); });
      it.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (idx !== active) to(idx, true); }
        else if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); to(active + 1, true); items[(active) % items.length].focus(); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); to(active - 1, true); items[(active) % items.length].focus(); }
      });
    });

    if (playBtn) playBtn.addEventListener("click", play);

    // Initial paint (no animation)
    setActiveClass(active);
    paint(active);
    if (autoplay) play();

    return {
      el: root,
      to: function (i) { to(i, true); },
      play: play,
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
