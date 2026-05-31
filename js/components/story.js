/*!
 * story.js v1.0.0
 * Featured customer-story player (Sanity-style). Inline native <video> elements
 * that do NOT autoplay: each shows a poster + overlay (logo, pull-quote, name).
 * Clicking the big play button fades the overlay out, plays the video, and
 * reveals a custom Sestek control bar (play/pause · seek · current/total time ·
 * mute · fullscreen). A logo row below switches between stories — switching
 * pauses the current video, resets it, and brings the new poster + overlay back.
 *
 * Custom controls only work on native <video>, so this component is <video>-only
 * by design (use Sestek.initVideoModal for YouTube/Vimeo lightboxes instead).
 *
 * Requires : nothing (vanilla). Optional : gsap for nicer crossfades.
 * CSS      : css/components/story.css
 *
 * DOM contract:
 *   [data-story]                       root
 *     [data-story-stage]               16:9 stage
 *       [data-story-panel="0"]         one panel per story (mark one .is-active)
 *         <video data-story-media poster="..." playsinline preload="metadata">
 *           <source src="story.mp4" type="video/mp4">
 *         </video>
 *         [data-story-overlay]         poster content (fades out on play)
 *           [data-story-play]          big centre play button (optional; auto-made)
 *     [data-story-tabs]                logo row
 *       [data-story-tab="0"]           click → switch to panel 0 (PUMA, Tecovas…)
 *
 * Attributes:
 *   data-story-controls  "play,seek,time,mute,fullscreen" — which controls to
 *                        build, comma list (default: all of them)
 *   data-story-idle      ms of mouse-idle before controls auto-hide (default 2600)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var ICONS = {
    play:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 5V5L7 10H3zm13.5 2a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4h4l5 5V5L7 10H3zm18.3-1.3-1.4-1.4L17 10.2 14.1 7.3l-1.4 1.4L15.6 11.6 12.7 14.5l1.4 1.4L17 13l2.9 2.9 1.4-1.4L18.4 11.6z"/></svg>',
    fs:    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  };

  /** Parse a numeric data-attribute with a fallback. */
  function attrNum(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /** mm:ss formatter. */
  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /**
   * Initialise every [data-story] block.
   * @param {string} [selector="[data-story]"]
   * @returns {Array<object>} per-story APIs
   */
  function initStory(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-story]")
    );
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hasGsap = typeof gsap !== "undefined";
    var apis = [];

    roots.forEach(function (root) {
      if (root._storyInit) return;
      root._storyInit = true;

      var panels = Array.prototype.slice.call(root.querySelectorAll("[data-story-panel]"));
      var tabs   = Array.prototype.slice.call(root.querySelectorAll("[data-story-tab]"));
      if (!panels.length) return;

      var wanted = (root.getAttribute("data-story-controls") ||
        "play,seek,time,mute,fullscreen").split(",").map(function (s) { return s.trim(); });
      var idleMs = attrNum(root, "data-story-idle", 2600);

      // Active panel = first .is-active, else 0
      var active = 0;
      panels.forEach(function (p, i) { if (p.classList.contains("is-active")) active = i; });
      panels.forEach(function (p, i) { p.classList.toggle("is-active", i === active); });

      // Per-panel setup: ensure a play button + a control bar exist.
      var media = panels.map(function (panel) {
        return panel.querySelector("[data-story-media]");
      });

      panels.forEach(function (panel, i) {
        var video = media[i];
        if (!video) return;
        video.removeAttribute("autoplay");
        video.setAttribute("playsinline", "");
        if (!video.getAttribute("preload")) video.setAttribute("preload", "metadata");

        var overlay = panel.querySelector("[data-story-overlay]");

        // Big play button — reuse author's [data-story-play] or create one.
        var playBtn = panel.querySelector("[data-story-play]");
        if (!playBtn) {
          playBtn = el("button", null, ICONS.play);
          playBtn.setAttribute("data-story-play", "");
          playBtn.setAttribute("aria-label", "Play video");
          (overlay || panel).appendChild(playBtn);
        } else if (!playBtn.innerHTML.trim()) {
          playBtn.innerHTML = ICONS.play;
        }
        playBtn.addEventListener("click", function (e) {
          e.preventDefault();
          play();
        });

        // Build control bar (lives inside the panel, over the video)
        var bar = buildControls(video, i);
        panel.appendChild(bar);
      });

      // ── playback state ──────────────────────────────────────────
      function current() { return media[active]; }

      function play() {
        var v = current();
        if (!v) return;
        root.classList.add("is-playing");
        v.classList.remove("is-paused");
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      }
      function pause() {
        var v = current();
        if (!v) return;
        v.pause();
        v.classList.add("is-paused");
      }
      function togglePlay() {
        var v = current();
        if (!v) return;
        if (v.paused) play(); else pause();
      }

      // ── switch story ────────────────────────────────────────────
      function to(idx) {
        if (idx === active || idx < 0 || idx >= panels.length) return;
        var prev = media[active];
        if (prev) { prev.pause(); prev.currentTime = 0; prev.classList.remove("is-paused"); }

        var outP = panels[active], inP = panels[idx];
        active = idx;
        // Switching always returns to the poster state (overlay visible, no controls)
        root.classList.remove("is-playing", "is-idle");

        if (hasGsap && !reduce) {
          gsap.to(outP, { autoAlpha: 0, duration: 0.4, onComplete: function () {
            outP.classList.remove("is-active");
          }});
          inP.classList.add("is-active");
          gsap.fromTo(inP, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
        } else {
          outP.classList.remove("is-active");
          inP.classList.add("is-active");
        }
        tabs.forEach(function (t, i) { t.classList.toggle("is-active", i === idx); });
      }

      tabs.forEach(function (t, i) {
        t.classList.toggle("is-active", i === active);
        t.addEventListener("click", function (e) { e.preventDefault(); to(i); });
      });

      // ── idle auto-hide of controls ──────────────────────────────
      var idleTimer = null;
      function nudge() {
        root.classList.remove("is-idle");
        if (idleTimer) clearTimeout(idleTimer);
        if (root.classList.contains("is-playing")) {
          idleTimer = setTimeout(function () {
            var v = current();
            if (v && !v.paused) root.classList.add("is-idle");
          }, idleMs);
        }
      }
      root.addEventListener("mousemove", nudge);
      root.addEventListener("touchstart", nudge, { passive: true });

      // ── build a custom control bar bound to a <video> ───────────
      function buildControls(video, idx) {
        var bar = el("div", "story__controls");

        // play / pause
        if (wanted.indexOf("play") !== -1) {
          var btnPlay = el("button", "story__btn story__btn--play",
            '<span class="icon-play">' + ICONS.play + '</span>' +
            '<span class="icon-pause">' + ICONS.pause + '</span>');
          btnPlay.setAttribute("aria-label", "Play / pause");
          btnPlay.addEventListener("click", togglePlay);
          bar.appendChild(btnPlay);
        }

        // seek bar
        var seek, played, buffered, knob;
        if (wanted.indexOf("seek") !== -1) {
          seek = el("div", "story__seek");
          buffered = el("div", "story__seek-buffered");
          played = el("div", "story__seek-played");
          knob = el("div", "story__seek-knob");
          seek.appendChild(buffered); seek.appendChild(played); seek.appendChild(knob);
          seek.setAttribute("role", "slider");
          seek.setAttribute("aria-label", "Seek");

          var scrub = function (clientX) {
            var r = seek.getBoundingClientRect();
            var ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
            if (isFinite(video.duration)) video.currentTime = ratio * video.duration;
          };
          var dragging = false;
          seek.addEventListener("pointerdown", function (e) {
            dragging = true; seek.setPointerCapture(e.pointerId); scrub(e.clientX);
          });
          seek.addEventListener("pointermove", function (e) { if (dragging) scrub(e.clientX); });
          seek.addEventListener("pointerup", function () { dragging = false; });
        }

        // time
        var timeEl;
        if (wanted.indexOf("time") !== -1) {
          timeEl = el("span", "story__time", "0:00 / 0:00");
          bar.appendChild(seek || el("span", "story__spacer"));
          bar.appendChild(timeEl);
        } else if (seek) {
          bar.appendChild(seek);
        }

        // mute
        if (wanted.indexOf("mute") !== -1) {
          var btnMute = el("button", "story__btn story__btn--mute",
            '<span class="icon-sound">' + ICONS.sound + '</span>' +
            '<span class="icon-muted">' + ICONS.muted + '</span>');
          btnMute.setAttribute("aria-label", "Mute / unmute");
          btnMute.addEventListener("click", function () {
            video.muted = !video.muted;
            root.classList.toggle("is-muted", video.muted);
          });
          bar.appendChild(btnMute);
        }

        // fullscreen
        if (wanted.indexOf("fullscreen") !== -1) {
          var btnFs = el("button", "story__btn story__btn--fs", ICONS.fs);
          btnFs.setAttribute("aria-label", "Fullscreen");
          btnFs.addEventListener("click", function () {
            var stage = video.closest("[data-story-stage]") || video.parentElement;
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else if (stage.requestFullscreen) {
              stage.requestFullscreen();
            } else if (video.webkitEnterFullscreen) {
              video.webkitEnterFullscreen(); // iOS Safari
            }
          });
          bar.appendChild(btnFs);
        }

        // ── wire video events → UI ────────────────────────────────
        video.addEventListener("play",  nudge);
        video.addEventListener("pause", function () { root.classList.remove("is-idle"); });
        video.addEventListener("ended", function () {
          root.classList.remove("is-playing", "is-idle");
          video.currentTime = 0;
        });
        video.addEventListener("timeupdate", function () {
          var d = video.duration || 0;
          var pct = d ? (video.currentTime / d) * 100 : 0;
          if (played) played.style.width = pct + "%";
          if (knob)   knob.style.left = pct + "%";
          if (timeEl) timeEl.textContent = fmtTime(video.currentTime) + " / " + fmtTime(d);
        });
        video.addEventListener("progress", function () {
          if (buffered && video.buffered.length && video.duration) {
            var end = video.buffered.end(video.buffered.length - 1);
            buffered.style.width = (end / video.duration) * 100 + "%";
          }
        });
        // click the video surface to toggle play/pause
        video.addEventListener("click", function () {
          if (root.classList.contains("is-playing")) togglePlay();
        });

        return bar;
      }

      apis.push({ root: root, to: to, play: play, pause: pause });
    });

    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStory = initStory;

})(typeof window !== "undefined" ? window : this);
