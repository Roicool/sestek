// Server component — her istekte Cloudflare Workers üzerinde render edilir.
export const dynamic = "force-dynamic";

export default function Home() {
  const renderedAt = new Date().toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <main>
      <header>
        <p className="eyebrow">Webflow Cloud</p>
        <h1>
          Sestek <span>Demo Hub</span>
        </h1>
        <p className="lead">
          Bu sayfa, Webflow sitesine mount edilmiş bir Next.js uygulamasından
          server-side render ediliyor. Demo sayfaları ve özel servisler buraya
          eklenecek.
        </p>
      </header>

      <section className="cards">
        <article className="card">
          <h2>Server-side render</h2>
          <p>
            Bu istek <strong>{renderedAt}</strong>&apos;de Cloudflare Workers
            üzerinde işlendi — statik değil, her ziyarette yeniden üretiliyor.
          </p>
        </article>

        <article className="card">
          <h2>API endpoint örneği</h2>
          <p>
            <a href="api/hello">
              <code>/demos/api/hello</code>
            </a>{" "}
            canlı bir JSON servisi — form işleme, hesaplayıcı, entegrasyon gibi
            servislerin temeli.
          </p>
        </article>

        <article className="card">
          <h2>Sıradaki demolar</h2>
          <p>
            Yeni bir demo eklemek için <code>src/app/</code> altına bir klasör +{" "}
            <code>page.tsx</code> koymak yeterli — route otomatik oluşur.
          </p>
        </article>
      </section>
    </main>
  );
}
