import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { queryLaburen } from "../services/laburen.service.js";
import { log } from "../logger.js";
import { text } from "express";
import { getContact } from "../services/kommo.service.js";

const idsPausados = new Set();

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
      log.info("CONTACTO->", contact);
      log.info("id contacto->", normalized.contact_id);
      log.info("TEXT->", normalized);

      //  const data = await queryLaburen({
      //    query: normalized.text,
      //    conversationId,
      //    visitorId,
      //    metadata: {
      //      kommo: {
      //       contactId: normalized.contactId,
      //       leadId: normalized.leadId,
      //        chatId: normalized.chatId
      //      },
      //    },
      //  });

      //  const answer = (data?.answer || "").trim();
      //  log.info("LABUREN ANSWER →", answer);
    }


    // bloque de enviar respuesta a kommo a traves de API

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}
