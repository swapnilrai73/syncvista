import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Pinecone } from "@pinecone-database/pinecone";
import { CohereEmbeddings } from "@langchain/cohere";

const pineconeClient = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export async function syncUserDataToVectorStore(userId: string) {
  try {
    // 1. Fetch user's banks and transactions
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
      snap.docs.forEach((doc: any) => {
        const data = doc.data();
        // Key by transactionId to eliminate duplicate seeded records across multiple runs
        const uniqueKey = data.transactionId || doc.id;
        transactionsMap.set(uniqueKey, data);
      });
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

    // 2. Aggregate metrics using exact ISO Date filtering
    const totalBalance = banks.reduce((acc, b) => acc + (Number(b.currentBalance) || 0), 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, "0")}`; // "2026-08"

    const currentMonthTransactions = transactions.filter((t) => {
      const rawDate = t.date || t.$createdAt;
      if (!rawDate) return false;
      return String(rawDate).startsWith(currentMonthStr);
    });

    // Monthly metrics
    const monthlyIncome = currentMonthTransactions
      .filter((t) => t.type === "credit" || Number(t.amount) > 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

    const monthlyExpenses = currentMonthTransactions
      .filter((t) => t.type === "debit" || Number(t.amount) < 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

    const netMonthlyCashFlow = monthlyIncome - monthlyExpenses;

    // All-time historical metrics
    const totalAllTimeIncome = transactions
      .filter((t) => t.type === "credit" || Number(t.amount) > 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

    const totalAllTimeExpenses = transactions
      .filter((t) => t.type === "debit" || Number(t.amount) < 0)
      .reduce((acc, t) => acc + Math.abs(Number(t.amount) || 0), 0);

    // 3. Build text payloads
    const rawDocs = [
      `DETERMINISTIC FINANCIAL SUMMARY: Current Month (${currentMonthStr}) Total Income: ₹${monthlyIncome}. Current Month (${currentMonthStr}) Total Expenses: ₹${monthlyExpenses}. Net Monthly Cash Flow: ₹${netMonthlyCashFlow}. Total Combined Bank Balance: ₹${totalBalance}. Historical All-Time Tracked Income: ₹${totalAllTimeIncome}. Historical All-Time Tracked Expenses: ₹${totalAllTimeExpenses}. Active Accounts: ${banks.length}.`,
      ...banks.map(
        (b) => `BANK: Name: "${b.name}", Institution: "${b.bankName || b.officialName}", Balance: ₹${b.currentBalance}, Type: "${b.subtype || b.type}"`
      ),
      ...transactions.map(
        (t) => `TRANSACTION: Name: "${t.name}", Amount: ₹${t.amount}, Category: "${t.category}", Date: "${t.date || t.$createdAt}", Channel: "${t.channel || t.paymentChannel}", Status: "${t.status}"`
      ),
    ];

    if (rawDocs.length === 0) return { count: 0 };

    // 4. Clear Pinecone Namespace & Batch Upsert
    const index = pineconeClient.Index(process.env.PINECONE_INDEX_NAME!);

    try {
      await index.namespace(userId).deleteAll();
    } catch (e) {
      console.log("Pinecone namespace reset skipped:", e);
    }

    const embeddings = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY,
      model: "embed-english-v3.0",
    });

    const BATCH_SIZE = 50;
    const chunkedDocs: string[][] = [];
    for (let i = 0; i < rawDocs.length; i += BATCH_SIZE) {
      chunkedDocs.push(rawDocs.slice(i, i + BATCH_SIZE));
    }

    const embeddingResults = await Promise.all(
      chunkedDocs.map((chunk) => embeddings.embedDocuments(chunk))
    );
    const vectorValues = embeddingResults.flat();

    const records = rawDocs.map((text, i) => ({
      id: `${userId}-${i}`,
      values: vectorValues[i],
      metadata: { text, userId },
    }));

    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      await index.namespace(userId).upsert(batch);
    }

    return { count: rawDocs.length };
  } catch (error: any) {
    console.error("Vector sync failed:", error);
    throw error;
  }
}