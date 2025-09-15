import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { queryLaburen } from "../services/laburen.service.js";
import { log } from "../logger.js";
import { text } from "express";

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

    // intenta extraer nota
    const note = (parsed?.leads?.note?.[0]?.note?.text || "").toLowerCase();
    const elementId = parsed?.leads?.note?.[0]?.note?.element_id || ""

    log.info("NOTA ->", note);
    log.info("Element id ->", elementId);

    if (!normalized) return res.sendStatus(204);

    // Mapear IDs de Kommo → mantener el hilo en Laburen
    const conversationId = String(
      normalized.chatId ?? normalized.leadId ?? normalized.contactId ?? ""
    );
    const visitorId = String(
      normalized.contactId ?? normalized.leadId ?? ""
    );

    if (note === "" || note === "seguir") {
      const data = await queryLaburen({
        query: normalized.text,
        conversationId,
        visitorId,
        metadata: {
          kommo: {
            contactId: normalized.contactId,
            leadId: normalized.leadId,
            chatId: normalized.chatId,
            elementId: normalized.element_id
          },
        },
      });

      const answer = (data?.answer || "").trim();

      log.info("INCOMING MESSAGE →", normalized);
      log.info("LABUREN ANSWER →", answer);
    }

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}
