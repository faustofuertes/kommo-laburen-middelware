import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage, normalizeIncomingNote } from "../utils/normalizer.js";
import { startLaburenConversation, continueLaburenConversation } from "../services/laburen.service.js";
import { getContact, addNoteToLead } from "../services/kommo.service.js";
import { sendWppMessage } from "../services/whatsapp.services.js";

const idsPausados = new Set();
const conversationMap = new Map();
const whiteList = [];

/*export async function kommoNoteWebhook(req, res) {
  res.sendStatus(204);

  try {
    const contentType = req.headers["content-type"] || "";
    const raw =
      typeof req.body === "string"
        ? req.body
        : req.body
          ? req.body.toString("utf8")
          : "";

    const parsed = parseIncoming(raw, contentType);
    const normalized = normalizeIncomingNote(parsed);

    console.log("🟣 Llegó la nota:", normalized.text, "de:", normalized.element_id);

    await processKommoNote(normalized.text.toLowerCase().trim(), normalized.element_id);

  } catch (error) {
    console.error("Error kommoNoteWebhook:", error);
  }
}*/

export async function kommoWebhook(req, res) {
  res.sendStatus(204); // responder rápido

  try {
    const contentType = req.headers["content-type"] || "";
    const raw =
      typeof req.body === "string"
        ? req.body
        : req.body?.toString("utf8") || "";

    const parsed = parseIncoming(raw, contentType);

    if (parsed?.message?.add) {
      const normalized = normalizeIncomingMessage(parsed);
      if (!normalized) return;

      console.log("📩 Es un mensaje:", normalized.text, "de:", normalized.contact_id);
      await processKommoMessage(normalized);

    } else if (parsed?.leads?.note) {
      const noteObj = parsed.leads.note[0]?.note;
      if (!noteObj || !noteObj.text) return;
      console.log("📝 Nota de lead:", noteObj.text, "de:", noteObj.element_id);
      // await processKommoNote(noteObj.text.toLowerCase().trim(), noteObj.element_id);
    } else {
      console.log("⚠️ Payload recibido pero no es mensaje ni nota:", parsed);
    }

    //if (normalized.origin === 'waba' && normalized.element_id === '18766174') {
    //   await processKommoMessage(normalized);
    //   console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------');
    // }

  } catch (err) {
    console.error("Error en kommoWebhook:", err);
  }
}


export async function processKommoMessage(normalized) {

  const contact = await getContact(normalized.contact_id);

  let conversationId;
  let data;

  // --- Manejo de conversación en Laburen ---
  if (conversationMap.has(normalized.contact_id)) {
    conversationId = conversationMap.get(normalized.contact_id);
    console.log(`Reusando conversación existente para contact_id ${normalized.contact_id} -> ${conversationId}`);

    data = await continueLaburenConversation({
      conversationId,
      query: normalized.text,
      visitorId: normalized.contact_id,
      metadata: { kommo: { contactId: normalized.contact_id, leadId: normalized.element_id, chatId: normalized.chat_id } }
    });
  } else {
    data = await startLaburenConversation({
      query: normalized.text,
      visitorId: normalized.contact_id,
      metadata: { kommo: { contactId: normalized.contact_id, leadId: normalized.element_id, chatId: normalized.chat_id } }
    });

    conversationId = data?.conversationId || `${normalized.contact_id}-${Date.now()}`;
    conversationMap.set(normalized.contact_id, conversationId);

    console.log(`Nueva conversación asignada para contact_id ${normalized.contact_id}: ${conversationId}`);
  }

  const answer = (data?.answer || "").trim();

  console.log(`${contact.name}: ${normalized.text}`);
  console.log(`Agente: ${answer}`);

  // Mandar a WPP
  await sendWppMessage(contact.phone, answer);

  // Mandar nota a Kommo
  await addNoteToLead(normalized.element_id, answer, contact.name);
}

export async function processKommoNote(note, element_id) {

  if (note === "agente pausar") {
    idsPausados.add(element_id);
    console.log(`El elemento ${element_id} ha sido pausado.`);
    return;
  } else if (note === "agente seguir") {
    idsPausados.delete(element_id);
    console.log(`El elemento ${element_id} ha sido reanudado.`);
    return;
  }

}