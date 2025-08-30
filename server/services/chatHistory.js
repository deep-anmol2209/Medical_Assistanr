import redis from "../config/redisConfig.js";

const CHAT_HISTORY_KEY = (userId) => `chat:history:${userId}`;
const CHAT_SUMMARY_KEY = (userId) => `chat:summary:${userId}`;
const MAX_CHAT_HISTORY = 5;

// Store a chat message (flexible format for possible summary)
export async function saveChat(userId, chatObj) {
  const chatEntry = JSON.stringify({ ...chatObj, timestamp: Date.now() });

  // Push new chat to Redis list
  await redis.rpush(CHAT_HISTORY_KEY(userId), chatEntry);

  // Trim list to latest 5 messages
  await redis.ltrim(CHAT_HISTORY_KEY(userId), -MAX_CHAT_HISTORY, -1);

  (`Stored chat for user ${userId}`);
}

// Get the latest 5 chats (default all currently, but can adjust)
export async function getChatHistory(userId) {
  const chats = await redis.lrange(CHAT_HISTORY_KEY(userId), 0, -1);
  return chats.map((c) => JSON.parse(c));
}

export async function saveSummary(userId, summary) {
  await redis.set(
    CHAT_SUMMARY_KEY(userId),
    JSON.stringify({ summary, updatedAt: Date.now() })
  );
}

export async function getSummary(userId) {
  const data = await redis.get(CHAT_SUMMARY_KEY(userId));
  return data ? JSON.parse(data) : null;
}

export async function getContext(userId) {
  const summary = await getSummary(userId);
  const chats = await getChatHistory(userId);
  return { summary, chats };
}
