// ─────────────────────────────────────────────────────────────────────────
// Module G — Tax-Lot Harvesting Analysis.
//
// Two genuinely different opportunities, both surfaced here:
//   1. Unrealized LOSSES — harvestable against realized gains this year
//      under Section 70 set-off rules.
//   2. Unrealized LTCG GAINS sitting within remaining Section 112A
//      exemption headroom — realizing (and optionally re-buying) these
//      resets cost basis higher at zero tax cost, per the blueprint's
//      "Automated LTCG Harvesting" design.
//
// Standalone function, not embedded in FireEngineOutput — tax-lot data is
// a genuinely separate concern from accumulation-phase corpus planning,
// often CAS-derived and kept client-side per the earlier privacy decision,
// and asked about at a different time than "what's my FIRE number."
//
// NOTE on debt instruments: post-Finance-Act-2023 reform, most debt mutual
// fund gains are taxed at slab rate regardless of holding period — there is
// no preferential long-term rate to classify them into anymore for units
// acquired on/after April 1, 2023. This module treats all non-equity lots
// as "STCG" for classification purposes to reflect that current reality,
// not because they're literally short-term, but because the old
// LTCG-with-indexation benefit for debt funds no longer applies. Verify
// this rule hasn't changed again before relying on it (see Module Verification
// Ledger, Section 11 of the blueprint doc).
// ─────────────────────────────────────────────────────────────────────────

import type { TaxLot, TaxHarvestAnalysisInput, TaxHarvestAnalysisOutput, TaxHarvestOpportunity } from "./types";
import type { TaxYearConfig } from "./tax-config/fy2026-27";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const LONG_TERM_EQUITY_HOLDING_DAYS = 365;

function holdingPeriodDays(purchaseDate: string, asOf: Date): number {
  const purchased = new Date(purchaseDate);
  return Math.floor((asOf.getTime() - purchased.getTime()) / MS_PER_DAY);
}

function classifyGainType(lot: TaxLot, asOf: Date): "STCG" | "LTCG" {
  if (!lot.isEquityOriented) return "STCG"; // see file header note on debt-fund taxation reform
  return holdingPeriodDays(lot.purchaseDate, asOf) > LONG_TERM_EQUITY_HOLDING_DAYS ? "LTCG" : "STCG";
}

/**
 * `asOf` defaults to the actual current date — pass an explicit date only
 * for testing/reproducibility, since real harvesting decisions are always
 * relative to today, not to the fiscal year string alone.
 */
export function analyzeTaxHarvestOpportunities(
  input: TaxHarvestAnalysisInput,
  taxConfig: TaxYearConfig,
  asOf: Date = new Date()
): TaxHarvestAnalysisOutput {
  const opportunities: TaxHarvestOpportunity[] = [];
  let totalHarvestableLoss = 0;
  let exemptionUsedThisAnalysis = 0;

  for (const lot of input.lots) {
    const unrealizedGainOrLoss = lot.currentValue - lot.costBasis;
    const gainType = classifyGainType(lot, asOf);

    if (unrealizedGainOrLoss < 0) {
      const lossAmount = Math.abs(unrealizedGainOrLoss);
      totalHarvestableLoss += lossAmount;
      opportunities.push({
        lot,
        unrealizedGainOrLoss,
        gainType,
        applicableRule:
          gainType === "STCG"
            ? `Unrealized STCG-classified loss of ₹${lossAmount.toLocaleString("en-IN")} — harvestable to offset realized STCG or LTCG gains this year under Section 70 set-off rules.`
            : `Unrealized LTCG-classified loss of ₹${lossAmount.toLocaleString("en-IN")} — harvestable to offset realized LTCG gains this year under Section 70.`,
      });
      continue;
    }

    if (gainType === "LTCG" && unrealizedGainOrLoss > 0) {
      const remainingExemption = Math.max(
        0,
        taxConfig.ltcgEquityExemptionThreshold - input.realizedGainsThisYear.ltcg - exemptionUsedThisAnalysis
      );
      if (remainingExemption <= 0) continue;

      const harvestableGain = Math.min(unrealizedGainOrLoss, remainingExemption);
      exemptionUsedThisAnalysis += harvestableGain;

      opportunities.push({
        lot,
        unrealizedGainOrLoss: harvestableGain,
        gainType,
        applicableRule: `₹${harvestableGain.toLocaleString("en-IN")} of this LTCG gain falls within your remaining Section 112A exemption headroom for ${input.taxYear} — realizing (and optionally re-buying) this portion resets cost basis higher at zero tax cost. Note: this exemption does not stack with or benefit from the Section 87A rebate.`,
      });
    }
  }

  const ltcgExemptionRemaining = Math.max(
    0,
    taxConfig.ltcgEquityExemptionThreshold - input.realizedGainsThisYear.ltcg - exemptionUsedThisAnalysis
  );

  return { opportunities, totalHarvestableLoss, ltcgExemptionRemaining };
}