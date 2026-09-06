import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ScrollTabs } from "./ScrollTabs";

const STREAM = "https://customer-aqbxsulug92giq9c.cloudflarestream.com/";
const vid = (id: string) => STREAM + id + "/downloads/default.mp4";
const pic = (id: string) => STREAM + id + "/thumbnails/thumbnail.jpg?height=600";

function tab(n: number, d: { title: string; text: string; cta: string; id: string }) {
  const g = "Tab " + n;
  return {
    ["tab" + n + "Title"]: props.Text({ name: "Title", group: g, defaultValue: d.title, tooltip: "Boş = sekme gizli" }),
    ["tab" + n + "Text"]: props.Text({ name: "Description", group: g, defaultValue: d.text }),
    ["tab" + n + "CtaLabel"]: props.Text({ name: "Button label", group: g, defaultValue: d.cta, tooltip: "Boş = buton gizli" }),
    ["tab" + n + "CtaLink"]: props.Link({ name: "Button link", group: g }),
    ["tab" + n + "Video"]: props.Text({ name: "Video URL (mp4)", group: g, defaultValue: d.id ? vid(d.id) : "", tooltip: "Cloudflare Stream downloads/default.mp4" }),
    ["tab" + n + "Poster"]: props.Text({ name: "Poster URL", group: g, defaultValue: d.id ? pic(d.id) : "" }),
  };
}

export default declareComponent(ScrollTabs, {
  name: "Scroll Tabs",
  description:
    "'Agentic CX Suite' scroll-tab bölümü — masaüstü + tablet/mobil tek " +
    "component'te. ≥ 992px: solda sticky başlık + akordeon sekmeler, sağda " +
    "kare video panelleri; viewport ortasından geçen panel aktif, sekmeye " +
    "tıklayınca paneli ortaya kaydırır. ≤ 991px: tek sütun, her sekme " +
    "başlık + açıklama + buton + kendi videosu. Play/pause, restart, mute " +
    "kontrolleri. Sıfır bağımlılık (scroll-list.js'e ihtiyaç yok).",
  group: "Sestek",
  props: {
    heading: props.Text({
      name: "Heading (H2)",
      group: "Section",
      defaultValue: "Agentic CX|Suite",
      tooltip: "| = satır kır",
    }),
    stickyTop: props.Number({
      name: "Sticky top (px)",
      group: "Section",
      defaultValue: 0,
      min: 0,
      max: 400,
      tooltip: "Sol sütunun yapıştığı üst mesafe. 0 = sitenin --_nav---nav-height × 1.5 değeri",
    }),
    ratio: props.Variant({
      name: "Panel ratio",
      group: "Section",
      options: ["1 / 1", "4 / 3", "16 / 9"],
      defaultValue: "1 / 1",
      tooltip: "Video panelinin en-boy oranı",
    }),
    autoplay: props.Boolean({
      name: "Autoplay active video",
      group: "Section",
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip: "Aktif panelin videosu kendiliğinden oynar (sessiz). Reduced-motion'da kapalı",
    }),

    ...tab(1, { title: "Agentic AI", text: "Automate routine customer requests autonomously across voice and digital channels without losing control.", cta: "Explore", id: "9086d006a13942534f67e91b3d6f2ca0" }),
    ...tab(2, { title: "Agent Copilot", text: "Empower human agents with real-time guidance, knowledge search, and live translation during conversations.", cta: "Explore", id: "40827dedd2d7b010146dc72db52c597d" }),
    ...tab(3, { title: "Conversational Intelligence", text: "Analyze 100% of interactions to track quality, ensure compliance, and unlock agent coaching insights.", cta: "Explore", id: "9086d006a13942534f67e91b3d6f2ca0" }),
    ...tab(4, { title: "", text: "", cta: "Explore", id: "" }),
  },
  options: {
    /* IntersectionObserver + video control — client-only */
    ssr: false,
  },
});
