import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { HeroTablet } from "./HeroTablet";

export default declareComponent(HeroTablet, {
  name: "Hero",
  description:
    "Ana sayfa hero'su — TÜM kırılımlar tek component'te. ≥ 992px: hero.js'in " +
    "birebir React hali (sitenin global gsap + ScrollTrigger'ı ile pin + scrub " +
    "timeline: video slot'a morph olur, kelimeler/açıklama/istatistikler " +
    "stagger ile gelir, nav--on-light). ≤ 991px: statik dikey akış, 100svh " +
    "video bloğu + 'Trusted by' + Logo Marquee slot'u, vurgulu ifade, görünüme " +
    "girince sayan istatistikler. Masaüstü hero section'ını ve hero.js/hero.css " +
    "linklerini kaldırıp bunu koy; görünürlük ayarı gerekmez.",
  group: "Sestek",
  props: {
    /* ── Video ── */
    videoUrl: props.Text({
      name: "Video URL (mp4)",
      group: "Video",
      defaultValue:
        "https://customer-aqbxsulug92giq9c.cloudflarestream.com/e19e71bc22e0db4152bfb447f678687d/downloads/default.mp4",
      tooltip: "Cloudflare Stream 'downloads/default.mp4' linki — autoplay, muted, loop, preload=none",
    }),
    posterUrl: props.Text({
      name: "Poster URL",
      group: "Video",
      defaultValue:
        "https://customer-aqbxsulug92giq9c.cloudflarestream.com/e19e71bc22e0db4152bfb447f678687d/thumbnails/thumbnail.jpg?height=600",
      tooltip: "Video yüklenene kadar görünen kare; video URL boşsa tek başına gösterilir",
    }),
    overlay: props.Boolean({
      name: "Dark overlay",
      group: "Video",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Alt kenara doğru koyulaşan gradient — beyaz metin okunurluğu için",
    }),

    /* ── Scene 1 ── */
    title: props.Text({
      name: "Title (H1)",
      group: "Headline",
      defaultValue: "New chapter begins for|AI-first customer experience",
      tooltip: "Satır kırmak için | kullan",
    }),
    subtitle: props.Text({
      name: "Subtitle",
      group: "Headline",
      defaultValue:
        "Build, deploy, and manage next-generation AI voice agents that sound human, execute tasks, and scale effortlessly.",
    }),
    cta1Label: props.Text({
      name: "Button 1 label",
      group: "Buttons",
      defaultValue: "Read success stories",
      tooltip: "Boş = buton gizli",
    }),
    cta1Link: props.Link({
      name: "Button 1 link",
      group: "Buttons",
    }),
    cta2Label: props.Text({
      name: "Button 2 label",
      group: "Buttons",
      defaultValue: "Request a demo",
      tooltip: "Boş = buton gizli",
    }),
    cta2Link: props.Link({
      name: "Button 2 link",
      group: "Buttons",
    }),

    /* ── Trusted by ── */
    trustedText: props.Text({
      name: "Trusted by text",
      group: "Trusted by",
      defaultValue: "Trusted by|700+ companies",
      tooltip: "Satır kırmak için | kullan; boş = etiket gizli",
    }),
    logos: props.Slot({
      name: "Logos",
      group: "Trusted by",
      tooltip:
        "Buraya doğrudan bir Collection List bırak (Clients → Logo image). " +
        "Marquee hero'nun içinde çalışır; ayrı Logo Marquee component'i " +
        "GEREKMEZ. Eski marquee bloğu bırakılsa da görselleri okur.",
    }),
    marqueeSpeed: props.Number({
      name: "Marquee speed (px/s)",
      group: "Trusted by",
      defaultValue: 60,
      min: 0,
      max: 400,
    }),
    marqueeLogoSize: props.Number({
      name: "Marquee logo size (rem)",
      group: "Trusted by",
      defaultValue: 6.25,
      min: 2,
      max: 16,
      decimals: 2,
    }),
    marqueeGap: props.Number({
      name: "Marquee gap (rem)",
      group: "Trusted by",
      defaultValue: 3,
      min: 0,
      max: 12,
      decimals: 2,
    }),

    /* ── Scene 2 ── */
    phrase: props.Text({
      name: "Phrase",
      group: "Statement",
      defaultValue: "Every interaction, [video] better *than the last*",
      tooltip:
        "Marka renginde vurgulanacak kelimeleri *yıldız* içine al. [video] = " +
        "masaüstünde videonun morph olup yerleştiği slot'un yeri (mobilde yok sayılır)",
    }),
    description: props.Text({
      name: "Description",
      group: "Statement",
      defaultValue:
        "Voice-first AI Agents that understand, act, and resolve customer requests in real time across every interaction.",
    }),
    bgImage: props.Image({
      name: "Background image",
      group: "Statement",
      tooltip: "Opsiyonel — masaüstündeki bg-3 görseli gibi; üst/alt kenarı zemine karışır",
    }),

    /* ── Stats ── */
    stat1Value: props.Number({ name: "Stat 1 value", group: "Stats", defaultValue: 700, min: 0, max: 1000000 }),
    stat1Suffix: props.Text({ name: "Stat 1 suffix", group: "Stats", defaultValue: "+" }),
    stat1Label: props.Text({ name: "Stat 1 label", group: "Stats", defaultValue: "enterprises,|one standard", tooltip: "| = satır kır" }),

    stat2Value: props.Number({ name: "Stat 2 value", group: "Stats", defaultValue: 100, min: 0, max: 1000000 }),
    stat2Suffix: props.Text({ name: "Stat 2 suffix", group: "Stats", defaultValue: "%" }),
    stat2Label: props.Text({ name: "Stat 2 label", group: "Stats", defaultValue: "projects delivered|to production" }),

    stat3Value: props.Number({ name: "Stat 3 value", group: "Stats", defaultValue: 98, min: 0, max: 1000000 }),
    stat3Suffix: props.Text({ name: "Stat 3 suffix", group: "Stats", defaultValue: "%" }),
    stat3Label: props.Text({ name: "Stat 3 label", group: "Stats", defaultValue: "speech recognition|accuracy" }),

    stat4Value: props.Number({ name: "Stat 4 value", group: "Stats", defaultValue: 25, min: 0, max: 1000000 }),
    stat4Suffix: props.Text({ name: "Stat 4 suffix", group: "Stats", defaultValue: "+" }),
    stat4Label: props.Text({ name: "Stat 4 label", group: "Stats", defaultValue: "years engineering|the future" }),

    /* ── Motion ── */
    animate: props.Boolean({
      name: "Animate",
      group: "Motion",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Masaüstü scroll animasyonu + mobil fade-up'lar + sayaçlar (reduced-motion'da otomatik kapanır)",
    }),
    grain: props.Boolean({
      name: "Film grain",
      group: "Effects",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Video üstünde grain.js'in film greni overlay'i (data-grain). Reduced-motion'da kapalı",
    }),
    grainIntensity: props.Number({
      name: "Grain intensity",
      group: "Effects",
      defaultValue: 0.08,
      min: 0,
      max: 1,
      decimals: 2,
      tooltip: "Overlay opaklığı — sitedeki hero'da 0.08",
    }),
    grainSize: props.Number({
      name: "Grain size",
      group: "Effects",
      defaultValue: 0.3,
      min: 0.3,
      max: 0.9,
      decimals: 2,
      tooltip: "SVG baseFrequency: düşük = iri/sinematik, yüksek = ince/dijital (grain.js 0.3–0.9'a kırpar)",
    }),
    grainSpeed: props.Number({
      name: "Grain speed (ms)",
      group: "Effects",
      defaultValue: 800,
      min: 100,
      max: 4000,
      tooltip: "Doku kayma döngüsü süresi",
    }),
    staggerButton: props.Boolean({
      name: "Stagger button",
      group: "Effects",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Buton 1'de hover'da harf harf yukarı kayan etiket (stagger-button.js). SplitText gerekmez",
    }),
    scrollDistance: props.Number({
      name: "Scroll distance (× viewport)",
      group: "Motion",
      defaultValue: 2.5,
      min: 1,
      max: 5,
      decimals: 1,
      tooltip: "Masaüstünde hero'nun pinli kaldığı scroll mesafesi; hero.js'te 2.5 (+=250%)",
    }),
  },
  options: {
    /* IntersectionObserver + count-up + video — client-only */
    ssr: false,
  },
});
