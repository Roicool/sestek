/*!
 * pagination.js v1.7.0
 * Numbered pagination for a Webflow Collection List: replaces the native
 * Prev/Next-only pagination with clickable page numbers, AJAX page swaps
 * (no full reload), hover/idle prefetching, and back/forward support.
 *
 * Behaviour:
 *   • Reads the page count from Webflow's [data-page-count] (".w-page-count")
 *     text and the "?xxx_page=" param from the native pagination links, so
 *     it works with any Collection List name out of the box.
 *   • Renders Prev / 1 … 5 6 7 … 27 / Next next to the (now hidden) native
 *     pagination — see pagination.css, which keeps the native links in the
 *     DOM but visually hidden, as a no-JS-fallback / crawlable trail. Long
 *     ranges collapse to first + last + a window around the current page,
 *     with "…" markers; window width is data-pagination-siblings (default 1).
 *   • Clicking a page swaps just the Collection List's items via fetch +
 *     DOMParser (no full navigation), updates the URL with pushState, and
 *     re-renders the numbers for the new current/total page state.
 *   • After the swap, smooth-scrolls to the top of the list so you land at
 *     the start of the new page — routed through Lenis (Sestek.scrollTo) when
 *     present so it doesn't fight the smooth-scroll engine (that tug-of-war
 *     was the old "jump"); native smooth scroll otherwise. Override with
 *     data-pagination-scroll: "auto" (only when the list top is above the
 *     viewport) or "none" (swap in place); data-pagination-scroll-offset
 *     trims px off the top for a sticky navbar.
 *   • Hovering a page link (or idle time, throttled via requestIdleCallback)
 *     prefetches that page's HTML so the click feels instant. Skipped on
 *     Save-Data / 2G connections.
 *   • Multiple paginated lists on one page are supported, but each one
 *     MUST be wrapped in its own [data-pagination-scope] — with only a
 *     single paginated list on the page, that's optional and the nearest
 *     ".w-dyn-list" (or the whole document) is used instead. This avoids
 *     ever grabbing the wrong Collection List's items/page-count.
 *   • Back/forward browser navigation re-fetches and re-renders correctly.
 *   • After swapping in new items, dispatches a "sestek:list-updated" event
 *     on document so other components (e.g. site-utils.js's grid/list view
 *     toggle) can re-decorate the freshly swapped-in cards.
 *
 * API:
 *   Sestek.initPagination()   — wire every [data-page-count] block on the page
 *
 * CSS: css/components/pagination.css
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  function warn(msg) {
    if (global.console && typeof global.console.warn === "function") {
      global.console.warn("[Sestek.pagination] " + msg);
    }
  }

  function initPagination() {
    var wrappers = global.document.querySelectorAll(".w-pagination-wrapper");
    if (!wrappers.length) {
      warn("No .w-pagination-wrapper blocks found on the page — nothing to init.");
      return;
    }

    var cache = {};
    var singleInstance = wrappers.length === 1;

    Array.prototype.forEach.call(wrappers, function (wrapper) {
      // With only one paginated list on the page, falling back to the
      // nearest .w-dyn-list (or the whole document) is unambiguous. With
      // multiple lists, an explicit [data-pagination-scope] is required —
      // guessing risks grabbing another Collection List's items/page-count.
      var scope = wrapper.closest("[data-pagination-scope]") ||
                  (singleInstance && (wrapper.closest(".w-dyn-list") || global.document));

      if (!scope) {
        warn("Skipping a pagination block — multiple paginated lists found on the page; " +
          "add [data-pagination-scope] around this one's Collection List Wrapper to disambiguate.");
        return;
      }

      var listEl  = scope.querySelector(".w-dyn-items");
      var countEl = scope.querySelector(".w-page-count");
      if (!listEl || !countEl) {
        warn("Skipping a pagination block — needs both .w-dyn-items and .w-page-count in scope.");
        return;
      }

      var pageParam = getPageParam(wrapper);
      if (!pageParam) return; // single page (no "_page" links) — nothing to paginate

      var totalPages = getTotalPages(countEl);
      if (!totalPages || totalPages < 2) return;

      var container = render(wrapper, listEl, countEl, pageParam, totalPages, getCurrentPage(pageParam));
      prefetchIdle(pageParam, totalPages, getCurrentPage(pageParam));

      global.addEventListener("popstate", function () {
        if (getCurrentPage(pageParam) === activePage(container)) return;
        loadPage(global.location.href, listEl, countEl, pageParam, function (newCountEl) {
          container = render(wrapper, listEl, newCountEl, pageParam, getTotalPages(newCountEl), getCurrentPage(pageParam));
        });
      });

      function activePage(c) {
        var active = c.querySelector(".pagination-number.is-active");
        return active ? parseInt(active.textContent, 10) : 1;
      }
    });

    // ── Rendering ──────────────────────────────────────────────────
    function render(wrapper, listEl, countEl, pageParam, totalPages, currentPage) {
      var old = wrapper.parentNode.querySelector(".pagination-numbers");
      if (old) old.parentNode.removeChild(old);

      var container = global.document.createElement("nav");
      container.className = "pagination-numbers";
      container.setAttribute("aria-label", "Pagination");

      container.appendChild(makeArrow("prev", currentPage > 1 ? buildUrl(pageParam, currentPage - 1) : "#", currentPage === 1));

      var siblings = parseInt(configAttr(wrapper, "data-pagination-siblings"), 10);
      if (isNaN(siblings) || siblings < 0) siblings = 1;

      pageItems(currentPage, totalPages, siblings).forEach(function (item) {
        if (item === "…") {
          var gap = global.document.createElement("span");
          gap.className = "pagination-ellipsis";
          gap.setAttribute("aria-hidden", "true");
          gap.textContent = "…";
          container.appendChild(gap);
          return;
        }
        var a = global.document.createElement("a");
        a.href = buildUrl(pageParam, item);
        a.textContent = String(item);
        a.className = "pagination-number" + (item === currentPage ? " is-active" : "");
        a.setAttribute("aria-label", "Page " + item);
        if (item === currentPage) a.setAttribute("aria-current", "page");
        container.appendChild(a);
      });

      container.appendChild(makeArrow("next", currentPage < totalPages ? buildUrl(pageParam, currentPage + 1) : "#", currentPage === totalPages));

      container.addEventListener("mouseover", function (e) {
        var link = closestLink(e.target, container);
        var href = link && link.getAttribute("href");
        if (href && href !== "#") prefetch(href);
      });

      container.addEventListener("click", function (e) {
        var link = closestLink(e.target, container);
        if (!link) return;
        if (link.className.indexOf("is-disabled") !== -1) return;
        if (link.className.indexOf("is-active") !== -1) return;
        var href = link.getAttribute("href");
        if (!href || href === "#") return;
        e.preventDefault();
        loadPage(href, listEl, countEl, pageParam, function (newCountEl) {
          render(wrapper, listEl, newCountEl, pageParam, getTotalPages(newCountEl), getCurrentPage(pageParam));
          maybeScroll(wrapper, listEl);
        });
        history.pushState(null, "", href);
      });

      // ←/→ move focus between page links (Home/End jump to first/last) —
      // Enter/Space then activate the focused link natively, no extra wiring.
      container.addEventListener("keydown", function (e) {
        var keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
        if (keys.indexOf(e.key) === -1) return;

        var links = Array.prototype.slice.call(container.querySelectorAll("a"))
          .filter(function (a) { return a.className.indexOf("is-disabled") === -1; });
        var idx = links.indexOf(closestLink(e.target, container));
        if (idx === -1) return;

        e.preventDefault();
        if (e.key === "ArrowLeft")  links[Math.max(idx - 1, 0)].focus();
        if (e.key === "ArrowRight") links[Math.min(idx + 1, links.length - 1)].focus();
        if (e.key === "Home")       links[0].focus();
        if (e.key === "End")        links[links.length - 1].focus();
      });

      wrapper.parentNode.insertBefore(container, wrapper.nextSibling);
      return container;
    }

    function makeArrow(kind, href, disabled) {
      var a = global.document.createElement("a");
      a.href = href;
      a.className = "pagination-arrow pagination-arrow--" + kind + (disabled ? " is-disabled" : "");
      a.setAttribute("aria-label", kind === "prev" ? "Previous page" : "Next page");
      if (disabled) a.setAttribute("aria-disabled", "true");
      return a;
    }

    function closestLink(target, boundary) {
      var node = target;
      while (node && node !== boundary) {
        if (node.tagName === "A") return node;
        node = node.parentNode;
      }
      return null;
    }

    // ── Windowing + scroll ─────────────────────────────────────────
    // Build the page list with first/last always shown, a window of
    // `siblings` pages on each side of the current page, and "…" markers
    // for any gap wider than a single page (a lone hidden page is shown,
    // never replaced by a dot — "1 … 3" would waste a slot, so it's "1 2 3").
    //   27 pages, on page 6, siblings 1  →  1 … 5 6 7 … 27
    //   27 pages, on page 1, siblings 1  →  1 2 … 27
    function pageItems(current, total, siblings) {
      if (total <= 1) return total === 1 ? [1] : [];

      var left  = Math.max(2, current - siblings);
      var right = Math.min(total - 1, current + siblings);
      var items = [1];

      if (left > 2) items.push(left === 3 ? 2 : "…");
      for (var i = left; i <= right; i++) items.push(i);
      if (right < total - 1) items.push(right === total - 2 ? total - 1 : "…");

      items.push(total);
      return items;
    }

    // Read a config attribute from the wrapper or its enclosing
    // [data-pagination-scope] — whichever sets it (scope wins).
    function configAttr(wrapper, name) {
      var scopeEl = wrapper.closest("[data-pagination-scope]");
      if (scopeEl && scopeEl.hasAttribute(name)) return scopeEl.getAttribute(name);
      if (wrapper.hasAttribute(name)) return wrapper.getAttribute(name);
      return null;
    }

    // Scroll behaviour after a page swap. Default: smooth-scroll to the top of
    // the list so you land at the start of the freshly loaded page. Routed
    // through Lenis (Sestek.scrollTo) when present — a native scrollIntoView
    // fights Lenis's own smooth-scroll loop, and that tug-of-war was the janky
    // "jump". Falls back to native smooth scroll when Lenis isn't on the page.
    // Configure via data-pagination-scroll on the wrapper or [data-pagination-scope]:
    //   "top" (default) — always scroll to the list top
    //   "auto"          — only when the list top is above the viewport
    //   "none"          — stay put, swap in place
    // data-pagination-scroll-offset trims px off the top (e.g. a sticky navbar).
    function maybeScroll(wrapper, listEl) {
      var mode = (configAttr(wrapper, "data-pagination-scroll") || "top").toLowerCase();
      if (mode === "none") return;

      var section = wrapper.closest("[data-pagination-scope]") || listEl;
      if (!section || !section.getBoundingClientRect) return;

      var offset = parseInt(configAttr(wrapper, "data-pagination-scroll-offset"), 10);
      if (isNaN(offset)) offset = 0;

      var rectTop = section.getBoundingClientRect().top;
      if (mode === "auto" && rectTop >= offset) return; // already comfortably in view

      var top = rectTop + (global.pageYOffset || 0) - offset;

      // Prefer Lenis for a frame-perfect, engine-consistent scroll.
      if (typeof global.Sestek !== "undefined" &&
          typeof global.Sestek.scrollTo === "function" &&
          global.lenisInstance) {
        global.Sestek.scrollTo(top, {
          duration: 0.9,
          easing: function (t) { return 1 - Math.pow(1 - t, 3); },
        });
      } else {
        global.scrollTo({ top: top, behavior: "smooth" });
      }
    }

    // ── Data loading ───────────────────────────────────────────────
    function fetchPage(url) {
      if (!cache[url]) {
        cache[url] = global.fetch(url).then(function (res) { return res.text(); });
      }
      return cache[url];
    }

    function prefetch(url) {
      fetchPage(url);
    }

    // Real-size skeleton cards: measure each current item's box and stamp a
    // shimmering placeholder of the exact same size/position over it, so the
    // loading state never jumps once real content lands.
    function buildSkeleton(listEl) {
      var frag = global.document.createDocumentFragment();
      var listRect = listEl.getBoundingClientRect();

      Array.prototype.forEach.call(listEl.children, function (item) {
        var r = item.getBoundingClientRect();
        var skel = global.document.createElement("div");
        skel.className = "pagination-skeleton-card";
        skel.style.position = "absolute";
        skel.style.top    = (r.top  - listRect.top)  + "px";
        skel.style.left   = (r.left - listRect.left) + "px";
        skel.style.width  = r.width  + "px";
        skel.style.height = r.height + "px";
        frag.appendChild(skel);
      });

      return frag;
    }

    // Finds the same scope inside a freshly fetched page's document by
    // matching the .w-pagination-wrapper whose links carry this instance's
    // pageParam — mirrors getPageParam(), just run in reverse. Needed
    // because a fetched page can contain other (non-paginated-here) CMS
    // lists too, and a plain doc-wide ".w-dyn-items" lookup would grab
    // whichever one happens to come first in the markup.
    function findScopeInDoc(doc, pageParam) {
      var docWrappers = doc.querySelectorAll(".w-pagination-wrapper");
      for (var i = 0; i < docWrappers.length; i++) {
        var links = docWrappers[i].querySelectorAll("a");
        for (var j = 0; j < links.length; j++) {
          var href = links[j].getAttribute("href") || "";
          if (href.indexOf(pageParam + "=") !== -1) {
            return docWrappers[i].closest("[data-pagination-scope]") ||
                   (docWrappers.length === 1 && (docWrappers[i].closest(".w-dyn-list") || doc));
          }
        }
      }
      return null;
    }

    function loadPage(url, listEl, countEl, pageParam, onDone) {
      listEl.classList.add("is-loading");
      listEl.appendChild(buildSkeleton(listEl));

      fetchPage(url).then(function (html) {
        var doc = new global.DOMParser().parseFromString(html, "text/html");
        var scope = findScopeInDoc(doc, pageParam);
        if (!scope) {
          warn("Couldn't find this list's scope in the fetched page — aborting swap to avoid pulling another CMS list's data.");
          listEl.classList.remove("is-loading");
          return;
        }

        var newItems = scope.querySelector(".w-dyn-items");
        if (newItems) {
          listEl.classList.add("is-entering"); // start the new items at opacity:0
          listEl.innerHTML = newItems.innerHTML; // also clears the skeleton + old items
          // Let anything that decorates list items (e.g. site-utils.js's
          // grid/list view toggle) re-stamp its classes onto the new cards —
          // they arrive with none of that runtime state.
          global.document.dispatchEvent(new CustomEvent("sestek:list-updated", { detail: { listEl: listEl } }));
        }

        var newCount = scope.querySelector(".w-page-count");
        if (newCount) countEl.textContent = newCount.textContent;

        listEl.classList.remove("is-loading");
        // Next frame, so the opacity:0 -> 1 change is a transition, not a jump.
        global.requestAnimationFrame(function () {
          listEl.classList.remove("is-entering");
        });
        onDone(countEl);
      }, function () {
        listEl.classList.remove("is-loading"); // fetch failed — don't leave the skeleton stuck
      });
    }

    function prefetchIdle(pageParam, totalPages, currentPage) {
      var conn = global.navigator.connection || global.navigator.mozConnection || global.navigator.webkitConnection;
      if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ""))) return;

      var pages = [];
      for (var i = 1; i <= totalPages; i++) {
        if (i !== currentPage) pages.push(i);
      }

      var idx = 0;
      function next(deadline) {
        if (idx >= pages.length) return;
        if (!deadline || deadline.timeRemaining() > 10) {
          prefetch(buildUrl(pageParam, pages[idx++]));
        }
        if (idx < pages.length) schedule();
      }
      function schedule() {
        if (global.requestIdleCallback) {
          global.requestIdleCallback(next, { timeout: 3000 });
        } else {
          global.setTimeout(function () { next(null); }, 500);
        }
      }
      schedule();
    }

    // ── Page/URL helpers ─────────────────────────────────────────────
    function getTotalPages(countEl) {
      var nums = (countEl.textContent || "").match(/\d+/g);
      return nums ? parseInt(nums[nums.length - 1], 10) : 0;
    }

    function getCurrentPage(pageParam) {
      var re = new RegExp("[?&]" + pageParam + "=(\\d+)");
      var m = global.location.search.match(re);
      return m ? parseInt(m[1], 10) : 1;
    }

    function getPageParam(wrapper) {
      var links = wrapper.querySelectorAll("a");
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute("href") || "";
        var m = href.match(/[?&]([^=&]+_page)=\d+/);
        if (m) return m[1];
      }
      return null;
    }

    function buildUrl(paramKey, pageNum) {
      var path = global.location.pathname;
      var search = global.location.search.slice(1);
      var params = [];

      if (search) {
        var parts = search.split("&");
        for (var i = 0; i < parts.length; i++) {
          if (parts[i] && parts[i].indexOf(paramKey + "=") !== 0) {
            params.push(parts[i]);
          }
        }
      }

      if (pageNum > 1) params.push(paramKey + "=" + pageNum);

      return path + (params.length ? "?" + params.join("&") : "");
    }
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initPagination = initPagination;
})(typeof window !== "undefined" ? window : this);
