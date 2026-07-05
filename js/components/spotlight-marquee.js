/*!
 * spotlight-marquee.js v1.0.0
 * A slow horizontal marquee of an image / icon wall behind a cursor spotlight:
 * the area under the mouse stays bright, everything else dims. The marquee
 * eases to a stop while the pointer is over it. All motion runs on the GSAP
 * ticker (marquee scroll + eased spotlight) — no vanilla animation loop.
 *
 * Requires : gsap (global).
 * CSS      : css/components/spotlight-marquee.css
 *
 * ── DOM (Webflow) ────────────────────────────────────────────────────
 *   [data-spotlight]                       ← root (dark section)
 *     [data-sp-track]                       ← the strip that scrolls; JS clones
 *       <img src="icon-wall.png" alt="">       its children for a seamless loop.
 *       (or several [data-sp-item] cells)      A single wide image works too.
 *     [data-sp-content]                     ← OPTIONAL headline/text; sits ABOVE
 *       <h2>…</h2>                             the dim so it stays fully readable.
 *   (JS injects [data-sp-light] — the spotlight overlay.)
 *
 * Root attributes (all optional):
 *   data-sp-speed      marquee px/second                     (default 40)
 *   data-sp-direction  "left" | "right"                      (default "left")
 *   data-sp-radius     spotlight radius in px                (default 280)
 *   data-sp-dark       darkness outside the light, 0–1       (default 0.82)
 *   data-sp-soft       where the fade starts, 0–1 of radius  (default 0.45)
 *   data-sp-follow     spotlight ease, 0–1 (higher = snappier)(default 0.14)
 *
 * API: Sestek.initSpotlightMarquee() → [{ el, destroy() }]
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util ? Sestek.util.attrNum : function (el, a, f) {
    var v = parseFloat(el.getAttribute(a)); return isNaN(v) ? f : v;
  };

  function setup(root) {
    if (root._spotlightInit) return null;
    root._spotlightInit = true;

    if (typeof gsap === "undefined") { console.error("[Sestek Spotlight] GSAP required."); return null; }

    var track = root.querySelector("[data-sp-track]");
    if (!track) { console.warn("[Sestek Spotlight] [data-sp-track] not found.", root); return null; }

    var reduce = Sestek.util ? Sestek.util.prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var BASE   = attrNum(root, "data-sp-speed", 40);
    var dir    = root.getAttribute("data-sp-direction") === "right" ? -1 : 1;
    var radius = attrNum(root, "data-sp-radius", 280);
    var dark   = attrNum(root, "data-sp-dark", 0.82);
    var soft   = attrNum(root, "data-sp-soft", 0.45);
    var follow = attrNum(root, "data-sp-follow", 0.14);

    if (getComputedStyle(root).position === "static") root.style.position = "relative";

    // ── Spotlight overlay ─────────────────────────────────────────
    var light = root.querySelector("[data-sp-light]");
    if (!light) { light = document.createElement("div"); light.setAttribute("data-sp-light", ""); light.setAttribute("aria-hidden", "true"); root.appendChild(light); }
    light.style.setProperty("--sp-soft", (soft * 100) + "%");
    light.style.setProperty("--sp-r", radius + "px");     // constant hole size
    // Idle = fully bright (--sp-dark 0). On hover, "focus mode": the surroundings
    // darken (--sp-dark → dark) while the spotlight stays bright.
    var curX = root.clientWidth / 2, curY = root.clientHeight / 2, curD = 0;
    var tgtX = curX, tgtY = curY, tgtD = 0;
    function applyLight() {
      light.style.setProperty("--sp-x", curX + "px");
      light.style.setProperty("--sp-y", curY + "px");
      light.style.setProperty("--sp-dark", curD);
    }
    applyLight();

    root.addEventListener("pointermove", function (e) {
      var r = root.getBoundingClientRect();
      tgtX = e.clientX - r.left; tgtY = e.clientY - r.top; tgtD = dark;
      if (reduce) { curX = tgtX; curY = tgtY; curD = tgtD; applyLight(); }
    });
    root.addEventListener("pointerenter", function () { tgtD = dark; });
    root.addEventListener("pointerleave", function () { tgtD = 0; if (reduce) { curD = 0; applyLight(); } });

    // ── Marquee: clone whole sets until the strip covers container + one unit ──
    var unit = 0, pos = 0, running = true;
    var sp = { v: reduce ? 0 : BASE }, spTween = null;

    function tweenSpeed(t, d, e) { if (spTween) spTween.kill(); spTween = gsap.to(sp, { v: t, duration: d || 0.9, ease: e || "power3.out" }); }

    function contentWidth(children) {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0, w = 0;
      children.forEach(function (c) { w += c.getBoundingClientRect().width; });
      return w + gap * children.length;
    }

    function buildLoop() {
      var originals = Array.prototype.slice.call(track.children);
      if (!originals.length) return;
      unit = contentWidth(originals);
      if (unit < 1) return;
      var guard = 0;
      while (track.scrollWidth < root.clientWidth + unit && guard++ < 30) {
        originals.forEach(function (c) { var cl = c.cloneNode(true); cl.setAttribute("aria-hidden", "true"); track.appendChild(cl); });
      }
    }

    // Wait for images so widths are real, then build the loop.
    var imgs = Array.prototype.slice.call(track.querySelectorAll("img")).filter(function (i) { return !i.complete; });
    if (imgs.length) {
      var done = 0;
      imgs.forEach(function (img) {
        function on() { if (++done === imgs.length) buildLoop(); }
        img.addEventListener("load", on); img.addEventListener("error", on);
      });
    } else { buildLoop(); }

    // ── Ticker: marquee scroll + eased spotlight (one loop) ───────
    function tick(time, dt) {
      if (!running) return;
      if (unit > 0 && !reduce) {
        pos += sp.v * (dt / 1000);
        var wrapped = ((pos % unit) + unit) % unit;
        gsap.set(track, { x: -wrapped * dir, force3D: true });
      }
      curX += (tgtX - curX) * follow;
      curY += (tgtY - curY) * follow;
      curD += (tgtD - curD) * follow;
      applyLight();
    }
    gsap.ticker.add(tick);

    // ── Hover: ease the marquee to a stop, resume on leave ────────
    if (!reduce) {
      root.addEventListener("pointerenter", function () { tweenSpeed(0, 0.8, "power3.out"); });
      root.addEventListener("pointerleave", function () { tweenSpeed(BASE, 1.1, "power3.inOut"); });
    }

    var rid;
    window.addEventListener("resize", function () { clearTimeout(rid); rid = setTimeout(function () { unit = contentWidth(Array.prototype.slice.call(track.children).slice(0, track.children.length)); }, 200); });

    root.setAttribute("data-sp-ready", "");
    root._spotlightDestroy = function () { running = false; gsap.ticker.remove(tick); if (spTween) spTween.kill(); };
    return { el: root, destroy: root._spotlightDestroy };
  }

  function initSpotlightMarquee(selector) {
    var roots = Array.prototype.slice.call(document.querySelectorAll(selector || "[data-spotlight]"));
    var apis = [];
    roots.forEach(function (root) { var a = setup(root); if (a) apis.push(a); });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSpotlightMarquee = initSpotlightMarquee;

})(typeof window !== "undefined" ? window : this);
