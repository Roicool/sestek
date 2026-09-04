import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ReportDownloadForm } from "./ReportDownloadForm";

export default declareComponent(ReportDownloadForm, {
  name: "Report Download Form",
  description:
    "Opus Report lead-magnet'i, iki düzende. HERO: Outbound Call Demo gibi " +
    "İKİ AYRI KART — solda içerik kartı (eyebrow + H1 + açıklama + kanıt " +
    "satırları, görsel kartın içinde), sağda form kartı; orb yok. CARD: " +
    "yalnız form kartı. Form: ad, soyad, şirket, " +
    "kurumsal e-posta + zorunlu privacy onayı + honeypot. CRM lead " +
    "endpoint'ine DOĞRUDAN gönderir (formType frm-opus-report; rapor " +
    "başına prop'la değiştirilir), UTM'leri sticky-utms'ten ekler. " +
    "Başarıda onay sahnesi + File URL doluysa 'Download the report' " +
    "butonu. Demo Request Form ile aynı görsel dil; mobil uyumlu.",
  group: "Sestek",
  props: {
    theme: props.Variant({
      name: "Theme",
      options: ["Soft", "Deep"],
      defaultValue: "Soft",
      tooltip: "Soft: açık minimal · Deep: koyu hali",
    }),
    layout: props.Variant({
      name: "Layout",
      options: ["Hero", "Card"],
      defaultValue: "Hero",
      tooltip:
        "Hero: sayfa hero'su (görsel + H1 + açıklama + sağda form) · " +
        "Card: yalnız form kartı, bölüm içine gömmek için",
    }),
    headingTag: props.Variant({
      name: "Heading tag",
      options: ["H1", "H2"],
      defaultValue: "H1",
      tooltip: "Hero sayfanın ana başlığıysa H1, değilse H2",
    }),
    tagline: props.Text({
      name: "Eyebrow",
      group: "Hero",
      defaultValue: "Opus Research report",
      tooltip: "Başlığın üstündeki küçük rozet — boşsa görünmez",
    }),
    heading: props.Text({
      name: "Heading",
      group: "Hero",
      defaultValue: "The state of conversational AI, in one report",
    }),
    description: props.Text({
      name: "Description",
      group: "Hero",
      defaultValue:
        "Independent analysis of where enterprise voice and conversational " +
        "AI actually deliver — benchmarks, buyer criteria and what " +
        "separates a pilot from production.",
    }),
    bullet1: props.Text({
      name: "Bullet 1",
      group: "Hero",
      defaultValue: "Independent market analysis",
    }),
    bullet2: props.Text({
      name: "Bullet 2",
      group: "Hero",
      defaultValue: "Vendor evaluation criteria",
    }),
    bullet3: props.Text({
      name: "Bullet 3",
      group: "Hero",
      defaultValue: "Free, instant download",
      tooltip: "Boş bırakılan satır gizlenir",
    }),
    imageUrl: props.Text({
      name: "Image URL",
      group: "Hero",
      defaultValue: "",
      tooltip: "Sol kartın görseli — boşsa kart düz zeminde çalışır",
    }),
    imageAlt: props.Text({
      name: "Image alt",
      group: "Hero",
      defaultValue: "",
    }),
    imageStyle: props.Variant({
      name: "Image style",
      options: ["Background", "Panel"],
      defaultValue: "Background",
      tooltip:
        "Background: sol kartı doldurur (scrim + açık tipografi) · " +
        "Panel: sol kartta metnin altında 16/7 bant",
    }),
    formTitle: props.Text({
      name: "Form title",
      group: "Content",
      defaultValue: "Get the Opus Report",
    }),
    formIntro: props.Text({
      name: "Form intro",
      group: "Content",
      defaultValue: "Fill in your details and the report is yours instantly.",
    }),
    firstNameLabel: props.Text({
      name: "First name label",
      group: "Form",
      defaultValue: "First name",
    }),
    lastNameLabel: props.Text({
      name: "Last name label",
      group: "Form",
      defaultValue: "Last name",
    }),
    companyLabel: props.Text({
      name: "Company label",
      group: "Form",
      defaultValue: "Company",
    }),
    emailLabel: props.Text({
      name: "Email label",
      group: "Form",
      defaultValue: "Business email",
    }),
    consentText: props.Text({
      name: "Consent text",
      group: "Form",
      defaultValue:
        "I consent to my personal data being processed to receive this " +
        "report.",
    }),
    consentLinkText: props.Text({
      name: "Consent link text",
      group: "Form",
      defaultValue: "Privacy Policy",
    }),
    consentLinkUrl: props.Text({
      name: "Consent link URL",
      group: "Form",
      defaultValue: "",
      tooltip: "Boşsa link görünmez",
    }),
    consentLink2Text: props.Text({
      name: "Consent link 2 text",
      group: "Form",
      defaultValue: "KVKK",
      tooltip: "İkinci link (örn. KVKK/GDPR aydınlatma metni)",
    }),
    consentLink2Url: props.Text({
      name: "Consent link 2 URL",
      group: "Form",
      defaultValue: "",
      tooltip: "Boşsa ikinci link görünmez",
    }),
    buttonText: props.Text({
      name: "Button text",
      group: "Form",
      defaultValue: "Get the report",
    }),
    sendingText: props.Text({
      name: "Sending text",
      group: "Form",
      defaultValue: "Sending…",
    }),
    successTitle: props.Text({
      name: "Success title",
      group: "Success",
      defaultValue: "Enjoy the read",
    }),
    successText: props.Text({
      name: "Success caption",
      group: "Success",
      defaultValue: "Your copy is ready — download it below.",
    }),
    downloadText: props.Text({
      name: "Download button text",
      group: "Success",
      defaultValue: "Download the report",
    }),
    fileUrl: props.Text({
      name: "File URL",
      group: "Success",
      defaultValue: "",
      tooltip:
        "Raporun PDF linki (Webflow asset) — başarıda indirme butonu " +
        "bu adrese gider; boşsa buton görünmez",
    }),
    endpoint: props.Text({
      name: "API endpoint",
      group: "API",
      defaultValue: "/demos/api/crm/lead",
      tooltip: "CRM lead proxy path'i (bkz. CRMFORMSREPORT.md)",
    }),
    formType: props.Text({
      name: "Form type",
      group: "API",
      defaultValue: "frm-opus-report",
      tooltip:
        "Dynamics ses_formtype değeri — başka bir rapor için " +
        "frm-<rapor-adı> ver (endpoint whitelist'ine eklenmeli)",
    }),
    freeEmail: props.Variant({
      name: "Free email",
      group: "API",
      options: ["Block", "Allow"],
      defaultValue: "Block",
      tooltip:
        "Block: gmail/hotmail gibi ücretsiz sağlayıcılar reddedilir " +
        "(kurumsal e-posta zorunlu) · Allow: kabul edilir. Tek kullanımlık " +
        "adresler her iki durumda da reddedilir.",
    }),
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "EN",
      tooltip: "Doğrulama/hata mesajlarının dili",
    }),
    turnstileSiteKey: props.Text({
      name: "Turnstile site key (ops.)",
      group: "API",
      defaultValue: "",
      tooltip:
        "Cloudflare Turnstile SITE key. Genelde BOŞ bırakılır: anahtar site " +
        "geneli custom code'da tek yerde tanımlanır " +
        "(window.SESTEK_TURNSTILE_SITE_KEY) ve buradan okunur. Yalnız bu " +
        "örneğe özel bir anahtar gerekiyorsa doldur. Site key gizli değildir; " +
        "secret key yalnız sunucunun ortam değişkeninde durur.",
    }),
    turnstileWidget: props.Variant({
      name: "Turnstile widget",
      group: "API",
      options: ["Visible", "Invisible"],
      defaultValue: "Visible",
      tooltip:
        "Invisible (bu formda varsayılan): yalnız gerçekten meydan okuma " +
        "gerekirse görünür. Koruma aynen çalışır, sadece kutu çizilmez. " +
        "Visible: Cloudflare kutusu her zaman görünür — Outbound Call Demo'da " +
        "böyle, çünkü orada her gönderim gerçek bir telefon araması başlatıyor.",
    }),
  },
});
