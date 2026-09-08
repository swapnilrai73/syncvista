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

import type { FireEngineInput, InflationBucket, DebtClearanceOutput } from "./types";
import { getTaxConfig } from "./tax-config/fy2026-27";
import { resolvePortfolioReturn } from "./instrument-hub";
import { getCityMultiplier } from "./city-cost-index";

const BUCKET_INFLATION_DEFAULTS: Record<InflationBucket, number> = {
  general: 0.06,
  healthcare: 0.12,
  education: 0.1,
  techDurables: 0.03,
  housing: 0.06,
};

/**
 * Shared inflation-rate lookup, used by both the deterministic corpus
 * calculation and the Monte Carlo shock library (Module E) — kept in one
 * place so the two never silently drift apart on what "healthcare
 * inflation" means.
 */
export function getBucketInflationRate(bucket: InflationBucket, generalInflationOverride?: number): number {
  if (bucket === "general" && generalInflationOverride !== undefined) {
    return generalInflationOverride;
  }
  return BUCKET_INFLATION_DEFAULTS[bucket];
}

function annualize(monthlyAmount: number): number {
  return monthlyAmount * 12;
}

/**
 * Required corpus at retirement date, discounted at the portfolio's expected return,
 * to fund every year's inflated expenses across the post-retirement horizon —
 * bucketed by inflation category, plus any goal milestones.
 */
export function calculateBucketedPresentValue(
  input: FireEngineInput,
  debtOutput?: DebtClearanceOutput
): {
  presentValue: number;
  bucketedContribution: Record<InflationBucket, number>;
} {
  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  if (yearsToRetirement <= 0) {
    throw new Error("targetRetirementAge must be after currentAge");
  }

  const horizonYears = input.assumptions.postRetirementHorizonYears || 30;
  const portfolioReturn = resolvePortfolioReturn(input.portfolio);
  const buckets = Object.keys(input.expenses) as InflationBucket[];

  // City cost multiplier applies to housing and general-living buckets
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

  // 1. Post-retirement expenses: model the stream over horizonYears starting at retirement date
  for (const bucket of buckets) {
    const bucketInflation = getBucketInflationRate(bucket, input.assumptions.generalInflation);
    const cityAdjustment = CITY_ADJUSTED_BUCKETS.includes(bucket) ? cityMultiplier : 1;
    const annualExpenseToday = annualize(input.expenses[bucket]) * cityAdjustment;

    // Inflate the annual expense from today up to retirement date
    const annualExpenseAtRetirement = annualExpenseToday * Math.pow(1 + bucketInflation, yearsToRetirement);

    for (let y = 1; y <= horizonYears; y++) {
      const discountFactor = Math.pow(1 + portfolioReturn, y);
      const totalYearFromToday = yearsToRetirement + y;

      // Check if debt payoff overrides housing bucket in this specific retirement year
      const debtOverride =
        bucket === "housing" ? debtOutput?.housingExpenseByYear?.[totalYearFromToday] : undefined;

      let expenseInYear: number;
      if (debtOverride !== undefined) {
        expenseInYear = annualize(debtOverride);
      } else {
        expenseInYear = annualExpenseAtRetirement * Math.pow(1 + bucketInflation, y);
      }

      const discountedToRetirement = expenseInYear / discountFactor;
      presentValue += discountedToRetirement;
      bucketedContribution[bucket] += discountedToRetirement;
    }
  }

  // 2. Goal milestones:
  // - Goals occurring before or at retirement: capital needed at retirement is compounded forward
  // - Goals occurring during retirement: capital needed is discounted back to retirement date
  for (const goal of input.goals) {
    const goalInflation = BUCKET_INFLATION_DEFAULTS[goal.inflationBucket];
    const inflatedGoal = goal.amountToday * Math.pow(1 + goalInflation, goal.yearFromNow);

    let goalValueAtRetirement: number;
    if (goal.yearFromNow <= yearsToRetirement) {
      const yearsToGrow = yearsToRetirement - goal.yearFromNow;
      goalValueAtRetirement = inflatedGoal * Math.pow(1 + portfolioReturn, yearsToGrow);
    } else {
      const yearsInRetirement = goal.yearFromNow - yearsToRetirement;
      goalValueAtRetirement = inflatedGoal / Math.pow(1 + portfolioReturn, yearsInRetirement);
    }

    presentValue += goalValueAtRetirement;
    bucketedContribution[goal.inflationBucket] += goalValueAtRetirement;
  }

  return { presentValue, bucketedContribution };
}

/**
 * The terminal "base corpus" floor: 25x annual essential (general-bucket)
 * spend at retirement, inflation-adjusted to retirement date.
 * This classic FIRE rule-of-thumb sits underneath as a minimum floor.
 */
export function calculateTerminalBaseCorpus(input: FireEngineInput): number {
  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  const cityMultiplier = getCityMultiplier(input.profile.cityTier, input.profile.city);
  const baseAnnualExpense = annualize(input.expenses.general) * cityMultiplier;
  const generalInflation = input.assumptions.generalInflation;

  // Inflated general expense at retirement date
  const inflatedBaseAtRetirement = baseAnnualExpense * Math.pow(1 + generalInflation, yearsToRetirement);

  // 25x annual spend at retirement date (in rupees at retirement)
  return 25 * inflatedBaseAtRetirement;
}

export function calculateRequiredMonthlySavings(
  targetCorpus: number,
  currentCorpus: number,
  yearsToRetirement: number,
  portfolioReturn: number,
  freedMonthlyCashFlowByYear?: Record<number, number>
): { requiredMonthlySavings: number; surplusAtRetirement: number } {
  const monthsToRetirement = yearsToRetirement * 12;
  const monthlyReturn = portfolioReturn / 12;

  const futureValueOfCurrentCorpus = currentCorpus * Math.pow(1 + portfolioReturn, yearsToRetirement);

  // Future value contributed by Module D's freed-cash-flow stream alone,
  // BEFORE solving for the base monthly savings amount. Modeled as one
  // annual lump sum landing at each year's end (rather than exact monthly
  // compounding within the year) — a deliberate, documented simplification
  // that keeps this closed-form rather than requiring a full simulation.
  //
  // IMPORTANT: debt-engine.ts's simulation stops recording the moment all
  // loans are cleared, so freedMonthlyCashFlowByYear has no entry for years
  // after that point — but the freed cash flow itself doesn't stop, it just
  // stops changing. Any year beyond the last recorded one carries forward
  // the last known freed amount rather than defaulting to 0, which would
  // otherwise silently understate the benefit of paying off debt early.
  let futureValueOfFreedCashFlow = 0;
  if (freedMonthlyCashFlowByYear) {
    const recordedYears = Object.keys(freedMonthlyCashFlowByYear).map(Number);
    const lastRecordedYear = recordedYears.length ? Math.max(...recordedYears) : 0;
    const lastKnownFreedAmount = lastRecordedYear ? freedMonthlyCashFlowByYear[lastRecordedYear] : 0;

    for (let year = 1; year <= yearsToRetirement; year++) {
      const freedThisYear =
        year <= lastRecordedYear ? freedMonthlyCashFlowByYear[year] || 0 : lastKnownFreedAmount;
      if (freedThisYear === 0) continue;
      const annualLumpSum = freedThisYear * 12;
      const yearsOfGrowthRemaining = yearsToRetirement - year;
      futureValueOfFreedCashFlow += annualLumpSum * Math.pow(1 + portfolioReturn, yearsOfGrowthRemaining);
    }
  }

  const gap = targetCorpus - futureValueOfCurrentCorpus - futureValueOfFreedCashFlow;

  if (gap <= 0) {
    // Already on track from current corpus growth (and, if applicable,
    // freed debt cash flow) alone — report the surplus explicitly rather
    // than a bare zero, so "just barely covered" and "wildly overshooting"
    // are distinguishable in the output.
    return { requiredMonthlySavings: 0, surplusAtRetirement: -gap };
  }

  // Standard future-value-of-annuity, solved for payment.
  const annuityFactor = (Math.pow(1 + monthlyReturn, monthsToRetirement) - 1) / monthlyReturn;
  return { requiredMonthlySavings: gap / annuityFactor, surplusAtRetirement: 0 };
}