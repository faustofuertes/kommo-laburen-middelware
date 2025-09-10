/**
 * Recibe el objeto anidado (parsed) y devuelve:
 * { text, chat_id, talk_id, entity_type, entity_id, contact_id, origin, created_at }
 * Solo si es un mensaje ENTRANTE (message.add con type: "incoming").
 * Caso contrario, retorna null.
 */
export function normalizeIncomingMessage(parsed) {
    const add = parsed?.message?.add;
    const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;
    if (!ev || !ev.text) return null;
  
    return {
      text: ev.text ?? null,
      chat_id: ev.chat_id ?? null,
      chat_status: ev.chat_status ?? null,
      talk_id: ev.talk_id ?? null,
      entity_type: ev.entity_type ?? null, // "lead"
      entity_id: ev.entity_id ? String(ev.entity_id) : null,
      contact_id: ev.contact_id ? String(ev.contact_id) : null,
      origin: ev.origin ?? null,            // waba / facebook / etc.
      created_at: ev.created_at ? Number(ev.created_at) : null,
    };
  }  