import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ReportDownloadForm } from "./ReportDownloadForm";

export default declareComponent(ReportDownloadForm, {
  name: "Report Download Form",
  description:
    "Lead-magnet indirme kartı (Opus Report vb.) — ad, soyad, şirket, " +
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
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "EN",
      tooltip: "Doğrulama/hata mesajlarının dili",
    }),
  },
});
