import { NextRequest, NextResponse } from "next/server";
import { ChatCohere, CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userId } = await req.json();
    const latestMessage = messages[messages.length - 1].content;

    const userIdString = String(userId);
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);

    // Initialize Vector Store with Namespace
    const vectorStore = await PineconeStore.fromExistingIndex(
      new CohereEmbeddings({ 
        apiKey: process.env.COHERE_API_KEY,
        model: "embed-english-v3.0" 
      }),
      {
        pineconeIndex: index,
        namespace: userIdString,
      }
    );

    // Retrieve Context
    const retriever = vectorStore.asRetriever({ k: 8 });
    const docs = await retriever.invoke(latestMessage);
    const contextText = docs.map((d) => d.pageContent).join("\n\n");

    const chatModel = new ChatCohere({
      apiKey: process.env.COHERE_API_KEY,
      model: "command-r-plus-08-2024",
      temperature: 0.2,
    });

    const systemPrompt = `You are the SyncVista AI Financial Advisor.
Use the following retrieved financial data context to answer the user accurately:
---
${contextText}
---
If the user asks to perform an action (e.g., filter transactions or view banks), answer their question and append a command action string at the end of your response in this exact format: [ACTION:FILTER_TRANSACTIONS:search_term] or [ACTION:NAVIGATE:path].`;

    // Map conversation history
    const historyMessages = messages.slice(0, -1).map((m: any) => 
      m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
    );

    const fullPrompt = [
      new SystemMessage(systemPrompt),
      ...historyMessages,
      new HumanMessage(latestMessage),
    ];

    const response = await chatModel.invoke(fullPrompt);

    return NextResponse.json({ 
      role: "assistant", 
      content: response.content 
    });
  } catch (error: any) {
    console.error("RAG API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}