import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { HeroTablet } from "./HeroTablet";

export default declareComponent(HeroTablet, {
  name: "Hero Tablet",
  description:
    "Ana sayfa hero'sunun tablet + mobil (≤ 991px) hali — masaüstü hero.js " +
    "animasyonunun statik, dikey akan karşılığı. Video bloğu + başlık + 2 CTA, " +
    "'Trusted by' + Logo Marquee slot'u, vurgulu ifade + açıklama, görünüme " +
    "girince sayan 4 istatistik. Pin/scroll animasyonu yok. Designer'da " +
    "≥ 992px'te gizle; masaüstü hero'yu ≤ 991px'te gizle.",
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
    videoHeight: props.Number({
      name: "Video height (vh)",
      group: "Video",
      defaultValue: 72,
      min: 30,
      max: 100,
      tooltip: "Video bloğunun yüksekliği, viewport yüzdesi (100 = tam ekran)",
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
        "Buraya 'Logo Marquee' code component'ini bırak (içine Clients " +
        "Collection List). Boş bırakılırsa satır gizlenir.",
    }),

    /* ── Scene 2 ── */
    phrase: props.Text({
      name: "Phrase",
      group: "Statement",
      defaultValue: "Every interaction, better *than the last*",
      tooltip: "Marka renginde vurgulanacak kelimeleri *yıldız* içine al",
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
      tooltip: "Giriş fade-up'ları + sayaç animasyonu (reduced-motion'da otomatik kapanır)",
    }),
  },
  options: {
    /* IntersectionObserver + count-up + video — client-only */
    ssr: false,
  },
});
