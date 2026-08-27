/*!
 * voice-orbs.js v2.1.0
 * Voice sample orb carousel — omnibox tarzı: 5 görünür orb (merkez + 2 komşu
 * + 2 kenar), her orb'un altında başlık + açıklama, dil filtresi, play/pause
 * overlay. AKTİF orb PNG yerine sürekli akan WebGL fluid-gradient çizer
 * (film grenli); ses çalarken akış hızı ve parlaklık AnalyserNode enerjisiyle
 * artar. Zero deps — geçişler CSS transition, shader dosyanın içinde gömülü.
 * https://github.com/roicool/sestek
 *
 * Audio pipeline: iki <audio preload="none" crossorigin="anonymous"> —
 * double-buffer ping-pong, src fetch→Blob→objectURL (cache'li);
 * MediaElementSource → AnalyserNode → destination; rAF'te frekans
 * ortalaması → enerji (0..1).
 *
 * Markup (Webflow):
 *   <div data-voice-orbs>
 *     [ops.] filtre barı: <button data-vo-filter="all">All</button>
 *                         <button data-vo-filter="en">English</button> …
 *                         (üstte ve/veya altta; JS aktif olana .is-active basar)
 *     <div class="vo-viewport"><div class="vo-track">
 *       <div class="vo-item" data-vo-item
 *            data-vo-name="Characters"
 *            data-vo-src="https://…/preview.mp3"
 *            data-vo-lang="en,tr"                      ← filtre eşleşmesi
 *            data-vo-colors="#e08bd2,#7f7bd6,#f7c8b8"> ← ops. shader renkleri
 *         <div class="vo-orb"><img src="…orb.png" alt=""></div>
 *         <div class="vo-caption">
 *           <div class="vo-title">Characters</div>
 *           <div class="vo-desc">Playful and engaging voices…</div>
 *         </div>
 *       </div>
 *       … her ses için bir .vo-item
 *     </div></div>
 *     <button data-vo-prev aria-label="Previous voice">‹</button>
 *     <button data-vo-next aria-label="Next voice">›</button>
 *   </div>
 *
 * Component davranışı:
 *   • Orijinal .vo-item'lar şablon olarak alınır ve DOM'dan çıkarılır;
 *     track, aktif filtreye uyan seslerin 3 kopyasıyla (sonsuz döngü)
 *     yeniden kurulur. Play/pause butonunu her orb'a JS enjekte eder.
 *   • data-vo-colors yoksa renkler orb PNG'sinden otomatik örneklenir
 *     (CORS temiz olmalı); o da olmazsa Sestek pastel varsayılanları.
 *   • Komşu orb'a tıklama (veya hover'da çıkan play) oraya kaydırır ve çalar;
 *     aktif orb'da play/pause toggle.
 *
 * Root attributes (hepsi opsiyonel):
 *   data-vo-sizes      orb çapları merkez→dışa px (default "220,150,104")
 *   data-vo-fit        merdivenin tam ölçek viewport'u px (default 760);
 *                      darda oransal küçülür, peek düzeni korunur
 *   data-vo-min-scale  küçülme alt sınırı (default 0.42)
 *
 * ⚠️ CORS: mp3'ler (R2) ve orb görselleri Access-Control-Allow-Origin ile
 * servis edilmeli — analyser, renk örnekleme ve WebGL dokusu buna bağlı.
 *
 * Fallback'ler: WebGL yoksa canvas atlanır (PNG kalır, ses çalar);
 * prefers-reduced-motion → canvas yok, statik düzen, ses çalar; viewport
 * dışında rAF durur; fetch hatasında blob yerine doğrudan URL.
 *
 * Changelog
 * v2.1.0 — daha ferah düzen: default orb merdiveni 256/190/132 → 220/150/104,
 *          orb aralığı (gap) mobil ölçeğiyle birlikte küçülür (dar ekranda
 *          oransal boşluk korunur, kalabalık görünüm gitti)
 * v2.0.0 — BREAKING yeniden tasarım: item Button → Div (.vo-orb + .vo-caption),
 *          caption alanı, dil filtresi (data-vo-filter / data-vo-lang),
 *          JS-enjekte play/pause overlay (hover'da komşularda görünür),
 *          5-orb düzeni (3 kademeli merdiven), aktif orb'da PNG yerine
 *          sürekli akan fluid-gradient shader (domain-warped fbm + gren;
 *          renkler data-vo-colors ya da PNG'den otomatik).
 * v1.0.0 — initial release
 */

(function (global) {
  "use strict";

  var U = (global.Sestek && global.Sestek.util) || {};
  function attrNum(el, a, d) {
    return U.attrNum ? U.attrNum(el, a, d) : (parseFloat(el.getAttribute(a)) || d);
  }
  function reducedMotion() {
    return U.prefersReducedMotion
      ? U.prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Aynı anda tek instance ses çalsın. */
  var currentlyPlaying = null;

  var DEFAULT_COLORS = [
    [0.98, 0.84, 0.93], // soft pembe
    [0.55, 0.47, 0.92], // viyole
    [0.79, 0.86, 0.98]  // buz mavisi
  ];

  var PLAY_SVG =
    '<svg class="vo-ic-play" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">' +
    '<path d="M5.5 3.5v11l9-5.5z" fill="currentColor"/></svg>';
  var PAUSE_SVG =
    '<svg class="vo-ic-pause" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">' +
    '<path d="M4.5 3.5h3v11h-3zM10.5 3.5h3v11h-3z" fill="currentColor"/></svg>';

  /* ── WebGL fluid gradient ─────────────────────────────────────
   * Domain-warped fbm: q ve w ara alanları üzerinden 3 rengi akıtır,
   * küre hacmi için highlight + kenar gölgesi, üstüne canlı film greni.
   * u_energy akış hızını ve parlaklığı sürer (0 = sakin idle akış).
   */
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  /*
   * Kaynak dokümanın tarifi: orb dokusunu fbm(uv+time) ile warp'la (şiddet
   * uEnergy'yle ölçekli), noise dokusundan grain ekle. Burada warp "sıvı"
   * seviyesinde ve idle'da da akar; energy hızı+şiddeti+parlaklığı artırır.
   * PNG dokusu (CORS) alınamazsa u_c1..3 renklerinden aynı akışla sentez.
   * NOT: fbm örnekleme koordinatları TEXEL ölçeğine indirgenir (÷128) —
   * yüksek frekansta ham random dokusu konfetiye döner.
   */
  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",     // orb PNG
    "uniform sampler2D u_noise;",   // 128px tileable random
    "uniform vec2  u_res;",
    "uniform float u_time;",
    "uniform float u_energy;",
    "uniform float u_hasTex;",
    "uniform vec3  u_c1;",
    "uniform vec3  u_c2;",
    "uniform vec3  u_c3;",
    // value-noise fbm — p birim uzayda, texel ölçeğine burada iner
    "float fbm(vec2 p){",
    "  float v=0.0,a=0.5;",
    "  p*=0.045;",                  // canvas boyu ≈ 6 texel → yumuşak alan
    "  for(int i=0;i<4;i++){v+=a*texture2D(u_noise,p).r;p=p*2.03+17.1;a*=0.5;}",
    "  return v;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_res;",
    "  vec2 c=uv-0.5;float r=length(c)*2.0;",
    "  float mask=1.0-smoothstep(0.98,1.0,r);",
    "  float t=u_time*(0.28+u_energy*1.1);",
    // akış alanı: iki fazlı fbm → sıvı domain warp
    "  vec2 q=vec2(fbm(uv*2.0+vec2(t*0.30,t*0.18)),",
    "              fbm(uv*2.0+vec2(4.7,1.3)-vec2(t*0.22,t*0.34)));",
    "  float amp=(0.14+u_energy*0.30)*(1.0-smoothstep(0.80,1.0,r));",
    "  vec2 wuv=uv+(q-0.5)*amp;",
    // renk: PNG varsa warp'lı doku; yoksa aynı akıştan 3-renk sentez
    "  vec3 col;",
    "  if(u_hasTex>0.5){col=texture2D(u_tex,wuv).rgb;}",
    "  else{",
    "    col=mix(u_c1,u_c2,clamp((q.x-0.32)*3.0,0.0,1.0));",
    "    col=mix(col,u_c3,clamp((q.y-0.36)*2.8,0.0,1.0));",
    "  }",
    "  vec2 h=c-vec2(-0.16,0.16);",                       // üst-sol highlight
    "  col+=vec3(0.08)*exp(-dot(h,h)*7.0);",
    "  col*=1.0-0.16*smoothstep(0.60,1.0,r);",            // kenar gölgesi
    "  col+=u_energy*0.12;",                              // çalarken parlar
    "  float g=texture2D(u_noise,gl_FragCoord.xy/128.0+fract(vec2(u_time*3.1,u_time*5.7))).r;",
    "  col+=(g-0.5)*0.07;",                               // film greni
    "  gl_FragColor=vec4(col,mask);}"
  ].join("\n");

  function createViz(canvas) {
    var opts = { alpha: true, premultipliedAlpha: false };
    var gl = canvas.getContext("webgl", opts) ||
             canvas.getContext("experimental-webgl", opts);
    if (!gl) return null;

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[voice-orbs]", gl.getShaderInfoLog(s)); return null;
      }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // 128×128 tileable noise — fbm tabanı + piksel greni (dış istek yok)
    var noiseTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    var px = new Uint8Array(128 * 128);
    for (var i = 0; i < px.length; i++) px[i] = (Math.random() * 256) | 0;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 128, 128, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // TEXTURE0 — aktif orb'un PNG'si (ses değişince setImage ile yenilenir)
    var orbTex = gl.createTexture();

    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uEnergy = gl.getUniformLocation(prog, "u_energy");
    var uHasTex = gl.getUniformLocation(prog, "u_hasTex");
    var uC = [
      gl.getUniformLocation(prog, "u_c1"),
      gl.getUniformLocation(prog, "u_c2"),
      gl.getUniformLocation(prog, "u_c3")
    ];
    gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "u_noise"), 1);
    gl.uniform1f(uHasTex, 0);

    return {
      setImage: function (img) {
        if (!img) { gl.uniform1f(uHasTex, 0); return false; }
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, orbTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        } catch (e) {
          gl.uniform1f(uHasTex, 0); return false;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.uniform1f(uHasTex, 1);
        return true;
      },
      setColors: function (cols) {
        for (var i = 0; i < 3; i++) gl.uniform3fv(uC[i], cols[i] || DEFAULT_COLORS[i]);
      },
      resize: function (side) {
        canvas.width = side; canvas.height = side;
        gl.viewport(0, 0, side, side);
      },
      draw: function (t, energy) {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uEnergy, energy);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  /* "#rrggbb,#rrggbb,#rrggbb" → [[r,g,b]×3] (0..1) | null */
  function parseColors(v) {
    if (!v) return null;
    var out = [];
    v.split(",").forEach(function (h) {
      var m = h.trim().match(/^#?([0-9a-f]{6})$/i);
      if (m) out.push([
        parseInt(m[1].slice(0, 2), 16) / 255,
        parseInt(m[1].slice(2, 4), 16) / 255,
        parseInt(m[1].slice(4, 6), 16) / 255
      ]);
    });
    return out.length >= 3 ? out.slice(0, 3) : null;
  }

  /* PNG'den 3 renk örnekle: parlaklığa göre sırala, %82/%50/%18'den al. */
  function extractPalette(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onerror = function () { res(null); };
      im.onload = function () {
        try {
          var cv = document.createElement("canvas");
          cv.width = cv.height = 24;
          var cx = cv.getContext("2d");
          cx.drawImage(im, 0, 0, 24, 24);
          var d = cx.getImageData(0, 0, 24, 24).data, px = [];
          for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 200) px.push([d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]);
          }
          if (px.length < 12) return res(null);
          px.sort(function (a, b) {
            return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]);
          });
          res([
            px[(px.length * 0.82) | 0],
            px[(px.length * 0.50) | 0],
            px[(px.length * 0.18) | 0]
          ]);
        } catch (e) { res(null); } // tainted canvas (CORS yok) → varsayılan
      };
      im.src = src;
    });
  }

  /* ── Bir instance ─────────────────────────────────────────── */
  function setup(root) {
    if (root._voInit) return null;
    root._voInit = true;

    var track = root.querySelector(".vo-track");
    var viewport = root.querySelector(".vo-viewport");
    var originals = Array.prototype.slice.call(root.querySelectorAll("[data-vo-item]"));
    if (!track || !viewport || !originals.length) {
      console.warn("[voice-orbs] .vo-track/.vo-viewport veya [data-vo-item] yok.");
      return null;
    }

    var reduce = reducedMotion();
    var ladder = (root.getAttribute("data-vo-sizes") || "220,150,104")
      .split(",").map(function (n) { return parseFloat(n) || 0; });
    var fit = attrNum(root, "data-vo-fit", 760);
    var minScale = attrNum(root, "data-vo-min-scale", 0.42);

    // Şablonları topla, orijinalleri DOM'dan çıkar (track klonlarla kurulur)
    var voices = originals.map(function (el) {
      var img = el.querySelector("img");
      return {
        name: el.getAttribute("data-vo-name") || "",
        src: el.getAttribute("data-vo-src") || "",
        langs: (el.getAttribute("data-vo-lang") || "").toLowerCase()
          .split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        colors: parseColors(el.getAttribute("data-vo-colors")),
        imgSrc: img ? (img.currentSrc || img.src) : "",
        tpl: el,
        palettePromise: null
      };
    });
    originals.forEach(function (el) { el.parentNode.removeChild(el); });

    // ── Audio: double-buffer + blob cache + analyser
    var audios = [0, 1].map(function () {
      var a = document.createElement("audio");
      a.preload = "none";
      a.crossOrigin = "anonymous";
      a.setAttribute("aria-hidden", "true");
      a.style.display = "none";
      root.appendChild(a);
      a.addEventListener("ended", stop);
      return a;
    });
    var flip = 0, ac = null, analyser = null, freq = null;
    var blobCache = {};
    var playing = false, playSeq = 0, visible = true, raf = 0;

    function ensureGraph() {
      if (ac) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      analyser = ac.createAnalyser();
      analyser.fftSize = 128;
      freq = new Uint8Array(analyser.frequencyBinCount);
      audios.forEach(function (a) {
        ac.createMediaElementSource(a).connect(analyser);
      });
      analyser.connect(ac.destination);
    }
    function loadBlob(url) {
      if (!blobCache[url]) {
        blobCache[url] = fetch(url)
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); })
          .then(function (b) { return URL.createObjectURL(b); })
          .catch(function () { return url; }); // fetch/CORS hatası → doğrudan URL
      }
      return blobCache[url];
    }

    // ── Visualizer (tek canvas, aktif orb'a taşınır; idle'da da akar)
    var canvas = null, viz = null;
    if (!reduce) {
      canvas = document.createElement("canvas");
      canvas.className = "vo-canvas";
      canvas.setAttribute("aria-hidden", "true");
      viz = createViz(canvas);
      if (!viz) canvas = null;
    }

    function paletteFor(vi) {
      var v = voices[vi];
      if (v.colors) return Promise.resolve(v.colors);
      if (!v.palettePromise) v.palettePromise = extractPalette(v.imgSrc);
      return v.palettePromise;
    }

    /* Aktif sesin PNG'sini CORS'lu Image olarak yükle (cache'li). */
    function textureFor(vi) {
      var v = voices[vi];
      if (!v.texPromise) {
        v.texPromise = new Promise(function (res) {
          if (!v.imgSrc) return res(null);
          var im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = function () { res(im); };
          im.onerror = function () { res(null); };
          im.src = v.imgSrc;
        });
      }
      return v.texPromise;
    }

    // ── View (aktif filtre) + track kurulumu
    var view = [];   // görünür voice index'leri
    var els = [];    // track'teki node'lar: {el, vi}
    var pos = 0;
    var normalizeTimer = 0;
    var M = 0;       // view.length

    function buildView(filterVal) {
      stop();
      clearTimeout(normalizeTimer);
      filterVal = (filterVal || "all").toLowerCase();
      view = [];
      voices.forEach(function (v, i) {
        var match = filterVal === "all" || !v.langs.length ||
                    v.langs.indexOf(filterVal) !== -1;
        if (match) view.push(i);
      });
      M = view.length;
      track.innerHTML = "";
      els = [];
      if (!M) { console.warn("[voice-orbs] '" + filterVal + "' filtresi boş."); return; }

      for (var copy = 0; copy < 3; copy++) {
        view.forEach(function (vi) {
          var v = voices[vi];
          var el = v.tpl.cloneNode(true);
          el.classList.add("vo-item");
          var orb = el.querySelector(".vo-orb");
          if (orb) {
            var btn = document.createElement("button");
            btn.className = "vo-play";
            btn.setAttribute("aria-label", "Play " + (v.name || "voice") + " preview");
            if (copy !== 1) btn.setAttribute("tabindex", "-1"); // klon kopyalar tab dışı
            btn.innerHTML = PLAY_SVG + PAUSE_SVG;
            orb.appendChild(btn);
            (function (node) {
              orb.addEventListener("click", function () { onOrbClick(node); });
            })(el);
          }
          track.appendChild(el);
          els.push({ el: el, vi: vi });
        });
      }
      pos = M; // orta kopyanın ilk sesi
      activate();
      layout(true);
    }

    function onOrbClick(node) {
      var i = -1;
      for (var k = 0; k < els.length; k++) if (els[k].el === node) { i = k; break; }
      if (i === -1) return;
      if (i === pos) { toggle(); } else { goTo(i); }
    }

    // ── Layout
    function scaleNow() {
      var w = viewport.clientWidth || root.clientWidth;
      return Math.max(minScale, Math.min(1, w / fit));
    }
    function layout(noAnim) {
      if (!els.length) return;
      var s = scaleNow();
      // gap da orb'larla aynı oranda küçülür (taban: --vo-gap) — hem
      // hesapta hem gerçek flex gap'inde aynı değer kullanılır
      var baseGap = parseFloat(
        getComputedStyle(root).getPropertyValue("--vo-gap")
      ) || 64;
      var gap = baseGap * s;
      track.style.gap = gap.toFixed(1) + "px";
      root.style.setProperty("--vo-zone", Math.round(ladder[0] * s) + "px");
      if (noAnim) root.classList.add("vo-no-anim");
      var x = 0, activeCenter = 0;
      els.forEach(function (o, i) {
        var dist = Math.min(Math.abs(i - pos), ladder.length - 1);
        var size = Math.round(ladder[dist] * s);
        o.el.style.width = size + "px";
        if (i === pos) activeCenter = x + size / 2;
        x += size + gap;
      });
      var tx = (viewport.clientWidth / 2) - activeCenter;
      track.style.transform = "translate3d(" + tx.toFixed(1) + "px,0,0)";
      if (noAnim) {
        void track.offsetWidth;
        root.classList.remove("vo-no-anim");
      }
      if (viz) viz.resize(Math.round(ladder[0] * s * Math.min(window.devicePixelRatio || 1, 2)));
    }

    // Aktif sınıflar + canvas'ı aktif orb'a taşı + renkleri yükle
    function activate() {
      els.forEach(function (o, i) {
        o.el.classList.toggle("is-active", i === pos);
        o.el.classList.toggle("vo-d1", Math.abs(i - pos) === 1);
        if (i !== pos) o.el.classList.remove("is-playing");
      });
      if (!canvas) return;
      var orb = els[pos] && els[pos].el.querySelector(".vo-orb");
      if (orb && canvas.parentNode !== orb) orb.insertBefore(canvas, orb.querySelector(".vo-play"));
      // Önce PNG dokusu (dokümandaki asıl teknik); CORS/tainted ise
      // renk paletine düş (data-vo-colors → PNG örnekleme → varsayılan).
      var vi = els[pos].vi, seq = ++colorSeq;
      textureFor(vi).then(function (im) {
        if (seq !== colorSeq || !viz) return;
        if (viz.setImage(im)) return;
        paletteFor(vi).then(function (cols) {
          if (seq !== colorSeq || !viz) return;
          viz.setColors(cols || DEFAULT_COLORS);
        });
      });
      startTick();
    }
    var colorSeq = 0;

    function scheduleNormalize() {
      if (pos >= M && pos < 2 * M) return;
      clearTimeout(normalizeTimer);
      normalizeTimer = setTimeout(function () {
        pos += pos < M ? M : -M;
        activate();
        layout(true);
      }, 600);
    }

    // ── rAF: idle'da da akar (enerji 0), çalarken analyser sürer
    var t0 = performance.now();
    var energy = 0;
    function tick() {
      raf = 0;
      if (!visible || !viz || !els.length) return;
      var target = 0;
      if (playing && analyser) {
        analyser.getByteFrequencyData(freq);
        var sum = 0;
        for (var i = 0; i < freq.length; i++) sum += freq[i];
        target = (sum / freq.length) / 255;
      }
      energy += (target - energy) * 0.18; // yumuşatılmış enerji
      viz.draw((performance.now() - t0) / 1000, energy);
      raf = requestAnimationFrame(tick);
    }
    function startTick() { if (!raf && visible && viz) raf = requestAnimationFrame(tick); }

    // ── Playback
    function stop() {
      playing = false;
      els.forEach(function (o) { o.el.classList.remove("is-playing"); });
      audios.forEach(function (a) { a.pause(); });
    }
    var ctl = { stop: stop };

    function play() {
      if (!els.length) return;
      var vi = els[pos].vi;
      var v = voices[vi];
      if (!v.src) return;
      if (currentlyPlaying && currentlyPlaying !== ctl) currentlyPlaying.stop();
      currentlyPlaying = ctl;

      ensureGraph();
      if (ac && ac.state === "suspended") ac.resume();

      var id = ++playSeq;
      var prev = audios[flip];
      flip = 1 - flip;
      var next = audios[flip];

      loadBlob(v.src).then(function (src) {
        if (id !== playSeq) return;
        prev.pause();
        if (next.src !== src) next.src = src;
        next.currentTime = 0;
        next.play().catch(function () {});
        playing = true;
        if (els[pos]) els[pos].el.classList.add("is-playing");
        startTick();
      });
    }
    function toggle() { if (playing) { stop(); } else { play(); } }
    function goTo(index) {
      if (M < 2 || index === pos) return;
      pos = index;
      activate();
      layout(reduce);
      scheduleNormalize();
      play();
    }

    // ── Nav + filtre + resize + görünürlük
    var prevBtn = root.querySelector("[data-vo-prev]");
    var nextBtn = root.querySelector("[data-vo-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(pos - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(pos + 1); });

    var filterBtns = Array.prototype.slice.call(root.querySelectorAll("[data-vo-filter]"));
    function setFilter(val) {
      filterBtns.forEach(function (b) {
        b.classList.toggle("is-active",
          (b.getAttribute("data-vo-filter") || "").toLowerCase() === val);
      });
      buildView(val);
    }
    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        setFilter((b.getAttribute("data-vo-filter") || "all").toLowerCase());
      });
    });

    var resizeT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { layout(true); }, 100);
    });

    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) startTick();
      }).observe(root);
    }

    // İlk görünüm: .is-active işaretli filtre butonu varsa o, yoksa "all"
    var initial = "all";
    filterBtns.forEach(function (b) {
      if (b.classList.contains("is-active")) {
        initial = (b.getAttribute("data-vo-filter") || "all").toLowerCase();
      }
    });
    setFilter(initial);

    return ctl;
  }

  /**
   * Initialises every [data-voice-orbs] element on the page.
   * @param {string} [selector="[data-voice-orbs]"]
   */
  function initVoiceOrbs(selector) {
    var roots = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-voice-orbs]")
    );
    var out = [];
    roots.forEach(function (root) {
      var c = setup(root);
      if (c) out.push(c);
    });
    return out;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initVoiceOrbs = initVoiceOrbs;

})(typeof window !== "undefined" ? window : this);
