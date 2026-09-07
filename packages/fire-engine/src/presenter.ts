// ─────────────────────────────────────────────────────────────────────────
// Presenter/Tier-Gating Layer.
//
// See the block comment on the types in types.ts for the full rationale.
// Short version: this file redacts, it never computes. Every number here
// comes straight from the engine's output — the only thing this layer
// changes is whether a specific fund/security NAME is visible, and whether
// the (not-yet-built) spouse/HUF structuring module is reachable at all.
// ─────────────────────────────────────────────────────────────────────────

import type {
  EngineTier,
  FireEngineOutput,
  TaxHarvestAnalysisOutput,
  PresentedFireOutput,
  PresentedTaxHarvestOutput,
  PresentedTaxHarvestOpportunity,
} from "./types";

const DISCLAIMERS: Record<EngineTier, string> = {
  base: "This is a self-directed financial modeling and simulation tool based on the assumptions you provided. It is for educational purposes only and does not constitute personalized investment, tax, or legal advice.",
  pro: "This analysis is structured for review by a licensed advisor before being shared with any end client. It is not a finished recommendation and should not be forwarded to a retail client without professional review and adoption.",
  supreme: "Personal-use analysis for a single individual's own finances — not distributed to any other user.",
};

export function getDisclaimer(tier: EngineTier): string {
  return DISCLAIMERS[tier];
}

/**
 * Structural gate for the tax-optimized structuring layer (spouse/HUF/
 * joint-property — blueprint Module G, Section 9) — NOT YET IMPLEMENTED.
 * This function exists now, ahead of that module's implementation, so the
 * boundary is real, testable code from day one. When that module IS built,
 * every call site MUST check this before running or returning anything
 * from it — the gate coming first is deliberate, not incidental.
 */
export function canAccessStructuringLayer(tier: EngineTier): boolean {
  return tier === "supreme";
}

export function presentTaxHarvestOutput(
  raw: TaxHarvestAnalysisOutput,
  tier: EngineTier
): PresentedTaxHarvestOutput {
  const opportunities: PresentedTaxHarvestOpportunity[] = raw.opportunities.map((opp, index) => ({
    assetLabel:
      tier === "supreme"
        ? opp.lot.assetLabel
        : `Holding #${index + 1} (${opp.lot.isEquityOriented ? "equity" : "debt"}-oriented)`,
    unrealizedGainOrLoss: opp.unrealizedGainOrLoss,
    gainType: opp.gainType,
    applicableRule: opp.applicableRule,
  }));

  return {
    tier,
    opportunities,
    totalHarvestableLoss: raw.totalHarvestableLoss,
    ltcgExemptionRemaining: raw.ltcgExemptionRemaining,
    disclaimer: getDisclaimer(tier),
  };
}

/**
 * No redaction needed here — nothing in FireEngineOutput identifies a
 * specific third-party security (debt is the user's own loan, tax-harvest
 * facts are handled separately above). This function's job is just to
 * attach the tier-appropriate disclaimer and select which fields this
 * presentation surfaces, keeping the shape explicit rather than passing
 * the raw engine output straight through unexamined.
 */
export function presentFireOutput(raw: FireEngineOutput, tier: EngineTier): PresentedFireOutput {
  return {
    tier,
    disclaimer: getDisclaimer(tier),
    targetCorpus: raw.targetCorpus,
    yearsToRetirement: raw.yearsToRetirement,
    requiredMonthlySavings: raw.requiredMonthlySavings,
    surplusAtRetirement: raw.surplusAtRetirement,
    projectedCorpusAtRetirement: raw.projectedCorpusAtRetirement,
    monteCarlo: raw.monteCarlo,
    liquidityBucketPlan: raw.liquidityBucketPlan,
    warnings: raw.warnings,
    debtComparison: raw.debtComparison,
  };
}