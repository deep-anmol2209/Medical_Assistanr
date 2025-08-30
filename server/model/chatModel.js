import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true }, // <-- store frontend UUID
  userId: { type: String, ref: "User", required: true },
  title: { type: String, default: "New Chat" }, // Optional: show in sidebar
  createdAt: { type: Date, default: Date.now }
});

// Message schema
const messageSchema = new mongoose.Schema({
  conversationId: { type: String, ref: "Conversation", required: true }, // <-- use UUID string
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const Conversation = mongoose.model("Conversation", conversationSchema);
export const Message = mongoose.model("Message", messageSchema);
