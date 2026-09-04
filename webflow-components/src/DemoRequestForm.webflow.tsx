import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { DemoRequestForm } from "./DemoRequestForm";

export default declareComponent(DemoRequestForm, {
  name: "Demo Request Form",
  description:
    "Request a Demo sayfası — solda H2 başlık + açıklama + opsiyonel görsel " +
    "(URL boşsa gizli), sağda CRM'e DOĞRUDAN yazan form kartı (ad, soyad, " +
    "şirket, kurumsal e-posta, telefon, mesaj, zorunlu privacy onayı, " +
    "honeypot). Lead endpoint'ine JSON POST eder (formType frm-demo), " +
    "UTM'leri sticky-utms'ten ekler. Ana sayfadaki Outbound Call Demo ile " +
    "aynı görsel dil; mobil uyumlu. Font sayfadan miras alınır.",
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
      options: ["Single", "Steps"],
      defaultValue: "Single",
      tooltip:
        "Single: tüm alanlar tek ekranda · Steps: 3 adımlı sihirbaz " +
        "(kimlik → iletişim → mesaj+onay) + ilerleme çubuğu",
    }),
    tagline: props.Text({
      name: "Eyebrow",
      group: "Content",
      defaultValue: "Live demo",
      tooltip: "H2 üstündeki küçük rozet — boş bırakılırsa görünmez",
    }),
    heading: props.Text({
      name: "Heading (H2)",
      group: "Content",
      defaultValue: "Request a Demo",
    }),
    description: props.Text({
      name: "Description",
      group: "Content",
      defaultValue:
        "See how SESTEK helps you elevate the customer experience with " +
        "AI-powered solutions, analyzing 100% of customer conversations, " +
        "and providing deeper insights and better results for your business.",
    }),
    description2: props.Text({
      name: "Description 2",
      group: "Content",
      defaultValue:
        "Support your agents more efficiently and help them solve customer " +
        "problems in a heartbeat, with our market-leading speech " +
        "recognition accuracy (>97%).",
      tooltip: "İkinci paragraf — boş bırakılırsa görünmez",
    }),
    bullet1: props.Text({
      name: "Bullet 1",
      group: "Content",
      defaultValue: "100% of customer conversations analyzed",
    }),
    bullet2: props.Text({
      name: "Bullet 2",
      group: "Content",
      defaultValue: ">97% speech recognition accuracy",
    }),
    bullet3: props.Text({
      name: "Bullet 3",
      group: "Content",
      defaultValue: "Personalized demo for your industry",
      tooltip: "Özellik listesi — boş bırakılanlar gizlenir",
    }),
    imageUrl: props.Text({
      name: "Image URL",
      group: "Content",
      defaultValue: "",
      tooltip: "Başlığın altındaki görsel — boş bırakılırsa hiç görünmez",
    }),
    imageAlt: props.Text({
      name: "Image alt",
      group: "Content",
      defaultValue: "",
    }),
    formTitle: props.Text({
      name: "Form title",
      group: "Form",
      defaultValue: "Tell us about yourself",
      tooltip: "H2 zaten 'Request a Demo' olduğundan kart başlığı farklı",
    }),
    formIntro: props.Text({
      name: "Form intro",
      group: "Form",
      defaultValue: "We'll get back to you within one business day.",
    }),
    firstNameLabel: props.Text({
      name: "First name placeholder",
      group: "Form",
      defaultValue: "First name",
    }),
    lastNameLabel: props.Text({
      name: "Last name placeholder",
      group: "Form",
      defaultValue: "Last name",
    }),
    companyLabel: props.Text({
      name: "Company placeholder",
      group: "Form",
      defaultValue: "Company",
    }),
    emailLabel: props.Text({
      name: "Email placeholder",
      group: "Form",
      defaultValue: "Business email",
    }),
    phoneLabel: props.Text({
      name: "Phone placeholder",
      group: "Form",
      defaultValue: "Phone number",
    }),
    messageLabel: props.Text({
      name: "Message placeholder",
      group: "Form",
      defaultValue: "What would you like to see?",
    }),
    consentText: props.Text({
      name: "Consent text",
      group: "Form",
      defaultValue:
        "I consent to my personal data being processed to respond to my " +
        "demo request.",
    }),
    consentLinkText: props.Text({
      name: "Consent link text",
      group: "Form",
      defaultValue: "Privacy Policy",
      tooltip: "Consent cümlesinin sonuna eklenen link metni",
    }),
    consentLinkUrl: props.Text({
      name: "Consent link URL",
      group: "Form",
      defaultValue: "",
      tooltip: "KVKK / Privacy Policy sayfası (boşsa link görünmez)",
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
    nextText: props.Text({
      name: "Next text",
      group: "Form",
      defaultValue: "Continue",
      tooltip: "Steps layout'ta ileri butonu",
    }),
    backText: props.Text({
      name: "Back text",
      group: "Form",
      defaultValue: "Back",
      tooltip: "Steps layout'ta geri butonu",
    }),
    buttonText: props.Text({
      name: "Button text",
      group: "Form",
      defaultValue: "Request demo",
    }),
    sendingText: props.Text({
      name: "Sending text",
      group: "Form",
      defaultValue: "Sending…",
    }),
    successTitle: props.Text({
      name: "Success title",
      group: "Form",
      defaultValue: "Request received",
    }),
    successText: props.Text({
      name: "Success caption",
      group: "Form",
      defaultValue:
        "Thanks — our team will reach out shortly to schedule your demo.",
    }),
    formCaption: props.Text({
      name: "Form caption",
      group: "Form",
      defaultValue: "Your details are used only to respond to this request.",
      tooltip: "CTA'nın altındaki küçük güven notu",
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
      defaultValue: "frm-demo",
      tooltip:
        "Dynamics ses_formtype değeri — frm-contact ile İletişim " +
        "sayfasında da kullanılabilir",
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
    phoneCountry: props.Text({
      name: "Default country",
      group: "Form",
      defaultValue: "TR",
      tooltip:
        "Telefon alanında önceden seçili ülkenin ISO kodu (TR, GB, DE…).",
    }),
    phoneCountries: props.Text({
      name: "Country list",
      group: "Form",
      defaultValue: "",
      tooltip:
        "Boş bırakılırsa tüm ülkeler listelenir. Kısıtlamak için ISO " +
        "kodlarını virgülle yaz (örn. \"TR,GB,DE\") — yazdığın sıra korunur.",
    }),
    phonePreferred: props.Text({
      name: "Preferred countries",
      group: "Form",
      defaultValue: "TR,GB,US,DE,FR,NL",
      tooltip:
        "Listenin en üstüne alınacak ülkeler (ISO kodu, virgülle). Alfabetik " +
        "listede aşağı kaydırmadan seçilsinler diye.",
    }),
    phoneAutoCountry: props.Variant({
      name: "Auto country",
      group: "Form",
      options: ["On", "Off"],
      defaultValue: "On",
      tooltip:
        "On: ziyaretçinin ülkesi tahmin edilip önceden seçilir. Ziyaretçi " +
        "seçiciye dokunduysa üzerine yazılmaz. Off: her zaman varsayılan " +
        "ülke açılır.",
    }),
    geoEndpoint: props.Text({
      name: "Geo endpoint",
      group: "API",
      defaultValue: "",
      tooltip:
        "Ülkeyi IP'den dönen uç, ör. /demos/api/geo → {\"country\":\"TR\"}. " +
        "Boşsa ağ isteği atılmaz ve tarayıcı dil ayarından tahmin edilir " +
        "(daha az isabetli: dil ayarı konum değildir).",
    }),
  },
});
