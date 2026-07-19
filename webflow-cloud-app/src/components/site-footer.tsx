/**
 * Basit, kendi kendine yeten site footer'ı.
 * DevLink export'u footer'ı tam getiremediği için (Collection List + grid
 * utility boşlukları) bu sade versiyon kullanılıyor: CMS kolonları
 * server-side çekilir, stiller globals.css'teki .sfooter bloğunda —
 * Webflow utility class'larına bağımlılık yok.
 */

import { getFooterLinks, type FooterLink } from "../lib/footer-links";

const STATIC_COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Resources",
    links: [
      { name: "Blog", href: "/blog" },
      { name: "Demos", href: "/demos" },
    ],
  },
];

const CMS_COLUMNS: { key: string; title: string }[] = [
  { key: "product", title: "Product" },
  { key: "solutions", title: "Solutions" },
  { key: "industries", title: "Industries" },
];

export default async function SiteFooter() {
  const { lists } = await getFooterLinks();

  const columns = [
    ...CMS_COLUMNS.map((c) => ({
      title: c.title,
      links: lists[c.key] ?? [],
    })).filter((c) => c.links.length > 0),
    ...STATIC_COLUMNS,
  ];

  return (
    <footer className="sfooter">
      <div className="sfooter__inner">
        <div className="sfooter__brand">
          <div className="sfooter__logo">SESTEK</div>
          <p className="sfooter__tagline">
            Conversational AI — voice, text and everything in between.
          </p>
        </div>

        <nav className="sfooter__columns" aria-label="Footer">
          {columns.map((col) => (
            <div className="sfooter__col" key={col.title}>
              <div className="sfooter__heading">{col.title}</div>
              <ul className="sfooter__list">
                {col.links.map((link) => (
                  <li key={link.href + link.name}>
                    <a href={link.href} data-underline="">
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="sfooter__bar">
        <span>© {new Date().getFullYear()} Sestek. All rights reserved.</span>
        <span className="sfooter__legal">
          <a href="#" data-underline="">
            Privacy Policy
          </a>
          <a href="#" data-underline="">
            Cookie Policy
          </a>
        </span>
      </div>
    </footer>
  );
}
