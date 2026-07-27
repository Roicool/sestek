/*!
 * st-debug.js v1.0.1
 * v1.0.1 — kompakt döküm: yalnız PIN'li trigger'lar tek tek listelenir,
 * pin olmayanlar tek satır sayı özetidir (kalabalık sayfada panel ekrana
 * sığar); panel gerekirse kendi içinde scroll eder.
 * v1.0.2 — KOPYALA butonu: tek tıkla tüm rapor panoya kopyalanır (ekran
 * görüntüsü yerine metin olarak WhatsApp/mail ile gönderilebilir).
 * UZAKTAN TEŞHİS PANELİ — erişemediğin bir bilgisayarda sayfa bozuk
 * görünüyorsa: bu script'i siteye (geçici) ekle, kişiye ?stdebug'lı link
 * gönder, tek EKRAN GÖRÜNTÜSÜ iste. URL'de "stdebug" yoksa HİÇBİR ŞEY
 * yapmaz (maliyet sıfır; yayında unutulması güvenlidir, yine de iş bitince
 * kaldır).
 *
 * Panelde: tarayıcı (UA) · viewport/dpr · gsap/ScrollTrigger/Lenis
 * sürümleri · prefers-reduced-motion DURUMU · modern CSS desteği
 * (svh/oklch/color-mix/aspect-ratio) · hero yüksekliği · scrollY/doküman
 * boyu · TÜM ScrollTrigger'ların start/end/pin/priority dökümü · bu script
 * yüklendikten sonra yakalanan JS hataları. 1.5 sn'de bir tazelenir
 * (geç kurulan pinler ve geç hatalar da görünür).
 *
 * Kullanım: <script src=".../js/core/st-debug.js" defer></script>
 *           (script listesinin BAŞINA yakın koy — sonraki hataları yakalar)
 *           Link: https://site.com/?stdebug   (veya #stdebug)
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  if ((location.search + location.hash).indexOf("stdebug") === -1) return;

  var errors = [];
  global.addEventListener("error", function (e) {
    errors.push((e.message || "hata") + " @ " +
      ((e.filename || "").split("/").pop() || "?") + ":" + (e.lineno || "?"));
  });
  global.addEventListener("unhandledrejection", function (e) {
    errors.push("promise: " + ((e.reason && e.reason.message) || e.reason));
  });
  global.addEventListener("pageshow", function (e) { if (e.persisted) global.__stdbgBF = true; });

  function esc(s) {
    return String(s).replace(/[<>&]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c];
    });
  }
  function sup(prop, val) {
    try { return CSS.supports(prop, val) ? "VAR" : "YOK"; } catch (e) { return "?"; }
  }

  var box = null, timer = null, lastReport = "";

  function copyReport(btn) {
    var done = function () {
      btn.textContent = "✓ Kopyalandı";
      setTimeout(function () { btn.textContent = "📋 Kopyala"; }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastReport).then(done, function () { fallbackCopy(done); });
    } else {
      fallbackCopy(done);
    }
  }
  function fallbackCopy(done) {
    var ta = document.createElement("textarea");
    ta.value = lastReport;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  function render() {
    if (!box) return;
    var L = [];
    L.push("UA: " + navigator.userAgent);
    L.push("viewport: " + innerWidth + "×" + innerHeight + " · dpr " + devicePixelRatio +
           " · scrollY " + Math.round(scrollY) + " · doküman " + document.body.scrollHeight + "px");
    L.push("gsap: " + (typeof gsap !== "undefined" ? gsap.version : "YOK") +
           " · ScrollTrigger: " + (typeof ScrollTrigger !== "undefined" ? ScrollTrigger.version : "YOK") +
           " · Lenis: " + (typeof Lenis !== "undefined" ? "var" : "YOK"));
    var rm = false;
    try { rm = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    L.push("REDUCED MOTION: " + (rm ? "⚠️ AÇIK — animasyonlar/pinler farklı yolda" : "kapalı"));
    try {
      var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
      L.push("navigasyon: " + (nav ? nav.type : "?") +
             " · scrollRestoration: " + (history.scrollRestoration || "?") +
             " · bfcache: " + (global.__stdbgBF ? "⚠️ EVET" : "hayır"));
    } catch (e) {}
    L.push("CSS: svh " + sup("height", "100svh") +
           " · oklch " + sup("color", "oklch(50% 0 0)") +
           " · color-mix " + sup("color", "color-mix(in oklab, red, blue)") +
           " · aspect-ratio " + sup("aspect-ratio", "1"));
    var hero = document.querySelector("[data-hero]");
    if (hero) {
      L.push("hero yüksekliği: " + Math.round(hero.getBoundingClientRect().height) +
             "px (beklenen ≈ " + innerHeight + ")");
    }
    if (typeof ScrollTrigger !== "undefined") {
      var ts = ScrollTrigger.getAll();
      L.push("── ScrollTrigger (" + ts.length + ") ──");
      ts.forEach(function (t) {
        var el = t.trigger || {};
        var name = el.id ? "#" + el.id
          : (el.className && String(el.className).split(" ")[0]) || el.tagName || "?";
        L.push((t.pin ? "PIN " : "    ") + name +
          "  start " + Math.round(t.start) + " → " + Math.round(t.end) +
          "  prio " + (t.vars && t.vars.refreshPriority != null ? t.vars.refreshPriority : 0));
      });
    }
    if (errors.length) {
      L.push("── HATALAR (" + errors.length + ") ──");
      errors.slice(0, 10).forEach(function (e) { L.push("✕ " + e); });
    } else {
      L.push("JS hatası yok (bu script yüklendikten sonra)");
    }
    lastReport = "SESTEK ST-DEBUG\n" + L.join("\n");
    box.innerHTML =
      "<b>SESTEK ST-DEBUG</b>" +
      "<span data-x style=\"float:right;cursor:pointer;color:#f66;margin-left:10px\">✕</span>" +
      "<button data-copy style=\"float:right;cursor:pointer;background:#1d2733;color:#8ef29a;" +
      "border:1px solid #3a4a5c;border-radius:5px;font:inherit;padding:2px 8px\">📋 Kopyala</button>" +
      "<hr>" +
      L.map(function (l) { return "<div>" + esc(l) + "</div>"; }).join("");
    var x = box.querySelector("[data-x]");
    if (x) x.onclick = function () { box.remove(); box = null; clearInterval(timer); };
    var c = box.querySelector("[data-copy]");
    if (c) c.onclick = function () { copyReport(c); };
  }

  function mount() {
    box = document.createElement("div");
    box.style.cssText =
      "position:fixed;top:8px;right:8px;z-index:2147483647;max-width:580px;" +
      "max-height:calc(100vh - 16px);overflow-y:auto;overscroll-behavior:contain;" +
      "background:rgba(8,10,16,.95);color:#8ef29a;font:11px/1.55 ui-monospace,Menlo,Consolas,monospace;" +
      "padding:10px 12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;" +
      "box-shadow:0 8px 30px rgba(0,0,0,.55);pointer-events:auto";
    document.body.appendChild(box);
    render();
    timer = setInterval(render, 1500);           // geç pinler/hatalar da görünsün
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

})(typeof window !== "undefined" ? window : this);
