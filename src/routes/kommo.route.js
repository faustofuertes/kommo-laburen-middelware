import { Router } from "express";
import { rawBody } from "../utils/rawBody.js";
import { kommoMessageWebhook, kommoNoteWebhook } from "../controllers/kommo.controller.js";
const router = Router();

router.post("/webhook/message", rawBody, kommoMessageWebhook);
router.post("/webhook/note", rawBody, kommoNoteWebhook);

export default router;