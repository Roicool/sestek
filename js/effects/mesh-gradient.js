/*!
 * mesh-gradient.js v1.0.0
 * Sestek mesh gradient'inin mouse katmanı: kökün içine bir ışık blob'u
 * enjekte eder, imleci GSAP quickTo ile yumuşak bir lag'le takip ettirir.
 * Blob yalnız TRANSFORM ile taşınır (repaint yok); statik mesh zaten saf
 * CSS'tir (mesh-gradient.css) — bu script yüklenmese de arka plan durur.
 *
 * Blob yalnız şu koşullarda kurulur: hover-yetenekli cihaz (dokunmatikte
 * anlamı yok), prefers-reduced-motion kapalı, gsap yüklü, data-mesh-follow
 * "false" değil. İmleç ayrılınca blob yumuşakça merkeze döner.
 *
 * Requires : gsap (yalnız takip için; yoksa statik mesh kalır).
 *
 * Kök [data-mesh-gradient] attribute'ları (hepsi opsiyonel):
 *   data-mesh-follow      "false" → mouse blob'u hiç kurulmaz  (default true)
 *   data-mesh-lag         takip gecikmesi sn — büyük = ağır süzülme (default 0.55)
 *   data-mesh-blob-size   blob çapı, CSS uzunluğu (örn "40rem")
 *   data-mesh-blob-color  blob rengi — token ("--brand-primary--500") | hex | var()
 *   data-mesh-c1/-c2/-c3  mesh renk override'ları (token | hex | var())
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

  function setup(root, hoverable, reduced) {
    if (root._meshInit) return;                           // idempotent
    root._meshInit = true;

    // Attribute → CSS değişkeni köprüleri (renkler CSS'te çözülür).
    [["data-mesh-c1", "--mesh-c1"],
     ["data-mesh-c2", "--mesh-c2"],
     ["data-mesh-c3", "--mesh-c3"],
     ["data-mesh-blob-color", "--mesh-blob-c"]].forEach(function (m) {
      var v = cssColor(root.getAttribute(m[0]));
      if (v) root.style.setProperty(m[1], v);
    });
    var size = root.getAttribute("data-mesh-blob-size");
    if (size) root.style.setProperty("--mesh-blob-size", size);

    var follow = root.getAttribute("data-mesh-follow") !== "false";
    if (!follow || !hoverable || reduced) return;         // statik mesh yeter
    if (typeof gsap === "undefined") {
      console.warn("[Sestek MeshGradient] gsap yok — mouse takibi kapalı, statik mesh aktif.");
      return;
    }

    var lag = parseFloat(root.getAttribute("data-mesh-lag")) || 0.55;

    var blob = document.createElement("span");
    blob.setAttribute("data-mesh-blob", "");
    blob.setAttribute("aria-hidden", "true");
    root.insertBefore(blob, root.firstChild);

    function center() {
      var r = root.getBoundingClientRect();
      return { x: r.width / 2, y: r.height / 2 };
    }

    var c = center();
    gsap.set(blob, { x: c.x, y: c.y });

    var quickX = gsap.quickTo(blob, "x", { duration: lag, ease: "power3" });
    var quickY = gsap.quickTo(blob, "y", { duration: lag, ease: "power3" });

    var rect = null;                                      // enter'da cache'lenir
    root.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      rect = root.getBoundingClientRect();
    });
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      if (!rect) rect = root.getBoundingClientRect();
      quickX(e.clientX - rect.left);
      quickY(e.clientY - rect.top);
    });
    root.addEventListener("pointerleave", function (e) {
      if (e.pointerType !== "mouse") return;
      rect = null;
      var m = center();
      // Merkeze ağır bir süzülüşle dön — quickTo tween'lerini ezer.
      gsap.to(blob, { x: m.x, y: m.y, duration: 1.4, ease: "power2.inOut", overwrite: "auto" });
    });
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
