import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";
import { CohereClient } from "cohere-ai";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Missing userId" }, { status: 401 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1]?.content || "";

    // 1. Vector Search with Pinecone
    let contextText = "";
    try {
      if (process.env.PINECONE_API_KEY && process.env.COHERE_API_KEY) {
        const embeddings = new CohereEmbeddings({
          apiKey: process.env.COHERE_API_KEY,
          model: "embed-english-v3.0",
        });

        const queryVector = await embeddings.embedQuery(latestMessage);
        const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME || "");

        const queryResponse = await index.namespace(String(userId)).query({
          vector: queryVector,
          topK: 10,
          includeMetadata: true,
        });

        contextText = queryResponse.matches
          ?.map((m: any) => m.metadata?.text || "")
          .filter(Boolean)
          .join("\n") || "";
      }
    } catch (vectorErr) {
      console.error("Vector retrieval failed, proceeding without context:", vectorErr);
    }

    // 2. Format Chat History for Cohere SDK
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? ("USER" as const) : ("CHATBOT" as const),
      message: m.content || "",
    }));

    const preamble = `You are SyncVista AI, a helpful personal financial assistant.

FINANCIAL CONTEXT:
${contextText || "No context retrieved."}

INSTRUCTIONS:
- Answer the user directly, accurately, and concisely based on the financial context provided.
- Be clear and structured for financial data and monthly cash flow queries.
- Format money cleanly in Indian Rupees (₹).
- Do not use robotic opener lines or preambles.`;

    // 3. Initiate Native Cohere Stream
    const responseStream = await cohere.chatStream({
      model: "command-r-plus-08-2024",
      message: latestMessage,
      preamble: preamble,
      chatHistory: chatHistory,
      temperature: 0.2,
    });

    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of responseStream) {
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