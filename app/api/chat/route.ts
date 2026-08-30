import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";
import { CohereClient } from "cohere-ai";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  console.time("⏱️ TOTAL CHAT ROUTE");
  try {
    // AUTH CHECK: derive the user from the session, never from the request
    // body — otherwise any caller can read another user's namespace just by
    // supplying a different userId.
    const loggedIn = await getLoggedInUser();
    if (!loggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
    }

    const targetNamespace = String(loggedIn.$id).trim();
    const latestMessage = messages[messages.length - 1]?.content || "";

    // 1. Vector Search Benchmark
    console.time("⏱️ 1. Embedding + Vector Search");
    let contextText = "";
    try {
      if (process.env.PINECONE_API_KEY && process.env.COHERE_API_KEY) {
        const embeddings = new CohereEmbeddings({
          apiKey: process.env.COHERE_API_KEY,
          model: "embed-english-v3.0",
        });

        const queryVector = await embeddings.embedQuery(latestMessage);
        const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME || "");

        console.log("🔍 QUERYING NAMESPACE:", `"${targetNamespace}"`);

        const queryResponse = await index.namespace(targetNamespace).query({
          vector: queryVector,
          topK: 10,
          includeMetadata: true,
        });

        contextText = queryResponse.matches
          ?.map((m: any) => m.metadata?.text || "")
          .filter(Boolean)
          .join("\n\n") || "";
      }
    } catch (vectorErr) {
      console.error("Vector retrieval failed:", vectorErr);
    }
    console.timeEnd("⏱️ 1. Embedding + Vector Search");

    // 2. Format Chat History
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.sender === "user" ? ("USER" as const) : ("CHATBOT" as const),
      message: m.content || "",
    }));

    const preamble = `You are SyncVista AI, a personal financial advisor.

You have access to the user's indexed financial data provided below:

=== FINANCIAL RECORDS ===
${contextText || "No financial records found in vector database."}
========================

INSTRUCTIONS:
1. Analyze the FINANCIAL RECORDS above to answer the query directly.
2. Do not ask the user for income or expense data if it can be derived or summarized from the records.
3. If no relevant financial records are found in the context above, state: "I couldn't find relevant financial records in your synced context."
4. Format currency in Indian Rupees (₹).`;

    console.log("🔍 RETRIEVED CONTEXT LENGTH:", contextText.length);
    if (contextText.length > 0) {
      console.log("🔍 CONTEXT PREVIEW:", contextText.slice(0, 200));
    }

    // 3. Stream Initiation Benchmark
    console.time("⏱️ 2. Cohere Stream Initiation");
    const responseStream = await cohere.chatStream({
      model: "command-r-08-2024",
      message: latestMessage,
      preamble: preamble,
      chatHistory: chatHistory,
      temperature: 0.2,
    });
    console.timeEnd("⏱️ 2. Cohere Stream Initiation");

    const encoder = new TextEncoder();
    let firstChunkReceived = false;

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of responseStream) {
            if (!firstChunkReceived) {
              console.timeEnd("⏱️ TOTAL CHAT ROUTE");
              firstChunkReceived = true;
            }
            if (event.eventType === "text-generation") {
              controller.enqueue(encoder.encode(event.text));
            }
          }
          controller.close();
        } catch (streamError) {
          console.error("Stream execution error:", streamError);
          controller.enqueue(
            encoder.encode("\n[Error generating financial analysis.]")
          );
          controller.close();
        }
      },
    });

    return new Response(customStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: any) {
    console.error("Chat API route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}