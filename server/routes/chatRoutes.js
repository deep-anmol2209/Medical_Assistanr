import express from "express";
import { getMessagesByConversation, sendMessageStream } from "../controllers/chatController.js";
import { getAllChatsByUser } from "../controllers/chatController.js";
import { requireAuth } from "@clerk/express";
import { authenticateRequest } from "@clerk/express";
import { clerkSSEAuth } from "../middleware/auth.js";



const router = express.Router();

// POST /api/chat/send
router.get("/stream", clerkSSEAuth, sendMessageStream);
router.get('/getChatById', requireAuth(),  getAllChatsByUser );
router.get("/getMessagesByConversation", requireAuth(),  getMessagesByConversation);

export default router;
