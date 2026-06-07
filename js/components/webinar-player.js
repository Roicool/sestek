/*!
 * webinar-player.js v2.1.2
 * Inline YouTube playback with a full, self-building Sestek-style controller —
 * no native YouTube chrome, no click-through to youtube.com.
 *
 * The script injects its own UI (you do NOT wire any buttons):
 *   • a big centred play button shown while paused / before start
 *   • a bottom control bar that appears on play: play-pause toggle,
 *     scrubber with buffered + progress fill, current / total time,
 *     mute toggle and fullscreen
 *   • controls auto-hide while playing and reappear on hover / mouse-move
 *   • poster thumbnail that crossfades out on play
 *
 * PageSpeed: this is a FACADE. On load it shows only the poster + play button
 * and ships ZERO YouTube payload. The heavy IFrame API + iframe (~hundreds of
 * KB) load only on the first play click (or for data-webinar-autoplay, when the
 * wrapper nears the viewport). Hover/touch pre-warms the connection so the
 * eventual load feels instant. This is exactly Lighthouse's "lazy-load
 * third-party resources with facades" recommendation.
 *
 * For self-hosted <video> files use video-inline.js. For a lightbox use
 * video-modal.js.
 *
 * API:
 *   Sestek.initWebinarPlayer()   — wire every [data-webinar] element
 *
 * ── DOM (minimal — everything else is injected) ──────────────────
 *
 *   <div data-webinar="ajman" data-webinar-video-id="Q7fGqFGVtuk" class="webinar">
 *     <img  data-webinar-picture="ajman" src="poster.jpg" alt="">  <!-- optional -->
 *     <div  data-webinar-frame="ajman"></div>                       <!-- empty div -->
 *   </div>
 *
 * ⚠️ data-webinar-frame MUST be an empty <div> — NOT a Webflow YouTube embed.
 *
 * ── Attributes (on the [data-webinar] wrapper) ───────────────────
 *
 *   data-webinar                 unique id — required, links the parts
 *   data-webinar-video-id        YouTube id OR full URL — required
 *   data-webinar-autoplay="true" muted autoplay once ready
 *   data-webinar-loop="true"     loop the single video endlessly
 *   data-webinar-accent="#EC008C" controller accent colour (CSS var or hex);
 *                                defaults to --interactive--color-primary-base
 *   data-webinar-desktop-only="true" hide below 991px
 *
 * Styling lives in css/components/webinar-player.css (load it too).
 * Respects prefers-reduced-motion — no autoplay for users who opt out.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ROOT_MARGIN        = "300px";
  var DESKTOP_BREAKPOINT = 991;
  var API_SRC            = "https://www.youtube.com/iframe_api";
  var IDLE_DELAY         = 2600; /* ms of no input before controls fade */
  var SVGNS              = "http://www.w3.org/2000/svg";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var apiPromise   = null;
  var lazyObserver = null;

  // ── Helpers ───────────────────────────────────────────────────

  function flag(v) {
    if (v === null) return false;
    if (v === "") return true;
    return v !== "false" && v !== "0" && v !== "off";
  }

  function extractVideoId(raw) {
    if (!raw) return null;
    var match = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (match) return match[1];
    return /^[\w-]{6,}$/.test(raw.trim()) ? raw.trim() : null;
  }

  /** Match ANY element carrying the attribute — Webflow outputs a bare <img>. */
  function findPicture(wrapper, id) {
    return wrapper.querySelector('[data-webinar-picture="' + id + '"]')
        || document.querySelector('[data-webinar-picture="' + id + '"]');
  }

  function resolveColor(value, contextEl) {
    if (!value) return value;
    var v = value.trim();
    var match = v.match(/^var\(\s*(--[^,)]+)/) || (v.indexOf("--") === 0 ? [null, v] : null);
    if (match) {
      var resolved = getComputedStyle(contextEl).getPropertyValue(match[1]).trim();
      if (resolved) return resolved;
    }
    return v;
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

  /* Icon path sets (filled, 24×24) */
  var ICONS = {
    play:  ["M6.5 5v14l11-7z"], /* bbox-centred in the 24×24 viewBox */
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

  /* Pre-warm DNS/TLS to YouTube's hosts — injected once, just before the
   * iframe is needed (on hover/touch or first play), never on page load. */
  var warmed = false;
  function warmConnections() {
    if (warmed) return;
    warmed = true;
    [
      "https://www.youtube-nocookie.com",
      "https://www.youtube.com",
      "https://www.google.com",
      "https://googleads.g.doubleclick.net",
      "https://static.doubleclick.net",
      "https://i.ytimg.com",
    ].forEach(function (href) {
      var l = document.createElement("link");
      l.rel = "preconnect";
      l.href = href;
      l.crossOrigin = "";
      document.head.appendChild(l);
    });
  }

  function loadYouTubeAPI() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve) {
      if (global.YT && global.YT.Player) { resolve(global.YT); return; }
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

  // ── Controller UI ─────────────────────────────────────────────

  /** Build the whole control layer and return handles the player wires to. */
  function buildControls(wrapper, accent) {
    wrapper.classList.add("swp");
    wrapper.style.setProperty("--swp-accent", accent);

    // Big centre play button
    var bigPlay = document.createElement("button");
    bigPlay.type = "button";
    bigPlay.className = "swp__bigplay";
    bigPlay.setAttribute("aria-label", "Play");
    bigPlay.appendChild(icon(ICONS.play));

    // Bottom bar
    var bar = document.createElement("div");
    bar.className = "swp__bar";

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "swp__btn swp__toggle";
    toggle.setAttribute("aria-label", "Play");
    setIcon(toggle, "play");

    var cur = document.createElement("span");
    cur.className = "swp__time";
    cur.textContent = "0:00";

    // Scrubber: buffered + progress fill + native range on top for a11y/drag
    var scrub = document.createElement("div");
    scrub.className = "swp__scrub";
    var buffered = document.createElement("div");
    buffered.className = "swp__buffered";
    var fill = document.createElement("div");
    fill.className = "swp__fill";
    var range = document.createElement("input");
    range.type = "range";
    range.className = "swp__range";
    range.min = "0"; range.max = "1000"; range.value = "0"; range.step = "1";
    range.setAttribute("aria-label", "Seek");
    scrub.appendChild(buffered);
    scrub.appendChild(fill);
    scrub.appendChild(range);

    var dur = document.createElement("span");
    dur.className = "swp__time";
    dur.textContent = "0:00";

    var mute = document.createElement("button");
    mute.type = "button";
    mute.className = "swp__btn swp__mute";
    mute.setAttribute("aria-label", "Mute");
    setIcon(mute, "volume");

    var fs = document.createElement("button");
    fs.type = "button";
    fs.className = "swp__btn swp__fs";
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

    return {
      bigPlay: bigPlay, bar: bar, toggle: toggle, range: range,
      fill: fill, buffered: buffered, cur: cur, dur: dur, mute: mute, fs: fs,
    };
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
    var accent   = resolveColor(
      wrapper.getAttribute("data-webinar-accent") || "--interactive--color-primary-base",
      wrapper
    ) || "#EC008C";

    // ── Layout ────────────────────────────────────────────────────
    // The .swp class (CSS) gives the wrapper a strict 16:9 aspect-ratio, so the
    // box can never collapse (height derives from width) and the 16:9 video
    // fills it edge-to-edge with no letterbox bars. Poster + iframe are both
    // absolute covers; controls overlay on top.
    if (getComputedStyle(wrapper).position === "static") wrapper.style.position = "relative";
    wrapper.style.overflow = "hidden";

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

    /* Safety nets (only bite if the CSS file is missing — when it's loaded the
     * box is already a reserved 16:9, so these are no-ops and cause no shift). */
    if (wrapper.getBoundingClientRect().width < 10) wrapper.style.width = "100%";
    if (wrapper.getBoundingClientRect().height < 10 && !wrapper.style.aspectRatio) {
      wrapper.style.aspectRatio = "16 / 9";
    }

    var frame = wrapper.querySelector('[data-webinar-frame="' + id + '"]')
             || wrapper.querySelector("[data-webinar-frame]");
    if (!frame || frame.tagName === "IFRAME") {
      var fresh = document.createElement("div");
      fresh.setAttribute("data-webinar-frame", id);
      if (frame && frame.parentNode) frame.parentNode.replaceChild(fresh, frame);
      else wrapper.appendChild(fresh);
      frame = fresh;
    }
    frame.style.position = "absolute"; /* behind the poster, fills the box */
    frame.style.inset = "0";
    frame.style.width = "100%";
    frame.style.height = "100%";
    frame.style.zIndex = "1";
    frame.style.pointerEvents = "none"; /* clicks go to our overlay, never YouTube */

    var mount = document.createElement("div");
    frame.appendChild(mount);

    // ── Build controls ──
    var ui = buildControls(wrapper, accent);

    var player        = null;
    var booted        = false;  /* has the YouTube iframe been loaded yet? */
    var pendingAction = null;   /* "play" | "pause" queued during boot */
    var scrubbing     = false;
    var pollTimer     = null;
    var idleTimer     = null;

    function ready() { return player && typeof player.playVideo === "function"; }

    /* Facade: nothing from YouTube loads until the first play. requestPlay
     * boots the player on demand; everything else no-ops until then. */
    function requestPlay() {
      if (ready()) { player.playVideo(); return; }
      pendingAction = "play";
      boot();
    }
    function requestPause() {
      if (ready()) player.pauseVideo();
      else pendingAction = null; /* cancel a queued play */
    }

    function showPoster() { if (poster) { poster.style.opacity = "1"; poster.style.pointerEvents = ""; } }
    function hidePoster() { if (poster) { poster.style.opacity = "0"; poster.style.pointerEvents = "none"; } }

    // Reflect playing state on the toggle + wrapper class
    function reflect(isPlaying) {
      wrapper.classList.toggle("is-playing", isPlaying);
      wrapper.classList.toggle("is-paused", !isPlaying);
      setIcon(ui.toggle, isPlaying ? "pause" : "play");
      ui.toggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
      ui.bigPlay.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
      if (isPlaying) startPoll(); else stopPoll();
    }

    // Progress polling (YT has no timeupdate event)
    function startPoll() {
      if (pollTimer) return;
      pollTimer = setInterval(tick, 250);
    }
    function stopPoll() {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }
    function tick() {
      if (!ready() || scrubbing) return;
      var d = player.getDuration() || 0;
      var t = player.getCurrentTime() || 0;
      ui.dur.textContent = formatTime(d);
      ui.cur.textContent = formatTime(t);
      var pct = d ? (t / d) * 100 : 0;
      ui.fill.style.width = pct + "%";
      ui.range.value = String(Math.round((d ? t / d : 0) * 1000));
      var loaded = (typeof player.getVideoLoadedFraction === "function")
        ? player.getVideoLoadedFraction() : 0;
      ui.buffered.style.width = (loaded * 100) + "%";
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

    // ── Wire controls ──
    /* Don't hide the poster on click — keep it up (with a loading state) until
     * the video actually starts, so there's no black flash while YT boots. */
    ui.bigPlay.addEventListener("click", function (e) {
      e.preventDefault();
      if (wrapper.classList.contains("is-playing")) requestPause();
      else { wrapper.classList.add("is-loading"); requestPlay(); }
    });
    ui.toggle.addEventListener("click", function (e) {
      e.preventDefault();
      if (wrapper.classList.contains("is-playing")) requestPause();
      else { wrapper.classList.add("is-loading"); requestPlay(); }
    });

    ui.range.addEventListener("input", function () {
      scrubbing = true;
      var ratio = Number(ui.range.value) / 1000;
      ui.fill.style.width = (ratio * 100) + "%";
      if (ready()) ui.cur.textContent = formatTime(ratio * (player.getDuration() || 0));
    });
    function commitSeek() {
      if (!ready()) { scrubbing = false; return; }
      var ratio = Number(ui.range.value) / 1000;
      player.seekTo(ratio * (player.getDuration() || 0), true);
      scrubbing = false;
    }
    ui.range.addEventListener("change", commitSeek);
    ui.range.addEventListener("mouseup", commitSeek);
    ui.range.addEventListener("touchend", commitSeek);

    ui.mute.addEventListener("click", function (e) {
      e.preventDefault();
      if (!ready()) return;
      if (player.isMuted()) { player.unMute(); setIcon(ui.mute, "volume"); ui.mute.setAttribute("aria-label", "Mute"); }
      else { player.mute(); setIcon(ui.mute, "muted"); ui.mute.setAttribute("aria-label", "Unmute"); }
    });

    ui.fs.addEventListener("click", function (e) {
      e.preventDefault();
      var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) {
        (document.exitFullscreen || document.webkitExitFullscreen || function () {}).call(document);
      } else {
        (wrapper.requestFullscreen || wrapper.webkitRequestFullscreen || function () {}).call(wrapper);
      }
    });
    document.addEventListener("fullscreenchange", function () {
      var on = document.fullscreenElement === wrapper;
      wrapper.classList.toggle("is-fullscreen", on);
      setIcon(ui.fs, on ? "exit" : "full");
    });

    // ── Warm the connection on intent (cheap, no payload yet) ──
    // A preconnect just before the click shaves latency off the iframe load
    // without costing anything on initial page load.
    function warm() {
      warmConnections();
      wrapper.removeEventListener("pointerenter", warm);
      wrapper.removeEventListener("touchstart", warm);
    }
    wrapper.addEventListener("pointerenter", warm);
    wrapper.addEventListener("touchstart", warm, { passive: true });

    // ── Boot the YT player (facade → only on first play / autoplay) ──
    reflect(false);

    function boot() {
      if (booted) return;
      booted = true;
      warmConnections();
      loadYouTubeAPI().then(function (YT) {
      player = new YT.Player(mount, {
        videoId: videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          controls: 0, rel: 0, modestbranding: 1, playsinline: 1,
          disablekb: 1, iv_load_policy: 3, fs: 0,
          loop: loop ? 1 : 0,
          playlist: loop ? videoId : undefined,
        },
        events: {
          onReady: function (e) {
            var iframe = e.target.getIframe();
            if (iframe) {
              iframe.style.position = "absolute";
              iframe.style.inset = "0";
              iframe.style.width = "100%";
              iframe.style.height = "100%";
              iframe.style.border = "0";
            }
            ui.dur.textContent = formatTime(e.target.getDuration() || 0);
            if (e.target.isMuted && e.target.isMuted()) {
              setIcon(ui.mute, "muted"); ui.mute.setAttribute("aria-label", "Unmute");
            }
            var shouldPlay = autoplay || pendingAction === "play";
            pendingAction = null;
            if (shouldPlay) { hidePoster(); e.target.playVideo(); }
          },
          onStateChange: function (e) {
            if (e.data === YT.PlayerState.PLAYING) {
              wrapper.classList.remove("is-loading");
              hidePoster(); reflect(true); wake();
            } else if (e.data === YT.PlayerState.PAUSED) {
              reflect(false); wrapper.classList.remove("is-idle");
            } else if (e.data === YT.PlayerState.ENDED) {
              reflect(false); wrapper.classList.remove("is-idle");
              if (!loop) { showPoster(); ui.fill.style.width = "0%"; ui.range.value = "0"; }
            }
          },
        },
      });
      }); // loadYouTubeAPI().then
    } // boot()

    if (autoplay) boot(); /* autoplay must load eagerly; otherwise facade */
  }

  // ── CLS guard ─────────────────────────────────────────────────

  /* Reserve the 16:9 box synchronously at init — BEFORE the (lazy) poster image
   * loads — so the box never grows and nothing below it shifts. Setting it
   * INLINE beats any height on the Webflow class (inline > stylesheet); forcing
   * height:auto lets aspect-ratio actually compute. This is the placeholder /
   * spacer idea, done for you — no extra DOM, no Webflow CSS fight. */
  function reserveBox(wrapper) {
    var s = wrapper.style;
    if (!s.aspectRatio) s.aspectRatio = "16 / 9";
    s.height = "auto";
    if (getComputedStyle(wrapper).position === "static") s.position = "relative";
    s.overflow = "hidden";
  }

  // ── Desktop-only players ──────────────────────────────────────

  function setDesktopOnlyVisibility() {
    var isMobile = window.innerWidth <= DESKTOP_BREAKPOINT;
    document.querySelectorAll('[data-webinar][data-webinar-desktop-only="true"]').forEach(function (wrapper) {
      wrapper.style.display = isMobile ? "none" : "";
      wrapper.setAttribute("aria-hidden", isMobile ? "true" : "false");
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
      reserveBox(wrapper);          /* reserve space NOW → zero CLS */
      lazyObserver.observe(wrapper);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initWebinarPlayer = initWebinarPlayer;

})(typeof window !== "undefined" ? window : this);
