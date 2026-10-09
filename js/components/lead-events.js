/*!
 * lead-events.js v1.0.0
 * Pushes a `form_submit_success` conversion event to dataLayer whenever a
 * lead is accepted by the CRM endpoint — WITHOUT touching the forms.
 *
 * Why: the Code Component forms on the live site are bound to an older
 * library version that has no dataLayer push, and swapping every instance
 * by hand is not an option. Instead this script wraps window.fetch and
 * watches POSTs to the lead endpoint (default "/crm/lead", i.e.
 * /demos/api/crm/lead). Any sender is covered: old/new React forms,
 * crm-forms.js, etc.
 *
 * On a successful response (HTTP 2xx and body.ok !== false):
 *
 *   dataLayer.push({ lead: null });   // clears the previous submission
 *   dataLayer.push({
 *     event: "form_submit_success",
 *     form_type,                      // payload.formType ("frm-demo", …)
 *     event_id,                       // Google Ads orderId + dedup
 *     page_url,
 *     lead: { email, phone, first_name, last_name, country }
 *   });
 *
 * Empty / absent lead fields are omitted. phone is E.164 as sent to the
 * CRM; country is the phone picker's selection when it can be read from
 * the submitted form, else derived from the phone's calling code.
 *
 * No double counting: newer component versions (lib ≥ 1.14.0) push the
 * same event themselves. After each response this script waits briefly
 * and skips if a form_submit_success for the same form_type was already
 * pushed since the request started.
 *
 * Failed requests, honeypot submits (no request is made) and anything the
 * fetch wrapper cannot parse are ignored; the wrapper never changes what
 * the caller receives and never throws.
 *
 * Usage — once, site-wide (Site settings → Custom code → Footer):
 *   <script src="https://cdn.jsdelivr.net/gh/roicool/sestek@main/js/components/lead-events.js" defer></script>
 * Self-initialising; Sestek.initLeadEvents({ match: "/crm/lead" }) is
 * available for a custom endpoint and is idempotent.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULT_MATCH = "/crm/lead";
  var DEDUP_WAIT_MS = 400;

  /* Calling code → ISO country, used only when the picker can't be read.
   * Longest prefix wins; +1 (US/CA) is ambiguous and left out. */
  var CALLING = {
    "90": "TR", "44": "GB", "49": "DE", "33": "FR", "39": "IT", "34": "ES",
    "31": "NL", "32": "BE", "41": "CH", "43": "AT", "46": "SE", "47": "NO",
    "45": "DK", "48": "PL", "30": "GR", "351": "PT", "353": "IE", "358": "FI",
    "7": "RU", "380": "UA", "971": "AE", "966": "SA", "974": "QA", "965": "KW",
    "973": "BH", "968": "OM", "962": "JO", "961": "LB", "20": "EG", "212": "MA",
    "216": "TN", "213": "DZ", "994": "AZ", "995": "GE", "998": "UZ", "992": "TJ",
    "993": "TM", "996": "KG", "374": "AM", "91": "IN", "92": "PK", "62": "ID",
    "60": "MY", "65": "SG", "81": "JP", "82": "KR", "86": "CN", "61": "AU",
    "55": "BR", "52": "MX", "27": "ZA", "234": "NG", "254": "KE", "972": "IL",
  };

  var lastForm = null;

  function uuid() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === "function")
        return global.crypto.randomUUID();
    } catch (e) { /* insecure context — fall through */ }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function str(v) {
    return typeof v === "string" ? v.trim() : "";
  }

  function countryFromForm(form) {
    if (!form || !form.querySelector) return "";
    var sel = form.querySelector(".spf select") || form.querySelector("select[name*='country' i]");
    var v = sel ? str(sel.value).toUpperCase() : "";
    return /^[A-Z]{2}$/.test(v) ? v : "";
  }

  function countryFromPhone(phone) {
    var d = /^\+(\d+)$/.exec(phone);
    if (!d) return "";
    for (var len = 3; len >= 1; len--) {
      var hit = CALLING[d[1].slice(0, len)];
      if (hit) return hit;
    }
    return "";
  }

  function alreadyPushed(dl, fromIndex, formType) {
    for (var i = fromIndex; i < dl.length; i++) {
      var e = dl[i];
      if (e && e.event === "form_submit_success" && e.form_type === formType) return true;
    }
    return false;
  }

  function push(payload, form, startIndex) {
    var dl = (global.dataLayer = global.dataLayer || []);
    var formType = str(payload.formType);
    if (alreadyPushed(dl, startIndex, formType)) return;

    var phone = str(payload.mobilephone);
    if (!/^\+\d{6,15}$/.test(phone)) phone = "";
    var raw = {
      email: str(payload.emailaddress1).toLowerCase(),
      phone: phone,
      first_name: str(payload.firstname),
      last_name: str(payload.lastname),
      country: phone ? countryFromForm(form) || countryFromPhone(phone) : "",
    };
    var lead = {};
    for (var k in raw) if (raw[k]) lead[k] = raw[k];

    dl.push({ lead: null });
    dl.push({
      event: "form_submit_success",
      form_type: formType,
      event_id: uuid(),
      page_url: global.location.href,
      lead: lead,
    });
  }

  function initLeadEvents(opts) {
    if (global.__sestekLeadEvents) return;
    if (typeof global.fetch !== "function") return;
    global.__sestekLeadEvents = true;

    var match = (opts && opts.match) || DEFAULT_MATCH;
    var origFetch = global.fetch;

    /* Remember which form was submitted (capture phase runs before React). */
    document.addEventListener("submit", function (e) { lastForm = e.target; }, true);

    global.fetch = function (input, init) {
      var p = origFetch.apply(this, arguments);
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        var method = ((init && init.method) || (input && input.method) || "GET").toUpperCase();
        if (method !== "POST" || url.indexOf(match) === -1) return p;
        if (!init || typeof init.body !== "string") return p;

        var payload = JSON.parse(init.body);
        if (!payload || payload.hp) return p;
        var form = lastForm;
        var startIndex = (global.dataLayer || []).length;

        p.then(function (res) {
          if (!res || !res.ok) return;
          return res.clone().json().catch(function () { return {}; }).then(function (body) {
            if (body && body.ok === false) return;
            setTimeout(function () {
              try { push(payload, form, startIndex); } catch (e) { /* never break */ }
            }, DEDUP_WAIT_MS);
          });
        }).catch(function () { /* the caller handles its own errors */ });
      } catch (e) { /* not ours / unparsable — ignore */ }
      return p;
    };
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initLeadEvents = initLeadEvents;

  /* Wrap fetch as early as possible — no DOM needed. */
  initLeadEvents();
})(window);
