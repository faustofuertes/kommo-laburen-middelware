import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { startLaburenConversation, continueLaburenConversation } from "../services/laburen.service.js";
import { getContact, addNoteToLead } from "../services/kommo.service.js";
import { sendWppMessage } from "../services/whatsapp.services.js";

const idsPausados = new Set();
const conversationMap = new Map();
const whiteList = [];

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
      if (normalized.origin === 'waba' && normalized.element_id === '18639150') {
        await processKommoMessage(normalized);
        console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------');
      }

    } else if (parsed?.leads?.note) {

      const noteObj = parsed.leads.note[0]?.note;
      processKommoNote(noteObj.text.toLowerCase().trim(), noteObj.element_id);
      console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------');

    } else {
      console.log("⚠️ Payload recibido pero no es mensaje ni nota:", parsed);
    }

  } catch (err) {
    console.error("Error en kommoWebhook:", err);
  }
}

export async function processKommoMessage(normalized) {

  const contact = await getContact(normalized.contact_id);

  let conversationId;
  let data;

  if (idsPausados.has(normalized.element_id)) {
    return;
  }

  // --- Manejo de conversación en Laburen ---
  if (conversationMap.has(normalized.contact_id)) {
    conversationId = conversationMap.get(normalized.contact_id);
    console.log(`Reusando conversación existente para contact_id ${normalized.contact_id} -> ${conversationId}`);

    data = await continueLaburenConversation({
      conversationId,
      query: normalized.text,
      visitorId: normalized.contact_id
    });
  } else {
    data = await startLaburenConversation({
      query: normalized.text,
      visitorId: normalized.contact_id
    });

    conversationId = data?.conversationId || `${normalized.contact_id}-${Date.now()}`;
    conversationMap.set(normalized.contact_id, conversationId);

    console.log(`Nueva conversación asignada para contact_id ${normalized.contact_id}: ${conversationId}`);
  }

  const answer = (data?.answer || "").trim();

  console.log(`${contact.name}: ${normalized.text}`);
  console.log(`Agente: ${answer}`);

  await sendWppMessage(contact.phone, answer);
  await addNoteToLead(normalized.element_id, answer, contact.name);
}

function processKommoNote(note, element_id) {

  if (note === "agente pausar") {
    if (idsPausados.has(element_id)) {
      console.log(`⚠️ Este elemento ${element_id} ya esta pausado.`);
    }
    else {
      idsPausados.add(element_id);
      console.log(`⏸️ El elemento ${element_id} ha sido pausado.`);
    }
    return;
  } else if (note === "agente seguir") {
    if (idsPausados.has(element_id)) {
      idsPausados.delete(element_id);
      console.log(`▶️ El elemento ${element_id} ha sido reanudado.`);
    } else {
      console.log(`⚠️ Este elemento ${element_id} no esta pausado.`);
    }
    return;
  }

}