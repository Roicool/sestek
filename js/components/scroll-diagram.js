/*!
 * scroll-diagram.js v1.0.0
 * Pinlenen bir bölümün ortasında sabit bir logo durur; scroll ettikçe author'ın
 * yerleştirdiği node'lar (data-dg-node) sırayla açılır ve aralarına SVG oklar
 * ÇİZİLİR. Oklar önce gri taban çizgisi olarak, sonra üstüne Sestek renginde
 * dolarak (DrawSVG) feedback verir.
 *
 * Node'ların konumunu ve sırasını SEN verirsin; component konumları okuyup
 * (getBoundingClientRect) okları otomatik üretir, sıralar ve scrub timeline'a
 * bağlar. Bağlantı kaynağı varsayılan olarak bir önceki step; data-dg-from ile
 * override edilir (merkezden dallanma mümkün).
 *
 * Bağımlılık: gsap + ScrollTrigger. DrawSVGPlugin varsa oklar "çizilir";
 * yoksa oklar anında görünür (node reveal yine çalışır). Sestek.util gerekli.
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
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;

  var SVGNS = "http://www.w3.org/2000/svg";
  var uid = 0;

  function center(el, stageRect) {
    var r = el.getBoundingClientRect();
    return {
      x: r.left - stageRect.left + r.width / 2,
      y: r.top - stageRect.top + r.height / 2,
      // node kenarına inmek için yarı-boyut (min köşe) + biraz pad
      rad: Math.min(r.width, r.height) / 2,
    };
  }

  /** Kaynak→hedef merkez noktalarından, uçları kırpılmış düz path 'd' üretir. */
  function pathD(src, dst, gap) {
    var dx = dst.x - src.x, dy = dst.y - src.y;
    var len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var x1 = src.x + ux * (src.rad + gap);
    var y1 = src.y + uy * (src.rad + gap);
    var x2 = dst.x - ux * (dst.rad + gap);
    var y2 = dst.y - uy * (dst.rad + gap);
    return "M" + x1.toFixed(1) + "," + y1.toFixed(1) +
           "L" + x2.toFixed(1) + "," + y2.toFixed(1);
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
    var startAt = root.getAttribute("data-dg-start") || "center center";
    var scrubA  = root.getAttribute("data-dg-scrub");
    var scrub   = scrubA === "false" ? false : (scrubA ? (parseFloat(scrubA) || true) : true);

    var reduce  = Sestek.util.prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
    var hasDraw = hasGsap && typeof DrawSVGPlugin !== "undefined";
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      if (hasDraw) gsap.registerPlugin(DrawSVGPlugin);
    }

    // ── SVG ok katmanı ───────────────────────────────────────────────────────
    var svg = stage.querySelector("[data-dg-lines]");
    if (!svg) {
      svg = document.createElementNS(SVGNS, "svg");
      svg.setAttribute("data-dg-lines", "");
      svg.setAttribute("aria-hidden", "true");
      stage.insertBefore(svg, stage.firstChild); // node'ların ALTINDA kalsın
    }

    // Sestek renkli ok başı (fill path'e takılır)
    var markerId = "dg-arrow-" + (++uid);
    var defs = document.createElementNS(SVGNS, "defs");
    defs.innerHTML =
      '<marker id="' + markerId + '" viewBox="0 0 10 10" refX="8" refY="5" ' +
      'markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z"/></marker>';
    svg.appendChild(defs);

    // Her node için bir bağlantı (base + fill path) kur
    var conns = nodes.map(function (node, i) {
      var fromRaw = node.getAttribute("data-dg-from");
      var source;
      if (fromRaw === "logo" || (!fromRaw && i === 0)) {
        source = logo;
      } else if (fromRaw) {
        source = nodes.filter(function (n) {
          return String(attrNum(n, "data-dg-step", NaN)) === fromRaw;
        })[0] || logo;
      } else {
        source = nodes[i - 1]; // default: bir önceki step
      }

      var base = document.createElementNS(SVGNS, "path");
      base.setAttribute("class", "dg-line dg-line--base");
      var fill = document.createElementNS(SVGNS, "path");
      fill.setAttribute("class", "dg-line dg-line--fill");
      fill.setAttribute("marker-end", "url(#" + markerId + ")");
      svg.appendChild(base);
      svg.appendChild(fill);

      return { node: node, source: source, base: base, fill: fill };
    });

    // ── Geometri: svg'yi stage pikseline eşitle, path 'd'lerini yaz ────────────
    function layout() {
      var sr = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + sr.width + " " + sr.height);
      conns.forEach(function (c) {
        var d = pathD(center(c.source, sr), center(c.node, sr), gap);
        c.base.setAttribute("d", d);
        c.fill.setAttribute("d", d);
      });
    }

    stage.style.setProperty("--dg-line-w", lineW);
    layout();
    root.setAttribute("data-dg-ready", ""); // CSS'in pre-init gizlemesini kaldırır

    // ── GSAP yoksa / reduced-motion: her şey açık, oklar dolu ──────────────────
    if (!hasGsap || reduce) {
      conns.forEach(function (c) {
        c.node.style.opacity = "1";
        if (hasDraw) gsap.set(c.fill, { drawSVG: "100%" });
      });
      window.addEventListener("resize", layout);
      return { relayout: layout };
    }

    // ── Başlangıç durumları ────────────────────────────────────────────────────
    gsap.set(nodes, { autoAlpha: 0, y: 16 });
    if (hasDraw) {
      gsap.set(conns.map(function (c) { return c.base; }), { drawSVG: "0%" });
      gsap.set(conns.map(function (c) { return c.fill; }), { drawSVG: "0%" });
    } else {
      // DrawSVG yoksa oklar sabit görünür, sadece node reveal animasyonu kalır
      conns.forEach(function (c) { c.base.style.opacity = "1"; c.fill.style.opacity = "0"; });
    }

    // ── Scrub timeline ─────────────────────────────────────────────────────────
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
      if (hasDraw) {
        tl.to(c.base, { drawSVG: "100%", duration: 0.5 })       // 1) gri çizilsin
          .to(c.fill, { drawSVG: "100%", duration: 0.6 });      // 2) Sestek dolsun
      } else {
        tl.to(c.fill, { opacity: 1, duration: 0.3 });
      }
      tl.to(c.node, { autoAlpha: 1, y: 0, duration: 0.4 }, "<0.2"); // node açılır
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
