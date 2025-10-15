export function normalizeIncomingMessage(parsed) {
  const add = parsed?.message?.add;
  const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;

  if (!ev || !ev.text) return null;

  return {
    text: ev.text ?? null,
    contact_id: ev.contact_id ? String(ev.contact_id) : null,
    element_id: ev.element_id ? String(ev.element_id) : null,
    lead_id: ev.entity_type === "lead" && ev.entity_id ? String(ev.entity_id) : null,
    origin: ev.origin ? String(ev.origin) : null,
  };
}