import type { FireEngineInput } from "./types";

// (Assuming FinancialSnapshot shape is injected or duck-typed)
// We declare a minimal structural interface representing what we need from the web app's FinancialSnapshot
export interface MinimalSnapshotForFire {
  userId: string;
  accounts: Array<{ type?: string; subtype?: string; currentBalance?: number; availableBalance?: number; balance?: number }>;
  investmentSummary?: {
    totalPortfolioValue?: number;
    equity?: number;
    mutualFunds?: number;
    unparsedHoldings?: number;
  };
  containsMockData?: boolean;
}

/**
 * Adapter mapping a canonical FinancialSnapshot into a valid FireEngineInput.
 * This dynamically seeds the FIRE engine's portfolio state with authoritative
 * user data, rather than relying on manual user inputs.
 */
export function adaptSnapshotToFireEngine(
  snapshot: MinimalSnapshotForFire,
  existingInput: FireEngineInput
): FireEngineInput {
  // 1. Calculate liquid bank balance. Only include depository/asset accounts.
  // We do NOT treat credit card liabilities or loans as positive portfolio corpus.
  const totalBankBalance = snapshot.accounts.reduce((sum, acc) => {
    // Treat 'depository' and 'investment' as assets. If type is missing, we conservatively exclude it to avoid adding liabilities.
    if (acc.type === "depository" || acc.type === "investment" || acc.type === "bank") {
      return sum + Number(acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0);
    }
    return sum;
  }, 0);

  // 2. Extract investments
  const investments = snapshot.investmentSummary?.totalPortfolioValue || 0;
  
  // Combine authoritative assets
  const currentCorpus = totalBankBalance + investments;

  return {
    ...existingInput,
    // Preserve provenance: if snapshot contains mock data, mark the engine input as mock
    isMockData: existingInput.isMockData || snapshot.containsMockData || false,
    portfolio: {
      ...existingInput.portfolio,
      currentCorpus, // Injecting the authoritative server-verified corpus
    },
  };
}
