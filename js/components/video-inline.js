/*!
 * video-inline.js v1.0.0
 * Self-hosted <video> playback library — lazy loading, poster crossfade,
 * hover-to-play, scroll-in-play and fully custom play/pause controls.
 * Zero dependencies. For YouTube/Vimeo, use video-modal.js (lightbox) or
 * webinar-player.js (inline custom-controls YouTube player).
 *
 * API:
 *   Sestek.initVideoInline()   — wire every [data-video] element on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-video-trigger="clip-1">          ← only needed for hover-play
 *     <picture data-video-picture="clip-1">    ← optional poster, crossfades
 *       <img src="poster.jpg" alt="">
 *     </picture>
 *
 *     <video data-video="clip-1" muted playsinline>
 *       <source data-src="https://cdn.example.com/clip.mp4" type="video/mp4">
 *     </video>
 *
 *     <button data-video-playback="play"  data-video="clip-1">▶</button>
 *     <button data-video-playback="pause" data-video="clip-1">⏸</button>
 *   </div>
 *
 * ── Attributes (all on the <video data-video="…">) ──────────────
 *
 *   data-video                      unique id — required, links every part
 *   data-video-hover="true"         play on mouse-enter, pause + restore
 *                                   poster on mouse-leave (needs [data-video-trigger])
 *   data-video-scroll-in-play="true" play when ≥50% in viewport, pause + restore
 *                                   poster when it scrolls out
 *   data-video-desktop-only="true"  hide video + its controls below 991px
 *
 * Plain videos (none of the above) lazy-load and autoplay once loaded.
 *
 * Source must use data-src (NOT src) so the file is fetched only when the
 * video nears the viewport — this is what keeps PageSpeed unaffected:
 *   <source data-src="clip.mp4" type="video/mp4">
 *
 * Respects prefers-reduced-motion — no autoplay/hover/scroll-triggered
 * playback for users who opt out; videos stay paused on their poster.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ROOT_MARGIN              = "300px";
  var SCROLL_TRIGGER_THRESHOLD = 0.5;
  var DESKTOP_BREAKPOINT       = 991;

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var lazyObserver   = null;
  var scrollObservers = new Map();

  // ── Helpers ───────────────────────────────────────────────────

  function findPicture(video, id) {
    var sib = video.previousElementSibling;
    while (sib) {
      if (sib.tagName === "PICTURE" && sib.getAttribute("data-video-picture") === id) return sib;
      sib = sib.previousElementSibling;
    }
    var parent = video.parentElement;
    if (parent) {
      var found = parent.querySelector('picture[data-video-picture="' + id + '"]');
      if (found) return found;
    }
    return document.querySelector('picture[data-video-picture="' + id + '"]');
  }

  function showPicture(video) {
    var id = video.getAttribute("data-video");
    var pic = id && findPicture(video, id);
    if (pic) pic.style.opacity = "1";
  }

  function hidePicture(video) {
    var id = video.getAttribute("data-video");
    var pic = id && findPicture(video, id);
    if (pic) pic.style.opacity = "0";
  }

  /** Set the real <source src> from data-src and wait until playable. */
  function lazyLoad(video) {
    return new Promise(function (resolve, reject) {
      var source = video.querySelector("source[data-src]");
      if (source && !source.src) {
        source.src = source.getAttribute("data-src");
        video.load();
        video.addEventListener("canplaythrough", function onReady() {
          video.removeEventListener("canplaythrough", onReady);
          resolve();
        });
        video.addEventListener("error", function onErr() {
          video.removeEventListener("error", onErr);
          reject(new Error("[Sestek VideoInline] failed to load: " + source.src));
        });
      } else {
        resolve();
      }
    });
  }

  // ── Custom play/pause buttons ─────────────────────────────────

  function wirePlaybackButtons(video) {
    var id        = video.getAttribute("data-video");
    var container = video.parentElement;

    var playBtn  = (container && container.querySelector('[data-video-playback="play"][data-video="' + id + '"]'))
                || document.querySelector('[data-video-playback="play"][data-video="' + id + '"]');
    var pauseBtn = (container && container.querySelector('[data-video-playback="pause"][data-video="' + id + '"]'))
                || document.querySelector('[data-video-playback="pause"][data-video="' + id + '"]');

    if (!playBtn || !pauseBtn) return;

    function setPlaying(isPlaying) {
      var show = isPlaying ? pauseBtn : playBtn;
      var hide = isPlaying ? playBtn  : pauseBtn;

      show.style.display = "";
      show.removeAttribute("aria-hidden");
      show.removeAttribute("tabindex");

      hide.style.display = "none";
      hide.setAttribute("aria-hidden", "true");
      hide.setAttribute("tabindex", "-1");
    }

    setPlaying(!video.paused);

    playBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      lazyLoad(video).then(function () {
        hidePicture(video);
        video.play();
      }).catch(function (err) { console.warn(err); });
    });

    pauseBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      video.pause();
    });

    video.addEventListener("play",  function () { setPlaying(true); });
    video.addEventListener("pause", function () { setPlaying(false); });
  }

  // ── Hover-to-play ─────────────────────────────────────────────

  function wireHoverPlay(video) {
    var id      = video.getAttribute("data-video");
    var trigger = video.closest('[data-video-trigger="' + id + '"]');
    if (!trigger) return;

    /* Buttons are redundant when hover drives playback — hide from a11y tree */
    var container = video.parentElement;
    ["play", "pause"].forEach(function (kind) {
      var btn = container && container.querySelector('[data-video-playback="' + kind + '"][data-video="' + id + '"]');
      if (btn) {
        btn.setAttribute("aria-hidden", "true");
        btn.setAttribute("tabindex", "-1");
      }
    });

    trigger.addEventListener("mouseenter", function () {
      if (prefersReducedMotion) return;
      hidePicture(video);
      lazyLoad(video).then(function () {
        video.currentTime = 0;
        video.play();
      }).catch(function (err) { console.warn(err); });
    });

    trigger.addEventListener("mouseleave", function () {
      video.pause();
      showPicture(video);
    });
  }

  // ── Scroll-in-play ────────────────────────────────────────────

  function wireScrollInPlay(video) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          lazyLoad(video).then(function () {
            if (prefersReducedMotion) return;
            hidePicture(video);
            video.currentTime = 0;
            video.play();
          }).catch(function (err) { console.warn(err); });
        } else {
          video.pause();
          showPicture(video);
        }
      });
    }, { threshold: SCROLL_TRIGGER_THRESHOLD });

    observer.observe(video);
    scrollObservers.set(video, observer);
  }

  // ── Plain autoplay (no hover / scroll-in-play attribute) ──────

  function wireAutoplay(video) {
    video.addEventListener("canplaythrough", function () {
      if (prefersReducedMotion) return;
      hidePicture(video);
      video.play().catch(function () {});
    });
  }

  // ── Desktop-only videos ───────────────────────────────────────

  function setDesktopOnlyVisibility() {
    var isMobile = window.innerWidth <= DESKTOP_BREAKPOINT;

    document.querySelectorAll('video[data-video-desktop-only="true"]').forEach(function (video) {
      var id        = video.getAttribute("data-video");
      var container = video.parentElement;
      var wrapper   = container && container.querySelector('[data-video-playback="wrapper"]');

      video.style.display = isMobile ? "none" : "";

      if (wrapper) {
        wrapper.style.display    = isMobile ? "none" : "";
        wrapper.setAttribute("aria-hidden", isMobile ? "true" : "false");
        return;
      }

      ["play", "pause"].forEach(function (kind) {
        var btn = document.querySelector('[data-video-playback="' + kind + '"][data-video="' + id + '"]');
        if (!btn) return;
        btn.style.display = isMobile ? "none" : "";
        btn.setAttribute("aria-hidden", isMobile ? "true" : "false");
        if (isMobile) btn.setAttribute("tabindex", "-1");
        else btn.removeAttribute("tabindex");
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────

  function initVideoInline() {
    var videos = document.querySelectorAll("video[data-video]");
    if (!videos.length) return;

    setDesktopOnlyVisibility();
    if (document.querySelectorAll('video[data-video-desktop-only="true"]').length) {
      window.addEventListener("resize", setDesktopOnlyVisibility);
    }

    lazyObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        lazyLoad(entry.target).catch(function (err) { console.warn(err); });
        observer.unobserve(entry.target);
      });
    }, { root: null, rootMargin: ROOT_MARGIN, threshold: 0 });

    Array.prototype.forEach.call(videos, function (video) {
      wirePlaybackButtons(video);

      var hover         = video.getAttribute("data-video-hover") === "true";
      var scrollInPlay  = video.getAttribute("data-video-scroll-in-play") === "true";

      if (hover) {
        wireHoverPlay(video);
        lazyObserver.observe(video); /* still lazy-load on approach */
        return;
      }

      if (prefersReducedMotion) {
        lazyObserver.observe(video);
        return;
      }

      if (scrollInPlay) {
        lazyObserver.observe(video);
        wireScrollInPlay(video);
      } else {
        lazyObserver.observe(video);
        wireAutoplay(video);
      }
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initVideoInline = initVideoInline;

})(typeof window !== "undefined" ? window : this);
