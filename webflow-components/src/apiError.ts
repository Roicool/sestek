/**
 * apiError — sunucu hata kodunu mesaj anahtarına çevirir.
 *
 * İki endpoint hata kodunu FARKLI alanda döndürüyor: outbound `error`,
 * CRM lead `reason`. Ayrıca CRM tarafında bazı kodlar boşluklu geliyor
 * ("rate limited", "unsupported content type"), bazıları alt tireli
 * ("free_email"). İstemcinin mesaj tablosu tek biçimde (alt tireli) olduğu
 * için burada normalize edilir.
 *
 * Bunu tek yerde tutmanın sebebi: alanlardan yalnız birine bakan bir
 * component, sunucunun gönderdiği anlamlı hatayı ("kurumsal e-posta
 * kullanın") yutup ziyaretçiye "bir şeyler ters gitti" gösteriyordu.
 */
export function errorCode(body: unknown): string {
  const b = (body || {}) as { error?: unknown; reason?: unknown };
  const raw = b.error ?? b.reason;
  if (typeof raw !== "string") return "generic";
  const code = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return code || "generic";
}
