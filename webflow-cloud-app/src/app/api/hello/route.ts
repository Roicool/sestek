export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "sestek-cloud-app",
    message:
      "Merhaba! Bu JSON, Webflow Cloud üzerinde çalışan bir API endpoint'inden geliyor.",
    time: new Date().toISOString(),
  });
}
