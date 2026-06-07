/*!
 * webinar-player.js v1.0.1
 * Inline YouTube playback with fully custom controls — no native YouTube
 * chrome, no click-through to youtube.com. Lazy-loads the IFrame Player API,
 * crossfades a poster thumbnail, and exposes play/pause buttons you design
 * yourself. Zero dependencies beyond the YouTube IFrame API (loaded on demand).
 *
 * For self-hosted <video> files, use video-inline.js. For a YouTube/Vimeo/
 * Cloudflare Stream lightbox, use video-modal.js.
 *
 * API:
 *   Sestek.initWebinarPlayer()   — wire every [data-webinar] element on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-webinar="session-1" data-webinar-video-id="dQw4w9WgXcQ">
 *     <picture data-webinar-picture="session-1">    ← optional poster, crossfades
 *       <img src="poster.jpg" alt="">
 *     </picture>
 *
 *     <div data-webinar-frame="session-1"></div>    ← iframe is injected here
 *
 *     <button data-webinar-playback="play"  data-webinar="session-1">▶</button>
 *     <button data-webinar-playback="pause" data-webinar="session-1">⏸</button>
 *   </div>
 *
 * ── Attributes (all on the [data-webinar] wrapper) ───────────────
 *
 *   data-webinar                    unique id — required, links every part
 *   data-webinar-video-id           YouTube video id — required (e.g. "dQw4w9WgXcQ")
 *                                   a full watch/share/embed URL also works
 *   data-webinar-autoplay="true"    start playing as soon as the player is ready
 *   data-webinar-loop="true"        loop the single video endlessly
 *   data-webinar-desktop-only="true" hide player + controls below 991px
 *
 * Players lazy-load: the YouTube IFrame API and the iframe itself are only
 * created when the wrapper nears the viewport (IntersectionObserver,
 * rootMargin 300px) — this is what keeps PageSpeed unaffected.
 *
 * Respects prefers-reduced-motion — no autoplay for users who opt out;
 * players stay on their poster until explicitly pressed play.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ROOT_MARGIN        = "300px";
  var DESKTOP_BREAKPOINT = 991;
  var API_SRC            = "https://www.youtube.com/iframe_api";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var apiPromise   = null;
  var lazyObserver = null;

  // ── Helpers ───────────────────────────────────────────────────

  function flag(v) {
    if (v === null) return false;
    if (v === "") return true;
    return v !== "false" && v !== "0" && v !== "off";
  }

  /** Accepts a bare id or a full YouTube URL and returns the video id. */
  function extractVideoId(raw) {
    if (!raw) return null;
    var match = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (match) return match[1];
    return /^[\w-]{6,}$/.test(raw.trim()) ? raw.trim() : null;
  }

  function findPicture(wrapper, id) {
    return wrapper.querySelector('picture[data-webinar-picture="' + id + '"]')
        || document.querySelector('picture[data-webinar-picture="' + id + '"]');
  }

  function showPicture(wrapper, id) {
    var pic = findPicture(wrapper, id);
    if (pic) pic.style.opacity = "1";
  }

  function hidePicture(wrapper, id) {
    var pic = findPicture(wrapper, id);
    if (pic) pic.style.opacity = "0";
  }

  /** Load the YouTube IFrame Player API once, share the promise across players. */
  function loadYouTubeAPI() {
    if (apiPromise) return apiPromise;

    apiPromise = new Promise(function (resolve) {
      if (global.YT && global.YT.Player) {
        resolve(global.YT);
        return;
      }

      var prevReady = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () {
        if (typeof prevReady === "function") prevReady();
        resolve(global.YT);
      };

      if (!document.querySelector('script[src="' + API_SRC + '"]')) {
        var script = document.createElement("script");
        script.src = API_SRC;
        document.head.appendChild(script);
      }
    });

    return apiPromise;
  }

  // ── Custom play/pause buttons ─────────────────────────────────

  function wirePlaybackButtons(wrapper, id, requestPlay, requestPause) {
    var playBtn  = wrapper.querySelector('[data-webinar-playback="play"][data-webinar="' + id + '"]')
                || document.querySelector('[data-webinar-playback="play"][data-webinar="' + id + '"]');
    var pauseBtn = wrapper.querySelector('[data-webinar-playback="pause"][data-webinar="' + id + '"]')
                || document.querySelector('[data-webinar-playback="pause"][data-webinar="' + id + '"]');

    if (!playBtn || !pauseBtn) return null;

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

    setPlaying(false);

    playBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      hidePicture(wrapper, id);
      requestPlay();
    });

    pauseBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      requestPause();
    });

    return setPlaying;
  }

  // ── Player creation ───────────────────────────────────────────

  function createPlayer(wrapper) {
    var id      = wrapper.getAttribute("data-webinar");
    var videoId = extractVideoId(wrapper.getAttribute("data-webinar-video-id"));
    if (!videoId) {
      console.warn("[Sestek WebinarPlayer] missing/invalid data-webinar-video-id on", wrapper);
      return;
    }

    var mount = wrapper.querySelector('[data-webinar-frame="' + id + '"]') || wrapper;

    var autoplay = flag(wrapper.getAttribute("data-webinar-autoplay")) && !prefersReducedMotion;
    var loop     = flag(wrapper.getAttribute("data-webinar-loop"));

    var player        = null;
    var pendingAction = null; /* "play" | "pause" — queued while the player boots */

    /* Buttons can be clicked before the IFrame API finishes loading and the
     * player fires onReady — queue the request and apply it once ready,
     * instead of silently dropping it. */
    function requestPlay() {
      if (player && typeof player.playVideo === "function") player.playVideo();
      else pendingAction = "play";
    }

    function requestPause() {
      if (player && typeof player.pauseVideo === "function") player.pauseVideo();
      else pendingAction = "pause";
    }

    var setPlaying = wirePlaybackButtons(wrapper, id, requestPlay, requestPause);

    loadYouTubeAPI().then(function (YT) {
      player = new YT.Player(mount, {
        videoId: videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: loop ? 1 : 0,
          playlist: loop ? videoId : undefined,
        },
        events: {
          onReady: function (e) {
            var shouldPlay = autoplay || pendingAction === "play";
            pendingAction = null;
            if (shouldPlay) {
              hidePicture(wrapper, id);
              e.target.playVideo();
            }
          },
          onStateChange: function (e) {
            if (!setPlaying) return;
            if (e.data === YT.PlayerState.PLAYING) {
              hidePicture(wrapper, id);
              setPlaying(true);
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
              setPlaying(false);
              if (e.data === YT.PlayerState.ENDED && !loop) showPicture(wrapper, id);
            }
          },
        },
      });
    });
  }

  // ── Desktop-only players ──────────────────────────────────────

  function setDesktopOnlyVisibility() {
    var isMobile = window.innerWidth <= DESKTOP_BREAKPOINT;

    document.querySelectorAll('[data-webinar][data-webinar-desktop-only="true"]').forEach(function (wrapper) {
      var id = wrapper.getAttribute("data-webinar");

      wrapper.style.display = isMobile ? "none" : "";
      wrapper.setAttribute("aria-hidden", isMobile ? "true" : "false");

      ["play", "pause"].forEach(function (kind) {
        var btn = document.querySelector('[data-webinar-playback="' + kind + '"][data-webinar="' + id + '"]');
        if (!btn) return;
        btn.style.display = isMobile ? "none" : "";
        btn.setAttribute("aria-hidden", isMobile ? "true" : "false");
        if (isMobile) btn.setAttribute("tabindex", "-1");
        else btn.removeAttribute("tabindex");
      });
    });
  }

  // ── Init ──────────────────────────────────────────────────────

  function initWebinarPlayer() {
    var wrappers = document.querySelectorAll("[data-webinar]");
    if (!wrappers.length) return;

    setDesktopOnlyVisibility();
    if (document.querySelectorAll('[data-webinar][data-webinar-desktop-only="true"]').length) {
      window.addEventListener("resize", setDesktopOnlyVisibility);
    }

    lazyObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        createPlayer(entry.target);
        observer.unobserve(entry.target);
      });
    }, { root: null, rootMargin: ROOT_MARGIN, threshold: 0 });

    Array.prototype.forEach.call(wrappers, function (wrapper) {
      lazyObserver.observe(wrapper);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initWebinarPlayer = initWebinarPlayer;

})(typeof window !== "undefined" ? window : this);
