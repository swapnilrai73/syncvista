import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";
import { CohereClient } from "cohere-ai";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getAccounts } from "@/lib/actions/bank.actions";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || "",
});

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY || "",
});

export async function POST(req: NextRequest) {
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

    // 1. Fetch Authoritative Deterministic System of Record
    let deterministicRecord = "";
    try {
      const accountsResult = await getAccounts({ userId: loggedIn.$id });
      if (accountsResult && accountsResult.data) {
        const { data: accounts, totalBanks, totalCurrentBalance } = accountsResult;
        const formattedAccounts = (accounts || [])
          .map(
            (acc: any) =>
              `- ${acc.officialName || acc.name || "Account"} (mask: ${acc.mask || "N/A"}, type: ${acc.subtype || acc.type || "depository"}): ₹${Number(acc.currentBalance || 0).toLocaleString("en-IN")}`
          )
          .join("\n");

        deterministicRecord = [
          `Total Connected Bank Accounts: ${totalBanks}`,
          `Total Liquid / Depository Balance: ₹${Number(totalCurrentBalance || 0).toLocaleString("en-IN")}`,
          "Account Breakdown:",
          formattedAccounts || "- No individual accounts listed.",
        ].join("\n");
      }
    } catch (accErr) {
      console.error("Failed to load deterministic account records:", accErr);
      deterministicRecord = "Deterministic account records are currently unavailable.";
    }

    // 2. Vector Search (Retrieved Historical / Transaction Context)
    let contextText = "";
    try {
      if (process.env.PINECONE_API_KEY && process.env.COHERE_API_KEY) {
        const embeddings = new CohereEmbeddings({
          apiKey: process.env.COHERE_API_KEY,
          model: "embed-english-v3.0",
        });

        const queryVector = await embeddings.embedQuery(latestMessage);
        const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME || "");

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

    // 3. Format Chat History
    const chatHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.sender === "user" ? ("USER" as const) : ("CHATBOT" as const),
      message: m.content || "",
    }));

    const preamble = `You are SyncVista Assistant, an AI financial intelligence and decision-support companion for SyncVista.

REGULATORY STATUS & STRICT COMPLIANCE BOUNDARIES:
- You are an educational decision-support tool, NOT a SEBI-registered Investment Adviser (RIA), broker, portfolio manager, or research analyst under SEBI (Investment Advisers) Regulations, 2013.
- You MUST NOT claim to be a "personal financial advisor", give personalized investment advice, recommend specific securities or stock purchases/sales, or promise or guarantee financial returns.
- All financial calculations, projections, and scenarios are strictly mathematical models designed for informational and educational decision support.
- Always include an advisory note reminding the user to consult a SEBI-registered professional before making significant investment, tax, or legal decisions.

=== DETERMINISTIC FINANCIAL SYSTEM OF RECORD ===
${deterministicRecord || "No connected accounts found in the primary ledger."}
================================================

=== RETRIEVED HISTORICAL & TRANSACTION CONTEXT ===
${contextText || "No contextual transaction records found in the vector database."}
==================================================

OPERATIONAL INSTRUCTIONS & ARITHMETIC RULES:
1. AUTHORITATIVE TRUTH: The metrics in the "DETERMINISTIC FINANCIAL SYSTEM OF RECORD" represent verified, real-time ledger data. NEVER perform mental arithmetic over fragmented chunks in the "RETRIEVED CONTEXT" to recalculate, guess, or contradict total bank balances or account counts. When the user asks for their total balance or accounts, cite the authoritative figures directly.
2. CONTEXTUAL REASONING: Use the "RETRIEVED HISTORICAL & TRANSACTION CONTEXT" to answer questions regarding merchant transactions, category spending, historical cash flows, or temporal patterns.
3. MISSING OR AMBIGUOUS DATA: If the requested information cannot be found in either the deterministic record or the retrieved context, explicitly state: "I couldn't find relevant financial records in your synced data." Do not fabricate transactions or balances.
4. CURRENCY & NUMBER FORMAT: Always format amounts in Indian Rupees (₹) using Indian number grouping (e.g., ₹1,00,000 or ₹12,50,000). Maintain a professional, objective, and analytical tone.`;

    // 3. Stream Initiation
    const responseStream = await cohere.chatStream({
      model: "command-r-08-2024",
      message: latestMessage,
      preamble: preamble,
      chatHistory: chatHistory,
      temperature: 0.2,
    });

    const encoder = new TextEncoder();
    let firstChunkReceived = false;

    const customStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of responseStream) {
            if (!firstChunkReceived) {
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