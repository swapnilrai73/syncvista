import { describe, it, expect } from "./test-utils";
import {
  computeLiquidityBucketPlan,
  planWithdrawal,
  calculateProtectionScore,
} from "../src/safety-net";
import type { WithdrawalPlanInput, ProtectionScoreInput } from "../src/types";

describe("Safety-Net & Protection Score Engine (Module F)", () => {
  it("splits target corpus into 3-year immediate, 7-year medium, and remainder growth buckets", () => {
    const annualWithdrawal = 2000000; // ₹20 Lakhs
    const targetCorpus = 60000000;    // ₹6 Crore

    const plan = computeLiquidityBucketPlan(annualWithdrawal, targetCorpus);

    // Bucket 1 = 3 years of withdrawal = 6,000,000
    expect(plan.bucket1Immediate).toBe(6000000);
    // Bucket 2 = 7 years of withdrawal = 14,000,000
    expect(plan.bucket2Medium).toBe(14000000);
    // Bucket 3 = remainder (60M - 20M) = 40,000,000
    expect(plan.bucket3Growth).toBe(40000000);
    expect(plan.bucket1Immediate + plan.bucket2Medium + plan.bucket3Growth).toBe(targetCorpus);
  });

  it("sequences withdrawals efficiently and nets mandatory NPS annuity first", () => {
    const input: WithdrawalPlanInput = {
      annualWithdrawalNeeded: 2500000, // ₹25 Lakhs
      npsAnnualIncome: 500000,         // ₹5 Lakhs mandatory NPS income
      ltcgExemptionRemainingThisYear: 125000,
      sources: [
        { sourceType: "taxExemptMaturity", availableBalance: 1000000 },
        { sourceType: "ltcgWithinExemption", availableBalance: 500000 },
        { sourceType: "ltcgAboveExemption", availableBalance: 2000000 },
        { sourceType: "debtOrStcg", availableBalance: 1000000 },
      ],
    };

    const output = planWithdrawal(input);

    expect(output.shortfall).toBe(0);
    // NPS annuity is drawn first: ₹500,000
    const npsAlloc = output.allocations.find((a) => a.sourceType === "npsAnnuity");
    expect(npsAlloc?.amountDrawn).toBe(500000);

    // Remaining need: 2,000,000
    // Drawn from taxExemptMaturity: 1,000,000
    const taxExempt = output.allocations.find((a) => a.sourceType === "taxExemptMaturity");
    expect(taxExempt?.amountDrawn).toBe(1000000);

    // Drawn from ltcgWithinExemption: capped at 125,000
    const ltcgExempt = output.allocations.find((a) => a.sourceType === "ltcgWithinExemption");
    expect(ltcgExempt?.amountDrawn).toBe(125000);
    expect(output.remainingLtcgExemption).toBe(0);
  });

  it("calculates Net Worth Protection Score and Human Life Value", () => {
    const input: ProtectionScoreInput = {
      annualIncome: 3000000,             // ₹30 Lakhs
      personalAnnualExpenses: 1200000,   // ₹12 Lakhs
      yearsToRetirement: 20,
      actualTermCoverAmount: 25000000,   // ₹2.5 Crore cover
      actualLiquidMonths: 6,
      targetLiquidMonths: 6,
      discountRateForHLV: 0.07,
      portfolio: {
        allocation: {
          equityDomestic: 0.5,
          equityInternational: 0.1,
          debt: 0.3,
          gold: 0.05,
          realEstate: 0,
          cash: 0.05,
        },
      },
    };

    const output = calculateProtectionScore(input);

    expect(output.score).toBeGreaterThan(50);
    expect(output.score).toBeLessThanOrEqual(100);
    expect(output.humanLifeValue).toBeGreaterThan(0);
    expect(output.liquidityMonthsNormalized).toBe(1); // 6 / 6 = 1.0
    expect(output.concentrationRisk).toBeDefined();
  });
});
