/*!
 * testimonial-slider.js v3.2.0
 * Case-study / testimonial slider for Webflow CMS. Everything is authored
 * inside the Collection List — JS never copies content into a separate
 * "stage". Each Collection Item carries BOTH its own small thumbnail trigger
 * AND its own full panel (video player + quote/author/stats, already CMS-bound
 * by Webflow); CSS shows only the active item's panel. JS toggles which item
 * is active and mounts/tears down that item's inline video player — no modal.
 *
 * At init JS gathers every item's [data-ts-thumb-trigger] into one
 * [data-ts-strip] (created under the root) so the thumbnails form a single
 * horizontally-scrollable row — something display:contents can't do while the
 * thumbs stay inside their items. The strip still lives under the collection
 * wrapper and its thumbs still come from the CMS items.
 *
 * Layout is responsive: on narrow screens the active panel stacks (video on
 * top, content below) and the thumbnail strip scrolls horizontally.
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
 * CMS-friendly helpers (every item shares one template, so use these instead
 * of hand-editing individual items):
 *   • Photo-only item — leave that item's CMS video field empty; data-ts-video
 *     resolves to "" and the item shows just its poster (no play button).
 *   • data-ts-hide-empty — add to ANY element (logo, quote, a stat, the CTA…).
 *     If that element's CMS field is blank for an item, JS hides it for that
 *     item only (empty <img>, empty text, or href="#"/empty link all count).
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

  // Same bbox-centred triangle the webinar player uses (so it sits dead-centre).
  var PLAY_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M6.5 5v14l11-7z"/></svg>';

  /** True when a bound element carries no content for this CMS item. */
  function isEmpty(node) {
    if (node.tagName === "IMG") {
      var src = node.getAttribute("src") || "";
      return !src.trim();
    }
    if (node.tagName === "A") {
      var href = node.getAttribute("href") || "";
      return !href.trim() || href === "#";
    }
    // Text/containers: empty unless they hold text or a real media child.
    return !node.textContent.trim() && !node.querySelector("img, svg, video, iframe");
  }

  /** Hide every [data-ts-hide-empty] inside an item whose CMS field is empty.
   *  Runs once at init — content doesn't change, so a class is enough.
   *  Add data-ts-hide-empty in the Designer to ANY element (logo, quote, a
   *  single stat, the CTA…) you want to vanish when its field is blank. */
  function hideEmpties(scope) {
    var nodes = scope.querySelectorAll("[data-ts-hide-empty]");
    Array.prototype.forEach.call(nodes, function (node) {
      node.classList.toggle("is-ts-empty", isEmpty(node));
    });
  }

  /** Make sure an item's player has a [data-ts-play] button and a
   *  [data-ts-video-mount]. We search the WHOLE item (not just the player) so
   *  a button/mount the Designer placed elsewhere is reused — never duplicated
   *  — and we move both INTO [data-ts-player] so the button centres on the
   *  video and the mounted <video>/<iframe> fills it. */
  function ensurePlayer(item) {
    var player = item.querySelector("[data-ts-player]");
    if (!player) return null;

    var mount = item.querySelector("[data-ts-video-mount]");
    if (!mount) {
      mount = document.createElement("div");
      mount.setAttribute("data-ts-video-mount", "");
    }
    if (mount.parentElement !== player) player.appendChild(mount);

    var playBtn = item.querySelector("[data-ts-play]");
    if (!playBtn) {
      playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.setAttribute("data-ts-play", "");
    }
    if (playBtn.parentElement !== player) player.appendChild(playBtn);
    // Only drop in a default icon if YOU left the button empty — your own SVG
    // is never touched.
    if (!playBtn.innerHTML.trim()) playBtn.innerHTML = PLAY_ICON;
    if (!playBtn.getAttribute("aria-label")) playBtn.setAttribute("aria-label", "Play");
    // No inline styling here: the button's look + position is fully yours to set
    // in the Designer. CSS only provides zero-specificity (:where) fallbacks.

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

    // ── Thumbnail strip ───────────────────────────────────────────
    // display:contents can't group the per-item thumbs into one scrollable
    // row, so at runtime we collect every item's [data-ts-thumb-trigger] into
    // a single [data-ts-strip] (created if absent) under the root. The strip
    // is a horizontal flex row that scrolls — the source is still the CMS
    // items, everything still lives under the collection wrapper.
    var strip = root.querySelector("[data-ts-strip]");
    if (!strip) {
      strip = document.createElement("div");
      strip.setAttribute("data-ts-strip", "");
      root.appendChild(strip);
    }
    var thumbs = items.map(function (it) {
      var t = it.querySelector("[data-ts-thumb-trigger]");
      if (t && t.parentElement !== strip) strip.appendChild(t);
      return t;
    });

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
        it.classList.toggle("is-active", idx === i);
      });
      // The thumbs now live in the strip (outside the items), so mark the
      // active one directly for its highlight + a11y state.
      thumbs.forEach(function (t, idx) {
        if (!t) return;
        var on = idx === i;
        t.classList.toggle("is-active", on);
        if (on) t.setAttribute("aria-current", "true");
        else t.removeAttribute("aria-current");
      });
    }

    function to(i) {
      i = (i + items.length) % items.length;
      if (i === active) return;
      // Bulletproof: tear every item back to its poster state, so a play button
      // can never stay stranded on any item after a series of switches.
      items.forEach(teardownVideo);
      // Panels are stacked in one cell and cross-fade via CSS opacity — height
      // never changes, so there are no layout jumps on switch.
      setActiveClass(i);
      active = i;
      if (autoplay) play(items[i]);
    }

    // ── Wire each item: thumb trigger (switch) + player (play) ─────
    items.forEach(function (it, idx) {
      var trigger = thumbs[idx] || it;
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

      // Hide any [data-ts-hide-empty] whose CMS field came through blank.
      hideEmpties(it);

      // Items with no video are photo-only: skip the player chrome entirely
      // (.is-novideo also lets CSS hide any play button left in the Designer).
      // In a CMS list every item gets data-ts-video bound; an item whose video
      // field is empty just yields data-ts-video="" → treated as photo-only.
      var hasVideo = (it.getAttribute("data-ts-video") || "").trim() ||
                     (it.getAttribute("data-ts-iframe") || "").trim();
      if (!hasVideo) {
        it.classList.add("is-novideo");
        return;
      }

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

    // Initial state (no animation). is-ready retires the pre-JS CSS fallback so
    // the active state is fully JS-driven from here on.
    setActiveClass(active);
    root.classList.add("is-ready");
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
