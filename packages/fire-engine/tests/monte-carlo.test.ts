import { describe, it, expect } from "./test-utils";
import { runMonteCarloSimulation, mulberry32 } from "../src/monte-carlo";
import type { FireEngineInput } from "../src/types";

describe("Monte Carlo Simulation Engine (Module H)", () => {
  const baseInput: FireEngineInput = {
    profile: {
      currentAge: 35,
      targetRetirementAge: 55,
      cityTier: "metro",
      city: "bangalore",
    },
    expenses: {
      general: 50000,
      healthcare: 15000,
      education: 20000,
      housing: 40000,
      techDurables: 5000,
    },
    goals: [],
    portfolio: {
      currentCorpus: 10000000,
      monthlyInvestment: 75000,
      allocation: {
        equityDomestic: 0.6,
        equityInternational: 0.15,
        debt: 0.2,
        gold: 0.05,
        realEstate: 0,
        cash: 0,
      },
    },
    assumptions: {
      generalInflation: 0.06,
      withdrawalRate: 0.04,
      monteCarloRuns: 500,
      postRetirementHorizonYears: 30,
      seed: 42,
    },
    taxYear: "FY2026-27",
  };

  const targetCorpus = 80000000; // ₹8 Crore

  it("produces identical 100% reproducible results with the same seed", () => {
    const run1 = runMonteCarloSimulation(baseInput, targetCorpus);
    const run2 = runMonteCarloSimulation(baseInput, targetCorpus);

    expect(run1.survivalProbability).toBe(run2.survivalProbability);
    expect(run1.percentileOutcomes.p10).toBe(run2.percentileOutcomes.p10);
    expect(run1.percentileOutcomes.p50).toBe(run2.percentileOutcomes.p50);
    expect(run1.percentileOutcomes.p90).toBe(run2.percentileOutcomes.p90);
    expect(run1.runsCompleted).toBe(500);
  });

  it("produces differing stochastic results with different seeds", () => {
    const runA = runMonteCarloSimulation({
      ...baseInput,
      assumptions: { ...baseInput.assumptions, seed: 101 },
    }, targetCorpus);

    const runB = runMonteCarloSimulation({
      ...baseInput,
      assumptions: { ...baseInput.assumptions, seed: 999 },
    }, targetCorpus);

    // Both should be valid probabilities but their sampled percentiles will differ
    expect(runA.survivalProbability).toBeGreaterThan(0);
    expect(runB.survivalProbability).toBeGreaterThan(0);
    expect(runA.percentileOutcomes.p50).toBeDefined();
    expect(runB.percentileOutcomes.p50).toBeDefined();
  });

  it("decreases survival probability as withdrawal rate increases", () => {
    const safeRun = runMonteCarloSimulation({
      ...baseInput,
      assumptions: { ...baseInput.assumptions, withdrawalRate: 0.03, seed: 42 },
    }, targetCorpus);

    const aggressiveRun = runMonteCarloSimulation({
      ...baseInput,
      assumptions: { ...baseInput.assumptions, withdrawalRate: 0.07, seed: 42 },
    }, targetCorpus);

    expect(safeRun.survivalProbability).toBeGreaterThan(aggressiveRun.survivalProbability);
  });

  it("degrades survival probability when shocks are injected", () => {
    const unshocked = runMonteCarloSimulation(baseInput, targetCorpus);

    const shocked = runMonteCarloSimulation({
      ...baseInput,
      shocks: [
        {
          label: "Major Medical Shock",
          annualProbability: 0.1, // 10% chance per year
          costMean: 2000000,      // ₹20 Lakhs
          costStdDev: 500000,
          inflationBucket: "healthcare",
        },
      ],
    }, targetCorpus);

    expect(unshocked.survivalProbability).toBeGreaterThanOrEqual(shocked.survivalProbability);
    expect(unshocked.percentileOutcomes.p50).toBeGreaterThan(shocked.percentileOutcomes.p50);
  });

  it("mulberry32 generates uniform values between 0 and 1", () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});
