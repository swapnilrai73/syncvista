import { describe, it, expect } from "./test-utils";
import {
  presentTaxHarvestOutput,
  presentFireOutput,
  canAccessStructuringLayer,
  getDisclaimer,
} from "../src/presenter";
import type { TaxHarvestAnalysisOutput, FireEngineOutput } from "../src/types";

describe("Presenter & Tier-Gating Layer", () => {
  const rawTaxOutput: TaxHarvestAnalysisOutput = {
    opportunities: [
      {
        lot: {
          assetLabel: "Parag Parikh Flexi Cap Fund",
          purchaseDate: "2024-01-01",
          costBasis: 500000,
          currentValue: 650000,
          isEquityOriented: true,
        },
        unrealizedGainOrLoss: 125000,
        gainType: "LTCG",
        applicableRule: "Section 112A annual exemption",
      },
    ],
    totalHarvestableLoss: 0,
    ltcgExemptionRemaining: 0,
  };

  const dummyFireOutput: FireEngineOutput = {
    targetCorpus: 50000000,
    yearsToRetirement: 15,
    requiredMonthlySavings: 45000,
    surplusAtRetirement: 0,
    projectedCorpusAtRetirement: 52000000,
    monteCarlo: {
      survivalProbability: 0.92,
      runsCompleted: 500,
      percentileOutcomes: { p10: 20000000, p50: 60000000, p90: 120000000 },
    },
    bucketedContribution: {
      general: 20000000,
      healthcare: 12000000,
      education: 8000000,
      housing: 8000000,
      techDurables: 2000000,
    },
    warnings: [],
    liquidityBucketPlan: {
      bucket1Immediate: 6000000,
      bucket2Medium: 14000000,
      bucket3Growth: 30000000,
    },
  };

  it("redacts real fund names to generic placeholders at Base tier", () => {
    const presented = presentTaxHarvestOutput(rawTaxOutput, "base");

    expect(presented.tier).toBe("base");
    expect(presented.opportunities[0].assetLabel).toBe("Holding #1 (equity-oriented)");
    expect(presented.opportunities[0].assetLabel).not.toContain("Parag Parikh");
    expect(presented.disclaimer).toContain("self-directed financial modeling");
  });

  it("redacts real fund names to generic placeholders at Pro tier and attaches advisor notice", () => {
    const presented = presentTaxHarvestOutput(rawTaxOutput, "pro");

    expect(presented.tier).toBe("pro");
    expect(presented.opportunities[0].assetLabel).toBe("Holding #1 (equity-oriented)");
    expect(presented.disclaimer).toContain("licensed advisor");
  });

  it("retains real fund names at Supreme (Private S) tier only", () => {
    const presented = presentTaxHarvestOutput(rawTaxOutput, "supreme");

    expect(presented.tier).toBe("supreme");
    expect(presented.opportunities[0].assetLabel).toBe("Parag Parikh Flexi Cap Fund");
    expect(presented.disclaimer).toContain("Personal-use analysis");
  });

  it("gates tax structuring layer (HUF/Spouse) to Supreme tier exclusively", () => {
    expect(canAccessStructuringLayer("base")).toBe(false);
    expect(canAccessStructuringLayer("pro")).toBe(false);
    expect(canAccessStructuringLayer("supreme")).toBe(true);
  });

  it("attaches tier disclaimers cleanly to presented FIRE output", () => {
    const presented = presentFireOutput(dummyFireOutput, "base");

    expect(presented.tier).toBe("base");
    expect(presented.disclaimer).toBe(getDisclaimer("base"));
    expect(presented.targetCorpus).toBe(dummyFireOutput.targetCorpus);
  });
});
