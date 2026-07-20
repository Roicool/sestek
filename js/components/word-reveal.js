/*!
 * word-reveal.js v1.0.0
 * Scroll-triggered, word-by-word heading reveal — each word sits clipped
 * behind its own mask and slides up into view as the heading scrolls into
 * the viewport, one word landing after another (words emerging "out of a
 * shape" rather than just fading in).
 *
 * Requires : gsap (+ ScrollTrigger registered — falls back to
 *            IntersectionObserver if it isn't)
 * CSS      : css/components/word-reveal.css
 *
 * DOM (Webflow) — add the attribute to any heading/paragraph:
 *   <h2 data-word-reveal>Sestek ile büyümenin yeni yolu</h2>
 *
 * Attributes:
 *   data-word-reveal           mark an element for the reveal (required)
 *   data-word-reveal-stagger   seconds between words   (default 0.06)
 *   data-word-reveal-duration  seconds per word         (default 0.7)
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function wrapWord(word) {
    var mask = global.document.createElement("span");
    mask.className = "word-reveal__mask";
    var inner = global.document.createElement("span");
    inner.className = "word-reveal__inner";
    inner.textContent = word;
    mask.appendChild(inner);
    return { mask: mask, inner: inner };
  }

  // Walks the heading's existing DOM (text nodes + any inline elements such
  // as a styled <span> sub-line) and rebuilds it word-by-word, keeping every
  // element wrapper, attribute, and class exactly where it was.
  function splitNode(node, inners) {
    if (node.nodeType === 3) {
      var frag = global.document.createDocumentFragment();
      var tokens = node.textContent.split(/(\s+)/);
      tokens.forEach(function (token) {
        if (!token) return;
        if (/^\s+$/.test(token)) {
          frag.appendChild(global.document.createTextNode(token));
        } else {
          var wrapped = wrapWord(token);
          frag.appendChild(wrapped.mask);
          inners.push(wrapped.inner);
        }
      });
      return frag;
    }

    if (node.nodeType === 1) {
      var clone = node.cloneNode(false);
      Array.prototype.forEach.call(node.childNodes, function (child) {
        clone.appendChild(splitNode(child, inners));
      });
      return clone;
    }

    return node.cloneNode(true);
  }

  function splitWords(el) {
    var inners = [];
    var frag = global.document.createDocumentFragment();
    Array.prototype.forEach.call(el.childNodes, function (child) {
      frag.appendChild(splitNode(child, inners));
    });
    el.textContent = "";
    el.appendChild(frag);
    return inners;
  }

  function setup(el) {
    if (el._wordRevealInit) return;
    el._wordRevealInit = true;

    var stagger  = parseFloat(el.getAttribute("data-word-reveal-stagger"))  || 0.06;
    var duration = parseFloat(el.getAttribute("data-word-reveal-duration")) || 0.7;
    var words = splitWords(el);
    if (!words.length) return;

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof gsap === "undefined") {
      if (typeof gsap !== "undefined") gsap.set(words, { yPercent: 0 });
      return;
    }

    gsap.set(words, { yPercent: 110 });

    function play() {
      gsap.to(words, {
        yPercent: 0,
        duration: duration,
        ease    : "power3.out",
        stagger : stagger,
      });
    }

    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: el,
        start  : "top 85%",
        once   : true,
        onEnter: play,
      });
    } else if ("IntersectionObserver" in global) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          play();
          io.disconnect();
        });
      }, { rootMargin: "0px 0px -10% 0px", threshold: 0.15 });
      io.observe(el);
    } else {
      play();
    }
  }

  /**
   * Initialises every [data-word-reveal] element on the page.
   * @param {string} [selector="[data-word-reveal]"]
   */
  function initWordReveal(selector) {
    var els = global.document.querySelectorAll(selector || "[data-word-reveal]");
    Array.prototype.forEach.call(els, setup);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initWordReveal = initWordReveal;

})(typeof window !== "undefined" ? window : this);
