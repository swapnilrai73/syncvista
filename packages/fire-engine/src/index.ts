import type { FireEngineInput, FireEngineOutput } from "./types";
import {
  calculateBucketedPresentValue,
  calculateTerminalBaseCorpus,
  calculateRequiredMonthlySavings,
} from "./corpus";
import { runMonteCarloSimulation } from "./monte-carlo";
import { estimatePortfolioReturn } from "./market-assumptions";
import { getTaxConfig } from "./tax-config/fy2026-27";

export * from "./types";
export { getTaxConfig } from "./tax-config/fy2026-27";
export { MARKET_ASSUMPTIONS_2026 } from "./market-assumptions";

/**
 * The single entry point every tier calls. Base, Pro, and Supreme all
 * receive this exact same shape — the difference between tiers lives
 * entirely in the presenter/formatter layer that sits on top of this,
 * not in this function.
 */
export function runFireEngine(input: FireEngineInput): FireEngineOutput {
  // Validates the tax year is registered — throws loudly rather than
  // silently falling back, since a wrong tax year silently used is worse
  // than a crash that gets noticed immediately.
  getTaxConfig(input.taxYear);

  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  const warnings: string[] = [];

  const { presentValue: bucketedPresentValue, bucketedContribution } =
    calculateBucketedPresentValue(input);
  const terminalBaseCorpus = calculateTerminalBaseCorpus(input);

  const targetCorpus = bucketedPresentValue + terminalBaseCorpus;

  const portfolioReturn = estimatePortfolioReturn(input.portfolio.allocation);
  const { requiredMonthlySavings, surplusAtRetirement } = calculateRequiredMonthlySavings(
    targetCorpus,
    input.portfolio.currentCorpus,
    yearsToRetirement,
    portfolioReturn
  );

  const projectedCorpusAtRetirement =
    input.portfolio.currentCorpus * Math.pow(1 + portfolioReturn, yearsToRetirement) +
    // future value of a monthly SIP annuity at the CURRENT contribution rate
    (input.portfolio.monthlyInvestment *
      12 *
      (Math.pow(1 + portfolioReturn, yearsToRetirement) - 1)) /
      portfolioReturn;

  const monteCarlo = runMonteCarloSimulation(input, targetCorpus);

  if (monteCarlo.survivalProbability < 0.8) {
    warnings.push(
      `Monte Carlo survival probability is ${(monteCarlo.survivalProbability * 100).toFixed(0)}% — below the commonly-cited 80% comfort threshold. Consider a lower withdrawal rate or higher savings rate.`
    );
  }
  if (surplusAtRetirement > 0) {
    warnings.push(
      `Current corpus growth alone is already projected to exceed the target by ~₹${Math.round(surplusAtRetirement).toLocaleString("en-IN")} — no additional monthly savings required based on this model's assumptions.`
    );
  }
  if (input.portfolio.allocation.cash + input.portfolio.allocation.debt < 0.15 && yearsToRetirement < 5) {
    warnings.push(
      "Less than 15% in cash/debt with under 5 years to retirement — limited buffer against sequence-of-returns risk near the target date."
    );
  }

  return {
    targetCorpus,
    yearsToRetirement,
    requiredMonthlySavings,
    surplusAtRetirement,
    projectedCorpusAtRetirement,
    monteCarlo,
    bucketedContribution,
    warnings,
  };
}