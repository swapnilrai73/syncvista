"use server";

import { getLoggedInUser } from "./user.actions";
import { getAccounts, getAllTransactions } from "./bank.actions";
import { getInvestmentSummary } from "./investment.actions";
import { parseStringify } from "../utils";

export const buildFinancialSnapshot = async (): Promise<FinancialSnapshot | null> => {
  try {
    // 1. Authoritative Identity Validation
    // We strictly do NOT accept a userId parameter from the client.
    // The context is entirely derived from the verified secure HTTP-only session.
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("Unauthorized: Cannot build snapshot without an active session");
    }

    const userId = user.$id;

    // 2. Fetch all underlying financial data
    const [accountsResponse, transactionsResponse, investmentSummary] = await Promise.all([
      getAccounts({ userId }),
      getAllTransactions({ userId }),
      getInvestmentSummary({ userId }),
    ]);

    // Parse the stringified responses
    const accountsData = accountsResponse ? (typeof accountsResponse === "string" ? JSON.parse(accountsResponse) : accountsResponse) : { data: [], isFallback: false };
    const transactionsData = transactionsResponse ? (typeof transactionsResponse === "string" ? JSON.parse(transactionsResponse) : transactionsResponse) : [];

    // Ensure we handle arrays correctly depending on how the actions return data
    const accounts: Account[] = accountsData.data || [];
    const transactions: NormalizedTransaction[] = Array.isArray(transactionsData) ? transactionsData : (transactionsData.data || []);

    // 3. Data Safety & Quality Analysis
    // Determine if ANY part of this snapshot is constructed from mock/fallback data
    const containsMockAccounts = accountsData.isFallback === true || accounts.some((acc: any) => acc.mock === true);
    const containsMockTransactions = transactions.some((txn: any) => txn.mock === true);
    const containsMockData = containsMockAccounts || containsMockTransactions;

    // 4. Construct the Canonical Snapshot
    const snapshot: FinancialSnapshot = {
      userId,
      timestamp: new Date().toISOString(),
      accounts,
      transactions,
      investmentSummary: investmentSummary || undefined,
      containsMockData,
    };

    return parseStringify(snapshot);
  } catch (error) {
    console.error("Failed to build authoritative financial snapshot:", error);
    return null;
  }
};
