import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { startLaburenConversation, continueLaburenConversation } from "../services/laburen.service.js";
import { getContact, addNoteToLead } from "../services/kommo.service.js";
import { sendWppMessage } from "../services/whatsapp.services.js";

const idsPausados = new Set();
const conversationMap = new Map();
const whiteList = [];

export async function kommoWebhook(req, res) {
  res.sendStatus(204); // Responde rápido para que Kommo no reenvíe

  try {
    const contentType = req.headers["content-type"] || "";
    const raw =
      typeof req.body === "string"
        ? req.body
        : req.body
          ? req.body.toString("utf8")
          : "";

    const parsed = parseIncoming(raw, contentType);
    const normalized = normalizeIncomingMessage(parsed);

    if (normalized.origin === 'waba' && normalized.element_id === '18712314') {
      await processKommoMessage(normalized);
      console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------');
    }

  } catch (err) {
    console.error("Error en kommoWebhook:", err);
    console.log('--------------------------------------------------------------------------------------------------------------------------------------------------------');
  }
}

export async function processKommoMessage(normalized) {

  const note = (normalized?.leads?.note?.[0]?.note?.text || "").toLowerCase().trim();

  // --- Pausa/Reanudación ---
  if (note === "agente pausar") {
    idsPausados.add(normalized.element_id);
    console.log(`El elemento ${normalized.element_id} ha sido pausado.`);
    return;
  } else if (note === "agente seguir") {
    idsPausados.delete(normalized.element_id);
    console.log(`El elemento ${normalized.element_id} ha sido reanudado.`);
    return;
  }

  if (idsPausados.has(normalized.element_id)) {
    console.log(`El elemento ${normalized.element_id} está pausado. No se enviará a Laburen.`);
    return;
  }

  console.log(`El elemento ${normalized.element_id} no está pausado. Se enviará a Laburen.`);

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