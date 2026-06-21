/*!
 * pagination.js v1.2.0
 * Numbered pagination for a Webflow Collection List: replaces the native
 * Prev/Next-only pagination with clickable page numbers, AJAX page swaps
 * (no full reload), hover/idle prefetching, and back/forward support.
 *
 * Behaviour:
 *   • Reads the page count from Webflow's [data-page-count] (".w-page-count")
 *     text and the "?xxx_page=" param from the native pagination links, so
 *     it works with any Collection List name out of the box.
 *   • Renders Prev / 1 2 3 … / Next next to the (now hidden) native
 *     pagination — see pagination.css, which keeps the native links in the
 *     DOM but visually hidden, as a no-JS-fallback / crawlable trail.
 *   • Clicking a page swaps just the Collection List's items via fetch +
 *     DOMParser (no full navigation), updates the URL with pushState, and
 *     re-renders the numbers for the new current/total page state.
 *   • Hovering a page link (or idle time, throttled via requestIdleCallback)
 *     prefetches that page's HTML so the click feels instant. Skipped on
 *     Save-Data / 2G connections.
 *   • Multiple paginated lists on one page are supported — each instance
 *     scopes its item-list/page-count lookups to its own nearest
 *     [data-pagination-scope] (falls back to the Collection List's
 *     ".w-dyn-list" wrapper, then the whole document).
 *   • Back/forward browser navigation re-fetches and re-renders correctly.
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

    Array.prototype.forEach.call(wrappers, function (wrapper) {
      var scope = wrapper.closest("[data-pagination-scope]") ||
                  wrapper.closest(".w-dyn-list") ||
                  global.document;

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
        loadPage(global.location.href, listEl, countEl, function (newCountEl) {
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

      for (var i = 1; i <= totalPages; i++) {
        var a = global.document.createElement("a");
        a.href = buildUrl(pageParam, i);
        a.textContent = String(i);
        a.className = "pagination-number" + (i === currentPage ? " is-active" : "");
        if (i === currentPage) a.setAttribute("aria-current", "page");
        container.appendChild(a);
      }

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
        loadPage(href, listEl, countEl, function (newCountEl) {
          render(wrapper, listEl, newCountEl, pageParam, getTotalPages(newCountEl), getCurrentPage(pageParam));
          var section = wrapper.closest("[data-pagination-scope]") || listEl;
          if (section && section.scrollIntoView) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
          }
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

    function loadPage(url, listEl, countEl, onDone) {
      listEl.classList.add("is-loading");
      listEl.appendChild(buildSkeleton(listEl));

      fetchPage(url).then(function (html) {
        var doc = new global.DOMParser().parseFromString(html, "text/html");

        var newItems = doc.querySelector(".w-dyn-items");
        if (newItems) {
          listEl.classList.add("is-entering"); // start the new items at opacity:0
          listEl.innerHTML = newItems.innerHTML; // also clears the skeleton + old items
        }

        var newCount = doc.querySelector(".w-page-count");
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
