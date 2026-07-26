/*!
 * waveline.js v1.0.0
 * "Voiceprint timeline" — adım adım section'lar için SES DALGASI zaman
 * çizgisi. Nötr bir eksen çizgisi (tik noktalı) track boyunca uzanır;
 * scroll'la üstünde marka gradient'li (pembe→viyole→cyan) bir ses dalgası
 * soldan sağa "kaydedilir". Dalga her adımın kolon merkezinde GENLİK
 * PATLAMASI yapar (konuşulmuş kelime gibi), ucunda parlayan bir nokta
 * taşır; dalga bir adımın hizasını geçtiği anda o adım sönükten uyanır
 * (is-lit). Geri sarınca hepsi tersine döner.
 *
 * NEDEN SPLINE DEĞİL: journey-path'in ikon merkezlerinden 2B eğri geçirme
 * yaklaşımı layout'a göre tuhaf bükülebiliyordu. Burada y SABİT bir
 * eksendir; ölçülen tek şey adımların X merkezleri, dalga o merkezlerde
 * gauss zarflı sinüs patlamasıyla ÜRETİLİR — her breakpoint'te
 * deterministik, "eğri yamuk çizildi" sınıfı hata yapısal olarak imkânsız.
 * Geometri her ScrollTrigger refresh'inde yeniden ölçülüp üretilir.
 *
 * Draw mekaniği: stroke-dasharray/dashoffset (plugin gerektirmez) — scrub
 * 0→1 tek SAYI sürer (proxy), her frame offset o sayıdan kurulur.
 *
 * DOM sözleşmesi (Webflow — düzen Designer'ın):
 *   [data-waveline]                    ← section kökü
 *     [data-waveline-track]            ← dalganın yaşadığı yatay bant
 *                                        (yüksekliği Designer verir, örn 10rem;
 *                                        SVG bu banta enjekte edilir)
 *     … [data-waveline-item] × N       ← adım kolonları (numara+başlık+metin;
 *                                        X merkezi ölçülür, is-lit alır)
 *
 * Kök attribute'ları (hepsi opsiyonel):
 *   data-waveline-bp        breakpoint px — altında kapalı      (default 992)
 *   data-waveline-amp       patlama genliği, track yüksekliği oranı (default 0.34)
 *   data-waveline-calm      sakin bölge genliği oranı           (default 0.05)
 *   data-waveline-dot       uç nokta yarıçapı px — 0 = kapalı   (default 5)
 *   data-waveline-start     ScrollTrigger start                 (default "top 70%")
 *   data-waveline-end       ScrollTrigger end                   (default "top 25%")
 *   data-waveline-scrub     scrub yumuşatması sn                (default true)
 *   data-waveline-pin       "true" → section pinlenir           (default false)
 *   data-waveline-distance  pin scroll mesafesi, % viewport     (default 120)
 *   data-waveline-priority  refreshPriority (pin'de PROJECT.md tablosundan;
 *                           default: pin'liyse 1, değilse -1)
 *
 * CSS: css/components/waveline.css — sönük/yanık item state'leri
 * ([data-waveline-ready] kapısıyla; JS yoksa hiçbir şey sönmez).
 * Reduced motion: dalga TAM çizili, tüm adımlar yanık, animasyon yok.
 *
 * Requires : gsap + ScrollTrigger.
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var UID = 0;

  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  var SVGNS = "http://www.w3.org/2000/svg";
  function make(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }

  function setup(root) {
    if (root._wavelineInit) return;                        // idempotent
    root._wavelineInit = true;

    var track = root.querySelector("[data-waveline-track]");
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-waveline-item]"));
    if (!track || items.length < 2) {
      console.warn("[Sestek Waveline] [data-waveline-track] + en az 2 [data-waveline-item] gerekli.", root);
      return;
    }

    var bp       = num(root, "data-waveline-bp", 992);
    var ampR     = num(root, "data-waveline-amp", 0.34);
    var calmR    = num(root, "data-waveline-calm", 0.05);
    var dotR     = num(root, "data-waveline-dot", 5);
    var startAt  = root.getAttribute("data-waveline-start") || "top 70%";
    var endAt    = root.getAttribute("data-waveline-end") || "top 25%";
    var scrubRaw = root.getAttribute("data-waveline-scrub");
    var scrub    = scrubRaw ? (parseFloat(scrubRaw) || true) : true;
    var pin      = root.getAttribute("data-waveline-pin") === "true";
    var distance = num(root, "data-waveline-distance", 120);
    var priority = num(root, "data-waveline-priority", pin ? 1 : -1);
    var uid      = "wl" + (UID++);

    // ── Geometri + SVG — her build'de ölçülüp yeniden üretilir ──
    var svg = null, glowPath = null, mainPath = null, dot = null, dotGlow = null;
    var pathLen = 0, thresholds = [];

    function waveD(W, H, centers) {
      // Zarf: sakin taban + her merkezde gauss patlaması.
      var base = H / 2;
      var sigma = Math.max(36, Math.min(90, W * 0.045));
      var calm = H * calmR, burst = H * ampR;
      var d = "", cum = 0, px = 0, py = base, lens = [0], xs = [0];
      var step = 6;
      for (var x = 0; x <= W; x += step) {
        var env = calm;
        for (var i = 0; i < centers.length; i++) {
          var dx = x - centers[i];
          env += burst * Math.exp(-(dx * dx) / (2 * sigma * sigma));
        }
        var y = base
          - env * Math.sin(x * 0.055)
          - env * 0.28 * Math.sin(x * 0.021 + 1.3);
        if (x === 0) d = "M0," + y.toFixed(1);
        else {
          d += " L" + x + "," + y.toFixed(1);
          cum += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
        }
        lens.push(cum); xs.push(x);
        px = x; py = y;
      }
      // Adım eşikleri: merkezin path uzunluğundaki oranı.
      var th = centers.map(function (c) {
        for (var j = 0; j < xs.length; j++) if (xs[j] >= c) return lens[j] / cum;
        return 1;
      });
      return { d: d, thresholds: th };
    }

    function build() {
      var W = track.clientWidth, H = track.clientHeight;
      if (!W || !H) return false;
      var tRect = track.getBoundingClientRect();
      var centers = items.map(function (it) {
        var r = it.getBoundingClientRect();
        return Math.max(0, Math.min(W, r.left + r.width / 2 - tRect.left));
      });

      if (!svg) {
        svg = make("svg", { "data-waveline-svg": "", viewBox: "0 0 " + W + " " + H,
                            preserveAspectRatio: "none", fill: "none", "aria-hidden": "true" });
        var defs = make("defs", {}, svg);
        var grad = make("linearGradient", { id: uid + "g", x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
        make("stop", { offset: "0",  "stop-color": "var(--brand-primary--500, #EC008C)" }, grad);
        make("stop", { offset: ".5", "stop-color": "var(--brand-secondary--500, #9d4bff)" }, grad);
        make("stop", { offset: "1",  "stop-color": "var(--brand-tertiary--500, #00d5c4)" }, grad);
        var fade = make("linearGradient", { id: uid + "f", x1: "0", y1: "0", x2: "1", y2: "0" }, defs);
        make("stop", { offset: "0",   "stop-color": "#fff", "stop-opacity": "0" }, fade);
        make("stop", { offset: ".06", "stop-color": "#fff" }, fade);
        make("stop", { offset: ".94", "stop-color": "#fff" }, fade);
        make("stop", { offset: "1",   "stop-color": "#fff", "stop-opacity": "0" }, fade);
        var mask = make("mask", { id: uid + "m" }, defs);
        make("rect", { width: "100%", height: "100%", fill: "url(#" + uid + "f)" }, mask);

        var g = make("g", { mask: "url(#" + uid + "m)" }, svg);
        make("line", { "data-wl-axis": "", x1: "0", x2: W, y1: H / 2, y2: H / 2,
                       stroke: "var(--neutral--400, #aab0ba)", "stroke-opacity": ".4" }, g);
        for (var t = 0.06; t < 0.97; t += 0.08) {
          make("circle", { cx: (W * t).toFixed(0), cy: H / 2, r: "2",
                           fill: "var(--neutral--400, #aab0ba)", "fill-opacity": ".45" }, g);
        }
        glowPath = make("path", { "data-wl-glow": "", stroke: "url(#" + uid + "g)",
                                  "stroke-width": "9", "stroke-opacity": ".1",
                                  "stroke-linecap": "round" }, g);
        mainPath = make("path", { "data-wl-main": "", stroke: "url(#" + uid + "g)",
                                  "stroke-width": "2.25", "stroke-linecap": "round" }, g);
        if (dotR > 0) {
          dotGlow = make("circle", { r: dotR * 2.4, fill: "var(--brand-secondary--500, #9d4bff)",
                                     "fill-opacity": ".3", opacity: "0" }, svg);
          dot = make("circle", { "data-wl-dot": "", r: dotR, fill: "#fff", opacity: "0" }, svg);
        }
        track.appendChild(svg);
      } else {
        svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        var axis = svg.querySelector("[data-wl-axis]");
        axis.setAttribute("x2", W); axis.setAttribute("y1", H / 2); axis.setAttribute("y2", H / 2);
      }

      var wave = waveD(W, H, centers);
      glowPath.setAttribute("d", wave.d);
      mainPath.setAttribute("d", wave.d);
      thresholds = wave.thresholds;
      pathLen = mainPath.getTotalLength();
      glowPath.style.strokeDasharray = pathLen;
      mainPath.style.strokeDasharray = pathLen;
      return true;
    }

    function teardown() {
      if (svg && svg.parentNode) svg.parentNode.removeChild(svg);
      svg = glowPath = mainPath = dot = dotGlow = null;
      items.forEach(function (it) { it.classList.remove("is-lit"); });
      root.removeAttribute("data-waveline-ready");
    }

    // Scrub'lanan şey SAYI (0→1); çizim her frame bu sayıdan kurulur.
    var proxy = { p: 0 };
    function apply() {
      if (!mainPath) return;
      var p = proxy.p;
      var off = pathLen * (1 - p);
      glowPath.style.strokeDashoffset = off;
      mainPath.style.strokeDashoffset = off;
      if (dot) {
        var on = p > 0.004 && p < 0.996;
        dot.setAttribute("opacity", on ? "1" : "0");
        dotGlow.setAttribute("opacity", on ? "1" : "0");
        if (on) {
          var pt = mainPath.getPointAtLength(pathLen * p);
          dot.setAttribute("cx", pt.x); dot.setAttribute("cy", pt.y);
          dotGlow.setAttribute("cx", pt.x); dotGlow.setAttribute("cy", pt.y);
        }
      }
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle("is-lit", p >= thresholds[i]);
      }
    }

    var mm = gsap.matchMedia();

    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        if (!build()) return function () {};
        root.setAttribute("data-waveline-ready", "");

        var st = {
          trigger: root,
          scrub: scrub,
          refreshPriority: priority,
          // Konumlar tazelenince geometri yeniden ölçülür ve mevcut
          // progress yeniden uygulanır (resize / font yüklenmesi).
          onRefresh: function () { build(); apply(); },
        };
        if (pin) {
          st.start = "top top";
          st.end = "+=" + distance + "%";
          st.pin = true;
        } else {
          st.start = startAt;
          st.end = endAt;
        }

        var t = gsap.fromTo(proxy, { p: 0 }, {
          p: 1, ease: "none", onUpdate: apply, scrollTrigger: st,
        });

        return function () {
          t.scrollTrigger && t.scrollTrigger.kill();
          t.kill();
          proxy.p = 0;
          teardown();
        };
      }
    );

    // Reduced motion: dalga tam çizili, tüm adımlar yanık — animasyon yok.
    mm.add(
      "(min-width: " + bp + "px) and (prefers-reduced-motion: reduce)",
      function () {
        if (!build()) return function () {};
        root.setAttribute("data-waveline-ready", "");
        proxy.p = 1;
        apply();
        return function () { proxy.p = 0; teardown(); };
      }
    );
  }

  /**
   * Sayfadaki her [data-waveline] bölümünü bağlar.
   * @param {string} [selector="[data-waveline]"]
   */
  function initWaveline(selector) {
    var roots = document.querySelectorAll(selector || "[data-waveline]");
    if (!roots.length) { console.warn("[Sestek Waveline] No [data-waveline] found."); return; }
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Sestek Waveline] GSAP + ScrollTrigger required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);
    roots.forEach(setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initWaveline = initWaveline;

})(typeof window !== "undefined" ? window : this);
