import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { CookieConsent } from "./CookieConsent";

export default declareComponent(CookieConsent, {
  name: "Cookie Consent",
  description:
    "Minimal Sestek çerez banner'ı — gerçekten çalışır: seçim cookie'de hatırlanır, Google Consent Mode v2 " +
    "güncellenir (gtag consent update + dataLayer 'cookie_consent_update' event'i), " +
    "type=\"text/plain\" data-consent=\"analytics|marketing\" script'leri yalnız izinle açılır, " +
    "footer'daki [data-cookie-settings] linki tercihleri yeniden açar, GPC sinyaline saygı. " +
    "Kategoriler: Zorunlu / Analitik / Pazarlama (+ Tercihler). EN/TR otomatik. " +
    "Sol altta küçük kart, mobilde alt sheet; opsiyonel engelleyici mod.",
  group: "Sestek",
  props: {
    locale: props.Variant({ name: "Locale", group: "Content", options: ["Auto", "en", "tr"], defaultValue: "Auto" }),
    titleEn: props.Text({ name: "Title (EN)", group: "Content", defaultValue: "", tooltip: "Boş = We use cookies" }),
    textEn: props.Text({ name: "Text (EN)", group: "Content", defaultValue: "", tooltip: "Boş = hazır metin" }),
    policyUrlEn: props.Text({ name: "Policy URL (EN)", group: "Content", defaultValue: "/legal/cookie-policy" }),
    titleTr: props.Text({ name: "Title (TR)", group: "Content", defaultValue: "", tooltip: "Boş = Çerez kullanıyoruz" }),
    textTr: props.Text({ name: "Text (TR)", group: "Content", defaultValue: "" }),
    policyUrlTr: props.Text({ name: "Policy URL (TR)", group: "Content", defaultValue: "/tr/yasal/cerez-politikasi" }),

    policyVersion: props.Text({ name: "Policy version", group: "Consent", defaultValue: "1", tooltip: "Değiştirince herkese yeniden sorulur" }),
    rememberDays: props.Number({ name: "Remember (days)", group: "Consent", defaultValue: 180, tooltip: "Seçimin cookie'de kalma süresi" }),
    showReject: props.Boolean({ name: "Reject button", group: "Consent", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Kabul'ün yanında tek tıkla Reddet" }),
    preferencesCategory: props.Boolean({ name: "Preferences category", group: "Consent", defaultValue: false, trueLabel: "On", falseLabel: "Off", tooltip: "Off = 3 kategori (Zorunlu, Analitik, Pazarlama); functionality/personalization_storage analitikle birlikte gider" }),
    respectGpc: props.Boolean({ name: "Respect GPC", group: "Consent", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Global Privacy Control sinyali varsa kategoriler kapalı başlar" }),

    position: props.Variant({ name: "Position", group: "Look", options: ["Bottom left", "Bottom right", "Bottom center"], defaultValue: "Bottom left" }),
    theme: props.Variant({ name: "Theme", group: "Look", options: ["Light", "Dark"], defaultValue: "Light" }),
    blocking: props.Boolean({ name: "Blocking", group: "Look", defaultValue: false, trueLabel: "On", falseLabel: "Off", tooltip: "On = arkaplan karartılır, seçim yapılana dek sayfa kullanılamaz" }),
    delay: props.Number({ name: "Show after (ms)", group: "Look", defaultValue: 600 }),
  },
  options: { ssr: false },
});
