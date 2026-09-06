/*!
 * LogoMarquee — CMS-fed infinite logo band (React port of js/components/marquee.js)
 *
 * Designer'da bir Slot açar: içine normal bir Webflow Collection List
 * (Clients → Logo image) bırakılır. Component slot'a düşen <img>'leri okur,
 * kendi track'inde yeterli sayıda kopya üretip sonsuz döngüde kaydırır.
 * Böylece CMS'e logo eklendikçe band kendiliğinden güncellenir.
 *
 * marquee.js ile aynı his:
 *   • sabit px/s hız, yön seçilebilir (left / right)
 *   • hover'da yumuşak duraklama, ayrılınca yumuşak hızlanma
 *   • drag + momentum (pointer events — mouse, touch, pen); slop altındaki
 *     basış drag sayılmaz
 *   • prefers-reduced-motion → hareket yok, statik tek set
 *   • kenar fade (mask-image), grab cursor
 *
 * Bağımlılık yok (GSAP yok) — ticker requestAnimationFrame, hız geçişleri
 * üstel yaklaşma ile yumuşatılır.
 *
 * Shadow DOM notu: slot içeriği sitenin CSS'ini korur ama bizim ürettiğimiz
 * kopyalar korumaz — logo boyutu / boşluk burada, component içinde stillenir.
 * Slot'ta hiç <img> bulunmazsa (ör. Designer'da henüz liste bırakılmamış)
 * slot içeriği olduğu gibi gösterilir.
 */

import * as React from "react";

export interface LogoMarqueeProps {
  logos?: React.ReactNode;
  speed?: number;
  direction?: string;
  logoSize?: number;
  gap?: number;
  pauseOnHover?: boolean;
  drag?: boolean;
  fadeEdges?: boolean;
  minHeight?: number;
}

type Logo = { src: string; srcset?: string; sizes?: string; alt: string };

const DRAG_SLOP = 6;

function collectImages(root: HTMLElement): Logo[] {
  const imgs: HTMLImageElement[] = [];
  // 1) images rendered straight into our subtree
  root.querySelectorAll("img").forEach((i) => imgs.push(i));
  // 2) images projected through <slot> elements (light DOM children)
  root.querySelectorAll("slot").forEach((slot) => {
    const assigned = (slot as HTMLSlotElement).assignedElements({ flatten: true });
    assigned.forEach((el) => {
      if (el instanceof HTMLImageElement) imgs.push(el);
      el.querySelectorAll("img").forEach((i) => imgs.push(i));
    });
  });
  const seen = new Set<string>();
  const out: Logo[] = [];
  imgs.forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (!src) return;
    const key = src + "|" + (img.getAttribute("srcset") || "");
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      src,
      srcset: img.getAttribute("srcset") || undefined,
      sizes: img.getAttribute("sizes") || undefined,
      alt: img.getAttribute("alt") || "",
    });
  });
  return out;
}

const CSS = `
.slm{position:relative;width:100%;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:pan-y;box-sizing:border-box}
.slm.has-fade{-webkit-mask-image:linear-gradient(to right,transparent 0,#000 12%,#000 88%,transparent 100%);mask-image:linear-gradient(to right,transparent 0,#000 12%,#000 88%,transparent 100%)}
.slm.can-drag{cursor:grab}
.slm.can-drag.is-dragging{cursor:grabbing}
.slm-track{display:inline-flex;align-items:center;flex-wrap:nowrap;will-change:transform;white-space:nowrap}
.slm-set{display:inline-flex;align-items:center;flex-wrap:nowrap;flex-shrink:0}
.slm-item{display:flex;align-items:center;justify-content:center;flex-shrink:0}
.slm-logo{display:block;object-fit:contain;pointer-events:none;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
.slm-item:hover .slm-logo{transform:scale(1.07)}
.slm-src{position:absolute;inset:0;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none}
.slm-fallback{display:block}
@media (prefers-reduced-motion:reduce){
  .slm-track{will-change:auto;transform:none!important}
  .slm-logo{transition:none}
}
`;

export function LogoMarquee({
  logos,
  speed = 60,
  direction = "Left",
  logoSize = 6.25,
  gap = 3,
  pauseOnHover = true,
  drag = true,
  fadeEdges = true,
  minHeight = 0,
}: LogoMarqueeProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const srcRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const setRef = React.useRef<HTMLDivElement>(null);

  const [items, setItems] = React.useState<Logo[]>([]);
  const [copies, setCopies] = React.useState(2);
  const [dragging, setDragging] = React.useState(false);

  const baseSpeed = Math.abs(Number(speed) || 0) * (String(direction).toLowerCase() === "right" ? -1 : 1);

  /* ── Read the slot: which logos did the CMS give us? ─────────── */
  React.useEffect(() => {
    const src = srcRef.current;
    if (!src) return;
    let raf = 0;
    const read = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = collectImages(src);
        setItems((prev) => {
          if (prev.length === next.length && prev.every((p, i) => p.src === next[i].src && p.srcset === next[i].srcset)) return prev;
          return next;
        });
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(src, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "srcset"] });
    src.querySelectorAll("slot").forEach((s) => s.addEventListener("slotchange", read));
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      src.querySelectorAll("slot").forEach((s) => s.removeEventListener("slotchange", read));
    };
  }, []);

  /* ── How many copies of the set cover the viewport twice? ────── */
  React.useEffect(() => {
    const root = rootRef.current;
    const set = setRef.current;
    if (!root || !set || !items.length) return;
    const measure = () => {
      const setW = set.getBoundingClientRect().width;
      const rootW = root.getBoundingClientRect().width;
      if (!setW || !rootW) return;
      const need = Math.max(2, Math.ceil((rootW * 2) / setW) + 1);
      setCopies((c) => (c === need ? c : need));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    ro.observe(set);
    return () => ro.disconnect();
  }, [items, logoSize, gap]);

  /* ── Motion: rAF ticker + hover + drag (port of marquee.js) ───── */
  React.useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    const set = setRef.current;
    if (!root || !track || !set || !items.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let setW = set.getBoundingClientRect().width || 1;
    const ro = new ResizeObserver(() => {
      setW = set.getBoundingClientRect().width || 1;
    });
    ro.observe(set);

    let pos = 0;
    let v = baseSpeed;       // current speed px/s
    // Speed tween (mirrors gsap.to(sp, {v, duration, ease:"powerN.out"})):
    // eases from `from` to `to` over `dur` seconds and lands EXACTLY on `to`.
    let from = baseSpeed, to = baseSpeed, t0 = 0, dur = 0, pow = 3;
    let isDragging = false;
    let dragMoved = 0;
    let captured = false;
    let activePtr: number | null = null;
    let dragStartX = 0;
    let dragStartPos = 0;
    let lastX = 0;
    let lastT = 0;
    let ptrVel = 0;
    let last = performance.now();
    let raf = 0;
    let alive = true;

    const setSpeed = (t: number, seconds: number, power = 3) => {
      from = v; to = t; t0 = performance.now(); dur = Math.max(0.01, seconds); pow = power;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!isDragging) {
        if (v !== to) {
          const p = Math.min(1, (now - t0) / (dur * 1000));
          const eased = 1 - Math.pow(1 - p, pow);       // powerN.out
          v = p >= 1 ? to : from + (to - from) * eased;
        }
        pos += v * dt;
        if (Math.abs(pos) > setW * 1e5) pos -= setW * Math.floor(pos / setW);
      }
      const wrapped = ((pos % setW) + setW) % setW;
      track.style.transform = "translate3d(" + -wrapped + "px,0,0)";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onEnter = () => { if (!isDragging && pauseOnHover) setSpeed(0, 0.9); };
    const onLeave = () => { if (!isDragging) setSpeed(baseSpeed, 1.1); };
    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);

    const onDown = (e: PointerEvent) => {
      if (!drag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      v = 0; to = 0; from = 0;
      isDragging = true; dragMoved = 0; captured = false;
      activePtr = e.pointerId;
      dragStartX = e.clientX; dragStartPos = pos;
      lastX = e.clientX; lastT = performance.now(); ptrVel = 0;
      setDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging) return;
      dragMoved = Math.max(dragMoved, Math.abs(e.clientX - dragStartX));
      if (!captured && dragMoved >= DRAG_SLOP) {
        captured = true;
        try { root.setPointerCapture(e.pointerId); } catch (_) { /* gone */ }
      }
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) ptrVel = ((lastX - e.clientX) / dt) * 1000;
      lastX = e.clientX; lastT = now;
      pos = dragStartPos + (dragStartX - e.clientX);
    };
    const release = (e: { clientX: number; clientY: number }) => {
      if (!isDragging) return;
      isDragging = false;
      setDragging(false);
      if (captured && activePtr !== null) {
        try { root.releasePointerCapture(activePtr); } catch (_) { /* gone */ }
      }
      captured = false; activePtr = null;
      const max = Math.abs(baseSpeed) || 60;
      v = Math.max(-max * 5, Math.min(max * 10, ptrVel));
      const r = root.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      setSpeed(inside && pauseOnHover ? 0 : baseSpeed, 1.6, 4);
    };
    const onUp = (e: PointerEvent) => release(e);
    const onBlur = () => release({ clientX: -1, clientY: -1 });
    const onDragStart = (e: Event) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      if (dragMoved >= DRAG_SLOP) { e.preventDefault(); e.stopPropagation(); }
    };

    if (drag) {
      root.addEventListener("pointerdown", onDown);
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerup", onUp);
      root.addEventListener("pointercancel", onUp);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onBlur);
      root.addEventListener("dragstart", onDragStart);
      root.addEventListener("click", onClick, true);
    }

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
      if (drag) {
        root.removeEventListener("pointerdown", onDown);
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerup", onUp);
        root.removeEventListener("pointercancel", onUp);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onBlur);
        root.removeEventListener("dragstart", onDragStart);
        root.removeEventListener("click", onClick, true);
      }
      track.style.transform = "";
    };
  }, [items, copies, baseSpeed, pauseOnHover, drag]);

  const hasLogos = items.length > 0;
  const size = logoSize + "rem";
  const gapPx = gap + "rem";

  const renderSet = (key: number, hidden: boolean) => (
    <div
      key={key}
      className="slm-set"
      ref={key === 0 ? setRef : undefined}
      aria-hidden={hidden ? "true" : undefined}
      style={{ columnGap: gapPx, paddingRight: gapPx }}
    >
      {items.map((it, i) => (
        <div key={i} className="slm-item">
          <img
            className="slm-logo"
            src={it.src}
            srcSet={it.srcset}
            sizes={it.sizes}
            alt={hidden ? "" : it.alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            style={{ width: size, height: size }}
          />
        </div>
      ))}
    </div>
  );

  const cls =
    "slm" +
    (fadeEdges ? " has-fade" : "") +
    (drag && hasLogos ? " can-drag" : "") +
    (dragging ? " is-dragging" : "");

  return (
    <div
      ref={rootRef}
      className={cls}
      style={minHeight > 0 ? { minHeight: minHeight + "px" } : undefined}
      role="region"
      aria-label="Client logos"
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {/* The CMS list lives here: hidden once we've read it, visible as a
          fallback when there's nothing to read (empty slot in the Designer). */}
      <div ref={srcRef} className={hasLogos ? "slm-src" : "slm-fallback"}>
        {logos}
      </div>
      {hasLogos && (
        <div ref={trackRef} className="slm-track">
          {Array.from({ length: copies }, (_, k) => renderSet(k, k > 0))}
        </div>
      )}
    </div>
  );
}
