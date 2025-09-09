import { parseIncoming } from "../utils/parser.js";
import { normalizeIncomingMessage } from "../utils/normalizer.js";
import { log } from "../logger.js";

// Controlador del webhook de Kommo
export function kommoWebhook(req, res) {
  try {
    const contentType = req.headers["content-type"] || "";
    const raw = req.body ? req.body.toString("utf8") : "";

    // Parseo robusto (JSON o x-www-form-urlencoded con corchetes)
    const parsed = parseIncoming(raw, contentType);
    // Extraemos SOLO lo que te sirve (y filtramos mensajes entrantes)
    const normalized = normalizeIncomingMessage(parsed);

    if (!normalized) {
      // No es un message.add entrante o no hay texto → confirmamos igual
      return res.sendStatus(204);
    }

    log.info("INCOMING MESSAGE →", normalized);

    // Próximo paso (cuando quieras): enviar al agente Laburen
    // await forwardToLaburen(normalized.text, { kommo: normalized });

    return res.sendStatus(204);
  } catch (err) {
    log.error("Error en kommoWebhook:", err);
    // Devolvemos 204 para que Kommo no reintente indefinidamente
    return res.sendStatus(204);
  }
}