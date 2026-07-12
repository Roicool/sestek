/*!
 * aurora-bg.js v1.0.0
 * Mixpanel-style "fluted glass" aurora background — pure WebGL, zero deps.
 * Soft, slow-drifting colour blobs behind vertical refracting glass columns.
 * No three.js, no CDN: a single full-screen fragment shader (~1 draw call).
 * https://github.com/roicool/sestek
 *
 * Attributes on the [data-aurora-bg] element (all optional):
 *   data-aurora-cols       vertical glass column count      (default: 11, Mixpanel)
 *   data-aurora-distort    glass refraction strength        (default: 0.035)
 *   data-aurora-speed      drift speed multiplier           (default: 0.06, calm)
 *   data-aurora-color1     lavender blob   (hex / rgb / var(--token))
 *   data-aurora-color2     pink blob
 *   data-aurora-color3     violet blob
 *   data-aurora-eager      skip IntersectionObserver, start now (above-the-fold)
 *
 * Reuses Sestek.util (attrNum, flag, resolveColor, prefersReducedMotion) — load
 * js/core/utils.js first. Degrades to the element's CSS background if WebGL is
 * unavailable, and freezes to a single static frame under prefers-reduced-motion.
 */

(function (global) {
  "use strict";

  var U = (global.Sestek && global.Sestek.util) || {};
  function attrNum(el, a, d) {
    return U.attrNum ? U.attrNum(el, a, d) : (parseFloat(el.getAttribute(a)) || d);
  }
  function flag(v) {
    return U.flag ? U.flag(v) : (v !== null && v !== "false" && v !== "0");
  }
  function reducedMotion() {
    return U.prefersReducedMotion
      ? U.prefersReducedMotion()
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Parse "#rgb"/"#rrggbb"/"rgb(...)" (Sestek.util.resolveColor first turns a
  // var(--token) into a computed rgb() string) into a [0..1, 0..1, 0..1] triple.
  function toRGB(value, ctxEl, fallback) {
    var v = U.resolveColor ? U.resolveColor(value, ctxEl) : value;
    if (!v) return fallback;
    v = v.trim();
    var m = v.match(/^#([0-9a-f]{3})$/i);
    if (m) {
      var h = m[1];
      return [parseInt(h[0] + h[0], 16) / 255,
              parseInt(h[1] + h[1], 16) / 255,
              parseInt(h[2] + h[2], 16) / 255];
    }
    m = v.match(/^#([0-9a-f]{6})$/i);
    if (m) {
      return [parseInt(m[1].slice(0, 2), 16) / 255,
              parseInt(m[1].slice(2, 4), 16) / 255,
              parseInt(m[1].slice(4, 6), 16) / 255];
    }
    m = v.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      var p = m[1].split(",").map(function (x) { return parseFloat(x); });
      return [p[0] / 255, p[1] / 255, p[2] / 255];
    }
    return fallback;
  }

  var VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}";

  var FRAG = [
    "precision highp float;",
    "uniform vec2  u_res;",
    "uniform float u_time;",
    "uniform float u_cols;",
    "uniform float u_distort;",
    "uniform vec3  u_c1;",   // lavender
    "uniform vec3  u_c2;",   // pink
    "uniform vec3  u_c3;",   // violet
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.0-2.0*f);",
    "return mix(mix(hash(i+vec2(0,0)),hash(i+vec2(1,0)),u.x),",
    "mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}",
    "float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.0;a*=0.5;}return v;}",
    "float blob(vec2 uv,vec2 c,float r){float d=length(uv-c)/r;return exp(-d*d);}",
    "vec3 aurora(vec2 uv,vec2 asp,float t){",
    "  vec2 P=uv*asp;float warp=fbm(P*1.6+t)-0.5;vec2 q=P+warp*0.18;",
    "  vec3 base=vec3(1.0,0.99,1.0);",
    "  vec2 c1=vec2(0.22*asp.x+0.05*sin(t*0.9),0.02+0.04*cos(t*0.7));",
    "  vec2 c2=vec2(0.80*asp.x+0.06*cos(t*0.8),0.06+0.05*sin(t*1.1));",
    "  vec2 c3=vec2(0.52*asp.x+0.08*sin(t*0.6),-0.06+0.05*cos(t*0.9));",
    "  vec3 col=base;",
    "  col=mix(col,u_c1,blob(q,c1,0.62)*0.80);",
    "  col=mix(col,u_c2,blob(q,c2,0.58)*0.72);",
    "  col=mix(col,u_c3,blob(q,c3,0.50)*0.62);",
    "  col=mix(col,base,smoothstep(0.30,1.0,uv.y));return col;}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/u_res.xy;vec2 asp=vec2(u_res.x/u_res.y,1.0);",
    "  float t=u_time;",
    "  float cx=uv.x*u_cols;float fx=fract(cx);float lens=fx-0.5;",   // fluted glass
    "  vec2 ruv=vec2(uv.x+lens*u_distort,uv.y);",
    "  vec3 col=aurora(ruv,asp,t);",
    "  float seam=smoothstep(0.0,0.10,fx)*smoothstep(0.0,0.10,1.0-fx);",
    "  col*=mix(0.90,1.0,seam);",
    "  col+=vec3(1.0)*pow(max(0.0,1.0-abs(lens*2.2)),10.0)*0.05;",
    "  col+=(hash(gl_FragCoord.xy)-0.5)*0.02;",
    "  gl_FragColor=vec4(col,1.0);}"
  ].join("\n");

  function startOne(host) {
    // The canvas is created and owned by the component (decorative layer).
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    if (getComputedStyle(host).position === "static") host.style.position = "relative";
    host.insertBefore(canvas, host.firstChild);

    var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return null; // leave host's CSS background as the fallback

    function compile(type, src) {
      var s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn("[aurora-bg]", gl.getShaderInfoLog(s)); return null;
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

    var uRes = gl.getUniformLocation(prog, "u_res");
    var uTime = gl.getUniformLocation(prog, "u_time");
    var uCols = gl.getUniformLocation(prog, "u_cols");
    var uDistort = gl.getUniformLocation(prog, "u_distort");
    gl.uniform3fv(gl.getUniformLocation(prog, "u_c1"),
      toRGB(host.getAttribute("data-aurora-color1"), host, [0.74, 0.63, 1.0]));
    gl.uniform3fv(gl.getUniformLocation(prog, "u_c2"),
      toRGB(host.getAttribute("data-aurora-color2"), host, [1.0, 0.70, 0.88]));
    gl.uniform3fv(gl.getUniformLocation(prog, "u_c3"),
      toRGB(host.getAttribute("data-aurora-color3"), host, [0.58, 0.40, 0.96]));

    var cols = attrNum(host, "data-aurora-cols", 11);
    var distort = attrNum(host, "data-aurora-distort", 0.035);
    var speed = attrNum(host, "data-aurora-speed", 0.06);

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      var w = host.clientWidth, h = host.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    var reduce = reducedMotion();
    var start = performance.now();
    var raf = 0, stopped = false;

    function draw(now) {
      if (stopped) return;
      var t = (reduce ? 6 : (now - start) / 1000) * speed;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform1f(uCols, cols);
      gl.uniform1f(uDistort, distort);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    draw(performance.now()); // reduced-motion → single static frame

    return {
      el: host,
      _destroy: function () {
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        var ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }

  /**
   * Initialise every [data-aurora-bg] element. Each is started lazily via
   * IntersectionObserver (unless data-aurora-eager), so off-screen instances
   * never spin up a WebGL context.
   * @param {string} [selector]
   * @returns {Array} controllers with { el, _destroy }
   */
  function initAuroraBg(selector) {
    var hosts = Array.prototype.slice.call(
      document.querySelectorAll(selector || "[data-aurora-bg]")
    );
    var out = [];

    hosts.forEach(function (host) {
      var eager = flag(host.getAttribute("data-aurora-eager"));
      if (eager || typeof IntersectionObserver === "undefined") {
        var c = startOne(host);
        if (c) out.push(c);
        return;
      }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            io.disconnect();
            var ctrl = startOne(host);
            if (ctrl) out.push(ctrl);
          }
        });
      }, { rootMargin: "200px" });
      io.observe(host);
    });

    return out;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initAuroraBg = initAuroraBg;

})(typeof window !== "undefined" ? window : this);
