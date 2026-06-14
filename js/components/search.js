/*!
 * search.js v1.1.1
 * Full-site search overlay — click a trigger to blur the whole page behind
 * a frosted panel, type to filter blog posts client-side (no API call).
 *
 * API:
 *   Sestek.initSearch()   — wire the [data-search] block on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-search data-search-limit="8" data-search-min-chars="2">
 *
 *     <!-- one or more triggers, anywhere on the page (e.g. in nav) -->
 *     <button data-search-trigger aria-label="Search">…icon…</button>
 *
 *     <div data-search-overlay>
 *       <div data-search-panel role="dialog" aria-modal="true">
 *         <div data-search-bar>
 *           <input data-search-input type="text" placeholder="Search…" autocomplete="off">
 *           <button data-search-close aria-label="Close">×</button>
 *         </div>
 *         <div data-search-results></div>
 *         <p data-search-empty hidden>No results found.</p>
 *       </div>
 *     </div>
 *
 *     <!-- Webflow Collection List of blog posts — read-only source for the
 *          index. Can be the page's existing VISIBLE list (e.g. the blog
 *          grid itself) or a separate hidden one; search.js never hides or
 *          alters it. Note: if Webflow paginates this list, only the posts
 *          rendered on the current page are searchable. -->
 *     <div data-search-source>
 *       <a data-search-item href="/blog/post-slug" data-search-title="Post title">
 *         <img data-search-image src="…" alt="">
 *       </a>
 *       …
 *     </div>
 *
 *   </div>
 *
 * ── Attributes ────────────────────────────────────────────────────
 *
 *   data-search-limit       max results shown                 (default 8)
 *   data-search-min-chars   chars typed before filtering runs  (default 2)
 *
 *   On each [data-search-item]:
 *     data-search-title     text matched + highlighted (falls back to textContent)
 *     href / data-search-url  link target for the result card
 *     [data-search-image]   <img> used as the result thumbnail
 *
 * Matching is diacritic-insensitive for Turkish (ş/ç/ğ/ö/ü/ı/İ fold to
 * plain ASCII before comparison), case-insensitive, and ranks titles that
 * START WITH the query above titles that merely contain it.
 *
 * Scroll is locked while open — uses Sestek.stopScroll/startScroll (Lenis)
 * if present, plus a `.search-lock` class on <html> as a CSS fallback.
 *
 * CSS: css/components/search.css
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var DEFAULT_LIMIT     = 8;
  var DEFAULT_MIN_CHARS = 2;
  var DEBOUNCE_MS       = 120;

  // 1:1 char map so highlight indices stay aligned after normalizing.
  var FOLD_MAP = {
    "İ": "i", "I": "i", "ı": "i",
    "Ş": "s", "ş": "s",
    "Ç": "c", "ç": "c",
    "Ğ": "g", "ğ": "g",
    "Ö": "o", "ö": "o",
    "Ü": "u", "ü": "u"
  };

  function normalize(str) {
    var out = "";
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      out += FOLD_MAP[ch] || ch.toLowerCase();
    }
    return out;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function highlight(title, query) {
    var normTitle = normalize(title);
    var normQuery = normalize(query);
    var idx = normTitle.indexOf(normQuery);
    if (idx === -1) return escapeHtml(title);

    var before = title.slice(0, idx);
    var match  = title.slice(idx, idx + query.length);
    var after  = title.slice(idx + query.length);
    return escapeHtml(before) + "<mark>" + escapeHtml(match) + "</mark>" + escapeHtml(after);
  }

  function buildIndex(source) {
    if (!source) return [];
    return Array.from(source.querySelectorAll("[data-search-item]")).map(function (el) {
      var title = el.getAttribute("data-search-title") || el.textContent.trim();
      var img   = el.querySelector("[data-search-image]");

      return {
        title: title,
        norm: normalize(title),
        url: el.getAttribute("href") || el.getAttribute("data-search-url") || "#",
        imgSrc: img ? (img.currentSrc || img.src) : "",
        imgSrcset: img ? (img.getAttribute("srcset") || "") : "",
        imgAlt: img ? (img.getAttribute("alt") || "") : ""
      };
    });
  }

  function filterIndex(index, query, limit) {
    var normQuery   = normalize(query);
    var startsWith  = [];
    var includes    = [];

    index.forEach(function (item) {
      var pos = item.norm.indexOf(normQuery);
      if (pos === 0) startsWith.push(item);
      else if (pos > 0) includes.push(item);
    });

    return startsWith.concat(includes).slice(0, limit);
  }

  function renderResults(resultsEl, emptyEl, matches, query) {
    resultsEl.innerHTML = "";

    if (!matches.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    matches.forEach(function (item) {
      var card = document.createElement("a");
      card.className = "search__result";
      card.href = item.url;

      var media = document.createElement("div");
      media.className = "search__result-media";

      if (item.imgSrc) {
        var img = document.createElement("img");
        img.src = item.imgSrc;
        if (item.imgSrcset) img.srcset = item.imgSrcset;
        img.alt = item.imgAlt;
        img.loading = "lazy";
        media.appendChild(img);
      }

      var title = document.createElement("div");
      title.className = "search__result-title";
      title.innerHTML = highlight(item.title, query);

      card.appendChild(media);
      card.appendChild(title);
      resultsEl.appendChild(card);
    });
  }

  function warn(msg) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek.search] " + msg);
    }
  }

  function initSearch(selector) {
    var root = document.querySelector(selector || "[data-search]");
    if (!root) {
      warn("No [data-search] block found on the page — nothing to init.");
      return;
    }

    var overlay   = root.querySelector("[data-search-overlay]");
    var panel     = root.querySelector("[data-search-panel]");
    var input     = root.querySelector("[data-search-input]");
    var closeBtn  = root.querySelector("[data-search-close]");
    var resultsEl = root.querySelector("[data-search-results]");
    var emptyEl   = root.querySelector("[data-search-empty]");
    var source    = root.querySelector("[data-search-source]");
    var triggers  = Array.from(document.querySelectorAll("[data-search-trigger]"));

    // Overlay + input are the bare minimum for the panel to open/work.
    if (!overlay || !input || !resultsEl) {
      warn("Missing required element(s): " +
        [!overlay && "[data-search-overlay]", !input && "[data-search-input]",
         !resultsEl && "[data-search-results]"].filter(Boolean).join(", ") +
        ". Search not initialized.");
      return;
    }

    // Missing source/triggers are non-fatal — warn so it's debuggable, but
    // still wire the overlay so the open/close UI at least works.
    if (!source) {
      warn("No [data-search-source] found — the overlay will open but results " +
        "will be empty. Add data-search-source to your blog Collection List.");
    }
    if (!triggers.length) {
      warn("No [data-search-trigger] found — nothing can open the overlay. " +
        "Add data-search-trigger to your search icon/button.");
    }

    var limit    = parseInt(root.getAttribute("data-search-limit"), 10) || DEFAULT_LIMIT;
    var minChars = parseInt(root.getAttribute("data-search-min-chars"), 10) || DEFAULT_MIN_CHARS;
    var index    = buildIndex(source);

    var debounceTimer = null;
    var lastFocused   = null;

    function handleInput() {
      var query = input.value.trim();

      if (query.length < minChars) {
        resultsEl.innerHTML = "";
        if (emptyEl) emptyEl.hidden = true;
        return;
      }

      renderResults(resultsEl, emptyEl, filterIndex(index, query, limit), query);
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    function open() {
      if (overlay.classList.contains("is-open")) return;

      overlay.classList.add("is-open");
      document.documentElement.classList.add("search-lock");
      if (global.Sestek && typeof global.Sestek.stopScroll === "function") {
        global.Sestek.stopScroll();
      }

      lastFocused = document.activeElement;
      document.addEventListener("keydown", onKeydown);
      requestAnimationFrame(function () { input.focus(); });
    }

    function close() {
      if (!overlay.classList.contains("is-open")) return;

      overlay.classList.remove("is-open");
      document.documentElement.classList.remove("search-lock");
      if (global.Sestek && typeof global.Sestek.startScroll === "function") {
        global.Sestek.startScroll();
      }

      document.removeEventListener("keydown", onKeydown);
      input.value = "";
      resultsEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = true;

      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", open);
    });

    if (closeBtn) closeBtn.addEventListener("click", close);

    overlay.addEventListener("click", function (e) {
      if (!panel || !panel.contains(e.target)) close();
    });

    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(handleInput, DEBOUNCE_MS);
    });
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSearch = initSearch;

})(typeof window !== "undefined" ? window : this);
