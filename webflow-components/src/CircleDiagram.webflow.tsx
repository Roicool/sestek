import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { CircleDiagram, DEFAULT_ITEMS, ICON_NAMES } from "./CircleDiagram";

function item(n: number) {
  const g = "Item " + n;
  const d = DEFAULT_ITEMS[n - 1];
  return {
    ["i" + n + "Label"]: props.Text({ name: "Label", group: g, defaultValue: d ? d.label : "", tooltip: "Halkadaki chip yazısı. Boş = item gizli" }),
    ["i" + n + "Icon"]: props.Variant({ name: "Icon", group: g, options: ICON_NAMES, defaultValue: d && d.icon ? d.icon : "None" }),
    ["i" + n + "Title"]: props.Text({ name: "Card title", group: g, defaultValue: d ? d.cardTitle || "" : "", tooltip: "Sağdaki kartın başlığı. Boş = Label" }),
    ["i" + n + "Text"]: props.Text({ name: "Card text", group: g, defaultValue: "", tooltip: "Opsiyonel açıklama" }),
  };
}

export default declareComponent(CircleDiagram, {
  name: "Circle Diagram",
  description:
    "Dönen halka diyagramı (circle-diagram.js v2.2 + css v1.5.1'in React hali). " +
    "Solda halkaya eşit dağılmış ikonlu chip'ler, sağda üst üste tıklanabilir kartlar. " +
    "Conic-gradient uç sabit hızla döner, geçtiği item aktifleşir ve kart listesi ona kayar. " +
    "Hover/tık/klavye ucu o node'a süpürür; liste üstünde mouse ve klavye odağı dönüşü durdurur. " +
    "Yalnız viewport'tayken döner; GSAP sitenin global'inden. Mobilde chip'ler viewport'u taşırmaz.",
  group: "Sestek",
  props: {
    spin: props.Number({ name: "Spin (s / revolution)", group: "Motion", defaultValue: 14, tooltip: "Bir tam turun süresi. 0 = döngü kapalı. N item'da her adım spin/N sn" }),
    resume: props.Number({ name: "Resume after (s)", group: "Motion", defaultValue: 3, tooltip: "Tık / klavye / hover bitince dönüşün kaldığı yerden devam etme gecikmesi" }),
    start: props.Number({ name: "Start index", group: "Motion", defaultValue: 0, tooltip: "Açılışta aktif item (0 = ilk)" }),
    showCards: props.Boolean({ name: "Card list", group: "Cards", defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Off = yalnız halka" }),
    visible: props.Number({ name: "Visible cards", group: "Cards", defaultValue: 3, tooltip: "Listede aynı anda görünen kart sayısı; aktif kart ortaya kayar" }),
    cardAlign: props.Variant({ name: "Card text align", group: "Cards", options: ["Center", "Left"], defaultValue: "Center" }),
    ...item(1), ...item(2), ...item(3), ...item(4), ...item(5), ...item(6), ...item(7), ...item(8),
  },
  options: { ssr: false },
});
