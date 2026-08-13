/*!
 * email-cta.js v1.0.0
 * Email-only CTA → contact form handoff. The small "just your email" capture
 * (hero, footer band, banner) stops being a dead end: a REAL address typed
 * there carries the visitor to the contact page with that address already
 * written into the contact form, so they never type it twice.
 *
 * Two halves, one script, one init call — put it site-wide and it wires
 * whichever half exists on the page:
 *
 *   1. SENDER  — [data-email-cta] … the email-only CTA.
 *      Submit is intercepted. The hop happens ONLY when the field really
 *      holds a valid address: empty, whitespace or "asdf" never navigates —
 *      it shows the error and keeps the visitor where they are.
 *
 *   2. RECEIVER — the contact page. The address arrives as a query param
 *      (?email=…, plus a sessionStorage copy as belt-and-braces) and is
 *      written into the contact form's email field, `input`/`change` are
 *      dispatched so Webflow/analytics see a real edit, the next empty field
 *      takes focus and the form is scrolled into view if it sits off-screen.
 *      An already-filled field is NEVER overwritten, and the address is
 *      wiped from the URL bar afterwards (it is a personal detail — it has
 *      no business in a shareable link, referrer header or analytics path).
 *
 * The CTA form stays a NATIVE Webflow form in Designer; by default its own
 * submit is suppressed (the contact form is where the lead is recorded). Set
 * data-email-cta-keep-submit if you also want Webflow to store the address —
 * then the native submit runs first and the hop happens on its success.
 *
 * Requires: nothing. No GSAP. Smooth scroll prefers Sestek.scrollTo (Lenis)
 * and falls back to native scrolling.
 * CSS: css/components/email-cta.css (error visibility + prefilled highlight)
 *
 * DOM — SENDER (Webflow Designer; all styling is Designer's):
 *   <div data-email-cta data-email-cta-target="/contact">
 *     <div class="w-form">
 *       <form>
 *         <input type="email" name="email" placeholder="Work email" required>
 *         <input type="submit" value="Get in touch">
 *       </form>
 *     </div>
 *     <div data-email-cta-error>Please enter a valid email address.</div>
 *   </div>
 *
 * DOM — RECEIVER (contact page; mark the form once):
 *   <div data-email-cta-form>
 *     <form> <input type="email" name="Email"> … </form>
 *   </div>
 *
 * Sender attributes (on [data-email-cta], all optional):
 *   data-email-cta-target       where to send them        (default "/contact")
 *                               may carry a hash: "/contact#form"
 *   data-email-cta-param        query param name          (default "email")
 *   data-email-cta-keep-submit  let Webflow submit the CTA form too; the hop
 *                               waits for its success message (default off)
 *   data-email-cta-input        not needed if the field is <input type="email">
 *                               — put this attribute ON the field otherwise
 *   data-email-cta-submit       put on a non-<input type=submit> trigger
 *                               (e.g. a styled <a>) so it fires the hop
 *   data-email-cta-error        the message element shown when the address is
 *                               missing/invalid (no element → the browser's
 *                               own validation bubble is used instead)
 *
 * Receiver attributes (on [data-email-cta-form], all optional):
 *   data-email-cta-param        must match the sender's  (default "email")
 *   data-email-cta-field        put on the target input if it is not the
 *                               form's <input type="email">
 *   data-email-cta-focus="false"  do not move focus to the next empty field
 *   data-email-cta-scroll="false" do not scroll the form into view
 *   data-email-cta-offset       px subtracted from the scroll target (default 100)
 *   data-email-cta-keep-url     keep ?email=… in the address bar (default: wiped)
 *
 * Without any receiver markup the script still fills the first email input
 * that lives inside a <form> and outside a CTA — explicit markup only wins
 * when the page has several forms (footer newsletter, etc.).
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var doc = global.document;

  var STORAGE_KEY   = "sestek-email-cta";
  var DEFAULT_TARGET = "/contact";
  var DEFAULT_PARAM  = "email";
  var DONE_TIMEOUT   = 2500;   // ms to wait for Webflow's success message

  /* Deliberately loose — this gate exists to stop empty/garbage hops, not to
   * out-guess the mail server. Anything with one @ and a dotted domain passes;
   * the contact form's own `required` does the final say. */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* How an email field is recognised when it carries no explicit hook. */
  var EMAIL_FIELD_SEL = 'input[type="email"], input[name*="mail" i]';

  /** Absent → false; present-but-empty → true; "false"/"0"/"no"/"off" → false. */
  function flag(v) {
    if (v === null || v === undefined) return false;
    if (v === "") return true;
    return v !== "false" && v !== "0" && v !== "no" && v !== "off";
  }

  /** The one gate the whole component turns on: is this a real address? */
  function isEmail(v) {
    return EMAIL_RE.test(String(v == null ? "" : v).trim());
  }

  /* ── sessionStorage copy ──────────────────────────────────────────────
   * The query param is the primary channel; this copy survives a redirect
   * that drops the query string (locale prefixes, Webflow 301s, a login hop)
   * and is consumed once. Guarded for private mode / blocked storage. */
  function remember(email) {
    try { global.sessionStorage.setItem(STORAGE_KEY, email); } catch (_) {}
  }
  function recall() {
    try { return global.sessionStorage.getItem(STORAGE_KEY); } catch (_) { return null; }
  }
  function forget() {
    try { global.sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
  }

  /** Smooth-scroll an element into view, Lenis-aware with native fallback. */
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

  /* ══════════════════════════════════════════════════════════════════════
   * SENDER — [data-email-cta]
   * ════════════════════════════════════════════════════════════════════ */

  /** The email field inside a CTA: explicit hook → type=email → name*=mail. */
  function findInput(root) {
    return root.querySelector("[data-email-cta-input]") ||
           root.querySelector('input[type="email"]') ||
           root.querySelector('input[name*="mail" i]');
  }

  /**
   * Contact-page URL carrying the address. Any utm_* on the current URL rides
   * along — this is a scripted hop, so sticky-utms.js (which rewrites <a>
   * hrefs) never sees it and the campaign would otherwise be lost mid-funnel.
   */
  function buildUrl(root, email) {
    var target = root.getAttribute("data-email-cta-target") || DEFAULT_TARGET;
    var param  = root.getAttribute("data-email-cta-param")  || DEFAULT_PARAM;

    var url  = new global.URL(target, global.location.href);
    var here = new global.URL(global.location.href);

    url.searchParams.set(param, email);
    here.searchParams.forEach(function (value, key) {
      if (key.indexOf("utm_") === 0 && !url.searchParams.has(key)) {
        url.searchParams.set(key, value);
      }
    });
    return url.toString();
  }

  /**
   * Wire one [data-email-cta].
   * @param {HTMLElement} root
   * @returns {{el: HTMLElement, input: HTMLInputElement, send: function}|undefined}
   */
  function wireCta(root) {
    if (root._emailCtaInit) return root._emailCtaCtl;
    root._emailCtaInit = true;

    var input = findInput(root);
    if (!input) {
      global.console && console.warn("[Sestek] email-cta: e-posta alanı bulunamadı", root);
      return;
    }

    var form       = input.form || root.querySelector("form");
    var errorEl    = root.querySelector("[data-email-cta-error]");
    var keepSubmit = flag(root.getAttribute("data-email-cta-keep-submit"));
    var leaving    = false;                       // one hop per CTA, ever

    function clearError() {
      root.classList.remove("is-invalid");
      if (errorEl) errorEl.classList.remove("is-visible");
    }

    /** Paint the invalid state. Never validates — safe inside `invalid`. */
    function markInvalid() {
      root.classList.add("is-invalid");
      if (errorEl) errorEl.classList.add("is-visible");
    }

    function showError() {
      markInvalid();
      if (errorEl) {
        input.focus();
      } else if (typeof input.reportValidity === "function") {
        input.reportValidity();                   // native bubble, localised
      } else {
        input.focus();
      }
    }

    /* The browser's own constraint validation (required / type="email") runs
     * BEFORE the submit event — on an empty field the submit event never fires
     * at all, so without this the Designer-built message would stay hidden and
     * only the browser's bubble would speak. Mirror the browser's verdict onto
     * our message, and suppress the bubble when we have one so the visitor is
     * told once, in the site's own words. */
    input.addEventListener("invalid", function (e) {
      if (errorEl) e.preventDefault();
      markInvalid();
    });

    /** The address, but only if it is genuinely one. Otherwise null. */
    function validEmail() {
      var value = (input.value || "").trim();
      if (!value || !isEmail(value)) return null;
      // A type="email" field also gets the browser's own verdict.
      if (typeof input.checkValidity === "function" && !input.checkValidity()) return null;
      return value;
    }

    function hop(email) {
      if (leaving) return;
      leaving = true;
      remember(email);
      global.location.href = buildUrl(root, email);
    }

    /** Validate → hop. Returns false (and shows the error) when there is no
     *  real address — the visitor stays exactly where they are. */
    function send() {
      var email = validEmail();
      if (!email) { showError(); return false; }
      clearError();
      hop(email);
      return true;
    }

    input.addEventListener("input", clearError);

    if (form) {
      /* Capture phase on `document`: this runs before the form's own handlers
       * AND before Webflow's delegated submit handler, so stopping propagation
       * here reliably keeps the native AJAX submit from firing. A capture
       * listener on the form itself would NOT be reliable — at the target,
       * capture and bubble listeners fire in registration order. */
      doc.addEventListener("submit", function (e) {
        if (e.target !== form) return;

        var email = validEmail();

        if (!email) {
          // Nothing is sent and nothing navigates on an empty/garbage field.
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          showError();
          return;
        }

        clearError();

        if (!keepSubmit) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          hop(email);
          return;
        }

        // keep-submit: let Webflow record the address, then hop on success.
        remember(email);
        waitForDone(email);
      }, true);
    }

    /* Webflow swaps the form out for `.w-form-done` on a successful AJAX
     * submit. Watch for that, with a timeout so a slow/failed endpoint can
     * never strand the visitor on the CTA. */
    function waitForDone(email) {
      var wrap = (form && form.parentElement) || root;
      var done = wrap.querySelector(".w-form-done") ||
                 root.querySelector("[data-email-cta-done]");

      var timer = global.setTimeout(function () { hop(email); }, DONE_TIMEOUT);

      if (done && "MutationObserver" in global) {
        var observer = new MutationObserver(function () {
          if (done.offsetParent === null) return;
          observer.disconnect();
          global.clearTimeout(timer);
          hop(email);
        });
        observer.observe(done, { attributes: true, attributeFilter: ["style", "class"] });
      }
    }

    /* A styled <a>/<div> trigger, or an input+button pair with no <form> at
     * all. Native submit controls are skipped — the submit path owns those. */
    var trigger = root.querySelector("[data-email-cta-submit]");
    if (trigger && !isNativeSubmit(trigger, form)) {
      trigger.addEventListener("click", function (e) {
        e.preventDefault();
        send();
      });
    }
    if (!form) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); send(); }
      });
    }

    root._emailCtaCtl = { el: root, input: input, send: send };
    return root._emailCtaCtl;
  }

  /** True when clicking `el` already fires `form`'s submit event by itself. */
  function isNativeSubmit(el, form) {
    if (!form || el.form !== form) return false;
    var tag = el.tagName;
    if (tag === "INPUT") return el.type === "submit" || el.type === "image";
    if (tag === "BUTTON") return el.type !== "button" && el.type !== "reset";
    return false;
  }

  /* ══════════════════════════════════════════════════════════════════════
   * RECEIVER — the contact page
   * ════════════════════════════════════════════════════════════════════ */

  /** The scope that configures the receiver, if the page declares one. */
  function receiverScope() {
    return doc.querySelector("[data-email-cta-form]");
  }

  /**
   * The contact form's email field: explicit hook → inside the declared
   * scope → first email input that lives in a <form> and outside any CTA
   * (so an email-only CTA on the contact page can't fill itself).
   */
  function findTargetField(scope) {
    var explicit = doc.querySelector("[data-email-cta-field]");
    if (explicit) return explicit;

    if (scope) {
      var inScope = scope.querySelector(EMAIL_FIELD_SEL);
      if (inScope) return inScope;
    }

    var candidates = doc.querySelectorAll(
      'form input[type="email"], form input[name*="mail" i]'
    );
    for (var i = 0; i < candidates.length; i++) {
      if (!candidates[i].closest("[data-email-cta]")) return candidates[i];
    }
    return null;
  }

  /** Drop the address from the address bar without touching history depth. */
  function cleanUrl(param) {
    if (!global.history || !global.history.replaceState) return;
    var url = new global.URL(global.location.href);
    if (!url.searchParams.has(param)) return;
    url.searchParams.delete(param);
    global.history.replaceState(
      global.history.state,
      "",
      url.pathname + (url.search || "") + (url.hash || "")
    );
  }

  /** First empty, visible, editable field of the form — where typing resumes. */
  function nextEmptyField(form, skip) {
    var fields = form.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    );
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f === skip || f.disabled || f.readOnly) continue;
      if (f.type === "checkbox" || f.type === "radio") continue;
      if ((f.value || "").trim()) continue;
      if (f.offsetParent === null) continue;      // hidden by CSS
      return f;
    }
    return null;
  }

  /**
   * Write the handed-over address into the contact form. Silent no-op when
   * there is no address, when it isn't a valid one, or when the field already
   * holds something — a visitor's own typing is never overwritten.
   */
  function prefill() {
    var scope = receiverScope();
    var param = (scope && scope.getAttribute("data-email-cta-param")) || DEFAULT_PARAM;

    var fromUrl = null;
    try {
      fromUrl = new global.URL(global.location.href).searchParams.get(param);
    } catch (_) {}

    var email = fromUrl || recall();
    if (!isEmail(email)) return;
    email = email.trim();

    var field = findTargetField(scope);
    if (!field) return;

    // The address is consumed here — a later visit starts clean.
    forget();
    if (!flag(scope && scope.getAttribute("data-email-cta-keep-url"))) cleanUrl(param);

    if ((field.value || "").trim()) return;      // visitor already typing

    field.value = email;
    // Webflow's own field state, floating labels and analytics listen for
    // real edits — a bare .value assignment fires nothing.
    field.dispatchEvent(new Event("input",  { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));

    field.classList.add("is-prefilled");
    var drop = function () {
      field.classList.remove("is-prefilled");
      field.removeEventListener("focus", drop);
      field.removeEventListener("input", drop);
    };
    field.addEventListener("focus", drop);
    field.addEventListener("input", drop);

    var form = field.form || (scope && scope.querySelector("form"));
    if (!form) return;

    var wantsScroll = !scope || scope.getAttribute("data-email-cta-scroll") !== "false";
    var wantsFocus  = !scope || scope.getAttribute("data-email-cta-focus")  !== "false";
    var offset = parseFloat(scope && scope.getAttribute("data-email-cta-offset"));
    if (isNaN(offset)) offset = 100;

    if (wantsFocus) {
      var next = nextEmptyField(form, field);
      // preventScroll: the scroll below (Lenis-aware) owns the movement —
      // the browser's own focus jump would fight it.
      if (next) { try { next.focus({ preventScroll: true }); } catch (_) { next.focus(); } }
    }

    if (wantsScroll) {
      var box = form.getBoundingClientRect();
      var visible = box.top >= 0 && box.top < global.innerHeight * 0.75;
      if (!visible) scrollToEl(form, offset);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════ */

  /**
   * Wire every email-only CTA on the page AND fill the contact form when the
   * page was reached from one. Safe to call on every page — each half is a
   * no-op when its markup isn't there.
   * @param {string} [selector="[data-email-cta]"]
   * @returns {Array} one controller per wired CTA
   */
  function initEmailCta(selector) {
    var roots = doc.querySelectorAll(selector || "[data-email-cta]");
    var controllers = [];
    Array.prototype.forEach.call(roots, function (root) {
      var ctl = wireCta(root);
      if (ctl) controllers.push(ctl);
    });
    prefill();
    return controllers;
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initEmailCta = initEmailCta;

})(typeof window !== "undefined" ? window : this);
