/*!
 * crm-forms.js v1.0.0
 * Mirrors Webflow form submissions to the CRM lead endpoint (Microsoft
 * Dynamics, proxied by the Webflow Cloud app — see docs/CRM spec).
 *
 * The Webflow form stays 100% NATIVE: Webflow owns validation, the AJAX
 * submit, the e-mail notification and the success message. This script only
 * listens for the `submit` event (which fires AFTER native validation passes),
 * collects the field values and sends them to the endpoint as a parallel,
 * fire-and-forget fetch. Whatever the endpoint answers — 501 "not configured",
 * 4xx, network error — the visitor never sees it; the form experience is
 * untouched.
 *
 *   • Form is marked in Designer with ONE attribute: data-crm-form="<type>"
 *   • Fields map automatically (autocomplete attr / type / name heuristics);
 *     data-crm-field overrides per input when the guess would be wrong
 *   • UTM params are read from sticky-utms.js' sessionStorage key and attached
 *   • A hidden honeypot input is injected into each marked form; its value is
 *     sent as `hp` (server silently drops bot submissions)
 *   • No request is sent at all when the e-mail field is empty/invalid
 *     (the server would reject it anyway — no wasted calls)
 *   • Identical back-to-back payloads are deduped (double-click / resubmit)
 *
 * Requires: nothing (no GSAP). Integrates with sticky-utms.js if present.
 * CSS: none.
 *
 * DOM (Webflow):
 *   <form data-crm-form="frm-contact">        ← the only REQUIRED attribute
 *     <input type="text"  autocomplete="given-name">   → firstname
 *     <input type="text"  autocomplete="family-name">  → lastname
 *     <input type="email">                             → emailaddress1
 *     <input type="tel">                               → mobilephone
 *     <input type="text"  autocomplete="organization"> → companyname
 *     <input type="text"  data-crm-field="jobtitle">   → explicit override
 *     <textarea>…</textarea>                           → description
 *   </form>
 *
 * Form types (must match the endpoint whitelist, anything else is skipped):
 *   frm-contact · frm-demo · frm-newsletter · frm-opus-report
 *
 * Field resolution order per input (first match wins):
 *   1. data-crm-field="firstname|lastname|emailaddress1|mobilephone|
 *                      companyname|jobtitle|description"
 *      (data-crm-field="skip" → never send this input)
 *   2. autocomplete: given-name, family-name, email, tel, organization,
 *      organization-title
 *   3. type="email" → emailaddress1 · type="tel" → mobilephone
 *   4. <textarea> → description
 *   5. name/id keyword sniff: first→firstname, last/surname→lastname,
 *      mail→emailaddress1, phone/tel/mobile/gsm→mobilephone,
 *      company/organization/firma/sirket→companyname, title/unvan→jobtitle,
 *      message/comment/mesaj→description
 *
 * Attributes (optional, on the <form> or any ancestor incl. <body>):
 *   data-crm-endpoint    override the endpoint URL
 *                        (default "/demos/api/crm/lead" — same-origin mount)
 *
 * API:
 *   Sestek.initCrmForms([selector])   — wire all [data-crm-form] forms
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULT_ENDPOINT = "/demos/api/crm/lead";
  var UTM_STORAGE_KEY  = "sestek_utms";       /* written by sticky-utms.js */
  var HP_NAME          = "website";           /* tempting name for bots    */

  var FORM_TYPES = ["frm-contact", "frm-demo", "frm-newsletter", "frm-opus-report"];

  var FIELDS = [
    "firstname", "lastname", "emailaddress1", "mobilephone",
    "companyname", "jobtitle", "description",
  ];

  var AUTOCOMPLETE_MAP = {
    "given-name":         "firstname",
    "family-name":        "lastname",
    "email":              "emailaddress1",
    "tel":                "mobilephone",
    "organization":       "companyname",
    "organization-title": "jobtitle",
  };

  /* name/id substring → field. Checked in order; first hit wins. */
  var KEYWORD_MAP = [
    ["first",        "firstname"],
    ["last",         "lastname"],
    ["surname",      "lastname"],
    ["soyad",        "lastname"],
    ["mail",         "emailaddress1"],
    ["phone",        "mobilephone"],
    ["tel",          "mobilephone"],
    ["mobile",       "mobilephone"],
    ["gsm",          "mobilephone"],
    ["company",      "companyname"],
    ["organization", "companyname"],
    ["firma",        "companyname"],
    ["sirket",       "companyname"],
    ["title",        "jobtitle"],
    ["unvan",        "jobtitle"],
    ["message",      "description"],
    ["comment",      "description"],
    ["mesaj",        "description"],
  ];

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /** Resolve which CRM field (if any) an input element feeds. */
  function resolveField(el) {
    var explicit = el.getAttribute("data-crm-field");
    if (explicit) {
      explicit = explicit.trim().toLowerCase();
      if (explicit === "skip") return null;
      return FIELDS.indexOf(explicit) !== -1 ? explicit : null;
    }

    var ac = (el.getAttribute("autocomplete") || "").trim().toLowerCase();
    if (AUTOCOMPLETE_MAP[ac]) return AUTOCOMPLETE_MAP[ac];

    var type = (el.getAttribute("type") || "").toLowerCase();
    if (type === "email") return "emailaddress1";
    if (type === "tel")   return "mobilephone";

    if (el.tagName === "TEXTAREA") return "description";

    var hint = ((el.name || "") + " " + (el.id || "")).toLowerCase();
    for (var i = 0; i < KEYWORD_MAP.length; i++) {
      if (hint.indexOf(KEYWORD_MAP[i][0]) !== -1) return KEYWORD_MAP[i][1];
    }
    return null;
  }

  /** Collect { field: trimmedValue } from a form. Empty values are skipped. */
  function collectFields(form) {
    var out = {};
    var els = form.querySelectorAll("input, textarea");

    Array.prototype.forEach.call(els, function (el) {
      var type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "checkbox" || type === "radio" || type === "hidden" ||
          type === "submit"   || type === "button" || type === "password" ||
          type === "file") return;
      if (el.name === HP_NAME) return; /* our honeypot — sent separately */

      var field = resolveField(el);
      if (!field || out[field]) return; /* first matching input wins */

      var value = String(el.value || "").trim();
      if (value) out[field] = value;
    });

    return out;
  }

  /** Stored UTMs from sticky-utms.js, or null. */
  function loadUtms() {
    try {
      var raw = sessionStorage.getItem(UTM_STORAGE_KEY);
      var utms = raw ? JSON.parse(raw) : null;
      return utms && typeof utms === "object" ? utms : null;
    } catch (_) {
      return null;
    }
  }

  /** Inject the off-screen honeypot input; returns the element. */
  function injectHoneypot(form) {
    var existing = form.querySelector('input[name="' + HP_NAME + '"]');
    if (existing) return existing;

    var hp = document.createElement("input");
    hp.type = "text";
    hp.name = HP_NAME;
    hp.autocomplete = "off";
    hp.tabIndex = -1;
    hp.setAttribute("aria-hidden", "true");
    /* Off-screen, not display:none — bots skip display:none more often. */
    hp.style.cssText =
      "position:absolute!important;left:-9999px!important;top:-9999px!important;" +
      "height:1px;width:1px;opacity:0;pointer-events:none;";
    form.appendChild(hp);
    return hp;
  }

  /** Nearest data-crm-endpoint on the form or an ancestor, else default. */
  function resolveEndpoint(form) {
    var el = form;
    while (el && el.getAttribute) {
      var v = el.getAttribute("data-crm-endpoint");
      if (v) return v;
      el = el.parentElement;
    }
    return DEFAULT_ENDPOINT;
  }

  /** Fire-and-forget POST. Never throws, never surfaces errors to the UI. */
  function send(endpoint, payload) {
    try {
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "omit",
        keepalive: true, /* survives a same-tick navigation */
      }).catch(function () {}); /* silence — visitor never sees CRM errors */
    } catch (_) {}
  }

  /** Wire one [data-crm-form] form. */
  function wireForm(form) {
    if (form.__sestekCrmWired) return;

    var formType = (form.getAttribute("data-crm-form") || "").trim();
    if (FORM_TYPES.indexOf(formType) === -1) {
      console.warn('[Sestek CRM] Unknown form type "' + formType + '" — skipped.');
      return;
    }

    form.__sestekCrmWired = true;
    var hp = injectHoneypot(form);
    var lastSent = null; /* dedupe identical consecutive payloads */

    form.addEventListener("submit", function () {
      /* Native/Webflow validation already passed when this event fires. */
      var payload = collectFields(form);

      if (!payload.emailaddress1 || !EMAIL_RE.test(payload.emailaddress1)) {
        return; /* server would 400 — don't bother */
      }

      payload.formType = formType;
      payload.pageUrl  = window.location.href;
      payload.hp       = String(hp.value || "");

      var utms = loadUtms();
      if (utms) payload.utm = utms;

      var fingerprint = JSON.stringify(payload);
      if (fingerprint === lastSent) return; /* double-click / retry */
      lastSent = fingerprint;

      send(resolveEndpoint(form), payload);
    });
  }

  /**
   * Initialize CRM mirroring on all marked forms.
   * @param {string} [selector="form[data-crm-form]"]
   */
  function initCrmForms(selector) {
    var forms = document.querySelectorAll(selector || "form[data-crm-form]");
    Array.prototype.forEach.call(forms, wireForm);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initCrmForms = initCrmForms;

})(typeof window !== "undefined" ? window : this);
