// Demo hub — server component, her istekte render edilir.
export const dynamic = "force-dynamic";

const DEMOS = [
  {
    href: "speech-recognition",
    eyebrow: "Knovvu SR",
    title: "Speech Recognition",
    description:
      "Konuşma tanıma doğruluğumuzu deneyin — mikrofonla konuşun veya ses dosyası yükleyin, transkript canlı aksın.",
    ready: true,
  },
  {
    href: "tts",
    eyebrow: "Knovvu TTS",
    title: "Text-to-Speech",
    description:
      "Metninizi yazın, dil ve ses seçin, doğal sentezlenmiş konuşmayı anında dinleyin.",
    ready: true,
  },
  {
    href: "#",
    eyebrow: "Knovvu Virtual Agent",
    title: "Virtual Agent",
    description:
      "Sesle ve yazıyla konuşabileceğiniz avatar destekli sanal asistan — çok yakında.",
    ready: false,
  },
];

export default function Home() {
  return (
    <main>
      <header>
        <p className="eyebrow">Knovvu Demos</p>
        <h1>
          Ürünlerimizi <span>şimdi deneyin</span>
        </h1>
        <p className="lead">
          Sestek&apos;in konuşma teknolojilerini tarayıcınızdan test edin —
          kayıt olmadan, beklemeden.
        </p>
      </header>

      <section className="cards">
        {DEMOS.map((demo) => (
          <article
            className={`card demo-hub-card${demo.ready ? "" : " demo-hub-card--soon"}`}
            key={demo.title}
          >
            <p className="eyebrow">{demo.eyebrow}</p>
            <h2>{demo.title}</h2>
            <p>{demo.description}</p>
            {demo.ready ? (
              <a className="demo-btn demo-hub-card__cta" href={demo.href}>
                Demoyu aç →
              </a>
            ) : (
              <span className="demo-hub-card__soon">Yakında</span>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
