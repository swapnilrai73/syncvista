import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function syncUserDataToVectorStore(userId: string) {
  try {
    console.time("⏱️ TOTAL SYNC TIME");

    // 1. Fetch user's banks and transactions
    console.time("⏱️ 1. Firestore DB Fetch");
    const banksQuery = query(collection(db, "banks"), where("userId", "==", userId));
    const banksSnap = await getDocs(banksQuery);
    const banks = banksSnap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));

    const userBankIds = Array.from(
      new Set(
        banks.flatMap((b) => [b.id, b.$id, b.shareableId]).filter(Boolean)
      )
    );

    const transactionsMap = new Map<string, any>();
    const addDocsToMap = (snap: any) => {
      snap.docs.forEach((doc: any) => transactionsMap.set(doc.id, doc.data()));
    };

    const txQueries = [];
    if (userBankIds.length > 0) {
      txQueries.push(
        getDocs(query(collection(db, "transactions"), where("senderBankId", "in", userBankIds))),
        getDocs(query(collection(db, "transactions"), where("receiverBankId", "in", userBankIds)))
      );
    }
    txQueries.push(getDocs(query(collection(db, "transactions"), where("userId", "==", userId))));

    const txSnapshots = await Promise.allSettled(txQueries);
    txSnapshots.forEach((res) => {
      if (res.status === "fulfilled") addDocsToMap(res.value);
    });

    const transactions = Array.from(transactionsMap.values());
    console.timeEnd("⏱️ 1. Firestore DB Fetch");

    // 2. Aggregate metrics
    const totalBalance = banks.reduce((acc, b) => acc + (Number(b.currentBalance) || 0), 0);
    const totalIncome = transactions
      .filter((t) => t.type === "credit" || Number(t.amount) > 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);
    const totalExpenses = transactions
      .filter((t) => t.type === "debit" || Number(t.amount) < 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

    // 3. Build text payloads
    const rawDocs = [
      `SUMMARY: Net Worth: ₹${totalBalance} | Total Income: ₹${totalIncome} | Total Expenses: ₹${totalExpenses}`,
      ...banks.map(
        (b) => `BANK: Name: "${b.name}", Institution: "${b.bankName || b.officialName}", Balance: ₹${b.currentBalance}, Type: "${b.subtype || b.type}"`
      ),
      ...transactions.map(
        (t) => `TRANSACTION: Name: "${t.name}", Amount: ₹${t.amount}, Category: "${t.category}", Date: "${t.date}", Channel: "${t.channel || t.paymentChannel}", Status: "${t.status}"`
      ),
    ];

    if (rawDocs.length === 0) return { count: 0 };

    // 4. Generate Embeddings in Parallel Batches & Upsert
    console.time("⏱️ 2. Batch Vector Upsert");
    const embeddings = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY,
      model: "embed-english-v3.0",
    });

    // Chunk array into batches of 50 for faster parallel processing
    const BATCH_SIZE = 50;
    const chunkedDocs: string[][] = [];
    for (let i = 0; i < rawDocs.length; i += BATCH_SIZE) {
      chunkedDocs.push(rawDocs.slice(i, i + BATCH_SIZE));
    }

    const embeddingResults = await Promise.all(
      chunkedDocs.map((chunk) => embeddings.embedDocuments(chunk))
    );
    const vectorValues = embeddingResults.flat();

    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);

    const records = rawDocs.map((text, i) => ({
      id: `${userId}-${i}`,
      values: vectorValues[i],
      metadata: { text, userId },
    }));

    // Upsert to Pinecone in 100-item batches
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      await index.namespace(userId).upsert(batch);
    }
    console.timeEnd("⏱️ 2. Batch Vector Upsert");

    console.timeEnd("⏱️ TOTAL SYNC TIME");

    return { count: rawDocs.length };
  } catch (error: any) {
    console.error("Vector sync failed:", error);
    throw error;
  }
}