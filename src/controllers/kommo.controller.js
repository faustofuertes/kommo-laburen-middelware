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

    // --- CASO: llega un NOTE (pausa / seguir) ---
    if (parsed?.leads?.note) {
      const noteContactId = parsed?.leads?.note?.contactId;
      const note = (parsed?.leads?.note?.[0]?.note?.text || "").toLowerCase();

      if (note === "agente parar") {
        idsPausados.add(noteContactId);
        log.info(`Contacto ${noteContactId} pausado.`);
        return res.sendStatus(200);
      }
      else if (note === "agente seguir") {
        idsPausados.delete(noteContactId);
        log.info(`Contacto ${noteContactId} reanudado.`);
        return res.sendStatus(200);
      }
      else {
        return res.sendStatus(200);
      }
    }

    // --- CASO: llega un MESSAGE ---
    if (parsed?.message?.add) {
      const msgContactId = String(normalized.contactId ?? "");

      // Si está pausado → ignorar
      if (idsPausados.has(msgContactId)) {
        log.info(`Contacto ${msgContactId} está pausado → no se llama al agente`);
        return res.sendStatus(200);
      }

      // Si NO está pausado → llamar al agente
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

    // --- Si no es ni NOTE ni MESSAGE ---
    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    return res.sendStatus(204);
  }
}
