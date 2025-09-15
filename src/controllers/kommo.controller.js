import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { queryLaburen } from "../services/laburen.service.js";
import { log } from "../logger.js";

const idsPausados = new Set();

export async function kommoWebhook(req, res) {
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

    if (!normalized) return res.sendStatus(204);

    // --- Extraer nota (si existe) ---
    const noteObj = parsed?.leads?.note?.[0]?.note || null;
    const noteText = (noteObj?.text || "").toLowerCase();
    const elementId = noteObj?.element_id ? String(noteObj.element_id) : null;
    const elementType = noteObj?.element_type || null;

    if (noteText === "agente parar" && elementId) {
      idsPausados.add(elementId);
      log.info(`ID ${elementId} pausado via NOTE (element_type=${elementType})`);
      return res.sendStatus(200);
    } else if (noteText === "agente seguir" && elementId) {
      idsPausados.delete(elementId);
      log.info(
        `ID ${elementId} reanudado via NOTE (element_type=${elementType})`
      );
      return res.sendStatus(200);
    }

    // --- CASO: llega un MESSAGE ---
    if (parsed?.message?.add) {
      const msgContactId = String(normalized.contactId ?? "");
      const msgLeadId = String(normalized.leadId ?? "");

      // Si está pausado → ignorar
      if (idsPausados.has(msgContactId) || idsPausados.has(msgLeadId)) {
        log.info(
          `Ignorado: contacto=${msgContactId}, lead=${msgLeadId} está pausado`
        );
        return res.sendStatus(200);
      }

      // Si no está pausado → llamar al agente
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

      return res.sendStatus(200);
    }

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}
