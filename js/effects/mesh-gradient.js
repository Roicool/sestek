/*!
 * mesh-gradient.js v2.0.0
 * Sestek mesh gradient'inin CANLI katmanı: 4 renk lekesini (pembe / viyole
 * / cyan / viyole-eko) ayrı transform-only katmanlar olarak enjekte eder.
 *
 * İki hareket, iç içe iki span'de birleşir (transform çakışması olmaz):
 *   DIŞ span — MOUSE parallax'ı: her leke imlece FARKLI yön ve kuvvetle
 *              tepki verir (kimisi doğru, kimisi ters → "mash" hissi);
 *              gsap quickTo ile ağır bir lag'le süzülür, imleç çıkınca
 *              yerine döner.
 *   İÇ span  — IDLE drift: her leke kendi ritminde (10-13sn yoyo) yavaşça
 *              gezinir — mouse olmasa da renkler canlıdır.
 *
 * Katmanlar kurulunca köke .is-live basılır (CSS statik mesh'i kapatır).
 * Kurulmama halleri → statik CSS mesh aynen kalır:
 *   prefers-reduced-motion · gsap yok. Dokunmatikte drift çalışır,
 *   mouse kısmı atlanır. Ekran dışındayken drift durur (IntersectionObserver).
 *
 * Requires : gsap.
 *
 * Kök [data-mesh-gradient] attribute'ları (hepsi opsiyonel):
 *   data-mesh-follow    "false" → mouse parallax'ı kapalı     (default true)
 *   data-mesh-drift     "false" → idle drift kapalı           (default true)
 *   data-mesh-lag       mouse takip gecikmesi sn              (default 0.8)
 *   data-mesh-strength  mouse etki çarpanı — 0.5 hafif, 2 sert (default 1)
 *   data-mesh-c1/-c2/-c3  renk override'ları (token | hex | var())
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  /** Attribute rengi CSS değerine çevir: bare token → var(--token). */
  function cssColor(v) {
    if (!v) return null;
    v = v.trim();
    return v.indexOf("--") === 0 ? "var(" + v + ")" : v;
  }

  // Leke reçetesi: konum (%), renk değişkeni, ölçek, mouse faktörü (işaret =
  // yön; zıt işaretler mash hissini verir), drift genliği (% / sn) ve faz.
  var LAYERS = [
    { x: "14%", y: "18%", c: "--mesh-c3", s: 1.00, f:  0.10, dx:  6, dy:  5, dur: 11, phase: 0.00 },
    { x: "84%", y: "12%", c: "--mesh-c2", s: 0.95, f: -0.07, dx: -5, dy:  6, dur: 13, phase: 0.35 },
    { x: "82%", y: "86%", c: "--mesh-c1", s: 1.15, f:  0.13, dx:  5, dy: -6, dur: 12, phase: 0.60 },
    { x: "22%", y: "88%", c: "--mesh-c2", s: 0.80, f: -0.11, dx: -6, dy: -5, dur: 10, phase: 0.85 },
  ];

  function setup(root, hoverable, reduced) {
    if (root._meshInit) return;                           // idempotent
    root._meshInit = true;

    // Renk override köprüleri (CSS değişkeni olarak çözülür).
    [["data-mesh-c1", "--mesh-c1"],
     ["data-mesh-c2", "--mesh-c2"],
     ["data-mesh-c3", "--mesh-c3"]].forEach(function (m) {
      var v = cssColor(root.getAttribute(m[0]));
      if (v) root.style.setProperty(m[1], v);
    });

    // Canlı katman koşulları — sağlanmazsa statik CSS mesh zaten görünüyor.
    if (reduced) return;
    if (typeof gsap === "undefined") {
      console.warn("[Sestek MeshGradient] gsap yok — statik mesh aktif.");
      return;
    }

    var follow   = root.getAttribute("data-mesh-follow") !== "false" && hoverable;
    var driftOn  = root.getAttribute("data-mesh-drift") !== "false";
    var lag      = parseFloat(root.getAttribute("data-mesh-lag")) || 0.8;
    var strength = parseFloat(root.getAttribute("data-mesh-strength")) || 1;

    var outers = [], driftTweens = [], quicks = [];

    LAYERS.forEach(function (L) {
      var outer = document.createElement("span");
      outer.setAttribute("data-mesh-layer", "");
      outer.setAttribute("aria-hidden", "true");
      outer.style.setProperty("--mesh-lx", L.x);
      outer.style.setProperty("--mesh-ly", L.y);
      outer.style.setProperty("--mesh-ls", String(L.s));
      outer.style.setProperty("--mesh-lc", "var(" + L.c + ")");
      var inner = document.createElement("span");
      outer.appendChild(inner);
      root.insertBefore(outer, root.firstChild);
      outers.push(outer);

      if (driftOn) {
        // Kendi ritminde yoyo süzülme; phase ile fazlar dağıtılır — dört
        // leke asla senkron nefes almaz (organik his).
        var t = gsap.to(inner, {
          xPercent: L.dx, yPercent: L.dy,
          duration: L.dur, ease: "sine.inOut",
          repeat: -1, yoyo: true, paused: true,
        });
        t.progress(L.phase).play();
        driftTweens.push(t);
      }

      if (follow) {
        quicks.push({
          x: gsap.quickTo(outer, "x", { duration: lag, ease: "power3" }),
          y: gsap.quickTo(outer, "y", { duration: lag, ease: "power3" }),
          f: L.f * strength,
        });
      }
    });

    root.classList.add("is-live");                        // statik mesh kapanır

    // ── Mouse parallax — her leke farklı yön/kuvvetle ────────────
    if (follow) {
      var rect = null;
      root.addEventListener("pointerenter", function (e) {
        if (e.pointerType !== "mouse") return;
        rect = root.getBoundingClientRect();
      });
      root.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        if (!rect) rect = root.getBoundingClientRect();
        var dx = e.clientX - rect.left - rect.width / 2;
        var dy = e.clientY - rect.top - rect.height / 2;
        quicks.forEach(function (q) { q.x(dx * q.f); q.y(dy * q.f); });
      });
      root.addEventListener("pointerleave", function (e) {
        if (e.pointerType !== "mouse") return;
        rect = null;
        outers.forEach(function (o) {
          gsap.to(o, { x: 0, y: 0, duration: 1.6, ease: "power2.inOut", overwrite: "auto" });
        });
      });
    }

    // ── Ekran dışında drift durur — boşa frame yakılmaz ──────────
    if (driftTweens.length && typeof IntersectionObserver !== "undefined") {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          driftTweens.forEach(function (t) { en.isIntersecting ? t.play() : t.pause(); });
        });
      }, { threshold: 0.05 });
      io.observe(root);
    }
  }

  /**
   * Sayfadaki her [data-mesh-gradient] kökünü bağlar.
   * @param {string} [selector="[data-mesh-gradient]"]
   */
  function initMeshGradient(selector) {
    var roots = document.querySelectorAll(selector || "[data-mesh-gradient]");
    if (!roots.length) { console.warn("[Sestek MeshGradient] No [data-mesh-gradient] found."); return; }
    var hoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    roots.forEach(function (root) { setup(root, hoverable, reduced); });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initMeshGradient = initMeshGradient;

})(typeof window !== "undefined" ? window : this);
