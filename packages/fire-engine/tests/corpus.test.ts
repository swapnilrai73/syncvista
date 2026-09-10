import { describe, it, expect } from "./test-utils";
import {
  calculateBucketedPresentValue,
  calculateTerminalBaseCorpus,
  calculateRequiredMonthlySavings,
  getBucketInflationRate,
} from "../src/corpus";
import { runFireEngine } from "../src/index";
import type { FireEngineInput } from "../src/types";

describe("Corpus Calculation Engine (Module A & B)", () => {
  const baseInput: FireEngineInput = {
    profile: {
      currentAge: 30,
      targetRetirementAge: 50,
      cityTier: "metro",
      city: "mumbai", // multiplier = 1.0
    },
    expenses: {
      general: 40000,
      healthcare: 10000,
      education: 15000,
      housing: 30000,
      techDurables: 5000,
    },
    goals: [],
    portfolio: {
      currentCorpus: 2500000, // ₹25 Lakhs
      monthlyInvestment: 50000,
      allocation: {
        equityDomestic: 0.6,
        equityInternational: 0.1,
        debt: 0.2,
        gold: 0.05,
        realEstate: 0,
        cash: 0.05,
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

  it("retrieves correct default and override inflation rates", () => {
    expect(getBucketInflationRate("healthcare")).toBe(0.12);
    expect(getBucketInflationRate("education")).toBe(0.1);
    expect(getBucketInflationRate("techDurables")).toBe(0.03);
    expect(getBucketInflationRate("general")).toBe(0.06);
    expect(getBucketInflationRate("general", 0.075)).toBe(0.075);
  });

  it("calculates terminal base corpus as 25x inflated general expense at retirement date", () => {
    const yearsToRetirement = baseInput.profile.targetRetirementAge - baseInput.profile.currentAge; // 20 years
    const terminalBase = calculateTerminalBaseCorpus(baseInput);

    const annualGeneralExpenseToday = baseInput.expenses.general * 12; // 480,000
    const expectedInflatedBase = annualGeneralExpenseToday * Math.pow(1 + 0.06, yearsToRetirement);
    const expectedTerminal = 25 * expectedInflatedBase;

    expect(terminalBase).toBeCloseTo(expectedTerminal, 0);
    expect(terminalBase).toBeGreaterThan(annualGeneralExpenseToday * 25);
  });

  it("calculates bucketed corpus across post-retirement horizon", () => {
    const result = calculateBucketedPresentValue(baseInput);

    expect(result.presentValue).toBeGreaterThan(0);
    expect(result.bucketedContribution.general).toBeGreaterThan(0);
    expect(result.bucketedContribution.healthcare).toBeGreaterThan(0);
    expect(result.bucketedContribution.education).toBeGreaterThan(0);
    expect(result.bucketedContribution.housing).toBeGreaterThan(0);
    expect(result.bucketedContribution.techDurables).toBeGreaterThan(0);

    const totalContribution = Object.values(result.bucketedContribution).reduce(
      (sum, val) => sum + val,
      0
    );
    expect(result.presentValue).toBeCloseTo(totalContribution, 2);
  });

  it("correctly models pre-retirement vs post-retirement goals", () => {
    const inputWithGoals: FireEngineInput = {
      ...baseInput,
      goals: [
        {
          label: "Child College (Pre-retirement)",
          yearFromNow: 10,
          amountToday: 1500000,
          inflationBucket: "education",
        },
        {
          label: "World Tour (In-retirement)",
          yearFromNow: 25,
          amountToday: 1000000,
          inflationBucket: "general",
        },
      ],
    };

    const withoutGoals = calculateBucketedPresentValue(baseInput);
    const withGoals = calculateBucketedPresentValue(inputWithGoals);

    expect(withGoals.presentValue).toBeGreaterThan(withoutGoals.presentValue);
    expect(withGoals.bucketedContribution.education).toBeGreaterThan(
      withoutGoals.bucketedContribution.education
    );
  });

  it("correctly resolves savings gap and required monthly savings with dimensional homogeneity", () => {
    const targetCorpus = 100000000; // ₹10 Crore needed at retirement
    const currentCorpus = 10000000; // ₹1 Crore today
    const yearsToRetirement = 20;
    const portfolioReturn = 0.10; // 10%

    const { requiredMonthlySavings, surplusAtRetirement } = calculateRequiredMonthlySavings(
      targetCorpus,
      currentCorpus,
      yearsToRetirement,
      portfolioReturn
    );

    expect(requiredMonthlySavings).toBeGreaterThan(0);
    expect(surplusAtRetirement).toBe(0);

    // Verify: Future value of current corpus + monthly SIP annuity = targetCorpus
    const months = yearsToRetirement * 12;
    const monthlyRate = portfolioReturn / 12;
    const fvCurrent = currentCorpus * Math.pow(1 + portfolioReturn, yearsToRetirement);
    const annuityFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    const fvSavings = requiredMonthlySavings * annuityFactor;

    expect(fvCurrent + fvSavings).toBeCloseTo(targetCorpus, 0);
  });

  it("reports surplusAtRetirement when current wealth growth exceeds target", () => {
    const targetCorpus = 30000000; // ₹3 Crore
    const currentCorpus = 20000000; // ₹2 Crore today
    const yearsToRetirement = 20;
    const portfolioReturn = 0.12; // 12%

    const { requiredMonthlySavings, surplusAtRetirement } = calculateRequiredMonthlySavings(
      targetCorpus,
      currentCorpus,
      yearsToRetirement,
      portfolioReturn
    );

    expect(requiredMonthlySavings).toBe(0);
    expect(surplusAtRetirement).toBeGreaterThan(0);
  });

  it("throws descriptive error when targetRetirementAge is <= currentAge", () => {
    expect(() => {
      calculateBucketedPresentValue({
        ...baseInput,
        profile: { ...baseInput.profile, currentAge: 55, targetRetirementAge: 50 },
      });
    }).toThrow("targetRetirementAge must be after currentAge");
  });

  it("runs full runFireEngine pipeline smoothly and returns targetCorpus >= terminalBaseCorpus", () => {
    const output = runFireEngine(baseInput);

    const terminalFloor = calculateTerminalBaseCorpus(baseInput);
    expect(output.targetCorpus).toBeGreaterThanOrEqual(terminalFloor);
    expect(output.yearsToRetirement).toBe(20);
    expect(output.projectedCorpusAtRetirement).toBeGreaterThan(0);
    expect(output.monteCarlo.survivalProbability).toBeGreaterThan(0);
    expect(output.liquidityBucketPlan.bucket1Immediate).toBeGreaterThan(0);
  });
});
