/**
 * Ortak demo sayfası iskeleti: eyebrow + başlık + açıklama + geri linki.
 * Her demo sayfası içeriğini bunun içine koyar.
 */

export default function DemoShell({
  eyebrow = "Sestek Demo",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="demo-shell">
      <a className="demo-shell__back" href="/demos" data-underline="">
        ← Tüm demolar
      </a>
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="lead">{description}</p>
      </header>
      <div className="demo-shell__body">{children}</div>
    </main>
  );
}
