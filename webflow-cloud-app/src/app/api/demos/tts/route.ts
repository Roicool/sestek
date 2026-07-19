/**
 * TTS proxy'si — env-gated. SESTEK_TTS_URL + SESTEK_TTS_API_KEY
 * tanımlandığında Knovvu/Sestek TTS REST API'sine sunucu tarafında proxy
 * yapar (CORS ve anahtar sızıntısı olmadan). Tanımlı değilken 501 döner ve
 * istemci tarayıcı sentezine (speechSynthesis) düşer.
 *
 * Not: gerçek istek/yanıt şeması Sestek'ten credential gelince
 * doğrulanacak (tts-demo.sestek.com/v1/speech/synthesis).
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = process.env.SESTEK_TTS_URL;
  const key = process.env.SESTEK_TTS_API_KEY;

  if (!base || !key) {
    return Response.json(
      { ok: false, mode: "mock", reason: "TTS API is not configured" },
      { status: 501 }
    );
  }

  const { text, lang, voice } = (await req.json()) as {
    text?: string;
    lang?: string;
    voice?: string;
  };
  if (!text?.trim()) {
    return Response.json({ ok: false, reason: "empty text" }, { status: 400 });
  }

  const upstream = await fetch(base, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text, language: lang, voice }),
  });

  if (!upstream.ok) {
    return Response.json(
      { ok: false, reason: `upstream ${upstream.status}` },
      { status: 502 }
    );
  }

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "cache-control": "no-store",
    },
  });
}
