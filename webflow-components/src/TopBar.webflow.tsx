import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { TopBar } from "./TopBar";

export default declareComponent(TopBar, {
  name: "Top Bar",
  description:
    "Navbar'ın ÜSTÜNDE duyuru çubuğu. Metin + link, kapatma (×); kapatılınca cookie ile " +
    "hatırlanır ve hiçbir sayfada bir daha çıkmaz (Campaign id değişince yeniden gösterilir). " +
    "Sabit navbar'ı bar yüksekliği kadar aşağı iter. Mobilde gösterme seçeneği, sabit / kayıp giden " +
    "davranış, Brand / Dark / Light / özel renk. Sayfanın EN ÜSTÜNE, Navbar'dan önce yerleştir.",
  group: "Sestek",
  props: {
    text: props.Text({ name: "Text", group: "Content", defaultValue: "Sestek is now part of Unifonic.", tooltip: "Duyuru metni" }),
    emoji: props.Text({ name: "Emoji / prefix", group: "Content", defaultValue: "", tooltip: "Metnin başına küçük bir işaret, örn. 🎉 (opsiyonel)" }),
    linkLabel: props.Text({ name: "Link label", group: "Content", defaultValue: "Read more", tooltip: "Boş = link yok" }),
    linkUrl: props.Text({ name: "Link URL", group: "Content", defaultValue: "/blog", tooltip: "Site içi yol (/blog) ya da tam URL" }),
    linkNewTab: props.Boolean({ name: "Open in new tab", group: "Content", defaultValue: false, trueLabel: "On", falseLabel: "Off" }),

    campaignId: props.Text({ name: "Campaign id", group: "Dismiss", defaultValue: "default", tooltip: "Cookie'de bu id saklanır. Yeni bir duyuru için id'yi değiştir: önceki barı kapatanlar yenisini görür" }),
    dismissible: props.Boolean({ name: "Dismissible", group: "Dismiss", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Off = × yok, hep görünür" }),
    rememberDays: props.Number({ name: "Remember (days)", group: "Dismiss", defaultValue: 1, tooltip: "Kapatma ne kadar hatırlansın. 0 = yalnız bu oturum" }),

    showOnMobile: props.Boolean({ name: "Show on mobile", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Off = 768px altında gizli (nav itilmez)" }),
    behavior: props.Variant({ name: "Behavior", group: "Layout", options: ["Sticky", "Scrolls away"], defaultValue: "Sticky", tooltip: "Sticky: en üstte sabit, nav altında kalır · Scrolls away: sayfayla kayar, nav yerine döner" }),
    pushNav: props.Boolean({ name: "Push fixed navbar", group: "Layout", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Sabit navbar'ı bar yüksekliği kadar aşağı iter (inline top). --topbar-h değişkeni her durumda <html>'e yazılır" }),
    pushContent: props.Boolean({ name: "Push page content", group: "Layout", defaultValue: false, trueLabel: "On", falseLabel: "Off", tooltip: "On = sayfa içeriği bar yüksekliği kadar aşağı iner (hydration sonrası layout shift yapar, CLS). Off = bar sabit navbar gibi üstte durur, içerik kaymaz" }),
    navSelector: props.Text({ name: "Navbar selector", group: "Layout", defaultValue: "[data-nav]", tooltip: "İtilecek navbar" }),

    theme: props.Variant({ name: "Theme", group: "Look", options: ["Brand", "Dark", "Light", "Custom"], defaultValue: "Brand", tooltip: "Brand = magenta zemin beyaz yazı · Dark · Light (lila) · Custom = aşağıdaki renkler" }),
    customBg: props.Text({ name: "Custom background", group: "Look", defaultValue: "", tooltip: "Theme = Custom: hex ya da CSS rengi" }),
    customText: props.Text({ name: "Custom text color", group: "Look", defaultValue: "", tooltip: "Theme = Custom" }),
  },
  options: { ssr: false },
});
