"use client";

/**
 * Sitenin CDN kütüphanesini export edilmiş navbar/footer'a bağlar:
 *   • gsap + js/core/nav.js'i sırayla yükler ve Sestek.initNav()'ı çağırır
 *     (mega-menü, hamburger, autohide — hepsi data-nav attribute'larından)
 *   • DevLink'in "This builtin is not currently supported" placeholder'larını
 *     gizler (Collection List + Animation)
 *   • Footer'ın Product / Solutions / Industries kolonlarını
 *     /demos/api/footer-links'ten gelen canlı CMS verisiyle doldurur
 */

import { useEffect } from "react";

const MOUNT = "/demos"; // environment mount path'i ile aynı tutulmalı
const CDN = "https://cdn.jsdelivr.net/gh/roicool/sestek@main";

const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
  `${CDN}/js/core/nav.js`,
];

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute("data-loaded") === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(src)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = () => {
      s.setAttribute("data-loaded", "true");
      resolve();
    };
    s.onerror = () => reject(new Error(`Script failed: ${src}`));
    document.head.appendChild(s);
  });
}

function hideUnsupportedPlaceholders() {
  document
    .querySelectorAll<HTMLElement>('[class*="wf-devlink-"] div')
    .forEach((el) => {
      if (
        el.childElementCount === 0 &&
        el.textContent?.startsWith("This builtin is not currently supported")
      ) {
        el.style.display = "none";
      }
    });
}

type FooterLink = { name: string; href: string };

function injectFooterLists(lists: Record<string, FooterLink[]>) {
  document.querySelectorAll<HTMLElement>(".footer__links").forEach((col) => {
    const heading =
      col.firstElementChild?.textContent?.trim().toLowerCase() ?? "";
    const items = lists[heading];
    if (!items?.length) return;
    if (col.querySelector("[data-cms-list]")) return; /* idempotent */

    const wrap = document.createElement("div");
    wrap.className = "gap-2 w-layout-vflex";
    wrap.setAttribute("data-cms-list", "");

    for (const item of items) {
      const a = document.createElement("a");
      a.className = "footer__links-text";
      a.setAttribute("data-underline", "");
      a.href = item.href;
      a.textContent = item.name;
      wrap.appendChild(a);
    }

    col.appendChild(wrap);
  });
}

export default function SiteRuntime() {
  useEffect(() => {
    hideUnsupportedPlaceholders();

    let cancelled = false;

    (async () => {
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (cancelled) return;
        (window as unknown as { Sestek?: { initNav?: () => void } }).Sestek?.initNav?.();
      } catch (err) {
        console.warn("[SiteRuntime]", err);
      }
    })();

    fetch(`${MOUNT}/api/footer-links`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.lists) injectFooterLists(data.lists);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
