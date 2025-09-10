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

    const upd = Array.isArray(parsed?.talk?.update) ? parsed.talk.update[0] : parsed?.talk?.update;
    if (upd) {
      const payload = {
        talk_id: upd.talk_id ?? null,
        chat_id: upd.chat_id ?? null,
        entity_type: upd.entity_type ?? null,
        entity_id: upd.entity_id ?? null,
        contact_id: upd.contact_id ?? null,
        is_in_work: upd.is_in_work === "1" || upd.is_in_work === 1,
        is_read: upd.is_read === "1" || upd.is_read === 1,
        origin: upd.origin ?? null,
        updated_at: upd.updated_at ? Number(upd.updated_at) : null,
      };
      log.info("TALK UPDATE →", payload);
      return res.sendStatus(204);
    }

    if (!normalized) return res.sendStatus(204);

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
    log.info("INCOMING MESSAGE →", normalized);
    log.info("LABUREN ANSWER →", answer);

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204); ``
  }
}