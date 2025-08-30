import { Conversation, Message } from "../model/chatModel.js"; // assumed location update if needed
import {
  queryPinecone,
  detectMode,
  askMainModel,
  generateSummary,
} from "../services/chatService.js";
import {
  saveChat,
  saveSummary,
  getSummary,
} from "../services/chatHistory.js"; // assumed location update if needed
import { clerkClient, getAuth } from "@clerk/express";

// ================== STREAM MESSAGE ==================
export const sendMessageStream = async (req, res) => {
  try {
console.log("Request headers:", req.query);

    const clerkUserId = req.user.id; // Clerk middleware
    const { question, conversationId } = req.query;
    if (!clerkUserId || !question || !conversationId) {
      return res
        .status(400)
        .json({ error: "userId, question, and conversationId are required" });
    }

    console.log("Authenticated userId:", clerkUserId);
    
    // --- SSE headers ---
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Save user question quickly
    await saveChat(clerkUserId, { role: "user", content: question });

    console.log("Finding or creating conversation:", conversationId);
    // --- Find or Create Conversation ---
    let convoDoc = await Conversation.findOne({ conversationId });
    if (!convoDoc) {
      convoDoc = await Conversation.create({
        conversationId,
        userId: clerkUserId,
        title: question.slice(0, 40) || "New Chat",
      });
    }

    console.log("Conversation document:", convoDoc);
    
    // --- Store new user message ---
    await Message.create({
      conversationId,
      role: "user",
      content: question,
      createdAt: new Date(),
    });

    console.log("Message stored, fetching chat history...");
    
    // --- Context for LLM (last few messages) ---
    const chats = await Message.find({ conversationId }).sort({ createdAt: 1 });
    const formattedChats = chats.map((m) => ({
      role: m.role,
      content: m.content,
    }));
console.log("Formatted chats:", formattedChats);

    // --- Get last summary ---
    const oldSummary = (await getSummary(clerkUserId))?.summary || "";

    // --- Get context from Pinecone ---
    const mode = detectMode(question);
    const contextChunks = await queryPinecone(question);

    let answerBuffer = "";
  console.log("Context chunks:", contextChunks);
  
    // --- Build redis context ---
    const redisContext = `
Summary of older chats:
${oldSummary || "No summary yet"}

Recent chats:
${formattedChats.map((c) => `${c.role}: ${c.content}`).join("\n")}
    `;
console.log("Redis context:", redisContext);

    // --- Stream model response ---
    await askMainModel(
      question,
      contextChunks,
      redisContext,
      mode,
      (token) => {
        answerBuffer += token;

        // ✅ Stream JSON SSE
        res.write(
          `data: ${JSON.stringify({ delta: token })}\n\n`
        );
      }
    );

    console.log("Model response complete");
    
    const finalAnswer = answerBuffer.trim() || "I don't know.";
console.log("Final answer:", finalAnswer);

    // --- Store model reply ---
    await Message.create({
      conversationId,
      role: "assistant",
      content: finalAnswer,
      createdAt: new Date(),
    });

    // --- Update conversation title if needed ---
    convoDoc.title = formattedChats[0]?.content?.slice(0, 40) || "New Chat";
    await convoDoc.save();

    // --- Save assistant reply ---
    await saveChat(clerkUserId, {
      role: "assistant",
      content: finalAnswer,
    });

    // --- Background summary update ---
    (async () => {
      try {
        const newSummary = await generateSummary(oldSummary, [
          ...formattedChats,
          { role: "assistant", content: finalAnswer },
        ]);
        await saveSummary(clerkUserId, newSummary);

        await saveChat(clerkUserId, {
          role: "assistant",
          content: finalAnswer,
          summary: newSummary,
        });
      } catch (bgErr) {
        console.error("Background summary update failed:", bgErr);
      }
    })();

    // ✅ End stream
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("sendMessageStream error:", err);
    res.status(500).end();
  }
};


// ================== FETCH ALL CHATS FROM MONGO ==================
export const getAllChatsByUser = async (req, res) => {
  try {
    const clerkUserId = req.auth.userId; // Clerk middleware
    if (!clerkUserId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const conversations = await Conversation.find({ userId: clerkUserId }).sort({ createdAt: -1 });

    return res.status(200).json({
      chats: conversations.map((c) => ({
        conversationId: c.conversationId,
        title: c.title,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    console.error("getAllChatsByUser error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMessagesByConversation = async (req, res) => {
  try {
    const { conversationId } = req.query;
    if (!conversationId) return res.status(400).json({ error: "Missing conversationId" });

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    return res.status(200).json({ messages });
  } catch (err) {
    console.error("getMessagesByConversation error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
