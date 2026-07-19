"use client";

/**
 * Sitenin CDN kütüphanesini export edilmiş navbar'a (ve app geneline) bağlar:
 *   • gsap + js/core/nav.js + js/effects/link-underline.js'i sırayla yükler
 *   • Sestek.initNav() — mega-menü, hamburger, autohide (data-nav attr'ları)
 *   • Sestek.initLinkUnderline() — [data-underline] hover çizgisi
 *     (footer'daki linkler dahil; init link başına guard'lı, tekrar güvenli)
 *   • DevLink'in "not supported" placeholder'ları görünürse gizler
 */

import { useEffect } from "react";

const CDN = "https://cdn.jsdelivr.net/gh/roicool/sestek@main";

const SCRIPTS = [
  "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js",
  `${CDN}/js/core/nav.js`,
  `${CDN}/js/effects/link-underline.js`,
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

type SestekGlobal = {
  Sestek?: { initNav?: () => void; initLinkUnderline?: () => void };
};

export default function SiteRuntime() {
  useEffect(() => {
    hideUnsupportedPlaceholders();

    let cancelled = false;

    (async () => {
      try {
        for (const src of SCRIPTS) await loadScript(src);
        if (cancelled) return;
        const S = (window as unknown as SestekGlobal).Sestek;
        S?.initNav?.();
        S?.initLinkUnderline?.();
      } catch (err) {
        console.warn("[SiteRuntime]", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
