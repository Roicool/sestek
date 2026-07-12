/*!
 * ask-ai.js v1.1.0
 * v1.1.0 — add "gemini" target (opens Google AI Mode, udm=50)
 * "Ask AI" buttons — each link deep-links straight into a chosen AI
 * assistant's chat with a pre-filled prompt (e.g. "Sestek nedir, ne iş
 * yapar?"), so a visitor — or an AI agent reading the page — can one click
 * and get an answer grounded in whatever prompt you write in Webflow.
 *
 * DOM (Webflow) — works across Webflow Localization locales from ONE embed,
 * no per-locale editing needed. Add a data-ask-ai-prompt-<lang> attribute per
 * language (<lang> matches the page's <html lang> — e.g. "en", "tr"); the
 * script reads document.documentElement.lang and picks the matching one:
 *   <div data-ask-ai
 *        data-ask-ai-prompt-en="What is Sestek, what does it do, and what
 *          products/solutions does it offer? Answer in detail based on
 *          information from https://sestek.com."
 *        data-ask-ai-prompt-tr="Sestek nedir, ne iş yapar, hangi ürün ve
 *          çözümleri sunar? https://sestek.com sitesindeki bilgilere
 *          dayanarak detaylı anlat.">
 *     <a data-ask-ai-target="chatgpt">...icon...</a>
 *     <a data-ask-ai-target="claude">...icon...</a>
 *     <a data-ask-ai-target="perplexity">...icon...</a>
 *     <a data-ask-ai-target="gemini">...icon...</a>
 *   </div>
 *
 * Attributes:
 *   data-ask-ai               wraps one or more targets (required)
 *   data-ask-ai-prompt-<lang> the prompt for that language, matched against
 *                             document.documentElement.lang (e.g. "en", "tr").
 *                             Settable on the wrapper (shared by all links
 *                             inside it) or on an individual link to override
 *                             just that one assistant.
 *   data-ask-ai-prompt        plain, locale-less fallback prompt — used if no
 *                             data-ask-ai-prompt-<lang> matches the page.
 *   data-ask-ai-target        "chatgpt" | "claude" | "perplexity" | "gemini"
 *                             (required per link; gemini opens Google AI Mode —
 *                             gemini.google.com doesn't support URL prefill)
 *
 * If neither is set, falls back to a generic "tell me about <page title>"
 * prompt built from document.title + location.href.
 *
 * Each link becomes a real <a target="_blank" rel="noopener noreferrer">
 * pointing at that assistant's public "new chat with prefilled text" URL.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var BUILDERS = {
    chatgpt: function (q) {
      return "https://chatgpt.com/?q=" + q + "&hints=search";
    },
    claude: function (q) {
      return "https://claude.ai/new?q=" + q;
    },
    perplexity: function (q) {
      return "https://www.perplexity.ai/search?q=" + q;
    },
    // gemini.google.com has no native URL-prefill; Google AI Mode (udm=50)
    // is the Gemini-powered surface that does — same pattern blog-utils.js
    // uses for its "google" provider.
    gemini: function (q) {
      return "https://www.google.com/search?udm=50&q=" + q;
    },
  };

  function defaultPrompt() {
    return "Bana " + global.document.title + " hakkında bilgi ver: " + global.location.href;
  }

  function pageLocale() {
    var lang = global.document.documentElement.lang || "";
    return lang.toLowerCase().split("-")[0];
  }

  function resolvePrompt(el, locale) {
    return (locale && el.getAttribute("data-ask-ai-prompt-" + locale)) ||
      el.getAttribute("data-ask-ai-prompt") ||
      null;
  }

  /**
   * Wires every [data-ask-ai-target] link inside every [data-ask-ai] wrapper
   * to its assistant's prefilled-prompt URL.
   * @param {string} [selector="[data-ask-ai]"]
   */
  function initAskAi(selector) {
    var locale = pageLocale();
    var wraps = global.document.querySelectorAll(selector || "[data-ask-ai]");
    Array.prototype.forEach.call(wraps, function (wrap) {
      var wrapPrompt = resolvePrompt(wrap, locale) || defaultPrompt();
      var links = wrap.querySelectorAll("[data-ask-ai-target]");
      Array.prototype.forEach.call(links, function (link) {
        var target = link.getAttribute("data-ask-ai-target");
        var build = BUILDERS[target];
        if (!build) {
          console.warn("[Sestek AskAI] Unknown target:", target);
          return;
        }
        var prompt = resolvePrompt(link, locale) || wrapPrompt;
        link.setAttribute("href", build(encodeURIComponent(prompt)));
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initAskAi = initAskAi;

})(typeof window !== "undefined" ? window : this);
