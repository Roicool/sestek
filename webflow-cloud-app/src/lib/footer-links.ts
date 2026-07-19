/**
 * Footer CMS link kolonları — Webflow CMS API'sinden çekilir.
 * SiteFooter (server component) ve /api/footer-links route'u paylaşır.
 * WEBFLOW_CMS_TOKEN yoksa boş döner; sayfa kırılmaz.
 */

const SITE_ID = "6a15f6e39b139e2c81103be6"; // rc-sestek

const SLUG_HINTS: Record<string, string[]> = {
  product: ["product", "products", "urunler", "ürünler"],
  solutions: ["solution", "solutions", "cozumler", "çözümler"],
  industries: ["industry", "industries", "sektorler", "sektörler"],
};

export type FooterLink = { name: string; href: string };
export type FooterLists = Record<string, FooterLink[]>;

export async function getFooterLinks(): Promise<{
  ok: boolean;
  reason?: string;
  lists: FooterLists;
}> {
  const token = process.env.WEBFLOW_CMS_TOKEN;
  if (!token) return { ok: false, reason: "missing WEBFLOW_CMS_TOKEN", lists: {} };

  const headers = {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };

  try {
    const colRes = await fetch(
      `https://api.webflow.com/v2/sites/${SITE_ID}/collections`,
      { headers }
    );
    if (!colRes.ok) {
      return { ok: false, reason: `collections ${colRes.status}`, lists: {} };
    }
    const { collections = [] } = (await colRes.json()) as {
      collections?: { id: string; slug?: string; displayName?: string }[];
    };

    const lists: FooterLists = {};

    await Promise.all(
      Object.entries(SLUG_HINTS).map(async ([key, hints]) => {
        const col = collections.find(
          (c) =>
            hints.includes((c.slug ?? "").toLowerCase()) ||
            hints.includes((c.displayName ?? "").toLowerCase())
        );
        if (!col) return;

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

    return { ok: true, lists };
  } catch {
    return { ok: false, reason: "fetch failed", lists: {} };
  }
}
