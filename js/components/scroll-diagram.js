/*!
 * scroll-diagram.js v1.0.0
 * Pinlenen bir bölümün ortasında sabit bir logo durur; scroll ettikçe author'ın
 * yerleştirdiği node'lar (data-dg-node) sırayla açılır ve aralarına SVG oklar
 * ÇİZİLİR. Oklar önce gri taban çizgisi olarak, sonra üstüne Sestek renginde
 * dolarak feedback verir.
 *
 * Node'ların konumunu ve sırasını SEN verirsin; component konumları okuyup
 * (getBoundingClientRect) okları otomatik üretir, sıralar ve scrub timeline'a
 * bağlar. Bağlantı kaynağı varsayılan olarak bir önceki step; data-dg-from ile
 * override edilir (merkezden dallanma mümkün).
 *
 * Oklar kavisli (cubic bézier). Çizim proje standardı DrawSVGPlugin ile yapılır
 * (docs/gsap-svg.md §5); plugin yüklü değilse pathLength=1 + stroke-dashoffset
 * fallback'ine düşer (aynı sonuç, ekstra bağımlılık yok). Ok başı path'in son
 * parçası olduğundan çizim tamamlanırken en sonda ortaya çıkar.
 *
 * Bağımlılık: gsap + ScrollTrigger (+ Sestek.util). DrawSVGPlugin opsiyonel/önerilir.
 *
 * ── DOM (kendin kur) ─────────────────────────────────────────────────────────
 *
 *   [data-diagram]                         ← pinlenecek kök (height:100vh)
 *     [data-dg-stage]                       ← konum bağlamı (relative)
 *       [data-dg-logo]                      ← merkez logo
 *       [data-dg-node] data-dg-step="1"     ← node; step = açılış sırası
 *                      data-dg-from="logo"    from = kaynak (logo | step no)
 *       [data-dg-node] data-dg-step="2" data-dg-from="1"
 *       …
 *       <svg data-dg-lines>                 ← YOKSA otomatik oluşturulur
 *
 * Kök attribute'ları (hepsi opsiyonel):
 *   data-dg-distance   node başına scroll mesafesi (vh %)     (default 200)
 *   data-dg-scrub      scrub değeri; "false" → snap yok       (default true)
 *   data-dg-start      ScrollTrigger start                    (default "center center")
 *   data-dg-line-w     çizgi kalınlığı (px)                   (default 2.5)
 *   data-dg-gap        node kenarına bırakılan boşluk (px)    (default 10)
 *   data-dg-curve      kavis miktarı (0 = düz, ±0.4 tipik)    (default 0.18)
 *   data-dg-head       ok başı kanat uzunluğu (px)            (default 11)
 *
 * Node başına data-dg-curve ile o okun kavisi ayrı verilebilir (negatif → ters yön).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;

  var SVGNS = "http://www.w3.org/2000/svg";

  function center(el, stageRect) {
    var r = el.getBoundingClientRect();
    return {
      x: r.left - stageRect.left + r.width / 2,
      y: r.top - stageRect.top + r.height / 2,
      // node kenarına inmek için yarı-boyut (min köşe) + biraz pad
      rad: Math.min(r.width, r.height) / 2,
    };
  }

  function n(v) { return v.toFixed(1); }

  /**
   * Kaynak→hedef merkezlerinden, uçları node kenarına kırpılmış KAVİSLİ (cubic
   * bézier) bir path üretir; sonuna ok başını path'in devamı olarak ekler (böylece
   * çizim tamamlanırken en sonda ortaya çıkar). curve: perpendiküler yay miktarı.
   */
  function pathD(src, dst, gap, curve, head) {
    var dx = dst.x - src.x, dy = dst.y - src.y;
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;      // yön birim vektörü
    var px = -uy, py = ux;                  // perpendiküler (yay yönü)

    // uçları node kenarından geri çek
    var x1 = src.x + ux * (src.rad + gap), y1 = src.y + uy * (src.rad + gap);
    var x2 = dst.x - ux * (dst.rad + gap), y2 = dst.y - uy * (dst.rad + gap);

    var bow = curve * len;                  // yay derinliği mesafeyle ölçekli
    var c1x = x1 + ux * len * 0.33 + px * bow, c1y = y1 + uy * len * 0.33 + py * bow;
    var c2x = x1 + ux * len * 0.66 + px * bow, c2y = y1 + uy * len * 0.66 + py * bow;

    // uçtaki teğet (ok başını buna göre döndür)
    var tx = x2 - c2x, ty = y2 - c2y;
    var tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    var backx = -tx * head, backy = -ty * head;   // uçtan geriye
    var perpx = -ty * head * 0.55, perpy = tx * head * 0.55;
    var lwx = x2 + backx + perpx, lwy = y2 + backy + perpy; // sol kanat
    var rwx = x2 + backx - perpx, rwy = y2 + backy - perpy; // sağ kanat

    return "M" + n(x1) + "," + n(y1) +
           "C" + n(c1x) + "," + n(c1y) + " " + n(c2x) + "," + n(c2y) + " " + n(x2) + "," + n(y2) +
           "M" + n(lwx) + "," + n(lwy) + "L" + n(x2) + "," + n(y2) + "L" + n(rwx) + "," + n(rwy);
  }

  function setupInstance(root) {
    if (root._scrollDiagramInit) return null;
    root._scrollDiagramInit = true;

    var stage = root.querySelector("[data-dg-stage]") || root;
    var logo  = stage.querySelector("[data-dg-logo]");
    var nodes = Array.prototype.slice.call(stage.querySelectorAll("[data-dg-node]"));

    if (!logo || !nodes.length) {
      console.warn("[Sestek ScrollDiagram] need [data-dg-logo] and [data-dg-node]s.", root);
      return null;
    }

    // step'e göre sırala (yoksa DOM sırası)
    nodes.sort(function (a, b) {
      return attrNum(a, "data-dg-step", 0) - attrNum(b, "data-dg-step", 0);
    });

    var gap     = attrNum(root, "data-dg-gap", 10);
    var lineW   = attrNum(root, "data-dg-line-w", 2.5);
    var perNode = attrNum(root, "data-dg-distance", 200);
    var head    = attrNum(root, "data-dg-head", 11);
    var curve0  = attrNum(root, "data-dg-curve", 0.18);
    var startAt = root.getAttribute("data-dg-start") || "center center";
    var scrubA  = root.getAttribute("data-dg-scrub");
    var scrub   = scrubA === "false" ? false : (scrubA ? (parseFloat(scrubA) || true) : true);

    var reduce  = Sestek.util.prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
    // Proje standardı çizim yolu = DrawSVGPlugin (docs/gsap-svg.md §5). Yüklüyse
    // onu kullan; değilse aşağıda manuel stroke-dashoffset'e düşülür.
    var hasDraw = hasGsap && typeof DrawSVGPlugin !== "undefined";
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    if (hasDraw) gsap.registerPlugin(DrawSVGPlugin);

    // ── SVG ok katmanı ───────────────────────────────────────────────────────
    var svg = stage.querySelector("[data-dg-lines]");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("data-dg-lines", "");
      svg.setAttribute("aria-hidden", "true");
      stage.insertBefore(svg, stage.firstChild); // node'ların ALTINDA kalsın
    }

    function mkPath(cls) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("class", cls);
      p.setAttribute("pathLength", "1"); // dash 0..1 → gerçek uzunluktan bağımsız
      svg.appendChild(p);
      return p;
    }

    // Her node için bir bağlantı (base + fill path) kur
    var conns = nodes.map(function (node, i) {
      var fromRaw = node.getAttribute("data-dg-from");
      var source;
      if (fromRaw === "logo" || (!fromRaw && i === 0)) {
        source = logo;
      } else if (fromRaw) {
        source = nodes.filter(function (nd) {
          return String(attrNum(nd, "data-dg-step", NaN)) === fromRaw;
        })[0] || logo;
      } else {
        source = nodes[i - 1]; // default: bir önceki step
      }
      var curve = attrNum(node, "data-dg-curve", curve0); // node bazında override
      return {
        node: node, source: source, curve: curve,
        base: mkPath("dg-line dg-line--base"),
        fill: mkPath("dg-line dg-line--fill"),
      };
    });

    // ── Geometri: svg'yi stage pikseline eşitle, path 'd'lerini yaz ────────────
    function layout() {
      var sr = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + sr.width + " " + sr.height);
      conns.forEach(function (c) {
        var d = pathD(center(c.source, sr), center(c.node, sr), gap, c.curve, head);
        c.base.setAttribute("d", d);
        c.fill.setAttribute("d", d);
      });
    }

    stage.style.setProperty("--dg-line-w", lineW);
    layout();
    root.setAttribute("data-dg-ready", ""); // CSS'in pre-init gizlemesini kaldırır

    // Çizim soyutlaması: DrawSVG varsa onu, yoksa pathLength=1 + dashoffset kullan.
    function drawHide(p) {
      if (hasDraw) { gsap.set(p, { drawSVG: 0 }); }
      else { p.style.strokeDasharray = "1"; p.style.strokeDashoffset = "1"; }
    }
    function drawShow(p) {
      if (hasDraw) { gsap.set(p, { drawSVG: "100%" }); }
      else { p.style.strokeDasharray = "1"; p.style.strokeDashoffset = "0"; }
    }
    // "0% → 100%" çizen tween'in vars'ı. DrawSVG'de "live" resize'da yeniden hesaplar.
    function drawVars(dur) {
      return hasDraw ? { drawSVG: "0% 100% live", duration: dur }
                     : { strokeDashoffset: 0, duration: dur };
    }

    conns.forEach(function (c) { drawHide(c.base); drawHide(c.fill); });

    // ── GSAP yoksa / reduced-motion: her şey açık, oklar dolu ──────────────────
    if (!hasGsap || reduce) {
      conns.forEach(function (c) { c.node.style.opacity = "1"; drawShow(c.base); drawShow(c.fill); });
      window.addEventListener("resize", layout);
      return { relayout: layout };
    }

    // ── Başlangıç durumları ────────────────────────────────────────────────────
    gsap.set(nodes, { autoAlpha: 0, y: 16 });

    // ── Scrub timeline: scroll ederken çiz ─────────────────────────────────────
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        pin: true,
        scrub: scrub,
        start: startAt,
        end: "+=" + (nodes.length * perNode) + "%",
        invalidateOnRefresh: true,
        onRefresh: layout, // resize/refresh'te geometri yeniden hesaplanır
      },
    });

    conns.forEach(function (c) {
      tl.to(c.base, drawVars(0.5))                                   // 1) gri çizilsin
        .to(c.fill, drawVars(0.6))                                   // 2) Sestek dolsun
        .to(c.node, { autoAlpha: 1, y: 0, duration: 0.4 }, "<0.2");  // node açılır
    });

    return { timeline: tl, relayout: layout };
  }

  /** Sayfadaki her [data-diagram]'ı bağla. */
  function initScrollDiagram(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-diagram]")
    );
    var apis = [];
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) apis.push(api);
    });
    return apis;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initScrollDiagram = initScrollDiagram;

})(typeof window !== "undefined" ? window : this);
