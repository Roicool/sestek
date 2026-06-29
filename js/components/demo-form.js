/*!
 * demo-form.js v1.0.0
 * "Try Live Demo" section controller. Three independent, opt-in behaviours that
 * decorate a Webflow-built layout — the visual design (gradient panel, cards,
 * the <form> itself) stays in Designer; this script only wires the dynamics:
 *
 *   1. Industry switcher — the left column is an accordion (see accordion.js);
 *      whichever item is open drives the right panel's heading + description.
 *      Each [data-demo-form-item] carries the copy it should show on the right.
 *
 *   2. KVKK consent by geolocation — the KVKK checkbox block is hidden by
 *      default. On load we look up the visitor's country (client-side IP geo);
 *      when it matches the trigger country (default "TR") the block is revealed
 *      and its checkbox made `required`, so Webflow's native validation blocks
 *      submit until it's ticked. Other countries never see it and are never
 *      blocked. If the geo lookup fails we fall back to <html lang> ("tr").
 *
 *   3. Submit reveal — the form stays a NATIVE Webflow form (Webflow owns the
 *      submit + success message). We watch the success message for becoming
 *      visible and then FLIP-move the header Lottie into a placeholder inside
 *      the thank-you message — arcing across and GROWING to the placeholder's
 *      size — and smooth-scroll the message into view.
 *
 * Requires: nothing hard. GSAP (already loaded for the left accordion) powers
 * the Lottie arc; without it the Lottie just arrives instantly. The Flip plugin
 * is NOT needed — the travel is a manual FLIP so it can arc and grow to the
 * size you give. Smooth scroll prefers Sestek.scrollTo (Lenis), falling back
 * to native window.scrollTo.
 * CSS: css/components/demo-form.css
 *
 * DOM (Webflow):
 *   <section data-demo-form>
 *     <!-- LEFT: an accordion (accordion.js); each item also a demo-form item -->
 *     <div data-accordion>
 *       <div data-accordion-item data-demo-form-item
 *            data-demo-form-title="Banking Assistant"
 *            data-demo-form-text="Control the look and feel of your portal…">
 *         <button data-accordion-trigger>Banking Assistant</button>
 *         <div data-accordion-panel><div data-accordion-content>…</div></div>
 *       </div>
 *       <!-- more items… -->
 *     </div>
 *
 *     <!-- the header Lottie that will travel on submit -->
 *     <div data-demo-form-lottie> … (Webflow Lottie) … </div>
 *
 *     <!-- RIGHT: dynamic copy + the native Webflow form -->
 *     <h3 data-demo-form-heading>…</h3>
 *     <p  data-demo-form-body>…</p>
 *     <div class="w-form">
 *       <form> … Name, Phone …
 *         <label data-demo-form-kvkk>          <!-- hidden until TR -->
 *           <input type="checkbox"> KVKK metnini okudum, onaylıyorum.
 *         </label>
 *       </form>
 *       <div class="w-form-done" data-demo-form-done>
 *         Teşekkürler!
 *         <!-- size THIS placeholder in Designer → the Lottie grows to it -->
 *         <div data-demo-form-lottie-target style="width:180px;height:180px"></div>
 *       </div>
 *     </div>
 *   </section>
 *
 * Root attributes:
 *   data-demo-form-geo            geo endpoint returning a plain-text country
 *                                 code (default https://ipapi.co/country/)
 *   data-demo-form-country        country code that shows KVKK   (default "TR")
 *   data-demo-form-scroll-offset  px subtracted from the scroll target (default 80)
 *   data-demo-form-duration       Lottie arc seconds             (default 0.9)
 *
 * Lottie sizing (the size it reaches on arrival):
 *   By default the Lottie grows to the [data-demo-form-lottie-target] box — so
 *   just size that placeholder in Designer. To override, put on the Lottie:
 *   data-demo-form-lottie-w  / data-demo-form-lottie-h   target width/height px
 *
 * Item attributes ([data-demo-form-item]):
 *   data-demo-form-title          right-panel heading text for this industry
 *   data-demo-form-text           right-panel body text for this industry
 *   data-demo-form-active         start selected (else first item / open one)
 *
 * The KVKK control may be a checkbox or a single radio — both validate via
 * `required`. (A two-option "yes/no" radio group can't be forced to "yes" by
 * native validation, so prefer a single consent input.)
 *
 * IMPORTANT: do NOT set the KVKK input `required` in Designer — this script
 * manages it so English/other-country visitors are never blocked.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var doc = global.document;

  /** Truthy-ish attribute → boolean. Present-but-empty counts as true. */
  function flag(v) {
    return v !== undefined && v !== null && v !== "false" && v !== "0" && v !== "no";
  }

  /** Page language from <html lang> — "tr-TR" → "tr". */
  function pageLang() {
    var lang = doc.documentElement.lang || "";
    return lang.toLowerCase().split("-")[0];
  }

  /** Smooth-scroll a target element into view, Lenis-aware with native fallback. */
  function scrollToEl(el, offset) {
    var top = el.getBoundingClientRect().top + global.pageYOffset - offset;
    if (top < 0) top = 0;
    if (global.Sestek && typeof global.Sestek.scrollTo === "function" && global.lenisInstance) {
      global.Sestek.scrollTo(top, {
        duration: 0.9,
        easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      });
    } else {
      global.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  /**
   * Wire one [data-demo-form] section.
   * @param {HTMLElement} root
   */
  function wire(root) {
    if (root._demoFormInit) return;            // idempotent
    root._demoFormInit = true;

    var reduce  = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var offset  = parseFloat(root.getAttribute("data-demo-form-scroll-offset")) || 80;

    // ── 1. Industry switcher → right-panel copy ──────────────────
    var heading = root.querySelector("[data-demo-form-heading]");
    var body    = root.querySelector("[data-demo-form-body]");
    var items   = Array.prototype.slice.call(root.querySelectorAll("[data-demo-form-item]"));
    var active  = null;

    /** Fade a text node's content out → swap → in (instant if reduced motion). */
    function swap(el, txt) {
      if (!el || txt == null) return;
      if (reduce) { el.textContent = txt; return; }
      el.style.transition = "opacity 0.2s ease";
      el.style.opacity = "0";
      global.setTimeout(function () {
        el.textContent = txt;
        el.style.opacity = "1";
      }, 180);
    }

    /** Make `item` the selected industry — updates right copy + active marker. */
    function activate(item) {
      if (!item || item === active) return;
      active = item;
      items.forEach(function (it) { it.classList.toggle("is-active", it === item); });
      swap(heading, item.getAttribute("data-demo-form-title"));
      swap(body, item.getAttribute("data-demo-form-text"));
    }

    if (items.length) {
      // React to accordion state: when an item gains `is-open` it becomes active.
      // Works for click and keyboard, and stays decoupled from accordion.js.
      items.forEach(function (item) {
        if ("MutationObserver" in global) {
          new MutationObserver(function () {
            if (item.classList.contains("is-open")) activate(item);
          }).observe(item, { attributes: true, attributeFilter: ["class"] });
        }
        // Immediate feedback + a fallback when accordion.js isn't used.
        item.addEventListener("click", function () { activate(item); });
      });

      // Initial selection: explicit flag → already-open item → first item.
      var initial =
        items.filter(function (it) { return flag(it.getAttribute("data-demo-form-active")); })[0] ||
        items.filter(function (it) { return it.classList.contains("is-open"); })[0] ||
        items[0];
      // Set initial copy without the fade (active starts null so swap would fade).
      active = initial;
      initial.classList.add("is-active");
      if (heading) heading.textContent = initial.getAttribute("data-demo-form-title") || heading.textContent;
      if (body) body.textContent = initial.getAttribute("data-demo-form-text") || body.textContent;
    }

    // ── 2. KVKK consent by geolocation ───────────────────────────
    var kvkk = root.querySelector("[data-demo-form-kvkk]");
    if (kvkk) {
      // Consent control may be a checkbox OR a (single) radio — both validate
      // with `required`. A two-option radio group ("yes/no") can't be enforced
      // to "yes" by native validation, so use a single consent radio/checkbox.
      var inputs   = kvkk.querySelectorAll('input[type="checkbox"], input[type="radio"]');
      var trigger  = (root.getAttribute("data-demo-form-country") || "TR").toUpperCase();
      var geoUrl   = root.getAttribute("data-demo-form-geo") || "https://ipapi.co/country/";

      function setRequired(on) {
        Array.prototype.forEach.call(inputs, function (inp) {
          inp.required = on;
          if (on) inp.setAttribute("required", "required");
          else inp.removeAttribute("required");
        });
      }

      // Default state: hidden + not required, so non-TR visitors are never blocked.
      kvkk.classList.remove("is-visible");
      setRequired(false);

      function applyKvkk(show) {
        kvkk.classList.toggle("is-visible", show);
        setRequired(show);
      }

      // Client-side IP geo lookup; fall back to <html lang> if it fails.
      global.fetch(geoUrl, { headers: { Accept: "text/plain" } })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
        .then(function (t) { applyKvkk(t.trim().toUpperCase().indexOf(trigger) === 0); })
        .catch(function () { applyKvkk(pageLang() === "tr"); });
    }

    // ── 3. Submit reveal — FLIP the Lottie + scroll on success ────
    var done = root.querySelector("[data-demo-form-done]");
    if (done && "MutationObserver" in global) {
      var fired = false;

      function isVisible(el) {
        return el.offsetParent !== null &&
               global.getComputedStyle(el).display !== "none";
      }

      /**
       * Move `el` into `target` with an arcing FLIP that GROWS the Lottie to the
       * destination size. The Lottie arrives at the box you sized the target
       * placeholder to (or data-demo-form-lottie-w / -h overrides) — that's the
       * "size it should reach". The travel curves (x and y settle on different
       * eases) and the scale pops in slightly, instead of a flat diagonal slide.
       */
      function flipMove(el, target) {
        var dur = parseFloat(root.getAttribute("data-demo-form-duration")) || 0.9;

        var first   = el.getBoundingClientRect();          // FIRST: old box
        var destBox = target.getBoundingClientRect();      // size you set in Webflow

        target.appendChild(el);                            // move in DOM

        // Arrive at the size you gave: explicit attrs win, else the placeholder's
        // own box. Without this the Lottie keeps its old size and never grows.
        var w = parseFloat(el.getAttribute("data-demo-form-lottie-w")) || destBox.width;
        var h = parseFloat(el.getAttribute("data-demo-form-lottie-h")) || destBox.height;
        if (w && h) {
          el.style.width  = w + "px";
          el.style.height = h + "px";
        }

        if (reduce || typeof global.gsap === "undefined") return;   // instant arrive

        var last = el.getBoundingClientRect();             // LAST: new (grown) box
        if (!last.width || !first.width) return;

        global.gsap.set(el, { transformOrigin: "top left", zIndex: 9999 });
        // Invert + Play. Splitting x/y onto different eases bends the path into a
        // gentle arc; back.out on the scale gives a soft grow-in pop.
        global.gsap.timeline()
          .fromTo(el, { x: first.left - last.left }, { x: 0, duration: dur, ease: "power1.inOut" }, 0)
          .fromTo(el, { y: first.top - last.top },   { y: 0, duration: dur, ease: "power2.in" }, 0)
          .fromTo(el,
            { scaleX: first.width / last.width, scaleY: first.height / last.height },
            { scaleX: 1, scaleY: 1, duration: dur, ease: "back.out(1.3)" }, 0);
      }

      function onSuccess() {
        if (fired || !isVisible(done)) return;
        fired = true;
        var lottie = root.querySelector("[data-demo-form-lottie]");
        var target = done.querySelector("[data-demo-form-lottie-target]");
        if (lottie && target) flipMove(lottie, target);
        scrollToEl(done, offset);
      }

      new MutationObserver(onSuccess)
        .observe(done, { attributes: true, attributeFilter: ["style", "class"] });
      // Webflow may flip display before the observer attaches — check once now.
      onSuccess();
    }

    return root;
  }

  /**
   * Initialize all [data-demo-form] sections on the page.
   * @param {string} [selector="[data-demo-form]"]
   */
  function initDemoForm(selector) {
    var roots = doc.querySelectorAll(selector || "[data-demo-form]");
    Array.prototype.forEach.call(roots, wire);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initDemoForm = initDemoForm;

})(typeof window !== "undefined" ? window : this);
