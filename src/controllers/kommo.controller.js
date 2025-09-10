import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { queryLaburen } from "../services/laburen.service.js";
import { log } from "../logger.js";

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

    if (!normalized) return res.sendStatus(204);

    log.info("INCOMING MESSAGE →", normalized);

    // Mapear IDs de Kommo → mantener el hilo en Laburen
    const conversationId = String(
      normalized.chatId ?? normalized.leadId ?? normalized.contactId ?? ""
    );
    const visitorId = String(normalized.contactId ?? normalized.leadId ?? "");

    const data = await queryLaburen({
      query: normalized.text,
      conversationId,
      visitorId,
      metadata: {
        kommo: {
          contactId: normalized.contactId,
          leadId: normalized.leadId,
          chatId: normalized.chatId,
        },
      },
    });

    const answer = (data?.answer || "").trim();
    log.info("LABUREN ANSWER →", answer);

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);``
  }
}