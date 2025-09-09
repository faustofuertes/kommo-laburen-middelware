import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json());

// Webhook de Kommo → por ahora solo loguea el body y responde 204
app.post("/kommo/webhook", (req, res) => {
  console.log("Webhook recibido:", JSON.stringify(req.body, null, 2));
  res.sendStatus(204); // OK sin contenido
});

// Healthcheck
app.get("/", (_req, res) => res.send("Middleware Kommo ↔ Laburen corriendo OK"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});