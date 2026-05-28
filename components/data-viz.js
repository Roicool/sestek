/*!
 * data-viz.js — Sestek
 * v1.0.0 — 2026-05-28
 *
 * Three.js floating node-network visualization — Stripe-style.
 * Requires: three.js ^0.160+
 *
 * Usage:
 *   Sestek.initDataViz()                        // auto-targets [data-viz]
 *   Sestek.initDataViz({ container: '#my-el' }) // specific element
 *
 * Options:
 *   container  {string|Element}  selector or DOM element  (default: '[data-viz]')
 *   nodeCount  {number}          total nodes              (default: 50)
 *   maxDist    {number}          connection threshold     (default: 3.2)
 *   spreadX    {number}          horizontal spread        (default: 10)
 *   spreadY    {number}          vertical spread          (default: 3.5)
 *   spreadZ    {number}          depth spread             (default: 5)
 *   bgColor    {number}          0x hex background        (default: 0x04040a)
 *   palette    {string[]}        hex color array          (default: white-dominant)
 *
 * Changelog:
 *   v1.0.0 — Initial release
 */

(function (global) {
  'use strict';

  var Sestek = global.Sestek || (global.Sestek = {});

  /* ---- glow texture: radial gradient baked to CanvasTexture ---- */
  function makeGlowTexture(hex, T) {
    var sz  = 128;
    var cv  = document.createElement('canvas');
    cv.width = cv.height = sz;
    var ctx = cv.getContext('2d');
    var r   = parseInt(hex.slice(1, 3), 16);
    var g   = parseInt(hex.slice(3, 5), 16);
    var b   = parseInt(hex.slice(5, 7), 16);
    var grd = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
    grd.addColorStop(0,    'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    grd.addColorStop(0.25, 'rgba(' + r + ',' + g + ',' + b + ',0.30)');
    grd.addColorStop(0.60, 'rgba(' + r + ',' + g + ',' + b + ',0.06)');
    grd.addColorStop(1,    'rgba(' + r + ',' + g + ',' + b + ',0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, sz, sz);
    return new T.CanvasTexture(cv);
  }

  /* ---- main ---- */
  function initDataViz(opts) {
    opts = opts || {};

    var el = typeof opts.container === 'string'
      ? document.querySelector(opts.container)
      : (opts.container || document.querySelector('[data-viz]'));

    if (!el) return null;
    if (!global.THREE) { console.warn('[Sestek] data-viz: THREE not loaded'); return null; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    var T = global.THREE;

    /* config */
    var N       = opts.nodeCount || 50;
    var MAXD    = opts.maxDist   || 3.2;
    var SX      = opts.spreadX   || 10;
    var SY      = opts.spreadY   || 3.5;
    var SZ      = opts.spreadZ   || 5;
    var BG      = opts.bgColor   || 0x04040a;
    var PALETTE = opts.palette   || [
      '#ffffff', '#ffffff', '#ffffff', '#ffffff',
      '#dddddd', '#cccccc', '#aaaaaa',
      '#EC008C', '#00FFEB', '#E8FF51',
    ];

    /* scene */
    var scene = new T.Scene();
    scene.background = new T.Color(BG);
    scene.fog = new T.FogExp2(BG, 0.065);

    var W = el.clientWidth  || window.innerWidth;
    var H = el.clientHeight || 560;

    var camera = new T.PerspectiveCamera(55, W / H, 0.1, 80);
    camera.position.z = 10;

    var renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    el.appendChild(renderer.domElement);

    /* texture cache — one texture per unique color */
    var texCache = {};
    function getTex(hex) {
      if (!texCache[hex]) texCache[hex] = makeGlowTexture(hex, T);
      return texCache[hex];
    }

    /* nodes */
    var nodes = [];
    for (var i = 0; i < N; i++) {
      var radius = 0.025 + Math.random() * 0.085;
      var hex    = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      var col    = parseInt(hex.replace('#', ''), 16);

      var sphere = new T.Mesh(
        new T.SphereGeometry(radius, 8, 8),
        new T.MeshBasicMaterial({ color: col })
      );

      var sprite = new T.Sprite(
        new T.SpriteMaterial({
          map:         getTex(hex),
          blending:    T.AdditiveBlending,
          transparent: true,
          depthWrite:  false,
          opacity:     0.75,
        })
      );
      sprite.scale.setScalar(radius * 18);

      var base = new T.Vector3(
        (Math.random() - 0.5) * SX * 2,
        (Math.random() - 0.5) * SY * 2,
        (Math.random() - 0.5) * SZ * 2
      );
      sphere.position.copy(base);
      sprite.position.copy(base);
      scene.add(sphere, sprite);

      nodes.push({
        sphere: sphere,
        sprite: sprite,
        base:   base.clone(),
        spd:    0.14 + Math.random() * 0.28,
        phi:    Math.random() * Math.PI * 2,
      });
    }

    /* connections: find pairs within MAXD at rest positions */
    var pairs = [];
    for (var a = 0; a < N; a++) {
      for (var b = a + 1; b < N; b++) {
        var dist = nodes[a].base.distanceTo(nodes[b].base);
        if (dist < MAXD) pairs.push([a, b, dist]);
      }
    }

    var L    = pairs.length;
    var pArr = new Float32Array(L * 6);
    var cArr = new Float32Array(L * 6);

    pairs.forEach(function (p, idx) {
      var na = nodes[p[0]], nb = nodes[p[1]];
      var alpha = (1 - p[2] / MAXD) * 0.35;
      var ca  = new T.Color(na.sphere.material.color);
      var cb  = new T.Color(nb.sphere.material.color);
      var cm  = ca.lerp(cb, 0.5);
      var off = idx * 6;
      cArr[off]   = cm.r * alpha; cArr[off+1] = cm.g * alpha; cArr[off+2] = cm.b * alpha;
      cArr[off+3] = cm.r * alpha; cArr[off+4] = cm.g * alpha; cArr[off+5] = cm.b * alpha;
    });

    var lineGeo = new T.BufferGeometry();
    var posAttr = new T.BufferAttribute(pArr, 3);
    posAttr.setUsage(T.DynamicDrawUsage);
    lineGeo.setAttribute('position', posAttr);
    lineGeo.setAttribute('color', new T.BufferAttribute(cArr, 3));

    scene.add(new T.LineSegments(lineGeo, new T.LineBasicMaterial({
      vertexColors: true,
      blending:     T.AdditiveBlending,
      transparent:  true,
      depthWrite:   false,
    })));

    /* mouse parallax */
    var mx = 0, my = 0;
    function onMouse(e) {
      mx = (e.clientX / innerWidth  - 0.5) * 2;
      my = -(e.clientY / innerHeight - 0.5) * 2;
    }
    window.addEventListener('mousemove', onMouse);

    /* resize */
    function onResize() {
      W = el.clientWidth;
      H = el.clientHeight || 560;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    }
    window.addEventListener('resize', onResize);

    /* pause rendering when scrolled out of view */
    var visible = true;
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    });
    io.observe(el);

    /* render loop */
    var clock = new T.Clock();
    var raf;

    function tick() {
      raf = requestAnimationFrame(tick);
      if (!visible) return;

      var t = clock.getElapsedTime();

      nodes.forEach(function (n) {
        var px = n.base.x + Math.sin(t * n.spd + n.phi)              * 0.22;
        var py = n.base.y + Math.cos(t * n.spd * 0.65 + n.phi)       * 0.14;
        var pz = n.base.z + Math.sin(t * n.spd * 0.45 + n.phi + 1.4) * 0.18;
        n.sphere.position.set(px, py, pz);
        n.sprite.position.set(px, py, pz);
      });

      pairs.forEach(function (p, idx) {
        var pa  = nodes[p[0]].sphere.position;
        var pb  = nodes[p[1]].sphere.position;
        var off = idx * 6;
        pArr[off]   = pa.x; pArr[off+1] = pa.y; pArr[off+2] = pa.z;
        pArr[off+3] = pb.x; pArr[off+4] = pb.y; pArr[off+5] = pb.z;
      });
      posAttr.needsUpdate = true;

      /* camera: mouse parallax layered on top of slow auto-drift */
      var tx = mx * 2.5 + Math.sin(t * 0.07) * 0.9;
      var ty = my * 1.2 + Math.cos(t * 0.05) * 0.35;
      camera.position.x += (tx - camera.position.x) * 0.03;
      camera.position.y += (ty - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    tick();

    return {
      destroy: function () {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener('mousemove', onMouse);
        window.removeEventListener('resize', onResize);
        for (var key in texCache) {
          if (texCache.hasOwnProperty(key)) texCache[key].dispose();
        }
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      },
    };
  }

  Sestek.initDataViz = initDataViz;

})(window);
