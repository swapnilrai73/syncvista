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

import type { FireEngineInput, MonteCarloResult, ShockEventConfig } from "./types";
import { resolvePortfolioReturn, resolvePortfolioVolatility } from "./instrument-hub";
import { getBucketInflationRate } from "./corpus";

/** Box-Muller transform using a seeded PRNG — standard method for sampling N(mean, stdDev). */
function sampleNormal(mean: number, stdDev: number, rng: () => number): number {
  const u1 = Math.max(1e-15, rng());
  const u2 = rng();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stdDev * z0;
}

/**
 * Mulberry32 — lightweight, high-performance 32-bit seeded pseudo-random number generator.
 * Produces uniform floats in [0, 1) to ensure 100% deterministic, reproducible Monte Carlo runs.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rolls each configured shock for one retirement year and returns the total
 * cost incurred (0 if none triggered). `yearsFromNow` is total elapsed time
 * from today — accumulation years plus however far into retirement this
 * simulated year is — since costMean is specified in today's rupees and
 * needs aging forward to the year it might actually occur.
 */
function rollShocksForYear(
  shocks: ShockEventConfig[] | undefined,
  yearsFromNow: number,
  generalInflationOverride: number | undefined,
  rng: () => number
): number {
  if (!shocks || shocks.length === 0) return 0;

  let totalShockCost = 0;
  for (const shock of shocks) {
    if (rng() >= shock.annualProbability) continue; // shock did not occur this year

    const inflationRate = getBucketInflationRate(shock.inflationBucket, generalInflationOverride);
    const inflatedMean = shock.costMean * Math.pow(1 + inflationRate, yearsFromNow);
    const inflatedStdDev = shock.costStdDev * Math.pow(1 + inflationRate, yearsFromNow);
    const sampledCost = Math.max(0, sampleNormal(inflatedMean, inflatedStdDev, rng));

    totalShockCost += sampledCost;
  }
  return totalShockCost;
}

function runSinglePath(
  startingBalance: number,
  initialAnnualWithdrawal: number,
  horizonYears: number,
  expectedReturn: number,
  volatility: number,
  yearsToRetirement: number,
  shocks: ShockEventConfig[] | undefined,
  generalInflation: number,
  rng: () => number
): number {
  let balance = startingBalance;

  for (let year = 0; year < horizonYears; year++) {
    const yearReturn = sampleNormal(expectedReturn, volatility, rng);
    const shockCost = rollShocksForYear(shocks, yearsToRetirement + year, generalInflation, rng);
    // Accurately compound general inflation on annual retirement withdrawals
    const currentWithdrawal = initialAnnualWithdrawal * Math.pow(1 + generalInflation, year);
    balance = balance * (1 + yearReturn) - currentWithdrawal - shockCost;
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
  const yearsToRetirement = input.profile.targetRetirementAge - input.profile.currentAge;
  const generalInflation = input.assumptions.generalInflation ?? 0.06;

  const expectedReturn = resolvePortfolioReturn(input.portfolio);
  const volatility = resolvePortfolioVolatility(input.portfolio);

  // Initialize deterministic PRNG (defaults to seed 42 if not provided)
  const seed = input.assumptions.seed ?? 42;
  const rng = mulberry32(seed);

  let survivalCount = 0;
  const endingBalances: number[] = [];

  for (let i = 0; i < runs; i++) {
    const endingBalance = runSinglePath(
      targetCorpus,
      annualWithdrawal,
      horizonYears,
      expectedReturn,
      volatility,
      yearsToRetirement,
      input.shocks,
      generalInflation,
      rng
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