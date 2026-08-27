/*!
 * voice-orbs.js v1.0.0
 * Voice sample orb carousel — ElevenLabs "omnibox" bileşeninin birebir
 * mekanizmasıyla: yatay orb dizisi (merkez büyük, komşular peek), tıklanınca
 * ses önizlemesi çalar, aktif orb'un üstünde SES-REAKTİF WebGL katmanı oynar.
 * Zero deps (GSAP gerektirmez) — tüm geçişler CSS transition'dır.
 * https://github.com/roicool/sestek
 *
 * Pipeline (kaynak analiz dokümanına sadık):
 *   • İki <audio preload="none" crossorigin="anonymous"> — double-buffer,
 *     ses değişiminde ping-pong (gapless). src, fetch→Blob→objectURL.
 *   • Web Audio: MediaElementSource → AnalyserNode → destination;
 *     rAF'te frekans verisi → tek enerji değeri (0..1).
 *   • WebGL fragment shader: orb dokusu + 32px noise dokusu; UV'ler
 *     fbm(uv + time) ile warp edilir, şiddet = uEnergy; üstüne grain.
 *     Canvas yalnız AKTİF orb'da; diğerleri düz <img> (perf).
 *   • Orb <img>'i enerjiyle hafif scale pulse'ı alır (1 + energy*0.06).
 *
 * Markup:
 *   <div data-voice-orbs>
 *     <div class="vo-viewport"><div class="vo-track">
 *       <button class="vo-orb" data-vo-item data-vo-name="James"
 *               data-vo-src="https://…/james.mp3">
 *         <img src="…orb.png" alt="">
 *       </button>
 *       … (her ses için bir buton; component sonsuz döngü için klonlar)
 *     </div></div>
 *     <button data-vo-prev>‹</button> <button data-vo-next>›</button>
 *   </div>
 *
 * Root attributes (hepsi opsiyonel):
 *   data-vo-sizes      merkezden uzaklığa göre orb çapları px
 *                      (default "256,202,145,109" — kaynak siteden ölçülü)
 *   data-vo-fit        merdivenin tam ölçek çalıştığı viewport genişliği px;
 *                      daha darda oransal küçülür, peek düzeni korunur
 *                      (default 760)
 *   data-vo-min-scale  mobil küçülmenin alt sınırı (default 0.42)
 *
 * ⚠️ CORS: ses dosyaları (Cloudflare R2) ve orb görselleri (Webflow assets)
 * Access-Control-Allow-Origin header'ıyla servis edilmeli — AnalyserNode ve
 * WebGL dokusu ancak böyle çalışır. R2 bucket'ında CORS policy tanımla.
 *
 * Fallback'ler: WebGL/doku yoksa görselleştirici sessizce atlanır, ses çalar.
 * prefers-reduced-motion → canvas ve pulse yok, ses çalar. Viewport dışında
 * rAF durur (ses sürer). Audio fetch hatasında blob yerine doğrudan URL.
 *
 * Changelog
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

  /* ── WebGL visualizer ─────────────────────────────────────────
   * Dokümandaki tarif: orb dokusunu fbm(uv+time)*uEnergy ile warp'la,
   * noise dokusundan grain ekle. Dairesel maske alpha'da.
   */
  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",     // orb PNG
    "uniform sampler2D u_noise;",   // 32px tileable noise
    "uniform vec2  u_res;",
    "uniform float u_time;",
    "uniform float u_energy;",
    // fbm — noise DOKUSUNDAN örnekleyerek (kaynak: küçük noise png + fbm warp)
    "float fbm(vec2 p){",
    "  float v=0.0,a=0.5;",
    "  for(int i=0;i<4;i++){v+=a*texture2D(u_noise,p).r;p=p*2.03+17.1;a*=0.5;}",
    "  return v;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_res;",
    "  vec2 c=uv-0.5;float r=length(c)*2.0;",
    "  float mask=1.0-smoothstep(0.98,1.0,r);",
    "  float t=u_time;",
    // warp şiddeti ses enerjisiyle ölçeklenir; kenara doğru söner ki
    // örnekleme dairenin (şeffaf köşelerin) dışına taşmasın
    "  float amp=(0.04+u_energy*0.22)*(1.0-smoothstep(0.82,1.0,r));",
    "  vec2 d=vec2(fbm(uv*1.5+vec2(t*0.05,t*0.03)),",
    "              fbm(uv*1.5+vec2(-t*0.04,t*0.06)+7.3))-0.5;",
    "  vec3 col=texture2D(u_tex,uv+d*amp).rgb;",
    // grain
    "  float g=texture2D(u_noise,gl_FragCoord.xy/32.0+fract(vec2(t*7.0,t*13.0))).r;",
    "  col+=(g-0.5)*0.06;",
    "  gl_FragColor=vec4(col,mask);}"
  ].join("\n");

  function createViz(canvas) {
    var gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }) ||
             canvas.getContext("experimental-webgl", { alpha: true, premultipliedAlpha: false });
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

    // TEXTURE1 — 32×32 tileable noise (kaynaktaki küçük noise png karşılığı,
    // dışa istek atmamak için burada üretilir)
    var noiseTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, noiseTex);
    var px = new Uint8Array(32 * 32);
    for (var i = 0; i < px.length; i++) px[i] = (Math.random() * 256) | 0;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 32, 32, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, px);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // TEXTURE0 — orb görseli (aktif ses değişince yeniden yüklenir)
    var orbTex = gl.createTexture();
    var hasTex = false;

    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uEnergy = gl.getUniformLocation(prog, "u_energy");
    gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "u_noise"), 1);

    return {
      setImage: function (img) {
        hasTex = false;
        if (!img) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, orbTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        } catch (e) {
          console.warn("[voice-orbs] Orb dokusu yüklenemedi (CORS?):", e);
          return;
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        hasTex = true;
      },
      ready: function () { return hasTex; },
      resize: function (px) {
        canvas.width = px; canvas.height = px;
        gl.viewport(0, 0, px, px);
      },
      draw: function (t, energy) {
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, t);
        gl.uniform1f(uEnergy, energy);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  /* ── Bir instance ─────────────────────────────────────────── */
  function setup(root) {
    if (root._voInit) return null;
    root._voInit = true;

    var track = root.querySelector(".vo-track");
    var viewport = root.querySelector(".vo-viewport");
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-vo-item]"));
    if (!track || !viewport || items.length < 2) {
      console.warn("[voice-orbs] .vo-track/.vo-viewport veya yeterli [data-vo-item] yok.");
      return null;
    }

    var reduce = reducedMotion();
    var ladder = (root.getAttribute("data-vo-sizes") || "256,202,145,109")
      .split(",").map(function (n) { return parseFloat(n) || 0; });
    while (ladder.length < 4) ladder.push(ladder[ladder.length - 1]);
    var fit = attrNum(root, "data-vo-fit", 760);
    var minScale = attrNum(root, "data-vo-min-scale", 0.42);

    var N = items.length;
    var voices = items.map(function (el) {
      return {
        name: el.getAttribute("data-vo-name") || "",
        src: el.getAttribute("data-vo-src") || "",
        img: el.querySelector("img"),
        texPromise: null
      };
    });

    // ── Sonsuz döngü: seti 3 kopya hâlinde diz (kaynak DOM'daki gibi),
    // pos orta kopyada gezer, kenara yaklaşınca sessizce ±N zıplanır.
    function makeClone(i) {
      var el = items[i].cloneNode(true);
      el.setAttribute("tabindex", "-1"); // klonlar tab sırasına girmesin
      el._voVoice = i;
      return el;
    }
    items.forEach(function (el, i) {
      el._voVoice = i;
      if (voices[i].name) {
        el.setAttribute("aria-label", "Play " + voices[i].name + " preview");
      }
    });
    voices.forEach(function (_, i) { track.insertBefore(makeClone(i), items[0]); });
    voices.forEach(function (_, i) { track.appendChild(makeClone(i)); });
    // DOM sırası: [önceki kopya][orijinaller][sonraki kopya]
    var els = Array.prototype.slice.call(track.children);

    var pos = N; // orta kopyanın ilk sesi
    var normalizeTimer = 0;

    // ── Layout: boyut merdiveni + track'i merkeze getiren translate
    function scaleNow() {
      var w = viewport.clientWidth || root.clientWidth;
      return Math.max(minScale, Math.min(1, w / fit));
    }
    function layout(noAnim) {
      var s = scaleNow();
      var gap = parseFloat(getComputedStyle(track).gap) || 24;
      if (noAnim) root.classList.add("vo-no-anim");
      var x = 0, activeCenter = 0;
      els.forEach(function (el, i) {
        var dist = Math.min(Math.abs(i - pos), 3);
        var size = Math.round(ladder[dist] * s);
        el.style.width = size + "px";
        el.style.height = size + "px";
        el.classList.toggle("is-active", i === pos);
        el.classList.toggle("vo-d1", Math.abs(i - pos) === 1);
        if (i === pos) activeCenter = x + size / 2;
        x += size + gap;
      });
      var tx = (viewport.clientWidth / 2) - activeCenter;
      track.style.transform = "translate3d(" + tx.toFixed(1) + "px,0,0)";
      if (noAnim) {
        void track.offsetWidth; // reflow — geçişsiz uygula
        root.classList.remove("vo-no-anim");
      }
      if (viz) viz.resize(Math.round(ladder[0] * s * Math.min(window.devicePixelRatio || 1, 2)));
    }
    // Kenar kopyasına taşındıysak animasyon bitince görünmez ±N zıplaması
    function scheduleNormalize() {
      if (pos >= N && pos < 2 * N) return;
      clearTimeout(normalizeTimer);
      normalizeTimer = setTimeout(function () {
        pos += pos < N ? N : -N;
        moveCanvasTo(els[pos]);
        layout(true);
      }, 500);
    }

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

    // ── Visualizer kurulumu (tek canvas, aktif orb'a taşınır)
    var canvas = null, viz = null, energy = 0;
    if (!reduce) {
      canvas = document.createElement("canvas");
      canvas.className = "vo-canvas";
      canvas.setAttribute("aria-hidden", "true");
      viz = createViz(canvas);
      if (!viz) canvas = null; // WebGL yok → görselleştiricisiz devam
    }
    function moveCanvasTo(el) {
      if (canvas && canvas.parentNode !== el) el.appendChild(canvas);
    }
    function loadTexFor(vi) {
      var v = voices[vi];
      if (!v.texPromise) {
        v.texPromise = new Promise(function (res) {
          if (!v.img) return res(null);
          var im = new Image();
          im.crossOrigin = "anonymous";
          im.onload = function () { res(im); };
          im.onerror = function () { res(null); };
          im.src = v.img.currentSrc || v.img.src;
        });
      }
      return v.texPromise;
    }

    var t0 = performance.now();
    function tick() {
      raf = 0;
      if (!playing || !visible) return;
      var e = 0;
      if (analyser) {
        analyser.getByteFrequencyData(freq);
        var sum = 0;
        for (var i = 0; i < freq.length; i++) sum += freq[i];
        e = (sum / freq.length) / 255;
      }
      energy = e;
      var active = els[pos];
      var img = active.querySelector("img");
      if (img && !reduce) img.style.transform = "scale(" + (1 + e * 0.06).toFixed(3) + ")";
      if (viz && viz.ready() && canvas) viz.draw((performance.now() - t0) / 1000, e);
      raf = requestAnimationFrame(tick);
    }
    function startTick() { if (!raf && playing && visible) raf = requestAnimationFrame(tick); }

    function stop() {
      playing = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (canvas) canvas.classList.remove("is-on");
      var img = els[pos].querySelector("img");
      if (img) img.style.transform = "";
      audios.forEach(function (a) { a.pause(); });
    }

    var ctl = { stop: stop };

    function play() {
      var vi = els[pos]._voVoice;
      var v = voices[vi];
      if (!v.src) return;
      if (currentlyPlaying && currentlyPlaying !== ctl) currentlyPlaying.stop();
      currentlyPlaying = ctl;

      ensureGraph();
      if (ac && ac.state === "suspended") ac.resume();

      var id = ++playSeq;
      var prev = audios[flip];
      flip = 1 - flip;                      // ping-pong: diğer buffer'a geç
      var next = audios[flip];

      moveCanvasTo(els[pos]);
      if (viz) {
        loadTexFor(vi).then(function (im) {
          if (id !== playSeq) return;
          viz.setImage(im);
          if (canvas && im && playing) canvas.classList.add("is-on");
        });
      }
      loadBlob(v.src).then(function (src) {
        if (id !== playSeq) return;
        prev.pause();
        if (next.src !== src) next.src = src;
        next.currentTime = 0;
        next.play().catch(function () {});
        playing = true;
        if (canvas && viz && viz.ready()) canvas.classList.add("is-on");
        startTick();
      });
    }
    function toggle() {
      if (playing) { stop(); } else { play(); }
    }
    function goTo(index, autoplay) {
      if (index === pos) { toggle(); return; }
      if (canvas) canvas.classList.remove("is-on");
      var img = els[pos].querySelector("img");
      if (img) img.style.transform = "";
      pos = index;
      layout(reduce);
      scheduleNormalize();
      if (autoplay !== false) play();
    }

    // ── Events
    els.forEach(function (el, i) {
      el.addEventListener("click", function () { goTo(i); });
    });
    var prevBtn = root.querySelector("[data-vo-prev]");
    var nextBtn = root.querySelector("[data-vo-next]");
    if (prevBtn) prevBtn.addEventListener("click", function () { goTo(pos - 1); });
    if (nextBtn) nextBtn.addEventListener("click", function () { goTo(pos + 1); });

    var resizeT = 0;
    window.addEventListener("resize", function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { layout(true); }, 100);
    });

    // Viewport dışında çizimi durdur (ses sürer)
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) startTick();
      }).observe(root);
    }

    layout(true);
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
