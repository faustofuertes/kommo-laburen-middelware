import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { startLaburenConversation, continueLaburenConversation } from "../services/laburen.service.js";
import { log } from "../logger.js";
import { getContact, addNoteToLead } from "../services/kommo.service.js";
import { sendWppMessage } from "../services/whatsapp.services.js";

const idsPausados = new Set();
const conversationMap = new Map();

export async function kommoWebhook(req, res) {
  res.sendStatus(204); //Responde rapido a Kommo asi el webhook no se reenvia
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

    const note = (parsed?.leads?.note?.[0]?.note?.text || "").toLowerCase().trim();
    const elementId = parsed?.leads?.note?.[0]?.note?.element_id || null;

    // --- Pausa/Reanudación ---
    if (note === "agente pausar") {
      idsPausados.add(elementId);
      log.info(`El elemento ${elementId} ha sido pausado.`);
      return res.sendStatus(204);
    } else if (note === "agente seguir") {
      idsPausados.delete(elementId);
      log.info(`El elemento ${elementId} ha sido reanudado.`);
      return res.sendStatus(204);
    } else {
      log.info(`El elemento ${elementId} no tiene acción de pausa/reanudación.`);
    }

    // --- Ignorar si está pausado ---
    if (idsPausados.has(normalized.element_id)) {
      log.info(`El elemento ${normalized.element_id} está pausado. No se enviará a Laburen.`);
      return res.sendStatus(204);
    }

    log.info(`El elemento ${normalized.element_id} no está pausado. Se enviará a Laburen.`);
    const contact = await getContact(normalized.contact_id);

    let conversationId;
    let data;

    // --- Manejo de conversación en Laburen ---
    if (conversationMap.has(normalized.contact_id)) {
      conversationId = conversationMap.get(normalized.contact_id);
      log.info(`Reusando conversación existente para contact_id ${normalized.contact_id} -> ${conversationId}`);

      data = await continueLaburenConversation({
        conversationId,
        query: normalized.text,
        visitorId: normalized.contact_id,
        metadata: {
          kommo: {
            contactId: normalized.contact_id,
            leadId: normalized.element_id,
            chatId: normalized.chat_id
          }
        }
      });
    } else {
      data = await startLaburenConversation({
        query: normalized.text,
        visitorId: normalized.contact_id,
        metadata: {
          kommo: {
            contactId: normalized.contact_id,
            leadId: normalized.element_id,
            chatId: normalized.chat_id
          }
        }
      });

      conversationId = data?.conversationId || `${normalized.contact_id}-${Date.now()}`;
      conversationMap.set(normalized.contact_id, conversationId);

      log.info(`Nueva conversación asignada para contact_id ${normalized.contact_id}: ${conversationId}`);
    }

    const answer = (data?.answer || "").trim();

    // --- Payload a WhatsApp ---
    const payloadWpp = {
      to: contact.phone,
      message: answer,
      contactName: contact.name,
      leadId: normalized.element_id,
      chatId: normalized.chat_id
    };

    log.info("WPP PAYLOAD →", payloadWpp);

    // 1. Enviar a WhatsApp
    // await sendWppMessage(payloadWpp);

    // 2. Postear nota en Kommo
    await addNoteToLead(normalized.lead_id, `🤖 Agente Laburen: ${answer}`);

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}