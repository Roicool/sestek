/*!
 * ask-ai.js v1.0.0
 * "Ask AI" buttons — each link deep-links straight into a chosen AI
 * assistant's chat with a pre-filled prompt (e.g. "Sestek nedir, ne iş
 * yapar?"), so a visitor — or an AI agent reading the page — can one click
 * and get an answer grounded in whatever prompt you write in Webflow.
 *
 * DOM (Webflow):
 *   <div data-ask-ai data-ask-ai-prompt="Sestek nedir, ne iş yapar, hangi
 *        ürün ve çözümleri sunar? https://sestek.com sitesindeki bilgilere
 *        dayanarak anlat.">
 *     <a data-ask-ai-target="chatgpt">...icon...</a>
 *     <a data-ask-ai-target="claude">...icon...</a>
 *     <a data-ask-ai-target="perplexity">...icon...</a>
 *   </div>
 *
 * Attributes:
 *   data-ask-ai          wraps one or more targets (required)
 *   data-ask-ai-prompt   the prompt to send — on the wrapper (shared by all
 *                        links inside it) or on an individual link to
 *                        override just that one assistant. Falls back to a
 *                        generic "tell me about <page title>" prompt built
 *                        from document.title + location.href.
 *   data-ask-ai-target   "chatgpt" | "claude" | "perplexity"   (required per link)
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
  };

  function defaultPrompt() {
    return "Bana " + global.document.title + " hakkında bilgi ver: " + global.location.href;
  }

  /**
   * Wires every [data-ask-ai-target] link inside every [data-ask-ai] wrapper
   * to its assistant's prefilled-prompt URL.
   * @param {string} [selector="[data-ask-ai]"]
   */
  function initAskAi(selector) {
    var wraps = global.document.querySelectorAll(selector || "[data-ask-ai]");
    Array.prototype.forEach.call(wraps, function (wrap) {
      var wrapPrompt = wrap.getAttribute("data-ask-ai-prompt") || defaultPrompt();
      var links = wrap.querySelectorAll("[data-ask-ai-target]");
      Array.prototype.forEach.call(links, function (link) {
        var target = link.getAttribute("data-ask-ai-target");
        var build = BUILDERS[target];
        if (!build) {
          console.warn("[Sestek AskAI] Unknown target:", target);
          return;
        }
        var prompt = link.getAttribute("data-ask-ai-prompt") || wrapPrompt;
        link.setAttribute("href", build(encodeURIComponent(prompt)));
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      });
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initAskAi = initAskAi;

})(typeof window !== "undefined" ? window : this);
