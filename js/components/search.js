/*!
 * search.js v1.3.0
 * Full-site search overlay — click a trigger to blur the whole page behind
 * a frosted panel, type to filter blog posts client-side (no API call).
 *
 * Behaviour:
 *   • Trigger toggles the overlay open/closed (icon is usually an <a>).
 *   • Index is rebuilt on every open, so lazily/CMS/Finsweet-rendered posts
 *     are always included; the source is re-resolved each time too.
 *   • Backdrop closes only on a click that both starts AND ends on the
 *     backdrop — never the opening click, a bubbled click from the panel,
 *     or a text-drag released over the backdrop.
 *   • Accessible: focus is trapped in the panel, ESC closes, ↑/↓ move
 *     through results and Enter opens the highlighted one; triggers carry
 *     aria-expanded and the overlay carries aria-hidden.
 *
 * API:
 *   Sestek.initSearch()   — wire the [data-search] block on the page
 *
 * ── DOM ──────────────────────────────────────────────────────────
 *
 *   <div data-search data-search-limit="8" data-search-min-chars="2">
 *
 *     <!-- one or more triggers, anywhere on the page (e.g. in nav) -->
 *     <button data-search-trigger aria-label="Search">
 *       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 *         <circle cx="11" cy="11" r="8"></circle>
 *         <path d="m21 21-4.3-4.3"></path>
 *       </svg>
 *     </button>
 *
 *     <div data-search-overlay>
 *       <div data-search-panel role="dialog" aria-modal="true">
 *         <div data-search-bar>
 *           <input data-search-input type="text" placeholder="Search…" autocomplete="off">
 *           <button data-search-close aria-label="Close">×</button>
 *         </div>
 *         <!-- optional heading shown above results, e.g. "Blog" / "Resources" -->
 *         <p data-search-results-label hidden>Blog</p>
 *         <div data-search-results></div>
 *         <p data-search-empty hidden>No results found.</p>
 *       </div>
 *     </div>
 *
 *     <!-- Webflow Collection List of blog posts — read-only source for the
 *          index. Can be the page's existing VISIBLE list (e.g. the blog
 *          grid itself) or a separate hidden one; search.js never hides or
 *          alters it. It does NOT have to live inside [data-search] — the
 *          source is looked up inside the wrapper first, then anywhere on the
 *          page. Note: if Webflow paginates this list, only the posts
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

  var raf = global.requestAnimationFrame
    ? global.requestAnimationFrame.bind(global)
    : function (cb) { return setTimeout(cb, 16); };

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
    var labelEl   = root.querySelector("[data-search-results-label]");
    // Source can live inside the [data-search] block OR anywhere on the page
    // (e.g. the existing visible blog grid in its own section) — look inside
    // the wrapper first, then fall back to a document-wide search.
    var source    = root.querySelector("[data-search-source]") ||
                    document.querySelector("[data-search-source]");
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

    var debounceTimer     = null;
    var lastFocused       = null;
    var pressedOnBackdrop = false;
    var index             = [];   // (re)built on every open — survives lazy/CMS/Finsweet renders
    var resultCards       = [];   // anchors currently on screen, for keyboard nav
    var activeResult      = -1;   // highlighted result (-1 = none)

    // Source can be re-rendered/replaced after load (Finsweet, pagination),
    // so resolve it fresh each time rather than caching one node reference.
    function currentSource() {
      return root.querySelector("[data-search-source]") ||
             document.querySelector("[data-search-source]");
    }

    // Visible, tabbable elements inside the panel — for the focus trap.
    function focusables() {
      return Array.prototype.slice
        .call(panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), ' +
          'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ))
        .filter(function (el) {
          return el.offsetWidth || el.offsetHeight || el.getClientRects().length;
        });
    }

    function setActiveResult(next) {
      if (!resultCards.length) { activeResult = -1; return; }
      if (activeResult > -1 && resultCards[activeResult]) {
        resultCards[activeResult].classList.remove("is-active");
      }
      activeResult = (next + resultCards.length) % resultCards.length;
      var card = resultCards[activeResult];
      card.classList.add("is-active");
      if (typeof card.scrollIntoView === "function") {
        card.scrollIntoView({ block: "nearest" });
      }
    }

    function runSearch() {
      var query = input.value.trim();
      activeResult = -1;

      if (query.length < minChars) {
        resultsEl.innerHTML = "";
        resultCards = [];
        if (emptyEl) emptyEl.hidden = true;
        if (labelEl) labelEl.hidden = true;
        return;
      }

      var matches = filterIndex(index, query, limit);
      renderResults(resultsEl, emptyEl, matches, query);
      resultCards = Array.prototype.slice.call(resultsEl.querySelectorAll(".search__result"));
      if (labelEl) labelEl.hidden = !matches.length;
    }

    function onKeydown(e) {
      if (e.key === "Escape") { close(); return; }

      // Focus trap — keep Tab inside the panel while open.
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0];
        var last  = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      // Arrow keys move through results; Enter opens the highlighted one.
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveResult(activeResult + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveResult(activeResult - 1);
      } else if (e.key === "Enter" && activeResult > -1 && resultCards[activeResult]) {
        e.preventDefault();
        global.location.href = resultCards[activeResult].href;
      }
    }

    function open() {
      if (overlay.classList.contains("is-open")) return;

      index             = buildIndex(currentSource());  // fresh every open
      pressedOnBackdrop = false;
      activeResult      = -1;
      resultCards       = [];
      input.value       = "";
      resultsEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = true;
      if (labelEl) labelEl.hidden = true;

      overlay.classList.add("is-open");
      overlay.removeAttribute("aria-hidden");
      triggers.forEach(function (t) { t.setAttribute("aria-expanded", "true"); });
      document.documentElement.classList.add("search-lock");
      if (global.Sestek && typeof global.Sestek.stopScroll === "function") {
        global.Sestek.stopScroll();
      }

      lastFocused = document.activeElement;
      document.addEventListener("keydown", onKeydown);
      raf(function () { input.focus(); });
    }

    function close() {
      if (!overlay.classList.contains("is-open")) return;

      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      triggers.forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
      document.documentElement.classList.remove("search-lock");
      if (global.Sestek && typeof global.Sestek.startScroll === "function") {
        global.Sestek.startScroll();
      }

      document.removeEventListener("keydown", onKeydown);
      input.value = "";
      resultsEl.innerHTML = "";
      resultCards = [];
      activeResult = -1;
      if (emptyEl) emptyEl.hidden = true;
      if (labelEl) labelEl.hidden = true;

      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function (e) {
        e.preventDefault();   // the search icon is often an <a href="#">
        if (overlay.classList.contains("is-open")) close();
        else open();
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);

    // Backdrop-to-close: only fire when a click BOTH starts and ends on the
    // backdrop itself. This ignores (a) the click that opened the overlay,
    // (b) clicks bubbling up from inside the panel, and (c) a text selection
    // drag that happens to release over the backdrop.
    overlay.addEventListener("mousedown", function (e) {
      pressedOnBackdrop = (e.target === overlay);
    });
    overlay.addEventListener("click", function (e) {
      if (pressedOnBackdrop && e.target === overlay) close();
      pressedOnBackdrop = false;
    });

    input.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, DEBOUNCE_MS);
    });

    overlay.setAttribute("aria-hidden", "true");
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initSearch = initSearch;

})(typeof window !== "undefined" ? window : this);
