import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "sestek-cloud-app",
      message: "Merhaba! Bu JSON, Webflow Cloud üzerinde çalışan bir API endpoint'inden geliyor.",
      time: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    }
  );
};
