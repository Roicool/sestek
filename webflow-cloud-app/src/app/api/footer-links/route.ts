import { getFooterLinks } from "../../../lib/footer-links";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getFooterLinks();
  return new Response(JSON.stringify(result), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": result.ok
        ? "public, s-maxage=300, stale-while-revalidate=3600"
        : "no-store",
    },
  });
}
