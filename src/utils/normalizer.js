export function normalizeIncomingMessage(parsed) {
  const add = parsed?.message?.add;
  const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;
  if (!ev || !ev.text) return null;

  // intento de status
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
    entity_id: ev.entity_id ? String(ev.entity_id) : null,  // id de la entidad
    element_id: ev.element_id ? String(ev.element_id) : null, // id del elemento
    contact_id: ev.contact_id ? String(ev.contact_id) : null,
    origin: ev.origin ?? null,                     // "waba" / "facebook" / etc.
    created_at: ev.created_at ? Number(ev.created_at) : null,
  };
}
