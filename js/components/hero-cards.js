/*!
 * hero-cards.js v1.0.0
 * Amplemarket-style floating stat cards: a handful of cards sit scattered
 * around a hero heading, and every few seconds some of them shrink away,
 * pick up a different stat, drift to another position and grow back at a new
 * size. Depth of field is the trick that sells it — a card's blur is DERIVED
 * from how far its scale is from 1, so cards that are bigger or smaller than
 * "true size" read as nearer or further away. The cards also drift with the
 * pointer (parallax), weighted by how in-focus each one is.
 *
 * CMS-first: the stat pool is a Webflow COLLECTION LIST. Each collection item
 * is one stat's content (number, label, logo); the visible cards are a few
 * static shells you style and position in Designer. The script only moves
 * content from the pool into the shells — so adding a stat is a CMS entry,
 * not a code change.
 *
 * Ported from a WAAPI original to GSAP. Two things got simpler on the way:
 *   • Blur is computed per frame from the live scale instead of being
 *     key-framed, so the "dip to 0 blur while passing scale 1" happens for
 *     free (the original needed a 3-keyframe midpoint hack for it).
 *   • Parallax rides GSAP's transform cache (x/y) alongside the scale tween,
 *     so it no longer needs the separate CSS `translate` property.
 *
 * Requires : gsap. Sestek.util (js/core/utils.js) loaded first.
 *            Swiper 11 (swiper-bundle) OPTIONAL for the mobile carousel —
 *            without it the cards fall back to a plain stack.
 * CSS      : css/components/hero-cards.css
 *
 * DOM contract (Webflow — attributes matter, design is yours):
 *   [data-hero-cards]                 root / stage (position:relative)
 *     [data-hc-pool]                  Collection List — the stat pool.
 *                                     Visually hidden once armed, still in
 *                                     the DOM for SEO + screen readers.
 *       [data-hc-item]                one Collection Item = one stat's content
 *     [data-hc-slot]                  one visible card shell (N of them, 5 is
 *                                     the usual). Position it and colour it in
 *                                     Designer — the script reads whatever
 *                                     inset you set and shuffles those spots
 *                                     between the cards.
 *       [data-hc-content]             optional inner target the content lands
 *                                     in (defaults to the slot itself)
 *
 * Root attributes (all optional):
 *   data-hc-round      ms between rounds                    (default 4000)
 *   data-hc-change     how many cards swap per round        (default 3)
 *   data-hc-stagger    ms between each card in a round      (default 100)
 *   data-hc-down       shrink-away duration, seconds        (default 0.35)
 *   data-hc-up         grow-back duration, seconds          (default 0.35)
 *   data-hc-min        smallest respawn scale               (default 0.3)
 *   data-hc-max        largest respawn scale                (default 1)
 *   data-hc-ones       cards kept at exactly scale 1        (default 2)
 *   data-hc-blur       blur px per 1.0 of scale distance    (default 20)
 *   data-hc-max-blur   blur ceiling in px                   (default 60)
 *   data-hc-jitter     random position offset in px         (default 25)
 *   data-hc-parallax   max pointer drift in px, 0 = off     (default 40)
 *   data-hc-bp         mobile breakpoint px                 (default 768)
 *   data-hc-spv        mobile slides per view               (default 1.6)
 *
 * Below data-hc-bp the scattered layout gives way to a swipeable carousel
 * built from the whole pool, with the neighbours scaled down and blurred.
 *
 * Accessibility: the pool stays readable to screen readers and the shells are
 * marked aria-hidden (they are a decorative echo of it). Rounds pause while
 * the section is off-screen and while the tab is hidden.
 * prefers-reduced-motion: no rounds, no parallax — the cards render once at
 * full size with their first stats.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    round: 4000,
    change: 3,
    stagger: 100,
    down: 0.35,
    up: 0.35,
    min: 0.3,
    max: 1,
    ones: 2,
    blur: 20,
    maxBlur: 60,
    jitter: 25,
    parallax: 40,
    parallaxEase: 0.025,
    bp: 768,
    spv: 1.6,
  };

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // ── Inset helpers — the author's positions are read straight off the
  // Designer classes, so any layout works and the script never invents one.
  function readInset(el) {
    var cs = getComputedStyle(el);
    var inset = (cs.inset || "").trim();
    if (inset && inset !== "auto") return inset;
    return [cs.top || "auto", cs.right || "auto",
            cs.bottom || "auto", cs.left || "auto"].join(" ");
  }
  function parseInset(str) {
    var p = str.trim().split(/\s+/);
    if (p.length === 1) return [p[0], p[0], p[0], p[0]];
    if (p.length === 2) return [p[0], p[1], p[0], p[1]];
    if (p.length === 3) return [p[0], p[1], p[2], p[1]];
    return [p[0], p[1], p[2], p[3]];
  }
  function addPx(value, px) {
    if (!value || value.toLowerCase() === "auto" || !px) return value;
    return "calc(" + value + " " + (px >= 0 ? "+" : "-") + " " + Math.abs(px) + "px)";
  }
  function jitterInset(base, dx, dy) {
    var v = parseInset(base);
    return [addPx(v[0], dy), addPx(v[1], -dx), addPx(v[2], -dy), addPx(v[3], dx)].join(" ");
  }

  function buildOne(root) {
    if (root._heroCardsInit) return;                          // idempotent
    root._heroCardsInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var slots = toArray(root.querySelectorAll("[data-hc-slot]"));
    var poolItems = toArray(root.querySelectorAll("[data-hc-item]"));
    if (!slots.length || !poolItems.length) {
      console.warn("[Sestek HeroCards] Need [data-hc-slot] shells and a [data-hc-item] pool.");
      return;
    }

    var ROUND    = attrNum(root, "data-hc-round", DEFAULTS.round);
    var CHANGE   = attrNum(root, "data-hc-change", DEFAULTS.change);
    var STAGGER  = attrNum(root, "data-hc-stagger", DEFAULTS.stagger);
    var DOWN     = attrNum(root, "data-hc-down", DEFAULTS.down);
    var UP       = attrNum(root, "data-hc-up", DEFAULTS.up);
    var MIN      = attrNum(root, "data-hc-min", DEFAULTS.min);
    var MAX      = attrNum(root, "data-hc-max", DEFAULTS.max);
    var ONES     = attrNum(root, "data-hc-ones", DEFAULTS.ones);
    var BLUR     = attrNum(root, "data-hc-blur", DEFAULTS.blur);
    var MAX_BLUR = attrNum(root, "data-hc-max-blur", DEFAULTS.maxBlur);
    var JITTER   = attrNum(root, "data-hc-jitter", DEFAULTS.jitter);
    var PARALLAX = attrNum(root, "data-hc-parallax", DEFAULTS.parallax);
    var BP       = attrNum(root, "data-hc-bp", DEFAULTS.bp);
    var SPV      = attrNum(root, "data-hc-spv", DEFAULTS.spv);

    var reduce = util.prefersReducedMotion();
    var targets = slots.map(function (s) {
      return s.querySelector("[data-hc-content]") || s;
    });

    slots.forEach(function (s) { s.setAttribute("aria-hidden", "true"); });

    // ── Content pool ────────────────────────────────────────────────────────
    function renderInto(target, poolIdx) {
      var frag = document.createDocumentFragment();
      var kids = poolItems[poolIdx].childNodes;
      for (var i = 0; i < kids.length; i++) frag.appendChild(kids[i].cloneNode(true));
      target.replaceChildren(frag);
    }

    var visible = shuffle(poolItems.map(function (_, i) { return i; })).slice(0, slots.length);
    visible.forEach(function (poolIdx, slotIdx) { renderInto(targets[slotIdx], poolIdx); });

    // Pick stats that aren't on screen; fall back to any that isn't this
    // card's own so a small pool still rotates instead of freezing.
    function pickNext(slotList) {
      var next = [];
      var used = {};
      var hidden = shuffle(poolItems.map(function (_, i) { return i; })
        .filter(function (i) { return visible.indexOf(i) === -1; }));
      slotList.forEach(function (slotIdx) {
        var chosen = hidden.pop();
        if (chosen == null) {
          var cands = poolItems.map(function (_, i) { return i; })
            .filter(function (i) { return i !== visible[slotIdx] && !used[i]; });
          chosen = cands[Math.floor(Math.random() * cands.length)];
        }
        used[chosen] = true;
        next.push(chosen);
      });
      return next;
    }

    // ── Depth of field: blur follows the distance of scale from 1 ───────────
    function blurFor(scale) {
      return Math.min(MAX_BLUR, Math.abs(1 - scale) * BLUR);
    }
    function paint(el, scale) {
      el.style.filter = "blur(" + blurFor(scale).toFixed(2) + "px)";
    }
    function setCard(el, scale) {
      gsap.set(el, { scale: scale, autoAlpha: scale <= 0.001 ? 0 : 1 });
      paint(el, scale);
    }
    // One tween per card; blur is recomputed every frame from the live scale,
    // so passing through scale 1 naturally snaps into focus.
    function tweenCard(el, toScale, dur, ease) {
      return gsap.to(el, {
        scale: toScale,
        autoAlpha: toScale <= 0.001 ? 0 : 1,
        duration: dur,
        ease: ease,
        overwrite: "auto",
        onUpdate: function () { paint(el, gsap.getProperty(el, "scale")); },
        onComplete: function () { paint(el, toScale); },
      });
    }

    // ── Position presets ────────────────────────────────────────────────────
    var presets = slots.map(readInset);
    var currentPos = slots.map(function (_, i) { return i; });

    function applyPreset(slotIdx, presetIdx, withJitter) {
      var base = presets[presetIdx];
      if (!withJitter || !JITTER) { slots[slotIdx].style.inset = base; return; }
      slots[slotIdx].style.inset = jitterInset(base,
        Math.round(rand(-JITTER, JITTER)), Math.round(rand(-JITTER, JITTER)));
    }

    // Shuffle the chosen cards' spots so none of them stays put.
    function reassign(prev, slotList) {
      var next = prev.slice();
      var olds = slotList.map(function (i) { return prev[i]; });
      var perm = olds.slice(), ok = false;
      for (var a = 0; a < 30 && !ok; a++) {
        perm = shuffle(olds.slice());
        ok = perm.every(function (p, i) { return p !== olds[i]; });
      }
      if (!ok && olds.length > 1) perm = olds.slice(1).concat(olds[0]);
      slotList.forEach(function (slotIdx, i) { next[slotIdx] = perm[i]; });
      return next;
    }

    // Keep a couple of cards at exactly 1 so the group always has an anchor.
    function pickScales(slotList) {
      var changing = {};
      slotList.forEach(function (i) { changing[i] = true; });
      var staticOnes = 0;
      slots.forEach(function (el, i) {
        if (!changing[i] && Math.abs((gsap.getProperty(el, "scale") || 1) - 1) < 1e-6) staticOnes++;
      });
      var need = clamp(ONES - staticOnes, 0, slotList.length);
      var onesFor = {};
      shuffle(slotList.slice()).slice(0, need).forEach(function (i) { onesFor[i] = true; });

      var out = {};
      var EPS = 0.02;
      slotList.forEach(function (slotIdx) {
        if (onesFor[slotIdx]) { out[slotIdx] = 1; return; }
        var s = rand(MIN, MAX);
        if (Math.abs(s - 1) < EPS) s = s < 1 ? 1 - EPS : 1 + EPS;
        out[slotIdx] = Number(s.toFixed(3));
      });
      return out;
    }

    // ── Playback gating ─────────────────────────────────────────────────────
    var inView = true, hidden = false, running = false;
    var loopCall = null;

    function canRun() { return !reduce && inView && !hidden && !isMobile(); }

    function isMobile() {
      return window.matchMedia("(max-width: " + (BP - 1) + "px)").matches;
    }

    // ── One round ───────────────────────────────────────────────────────────
    function round() {
      var order = shuffle(slots.map(function (_, i) { return i; })).slice(0, Math.min(CHANGE, slots.length));
      var nextPool = pickNext(order);
      var nextPos = reassign(currentPos, order);
      var scales = pickScales(order);

      order.forEach(function (slotIdx, i) {
        var el = slots[slotIdx];
        gsap.delayedCall(i * STAGGER / 1000, function () {
          tweenCard(el, 0, DOWN, "power2.in").eventCallback("onComplete", function () {
            paint(el, 0);
            visible[slotIdx] = nextPool[i];
            renderInto(targets[slotIdx], nextPool[i]);
            applyPreset(slotIdx, nextPos[slotIdx], true);
            tweenCard(el, scales[slotIdx], UP, "power2.out");
          });
        });
      });
      currentPos = nextPos;
    }

    function schedule() {
      if (loopCall) { loopCall.kill(); loopCall = null; }
      if (!canRun()) { running = false; return; }
      running = true;
      loopCall = gsap.delayedCall(ROUND / 1000, function () { round(); schedule(); });
    }

    // ── Parallax — rides GSAP's x/y, so it composes with the scale tween ────
    function initParallax() {
      if (!PARALLAX || reduce) return;
      var depth = slots.map(function () { return rand(0.85, 1.15); });
      var setX = slots.map(function (el) { return gsap.quickSetter(el, "x", "px"); });
      var setY = slots.map(function (el) { return gsap.quickSetter(el, "y", "px"); });
      var tx = 0, ty = 0, cx = 0, cy = 0;

      root.addEventListener("pointermove", function (e) {
        if (e.pointerType && e.pointerType !== "mouse") return;
        if (isMobile()) return;
        var b = root.getBoundingClientRect();
        if (!b.width || !b.height) return;
        tx = clamp(((e.clientX - b.left) / b.width - 0.5) * 2, -1, 1);
        ty = clamp(((e.clientY - b.top) / b.height - 0.5) * 2, -1, 1);
      }, { passive: true });
      root.addEventListener("pointerleave", function () { tx = 0; ty = 0; });

      gsap.ticker.add(function () {
        if (!inView || hidden || isMobile()) return;
        cx += (tx - cx) * DEFAULTS.parallaxEase;
        cy += (ty - cy) * DEFAULTS.parallaxEase;
        for (var i = 0; i < slots.length; i++) {
          // In-focus cards travel further — blurred ones sit back in the depth.
          var s = clamp(gsap.getProperty(slots[i], "scale") || 1, 0, 20);
          var focus = clamp(1 - blurFor(s) / MAX_BLUR, 0, 1);
          var f = s * focus * depth[i];
          setX[i](cx * PARALLAX * f);
          setY[i](cy * PARALLAX * f);
        }
      });
    }

    // ── Mobile carousel — the whole pool becomes swipeable cards ────────────
    var mobileHost = null, swiper = null;

    function mobileSetup() {
      if (mobileHost) return;
      mobileHost = document.createElement("div");
      mobileHost.setAttribute("data-hc-mobile", "");
      var el = document.createElement("div");
      el.className = "swiper";
      var wrap = document.createElement("div");
      wrap.className = "swiper-wrapper";

      poolItems.forEach(function (item, i) {
        var slide = document.createElement("div");
        slide.className = "swiper-slide";
        // Clone a shell so the card keeps its Designer look; colours cycle
        // through the shells you authored.
        var card = slots[i % slots.length].cloneNode(false);
        card.removeAttribute("data-hc-slot");
        card.setAttribute("data-hc-card", "");
        card.removeAttribute("aria-hidden");
        card.style.cssText = "position:relative;inset:auto;transform:none;filter:none;opacity:1;";
        var frag = document.createDocumentFragment();
        var kids = item.childNodes;
        for (var k = 0; k < kids.length; k++) frag.appendChild(kids[k].cloneNode(true));
        card.appendChild(frag);
        slide.appendChild(card);
        wrap.appendChild(slide);
      });

      el.appendChild(wrap);
      mobileHost.appendChild(el);
      root.appendChild(mobileHost);

      if (typeof Swiper !== "undefined") {
        swiper = new Swiper(el, {
          slidesPerView: SPV,
          centeredSlides: true,
          spaceBetween: 12,
          loop: poolItems.length > 2,
          grabCursor: true,
          keyboard: { enabled: true, onlyInViewport: true },
          speed: reduce ? 0 : 500,
          autoplay: reduce ? false : { delay: ROUND, disableOnInteraction: false },
        });
      } else {
        console.warn("[Sestek HeroCards] Swiper not found — static card stack on mobile.");
        el.classList.add("is-fallback");
      }
    }

    function mobileTeardown() {
      if (swiper) { swiper.destroy(true, true); swiper = null; }
      if (mobileHost) { mobileHost.remove(); mobileHost = null; }
    }

    // ── Mode switching ──────────────────────────────────────────────────────
    var mm = gsap.matchMedia();
    mm.add("(min-width: " + BP + "px)", function () {
      slots.forEach(function (el, i) {
        el.style.inset = presets[i];
        setCard(el, 1);
      });
      schedule();
      return function () {
        if (loopCall) { loopCall.kill(); loopCall = null; }
        gsap.killTweensOf(slots);
      };
    });
    mm.add("(max-width: " + (BP - 1) + "px)", function () {
      mobileSetup();
      return function () { mobileTeardown(); };
    });

    // ── Pause when out of sight ─────────────────────────────────────────────
    if (typeof IntersectionObserver !== "undefined") {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView && !running) schedule();
        else if (!inView && loopCall) { loopCall.kill(); loopCall = null; running = false; }
      }, { threshold: 0.01 }).observe(root);
    }
    document.addEventListener("visibilitychange", function () {
      hidden = document.hidden;
      if (!hidden && !running) schedule();
      else if (hidden && loopCall) { loopCall.kill(); loopCall = null; running = false; }
    });

    initParallax();

    root._heroCards = {
      el: root,
      _destroy: function () {
        if (loopCall) loopCall.kill();
        gsap.killTweensOf(slots);
        mm.revert();
      },
    };
  }

  /**
   * Initialise every [data-hero-cards] stage on the page in one call.
   * @param {string} [selector="[data-hero-cards]"] narrow the scope if needed
   */
  function initHeroCards(selector) {
    if (typeof gsap === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined") { clearInterval(poll); initHeroCards(selector); }
        else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek HeroCards] gsap required — load gsap.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek HeroCards] Sestek.util (js/core/utils.js) required."); return;
    }

    // Arm the CSS: the pool is only hidden once the script is running, so a
    // no-JS page still shows the stats as plain content.
    document.documentElement.classList.add("hcards-armed");

    var roots = document.querySelectorAll(selector || "[data-hero-cards]");
    if (!roots.length) { console.warn("[Sestek HeroCards] No [data-hero-cards] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initHeroCards = initHeroCards;

})(typeof window !== "undefined" ? window : this);
