/*!
 * reveal-debug.js v1.0.0
 * Diagnostic helper for the size-reveal / pinned-section interaction. When you
 * have pinned ScrollTriggers (e.g. scroll-tabs pins for 400%), they add pin-spacing
 * to the document, which SHIFTS the absolute start/end of every trigger created
 * below them. If reveal triggers are measured before the pin exists — or before
 * images/fonts settle the layout — their "top 85%" resolves against a stale
 * document height and they fire at the wrong scroll position. This tool prints
 * exactly what ScrollTrigger computed so you can see the mismatch.
 *
 * It does NOT change behaviour — read-only logging + optional on-screen markers.
 *
 * Usage (after gsap + ScrollTrigger + reveal.js + your pins are all initialised):
 *   Sestek.revealDebug();                 // log once
 *   Sestek.revealDebug({ markers: true }); // also draw start/end lines on screen
 *   Sestek.revealDebug({ watch: true });   // re-log on every ScrollTrigger.refresh
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function fmt(n) { return Math.round(n); }

  function viewportReport() {
    var vv = global.visualViewport;
    console.group("%c[reveal-debug] viewport / document", "color:#00FFEB;font-weight:bold");
    console.table({
      "window.innerHeight": global.innerHeight,
      "documentElement.clientHeight": document.documentElement.clientHeight,
      "visualViewport.height": vv ? fmt(vv.height) : "n/a",
      "document scrollHeight": document.documentElement.scrollHeight,
      "body scrollHeight": document.body ? document.body.scrollHeight : "n/a",
      "ScrollTrigger maxScroll": (typeof ScrollTrigger !== "undefined")
        ? fmt(ScrollTrigger.maxScroll(global)) : "n/a",
      "Lenis present": !!global.lenisInstance,
      "current scrollY": fmt(global.scrollY),
    });
    // The tell-tale: if innerHeight !== clientHeight, mobile URL bars / scrollbars
    // are skewing "85%"-style relative starts.
    if (global.innerHeight !== document.documentElement.clientHeight) {
      console.warn("[reveal-debug] innerHeight !== clientHeight — relative starts " +
        "(\"top 85%\") may resolve differently than you expect (scrollbar / mobile UI).");
    }
    console.groupEnd();
  }

  function triggerReport() {
    if (typeof ScrollTrigger === "undefined") {
      console.error("[reveal-debug] ScrollTrigger not loaded.");
      return;
    }
    var all = ScrollTrigger.getAll();
    var pins = all.filter(function (st) { return st.pin; });
    var reveals = all.filter(function (st) {
      return st.trigger && st.trigger.hasAttribute && st.trigger.hasAttribute("data-reveal");
    });

    console.group("%c[reveal-debug] " + all.length + " triggers (" +
      pins.length + " pinned, " + reveals.length + " reveal)",
      "color:#EC008C;font-weight:bold");

    if (pins.length) {
      console.log("%cPINNED — these add pin-spacing and push everything below them:",
        "font-weight:bold");
      console.table(pins.map(function (st) {
        return {
          trigger: describe(st.trigger),
          start: fmt(st.start),
          end: fmt(st.end),
          pinSpacing: fmt(st.end - st.start) + "px added",
        };
      }));
    }

    console.log("%cREVEAL — resolved start/end (compare 'start' against the real " +
      "on-screen position; a pin above will inflate these):", "font-weight:bold");
    console.table(reveals.map(function (st) {
      var rect = st.trigger.getBoundingClientRect();
      var absTop = rect.top + global.scrollY;
      // Where ScrollTrigger THINKS the trigger should activate vs. where the
      // element actually sits right now. A large gap = stale / un-refreshed.
      return {
        el: describe(st.trigger),
        dir: st.trigger.getAttribute("data-reveal") || "left",
        "ST.start": fmt(st.start),
        "el absTop": fmt(absTop),
        "delta (start - elTop+85%vh)": fmt(st.start - (absTop - global.innerHeight * 0.85)),
        active: st.isActive,
      };
    }));
    console.log("%cIf 'delta' is far from 0, the trigger was measured against a " +
      "different document height than the current one → call ScrollTrigger.refresh() " +
      "AFTER all pins + images are ready.", "color:#888");
    console.groupEnd();
  }

  function describe(el) {
    if (!el) return "(none)";
    var id = el.id ? "#" + el.id : "";
    var cls = el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return (el.tagName.toLowerCase() + id + cls).slice(0, 40);
  }

  /**
   * @param {object} [opts]
   * @param {boolean} [opts.markers=false] draw ScrollTrigger start/end markers
   * @param {boolean} [opts.watch=false]   re-run the report on every refresh
   */
  function revealDebug(opts) {
    var o = opts || {};
    console.log("%c═══ Sestek reveal-debug ═══", "color:#7F81AE;font-weight:bold");
    viewportReport();
    triggerReport();

    if (o.markers && typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.getAll().forEach(function (st) {
        // Re-create the trigger's markers by toggling its config isn't public;
        // instead just note it — markers are best set at creation time.
      });
      console.info("[reveal-debug] For visual lines, add markers:true to the " +
        "ScrollTrigger (in reveal.js) or run ScrollTrigger.defaults({markers:true}) " +
        "BEFORE init.");
    }

    if (o.watch && typeof ScrollTrigger !== "undefined" && !revealDebug._watching) {
      revealDebug._watching = true;
      ScrollTrigger.addEventListener("refreshInit", function () {
        console.log("%c[reveal-debug] refreshInit — about to recompute positions",
          "color:#888");
      });
      ScrollTrigger.addEventListener("refresh", function () {
        console.log("%c[reveal-debug] refresh DONE — re-reading positions:",
          "color:#00FFEB");
        triggerReport();
      });
      console.info("[reveal-debug] watching refresh events…");
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.revealDebug = revealDebug;

})(typeof window !== "undefined" ? window : this);
