import { Router } from "express";
import { rawBody } from "../middleware/rawBody.js";
import { handleAuthorizationCode, kommoWebhook } from "../controllers/kommo.controller.js";
const router = Router();

router.get("/callback", handleAuthorizationCode);
router.post("/webhook", rawBody, kommoWebhook);

export default router;