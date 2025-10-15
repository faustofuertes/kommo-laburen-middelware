import { Router } from "express";
import { rawBody } from "../utils/rawBody.js";
import { kommoWebhook } from "../controllers/kommo.controller.js";
const router = Router();

router.post("/webhook", rawBody, kommoWebhook);

export default router;