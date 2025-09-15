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
      const noteObj = parsed?.leads?.note?.[0]?.note || {};
      const noteText = (noteObj.text || "").toLowerCase();

      // Solo si el note corresponde a un contacto (element_type = "1")
      let noteContactId = null;
      if (noteObj.element_type === "1") {
        noteContactId = String(noteObj.element_id || "");
      }

      if (noteText === "agente parar" && noteContactId) {
        idsPausados.add(noteContactId);
        log.info(`Contacto ${noteContactId} pausado via NOTE`);
        return res.sendStatus(200);
      } else if (noteText === "agente seguir" && noteContactId) {
        idsPausados.delete(noteContactId);
        log.info(`Contacto ${noteContactId} reanudado via NOTE`);
        return res.sendStatus(200);
      } else {
        log.info(`Nota recibida (sin acción): ${noteText}`);
        return res.sendStatus(200);
      }
    }

    // --- CASO: llega un MESSAGE ---
    if (parsed?.message?.add) {
      const msgContactId = String(normalized.contactId ?? "");
      const text = (normalized.text || "").toLowerCase();

      // Si el contacto está pausado → ignorar
      if (idsPausados.has(msgContactId)) {
        log.info(
          `Contacto ${msgContactId} está pausado → no se llama al agente`
        );
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
