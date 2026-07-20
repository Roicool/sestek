/*!
 * globe-pulse-2.js v1.1.0
 *
 * Changelog
 * v1.3.0 — sıfır boşluk: kürenin tepesi kutunun ÜST kenarına yapışık
 *          (y=0), taban alt kenarla bitiyor — viewBox 880x440, çizim
 *          kutuyu birebir dolduruyor; üstte/altta ölü boşluk yok.
 * v1.2.0 — küre KOMPLE görünür: çizim %75 ölçeklenip viewBox'a tam
 *          oturtuldu (yatayda hiçbir çizgi kesilmez); "meet" fit —
 *          her kutu oranında tam küre.
 * v1.1.0 — Draw-in bir tık yavaşladı; pulse trafiği artık çizim bitmeden
 *          (draw-in'in ~0.9sn'sinde) başlıyor.
 * GSAP DrawSVG variant of the globe-pulse visual — same wireframe globe,
 * premium choreography. Kept SEPARATE from globe-pulse v1 (pure CSS);
 * use one or the other on a page, not both on the same element.
 *
 *   1. Draw-in  — grid strokes draw themselves in with a stagger when the
 *      block scrolls into view (DrawSVG), meridians first, then parallels.
 *   2. Traffic  — a pool of light pulses; each picks a RANDOM route, speed
 *      and brightness, glides along it with sine easing (accelerate →
 *      cruise → decelerate) and respawns on another route. The pattern
 *      never visibly repeats.
 *   3. Economy  — everything pauses while the block is off-screen
 *      (IntersectionObserver); prefers-reduced-motion renders the grid
 *      complete and skips the pulses entirely.
 *
 * Dependencies: gsap + DrawSVGPlugin registered, css/effects/globe-pulse-2.css.
 * No ScrollTrigger needed.
 *
 * API:
 *   Sestek.initGlobePulse2()  — wire every [data-globe-pulse-2] on the page
 *
 * DOM (Webflow):
 *   <div data-globe-pulse-2></div>     height follows width (880x460 ratio)
 *
 * Designer placeholder (recommended): drop svg/globe-pulse/globe-pulse.svg
 * as an <img> INSIDE the div — init replaces it on the live site.
 *
 * Attributes (all optional, on [data-globe-pulse-2]):
 *   data-gp2-color="--brand-primary--500"  pulse colour — CSS var token
 *                                          (leading --) or raw colour.
 *   data-gp2-grid="#212121"                grid line colour.
 *   data-gp2-density="4"                   concurrent pulses (1-7).
 *   data-gp2-speed="1"                     speed multiplier (2 = twice as fast).
 *   data-gp2-glow="10"                     glow blur radius (feGaussianBlur).
 *   data-gp2-draw="true"                   grid draw-in on enter; "false" =
 *                                          grid starts complete.
 *
 * https://github.com/roicool/sestek
 */

(function (global) {
  "use strict";

  var SVGNS = "http://www.w3.org/2000/svg";
  var VIEWBOX = "0 0 880 440";
  var PULSE_PX = 73;      /* görünen segmentin yol üzerindeki uzunluğu */
  var BASE_SPEED = 210;   /* px/sn — easing ortalaması v1'e yakın dursun */
  var uid = 0;

  /* Static wireframe: bottom arc, 7 meridians, 3 parallels. */
  var GRID = [
    'M -146.67 733.33 A 586.67 586.67 0 0 1 1026.67 733.33 L -146.67 733.33',
    'M 440 146.67 L 425.6 146.98 L 411.22 147.92 L 396.87 149.49 L 382.57 151.69 L 368.33 154.5 L 354.16 157.94 L 340.09 161.99 L 326.12 166.66 L 312.27 171.93 L 298.57 177.8 L 285.01 184.27 L 271.62 191.32 L 258.41 198.96 L 245.39 207.17 L 232.59 215.94 L 220 225.27 L 207.65 235.13 L 195.55 245.54 L 183.71 256.46 L 172.14 267.9 L 160.87 279.83 L 149.89 292.25 L 139.22 305.15 L 128.87 318.5 L 118.86 332.29 L 109.19 346.52 L 99.88 361.16 L 90.92 376.19 L 82.35 391.61 L 74.15 407.4 L 66.35 423.53 L 58.95 440 L 51.95 456.78 L 45.38 473.86 L 39.22 491.21 L 33.49 508.83 L 28.2 526.68 L 23.35 544.76 L 18.95 563.03 L 14.99 581.49 L 11.49 600.12 L 8.45 618.88 L 5.88 637.77 L 3.76 656.76 L 2.12 675.83 L 0.94 694.96 L 0.24 714.14 L 0 733.33',
    'M 440 146.67 L 430.4 146.98 L 420.82 147.92 L 411.25 149.49 L 401.71 151.69 L 392.22 154.5 L 382.77 157.94 L 373.39 161.99 L 364.08 166.66 L 354.85 171.93 L 345.71 177.8 L 336.67 184.27 L 327.75 191.32 L 318.94 198.96 L 310.26 207.17 L 301.72 215.94 L 293.33 225.27 L 285.1 235.13 L 277.03 245.54 L 269.14 256.46 L 261.43 267.9 L 253.91 279.83 L 246.59 292.25 L 239.48 305.15 L 232.58 318.5 L 225.91 332.29 L 219.46 346.52 L 213.25 361.16 L 207.28 376.19 L 201.56 391.61 L 196.1 407.4 L 190.9 423.53 L 185.97 440 L 181.3 456.78 L 176.92 473.86 L 172.81 491.21 L 169 508.83 L 165.47 526.68 L 162.23 544.76 L 159.3 563.03 L 156.66 581.49 L 154.33 600.12 L 152.3 618.88 L 150.58 637.77 L 149.18 656.76 L 148.08 675.83 L 147.29 694.96 L 146.82 714.14 L 146.67 733.33',
    'M 440 146.67 L 435.2 146.98 L 430.41 147.92 L 425.62 149.49 L 420.86 151.69 L 416.11 154.5 L 411.39 157.94 L 406.7 161.99 L 402.04 166.66 L 397.42 171.93 L 392.86 177.8 L 388.34 184.27 L 383.87 191.32 L 379.47 198.96 L 375.13 207.17 L 370.86 215.94 L 366.67 225.27 L 362.55 235.13 L 358.52 245.54 L 354.57 256.46 L 350.71 267.9 L 346.96 279.83 L 343.3 292.25 L 339.74 305.15 L 336.29 318.5 L 332.95 332.29 L 329.73 346.52 L 326.63 361.16 L 323.64 376.19 L 320.78 391.61 L 318.05 407.4 L 315.45 423.53 L 312.98 440 L 310.65 456.78 L 308.46 473.86 L 306.41 491.21 L 304.5 508.83 L 302.73 526.68 L 301.12 544.76 L 299.65 563.03 L 298.33 581.49 L 297.16 600.12 L 296.15 618.88 L 295.29 637.77 L 294.59 656.76 L 294.04 675.83 L 293.65 694.96 L 293.41 714.14 L 293.33 733.33',
    'M 440 146.67 L 440 733.33',
    'M 440 146.67 L 444.8 146.98 L 449.59 147.92 L 454.38 149.49 L 459.14 151.69 L 463.89 154.5 L 468.61 157.94 L 473.3 161.99 L 477.96 166.66 L 482.58 171.93 L 487.14 177.8 L 491.66 184.27 L 496.13 191.32 L 500.53 198.96 L 504.87 207.17 L 509.14 215.94 L 513.33 225.27 L 517.45 235.13 L 521.48 245.54 L 525.43 256.46 L 529.29 267.9 L 533.04 279.83 L 536.7 292.25 L 540.26 305.15 L 543.71 318.5 L 547.05 332.29 L 550.27 346.52 L 553.37 361.16 L 556.36 376.19 L 559.22 391.61 L 561.95 407.4 L 564.55 423.53 L 567.02 440 L 569.35 456.78 L 571.54 473.86 L 573.59 491.21 L 575.5 508.83 L 577.27 526.68 L 578.88 544.76 L 580.35 563.03 L 581.67 581.49 L 582.84 600.12 L 583.85 618.88 L 584.71 637.77 L 585.41 656.76 L 585.96 675.83 L 586.35 694.96 L 586.59 714.14 L 586.67 733.33',
    'M 440 146.67 L 449.6 146.98 L 459.18 147.92 L 468.75 149.49 L 478.29 151.69 L 487.78 154.5 L 497.23 157.94 L 506.61 161.99 L 515.92 166.66 L 525.15 171.93 L 534.29 177.8 L 543.33 184.27 L 552.25 191.32 L 561.06 198.96 L 569.74 207.17 L 578.28 215.94 L 586.67 225.27 L 594.9 235.13 L 602.97 245.54 L 610.86 256.46 L 618.57 267.9 L 626.09 279.83 L 633.41 292.25 L 640.52 305.15 L 647.42 318.5 L 654.09 332.29 L 660.54 346.52 L 666.75 361.16 L 672.72 376.19 L 678.44 391.61 L 683.9 407.4 L 689.1 423.53 L 694.03 440 L 698.7 456.78 L 703.08 473.86 L 707.19 491.21 L 711 508.83 L 714.53 526.68 L 717.77 544.76 L 720.7 563.03 L 723.34 581.49 L 725.67 600.12 L 727.7 618.88 L 729.42 637.77 L 730.82 656.76 L 731.92 675.83 L 732.71 694.96 L 733.18 714.14 L 733.33 733.33',
    'M 440 146.67 L 454.4 146.98 L 468.78 147.92 L 483.13 149.49 L 497.43 151.69 L 511.67 154.5 L 525.84 157.94 L 539.91 161.99 L 553.88 166.66 L 567.73 171.93 L 581.43 177.8 L 594.99 184.27 L 608.38 191.32 L 621.59 198.96 L 634.61 207.17 L 647.41 215.94 L 660 225.27 L 672.35 235.13 L 684.45 245.54 L 696.29 256.46 L 707.86 267.9 L 719.13 279.83 L 730.11 292.25 L 740.78 305.15 L 751.13 318.5 L 761.14 332.29 L 770.81 346.52 L 780.12 361.16 L 789.08 376.19 L 797.65 391.61 L 805.85 407.4 L 813.65 423.53 L 821.05 440 L 828.05 456.78 L 834.62 473.86 L 840.78 491.21 L 846.51 508.83 L 851.8 526.68 L 856.65 544.76 L 861.05 563.03 L 865.01 581.49 L 868.51 600.12 L 871.55 618.88 L 874.12 637.77 L 876.24 656.76 L 877.88 675.83 L 879.06 694.96 L 879.76 714.14 L 880 733.33',
    'M -128.04 586.67 L 1008.04 586.67',
    'M -68.07 440 L 948.07 440',
    'M 51.96 293.33 L 828.04 293.33'
  ];

  /* Pulse routes stitched from grid segments (shared with v1). */
  var ROUTES = [
    'M 866.03 586.67 L 847.88 513.28 L 822.65 443.71 L 790.78 379.17 L 752.82 320.77 L 709.44 269.53 L 661.39 226.34 L 609.49 191.94 L 554.66 166.93 L 497.83 151.76 L 440.00 146.67 L 440.00 151.76 L 440.00 166.93 L 440.00 191.94 L 440.00 226.34 L 440.00 269.53 L 440.00 320.77 L 440.00 379.17 L 440.00 443.71 L 440.00 513.28 L 440.00 586.67 L 440.00 571.33 L 440.00 556.12 L 440.00 541.03 L 440.00 526.09 L 440.00 511.30 L 440.00 496.67 L 440.00 482.22 L 440.00 467.95 L 440.00 453.87 L 440.00 440.00 L 440.00 423.67 L 440.00 407.67 L 440.00 392.01 L 440.00 376.71 L 440.00 361.79 L 440.00 347.25 L 440.00 333.13 L 440.00 319.42 L 440.00 306.15 L 440.00 293.33',
    'M 440.00 146.67 L 382.17 151.76 L 325.34 166.93 L 270.51 191.94 L 218.61 226.34 L 170.56 269.53 L 127.18 320.77 L 89.22 379.17 L 57.35 443.71 L 32.12 513.28 L 13.97 586.67 L 17.11 571.33 L 20.55 556.12 L 24.31 541.03 L 28.37 526.09 L 32.73 511.30 L 37.39 496.67 L 42.35 482.22 L 47.59 467.95 L 53.13 453.87 L 58.95 440.00 L 70.05 440.00 L 81.54 440.00 L 93.41 440.00 L 105.65 440.00 L 118.23 440.00 L 131.16 440.00 L 144.41 440.00 L 157.97 440.00 L 171.83 440.00 L 185.97 440.00',
    'M 582.01 586.67 L 575.96 513.28 L 567.55 443.71 L 556.93 379.17 L 544.27 320.77 L 529.81 269.53 L 513.80 226.34 L 496.50 191.94 L 478.22 166.93 L 459.28 151.76 L 440.00 146.67 L 478.55 151.76 L 516.44 166.93 L 552.99 191.94 L 587.59 226.34 L 619.63 269.53 L 648.55 320.77 L 673.85 379.17 L 695.10 443.71 L 711.92 513.28 L 724.02 586.67 L 721.93 571.33 L 719.63 556.12 L 717.13 541.03 L 714.42 526.09 L 711.51 511.30 L 708.41 496.67 L 705.10 482.22 L 701.60 467.95 L 697.91 453.87 L 694.03 440.00 L 689.14 423.67 L 683.99 407.67 L 678.58 392.01 L 672.92 376.71 L 667.01 361.79 L 660.86 347.25 L 654.48 333.13 L 647.88 319.42 L 641.06 306.15 L 634.02 293.33 L 644.82 293.33 L 655.41 293.33 L 665.76 293.33 L 675.88 293.33 L 685.75 293.33 L 695.37 293.33 L 704.71 293.33 L 713.78 293.33 L 722.55 293.33 L 731.03 293.33 L 741.58 306.15 L 751.82 319.42 L 761.73 333.13 L 771.29 347.25 L 780.51 361.79 L 789.37 376.71 L 797.87 392.01 L 805.98 407.67 L 813.71 423.67 L 821.05 440.00',
    'M 694.03 440.00 L 697.91 453.87 L 701.60 467.95 L 705.10 482.22 L 708.41 496.67 L 711.51 511.30 L 714.42 526.09 L 717.13 541.03 L 719.63 556.12 L 721.93 571.33 L 724.02 586.67 L 711.92 513.28 L 695.10 443.71 L 673.85 379.17 L 648.55 320.77 L 619.63 269.53 L 587.59 226.34 L 552.99 191.94 L 516.44 166.93 L 478.55 151.76 L 440.00 146.67 L 420.72 151.76 L 401.78 166.93 L 383.50 191.94 L 366.20 226.34 L 350.19 269.53 L 335.73 320.77 L 323.07 379.17 L 312.45 443.71 L 304.04 513.28 L 297.99 586.67 L 283.14 586.67 L 268.41 586.67 L 253.81 586.67 L 239.34 586.67 L 225.02 586.67 L 210.85 586.67 L 196.86 586.67 L 183.04 586.67 L 169.41 586.67 L 155.98 586.67',
    'M 148.97 293.33 L 138.42 306.15 L 128.18 319.42 L 118.27 333.13 L 108.71 347.25 L 99.49 361.79 L 90.63 376.71 L 82.13 392.01 L 74.02 407.67 L 66.29 423.67 L 58.95 440.00 L 70.05 440.00 L 81.54 440.00 L 93.41 440.00 L 105.65 440.00 L 118.23 440.00 L 131.16 440.00 L 144.41 440.00 L 157.97 440.00 L 171.83 440.00 L 185.97 440.00 L 190.86 423.67 L 196.01 407.67 L 201.42 392.01 L 207.08 376.71 L 212.99 361.79 L 219.14 347.25 L 225.52 333.13 L 232.12 319.42 L 238.94 306.15 L 245.98 293.33 L 235.18 293.33 L 224.59 293.33 L 214.24 293.33 L 204.12 293.33 L 194.25 293.33 L 184.63 293.33 L 175.29 293.33 L 166.22 293.33 L 157.45 293.33 L 148.97 293.33 L 138.42 306.15 L 128.18 319.42 L 118.27 333.13 L 108.71 347.25 L 99.49 361.79 L 90.63 376.71 L 82.13 392.01 L 74.02 407.67 L 66.29 423.67 L 58.95 440.00 L 53.13 453.87 L 47.59 467.95 L 42.35 482.22 L 37.39 496.67 L 32.73 511.30 L 28.37 526.09 L 24.31 541.03 L 20.55 556.12 L 17.11 571.33 L 13.97 586.67 L 26.38 586.67 L 39.23 586.67 L 52.50 586.67 L 66.18 586.67 L 80.25 586.67 L 94.70 586.67 L 109.52 586.67 L 124.68 586.67 L 140.17 586.67 L 155.98 586.67',
    'M 440.00 146.67 L 440.00 151.76 L 440.00 166.93 L 440.00 191.94 L 440.00 226.34 L 440.00 269.53 L 440.00 320.77 L 440.00 379.17 L 440.00 443.71 L 440.00 513.28 L 440.00 586.67 L 440.00 571.33 L 440.00 556.12 L 440.00 541.03 L 440.00 526.09 L 440.00 511.30 L 440.00 496.67 L 440.00 482.22 L 440.00 467.95 L 440.00 453.87 L 440.00 440.00 L 440.00 423.67 L 440.00 407.67 L 440.00 392.01 L 440.00 376.71 L 440.00 361.79 L 440.00 347.25 L 440.00 333.13 L 440.00 319.42 L 440.00 306.15 L 440.00 293.33 L 449.80 293.33 L 459.60 293.33 L 469.39 293.33 L 479.15 293.33 L 488.90 293.33 L 498.61 293.33 L 508.28 293.33 L 517.91 293.33 L 527.49 293.33 L 537.01 293.33 L 540.53 306.15 L 543.94 319.42 L 547.24 333.13 L 550.43 347.25 L 553.50 361.79 L 556.46 376.71 L 559.29 392.01 L 561.99 407.67 L 564.57 423.67 L 567.02 440.00 L 568.96 453.87 L 570.80 467.95 L 572.55 482.22 L 574.20 496.67 L 575.76 511.30 L 577.21 526.09 L 578.56 541.03 L 579.82 556.12 L 580.96 571.33 L 582.01 586.67',
    'M 821.05 440.00 L 813.71 423.67 L 805.98 407.67 L 797.87 392.01 L 789.37 376.71 L 780.51 361.79 L 771.29 347.25 L 761.73 333.13 L 751.82 319.42 L 741.58 306.15 L 731.03 293.33 L 722.55 293.33 L 713.78 293.33 L 704.71 293.33 L 695.37 293.33 L 685.75 293.33 L 675.88 293.33 L 665.76 293.33 L 655.41 293.33 L 644.82 293.33 L 634.02 293.33 L 624.85 293.33 L 615.54 293.33 L 606.10 293.33 L 596.54 293.33 L 586.86 293.33 L 577.08 293.33 L 567.19 293.33 L 557.22 293.33 L 547.15 293.33 L 537.01 293.33 L 540.53 306.15 L 543.94 319.42 L 547.24 333.13 L 550.43 347.25 L 553.50 361.79 L 556.46 376.71 L 559.29 392.01 L 561.99 407.67 L 564.57 423.67 L 567.02 440.00 L 568.96 453.87 L 570.80 467.95 L 572.55 482.22 L 574.20 496.67 L 575.76 511.30 L 577.21 526.09 L 578.56 541.03 L 579.82 556.12 L 580.96 571.33 L 582.01 586.67 L 596.86 586.67 L 611.59 586.67 L 626.19 586.67 L 640.66 586.67 L 654.98 586.67 L 669.15 586.67 L 683.14 586.67 L 696.96 586.67 L 710.59 586.67 L 724.02 586.67 L 721.93 571.33 L 719.63 556.12 L 717.13 541.03 L 714.42 526.09 L 711.51 511.30 L 708.41 496.67 L 705.10 482.22 L 701.60 467.95 L 697.91 453.87 L 694.03 440.00'
  ];

  function cssColor(v) {
    if (!v) return "";
    v = v.trim();
    return v.indexOf("--") === 0 ? "var(" + v + ")" : v;
  }

  function num(v, fallback) {
    var n = parseFloat(v);
    return isNaN(n) || n <= 0 ? fallback : n;
  }

  function flag(el, name, fallback) {
    var v = el.getAttribute(name);
    if (v === null || v === "") return fallback;
    return v !== "false" && v !== "0";
  }

  function rnd(min, max) {
    return min + Math.random() * (max - min);
  }

  function build(root) {
    if (root.__gp2Built) return;
    root.__gp2Built = true;

    var reduce =
      global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var density = Math.max(1, Math.min(7, num(root.getAttribute("data-gp2-density"), 4)));
    var speed = num(root.getAttribute("data-gp2-speed"), 1);
    var glow = num(root.getAttribute("data-gp2-glow"), 10);
    var draw = flag(root, "data-gp2-draw", true) && !reduce;
    var color = cssColor(root.getAttribute("data-gp2-color"));
    var grid = cssColor(root.getAttribute("data-gp2-grid"));
    if (color) root.style.setProperty("--gp2-color", color);
    if (grid) root.style.setProperty("--gp2-grid", grid);

    /* ── SVG iskeleti ─────────────────────────────────────────── */
    var fid = "gp2-glow-" + (++uid);
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", VIEWBOX);
    /* "meet": küre her kutu oranında KOMPLE görünür (yatayda kesilmez);
       çizim FIT ölçeğiyle viewBox'a tam oturtulduğu için kenarlardan
       taşan çizgi yok, alt taraf tasarım gereği kesik. */
    svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Globe wireframe with moving light pulses");
    svg.innerHTML =
      '<defs><filter id="' + fid + '" filterUnits="userSpaceOnUse"' +
      ' x="-880" y="-460" width="2640" height="1380">' +
      '<feGaussianBlur stdDeviation="' + glow + '" result="blur"></feGaussianBlur>' +
      "<feMerge><feMergeNode in=\"blur\"></feMergeNode>" +
      "<feMergeNode in=\"SourceGraphic\"></feMergeNode></feMerge>" +
      "</filter></defs>";

    /* Çizim verisi x:-146.67..1026.67, y:146.67..733.33. 0.75 ölçek +
       (110,-110) kaydırma ile x 0..880, y 0..440'a TAM oturur: tepe üst
       kenara yapışık, taban alt kenarla bitiyor, yanlar kesilmez.
       (Grid'de non-scaling-stroke 1px'i korur.) */
    var FIT = "translate(110.0025,-110.0025) scale(0.75)";

    var gGrid = document.createElementNS(SVGNS, "g");
    gGrid.setAttribute("class", "gp2-grid");
    gGrid.setAttribute("transform", FIT);
    var gridPaths = GRID.map(function (d) {
      var p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", d);
      p.setAttribute("vector-effect", "non-scaling-stroke");
      gGrid.appendChild(p);
      return p;
    });
    svg.appendChild(gGrid);

    var gPulse = document.createElementNS(SVGNS, "g");
    gPulse.setAttribute("transform", FIT);
    svg.appendChild(gPulse);

    root.innerHTML = "";
    root.appendChild(svg);

    /* Reduced motion: grid tam, pulse yok — statik ve sessiz. */
    if (reduce) return;

    var live = [];     /* aktif tween/timeline'lar (pause/resume için) */
    var visible = false;
    var started = false;

    /* ── 2. faz: pulse trafiği ────────────────────────────────── */
    function spawn(el) {
      var d = ROUTES[Math.floor(Math.random() * ROUTES.length)];
      el.setAttribute("d", d);
      var len = el.getTotalLength();
      var pct = Math.max(3, Math.min(14, (PULSE_PX / len) * 100));
      var dur = (len / (BASE_SPEED * speed)) * rnd(0.85, 1.25);
      var peak = rnd(0.45, 1);

      var tl = gsap.timeline({
        onComplete: function () {
          purge(tl);
          gsap.delayedCall(rnd(0.15, 1.1), function () {
            if (visible) spawn(el);
            else el.__gp2Pending = true;   /* görünür olunca devam */
          });
        }
      });
      tl.fromTo(el, { drawSVG: "0% " + pct + "%" },
        { drawSVG: (100 - pct) + "% 100%", duration: dur, ease: "sine.inOut" }, 0);
      tl.fromTo(el, { opacity: 0 },
        { opacity: peak, duration: dur * 0.14, ease: "none" }, 0);
      tl.to(el, { opacity: 0, duration: dur * 0.14, ease: "none" }, dur * 0.86);
      live.push(tl);
    }

    function purge(t) {
      var i = live.indexOf(t);
      if (i > -1) live.splice(i, 1);
    }

    function startTraffic() {
      for (var i = 0; i < density; i++) {
        (function (i) {
          var el = document.createElementNS(SVGNS, "path");
          el.setAttribute("class", "gp2-pulse");
          el.setAttribute("filter", "url(#" + fid + ")");
          gPulse.appendChild(el);
          gsap.delayedCall(rnd(0, 0.8) + i * 0.22, function () {
            if (visible) spawn(el);
            else el.__gp2Pending = true;
          });
        })(i);
      }
    }

    /* ── 1. faz: grid draw-in ─────────────────────────────────── */
    function start() {
      if (started) return;
      started = true;
      if (draw) {
        gsap.set(gridPaths, { drawSVG: "0%" });
        var tl = gsap.timeline({
          onComplete: function () { purge(tl); }
        });
        /* meridyenler (kutuptan yelpaze) → paraleller (üstten alta) —
           ağır, törensel çizim */
        tl.to(gridPaths.slice(1, 8), {
          drawSVG: "100%", duration: 1.9, ease: "power2.inOut", stagger: 0.1
        }, 0);
        tl.to([gridPaths[10], gridPaths[9], gridPaths[8], gridPaths[0]], {
          drawSVG: "100%", duration: 1.7, ease: "power2.inOut", stagger: 0.16
        }, 0.5);
        /* trafik çizimin bitmesini BEKLEMEZ — grid yarı çizilmişken
           ilk pulse'lar süzülmeye başlar */
        tl.call(startTraffic, [], 0.9);
        live.push(tl);
      } else {
        startTraffic();
      }
    }

    /* ── Görünürlük: ekran dışında her şey durur ──────────────── */
    var io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) {
        start();
        live.forEach(function (t) { t.resume(); });
        /* bekleyen pulse'ları yeniden doğur */
        var pend = gPulse.querySelectorAll(".gp2-pulse");
        for (var i = 0; i < pend.length; i++) {
          if (pend[i].__gp2Pending) {
            pend[i].__gp2Pending = false;
            spawn(pend[i]);
          }
        }
      } else {
        live.forEach(function (t) { t.pause(); });
      }
    }, { threshold: 0.05 });
    io.observe(root);
  }

  function initGlobePulse2() {
    if (typeof gsap === "undefined" || !gsap.plugins || !gsap.plugins.drawSVG) {
      if (typeof gsap !== "undefined" && typeof DrawSVGPlugin !== "undefined") {
        gsap.registerPlugin(DrawSVGPlugin);
      }
    }
    var roots = document.querySelectorAll("[data-globe-pulse-2]");
    for (var i = 0; i < roots.length; i++) build(roots[i]);
  }

  global.Sestek = global.Sestek || {};
  global.Sestek.initGlobePulse2 = initGlobePulse2;
})(window);
