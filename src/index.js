import express from "express";
import "dotenv/config";

const app = express();

// helper: setDeep(obj, ["a","b","0","c"], val) -> obj.a.b[0].c = val
function setDeep(target, parts, value) {
  let cur = target;
  for (let i = 0; i < parts.length; i++) {
    const k = parts[i];
    const nextIsIndex = Number.isInteger(+parts[i + 1]);
    const isLast = i === parts.length - 1;

    if (isLast) {
      cur[k] = value;
    } else {
      if (cur[k] == null) cur[k] = nextIsIndex ? [] : {};
      cur = cur[k];
    }
  }
  return target;
}

// Convierte "talk[update][0][chat_id]" -> ["talk","update","0","chat_id"]
function keyToPath(key) {
  // elimina "][" y los corchetes
  const parts = key.replace(/\]/g, "").split("[");
  // si empieza con algo tipo "talk[", split deja "talk" correcto; si no hay "[", queda la clave sola
  return parts;
}

app.post("/kommo/webhook", express.raw({ type: "*/*" }), (req, res) => {
  const ctype = req.headers["content-type"] || "";
  const raw = req.body ? req.body.toString("utf8") : "";
  console.log("Content-Type:", ctype);
  console.log("Raw body:", raw);

  let body = null;

  if (ctype.includes("application/json")) {
    try { body = JSON.parse(raw); } catch {}
  }

  if (!body) {
    // intentamos parsear x-www-form-urlencoded y mapear brackets
    const params = new URLSearchParams(raw);
    const nested = {};
    for (const [k, v] of params.entries()) {
      const path = keyToPath(k);
      setDeep(nested, path, v);
    }
    body = nested;
  }

  console.log("Parsed body:", JSON.stringify(body, null, 2));

  // ---- Extraer info útil (si viene message.add/update) ----
  // Algunos webhooks traen message.add[0].text o message.add[0].message.text
  const msgAdd = body?.message?.add?.[0] || body?.message?.update?.[0];
  const talkUpd = body?.talk?.update?.[0];

  const text =
    msgAdd?.text ??
    msgAdd?.message?.text ??
    null;

  const entityId =
    msgAdd?.entity_id ??
    talkUpd?.entity_id ??
    null;

  const chatId =
    msgAdd?.chat_id ??
    talkUpd?.chat_id ??
    null;

  const talkId =
    msgAdd?.talk_id ??
    talkUpd?.talk_id ??
    null;

  console.log("Detectado →", {
    text,
    entityId,
    chatId,
    talkId,
    origin: msgAdd?.origin ?? talkUpd?.origin ?? null,
    type: msgAdd?.type ?? null,
  });

  // Por ahora solo confirmamos recepción
  res.sendStatus(204);
});

// Healthcheck
app.get("/", (_req, res) => res.send("Middleware Kommo ↔ Laburen corriendo OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
