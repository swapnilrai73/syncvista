// ─────────────────────────────────────────────────────────────────────────
// Module F — Real-World Hurdle & Safety-Net Engine.
//
// Three independent, pure functions — not bundled into one type, because
// they answer three genuinely different questions asked at different times:
// "how should my corpus be structured at retirement," "how do I withdraw
// this year," and "how protected am I right now, regardless of any FIRE
// projection." See the block comment on their types in types.ts.
// ─────────────────────────────────────────────────────────────────────────

import type {
  LiquidityBucketPlan,
  WithdrawalPlanInput,
  WithdrawalPlanOutput,
  WithdrawalAllocation,
  ProtectionScoreInput,
  ProtectionScoreOutput,
} from "./types";

/**
 * 8.1 — splits the target corpus into three withdrawal-sequencing tranches.
 * Bucket 1 (3 years) exists specifically so a market downturn in early
 * retirement doesn't force equity liquidation at the worst possible time.
 */
export function computeLiquidityBucketPlan(
  annualWithdrawal: number,
  targetCorpus: number
): LiquidityBucketPlan {
  const bucket1Immediate = Math.min(annualWithdrawal * 3, targetCorpus);
  const remainingAfterBucket1 = targetCorpus - bucket1Immediate;

  const bucket2Medium = Math.min(annualWithdrawal * 7, remainingAfterBucket1); // years 4-10
  const remainingAfterBucket2 = remainingAfterBucket1 - bucket2Medium;

  const bucket3Growth = Math.max(0, remainingAfterBucket2);

  return { bucket1Immediate, bucket2Medium, bucket3Growth };
}

/**
 * 8.2 — tax-efficient withdrawal ordering for one year's need.
 *
 * NPS annuity income is netted against the need FIRST, not sequenced
 * alongside discretionary sources — it's mandatory income received
 * regardless of choice, not something to "decide" to draw.
 *
 * IMPORTANT (confirmed during blueprint research): the Section 87A rebate
 * does NOT apply to capital gains income, even when total income would
 * otherwise fall under the rebate threshold. This function does not need
 * to compute that rebate itself — it's a slab-income concern, not a
 * withdrawal-sequencing one — but the ordering below deliberately treats
 * LTCG-within-exemption as a DISTINCT, higher-priority source from
 * LTCG-above-exemption specifically because that Section 112A exemption
 * does not stack with or benefit from 87A the way salary income might.
 */
export function planWithdrawal(input: WithdrawalPlanInput): WithdrawalPlanOutput {
  const allocations: WithdrawalAllocation[] = [];

  const npsDrawn = Math.min(input.npsAnnualIncome, input.annualWithdrawalNeeded);
  if (npsDrawn > 0) {
    allocations.push({ sourceType: "npsAnnuity", amountDrawn: npsDrawn });
  }
  let remainingNeed = input.annualWithdrawalNeeded - npsDrawn;
  let remainingLtcgExemption = input.ltcgExemptionRemainingThisYear;

  const priorityOrder: Array<WithdrawalPlanInput["sources"][number]["sourceType"]> = [
    "taxExemptMaturity",
    "ltcgWithinExemption",
    "ltcgAboveExemption",
    "debtOrStcg",
  ];

  for (const sourceType of priorityOrder) {
    if (remainingNeed <= 0) break;

    const source = input.sources.find((s) => s.sourceType === sourceType);
    if (!source || source.availableBalance <= 0) continue;

    let drawCap = Math.min(source.availableBalance, remainingNeed);
    if (sourceType === "ltcgWithinExemption") {
      drawCap = Math.min(drawCap, remainingLtcgExemption);
    }

    if (drawCap <= 0) continue;

    allocations.push({ sourceType, amountDrawn: drawCap });
    remainingNeed -= drawCap;
    if (sourceType === "ltcgWithinExemption") {
      remainingLtcgExemption -= drawCap;
    }
  }

  return {
    allocations,
    remainingLtcgExemption,
    shortfall: Math.max(0, remainingNeed),
  };
}

/**
 * 8.3 — Net Worth Protection Score. Weights (w1/w2/w3) are a documented
 * design judgment call, not a law-derived constant — adjust deliberately
 * based on product feedback, don't treat them as needing annual
 * verification the way tax rates do.
 */
const PROTECTION_SCORE_WEIGHTS = { insurance: 0.4, liquidity: 0.35, concentration: 0.25 };

/** Asset weight above this threshold starts counting as concentration risk — a diversification judgment call, not a fact. */
const PRUDENT_CONCENTRATION_THRESHOLD = 0.4;

export function calculateProtectionScore(input: ProtectionScoreInput): ProtectionScoreOutput {
  const netIncome = Math.max(0, input.annualIncome - input.personalAnnualExpenses);
  const r = input.discountRateForHLV;
  const n = input.yearsToRetirement;

  // Present value of an n-year income-replacement annuity.
  const humanLifeValue = r === 0 ? netIncome * n : netIncome * ((1 - Math.pow(1 + r, -n)) / r);

  const insuranceAdequacy = humanLifeValue > 0 ? Math.min(1, input.actualTermCoverAmount / humanLifeValue) : 1;
  const liquidityMonthsNormalized = Math.min(1, input.actualLiquidMonths / input.targetLiquidMonths);

  const maxAssetWeight = Math.max(...Object.values(input.assetAllocation));
  const concentrationRisk =
    maxAssetWeight <= PRUDENT_CONCENTRATION_THRESHOLD
      ? 0
      : Math.min(1, (maxAssetWeight - PRUDENT_CONCENTRATION_THRESHOLD) / (1 - PRUDENT_CONCENTRATION_THRESHOLD));

  const score =
    100 *
    (PROTECTION_SCORE_WEIGHTS.insurance * insuranceAdequacy +
      PROTECTION_SCORE_WEIGHTS.liquidity * liquidityMonthsNormalized +
      PROTECTION_SCORE_WEIGHTS.concentration * (1 - concentrationRisk));

  return {
    score,
    insuranceAdequacy,
    liquidityMonthsNormalized,
    concentrationRisk,
    humanLifeValue,
  };
}