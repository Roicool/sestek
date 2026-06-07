/*!
 * webinar-player.js v1.1.0
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

  /* Match ANY element carrying the attribute — <picture>, <img>, <div>… —
   * not just <picture>. Webflow usually outputs a bare <img>. */
  function findPicture(wrapper, id) {
    return wrapper.querySelector('[data-webinar-picture="' + id + '"]')
        || document.querySelector('[data-webinar-picture="' + id + '"]');
  }

  function showPicture(wrapper, id) {
    var pic = findPicture(wrapper, id);
    if (!pic) return;
    pic.style.opacity = "1";
    pic.style.pointerEvents = "";
  }

  function hidePicture(wrapper, id) {
    var pic = findPicture(wrapper, id);
    if (!pic) return;
    pic.style.opacity = "0";
    pic.style.pointerEvents = "none"; /* let clicks fall through once hidden */
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
    /* Prefer a buttons scoped inside this wrapper (no data-webinar needed);
     * fall back to an explicit data-webinar match elsewhere in the document. */
    var playBtn  = wrapper.querySelector('[data-webinar-playback="play"]')
                || document.querySelector('[data-webinar-playback="play"][data-webinar="' + id + '"]');
    var pauseBtn = wrapper.querySelector('[data-webinar-playback="pause"]')
                || document.querySelector('[data-webinar-playback="pause"][data-webinar="' + id + '"]');

    if (!playBtn || !pauseBtn) return null;

    /* Buttons sit above the iframe; make sure they're clickable + on top. */
    [playBtn, pauseBtn].forEach(function (btn) {
      if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
      btn.style.zIndex = "3";
    });

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

    var autoplay = flag(wrapper.getAttribute("data-webinar-autoplay")) && !prefersReducedMotion;
    var loop     = flag(wrapper.getAttribute("data-webinar-loop"));

    /* ── Layout (forced via inline styles, no CSS dependency) ──────
     * The wrapper is the positioning context; the frame fills it; YT.Player
     * REPLACES whatever element we hand it with a fresh <iframe>, so we mount
     * on a throwaway child <div> inside the frame — that way the iframe ends
     * up INSIDE the frame container and we can size it to fill. */
    if (getComputedStyle(wrapper).position === "static") {
      wrapper.style.position = "relative";
    }

    /* Natural height now, while the poster is still in-flow. After we go
     * absolute the wrapper may collapse to 0 — we restore this below. */
    var naturalHeight = wrapper.getBoundingClientRect().height;

    var frame = wrapper.querySelector('[data-webinar-frame="' + id + '"]')
             || wrapper.querySelector("[data-webinar-frame]");

    /* If the frame is missing or the user dropped a raw <iframe> in (e.g. a
     * Webflow YouTube embed), normalise it to an empty positioned <div>. */
    if (!frame || frame.tagName === "IFRAME") {
      var fresh = document.createElement("div");
      fresh.setAttribute("data-webinar-frame", id);
      if (frame && frame.parentNode) frame.parentNode.replaceChild(fresh, frame);
      else wrapper.appendChild(fresh);
      frame = fresh;
    }

    frame.style.position = "absolute";
    frame.style.inset = "0";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.zIndex = "1";

    var mount = document.createElement("div");
    frame.appendChild(mount);

    /* Poster overlays the frame and fades out on play. */
    var poster = findPicture(wrapper, id);
    if (poster) {
      poster.style.position = "absolute";
      poster.style.inset = "0";
      poster.style.width = "100%";
      poster.style.height = "100%";
      poster.style.objectFit = "cover";
      poster.style.zIndex = "2";
      poster.style.transition = "opacity 0.4s ease";
    }

    /* Poster + iframe are now absolute — if the wrapper collapsed, give it back
     * its height (or a 16:9 box if it never had an explicit one). */
    if (wrapper.getBoundingClientRect().height < 10) {
      if (naturalHeight >= 10) wrapper.style.height = naturalHeight + "px";
      else wrapper.style.aspectRatio = "16 / 9";
    }

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
        width: "100%",
        height: "100%",
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
            /* The freshly-created iframe defaults to 640×360 at top-left and
             * carries no class — force it to fill the frame container. */
            var iframe = e.target.getIframe();
            if (iframe) {
              iframe.style.position = "absolute";
              iframe.style.inset = "0";
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "0";
            }

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
