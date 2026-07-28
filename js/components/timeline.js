/*!
 * timeline.js v1.1.0
 * v1.1.0: the images drift. Each media in an item slides against its
 *         neighbours as the panel crosses the screen — they start apart, meet
 *         as the panel reaches centre, and part again on the way out. Scrubbed
 *         off the same containerAnimation as everything else, so it is the
 *         horizontal travel doing the work, not a second scroll listener.
 *         data-tl-drift sets the distance.
 * Horizontal story timeline: the section pins and vertical scroll drives a
 * track of year panels sideways past a thin line. Each year's dot pops as it
 * reaches the middle of the screen and its copy reveals word by word, so the
 * story reads as you travel along it rather than arriving all at once.
 *
 * Built on ScrollTrigger's containerAnimation, which is what makes the reveals
 * honest: each item is triggered by its HORIZONTAL position inside the moving
 * track, not by a rect check on every scroll frame. The scroll distance is
 * derived from the track's real width, so adding a year lengthens the section
 * on its own — nothing to keep in sync by hand.
 *
 * CMS-ready: the items row can be a Webflow Collection List (one year per
 * collection item). Nothing in the script assumes static markup.
 *
 * Requires : gsap + ScrollTrigger (registered here), Sestek.util
 *            (js/core/utils.js) loaded first. No SplitText — words are split
 *            in place with a few lines, so the plugin isn't a dependency.
 * CSS      : css/components/timeline.css
 *
 * DOM contract (Webflow — attributes matter, design is yours):
 *   [data-timeline]                  root — THIS pins
 *     [data-tl-track]                the row that slides sideways
 *       [data-tl-intro]              optional first panel (section title)
 *       [data-tl-line]               optional thin line running behind the items
 *       [data-tl-items]              the items row (Collection List is fine)
 *         [data-tl-item]             one year panel
 *           [data-tl-dot]            the dot that pops on the line
 *           [data-tl-year]           the big year number
 *           [data-tl-reveal]         any block whose words reveal in sequence
 *                                    (title, subtitle, description — as many
 *                                    as you like)
 *           [data-tl-medias]         optional image collage wrapper; JS writes
 *                                    data-tl-len="N" on it so the CSS can lay
 *                                    each count out differently
 *             [data-tl-media]        one image
 *
 * Root attributes (all optional):
 *   data-tl-speed      scroll distance multiplier — 1 means the section takes
 *                      exactly as much scroll as the track is wide (default 1)
 *   data-tl-scrub      scrub lag in seconds                    (default 1)
 *   data-tl-start      reveal trigger point, ScrollTrigger syntax measured
 *                      horizontally                          (default "left 75%")
 *   data-tl-stagger    seconds between words                  (default 0.03)
 *   data-tl-duration   word reveal duration, seconds          (default 0.6)
 *   data-tl-rise       px each word rises from                (default 14)
 *   data-tl-drift      px the images slide toward each other as the panel
 *                      crosses the screen, 0 = off            (default 60)
 *   data-tl-priority   refreshPriority for the pin — set against the page's
 *                      other pinned sections (PROJECT.md)     (default 1)
 *   data-tl-bp         breakpoint px; below it the timeline unrolls into a
 *                      plain vertical list, no pin            (default 1025)
 *
 * ⚠ PIN RULE: no ANCESTOR of [data-timeline] may have transform / filter /
 * perspective / will-change:transform — the pin uses position:fixed and would
 * anchor to that ancestor instead. (See PROJECT.md.)
 *
 * Accessibility: splitting wraps words in spans without changing the text, so
 * screen readers still read whole sentences. Below data-tl-bp the section is a
 * normal vertical list and each item reveals on its own as you scroll to it.
 * prefers-reduced-motion: no pin, no word stagger — everything renders in place.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULTS = {
    speed: 1,
    scrub: 1,
    start: "left 75%",
    stagger: 0.03,
    duration: 0.6,
    rise: 14,
    drift: 60,
    priority: 1,
    bp: 1025,
  };

  // Wrap every word of a text node in its own span, leaving the sentence — and
  // therefore the screen-reader output — exactly as it was.
  function splitWords(block) {
    if (block._tlSplit) return block._tlSplit;
    var words = [];
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) if (n.nodeValue.trim()) nodes.push(n);

    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        var span = document.createElement("span");
        span.setAttribute("data-tl-word", "");
        span.textContent = part;
        frag.appendChild(span);
        words.push(span);
      });
      node.parentNode.replaceChild(frag, node);
    });
    block._tlSplit = words;
    return words;
  }

  function buildOne(root) {
    if (root._timelineInit) return;                           // idempotent
    root._timelineInit = true;

    var util = global.Sestek.util;
    var attrNum = util.attrNum;
    var toArray = gsap.utils.toArray;

    var track = root.querySelector("[data-tl-track]");
    var items = toArray(root.querySelectorAll("[data-tl-item]"));
    if (!track || !items.length) {
      console.warn("[Sestek Timeline] Need [data-tl-track] and at least one [data-tl-item].");
      return;
    }

    var SPEED    = attrNum(root, "data-tl-speed", DEFAULTS.speed);
    var SCRUB    = attrNum(root, "data-tl-scrub", DEFAULTS.scrub);
    var STAGGER  = attrNum(root, "data-tl-stagger", DEFAULTS.stagger);
    var DUR      = attrNum(root, "data-tl-duration", DEFAULTS.duration);
    var RISE     = attrNum(root, "data-tl-rise", DEFAULTS.rise);
    var DRIFT    = attrNum(root, "data-tl-drift", DEFAULTS.drift);
    var PRIORITY = attrNum(root, "data-tl-priority", DEFAULTS.priority);
    var BP       = attrNum(root, "data-tl-bp", DEFAULTS.bp);
    var START    = root.getAttribute("data-tl-start") || DEFAULTS.start;

    var reduce = util.prefersReducedMotion();

    // Tell the CSS how many images each collage holds, so it can lay 2 out
    // differently from 5 without the author writing a class per count.
    toArray(root.querySelectorAll("[data-tl-medias]")).forEach(function (m) {
      m.setAttribute("data-tl-len", m.querySelectorAll("[data-tl-media]").length);
    });

    // Per item: its dot and every word of its reveal blocks.
    var parts = items.map(function (item) {
      var words = [];
      toArray(item.querySelectorAll("[data-tl-reveal]")).forEach(function (block) {
        words = words.concat(splitWords(block));
      });
      return {
        item: item,
        dot: item.querySelector("[data-tl-dot]"),
        words: words,
        medias: toArray(item.querySelectorAll("[data-tl-media]")),
      };
    });

    function showAll() {
      parts.forEach(function (p) {
        if (p.dot) gsap.set(p.dot, { scale: 1, autoAlpha: 1 });
        gsap.set(p.words, { y: 0, autoAlpha: 1 });
      });
    }

    // Reduced motion: the whole story is simply there.
    if (reduce) { showAll(); return; }

    var mm = gsap.matchMedia();

    // ── Desktop: pinned horizontal travel ───────────────────────────────────
    mm.add("(min-width: " + BP + "px)", function () {
      var triggers = [];

      gsap.set(parts.map(function (p) { return p.dot; }).filter(Boolean), { scale: 0 });
      parts.forEach(function (p) { gsap.set(p.words, { y: RISE, autoAlpha: 0 }); });

      // The track travels exactly its own overflow, so the section's scroll
      // length always matches its content.
      function shift() { return Math.max(0, track.scrollWidth - root.offsetWidth); }

      var travel = gsap.to(track, {
        x: function () { return -shift(); },
        ease: "none",
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: function () { return "+=" + shift() * SPEED; },
          scrub: SCRUB,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: PRIORITY,
        },
      });
      triggers.push(travel.scrollTrigger);

      // Each item is triggered by where it sits INSIDE the moving track —
      // that is what containerAnimation buys us over per-frame rect checks.
      parts.forEach(function (p) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: p.item,
            containerAnimation: travel,
            start: START,
            toggleActions: "play none none reverse",
          },
        });
        if (p.dot) tl.to(p.dot, { scale: 1, duration: 0.5, ease: "back.out(2)" }, 0);
        if (p.words.length) {
          tl.to(p.words, {
            y: 0, autoAlpha: 1,
            duration: DUR, ease: "power2.out", stagger: STAGGER,
          }, 0.1);
        }
        triggers.push(tl.scrollTrigger);

        // The images drift against each other across the panel's whole pass:
        // apart on the way in, together at centre, apart again on the way out.
        // Odd and even medias travel opposite ways, so two of them read as
        // closing in on one another.
        if (DRIFT && p.medias.length > 1) {
          p.medias.forEach(function (m, i) {
            var dir = i % 2 ? -1 : 1;
            var d = DRIFT * (1 - i * 0.15);               // rear images move less
            var drift = gsap.fromTo(m,
              { x: dir * d, y: dir * d * 0.35 },
              {
                x: -dir * d, y: -dir * d * 0.35,
                ease: "none",
                scrollTrigger: {
                  trigger: p.item,
                  containerAnimation: travel,
                  start: "left right",                   // panel enters the stage
                  end: "right left",                     // panel leaves it
                  scrub: true,
                },
              });
            triggers.push(drift.scrollTrigger);
          });
        }
      });

      return function () {
        triggers.forEach(function (t) { if (t) t.kill(); });
        gsap.killTweensOf(track);
        gsap.set(track, { clearProps: "transform" });
        parts.forEach(function (p) { gsap.set(p.medias, { clearProps: "transform" }); });
        showAll();
      };
    });

    // ── Below the breakpoint: a plain vertical list, each item reveals ──────
    mm.add("(max-width: " + (BP - 1) + "px)", function () {
      var triggers = [];
      gsap.set(parts.map(function (p) { return p.dot; }).filter(Boolean), { scale: 0 });
      parts.forEach(function (p) { gsap.set(p.words, { y: RISE, autoAlpha: 0 }); });

      parts.forEach(function (p) {
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: p.item,
            start: "top 80%",
            toggleActions: "play none none reverse",
            refreshPriority: -1,
          },
        });
        if (p.dot) tl.to(p.dot, { scale: 1, duration: 0.5, ease: "back.out(2)" }, 0);
        if (p.words.length) {
          tl.to(p.words, {
            y: 0, autoAlpha: 1,
            duration: DUR, ease: "power2.out", stagger: STAGGER,
          }, 0.1);
        }
        triggers.push(tl.scrollTrigger);
      });

      return function () {
        triggers.forEach(function (t) { if (t) t.kill(); });
        showAll();
      };
    });

    root._timelineMM = mm;
  }

  /**
   * Initialise every [data-timeline] section on the page in one call.
   * @param {string} [selector="[data-timeline]"] narrow the scope if needed
   */
  function initTimeline(selector) {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      var waited = 0;
      var poll = setInterval(function () {
        if (typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined") {
          clearInterval(poll);
          initTimeline(selector);
        } else if ((waited += 100) >= 4000) {
          clearInterval(poll);
          console.error("[Sestek Timeline] gsap + ScrollTrigger required — " +
            "load gsap.min.js AND ScrollTrigger.min.js before this script.");
        }
      }, 100);
      return;
    }
    if (!(global.Sestek && global.Sestek.util)) {
      console.error("[Sestek Timeline] Sestek.util (js/core/utils.js) required."); return;
    }
    gsap.registerPlugin(ScrollTrigger);

    // Arm the CSS: the horizontal layout only applies once the script is
    // running, so a no-JS page reads as a normal vertical list.
    document.documentElement.classList.add("tl-armed");

    var roots = document.querySelectorAll(selector || "[data-timeline]");
    if (!roots.length) { console.warn("[Sestek Timeline] No [data-timeline] found."); return; }
    Array.prototype.forEach.call(roots, buildOne);

    if (document.readyState === "complete") {
      ScrollTrigger.refresh();
    } else {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); }, { once: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initTimeline = initTimeline;

})(typeof window !== "undefined" ? window : this);
