/**
 * Footer'daki üç CMS link kolonunu (Product / Solutions / Industries) Webflow
 * CMS API'sinden çeker. DevLink, Collection List'leri export edemediği için
 * bu route + SiteRuntime enjeksiyonu o boşluğu canlı veriyle dolduruyor.
 *
 * Gerekli env: WEBFLOW_CMS_TOKEN — rc-sestek site token'ı, yalnızca
 * "CMS: Read" scope'u yeterli. Dashboard → sestek-demos → Environment
 * variables'a secret olarak eklenir. Token yoksa boş liste döner (sayfa
 * kırılmaz, kolonlar sadece boş kalır).
 */

export const dynamic = "force-dynamic";

const SITE_ID = "6a15f6e39b139e2c81103be6"; // rc-sestek

/* Kolon anahtarı → eşleşebilecek koleksiyon slug/adları */
const SLUG_HINTS: Record<string, string[]> = {
  product: ["product", "products", "urunler", "ürünler"],
  solutions: ["solution", "solutions", "cozumler", "çözümler"],
  industries: ["industry", "industries", "sektorler", "sektörler"],
};

type FooterLink = { name: string; href: string };

export async function GET() {
  const token = process.env.WEBFLOW_CMS_TOKEN;
  if (!token) {
    return json({ ok: false, reason: "missing WEBFLOW_CMS_TOKEN", lists: {} });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };

  const colRes = await fetch(
    `https://api.webflow.com/v2/sites/${SITE_ID}/collections`,
    { headers }
  );
  if (!colRes.ok) {
    return json({ ok: false, reason: `collections ${colRes.status}`, lists: {} });
  }
  const { collections = [] } = (await colRes.json()) as {
    collections?: { id: string; slug?: string; displayName?: string }[];
  };

  const lists: Record<string, FooterLink[]> = {};

  await Promise.all(
    Object.entries(SLUG_HINTS).map(async ([key, hints]) => {
      const col = collections.find(
        (c) =>
          hints.includes((c.slug ?? "").toLowerCase()) ||
          hints.includes((c.displayName ?? "").toLowerCase())
      );
      if (!col) return;

      /* /items/live → yalnızca yayınlanmış item'lar */
      const itRes = await fetch(
        `https://api.webflow.com/v2/collections/${col.id}/items/live?limit=100`,
        { headers }
      );
      if (!itRes.ok) return;
      const { items = [] } = (await itRes.json()) as {
        items?: {
          isDraft?: boolean;
          isArchived?: boolean;
          fieldData?: { name?: string; slug?: string };
        }[];
      };

      lists[key] = items
        .filter((i) => !i.isDraft && !i.isArchived)
        .map((i) => ({
          name: i.fieldData?.name ?? "",
          href: `/${col.slug}/${i.fieldData?.slug ?? ""}`,
        }))
        .filter((l) => l.name && !l.href.endsWith("/"));
    })
  );

  return json({ ok: true, lists }, 300);
}

function json(body: unknown, sMaxAge = 0) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(sMaxAge
        ? { "cache-control": `public, s-maxage=${sMaxAge}, stale-while-revalidate=3600` }
        : { "cache-control": "no-store" }),
    },
  });
}
