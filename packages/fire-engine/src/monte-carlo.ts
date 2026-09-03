// ─────────────────────────────────────────────────────────────────────────
// Monte Carlo retirement survival simulation.
//
// Given a target corpus and withdrawal rate, runs N simulated retirement
// paths with randomly sampled annual returns (drawn from a normal
// distribution around the portfolio's expected return/volatility) and
// checks how many paths survive the full post-retirement horizon without
// running out of money. This is what captures sequence-of-returns risk —
// a single expected-value calculation can't.
// ─────────────────────────────────────────────────────────────────────────

import type { FireEngineInput, MonteCarloResult } from "./types";
import { estimatePortfolioReturn, estimatePortfolioVolatility } from "./market-assumptions";

/** Box-Muller transform — standard method for sampling a normal distribution from uniform randoms. */
function sampleNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z0;
}

function runSinglePath(
  startingBalance: number,
  annualWithdrawal: number,
  horizonYears: number,
  expectedReturn: number,
  volatility: number
): number {
  let balance = startingBalance;

  for (let year = 0; year < horizonYears; year++) {
    const yearReturn = sampleNormal(expectedReturn, volatility);
    balance = balance * (1 + yearReturn) - annualWithdrawal;
    if (balance <= 0) return 0;
  }

  return balance;
}

export function runMonteCarloSimulation(
  input: FireEngineInput,
  targetCorpus: number
): MonteCarloResult {
  const runs = input.assumptions.monteCarloRuns;
  const horizonYears = input.assumptions.postRetirementHorizonYears;
  const annualWithdrawal = targetCorpus * input.assumptions.withdrawalRate;

  const expectedReturn = estimatePortfolioReturn(input.portfolio.allocation);
  const volatility = estimatePortfolioVolatility(input.portfolio.allocation);

  let survivalCount = 0;
  const endingBalances: number[] = [];

  for (let i = 0; i < runs; i++) {
    const endingBalance = runSinglePath(
      targetCorpus,
      annualWithdrawal,
      horizonYears,
      expectedReturn,
      volatility
    );
    if (endingBalance > 0) survivalCount++;
    endingBalances.push(endingBalance);
  }

  endingBalances.sort((a, b) => a - b);
  const percentile = (p: number) => endingBalances[Math.floor(p * (endingBalances.length - 1))];

  return {
    survivalProbability: survivalCount / runs,
    runsCompleted: runs,
    percentileOutcomes: {
      p10: percentile(0.1),
      p50: percentile(0.5),
      p90: percentile(0.9),
    },
  };
}