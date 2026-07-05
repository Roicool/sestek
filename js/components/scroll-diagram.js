/*!
 * scroll-diagram.js v1.0.0
 * Pinlenen bir bölümün ortasında sabit bir logo durur; scroll ettikçe author'ın
 * yerleştirdiği node'lar (data-dg-node) sırayla açılır ve aralarına SVG oklar
 * ÇİZİLİR. Oklar önce gri taban çizgisi olarak, sonra üstüne Sestek renginde
 * dolarak feedback verir.
 *
 * Node'ların konumunu ve sırasını SEN verirsin; component konumları okuyup
 * (getBoundingClientRect) okları otomatik üretir, sıralar ve scrub timeline'a
 * bağlar. Bağlantı kaynağı varsayılan olarak bir önceki step (ilk node'un oku
 * yoktur — logodan varsayılan ok ÇIKMAZ). data-dg-from ile override edilir:
 * "logo" ya da bir step no. Döngüyü kapatmak için son node'a değil, ilk node'a
 * data-dg-from="<son step>" ver.
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
 *   data-dg-shape      "curve" | "elbow" (yumuşak köşeli L)   (default curve)
 *   data-dg-curve      kavis; + DIŞA (çember yayı), - içe, 0=düz (default 0.18)
 *   data-dg-radius     elbow köşe yumuşatma yarıçapı (px)     (default 24)
 *   data-dg-head       ok başı kanat uzunluğu (px)            (default 11)
 *
 * Node başına override edilebilenler (o okun kendisini etkiler):
 *   data-dg-from       kaynak: "logo" | step no
 *   data-dg-anchor     okun bu node'a girdiği kenar:
 *                      "auto" | "left" | "right" | "top" | "bottom"  (default auto)
 *   data-dg-shape / data-dg-curve / data-dg-radius  → global değeri geçersiz kılar
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var attrNum = Sestek.util.attrNum;

  var SVGNS = "http://www.w3.org/2000/svg";

  function n(v) { return v.toFixed(1); }

  /** Elementin stage-relative kutusu (merkez + yarı-boyutlar). */
  function rectOf(el, sr) {
    var r = el.getBoundingClientRect();
    return {
      cx: r.left - sr.left + r.width / 2,
      cy: r.top - sr.top + r.height / 2,
      hw: r.width / 2, hh: r.height / 2,
    };
  }

  /**
   * Bir kutunun KENARINDA, (tx,ty) noktasına bakan yöndeki bağlanma noktası
   * (+ gap kadar dışarı). anchor verilirse o kenarın ortasına zorlar → oklar
   * text'in içine girmez. Dönen nx,ny = dışarı normal (ok yönü için).
   */
  function edgePoint(box, tx, ty, gap, anchor) {
    if (anchor === "left")   return { x: box.cx - box.hw - gap, y: box.cy, nx: -1, ny: 0 };
    if (anchor === "right")  return { x: box.cx + box.hw + gap, y: box.cy, nx: 1,  ny: 0 };
    if (anchor === "top")    return { x: box.cx, y: box.cy - box.hh - gap, nx: 0, ny: -1 };
    if (anchor === "bottom") return { x: box.cx, y: box.cy + box.hh + gap, nx: 0, ny: 1 };
    // auto: merkezden hedefe giden ışının kutu sınırıyla kesişimi
    var dx = tx - box.cx, dy = ty - box.cy;
    var t = 1 / Math.max(Math.abs(dx) / (box.hw || 1e-6), Math.abs(dy) / (box.hh || 1e-6), 1e-6);
    var ex = box.cx + dx * t, ey = box.cy + dy * t;
    var dl = Math.hypot(dx, dy) || 1;
    return { x: ex + dx / dl * gap, y: ey + dy / dl * gap, nx: dx / dl, ny: dy / dl };
  }

  /** Ok başı: uca (x2,y2) gelen (idx,idy) yönüne göre iki kanat — path devamı. */
  function arrowHead(x2, y2, idx, idy, h) {
    var bx = -idx * h, by = -idy * h;                 // uçtan geriye
    var px = -idy * h * 0.55, py = idx * h * 0.55;    // kanat açıklığı
    return "M" + n(x2 + bx + px) + "," + n(y2 + by + py) +
           "L" + n(x2) + "," + n(y2) +
           "L" + n(x2 + bx - px) + "," + n(y2 + by - py);
  }

  /** KAVİSLİ (cubic bézier) ok; yay origin'den (merkez) dışa bükülür. */
  function curvePath(a, b, curve, head, origin) {
    var x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    var dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len, px = -uy, py = ux;
    if (origin) {
      var mx = (x1 + x2) / 2 - origin.x, my = (y1 + y2) / 2 - origin.y;
      if (px * mx + py * my < 0) { px = -px; py = -py; }
    }
    var bow = curve * len;
    var c1x = x1 + ux * len * 0.33 + px * bow, c1y = y1 + uy * len * 0.33 + py * bow;
    var c2x = x1 + ux * len * 0.66 + px * bow, c2y = y1 + uy * len * 0.66 + py * bow;
    var tx = x2 - c2x, ty = y2 - c2y, tl = Math.hypot(tx, ty) || 1;
    return "M" + n(x1) + "," + n(y1) +
           "C" + n(c1x) + "," + n(c1y) + " " + n(c2x) + "," + n(c2y) + " " + n(x2) + "," + n(y2) +
           arrowHead(x2, y2, tx / tl, ty / tl, head);
  }

  /** Köşesi yumuşatılmış L (elbow) ok — dik segmentler + radius'lu köşe. */
  function elbowPath(a, b, radius, head) {
    var x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    var horizFirst = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
    var cx = horizFirst ? x2 : x1, cy = horizFirst ? y1 : y2; // köşe noktası
    var r = Math.min(radius, Math.hypot(cx - x1, cy - y1), Math.hypot(x2 - cx, y2 - cy));
    var s1x = Math.sign(cx - x1), s1y = Math.sign(cy - y1); // seg1 ekseni
    var s2x = Math.sign(x2 - cx), s2y = Math.sign(y2 - cy); // seg2 ekseni
    var ax = cx - s1x * r, ay = cy - s1y * r;               // köşeden r önce
    var bx = cx + s2x * r, by = cy + s2y * r;               // köşeden r sonra
    return "M" + n(x1) + "," + n(y1) +
           "L" + n(ax) + "," + n(ay) +
           "Q" + n(cx) + "," + n(cy) + " " + n(bx) + "," + n(by) +
           "L" + n(x2) + "," + n(y2) +
           arrowHead(x2, y2, s2x, s2y, head);
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
    var radius0 = attrNum(root, "data-dg-radius", 24);       // elbow köşe yumuşaklığı
    var shape0  = root.getAttribute("data-dg-shape") || "curve"; // curve | elbow
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

    // Her node için bir bağlantı (base + fill path) kur.
    // Kaynak: data-dg-from="logo" | "<step no>"; yoksa bir önceki step. İlk node'un
    // (ve kaynağı olmayanın) oku YOKTUR — logodan varsayılan ok çıkmaz.
    var conns = [];
    nodes.forEach(function (node, i) {
      var fromRaw = node.getAttribute("data-dg-from");
      var source = null;
      if (fromRaw === "logo") {
        source = logo;
      } else if (fromRaw) {
        source = nodes.filter(function (nd) {
          return String(attrNum(nd, "data-dg-step", NaN)) === fromRaw;
        })[0] || null;
      } else if (i > 0) {
        source = nodes[i - 1]; // default: bir önceki step
      }
      if (!source) return; // kaynak yok → bu node'a ok çizme

      conns.push({
        node: node, source: source,
        curve:  attrNum(node, "data-dg-curve", curve0),
        radius: attrNum(node, "data-dg-radius", radius0),
        shape:  node.getAttribute("data-dg-shape") || shape0,
        anchor: node.getAttribute("data-dg-anchor") || "auto", // hedef kenarı
        base: mkPath("dg-line dg-line--base"),
        fill: mkPath("dg-line dg-line--fill"),
      });
    });

    // data-dg-loop → döngüyü kapat: son node'dan ilk node'a ok. Kapanış oku son
    // node göründükten SONRA çizilir (aşağıdaki forward/backward zamanlaması).
    if (Sestek.util.flag(root.getAttribute("data-dg-loop")) && nodes.length >= 2) {
      var firstNode = nodes[0], lastNode = nodes[nodes.length - 1];
      var alreadyIn = conns.some(function (c) { return c.node === firstNode; });
      if (!alreadyIn && firstNode !== lastNode) {
        conns.push({
          node: firstNode, source: lastNode,
          curve:  attrNum(firstNode, "data-dg-curve", curve0),
          radius: attrNum(firstNode, "data-dg-radius", radius0),
          shape:  firstNode.getAttribute("data-dg-shape") || shape0,
          anchor: firstNode.getAttribute("data-dg-anchor") || "auto",
          base: mkPath("dg-line dg-line--base"),
          fill: mkPath("dg-line dg-line--fill"),
        });
      }
    }

    if (!conns.length) {
      console.warn("[Sestek ScrollDiagram] no connections resolved.", root);
    }

    // ── Geometri: svg'yi stage pikseline eşitle, path 'd'lerini yaz ────────────
    function layout() {
      var sr = stage.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + sr.width + " " + sr.height);
      var lb = rectOf(logo, sr);
      var origin = { x: lb.cx, y: lb.cy }; // kavisin "iç" tarafı = merkez
      conns.forEach(function (c) {
        var sb = rectOf(c.source, sr), db = rectOf(c.node, sr);
        // Uçlar kutu KENARINA bağlanır (text'in içine girmez); anchor override edilebilir.
        var a = edgePoint(sb, db.cx, db.cy, gap, "auto");
        var b = edgePoint(db, sb.cx, sb.cy, gap, c.anchor);
        var d = c.shape === "elbow"
          ? elbowPath(a, b, c.radius, head)
          : curvePath(a, b, c.curve, head, origin);
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
      nodes.forEach(function (nd) { nd.style.opacity = "1"; nd.style.visibility = "visible"; });
      conns.forEach(function (c) { drawShow(c.base); drawShow(c.fill); });
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

    // Her node kendi step'inde açılır. Bir ok, iki ucundan SONRA görünen node'un
    // step'inde çizilir: ileri ok (kaynak önce göründü) → hedefin step'inde,
    // hedefle birlikte; geri/kapanış oku (kaynak sonra görünür, örn. son→ilk
    // döngü) → kaynağın step'inde, node göründükten sonra. Böylece ilk node da
    // görünür ve kapanış oku görünmeyen node'dan çizilmez.
    function drawArrow(c) { tl.to(c.base, drawVars(0.5)).to(c.fill, drawVars(0.6)); }

    nodes.forEach(function (node, idx) {
      // 1) bu node'a giren İLERİ oklar (kaynağı zaten görünmüş)
      var drewForward = false;
      conns.forEach(function (c) {
        if (c.node === node && nodes.indexOf(c.source) < idx) { drawArrow(c); drewForward = true; }
      });
      // 2) node'u aç (ileri ok varsa çizimle üst üste bindir)
      if (drewForward) tl.to(node, { autoAlpha: 1, y: 0, duration: 0.4 }, "<0.2");
      else             tl.to(node, { autoAlpha: 1, y: 0, duration: 0.4 });
      // 3) bu node'dan çıkan GERİ/kapanış okları (hedefi zaten görünmüş)
      conns.forEach(function (c) {
        if (c.source === node && nodes.indexOf(c.node) < idx) { drawArrow(c); }
      });
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
