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
    
    // Input validation
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
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Cache-Control");
    res.flushHeaders();

    // Send initial status
    res.write(`data: ${JSON.stringify({ status: "connected" })}\n\n`);

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
    const chats = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(20); // Limit to last 20 messages for context
      
    const formattedChats = chats.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    
    console.log("Formatted chats:", formattedChats.length);

    // Send status update
    res.write(`data: ${JSON.stringify({ status: "processing" })}\n\n`);

    // --- Get last summary ---
    const oldSummary = (await getSummary(clerkUserId))?.summary || "";

    // --- Get context from Pinecone ---
    const mode = detectMode(question);
    const contextChunks = await queryPinecone(question);

    console.log("Context chunks:", contextChunks.length);
    
    // Send context status
    res.write(`data: ${JSON.stringify({ 
      status: "context_ready", 
      mode, 
      contextSources: contextChunks.length 
    })}\n\n`);

    let answerBuffer = "";
    
    // --- Build chat context ---
    const chatContext = `
Summary of older chats:
${oldSummary || "No summary yet"}

Recent conversation:
${formattedChats.map((c) => `${c.role}: ${c.content}`).join("\n")}
    `.trim();

    console.log("Chat context prepared");

    // --- Stream model response using modern LangChain ---
    try {
      const response = await askMainModel(
        question,
        contextChunks,
        chatContext,
        mode,
        (token) => {
          answerBuffer += token;
          
          // ✅ Stream JSON SSE with token
          res.write(`data: ${JSON.stringify({ 
            delta: token,
            type: "token"
          })}\n\n`);
        }
      );

      // If streaming didn't work, use the full response
      if (!answerBuffer && response) {
        answerBuffer = response;
        res.write(`data: ${JSON.stringify({ 
          delta: response,
          type: "complete"
        })}\n\n`);
      }

    } catch (modelError) {
      console.error("Model error:", modelError);
      const errorMessage = "I apologize, but I'm having trouble processing your request right now. Please try again.";
      answerBuffer = errorMessage;
      
      res.write(`data: ${JSON.stringify({ 
        delta: errorMessage,
        type: "error"
      })}\n\n`);
    }

    console.log("Model response complete");
    
    const finalAnswer = answerBuffer.trim() || "I don't know.";
    console.log("Final answer length:", finalAnswer.length);

    // --- Store model reply ---
    await Message.create({
      conversationId,
      role: "assistant",
      content: finalAnswer,
      createdAt: new Date(),
    });

    // --- Update conversation title if needed ---
    if (formattedChats.length <= 1) { // Only update title for new conversations
      convoDoc.title = question.slice(0, 40) || "New Chat";
      await convoDoc.save();
    }

    // --- Save assistant reply ---
    await saveChat(clerkUserId, {
      role: "assistant",
      content: finalAnswer,
    });

    // --- Background summary update (non-blocking) ---
    setImmediate(async () => {
      try {
        const allMessages = [...formattedChats, { role: "assistant", content: finalAnswer }];
        const newSummary = await generateSummary(oldSummary, allMessages);
        
        await saveSummary(clerkUserId, newSummary);
        
        console.log("Background summary updated");
      } catch (bgErr) {
        console.error("Background summary update failed:", bgErr);
      }
    });

    // ✅ End stream
    res.write(`data: ${JSON.stringify({ 
      done: true,
      finalLength: finalAnswer.length,
      mode,
      contextSources: contextChunks.length
    })}\n\n`);
    
    res.end();

  } catch (err) {
    console.error("sendMessageStream error:", err);
    
    // Send error to client before ending
    try {
      res.write(`data: ${JSON.stringify({ 
        error: "Internal server error",
        type: "error"
      })}\n\n`);
    } catch (writeErr) {
      console.error("Failed to write error to stream:", writeErr);
    }
    
    res.status(500).end();
  }
};

/**
 * Enhanced query function that combines everything
 * @param {string} userQuestion - User's question
 * @param {string} chatHistory - Previous chat context
 * @param {Function} onToken - Streaming callback
 * @returns {Promise<Object>} - Response with context and metadata
 */
export async function processUserQuery(userQuestion, chatHistory = '', onToken = null) {
  try {
    // Detect the mode
    const mode = detectMode(userQuestion);
    
    // Get relevant knowledge from Pinecone
    const knowledgeContext = await queryPinecone(userQuestion);
    
    // Generate response
    const response = await askMainModel(
      userQuestion, 
      knowledgeContext, 
      chatHistory, 
      mode, 
      onToken
    );

    return {
      response,
      mode,
      contextUsed: knowledgeContext.length > 0,
      contextSources: knowledgeContext.length
    };

  } catch (error) {
    console.error('Error processing user query:', error);
    throw error;
  }
}


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
