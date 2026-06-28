/*!
 * testimonial-slider.js v2.2.0
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
 *             <button data-ts-play aria-label="Play"> … </button>  ← OPTIONAL: JS
 *                                                          auto-creates it (with an
 *                                                          icon) if you omit it
 *             [data-ts-video-mount]                ← OPTIONAL: JS auto-creates it too;
 *                                                     the <video>/<iframe> mounts here.
 *                                                     Do NOT paste a <video> embed in
 *                                                     the player yourself — JS builds it
 *                                                     from data-ts-video on click.
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

  var PLAY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="28" height="28">' +
    '<path fill="currentColor" d="M8 5v14l11-7z"/></svg>';

  /** Make sure an item's player has a [data-ts-play] button and a
   *  [data-ts-video-mount]; create them if the Designer didn't. */
  function ensurePlayer(item) {
    var player = item.querySelector("[data-ts-player]");
    if (!player) return null;

    var mount = player.querySelector("[data-ts-video-mount]");
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-ts-video-mount", "");
      player.appendChild(mount);
    }

    var playBtn = player.querySelector("[data-ts-play]");
    if (!playBtn) {
      playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.setAttribute("data-ts-play", "");
      player.appendChild(playBtn);
    }
    if (!playBtn.innerHTML.trim()) playBtn.innerHTML = PLAY_ICON;
    if (!playBtn.getAttribute("aria-label")) playBtn.setAttribute("aria-label", "Play");

    return { player: player, mount: mount, playBtn: playBtn };
  }

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
      // Poster + play button visibility is driven entirely by the .is-playing
      // class via CSS — never by inline styles — so it can't get stuck after a
      // few switches. Removing the class always restores them.
      item.classList.remove("is-playing");
    }

    function play(item) {
      item = item || items[active];
      var refs = ensurePlayer(item);
      var video = item.getAttribute("data-ts-video") || "";
      var iframeSrc = item.getAttribute("data-ts-iframe") || "";
      if (!refs || (!video && !iframeSrc)) {
        console.warn("[Sestek Testimonials] item has no [data-ts-player] or no data-ts-video/iframe.", item);
        return;
      }

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
        node.preload = "metadata";
        // Poster comes straight from the CMS-bound <img>, not a data-attribute.
        if (posterImg && posterImg.src) node.poster = posterImg.src;
      }
      refs.mount.innerHTML = "";
      refs.mount.appendChild(node);
      // CSS hides the poster + play button while .is-playing is set.
      item.classList.add("is-playing");
      // The click that called play() is a user gesture, so a <video> may start
      // WITH sound. play() can still reject (e.g. format) — fall back to controls.
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
          { autoAlpha: 1, y: 0, duration: duration, ease: ease, stagger: 0.05,
            // Clear the inline opacity/visibility autoAlpha leaves behind, so an
            // interrupted tween on rapid switches can't strand the panel hidden.
            clearProps: "transform,opacity,visibility" });
        if (autoplay) play(nextItem);
      } else {
        setActiveClass(i);
        active = i;
        if (autoplay) play(nextItem);
      }
    }

    // ── Wire each item: thumb trigger (switch) + player (play) ─────
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

      // Guarantee the play button + mount exist, then wire play (button +
      // poster click both start the inline video). play() must run inside this
      // click so the browser lets the <video> start with sound.
      var refs = ensurePlayer(it);
      if (refs) {
        refs.playBtn.addEventListener("click", function (e) {
          e.preventDefault(); e.stopPropagation(); play(it);
        });
        var posterImg = it.querySelector("[data-ts-poster-img]");
        if (posterImg) posterImg.addEventListener("click", function () { play(it); });
      }
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
