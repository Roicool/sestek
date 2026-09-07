import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { NotFoundPage } from "./NotFoundPage";

export default declareComponent(NotFoundPage, {
  name: "Not Found Page",
  description:
    "Tam sayfa 404 şablonu: cam efektli minimal navbar, ortalanmış 404 gövdesi, ince footer. Tamamı 100svh'ye kilitli, " +
    "hiçbir ekranda scroll oluşmaz. Arka plan iki yumuşak marka tonu + soluk nokta ızgarası; renkler ve font sitenin token'larından gelir. " +
    "404 sayfasına tek başına bırak (Navbar/Footer symbol'ü ekleme).",
  group: "Sestek",
  props: {
    theme: props.Variant({ name: "Theme", group: "Look", options: ["Light", "Dark"], defaultValue: "Light" }),
    glow: props.Boolean({ name: "Background glow", group: "Look", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Marka tonlarında iki yumuşak ışık lekesi" }),
    grid: props.Boolean({ name: "Dot grid", group: "Look", defaultValue: true, trueLabel: "On", falseLabel: "Off" }),

    logo: props.Image({ name: "Logo", group: "Navbar", tooltip: "Boşsa Logo text gösterilir" }),
    logoText: props.Text({ name: "Logo text", group: "Navbar", defaultValue: "SESTEK" }),
    logoLink: props.Link({ name: "Logo link", group: "Navbar" }),
    logoHeight: props.Number({ name: "Logo height (px)", group: "Navbar", defaultValue: 24 }),
    nav1Label: props.Text({ name: "Link 1 label", group: "Navbar", defaultValue: "Products" }),
    nav1Link: props.Link({ name: "Link 1", group: "Navbar" }),
    nav2Label: props.Text({ name: "Link 2 label", group: "Navbar", defaultValue: "Solutions" }),
    nav2Link: props.Link({ name: "Link 2", group: "Navbar" }),
    nav3Label: props.Text({ name: "Link 3 label", group: "Navbar", defaultValue: "Company" }),
    nav3Link: props.Link({ name: "Link 3", group: "Navbar" }),
    nav4Label: props.Text({ name: "Link 4 label", group: "Navbar", defaultValue: "Resources" }),
    nav4Link: props.Link({ name: "Link 4", group: "Navbar" }),
    navCtaLabel: props.Text({ name: "Button label", group: "Navbar", defaultValue: "Request a demo", tooltip: "Boş = buton yok" }),
    navCtaLink: props.Link({ name: "Button link", group: "Navbar" }),

    code: props.Text({ name: "Code", group: "Body", defaultValue: "404" }),
    eyebrow: props.Text({ name: "Eyebrow", group: "Body", defaultValue: "Page not found" }),
    title: props.Text({ name: "Title", group: "Body", defaultValue: "This page has wandered off" }),
    description: props.Text({ name: "Description", group: "Body", defaultValue: "The link may be broken or the page may have moved. Let's get you back to something useful." }),
    primaryLabel: props.Text({ name: "Primary button", group: "Body", defaultValue: "Back to home" }),
    primaryLink: props.Link({ name: "Primary link", group: "Body" }),
    secondaryLabel: props.Text({ name: "Secondary button", group: "Body", defaultValue: "Contact us", tooltip: "Boş = tek buton" }),
    secondaryLink: props.Link({ name: "Secondary link", group: "Body" }),

    footerText: props.Text({ name: "Footer text", group: "Footer", defaultValue: "", tooltip: "Boş = © <yıl> SESTEK" }),
    foot1Label: props.Text({ name: "Footer link 1 label", group: "Footer", defaultValue: "Privacy" }),
    foot1Link: props.Link({ name: "Footer link 1", group: "Footer" }),
    foot2Label: props.Text({ name: "Footer link 2 label", group: "Footer", defaultValue: "Terms" }),
    foot2Link: props.Link({ name: "Footer link 2", group: "Footer" }),
    foot3Label: props.Text({ name: "Footer link 3 label", group: "Footer", defaultValue: "Cookies" }),
    foot3Link: props.Link({ name: "Footer link 3", group: "Footer" }),
    foot4Label: props.Text({ name: "Footer link 4 label", group: "Footer", defaultValue: "" }),
    foot4Link: props.Link({ name: "Footer link 4", group: "Footer" }),
  },
  options: { ssr: true },
});
