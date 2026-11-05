/*!
 * video-player.js v1.0.0
 * YouTube hero player: muted autoplay preview, a "Watch video" call to action
 * that restarts the video from 0:00 WITH sound, and Sestek-styled custom
 * controls (no YouTube chrome, no click-through to youtube.com).
 * https://github.com/roicool/sestek
 *
 * Behaviour
 *   • preview   muted, looping, starts once ≥50 % of the player is visible;
 *               pauses below 30 % visibility and when the tab is hidden
 *   • CTA       desktop: a glass pill that follows the cursor over the video;
 *               touch / keyboard / reduced motion: centred. Click anywhere on
 *               the preview (or Enter / Space on the pill) → restart at 0:00
 *               with sound. If the browser refuses sound (iOS), playback goes
 *               on muted with captions and a "tap for sound" hint.
 *   • controls  play / pause, time, seek bar (drag, click, keyboard slider),
 *               mute, captions, fullscreen (in-page fallback on iPhone).
 *               Shown on pointer move / tap / focus, hidden after 2.6 s idle.
 *   • keys      Space / K play-pause · M mute · C captions · F fullscreen ·
 *               ← → ±5 s · Home / End (while focus is inside the player)
 *   • captions  own .srt / .vtt file (drawn by the player) or YouTube's track.
 *               Muted → captions on, sound on → off, until the user presses CC.
 *   • end       after the full watch the player returns to the muted preview
 *               and the pill reads "Watch again".
 *   • one at a time: a player playing with sound pauses the others.
 *
 * PageSpeed: only the poster is in the first paint. The YouTube IFrame API
 * loads after window load + idle (data-vp-load="idle", default), right away
 * ("eager") or on the first interaction ("interaction"). Players far below
 * the fold load when they come within 300 px of the viewport.
 *
 * DOM (the script builds everything else):
 *   <div data-video-player data-vp-youtube="VIDEO_ID"></div>
 * An <img> placed inside becomes the poster (keeps Webflow srcset / LCP),
 * otherwise the YouTube thumbnail is used.
 *
 * Attributes (on [data-video-player]):
 *   data-vp-youtube      YouTube id or any YouTube URL                (required)
 *   data-vp-title        accessible name of the video
 *   data-vp-captions     .srt / .vtt URL drawn by the player
 *   data-vp-cc           YouTube caption language when there is no file
 *   data-vp-label        CTA text            (default "Watch video" / "Videoyu izle")
 *   data-vp-label-again  CTA text after the end      ("Watch again" / "Tekrar izle")
 *   data-vp-lang         "en" | "tr"                   (default: nearest [lang])
 *   data-vp-load         "idle" | "eager" | "interaction"         (default "idle")
 *   data-vp-preview      "false": no muted preview, poster until the CTA
 *   data-vp-follow       "false": CTA stays centred on desktop too
 *   data-vp-crop         "true": push YouTube's title / pause strips out of frame
 *
 * API: Sestek.initVideoPlayer(selector?) · Sestek.destroyVideoPlayer(el)
 * CSS: css/components/video-player.css (load in <head>: it reserves the 16:9
 *      box before the script runs, so there is no layout shift)
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var API_SRC = "https://www.youtube.com/iframe_api";
  var YT_HOST = "https://www.youtube-nocookie.com";
  var IDLE_MS = 2600;
  var TICK_MS = 250;
  var STEP = 5;
  var players = [];
  var apiPromise = null;
  var warmed = false;

  var TEXT = {
    en: {
      watch: "Watch video", again: "Watch again", preview: "Muted preview",
      play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute",
      cc: "Captions", fs: "Full screen", fsExit: "Exit full screen",
      seek: "Seek", region: "Video player", error: "This video can’t be played here.",
      youtube: "Watch on YouTube", sound: "Tap for sound"
    },
    tr: {
      watch: "Videoyu izle", again: "Tekrar izle", preview: "Sessiz önizleme",
      play: "Oynat", pause: "Duraklat", mute: "Sesi kapat", unmute: "Sesi aç",
      cc: "Altyazı", fs: "Tam ekran", fsExit: "Tam ekrandan çık",
      seek: "Video konumu", region: "Video oynatıcı", error: "Bu video burada oynatılamıyor.",
      youtube: "YouTube’da izle", sound: "Ses için dokunun"
    }
  };

  function svg(cls, body) {
    return '<svg class="vp__svg ' + cls + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + body + "</svg>";
  }
  var SPEAKER = '<path d="M4 9.6v4.8c0 .6.4 1 1 1h2.7l3.9 3.2c.7.5 1.7 0 1.7-.8V6.2c0-.8-1-1.3-1.7-.8L7.7 8.6H5c-.6 0-1 .4-1 1z" fill="currentColor"/>';
  var STROKE = ' fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var ICON = {
    play: svg("vp__i-play", '<path d="M8 5.7v12.6c0 .8.9 1.3 1.6.9l9.8-6.3c.6-.4.6-1.4 0-1.8L9.6 4.8C8.9 4.4 8 4.9 8 5.7z" fill="currentColor"/>'),
    pause: svg("vp__i-pause", '<rect x="6.5" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.2" fill="currentColor"/>'),
    vol: svg("vp__i-vol", SPEAKER + '<path d="M16.4 9a4.3 4.3 0 0 1 0 6M18.8 6.6a7.7 7.7 0 0 1 0 10.8"' + STROKE + "/>"),
    volOff: svg("vp__i-voloff", SPEAKER + '<path d="M16.6 9.8l4.4 4.4M21 9.8l-4.4 4.4"' + STROKE + "/>"),
    cc: svg("vp__i-cc", '<rect x="2.8" y="5" width="18.4" height="14" rx="3"' + STROKE + '/><path d="M10.6 10.3a2.1 2.1 0 1 0 0 3.4M17 10.3a2.1 2.1 0 1 0 0 3.4"' + STROKE + "/>"),
    fs: svg("vp__i-fs", '<path d="M4 9V5.5C4 4.7 4.7 4 5.5 4H9M15 4h3.5c.8 0 1.5.7 1.5 1.5V9M20 15v3.5c0 .8-.7 1.5-1.5 1.5H15M9 20H5.5C4.7 20 4 19.3 4 18.5V15"' + STROKE + "/>"),
    fsExit: svg("vp__i-fsexit", '<path d="M9 4v3.5C9 8.3 8.3 9 7.5 9H4M20 9h-3.5C15.7 9 15 8.3 15 7.5V4M15 20v-3.5c0-.8.7-1.5 1.5-1.5H20M4 15h3.5c.8 0 1.5.7 1.5 1.5V20"' + STROKE + "/>")
  };

  /* ── helpers ─────────────────────────────────────────────────────── */
  function attr(el, n) { return el.getAttribute("data-vp-" + n); }
  function flag(v, def) { return v == null || v === "" ? def : !/^(false|0|no|off)$/i.test(v); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mq(q) { return !!(global.matchMedia && global.matchMedia(q).matches); }
  function reducedMotion() { return mq("(prefers-reduced-motion: reduce)"); }

  function ytId(v) {
    v = (v || "").trim();
    var m = v.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
    if (m) return m[1];
    return /^[\w-]{11}$/.test(v) ? v : "";
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    s = Math.floor(s);
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (x < 10 ? "0" : "") + x;
  }

  function langOf(el) {
    var v = attr(el, "lang");
    if (!v) { var n = el.closest("[lang]"); v = n ? n.getAttribute("lang") : ""; }
    return /^tr/i.test(v || "") ? "tr" : "en";
  }

  function warm() {
    if (warmed) return;
    warmed = true;
    [YT_HOST, "https://www.youtube.com", "https://i.ytimg.com"].forEach(function (href) {
      if (doc.querySelector('link[rel="preconnect"][href="' + href + '"]')) return;
      var l = doc.createElement("link");
      l.rel = "preconnect"; l.href = href; l.crossOrigin = "";
      doc.head.appendChild(l);
    });
  }

  function loadApi() {
    if (apiPromise) return apiPromise;
    apiPromise = new Promise(function (resolve, reject) {
      if (global.YT && global.YT.Player) { resolve(global.YT); return; }
      var prev = global.onYouTubeIframeAPIReady;
      global.onYouTubeIframeAPIReady = function () {
        if (typeof prev === "function") { try { prev(); } catch (e) {} }
        resolve(global.YT);
      };
      if (!doc.querySelector('script[src*="youtube.com/iframe_api"]')) {
        var s = doc.createElement("script");
        s.src = API_SRC; s.async = true;
        s.onerror = function () { apiPromise = null; reject(new Error("YouTube API failed to load")); };
        doc.head.appendChild(s);
      }
    });
    return apiPromise;
  }

  function parseCaptions(text) {
    var toSec = function (t) {
      var p = t.replace(",", ".").split(":"), s = 0;
      for (var i = 0; i < p.length; i++) s = s * 60 + parseFloat(p[i]);
      return s;
    };
    return text.replace(/^﻿/, "").replace(/\r/g, "").split(/\n{2,}/).map(function (block) {
      var lines = block.split("\n"), i = -1;
      for (var k = 0; k < lines.length; k++) if (lines[k].indexOf("-->") > -1) { i = k; break; }
      if (i < 0) return null;
      var tc = lines[i].split("-->");
      var txt = lines.slice(i + 1).join("\n").replace(/<[^>]+>/g, "").trim();
      if (!txt) return null;
      return { a: toSec(tc[0].trim().split(/\s+/)[0]), b: toSec(tc[1].trim().split(/\s+/)[0]), t: txt };
    }).filter(Boolean);
  }

  function whenIdle(fn) {
    var go = function () {
      if (global.requestIdleCallback) global.requestIdleCallback(fn, { timeout: 1500 });
      else setTimeout(fn, 300);
    };
    if (doc.readyState === "complete") go();
    else global.addEventListener("load", go, { once: true });
  }

  /* ── markup ──────────────────────────────────────────────────────── */
  function markup(P) {
    var t = P.t;
    return '' +
      '<div class="vp__media"><div class="vp__mount"></div></div>' +
      '<div class="vp__shade" aria-hidden="true"></div>' +
      '<div class="vp__captions" hidden><span></span></div>' +
      '<div class="vp__hit" aria-hidden="true"></div>' +
      '<div class="vp__feedback" aria-hidden="true">' + ICON.play + ICON.pause + "</div>" +
      '<div class="vp__toast" role="status" aria-live="polite"></div>' +
      '<div class="vp__controls">' +
        '<div class="vp__progress" role="slider" tabindex="0" aria-label="' + t.seek + '" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00">' +
          '<div class="vp__track"><div class="vp__buffer"></div><div class="vp__played"></div></div><div class="vp__thumb"></div>' +
        "</div>" +
        '<div class="vp__bar">' +
          '<div class="vp__group">' +
            '<button type="button" class="vp__btn" data-vp-act="play" aria-label="' + t.play + '">' + ICON.play + ICON.pause + "</button>" +
            '<span class="vp__time"><span class="vp__cur">0:00</span><span class="vp__sep">/</span><span class="vp__dur">0:00</span></span>' +
          "</div>" +
          '<div class="vp__group is-end">' +
            '<button type="button" class="vp__btn" data-vp-act="mute" aria-label="' + t.unmute + '">' + ICON.vol + ICON.volOff + "</button>" +
            '<button type="button" class="vp__btn vp__btn--cc" data-vp-act="cc" aria-label="' + t.cc + '" aria-pressed="false">' + ICON.cc + "</button>" +
            '<button type="button" class="vp__btn" data-vp-act="fs" aria-label="' + t.fs + '">' + ICON.fs + ICON.fsExit + "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="vp__intro">' +
        '<span class="vp__badge" aria-hidden="true">' + ICON.volOff + '<span class="vp__badge-text">' + t.preview + "</span></span>" +
        '<div class="vp__cta-pos">' +
          '<button type="button" class="vp__cta">' +
            '<span class="vp__cta-disc">' + ICON.play + "</span>" +
            '<span class="vp__cta-label"></span>' +
            '<span class="vp__cta-time"></span>' +
          "</button>" +
        "</div>" +
      "</div>" +
      '<div class="vp__error" hidden><p class="vp__error-text">' + t.error + '</p>' +
        '<a class="vp__error-link" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=' + P.id + '">' + t.youtube + "</a></div>";
  }

  /* ── player ──────────────────────────────────────────────────────── */
  function Player(root) {
    var P = this;
    P.root = root;
    P.id = ytId(attr(root, "youtube"));
    P.lang = langOf(root);
    P.t = TEXT[P.lang];
    P.off = [];
    P.timers = {};
    P.html = root.innerHTML;
    P.reduced = reducedMotion();
    P.opts = {
      load: (attr(root, "load") || "idle").toLowerCase(),
      preview: flag(attr(root, "preview"), true) && !P.reduced,
      follow: flag(attr(root, "follow"), true) && !P.reduced && mq("(hover: hover) and (pointer: fine)"),
      crop: flag(attr(root, "crop"), false),
      captions: attr(root, "captions") || "",
      cc: attr(root, "cc") || "",
      label: attr(root, "label") || P.t.watch,
      again: attr(root, "label-again") || P.t.again,
      title: attr(root, "title") || ""
    };
    P.yt = null; P.ready = false; P.loading = false;
    P.playing = false; P.muted = true; P.active = false;
    P.duration = NaN; P.pending = null; P.pendingUntil = 0;
    P.cues = null; P.track = null; P.ccOn = false; P.ccOverride = false;
    P.vis = 0; P.resume = false; P.hiddenResume = false; P.userPaused = false;
    P.queued = false; P.scrubbing = false; P.lastSec = -1; P.ptr = "mouse";
    P.build();
    P.bind();
    P.observe();
    if (P.opts.load === "eager") P.load();
  }

  var proto = Player.prototype;

  proto.on = function (el, ev, fn, opt) {
    el.addEventListener(ev, fn, opt);
    this.off.push(function () { el.removeEventListener(ev, fn, opt); });
  };
  proto.cls = function (c, on) { this.root.classList.toggle(c, !!on); };
  proto.q = function (s) { return this.root.querySelector(s); };

  proto.build = function () {
    var P = this, root = P.root, t = P.t;
    var img = root.querySelector("img");
    if (img) img = img.parentNode.removeChild(img);
    root.innerHTML = markup(P);
    if (!img) {
      img = doc.createElement("img");
      img.alt = "";
      img.decoding = "async";
      img.src = "https://i.ytimg.com/vi/" + P.id + "/maxresdefault.jpg";
      img.onload = function () {
        if (img.naturalWidth && img.naturalWidth <= 120) img.src = "https://i.ytimg.com/vi/" + P.id + "/hqdefault.jpg";
      };
    }
    img.classList.add("vp__poster");
    img.removeAttribute("loading");
    root.insertBefore(img, root.firstChild);

    root.classList.add("vp", "is-preview", "is-paused", "is-muted");
    P.cls("is-cropped", P.opts.crop);
    P.cls("has-follow", P.opts.follow);
    P.cls("no-preview", !P.opts.preview);
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", P.opts.title || t.region);

    P.el = {
      poster: img,
      mount: P.q(".vp__mount"),
      captions: P.q(".vp__captions"),
      captionText: P.q(".vp__captions span"),
      hit: P.q(".vp__hit"),
      feedback: P.q(".vp__feedback"),
      toast: P.q(".vp__toast"),
      controls: P.q(".vp__controls"),
      progress: P.q(".vp__progress"),
      cur: P.q(".vp__cur"),
      dur: P.q(".vp__dur"),
      play: P.q('[data-vp-act="play"]'),
      mute: P.q('[data-vp-act="mute"]'),
      cc: P.q('[data-vp-act="cc"]'),
      fs: P.q('[data-vp-act="fs"]'),
      intro: P.q(".vp__intro"),
      ctaPos: P.q(".vp__cta-pos"),
      cta: P.q(".vp__cta"),
      ctaLabel: P.q(".vp__cta-label"),
      ctaTime: P.q(".vp__cta-time"),
      error: P.q(".vp__error")
    };
    P.el.ctaLabel.textContent = P.opts.label;
    P.setInert(false);
    if (P.opts.captions) P.loadCaptions();
  };

  /* controls are unreachable (inert) until the viewer chose to watch */
  proto.setInert = function (active) {
    var c = this.el.controls, intro = this.el.intro;
    if (active) { c.removeAttribute("inert"); c.removeAttribute("aria-hidden"); intro.setAttribute("inert", ""); intro.setAttribute("aria-hidden", "true"); }
    else { c.setAttribute("inert", ""); c.setAttribute("aria-hidden", "true"); intro.removeAttribute("inert"); intro.removeAttribute("aria-hidden"); }
  };

  proto.loadCaptions = function () {
    var P = this;
    fetch(P.opts.captions).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (txt) {
        var cues = parseCaptions(txt);
        if (!cues.length) return;
        P.cues = cues; P.track = "file";
        P.cls("has-cc", true);
        P.autoCaptions();
      })
      .catch(function (e) { console.warn("[Sestek VideoPlayer] captions failed:", P.opts.captions, e); });
  };

  /* ── loading ─────────────────────────────────────────────────────── */
  proto.load = function () {
    var P = this;
    if (P.loading || !P.id) return;
    P.loading = true;
    warm();
    loadApi().then(function (YT) { P.create(YT); }).catch(function (e) {
      P.loading = false;
      console.warn("[Sestek VideoPlayer]", e);
      P.fail();
    });
  };

  proto.create = function (YT) {
    var P = this;
    if (P.destroyed) return;
    P.YT = YT;
    P.cls("is-loading", true);
    new YT.Player(P.el.mount, {
      videoId: P.id,
      host: YT_HOST,
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 0, mute: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
        iv_load_policy: 3, cc_load_policy: 0, playsinline: 1, modestbranding: 1,
        enablejsapi: 1, origin: global.location.origin
      },
      events: {
        onReady: function (e) { P.onReady(e); },
        onStateChange: function (e) { P.onState(e); },
        onError: function (e) { P.onError(e); },
        onApiChange: function () { P.onApi(); }
      }
    });
  };

  proto.onReady = function (e) {
    var P = this;
    if (P.destroyed) return;
    P.yt = e.target;
    P.ready = true;
    P.cls("is-loading", false);
    var f = P.yt.getIframe && P.yt.getIframe();
    if (f) {
      f.setAttribute("tabindex", "-1");
      f.setAttribute("title", P.opts.title || P.t.region);
      f.setAttribute("aria-hidden", "true");
    }
    P.yt.mute();
    P.muted = true;
    if (!P.track && P.opts.cc && P.yt.loadModule) P.yt.loadModule("captions");
    P.syncDuration();
    if (P.queued) { P.activateNow(); return; }
    if (P.wantPlay || (P.opts.preview && P.vis >= 0.5 && !doc.hidden)) P.play();
  };

  proto.onApi = function () {
    var P = this, yt = P.yt;
    if (!yt || P.track || !P.opts.cc || !yt.getOptions) return;
    var opts = yt.getOptions() || [];
    if (opts.indexOf("captions") < 0) return;
    var list = yt.getOption("captions", "tracklist") || [];
    var code = "";
    for (var i = 0; i < list.length; i++) if (list[i].languageCode === P.opts.cc) code = P.opts.cc;
    if (!code && list[0]) code = list[0].languageCode;
    if (!code) return;
    P.ytLang = code;
    P.track = "yt";
    yt.setOption("captions", "track", {});
    P.cls("has-cc", true);
    P.autoCaptions();
  };

  proto.onState = function (e) {
    var P = this, S = P.YT.PlayerState;
    if (e.data === S.PLAYING) {
      P.playing = true;
      P.cls("is-buffering", false);
      P.syncDuration();
      P.startTick();
      if (!P.started) {
        P.started = true;
        clearTimeout(P.timers.poster);
        P.timers.poster = setTimeout(function () { P.cls("is-started", true); }, 250);
      }
      if (P.active && !P.muted) P.exclusive();
      P.ui();
    } else if (e.data === S.PAUSED) {
      if (P.scrubbing) return;
      P.playing = false;
      P.stopTick();
      P.ui();
    } else if (e.data === S.BUFFERING) {
      P.cls("is-buffering", true);
    } else if (e.data === S.ENDED) {
      if (!P.active) { P.seek(0, true); P.yt.playVideo(); return; }
      P.toPreview();
    }
  };

  proto.onError = function (e) {
    console.warn("[Sestek VideoPlayer] YouTube error", e && e.data, this.id);
    this.fail();
  };

  proto.fail = function () {
    var P = this;
    P.stopTick();
    P.cls("is-error", true);
    P.el.error.hidden = false;
    P.el.intro.setAttribute("inert", "");
  };

  /* ── playback primitives ─────────────────────────────────────────── */
  proto.play = function () {
    var P = this;
    if (!P.ready) { P.wantPlay = true; P.load(); return; }
    P.wantPlay = false;
    P.want = true;
    P.yt.playVideo();
    P.playing = true;
    P.ui();
    clearTimeout(P.timers.check);
    P.timers.check = setTimeout(function () {
      if (!P.yt || !P.yt.getPlayerState) return;
      var s = P.yt.getPlayerState(), S = P.YT.PlayerState;
      if (P.playing && s !== S.PLAYING && s !== S.BUFFERING) { P.playing = false; P.stopTick(); P.ui(); }
    }, 2500);
  };

  proto.pause = function () {
    var P = this;
    P.wantPlay = false;
    P.want = false;
    if (P.yt) P.yt.pauseVideo();
    P.playing = false;
    P.stopTick();
    P.ui();
  };

  proto.setMuted = function (m) {
    var P = this;
    P.muted = !!m;
    if (P.yt) { if (P.muted) P.yt.mute(); else { P.yt.unMute(); if (P.yt.setVolume) P.yt.setVolume(100); } }
    if (!P.muted && P.active && P.playing) P.exclusive();
    P.autoCaptions();
    P.ui();
  };

  proto.seek = function (t, ahead) {
    var P = this;
    if (isFinite(P.duration)) t = clamp(t, 0, Math.max(0, P.duration - 0.25));
    else t = Math.max(0, t);
    P.pending = t;
    P.pendingUntil = global.performance.now() + 700;
    if (P.yt) P.yt.seekTo(t, ahead !== false);
    P.renderProgress();
    P.renderCaptions();
  };

  proto.time = function () {
    var P = this;
    if (P.pending !== null) {
      if (global.performance.now() < P.pendingUntil || !P.yt) return P.pending;
      P.pending = null;
    }
    return P.yt && P.yt.getCurrentTime ? P.yt.getCurrentTime() || 0 : 0;
  };

  proto.syncDuration = function () {
    var P = this;
    var d = P.yt && P.yt.getDuration ? P.yt.getDuration() : 0;
    if (!(d > 0) || d === P.duration) return;
    P.duration = d;
    P.el.dur.textContent = fmt(d);
    P.el.ctaTime.textContent = fmt(d);
    P.el.progress.setAttribute("aria-valuemax", String(Math.round(d)));
    P.cls("has-duration", true);
  };

  proto.startTick = function () {
    var P = this;
    if (P.timers.tick) return;
    P.timers.tick = setInterval(function () { P.tick(); }, TICK_MS);
  };
  proto.stopTick = function () {
    clearInterval(this.timers.tick);
    this.timers.tick = null;
  };

  proto.tick = function () {
    var P = this;
    if (!P.yt) return;
    P.syncDuration();
    if (P.active) P.renderProgress();
    P.renderBuffer();
    P.renderCaptions();
  };

  proto.renderProgress = function () {
    var P = this;
    if (!isFinite(P.duration)) return;
    var t = P.time();
    P.el.progress.style.setProperty("--vp-p", String(clamp(t / P.duration, 0, 1)));
    var sec = Math.floor(t);
    if (sec !== P.lastSec) {
      P.lastSec = sec;
      P.el.cur.textContent = fmt(t);
      P.el.progress.setAttribute("aria-valuenow", String(sec));
      P.el.progress.setAttribute("aria-valuetext", fmt(t) + " / " + fmt(P.duration));
    }
  };

  proto.renderBuffer = function () {
    var P = this;
    if (!P.yt || !P.yt.getVideoLoadedFraction) return;
    P.el.progress.style.setProperty("--vp-b", String(clamp(P.yt.getVideoLoadedFraction() || 0, 0, 1)));
  };

  /* ── captions ────────────────────────────────────────────────────── */
  proto.setCaptions = function (on) {
    var P = this;
    if (!P.track) return;
    P.ccOn = !!on;
    if (P.track === "yt" && P.yt && P.yt.setOption) {
      if (P.ccOn) { P.yt.loadModule("captions"); P.yt.setOption("captions", "track", { languageCode: P.ytLang }); }
      else P.yt.setOption("captions", "track", {});
    }
    P.renderCaptions();
    P.ui();
  };

  /* muted → captions on, sound → off; a manual CC press ends the rule */
  proto.autoCaptions = function () {
    var P = this;
    if (!P.track || P.ccOverride) return;
    var want = P.active && P.muted;
    if (want !== P.ccOn) P.setCaptions(want);
  };

  proto.renderCaptions = function () {
    var P = this;
    if (P.track !== "file") return;
    var t = P.time(), cue = null;
    if (P.ccOn && P.active) {
      for (var i = 0; i < P.cues.length; i++) if (t >= P.cues[i].a && t < P.cues[i].b) { cue = P.cues[i]; break; }
    }
    P.el.captions.hidden = !cue;
    if (cue && P.el.captionText.textContent !== cue.t) P.el.captionText.textContent = cue.t;
  };

  /* ── watch / back to preview ─────────────────────────────────────── */
  proto.activate = function () {
    var P = this;
    if (P.active || P.queued || P.root.classList.contains("is-error")) return;
    if (!P.ready) {
      P.queued = true;
      P.cls("is-arming", true);
      P.load();
      return;
    }
    P.activateNow();
  };

  proto.activateNow = function () {
    var P = this;
    var hadFocus = P.el.intro.contains(doc.activeElement);
    P.queued = false;
    P.active = true;
    P.userPaused = false;
    P.userSound = false;
    P.resume = false;
    P.cls("is-arming", false);
    P.cls("is-preview", false);
    P.cls("is-active", true);
    P.cls("is-ended", false);
    P.setInert(true);
    P.seek(0, true);
    P.play();
    P.setMuted(false);
    P.poke();
    if (hadFocus) P.el.play.focus({ preventScroll: true });
    clearTimeout(P.timers.sound);
    P.timers.sound = setTimeout(function () { P.verifySound(); }, 1200);
  };

  /* iOS and strict autoplay policies may refuse sound: keep playing muted */
  proto.verifySound = function () {
    var P = this, yt = P.yt;
    if (!yt || !P.active || P.userPaused || P.userSound || !P.want || P.vis < 0.3) return;
    var S = P.YT.PlayerState, s = yt.getPlayerState();
    var blocked = s !== S.PLAYING && s !== S.BUFFERING;
    if (!blocked && !(yt.isMuted && yt.isMuted())) return;
    yt.mute();
    P.muted = true;
    if (blocked) yt.playVideo();
    P.autoCaptions();
    P.ui();
    P.toast(P.t.sound);
  };

  proto.toPreview = function () {
    var P = this;
    P.active = false;
    P.userPaused = false;
    P.ccOverride = false;
    if (P.ccOn) P.setCaptions(false);
    P.exitFullscreen();
    P.cls("is-active", false);
    P.cls("is-preview", true);
    P.cls("is-ended", true);
    P.el.ctaLabel.textContent = P.opts.again;
    P.setInert(false);
    P.setMuted(true);
    P.seek(0, true);
    if (P.opts.preview && P.vis >= 0.3) P.play(); else P.pause();
  };

  proto.exclusive = function () {
    var me = this;
    players.forEach(function (p) { if (p !== me && p.active && p.playing) { p.userPaused = true; p.pause(); } });
  };

  /* ── UI ──────────────────────────────────────────────────────────── */
  proto.ui = function () {
    var P = this, t = P.t;
    var fs = P.isFullscreen();
    P.cls("is-playing", P.playing);
    P.cls("is-paused", !P.playing);
    P.cls("is-muted", P.muted);
    P.cls("is-cc", P.ccOn);
    P.cls("is-fs", fs);
    P.el.play.setAttribute("aria-label", P.playing ? t.pause : t.play);
    P.el.mute.setAttribute("aria-label", P.muted ? t.unmute : t.mute);
    P.el.cc.setAttribute("aria-pressed", P.ccOn ? "true" : "false");
    P.el.fs.setAttribute("aria-label", fs ? t.fsExit : t.fs);
    if (!P.playing) P.poke();
  };

  proto.poke = function () {
    var P = this;
    if (!P.active) return;
    P.cls("is-ui", true);
    clearTimeout(P.timers.idle);
    P.timers.idle = setTimeout(function () {
      if (P.playing && !P.scrubbing && !P.overControls && !P.focusVisibleInside()) P.cls("is-ui", false);
    }, IDLE_MS);
  };

  proto.focusVisibleInside = function () {
    var a = doc.activeElement;
    if (!a || !this.el.controls.contains(a)) return false;
    try { return a.matches(":focus-visible"); } catch (e) { return true; }
  };

  proto.feedback = function (state) {
    var f = this.el.feedback, P = this;
    f.classList.remove("is-show", "is-play", "is-pause");
    void f.offsetWidth;
    f.classList.add("is-show", state === "play" ? "is-play" : "is-pause");
    clearTimeout(P.timers.fb);
    P.timers.fb = setTimeout(function () { f.classList.remove("is-show"); }, 550);
  };

  proto.toast = function (msg) {
    var P = this, el = P.el.toast;
    el.textContent = msg;
    P.cls("has-toast", true);
    clearTimeout(P.timers.toast);
    P.timers.toast = setTimeout(function () { P.cls("has-toast", false); }, 3200);
  };

  proto.toggle = function () {
    var P = this;
    if (P.playing) { P.userPaused = true; P.pause(); P.feedback("pause"); }
    else { P.userPaused = false; P.play(); P.feedback("play"); }
    P.poke();
  };

  /* ── fullscreen ──────────────────────────────────────────────────── */
  proto.isFullscreen = function () {
    var r = this.root;
    return doc.fullscreenElement === r || doc.webkitFullscreenElement === r || r.classList.contains("is-pseudo-fs");
  };

  proto.toggleFullscreen = function () {
    var P = this, r = P.root;
    if (P.isFullscreen()) { P.exitFullscreen(); return; }
    if (r.requestFullscreen) { r.requestFullscreen().catch(function () { P.pseudoFullscreen(true); }); return; }
    if (r.webkitRequestFullscreen) { r.webkitRequestFullscreen(); return; }
    P.pseudoFullscreen(true);
  };

  proto.exitFullscreen = function () {
    var P = this;
    if (P.root.classList.contains("is-pseudo-fs")) { P.pseudoFullscreen(false); return; }
    if (doc.fullscreenElement === P.root && doc.exitFullscreen) doc.exitFullscreen();
    else if (doc.webkitFullscreenElement === P.root && doc.webkitExitFullscreen) doc.webkitExitFullscreen();
  };

  /* iPhone: no element fullscreen API. Pin the player over the page and
     neutralise ancestors that would trap position:fixed (transform, filter,
     clip-path, contain…), restoring their inline styles on exit. */
  var TRAPS = ["transform", "filter", "clip-path", "perspective", "contain", "will-change", "backdrop-filter"];
  proto.pseudoFullscreen = function (on) {
    var P = this, r = P.root, S = global.Sestek || {};
    if (on) {
      P.saved = [];
      for (var n = r.parentElement; n && n !== doc.body && n !== doc.documentElement; n = n.parentElement) {
        var cs = global.getComputedStyle(n);
        var trap = cs.transform !== "none" || cs.filter !== "none" || (cs.clipPath && cs.clipPath !== "none") ||
          cs.perspective !== "none" || /paint|layout|strict|content/.test(cs.contain || "") ||
          /transform|filter|perspective/.test(cs.willChange || "") ||
          ((cs.backdropFilter || cs.webkitBackdropFilter || "none") !== "none");
        if (!trap) continue;
        P.saved.push([n, n.getAttribute("style")]);
        TRAPS.forEach(function (p) { n.style.setProperty(p, "none", "important"); });
      }
      r.classList.add("is-pseudo-fs");
      doc.documentElement.classList.add("vp-lock");
      if (typeof S.stopScroll === "function") S.stopScroll();
    } else {
      r.classList.remove("is-pseudo-fs");
      doc.documentElement.classList.remove("vp-lock");
      (P.saved || []).forEach(function (s) { if (s[1] == null) s[0].removeAttribute("style"); else s[0].setAttribute("style", s[1]); });
      P.saved = null;
      if (typeof S.startScroll === "function") S.startScroll();
    }
    P.ui();
    P.poke();
  };

  /* ── seek bar ────────────────────────────────────────────────────── */
  proto.pctAt = function (x) {
    var r = this.el.progress.getBoundingClientRect();
    return r.width ? clamp((x - r.left) / r.width, 0, 1) : 0;
  };

  /* ── events ──────────────────────────────────────────────────────── */
  proto.bind = function () {
    var P = this, el = P.el, root = P.root;

    P.on(root, "pointerdown", function (e) { P.ptr = e.pointerType || "mouse"; }, true);

    P.on(el.intro, "click", function () { P.activate(); });
    P.on(el.cta, "click", function (e) { e.stopPropagation(); P.activate(); });
    P.on(el.intro, "pointerenter", function () { warm(); if (!P.loading) P.load(); });
    P.on(el.cta, "focus", function () { warm(); if (!P.loading) P.load(); });

    P.on(el.hit, "click", function () {
      if (!P.active) { P.activate(); return; }
      if (P.ptr === "touch" && !root.classList.contains("is-ui")) { P.poke(); return; }
      P.toggle();
    });
    P.on(el.hit, "dblclick", function () { if (P.active && P.ptr !== "touch") P.toggleFullscreen(); });

    P.on(root, "pointermove", function (e) { if (e.pointerType !== "touch") P.poke(); });
    P.on(el.controls, "pointerenter", function () { P.overControls = true; P.poke(); });
    P.on(el.controls, "pointerleave", function () { P.overControls = false; P.poke(); });
    P.on(root, "focusin", function () { P.poke(); });

    P.on(el.play, "click", function () { P.toggle(); });
    P.on(el.mute, "click", function () { P.userSound = true; P.setMuted(!P.muted); P.poke(); });
    P.on(el.cc, "click", function () { P.ccOverride = true; P.setCaptions(!P.ccOn); P.poke(); });
    P.on(el.fs, "click", function () { P.toggleFullscreen(); });

    var onFs = function () { P.ui(); P.poke(); };
    P.on(doc, "fullscreenchange", onFs);
    P.on(doc, "webkitfullscreenchange", onFs);

    /* seek bar: pointer capture keeps the drag on the bar, no window listeners */
    var pr = el.progress;
    P.on(pr, "pointerdown", function (e) {
      if (!P.active || !isFinite(P.duration) || (e.button != null && e.button !== 0)) return;
      e.preventDefault();
      try { pr.setPointerCapture(e.pointerId); } catch (x) {}
      P.scrubbing = true;
      P.cls("is-scrubbing", true);
      P.scrubResume = P.playing;
      if (P.playing && P.yt) P.yt.pauseVideo();
      P.seek(P.pctAt(e.clientX) * P.duration, false);
    });
    P.on(pr, "pointermove", function (e) {
      if (!P.scrubbing) return;
      P.seek(P.pctAt(e.clientX) * P.duration, false);
    });
    var end = function (e) {
      if (!P.scrubbing) return;
      P.scrubbing = false;
      P.cls("is-scrubbing", false);
      if (e && e.clientX != null && e.type === "pointerup") P.seek(P.pctAt(e.clientX) * P.duration, true);
      else if (P.yt) P.yt.seekTo(P.time(), true);
      if (P.scrubResume) P.play(); else { P.playing = false; P.ui(); }
      P.poke();
    };
    P.on(pr, "pointerup", end);
    P.on(pr, "pointercancel", end);
    P.on(pr, "lostpointercapture", end);
    P.on(pr, "keydown", function (e) {
      if (!isFinite(P.duration)) return;
      var t = P.time(), k = e.key, to = null;
      if (k === "ArrowLeft" || k === "ArrowDown") to = t - STEP;
      else if (k === "ArrowRight" || k === "ArrowUp") to = t + STEP;
      else if (k === "PageDown") to = t - 10;
      else if (k === "PageUp") to = t + 10;
      else if (k === "Home") to = 0;
      else if (k === "End") to = P.duration;
      if (to === null) return;
      e.preventDefault();
      e.stopPropagation();
      P.seek(to, true);
      P.poke();
    });

    P.on(root, "keydown", function (e) {
      if (!P.active || e.altKey || e.ctrlKey || e.metaKey) {
        if (e.key === "Escape" && root.classList.contains("is-pseudo-fs")) P.pseudoFullscreen(false);
        return;
      }
      var k = e.key, tag = e.target && e.target.tagName;
      var onControl = tag === "BUTTON" || tag === "A";
      if ((k === " " || k === "Enter") && onControl) return;
      if (k === " " || k === "k" || k === "K") { e.preventDefault(); P.toggle(); }
      else if (k === "m" || k === "M") { P.userSound = true; P.setMuted(!P.muted); P.poke(); }
      else if ((k === "c" || k === "C") && P.track) { P.ccOverride = true; P.setCaptions(!P.ccOn); P.poke(); }
      else if (k === "f" || k === "F") P.toggleFullscreen();
      else if (k === "Escape" && root.classList.contains("is-pseudo-fs")) P.pseudoFullscreen(false);
      else if (e.target === el.progress) return;
      else if (k === "ArrowLeft" && isFinite(P.duration)) { e.preventDefault(); P.seek(P.time() - STEP, true); P.poke(); }
      else if (k === "ArrowRight" && isFinite(P.duration)) { e.preventDefault(); P.seek(P.time() + STEP, true); P.poke(); }
    });

    P.on(doc, "visibilitychange", function () {
      if (P.active) return;
      if (doc.hidden) { if (P.playing) { P.hiddenResume = true; P.pause(); } }
      else if (P.hiddenResume) { P.hiddenResume = false; if (P.vis >= 0.3) P.play(); }
    });

    if (P.opts.follow) P.bindFollow();
  };

  /* desktop CTA: a glass pill that eases after the cursor over the video */
  proto.bindFollow = function () {
    var P = this, intro = P.el.intro, pos = P.el.ctaPos;
    var x = 0, y = 0, tx = 0, ty = 0, raf = 0, inside = false;
    var rest = function () {
      tx = intro.clientWidth / 2;
      ty = intro.clientHeight / 2;
    };
    var apply = function () { pos.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)"; };
    var step = function () {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      apply();
      if (Math.abs(tx - x) > 0.4 || Math.abs(ty - y) > 0.4) raf = global.requestAnimationFrame(step);
      else { x = tx; y = ty; apply(); raf = 0; }
    };
    var kick = function () { if (!raf) raf = global.requestAnimationFrame(step); };
    rest(); x = tx; y = ty; apply();

    P.on(intro, "pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = intro.getBoundingClientRect();
      var hw = pos.offsetWidth / 2 + 12, hh = pos.offsetHeight / 2 + 12;
      inside = true;
      tx = clamp(e.clientX - r.left, hw, Math.max(hw, r.width - hw));
      ty = clamp(e.clientY - r.top, hh, Math.max(hh, r.height - hh));
      kick();
    });
    P.on(intro, "pointerleave", function () { inside = false; rest(); kick(); });
    P.on(P.el.cta, "focus", function () { if (!inside) { rest(); kick(); } });
    if (global.ResizeObserver) {
      P.ro = new global.ResizeObserver(function () { if (!inside) { rest(); x = tx; y = ty; apply(); } });
      P.ro.observe(intro);
    }
    P.off.push(function () { if (raf) global.cancelAnimationFrame(raf); });
  };

  /* ── visibility: lazy load + preview start/stop + auto-resume ─────── */
  proto.observe = function () {
    var P = this, root = P.root;
    if (!global.IntersectionObserver) { P.vis = 1; if (P.opts.load !== "interaction" && P.opts.preview) P.load(); return; }

    var mode = P.opts.preview ? P.opts.load : "interaction";
    if (mode !== "eager") {
      P.lazy = new global.IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        P.lazy.disconnect(); P.lazy = null;
        if (mode === "idle") whenIdle(function () { P.load(); });
        else P.onFirstInteraction();
      }, { rootMargin: "300px 0px" });
      P.lazy.observe(root);
    }

    P.io = new global.IntersectionObserver(function (entries) {
      var r = entries[0].intersectionRatio;
      P.vis = entries[0].isIntersecting ? r : 0;
      if (!P.ready || P.queued) return;
      if (P.vis < 0.3) {
        if (P.playing) { P.resume = true; P.pause(); }
      } else if (P.resume) {
        P.resume = false;
        if (!P.userPaused) P.play();
      } else if (!P.active && P.opts.preview && P.vis >= 0.5 && !P.playing && !doc.hidden) {
        P.play();
      }
    }, { threshold: [0, 0.3, 0.5] });
    P.io.observe(root);
  };

  proto.onFirstInteraction = function () {
    var P = this, evs = ["pointerdown", "keydown", "touchstart", "wheel"];
    var go = function () {
      evs.forEach(function (ev) { global.removeEventListener(ev, go, true); });
      P.load();
    };
    evs.forEach(function (ev) { global.addEventListener(ev, go, { capture: true, passive: true, once: true }); });
    P.off.push(function () { evs.forEach(function (ev) { global.removeEventListener(ev, go, true); }); });
  };

  proto.destroy = function () {
    var P = this;
    P.destroyed = true;
    if (P.root.classList.contains("is-pseudo-fs")) P.pseudoFullscreen(false);
    P.off.forEach(function (fn) { fn(); });
    Object.keys(P.timers).forEach(function (k) { clearTimeout(P.timers[k]); clearInterval(P.timers[k]); });
    if (P.io) P.io.disconnect();
    if (P.lazy) P.lazy.disconnect();
    if (P.ro) P.ro.disconnect();
    if (P.yt && P.yt.destroy) { try { P.yt.destroy(); } catch (e) {} }
    P.root.className = P.root.className.replace(/\b(vp|is-[\w-]+|has-[\w-]+|no-preview)\b/g, "").replace(/\s+/g, " ").trim();
    P.root.removeAttribute("role");
    P.root.removeAttribute("aria-label");
    P.root.innerHTML = P.html;
    P.root._vp = null;
    players.splice(players.indexOf(P), 1);
  };

  /* ── public API ──────────────────────────────────────────────────── */
  function initVideoPlayer(selector) {
    var nodes = doc.querySelectorAll(selector || "[data-video-player]");
    if (!nodes.length) return [];
    var out = [];
    Array.prototype.forEach.call(nodes, function (root) {
      if (root._vp) { out.push(root._vp); return; }
      if (!ytId(attr(root, "youtube"))) {
        console.warn("[Sestek VideoPlayer] data-vp-youtube is missing or not a YouTube id/URL", root);
        return;
      }
      try {
        var p = new Player(root);
        root._vp = p;
        players.push(p);
        out.push(p);
      } catch (e) {
        console.error("[Sestek VideoPlayer]", e);
      }
    });
    return out;
  }

  function destroyVideoPlayer(el) {
    var nodes = el ? [el] : doc.querySelectorAll("[data-video-player]");
    Array.prototype.forEach.call(nodes, function (n) { if (n._vp) n._vp.destroy(); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initVideoPlayer = initVideoPlayer;
  global.Sestek.destroyVideoPlayer = destroyVideoPlayer;
})(typeof window !== "undefined" ? window : this);
