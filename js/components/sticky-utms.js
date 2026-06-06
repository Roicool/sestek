/*!
 * sticky-utms.js v1.0.0
 * Reads UTM parameters from the landing URL, stores them in sessionStorage,
 * and appends them to every matching outbound link on the page — including
 * links injected after DOMContentLoaded (CMS, modals, etc.).
 *
 * Why sessionStorage?  A visitor may land on page A with UTMs, then click to
 * page B (same site, no UTMs in the new URL).  sessionStorage carries the
 * original UTMs for the whole session without polluting localStorage forever.
 *
 * API:
 *   Sestek.initStickyUtms()   — wire everything up (call once per page)
 *
 * Configuration (all optional, set on <body> or any ancestor):
 *   data-utm-domains="acme.com,app.acme.com"
 *     Comma-separated list of hostnames that should receive UTMs.
 *     Default: same hostname as the current page (first-party only).
 *
 *   data-utm-params="utm_source,utm_medium,utm_campaign"
 *     Comma-separated list of param names to track.
 *     Default: utm_source, utm_medium, utm_campaign, utm_term, utm_content
 *
 * DOM — no extra elements needed.  Just call Sestek.initStickyUtms() and
 * ensure links are normal <a href="…"> elements.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var STORAGE_KEY = "sestek_utms";

  var DEFAULT_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  /* Read config attrs from <body> (set once, anywhere in the DOM). */
  function getConfig() {
    var body = document.body;

    var domainsAttr = body && body.getAttribute("data-utm-domains");
    var domains = domainsAttr
      ? domainsAttr.split(",").map(function (d) { return d.trim().toLowerCase(); })
      : [window.location.hostname.toLowerCase()];

    var paramsAttr = body && body.getAttribute("data-utm-params");
    var params = paramsAttr
      ? paramsAttr.split(",").map(function (p) { return p.trim().toLowerCase(); })
      : DEFAULT_PARAMS;

    return { domains: domains, params: params };
  }

  /* Extract UTM params from the current URL; return null if none found. */
  function extractFromUrl(paramNames) {
    var search = window.location.search;
    if (!search) return null;

    var urlParams = new URLSearchParams(search);
    var found = {};
    var hasAny = false;

    paramNames.forEach(function (name) {
      if (urlParams.has(name)) {
        found[name] = urlParams.get(name);
        hasAny = true;
      }
    });

    return hasAny ? found : null;
  }

  /* Persist to sessionStorage; silently skip if storage is unavailable. */
  function saveToSession(utms) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utms));
    } catch (_) {}
  }

  /* Read previously saved UTMs from sessionStorage. */
  function loadFromSession() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  /* True if the link's hostname is in the allowed domains list. */
  function isAllowedDomain(hostname, domains) {
    var h = hostname.toLowerCase();
    return domains.some(function (d) { return h === d || h.endsWith("." + d); });
  }

  /* True if this URL already carries at least one UTM parameter. */
  function alreadyHasUtms(urlObj) {
    var keys = Array.from(urlObj.searchParams.keys());
    return keys.some(function (k) { return k.indexOf("utm_") === 0; });
  }

  /* Append stored UTMs to a single <a> element. */
  function applyToLink(link, utms, domains) {
    var href = link.getAttribute("href") || "";
    if (!href || href.indexOf("#") === 0 || href.indexOf("javascript:") === 0) return;

    try {
      var url = new URL(href, window.location.href);

      if (!isAllowedDomain(url.hostname, domains)) return;
      if (alreadyHasUtms(url)) return;

      Object.keys(utms).forEach(function (key) {
        url.searchParams.set(key, utms[key]);
      });

      link.href = url.toString();
    } catch (_) {}
  }

  /* Apply UTMs to every link currently in the DOM. */
  function applyToAllLinks(utms, domains) {
    document.querySelectorAll("a[href]").forEach(function (link) {
      applyToLink(link, utms, domains);
    });
  }

  /**
   * Initialise sticky UTMs.
   * 1. Read UTMs from URL (if present) and save to sessionStorage.
   * 2. Fall back to sessionStorage from a previous page in the same session.
   * 3. Append UTMs to all matching links now.
   * 4. Watch for new links injected later (CMS items, modals, Lottie, etc.).
   */
  function initStickyUtms() {
    var config = getConfig();

    /* Prefer fresh URL params; fall back to session. */
    var utms = extractFromUrl(config.params) || loadFromSession();
    if (!utms) return; /* No UTMs anywhere — nothing to do. */

    /* Save/refresh the session copy. */
    saveToSession(utms);

    /* Apply to links already in the DOM. */
    applyToAllLinks(utms, config.domains);

    /* Watch for dynamically added links (CMS, Webflow IX, modals…). */
    if (typeof MutationObserver !== "undefined") {
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return; /* Element nodes only */

            /* The node itself might be an <a> */
            if (node.tagName === "A") {
              applyToLink(node, utms, config.domains);
            }

            /* Or it might contain <a> elements */
            node.querySelectorAll && node.querySelectorAll("a[href]").forEach(function (link) {
              applyToLink(link, utms, config.domains);
            });
          });
        });
      });

      observer.observe(document.body, { subtree: true, childList: true });
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initStickyUtms = initStickyUtms;

})(typeof window !== "undefined" ? window : this);
