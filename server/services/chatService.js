import axios from "axios";
import { Pinecone } from "@pinecone-database/pinecone";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; 
import dotenv from "dotenv";

dotenv.config();

// Pinecone setup
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index(process.env.PINECONE_INDEX_NAME);
const EMBED_MODEL = "nomic-embed-text";

// ✅ Gemini LLM with LangChain
const geminiModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: "gemini-2.5-flash", // or gemini-1.5-pro
  temperature: 0,
  streaming: true,
});

export async function embedText(text) {
  const res = await axios.post(
    "http://localhost:11434/api/embeddings",
    { model: EMBED_MODEL, prompt: text },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data.embedding;
}

export async function queryPinecone(query) {
  const queryEmbedding = await embedText(query);
  const results = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
  });
  return results.matches.map((m) => m.metadata.text);
}

export function detectMode(userInput) {
  const input = userInput.toLowerCase();
  if (input.includes("assignment")) return "assignment";
  if (input.includes("notes")) return "notes";
  if (input.includes("exam")) return "exam";
  return "exam";
}

export async function askMainModel(question,knowledgeContext, chatContext, _mode, onToken) {
  ("context:", chatContext);
  ("knowledgeContext:", knowledgeContext);
  

  const prompt = PromptTemplate.fromTemplate(`
You are a nursing tutor. Answer the question using BOTH the knowledge base and chat history context.

- Use the **Knowledge Base** for factual accuracy.  
- Use the **Chat History** to maintain continuity and personalization.  
- Rewrite explanations in simple, easy-to-understand language.  
- Avoid bookish or overly technical terms.  
- Always keep meaning correct and faithful to the context.  
- Output must be in **Markdown only** with enhancements (headings, bullet points, highlights).  

Knowledge Base Context:
${knowledgeContext.join("\n\n").replace(/{/g, "{{").replace(/}/g, "}}")}

Chat History Context:
${chatContext}

User Question:
${question}

Answer (Markdown only, based strictly on context):
  `);

  const qaChain = new LLMChain({
    llm: geminiModel,
    prompt,
  });

  const res = await qaChain.call(
    { question },
    {
      callbacks: onToken
        ? [
            {
              handleLLMNewToken(token) {
                onToken(token);
              },
            },
          ]
        : [],
    }
  );

  ("response:", res);
  return res.text;
}

// ✅ New: Generate chat summary
export async function generateSummary(oldSummary, messages) {
  const prompt = PromptTemplate.fromTemplate(`
You are a chat summarizer.
Summarize the following conversation in a concise but complete way.
Keep the important context so it can be used later to answer user queries.
Use clear, simple sentences.

Previous Summary (if any):
${oldSummary || "None"}

New Messages:
${messages.map(m => `${m.role}: ${m.content}`).join("\n")}

New Combined Summary:
  `);

  const chain = new LLMChain({
    llm: geminiModel,
    prompt,
  });

  const res = await chain.call({});
  return res.text;
}
