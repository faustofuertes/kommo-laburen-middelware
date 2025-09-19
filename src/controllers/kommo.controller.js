import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { startLaburenConversation, continueLaburenConversation } from "../services/laburen.service.js";
import { log } from "../logger.js";
import { text } from "express";
import { getContact } from "../services/kommo.service.js";

const idsPausados = new Set();
const conversationMap = new Map();

export async function kommoWebhook(req, res) {
  try {
    // Cuerpo RAW → tu parser decide (JSON o x-www-form-urlencoded con corchetes)
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
    const elementId = parsed?.leads?.note?.[0]?.note?.element_id || ""

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

    if (!normalized) return res.sendStatus(204);

    // Mapear IDs de Kommo → mantener el hilo en Laburen
    const conversationId = String(
      normalized.chatId ?? normalized.leadId ?? normalized.contactId ?? ""
    );
    const visitorId = String(
      normalized.contactId ?? normalized.leadId ?? ""
    );

    if (idsPausados.has(normalized.element_id)) {
      log.info(`El elemento ${normalized.element_id} está pausado. No se enviará a Laburen.`);
      return res.sendStatus(204);
    } else {
      log.info(`El elemento ${normalized.element_id} no está pausado. Se enviará a Laburen.`);
      const contact = await getContact(normalized.contact_id);
    
      let conversationId;
      let data;
    
      // 1. ¿Ya tengo un conversationId para este contact_id?
      if (conversationMap.has(normalized.contact_id)) {
        conversationId = conversationMap.get(normalized.contact_id);
        log.info(`Reusando conversación existente para contact_id ${normalized.contact_id}: ${conversationId}`);
    
        // 👉 Continuar conversación existente
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
        // 2. No existe → arranca nueva conversación
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
    
      // 3. Payload final a enviar a WPP API
      const payloadWpp = {
        to: contact.phone,
        message: answer,
        contactName: contact.name,
        leadId: normalized.element_id,
        chatId: normalized.chat_id
      };
    
      log.info("WPP PAYLOAD →", payloadWpp);
    }    

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}
