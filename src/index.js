import express from "express";
import "dotenv/config";

const app = express();

// ⬇️ Ruta webhook: leemos el body en crudo y parseamos según content-type
app.post("/kommo/webhook", express.raw({ type: "*/*" }), (req, res) => {
  const ctype = req.headers["content-type"] || "";
  const raw = req.body ? req.body.toString("utf8") : "";

  console.log("Content-Type:", ctype);
  console.log("Raw body:", raw);

  let body = null;

  // 1) Intento JSON directo
  try { body = JSON.parse(raw); } catch {}

  // 2) Si no, intento urlencoded (key=value&...)
  if (!body && raw) {
    const params = new URLSearchParams(raw);
    const obj = Object.fromEntries(params.entries());
    // Algunos proveedores envían el JSON dentro de una clave (p. ej. "payload")
    if (obj.payload) {
      try { body = JSON.parse(obj.payload); } catch { body = obj; }
    } else {
      body = obj;
    }
  }

  console.log("Parsed body:", JSON.stringify(body, null, 2));

  // (opcional) si ya querés usar el body después:
  // const add = body?.message?.add;
  // ...

  res.sendStatus(204);
});

// Healthcheck
app.get("/", (_req, res) => res.send("Middleware Kommo ↔ Laburen corriendo OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
