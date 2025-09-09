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
    // --- parseo robusto (json o x-www-form-urlencoded con brackets) ---
    const ctype = req.headers["content-type"] || "";
    const raw = req.body ? req.body.toString("utf8") : "";
    let body = null;

    if (ctype.includes("application/json")) {
        try { body = JSON.parse(raw); } catch { body = null; }
    }

    function setDeep(target, parts, value) {
        let cur = target;
        for (let i = 0; i < parts.length; i++) {
            const k = parts[i];
            const nextIsIndex = Number.isInteger(+parts[i + 1]);
            const last = i === parts.length - 1;
            if (last) { cur[k] = value; }
            else {
                if (cur[k] == null) cur[k] = nextIsIndex ? [] : {};
                cur = cur[k];
            }
        }
        return target;
    }
    function keyToPath(key) { return key.replace(/\]/g, "").split("["); }

    if (!body) {
        const params = new URLSearchParams(raw);
        const nested = {};
        for (const [k, v] of params.entries()) setDeep(nested, keyToPath(k), v);
        body = nested;
    }

    // --- normalización: quedarnos SOLO con mensajes entrantes (message.add -> type: incoming) ---
    const add = body?.message?.add;
    const ev = Array.isArray(add) ? add.find(x => x?.type === "incoming") : null;

    if (!ev) {
        // no es un mensaje entrante; ignoramos (pero confirmamos recepción)
        return res.sendStatus(204);
    }

    // construir payload “plano” y limpio
    const normalized = {
        text: ev.text ?? null,
        chat_id: ev.chat_id ?? null,
        talk_id: ev.talk_id ?? null,
        entity_type: ev.entity_type ?? null,   // suele ser "lead"
        entity_id: ev.entity_id ? String(ev.entity_id) : null,
        contact_id: ev.contact_id ? String(ev.contact_id) : null,
        origin: ev.origin ?? null,             // waba / facebook / etc.
        created_at: ev.created_at ? Number(ev.created_at) : null, // epoch seg
    };

    // si por alguna razón no hay texto, no seguimos
    if (!normalized.text) return res.sendStatus(204);

    // 🔎 log claro (solo lo necesario)
    console.log("INCOMING MESSAGE →", normalized);

    // (opcional, siguiente paso) reenviar al agente:
    // await forwardToLaburen(normalized.text, { kommo: normalized });

    return res.sendStatus(204);
});


// Healthcheck
app.get("/", (_req, res) => res.send("Middleware Kommo ↔ Laburen corriendo OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
