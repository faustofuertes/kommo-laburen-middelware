export function normalizeIncomingMessage(parsed) {
  const add = parsed?.message?.add;
  const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;

  if (!ev || !ev.text) return null;

  return {
    text: ev.text ?? null,
    contact_id: ev.contact_id ? String(ev.contact_id) : null
  };
}