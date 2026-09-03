// ─────────────────────────────────────────────────────────────────────────
// Market return/volatility assumptions, per asset class.
//
// These are estimates, not facts — unlike tax-config (which encodes actual
// law), this file encodes a judgment call about expected long-term returns.
// Kept in its own versioned file so it can be revisited/debated on its own
// terms, without being confused with the tax layer's legal precision.
// ─────────────────────────────────────────────────────────────────────────

import type { AssetAllocation } from "./types";

export interface AssetClassAssumption {
  expectedNominalReturn: number;
  volatility: number; // annualized standard deviation, for Monte Carlo sampling
}

export const MARKET_ASSUMPTIONS_2026: Record<keyof AssetAllocation, AssetClassAssumption> = {
  equityDomestic: { expectedNominalReturn: 0.12, volatility: 0.18 },
  equityInternational: { expectedNominalReturn: 0.1, volatility: 0.16 },
  debt: { expectedNominalReturn: 0.075, volatility: 0.04 },
  gold: { expectedNominalReturn: 0.08, volatility: 0.15 },
  realEstate: { expectedNominalReturn: 0.09, volatility: 0.1 },
  cash: { expectedNominalReturn: 0.06, volatility: 0.005 },
};

/** Weighted-average expected nominal return across the user's allocation. */
export function estimatePortfolioReturn(allocation: AssetAllocation): number {
  return (Object.keys(allocation) as (keyof AssetAllocation)[]).reduce((sum, key) => {
    return sum + allocation[key] * MARKET_ASSUMPTIONS_2026[key].expectedNominalReturn;
  }, 0);
}

/**
 * Simplified weighted-average volatility (ignores cross-asset correlation).
 * Good enough for a first-pass Monte Carlo; a more rigorous version would
 * use a covariance matrix — worth upgrading once the basic engine is proven.
 */
export function estimatePortfolioVolatility(allocation: AssetAllocation): number {
  return (Object.keys(allocation) as (keyof AssetAllocation)[]).reduce((sum, key) => {
    return sum + allocation[key] * MARKET_ASSUMPTIONS_2026[key].volatility;
  }, 0);
}