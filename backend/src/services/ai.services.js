import * as z from 'zod'
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, SystemMessage, tool, createAgent } from 'langchain'
import { searchInternet } from "./internet.service.js";
import { searchLibrary } from "./library.service.js";

// Groq is the primary answer model because it keeps tool calling and streaming
// on the free tier. Mistral stays available as a drop-in local alternative.
const model = process.env.GROQ_API_KEY
  ? new ChatGroq({
      model: "openai/gpt-oss-120b",
      apiKey: process.env.GROQ_API_KEY,
    })
  : new ChatMistralAI({
      model: "mistral-small-latest",
    });

const MAX_SOURCES = 8;

const makeSearchTool = (onSources) => tool(
    async ({ query }) => {
      const response = await searchInternet(query);

      // The tool still returns its raw JSON to the model. We also lift the
      // source cards out so the answer can keep its audit trail.
      try {
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed?.sources) && typeof onSources === "function") {
          onSources(parsed.sources);
        }
      } catch {
        // A malformed search payload should never break the answer.
      }

      return response;
    },
    {
      name: "search_internet",
      description: "Searches the live web/internet for recent information, real-time facts, news, documentation, or queries that require up-to-date knowledge beyond the model's training data cutoff.",
      schema: z.object({
        query: z.string().describe("The search query string to search the web for, e.g. 'latest quantum computing news 2026'")
      })
    }
);

const makeLibraryTool = (userId, onSources) => tool(
    async ({ query }) => {
      const results = await searchLibrary(userId, query, 5);
      const backend = (process.env.BACKEND_URL || "http://localhost:3000").replace(/\/+$/, "");

      const sources = results
        .filter((result) => result.shareId)
        .map((result) => ({
          title: `Library: ${result.documentTitle}`,
          url: `${backend}/api/public/library/${result.shareId}`,
          snippet: result.text.slice(0, 280)
        }));

      if (sources.length && typeof onSources === "function") {
        onSources(sources);
      }

      return JSON.stringify({
        source: "private_library",
        results: results.map((result) => ({
          title: result.documentTitle,
          chunk: result.chunkIndex,
          score: result.score,
          text: result.text
        }))
      });
    },
    {
      name: "search_library",
      description: "Searches the signed-in user's uploaded private documents. Use this before the web when the question may be answered by a document in their library. Returned excerpts keep their document title and chunk number.",
      schema: z.object({
        query: z.string().describe("The terms to search for in the private document library.")
      })
    }
);

const extractChunkText = (chunk) => {
  const content = chunk?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter((block) => block?.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("");
  }

  return "";
};

const cleanSource = (source) => {
  if (!source || typeof source !== "object") return null;

  const url = typeof source.url === "string" ? source.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return null;

  return {
    title: typeof source.title === "string" ? source.title.trim() : "",
    url,
    snippet: typeof source.snippet === "string" ? source.snippet.trim() : ""
  };
};

const generateResponse = async (messages, onChunk, onSources, context = {}) => {
  const collected = new Map();

  const collectSources = (incoming) => {
    incoming.forEach((source) => {
      const clean = cleanSource(source);
      if (!clean || collected.has(clean.url)) return;
      collected.set(clean.url, clean);
    });

    if (typeof onSources === "function") {
      onSources(Array.from(collected.values()).slice(0, MAX_SOURCES));
    }
  };

  const tools = [makeSearchTool(collectSources)];
  if (context.userId) {
    tools.push(makeLibraryTool(context.userId, collectSources));
  }

  const agent = createAgent({
    model: model,
    tools
  });

  const formattedMessages = messages
    .map((msg) => {
      if (msg.role === "user") return new HumanMessage(msg.content);
      if (msg.role === "ai") return new AIMessage(msg.content);
      return null;
    })
    .filter(Boolean);

  const eventStream = await agent.streamEvents(
    { messages: formattedMessages },
    { version: "v3" }
  );

  let fullResponse = "";

  for await (const message of eventStream.messages) {
    for await (const textChunk of message.text) {
      if (!textChunk) continue;
      fullResponse += textChunk;

      if (typeof onChunk === "function") {
        onChunk(textChunk);
      }
    }
  }

  return fullResponse;
};

const generateTitle = async (message) => {
  const title = await model.invoke([
    new SystemMessage(`
      You are a helpful AI assistance your task is to create a title for the user's query. 
      The title should be short and concise and should be relevant to the user's query.
      The title should be in the same language as the user's query.
      Do not use any special characters or symbols in the title. 
      Do not use any quotes or punctuation in the title.
      `),
    new HumanMessage(`
        Generate a title in 2-4 words for the following message: ${message}
        `)
  ])
  return title.text
}

export { generateResponse, generateTitle }
