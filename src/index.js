import express from "express";
import "dotenv/config";
import kommoRouter from "./routes/kommo.route.js";
import { log } from "./logger.js";

const app = express();

// Healthcheck
app.get("/", (_req, res) => res.send("Middleware Kommo ↔ Laburen corriendo OK"));

// Rutas
app.use("/kommo", kommoRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  log.info(`Servidor escuchando en http://localhost:${PORT}`);
});