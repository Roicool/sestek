/*!
 * video-modal.js v1.0.0
 * Drop-in lightbox video modal. Add data-video-modal="<url>" to ANY element
 * (button, link, image…) — click opens a centred 16:9 player; the modal DOM
 * and a single overlay are created once and reused.
 *
 * Supports : YouTube, Vimeo, Cloudflare Stream (iframe) + direct files (<video>).
 * Features : scale-in (GSAP if present, CSS fallback), loading spinner,
 *            focus trap, ESC / backdrop / close-button dismiss, body scroll
 *            lock with scrollbar-width compensation (no layout shift),
 *            iframe destroyed on close so audio never lingers.
 *
 * CSS      : load css/components/video-modal.css (look lives there, not here).
 * Optional : gsap (global) for the scale+fade transition.
 *
 * Usage:
 *   <button data-video-modal="https://youtu.be/XXXX">Watch</button>
 *   <script>document.addEventListener('DOMContentLoaded', Sestek.initVideoModal);</script>
 *
 * Per-trigger options:
 *   data-video-modal        the video URL (required)
 *   data-video-modal-title  accessible dialog label (optional)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DUR    = 0.28;            // open/close animation seconds
  var built  = null;           // singleton modal refs, built lazily

  /** Resolve a URL into an embeddable iframe src, or null for a <video> file. */
  function getEmbedUrl(url) {
    // Direct media file → play with <video>, not an iframe.
    if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) || /\/downloads\//i.test(url)) {
      return null;
    }

    var cfStream = url.match(/iframe\.videodelivery\.net\/([a-f0-9]+)/i);
    if (cfStream) {
      return "https://iframe.videodelivery.net/" + cfStream[1] + "?autoplay=true&startTime=0";
    }

    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]+)/);
    if (yt) {
      return "https://www.youtube.com/embed/" + yt[1] + "?autoplay=1&rel=0";
    }

    var vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
      return "https://player.vimeo.com/video/" + vimeo[1] + "?autoplay=1";
    }

    return null;
  }

  /** Build the singleton overlay/container/media DOM once. */
  function buildModal() {
    var overlay = document.createElement("div");
    overlay.className = "vm__overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    var container = document.createElement("div");
    container.className = "vm__container";

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "vm__close";
    closeBtn.setAttribute("aria-label", "Kapat");
    closeBtn.innerHTML = "&times;";

    var media = document.createElement("div");
    media.className = "vm__media";

    container.appendChild(closeBtn);
    container.appendChild(media);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    return { overlay: overlay, container: container, media: media, closeBtn: closeBtn };
  }

  /** Width of the OS scrollbar — compensated on the body so locking it
   *  doesn't shift the page sideways. */
  function scrollbarWidth() {
    return window.innerWidth - document.documentElement.clientWidth;
  }

  function initVideoModal() {
    if (built) return;        // idempotent — safe to call multiple times
    built = buildModal();

    var overlay   = built.overlay;
    var container = built.container;
    var media     = built.media;
    var closeBtn  = built.closeBtn;

    var lastFocus = null;     // element to restore focus to on close

    function open(url, title) {
      lastFocus = document.activeElement;
      media.innerHTML = "";
      media.classList.remove("is-loaded");
      overlay.setAttribute("aria-label", title || "Video");

      var embedUrl = getEmbedUrl(url);

      var spinner = document.createElement("div");
      spinner.className = "vm__spinner";
      media.appendChild(spinner);

      if (embedUrl) {
        var iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
        iframe.addEventListener("load", function () { media.classList.add("is-loaded"); });
        media.appendChild(iframe);
      } else {
        var video = document.createElement("video");
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.addEventListener("loadeddata", function () { media.classList.add("is-loaded"); });
        media.appendChild(video);
      }

      // Lock body scroll without horizontal shift.
      var sw = scrollbarWidth();
      document.body.style.overflow = "hidden";
      if (sw > 0) document.body.style.paddingRight = sw + "px";

      overlay.classList.add("is-open");

      if (global.gsap) {
        global.gsap.set(container, { scale: 0.96 });
        global.gsap.to(overlay,   { opacity: 1, duration: DUR, ease: "power2.out" });
        global.gsap.to(container, { scale: 1, duration: DUR, ease: "power2.out" });
      } else {
        overlay.style.opacity = "1";
      }

      closeBtn.focus();
    }

    function close() {
      media.innerHTML = "";   // destroy iframe/video immediately → no bg audio

      function cleanup() {
        overlay.classList.remove("is-open");
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
        lastFocus = null;
      }

      if (global.gsap) {
        global.gsap.to(container, { scale: 0.96, duration: DUR, ease: "power2.in" });
        global.gsap.to(overlay,   { opacity: 0, duration: DUR, ease: "power2.in", onComplete: cleanup });
      } else {
        overlay.style.opacity = "0";
        cleanup();
      }
    }

    function isOpen() {
      return overlay.classList.contains("is-open");
    }

    // ── Events ────────────────────────────────────────────────────
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-video-modal]");
      if (trigger) {
        e.preventDefault();
        open(
          trigger.getAttribute("data-video-modal"),
          trigger.getAttribute("data-video-modal-title")
        );
        return;
      }
      if (e.target === overlay) close();    // backdrop click
    });

    closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;

      if (e.key === "Escape" || e.keyCode === 27) {
        close();
        return;
      }

      // Focus trap: keep Tab inside the dialog (close btn is the only control).
      if (e.key === "Tab") {
        e.preventDefault();
        closeBtn.focus();
      }
    });

    // Expose imperative API for programmatic open/close.
    return { open: open, close: close };
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initVideoModal = initVideoModal;

})(typeof window !== "undefined" ? window : this);
