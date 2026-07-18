/*!
 * video-inline.js v1.1.0
 * Self-hosted <video> playback library — lazy loading, poster crossfade,
 * hover-to-play, scroll-in-play, custom play/pause buttons and an optional
 * self-building Sestek-style controller bar (Cloudflare Stream MP4 friendly).
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
 * ── Controller mode (data-video-controls="true") ────────────────
 *
 * The script injects a full controller into the video's parent element —
 * you do NOT wire any buttons (load css/components/video-inline.css too):
 *   • big centred play button while paused / before start
 *   • bottom bar: play-pause, scrubber (buffered + progress), current /
 *     total time, mute and fullscreen
 *   • controls auto-hide while playing, reappear on hover / mouse-move
 *   • FACADE: nothing loads until the first play click (PageSpeed-safe);
 *     add data-video-autoplay="true" for muted lazy autoplay instead
 *
 *   <div class="my-player">                     ← wrapper = video's parent
 *     <video data-video="cf-1" data-video-controls="true" playsinline
 *            poster="https://…/thumbnails/thumbnail.jpg?height=600">
 *       <source data-src="https://…/downloads/default.mp4" type="video/mp4">
 *     </video>
 *   </div>
 *
 * ── Attributes (all on the <video data-video="…">) ──────────────
 *
 *   data-video                      unique id — required, links every part
 *   data-video-controls="true"      inject the Sestek controller bar
 *   data-video-accent="#EC008C"     controller accent colour (hex or CSS var);
 *                                   defaults to --interactive--color-primary-base
 *   data-video-autoplay="true"      controller mode only: muted autoplay once
 *                                   the video nears the viewport
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
  var IDLE_DELAY               = 2600; /* ms of no input before controls fade */
  var SVGNS                    = "http://www.w3.org/2000/svg";

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

  // CSS-var token ("--x" / "var(--x)") → computed colour. Inlined (not
  // Sestek.util) so the library stays zero-dependency.
  function resolveColor(value, contextEl) {
    if (!value) return value;
    var v = value.trim();
    var name = null;
    var m = v.match(/^var\(\s*(--[^,)\s]+)/);
    if (m) name = m[1];
    else if (v.indexOf("--") === 0) name = v;
    if (!name) return v;
    var resolved = getComputedStyle(contextEl).getPropertyValue(name).trim();
    return resolved || v;
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var s = Math.floor(sec % 60);
    var m = Math.floor((sec / 60) % 60);
    var h = Math.floor(sec / 3600);
    var mm = (h && m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    return (h ? h + ":" : "") + mm + ":" + ss;
  }

  function icon(paths) {
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    paths.forEach(function (d) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d);
      svg.appendChild(p);
    });
    return svg;
  }

  /* Icon path sets (24×24) — same glyphs as webinar-player.js */
  var ICONS = {
    play:  ["M6.5 5v14l11-7z"],
    pause: ["M6 5h4v14H6z", "M14 5h4v14h-4z"],
    volume:["M3 10v4h4l5 5V5L7 10H3z", "M16 8.5a4 4 0 0 1 0 7"],
    muted: ["M3 10v4h4l5 5V5L7 10H3z", "M22 9l-5 6M17 9l5 6"],
    full:  ["M4 9V4h5", "M20 9V4h-5", "M4 15v5h5", "M20 15v5h-5"],
    exit:  ["M9 4H4v5", "M15 4h5v5", "M9 20H4v-5", "M15 20h5v-5"],
  };

  function setIcon(btn, name) {
    btn.innerHTML = "";
    btn.appendChild(icon(ICONS[name]));
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

  // ── Injected controller (data-video-controls="true") ──────────

  function wireControls(video) {
    var wrapper = video.parentElement;
    if (!wrapper) return;

    var accent = resolveColor(
      video.getAttribute("data-video-accent") || "--interactive--color-primary-base",
      wrapper
    );

    wrapper.classList.add("svp");
    /* Unresolved token stays "--…" — skip it so the CSS fallback chain wins */
    if (accent && accent.indexOf("--") !== 0) {
      wrapper.style.setProperty("--svp-accent", accent);
    }
    if (getComputedStyle(wrapper).position === "static") wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";

    /* Safety nets (only bite if the CSS file is missing — when it's loaded
     * the box is already a reserved 16:9, so these are no-ops). */
    if (wrapper.getBoundingClientRect().width < 10) wrapper.style.width = "100%";
    if (wrapper.getBoundingClientRect().height < 10 && !wrapper.style.aspectRatio) {
      wrapper.style.aspectRatio = "16 / 9";
    }

    video.removeAttribute("controls"); /* our UI replaces the native chrome */

    // Big centre play button
    var bigPlay = document.createElement("button");
    bigPlay.type = "button";
    bigPlay.className = "svp__bigplay";
    bigPlay.setAttribute("aria-label", "Play");
    bigPlay.appendChild(icon(ICONS.play));

    // Bottom bar
    var bar = document.createElement("div");
    bar.className = "svp__bar";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "svp__btn svp__toggle";
    toggle.setAttribute("aria-label", "Play");
    setIcon(toggle, "play");

    var cur = document.createElement("span");
    cur.className = "svp__time";
    cur.textContent = "0:00";

    // Scrubber: buffered + progress fill + native range on top for a11y/drag
    var scrub = document.createElement("div");
    scrub.className = "svp__scrub";
    var buffered = document.createElement("div");
    buffered.className = "svp__buffered";
    var fill = document.createElement("div");
    fill.className = "svp__fill";
    var range = document.createElement("input");
    range.type = "range";
    range.className = "svp__range";
    range.min = "0"; range.max = "1000"; range.value = "0"; range.step = "1";
    range.setAttribute("aria-label", "Seek");
    scrub.appendChild(buffered);
    scrub.appendChild(fill);
    scrub.appendChild(range);

    var dur = document.createElement("span");
    dur.className = "svp__time";
    dur.textContent = "0:00";

    var mute = document.createElement("button");
    mute.type = "button";
    mute.className = "svp__btn svp__mute";
    mute.setAttribute("aria-label", "Mute");
    setIcon(mute, "volume");

    var fs = document.createElement("button");
    fs.type = "button";
    fs.className = "svp__btn svp__fs";
    fs.setAttribute("aria-label", "Fullscreen");
    setIcon(fs, "full");

    bar.appendChild(toggle);
    bar.appendChild(cur);
    bar.appendChild(scrub);
    bar.appendChild(dur);
    bar.appendChild(mute);
    bar.appendChild(fs);

    wrapper.appendChild(bigPlay);
    wrapper.appendChild(bar);

    var scrubbing = false;
    var idleTimer = null;

    // Reflect playing state on the toggle + wrapper class
    function reflect(isPlaying) {
      wrapper.classList.toggle("is-playing", isPlaying);
      wrapper.classList.toggle("is-paused", !isPlaying);
      setIcon(toggle, isPlaying ? "pause" : "play");
      toggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
      bigPlay.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    }

    // Idle auto-hide while playing
    function wake() {
      wrapper.classList.remove("is-idle");
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (wrapper.classList.contains("is-playing")) wrapper.classList.add("is-idle");
      }, IDLE_DELAY);
    }
    wrapper.addEventListener("mousemove", wake);
    wrapper.addEventListener("mouseleave", function () {
      if (wrapper.classList.contains("is-playing")) wrapper.classList.add("is-idle");
    });

    /* FACADE: the mp4 loads on the first play click, not on page load. */
    function requestPlay() {
      wrapper.classList.add("is-loading");
      lazyLoad(video).then(function () {
        hidePicture(video);
        video.play().catch(function () { wrapper.classList.remove("is-loading"); });
      }).catch(function (err) {
        wrapper.classList.remove("is-loading");
        console.warn(err);
      });
    }

    function togglePlayback() {
      if (video.paused || video.ended) requestPlay();
      else video.pause();
    }

    bigPlay.addEventListener("click", function (e) { e.preventDefault(); togglePlayback(); });
    toggle.addEventListener("click",  function (e) { e.preventDefault(); togglePlayback(); });

    /* Click anywhere on the video surface toggles playback too */
    wrapper.addEventListener("click", function (e) {
      if (e.target.closest(".svp__bar") || e.target.closest(".svp__bigplay")) return;
      togglePlayback();
    });

    // ── Native <video> events drive the UI ──
    video.addEventListener("play", function () { reflect(true); wake(); });
    video.addEventListener("playing", function () {
      wrapper.classList.remove("is-loading");
      hidePicture(video);
    });
    video.addEventListener("pause", function () {
      reflect(false);
      wrapper.classList.remove("is-idle");
    });
    video.addEventListener("ended", function () {
      reflect(false);
      wrapper.classList.remove("is-idle");
      if (!video.loop) {
        showPicture(video);
        fill.style.width = "0%";
        range.value = "0";
      }
    });

    video.addEventListener("timeupdate", function () {
      if (scrubbing) return;
      var d = video.duration || 0;
      var t = video.currentTime || 0;
      cur.textContent = formatTime(t);
      fill.style.width = (d ? (t / d) * 100 : 0) + "%";
      range.value = String(Math.round((d ? t / d : 0) * 1000));
    });

    video.addEventListener("durationchange", function () {
      dur.textContent = formatTime(video.duration || 0);
    });

    video.addEventListener("progress", function () {
      var d = video.duration || 0;
      if (!d || !video.buffered.length) return;
      buffered.style.width = ((video.buffered.end(video.buffered.length - 1) / d) * 100) + "%";
    });

    // ── Scrubber ──
    range.addEventListener("input", function () {
      scrubbing = true;
      var ratio = Number(range.value) / 1000;
      fill.style.width = (ratio * 100) + "%";
      cur.textContent = formatTime(ratio * (video.duration || 0));
    });
    function commitSeek() {
      if (!scrubbing) return;
      video.currentTime = (Number(range.value) / 1000) * (video.duration || 0);
      scrubbing = false;
    }
    range.addEventListener("change", commitSeek);
    range.addEventListener("mouseup", commitSeek);
    range.addEventListener("touchend", commitSeek);

    // ── Mute ──
    mute.addEventListener("click", function (e) {
      e.preventDefault();
      video.muted = !video.muted;
    });
    function reflectMuted() {
      var m = video.muted || video.volume === 0;
      setIcon(mute, m ? "muted" : "volume");
      mute.setAttribute("aria-label", m ? "Unmute" : "Mute");
    }
    video.addEventListener("volumechange", reflectMuted);
    reflectMuted();

    // ── Fullscreen (wrapper first, iOS Safari video fallback) ──
    fs.addEventListener("click", function (e) {
      e.preventDefault();
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      } else if (wrapper.requestFullscreen || wrapper.webkitRequestFullscreen) {
        (wrapper.requestFullscreen || wrapper.webkitRequestFullscreen).call(wrapper);
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen(); /* iPhone: native fullscreen player */
      }
    });
    document.addEventListener("fullscreenchange", function () {
      var on = document.fullscreenElement === wrapper;
      wrapper.classList.toggle("is-fullscreen", on);
      setIcon(fs, on ? "exit" : "full");
      fs.setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
    });

    reflect(!video.paused);
    if (video.duration) dur.textContent = formatTime(video.duration);
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

      /* Injected controller (data-video-controls) lives in the parent */
      if (container && container.classList.contains("svp")) {
        container.querySelectorAll(".svp__bigplay, .svp__bar").forEach(function (el) {
          el.style.display = isMobile ? "none" : "";
          el.setAttribute("aria-hidden", isMobile ? "true" : "false");
        });
        return;
      }

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
      var controls = video.getAttribute("data-video-controls") === "true";

      if (controls) {
        wireControls(video);
        var autoplay = video.getAttribute("data-video-autoplay") === "true";
        if (autoplay && !prefersReducedMotion) {
          video.muted = true; /* required by browser autoplay policies */
          lazyObserver.observe(video);
          wireAutoplay(video);
        }
        /* no autoplay → facade: the mp4 loads on the first play click */
        return;
      }

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

    /* After wiring — injected controllers now exist, so they get hidden too */
    setDesktopOnlyVisibility();
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initVideoInline = initVideoInline;

})(typeof window !== "undefined" ? window : this);
