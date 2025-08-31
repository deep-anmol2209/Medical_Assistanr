import axios from "axios";
import { Pinecone } from "@pinecone-database/pinecone";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from "dotenv";

dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  'PINECONE_API_KEY',
  'PINECONE_INDEX_NAME', 
  'GEMINI_API_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Pinecone setup
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index(process.env.PINECONE_INDEX_NAME);

// ✅ Gemini Embedding Model
const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "models/embedding-001",
});

// ✅ Gemini LLM with proper model name
const geminiModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-1.5-flash", // ✅ Fixed model name
  temperature: 0,
  streaming: true,
});

// Output parser for cleaner responses
const outputParser = new StringOutputParser();

/**
 * Embed text using Gemini embeddings
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
export async function embedText(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text input for embedding');
    }
    
    const res = await embeddings.embedQuery(text);
    console.log(`Embedded text of length: ${text.length}`);
    return res;
  } catch (error) {
    console.error('Error embedding text:', error);
    throw new Error(`Embedding failed: ${error.message}`);
  }
}

/**
 * Query Pinecone for similar content
 * @param {string} query - Search query
 * @param {number} topK - Number of results to return
 * @returns {Promise<string[]>} - Array of relevant text chunks
 */
export async function queryPinecone(query, topK = 5) {
  try {
    if (!query || typeof query !== 'string') {
      throw new Error('Invalid query input');
    }

    const queryEmbedding = await embedText(query);
    const results = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    if (!results.matches || results.matches.length === 0) {
      console.log('No matches found in Pinecone');
      return [];
    }

    return results.matches
      .filter(match => match.metadata && match.metadata.text)
      .map(match => match.metadata.text);
      
  } catch (error) {
    console.error('Pinecone query failed:', error);
    throw new Error(`Pinecone query failed: ${error.message}`);
  }
}

/**
 * Detect the mode of the user input
 * @param {string} userInput - User's input
 * @returns {string} - Detected mode
 */
export function detectMode(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return 'general';
  }

  const input = userInput.toLowerCase().trim();
  
  if (input.includes('assignment') || input.includes('homework')) {
    return 'assignment';
  }
  if (input.includes('notes') || input.includes('study')) {
    return 'notes';
  }
  if (input.includes('exam') || input.includes('test') || input.includes('quiz')) {
    return 'exam';
  }
  
  return 'general';
}

/**
 * Ask the main model with context
 * @param {string} question - User's question
 * @param {string[]} knowledgeContext - Relevant knowledge from vector DB
 * @param {string} chatContext - Chat history context
 * @param {string} mode - Detected mode
 * @param {Function} onToken - Streaming callback
 * @returns {Promise<string>} - Model response
 */
export async function askMainModel(question, knowledgeContext = [], chatContext = '', mode = 'general', onToken = null) {
  try {
    if (!question || typeof question !== 'string') {
      throw new Error('Invalid question input');
    }

    // Create the prompt template
    const prompt = PromptTemplate.fromTemplate(`
You are a helpful nursing tutor. Answer the question using BOTH the knowledge base and chat history context.

**Guidelines:**
- Use the **Knowledge Base** for factual accuracy and detailed information
- Use the **Chat History** to maintain conversation continuity and personalization
- Explain concepts in simple, easy-to-understand language
- Avoid overly technical jargon when possible
- Always keep the medical/nursing information accurate and up-to-date
- Format your response in **Markdown** with proper headings, bullet points, and highlights
- If the context doesn't contain enough information, clearly state this limitation

**Mode:** {mode}

**Knowledge Base Context:**
${knowledgeContext}

**Chat History Context:**
${chatContext}

**User Question:** ${question}

**Your Response (in Markdown format):**
`);

    // Create the chain using modern RunnableSequence
    const chain = RunnableSequence.from([
      prompt,
      geminiModel,
      outputParser
    ]);

    // Prepare context
    const contextText = knowledgeContext.length > 0 
      ? knowledgeContext.join('\n\n---\n\n')
      : 'No specific knowledge base context available.';

    const chatContextText = chatContext.trim() || 'No previous chat history.';

    // Set up streaming callback if provided
    const config = onToken ? {
      callbacks: [{
        handleLLMNewToken(token) {
          onToken(token);
        },
      }]
    } : {};

    // Execute the chain
    const response = await chain.invoke({
      question,
      knowledgeContext: contextText,
      chatContext: chatContextText,
      mode
    }, config);

    return response;

  } catch (error) {
    console.error('Error in askMainModel:', error);
    throw new Error(`Main model query failed: ${error.message}`);
  }
}

/**
 * Generate a summary of the conversation
 * @param {string} oldSummary - Previous summary
 * @param {Array} messages - New messages to summarize
 * @returns {Promise<string>} - Updated summary
 */
export async function generateSummary(oldSummary = '', messages = []) {
  try {
    if (!Array.isArray(messages)) {
      throw new Error('Messages must be an array');
    }

    if (messages.length === 0) {
      return oldSummary || '';
    }

    const prompt = PromptTemplate.fromTemplate(`
You are a conversation summarizer for a nursing tutor chat system.

**Task:** Create a concise but comprehensive summary that captures:
- Key topics discussed
- Important medical/nursing concepts covered
- User's learning progress and areas of interest
- Context that would be useful for future conversations

**Previous Summary:**
{oldSummary}

**New Messages to Incorporate:**
{newMessages}

**Instructions:**
- Keep the summary concise but informative
- Focus on educational content and user progress
- Use clear, simple language
- Maintain continuity with the previous summary

**Updated Summary:**
`);

    const chain = RunnableSequence.from([
      prompt,
      geminiModel,
      outputParser
    ]);

    const newMessagesText = messages
      .map(msg => `${msg.role || 'user'}: ${msg.content || ''}`)
      .filter(msg => msg.trim())
      .join('\n');

    const response = await chain.invoke({
      oldSummary: oldSummary || 'No previous summary.',
      newMessages: newMessagesText || 'No new messages.'
    });

    return response;

  } catch (error) {
    console.error('Error generating summary:', error);
    throw new Error(`Summary generation failed: ${error.message}`);
  }
}

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