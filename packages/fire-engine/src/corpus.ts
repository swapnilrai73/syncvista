// ─────────────────────────────────────────────────────────────────────────
// Deterministic FIRE corpus calculation.
//
// Implements a bucketed-inflation present-value model: each expense bucket
// (general, healthcare, education, tech, housing) inflates at its own rate
// rather than one flat number, goal milestones are added at their specific
// year, and everything is discounted back at the user's expected post-tax
// portfolio return. A terminal "base corpus" buffer (25x annual essential
// spend, inflation-adjusted) sits underneath as a floor.
//
// Pure function — same input always produces same output. No AI, no
// network calls, no side effects. This is intentional: this is the layer
// every tier's presenter formats differently, so it must be trustworthy on
// its own terms.
// ─────────────────────────────────────────────────────────────────────────

import type { FireEngineInput, InflationBucket } from "./types";
import { getTaxConfig } from "./tax-config/fy2026-27";
import { estimatePortfolioReturn } from "./market-assumptions";
import { getCityMultiplier } from "./city-cost-index";

const BUCKET_INFLATION_DEFAULTS: Record<InflationBucket, number> = {
  general: 0.06,
  healthcare: 0.12,
  education: 0.1,
  techDurables: 0.03,
  housing: 0.06,
};

function annualize(monthlyAmount: number): number {
  return monthlyAmount * 12;
}

/**
 * Present value, discounted at the portfolio's expected return, of every
 * year's inflated expenses between now and retirement — bucketed by
 * inflation category, plus any goal milestones landing in that year.
 */
export function calculateBucketedPresentValue(input: FireEngineInput): {
  presentValue: number;
  bucketedContribution: Record<InflationBucket, number>;
} {
  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  if (yearsToRetirement <= 0) {
    throw new Error("targetRetirementAge must be after currentAge");
  }

  const portfolioReturn = estimatePortfolioReturn(input.portfolio.allocation);
  const buckets = Object.keys(input.expenses) as InflationBucket[];

  // City cost multiplier applies to housing and general-living buckets —
  // the researched figures (₹50-60k/mo Mumbai "comfortable lifestyle" vs
  // ₹20-25k/mo in Jaipur/Bhopal-tier cities) measure total living cost
  // (rent + food + transport + utilities), not rent alone, so it's applied
  // to both buckets that represent that spend, not just housing.
  const cityMultiplier = getCityMultiplier(input.profile.cityTier, input.profile.city);
  const CITY_ADJUSTED_BUCKETS: InflationBucket[] = ["housing", "general"];

  let presentValue = 0;
  const bucketedContribution: Record<InflationBucket, number> = {
    general: 0,
    healthcare: 0,
    education: 0,
    techDurables: 0,
    housing: 0,
  };

  for (let year = 1; year <= yearsToRetirement; year++) {
    const discountFactor = Math.pow(1 + portfolioReturn, year);

    for (const bucket of buckets) {
      const bucketInflation =
        input.assumptions.generalInflation !== undefined && bucket === "general"
          ? input.assumptions.generalInflation
          : BUCKET_INFLATION_DEFAULTS[bucket];

      const cityAdjustment = CITY_ADJUSTED_BUCKETS.includes(bucket) ? cityMultiplier : 1;
      const annualExpense = annualize(input.expenses[bucket]) * cityAdjustment;
      const inflatedExpense = annualExpense * Math.pow(1 + bucketInflation, year);
      const discountedExpense = inflatedExpense / discountFactor;

      presentValue += discountedExpense;
      bucketedContribution[bucket] += discountedExpense;
    }

    for (const goal of input.goals) {
      if (goal.yearFromNow === year) {
        const goalInflation = BUCKET_INFLATION_DEFAULTS[goal.inflationBucket];
        const inflatedGoal = goal.amountToday * Math.pow(1 + goalInflation, year);
        const discountedGoal = inflatedGoal / discountFactor;

        presentValue += discountedGoal;
        bucketedContribution[goal.inflationBucket] += discountedGoal;
      }
    }
  }

  return { presentValue, bucketedContribution };
}

/**
 * The terminal "base corpus" floor: 25x annual essential (general-bucket)
 * spend at retirement, inflation-adjusted, discounted back at real return.
 * This is the classic FIRE rule-of-thumb, kept as a floor underneath the
 * more detailed bucketed model above — not a replacement for it.
 */
export function calculateTerminalBaseCorpus(input: FireEngineInput): number {
  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  const cityMultiplier = getCityMultiplier(input.profile.cityTier, input.profile.city);
  const baseAnnualExpense = annualize(input.expenses.general) * cityMultiplier;
  const generalInflation = input.assumptions.generalInflation;

  const portfolioReturn = estimatePortfolioReturn(input.portfolio.allocation);
  const realReturn = portfolioReturn - generalInflation;

  const inflatedBase = baseAnnualExpense * Math.pow(1 + generalInflation, yearsToRetirement);
  const terminalValue = 25 * inflatedBase;

  return terminalValue / Math.pow(1 + realReturn, yearsToRetirement);
}

export function calculateRequiredMonthlySavings(
  targetCorpus: number,
  currentCorpus: number,
  yearsToRetirement: number,
  portfolioReturn: number
): { requiredMonthlySavings: number; surplusAtRetirement: number } {
  const monthsToRetirement = yearsToRetirement * 12;
  const monthlyReturn = portfolioReturn / 12;

  const futureValueOfCurrentCorpus = currentCorpus * Math.pow(1 + portfolioReturn, yearsToRetirement);
  const gap = targetCorpus - futureValueOfCurrentCorpus;

  if (gap <= 0) {
    // Already on track from current corpus growth alone — report the
    // surplus explicitly rather than a bare zero, so "just barely covered"
    // and "wildly overshooting" are distinguishable in the output.
    return { requiredMonthlySavings: 0, surplusAtRetirement: -gap };
  }

  // Standard future-value-of-annuity, solved for payment.
  const annuityFactor = (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn;
  return { requiredMonthlySavings: gap / annuityFactor, surplusAtRetirement: 0 };
}