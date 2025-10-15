import { Router } from "express";
import { kommoWebhook } from "../controllers/kommo.controller.js";
const router = Router();

router.post("/webhook", kommoWebhook);

export default router;