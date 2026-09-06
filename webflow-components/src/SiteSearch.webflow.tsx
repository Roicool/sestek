import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { SiteSearch } from "./SiteSearch";

export default declareComponent(SiteSearch, {
  name: "Site Search",
  description:
    "⌘K tam sayfa site araması. Nav'a bırakılan tetikleyici buton + body'ye " +
    "açılan iki sütunlu palet (solda sonuçlar, sağda önizleme). Index'i " +
    "Webflow Cloud app'ten alır (/demos/api/search/index), sıralama tarayıcıda; " +
    "tuş başına ağ isteği yok. TR/EN otomatik, ↑↓ Enter Esc, focus trap. " +
    "Asistan yok; boş durumda Demo + İletişim.",
  group: "Sestek",
  props: {
    indexUrl: props.Text({
      name: "Index URL",
      group: "Data",
      defaultValue: "/demos/api/search/index",
      tooltip: "Cloud app'in index endpoint'i (same-origin). Staging'de tam URL ver: https://www.sestek.com/demos/api/search/index",
    }),
    locale: props.Variant({
      name: "Locale",
      group: "Data",
      options: ["Auto", "en", "tr"],
      defaultValue: "Auto",
      tooltip: "Auto: /tr yolu ya da <html lang> ile algılanır",
    }),
    siteHost: props.Text({
      name: "Site host",
      group: "Data",
      defaultValue: "www.sestek.com",
      tooltip: "Önizleme sütununda URL'nin başında gösterilir",
    }),
    demoHref: props.Text({
      name: "Demo link",
      group: "Empty state",
      defaultValue: "",
      tooltip: "Boş = /request-a-demo (TR: /tr/demo-isteyin)",
    }),
    contactHref: props.Text({
      name: "Contact link",
      group: "Empty state",
      defaultValue: "",
      tooltip: "Boş = ikinci CTA ve hızlı erişimdeki İletişim satırı gösterilmez",
    }),
    quickLinksEn: props.Text({
      name: "Quick links (EN)",
      group: "Quick access",
      defaultValue: "",
      tooltip:
        "Yazmadan önce solda listelenen sayfalar. Kayıtları ; ile ayır: Grup | Başlık | /yol | özet | görsel URL (son ikisi opsiyonel). Boş = Products / Solutions / Resources / Company hazır listesi. {contact} = Contact link",
    }),
    quickLinksTr: props.Text({
      name: "Quick links (TR)",
      group: "Quick access",
      defaultValue: "",
      tooltip: "TR sayfalar için aynı format. Boş = Ürünler / Çözümler / Kaynaklar / Kurumsal hazır listesi",
    }),
    previewImage: props.Image({
      name: "Preview image",
      group: "Quick access",
      tooltip: "Sağ sütundaki görsel alanı; sayfanın kendi og:image'ı yoksa bu gösterilir. Boş = sitedeki Sagitone gradient",
    }),
    showButton: props.Boolean({
      name: "Show trigger button",
      group: "Trigger",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Off = yalnız ⌘K ve sayfadaki [data-site-search-trigger] elemanları açar",
    }),
    buttonStyle: props.Variant({
      name: "Button style",
      group: "Trigger",
      options: ["Chip", "Pill", "Icon only"],
      defaultValue: "Chip",
      tooltip: "Chip = nav'daki locale dropdown chip'iyle birebir (2rem, #e1e1e1, hover #d7d7d7)",
    }),
    buttonLabel: props.Text({
      name: "Button label",
      group: "Trigger",
      defaultValue: "Search",
      tooltip: "Boş = locale'e göre Search / Ara",
    }),
    showKbd: props.Boolean({
      name: "Show ⌘K badge",
      group: "Trigger",
      defaultValue: false,
      trueLabel: "On",
      falseLabel: "Off",
    }),
    bindPageTriggers: props.Boolean({
      name: "Bind page triggers",
      group: "Trigger",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Sayfadaki [data-site-search-trigger] / [data-site-search-open] elemanlarına tıklayınca da açılır. search.js'in [data-search-trigger]'ı (blog/CMS araması) BAĞLANMAZ",
    }),
    hotkeys: props.Boolean({
      name: "Keyboard shortcuts",
      group: "Trigger",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "⌘K / Ctrl+K her yerde, / bir alanda yazmıyorken",
    }),
  },
  options: {
    /* portal to document.body + fetch + keyboard — client-only */
    ssr: false,
  },
});
