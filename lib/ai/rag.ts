import { CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { Document } from "@langchain/core/documents";
import { getAccounts, getAllTransactions } from "@/lib/actions/bank.actions";
import { getInvestmentSummary } from "@/lib/actions/investment.actions";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const getVectorStore = async () => {
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
  
  const embeddings = new CohereEmbeddings({
    apiKey: process.env.COHERE_API_KEY,
    model: "embed-english-v3.0",
  });

  return new PineconeStore(embeddings, {
    pineconeIndex: index,
  });
};

export const syncUserDataToVectorStore = async (userId: string) => {
  try {
    const vectorStore = await getVectorStore();

   // Fetch user records
   const accountsResponse = await getAccounts({ userId });
   const accounts = accountsResponse?.data || [];
   
   const transactionsResponse = await getAllTransactions({ userId });
   const transactions = Array.isArray(transactionsResponse) ? transactionsResponse : [];
   
   const investments = await getInvestmentSummary({ userId });

   const documents: Document[] = [];

    // 1. Account Docs
    if (accounts?.data) {
      accounts.data.forEach((acc: any) => {
        documents.push(
          new Document({
            pageContent: `Bank Account: ${acc.name} (${acc.officialName || "Bank"}). Balance: ₹${acc.currentBalance}. Mask: ${acc.mask}. Type: ${acc.type}.`,
            metadata: { userId, type: "account", id: acc.appwriteItemId || acc.$id || "" },
          })
        );
      });
    }

    // 2. Transaction Docs
    transactions.forEach((tx: any) => {
      documents.push(
        new Document({
          pageContent: `Transaction: ${tx.name}. Amount: ₹${tx.amount}. Category: ${tx.category || "General"}. Date: ${tx.date}. Status: ${tx.status || "Completed"}. Channel: ${tx.channel || "Online"}.`,
          metadata: { userId, type: "transaction", id: tx.$id || "" },
        })
      );
    });

    // 3. Investment Docs
    if (investments) {
      documents.push(
        new Document({
          pageContent: `Investment Portfolio Summary: Current Value: ₹${investments.currentValue || 0}. Total Investments: ₹${investments.totalInvested || 0}. Total Gain: ₹${investments.totalGain || 0}. Holdings: ${JSON.stringify(investments.portfolioData || [])}`,
          metadata: { userId, type: "investment" },
        })
      );
    }

    if (documents.length > 0) {
      await vectorStore.addDocuments(documents, { namespace: userId });
    }

    return { success: true, count: documents.length };
  } catch (error: any) {
    console.error("Error syncing vector data:", error);
    throw new Error(error.message || "Failed to sync vector store");
  }
};