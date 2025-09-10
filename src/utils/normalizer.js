// utils/normalizer.js
/**
 * Devuelve un objeto normalizado SOLO para message.add incoming.
 * Incluye chat_status si se puede inferir del payload.
 */
export function normalizeIncomingMessage(parsed) {
  const add = parsed?.message?.add;
  const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;
  if (!ev || !ev.text) return null;

  // intento de status (si viene en este webhook o en ramas cercanas)
  const chat_status =
    ev.chat_status ??
    ev.status ??
    parsed?.talk?.status ??
    (Array.isArray(parsed?.talk?.update) ? parsed.talk.update[0]?.status : parsed?.talk?.update?.status) ??
    parsed?.chat?.status ??
    parsed?.conversation?.status ??
    (parsed?.talk?.on_hold || parsed?.flags?.on_hold ? "on_hold" : null) ??
    null;

  return {
    text: ev.text ?? null,
    chat_id: ev.chat_id ?? null,
    chat_status,
    talk_id: ev.talk_id ?? null,
    entity_type: ev.entity_type ?? null,           // "lead" etc.
    entity_id: ev.entity_id ? String(ev.entity_id) : null,
    contact_id: ev.contact_id ? String(ev.contact_id) : null,
    origin: ev.origin ?? null,                     // "waba" / "facebook" / etc.
    created_at: ev.created_at ? Number(ev.created_at) : null,
  };
}
