import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { StackPanels, DEFAULT_ITEMS, DEFAULT_TITLE, DEFAULT_SHINE_WORD, BUTTON_STYLES } from "./StackPanels";

function item(n: number) {
  const g = "Panel " + n;
  const d = DEFAULT_ITEMS[n - 1];
  return {
    ["i" + n + "Heading"]: props.Text({ name: "Heading", group: g, defaultValue: d ? d.heading : "", tooltip: "Başlığın normal kısmı. Boş (accent ve body de boşsa) = panel gizli" }),
    ["i" + n + "HeadingAccent"]: props.Text({ name: "Heading accent", group: g, defaultValue: d ? d.headingAccent || "" : "", tooltip: "Başlığın renkli devamı (örn. \"engineered in-house.\")" }),
    ["i" + n + "Accent"]: props.Text({ name: "Accent colour", group: g, defaultValue: d ? d.accent || "" : "", tooltip: "Renkli kısmın rengi: token (--brand-primary--500) ya da renk. Boş = sırayla tertiary / secondary / primary" }),
    ["i" + n + "Body"]: props.Text({ name: "Body", group: g, defaultValue: d ? d.body || "" : "", tooltip: "Açıklama. Kalın için **iki yıldız**: Our **+100** R&D experts…" }),
    ["i" + n + "Video"]: props.Text({ name: "Video URL", group: g, defaultValue: d ? d.video || "" : "", tooltip: "mp4 / webm linki (Cloudflare Stream downloads/default.mp4 olur). Sessiz, döngülü, yalnız görünürken oynar; viewport'a yaklaşınca yüklenir" }),
    ["i" + n + "Poster"]: props.Text({ name: "Poster URL", group: g, defaultValue: d ? d.poster || "" : "", tooltip: "Video gelene kadar görünen kare (Cloudflare thumbnails linki). Boş = Image" }),
    ["i" + n + "Image"]: props.Image({ name: "Image", group: g, tooltip: "Webflow görseli — video yoksa medya, varsa Poster URL boşken poster" }),
    ["i" + n + "Button"]: props.Variant({ name: "Button style", group: g, options: BUTTON_STYLES, defaultValue: "Auto", tooltip: "Auto = sırayla White / Brand secondary / Dark · None = buton yok" }),
    ["i" + n + "Side"]: props.Variant({ name: "Media side", group: g, options: ["Right", "Left"], defaultValue: "Right" }),
  };
}

export default declareComponent(StackPanels, {
  name: "Stack Panels",
  description:
    "\"Why global brands are choosing SESTEK\" — üst üste binen panel scrollytelling'i (stack-panels.js v1.4.0'ın React hali). " +
    "Her panel (sonuncu hariç) pinlenir; sonraki üstüne kayarken alttaki bekler, küçülür, solar, bulanır ve yukarı süzülür. " +
    "Solda başlık + renkli vurgu + açıklama + stagger CTA, sağda sabit oranlı kare video (poster'lı, sessiz, yalnız görünürken oynar, yaklaşınca yüklenir). " +
    "GSAP ScrollTrigger sitenin global'inden; yoksa, reduced-motion'da ya da telefonda (≤767px) paneller düz akışta okunur. " +
    "Medya kutusu sabit oranlı: video geç gelince panel boyu değişmez — mobildeki kaymanın kaynağı buydu. " +
    "UYARI: pin için component'in üstündeki hiçbir elemanda transform / filter / perspective olmamalı.",
  group: "Sestek",
  props: {
    title: props.Text({ name: "Title", group: "Header", defaultValue: DEFAULT_TITLE, tooltip: "Kalın için **iki yıldız**, satır kırmak için | işareti" }),
    titleShineWord: props.Text({ name: "Shine word", group: "Header", defaultValue: DEFAULT_SHINE_WORD, tooltip: "Başlıkta marka parıltısı alacak kelime" }),
    subtitle: props.Text({ name: "Subtitle", group: "Header", defaultValue: "" }),
    titleReveal: props.Boolean({ name: "Title reveal", group: "Header", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Görünüme girince yumuşak belirme" }),
    titleShine: props.Boolean({ name: "Brand shine", group: "Header", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Shine word'de turkuaz → lila → magenta ışık süpürmesi" }),

    ctaLabel: props.Text({ name: "Button label", group: "Button", defaultValue: "Request a demo", tooltip: "Tüm paneller; boş = buton yok" }),
    ctaUrl: props.Text({ name: "Button URL", group: "Button", defaultValue: "/request-a-demo" }),
    ctaNewTab: props.Boolean({ name: "Open in new tab", group: "Button", defaultValue: false, trueLabel: "On", falseLabel: "Off" }),

    ...item(1), ...item(2), ...item(3),

    mediaRatio: props.Variant({ name: "Media ratio", group: "Media", options: ["1:1", "4:3", "16:10", "16:9", "3:2"], defaultValue: "1:1", tooltip: "Medya kutusunun sabit en-boy oranı (tüm paneller)" }),
    mediaFit: props.Variant({ name: "Media fit", group: "Media", options: ["Cover", "Contain"], defaultValue: "Cover" }),

    hold: props.Number({ name: "Hold", group: "Motion", defaultValue: 0.5, tooltip: "Pinli scroll'un ne kadarında panel tam okunur kalır (0–0.95)" }),
    scale: props.Number({ name: "End scale", group: "Motion", defaultValue: 0.5, tooltip: "Giden panelin son ölçeği" }),
    blur: props.Number({ name: "Blur (px)", group: "Motion", defaultValue: 4, tooltip: "0 = kapalı" }),
    lift: props.Number({ name: "Lift (px)", group: "Motion", defaultValue: 24, tooltip: "Yukarı süzülme; 0 = kapalı" }),
    midFade: props.Number({ name: "Mid fade", group: "Motion", defaultValue: 0.5, tooltip: "Küçülme bitince ulaşılan opaklık" }),
    fadePortion: props.Number({ name: "Fade portion", group: "Motion", defaultValue: 0.1, tooltip: "Son hızlı solmanın payı" }),
    scrub: props.Number({ name: "Scrub (s)", group: "Motion", defaultValue: 0, tooltip: "0 = doğrudan scroll'a bağlı; 0.3–1 = yumuşatma" }),
    priorityStart: props.Number({ name: "Refresh priority", group: "Motion", defaultValue: 0, tooltip: "İlk panelin refreshPriority'si; üstte pinli hero varsa onun altında kalmalı" }),
    mobileEffect: props.Boolean({ name: "Effect on phones", group: "Motion", defaultValue: false, trueLabel: "On", falseLabel: "Off", tooltip: "Off = ≤767px'te paneller düz akışta (önerilen)" }),

    bgImage: props.Image({ name: "Background image", group: "Look", tooltip: "Section arka plan görseli (cover)" }),
    bottomFade: props.Boolean({ name: "Bottom fade", group: "Look", defaultValue: true, trueLabel: "On", falseLabel: "Off" }),
    sectionBg: props.Text({ name: "Section background", group: "Look", defaultValue: "", tooltip: "Token / renk. Boş = --surface--base" }),
    cardBg: props.Text({ name: "Panel background", group: "Look", defaultValue: "", tooltip: "Token / renk. Boş = --surface--base (opak olmalı)" }),
  },
  options: { ssr: false },
});
