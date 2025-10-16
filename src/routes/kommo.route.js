import { Router } from "express";
import { rawBody } from "../utils/rawBody.js";
import { kommoMessageWebhook } from "../controllers/kommo.controller.js";
const router = Router();

router.post("/webhook", rawBody, kommoMessageWebhook);

export default router;