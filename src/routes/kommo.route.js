import { Router } from "express";
import { rawBody } from "../middleware/rawBody.js";
import { kommoWebhook } from "../controllers/kommo.controller.js";

const router = Router();

// El webhook necesita leer el body en crudo (Kommo manda x-www-form-urlencoded)
router.post("/webhook", rawBody, kommoWebhook);

export default router;