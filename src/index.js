import express from "express";
import "dotenv/config";
import kommoRouter from "./routes/kommo.route.js";
import { log } from "./logger.js";

const PORT = process.env.PORT || 3000;
const app = express();

app.use("/kommo", kommoRouter);

app.listen(PORT, () => {
  log.info(`Server running 🏃`);
});