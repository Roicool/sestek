/**
 * Dosya transkripsiyon endpoint'i — env-gated.
 * SESTEK_SR_URL + SESTEK_SR_API_KEY tanımlıysa yüklenen sesi Sestek SR
 * API'sine iletir; değilse AÇIKÇA "simulated" işaretli örnek yanıt döner
 * (asla gerçek doğruluk iddiası taklit edilmez).
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const base = process.env.SESTEK_SR_URL;
  const key = process.env.SESTEK_SR_API_KEY;

  const form = await req.formData();
  const audio = form.get("audio");
  const lang = String(form.get("lang") ?? "tr-TR");

  if (!(audio instanceof File)) {
    return Response.json({ ok: false, reason: "no audio" }, { status: 400 });
  }

  if (base && key) {
    const upstream = await fetch(`${base}?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: audio,
    });
    if (!upstream.ok) {
      return Response.json(
        { ok: false, reason: `upstream ${upstream.status}` },
        { status: 502 }
      );
    }
    const data = await upstream.json();
    return Response.json({ ok: true, simulated: false, ...data });
  }

  /* Mock: kısa bir bekleme + açıkça simüle edilmiş yanıt */
  await new Promise((r) => setTimeout(r, 1200));
  return Response.json({
    ok: true,
    simulated: true,
    transcript: `[Simüle transkript — "${audio.name}" (${(audio.size / 1024 / 1024).toFixed(1)}MB, ${lang}). Gerçek Sestek SR entegrasyonu env değişkenleri eklendiğinde bu satırın yerini canlı sonuç alacak.]`,
  });
}
