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
    heading: props.Text({
      name: "Heading (H2)",
      group: "Content",
      defaultValue: "See Knovvu in action",
    }),
    description: props.Text({
      name: "Description",
      group: "Content",
      defaultValue:
        "Tell us a little about yourself and our team will set up a " +
        "personalized demo — real use cases, your industry, your language.",
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
      defaultValue: "Request a demo",
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
    lang: props.Variant({
      name: "Language",
      group: "API",
      options: ["TR", "EN"],
      defaultValue: "EN",
      tooltip: "Doğrulama/hata mesajlarının dili",
    }),
  },
});
