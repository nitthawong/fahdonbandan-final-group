import { Router } from "express";
import { sendMessage, getHistory, deleteHistory } from "../controllers/chat.controller.js";

const router = Router();

router.post("/", sendMessage);                 // ส่งข้อความ -> ได้คำตอบจาก AI
router.get("/history/:sessionId", getHistory); // ดึงประวัติแชท

router.delete("/history/:sessionId", deleteHistory); // ลบประวัติแชท

export default router;
