import type { FireEngineInput } from "./types";

// (Assuming FinancialSnapshot shape is injected or duck-typed)
// We declare a minimal structural interface representing what we need from the web app's FinancialSnapshot
export interface MinimalSnapshotForFire {
  userId: string;
  accounts: Array<{ currentBalance?: number; availableBalance?: number; balance?: number }>;
  investmentSummary?: {
    totalPortfolioValue?: number;
    equity?: number;
    mutualFunds?: number;
    unparsedHoldings?: number;
  };
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
  // 1. Calculate liquid bank balance
  const totalBankBalance = snapshot.accounts.reduce((sum, acc) => {
    return sum + Number(acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0);
  }, 0);

  // 2. Extract investments
  const investments = snapshot.investmentSummary?.totalPortfolioValue || 0;
  
  // Combine authoritative assets
  const currentCorpus = totalBankBalance + investments;

  // We could further map equity vs mutualFunds into the instrument hub here.
  // For now, we seed the deterministic target corpus and return the merged configuration.

  return {
    ...existingInput,
    portfolio: {
      ...existingInput.portfolio,
      currentCorpus, // Injecting the authoritative server-verified corpus
      // (Future extension: Map explicit snapshot accounts/instruments to `instruments: []`)
    },
  };
}
