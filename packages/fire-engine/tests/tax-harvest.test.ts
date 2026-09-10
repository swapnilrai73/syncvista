import { describe, it, expect } from "./test-utils";
import { analyzeTaxHarvestOpportunities } from "../src/tax-harvest";
import { getTaxConfig } from "../src/tax-config/fy2026-27";
import type { TaxHarvestAnalysisInput } from "../src/types";

describe("Tax-Loss & Section 112A Harvesting Engine (Module G)", () => {
  const taxConfig = getTaxConfig("FY2026-27");
  const asOf = new Date("2026-09-08");

  it("verifies FY2026-27 statutory constants", () => {
    expect(taxConfig.ltcgEquityExemptionThreshold).toBe(125000); // ₹1.25 Lakhs per Budget 2024
    expect(taxConfig.ltcgEquityRate).toBe(0.125);                // 12.5%
    expect(taxConfig.stcgEquityRate).toBe(0.2);                  // 20%
    expect(taxConfig.section80CCD1BCap).toBe(50000);             // ₹50k NPS
  });

  it("classifies equity holding > 365 days as LTCG and <= 365 days as STCG", () => {
    const input: TaxHarvestAnalysisInput = {
      lots: [
        {
          assetLabel: "Nifty 50 Index Fund",
          purchaseDate: "2025-01-01", // ~615 days ago (> 365 days)
          costBasis: 500000,
          currentValue: 600000, // +100k LTCG
          isEquityOriented: true,
        },
        {
          assetLabel: "Midcap Active Fund",
          purchaseDate: "2026-06-01", // ~99 days ago (<= 365 days)
          costBasis: 300000,
          currentValue: 270000, // -30k STCG loss
          isEquityOriented: true,
        },
      ],
      taxYear: "FY2026-27",
      realizedGainsThisYear: { stcg: 0, ltcg: 0 },
    };

    const result = analyzeTaxHarvestOpportunities(input, taxConfig, asOf);

    expect(result.opportunities.length).toBe(2);

    const ltcgOpp = result.opportunities.find((o) => o.lot.assetLabel === "Nifty 50 Index Fund");
    expect(ltcgOpp?.gainType).toBe("LTCG");
    expect(ltcgOpp?.unrealizedGainOrLoss).toBe(100000);

    const stcgOpp = result.opportunities.find((o) => o.lot.assetLabel === "Midcap Active Fund");
    expect(stcgOpp?.gainType).toBe("STCG");
    expect(stcgOpp?.unrealizedGainOrLoss).toBe(-30000);
    expect(result.totalHarvestableLoss).toBe(30000);
  });

  it("classifies debt mutual funds as STCG regardless of holding period per 2023 reform", () => {
    const input: TaxHarvestAnalysisInput = {
      lots: [
        {
          assetLabel: "Corporate Bond Debt Fund",
          purchaseDate: "2023-05-01", // > 3 years ago
          costBasis: 400000,
          currentValue: 380000, // -20k loss
          isEquityOriented: false, // Debt fund
        },
      ],
      taxYear: "FY2026-27",
      realizedGainsThisYear: { stcg: 0, ltcg: 0 },
    };

    const result = analyzeTaxHarvestOpportunities(input, taxConfig, asOf);

    expect(result.opportunities[0].gainType).toBe("STCG");
    expect(result.totalHarvestableLoss).toBe(20000);
  });

  it("caps LTCG harvest opportunity at remaining Section 112A headroom", () => {
    const input: TaxHarvestAnalysisInput = {
      lots: [
        {
          assetLabel: "Flexi Cap Fund",
          purchaseDate: "2024-01-01",
          costBasis: 1000000,
          currentValue: 1200000, // +200k LTCG gain
          isEquityOriented: true,
        },
      ],
      taxYear: "FY2026-27",
      realizedGainsThisYear: { stcg: 0, ltcg: 50000 }, // 50k already realized
    };

    const result = analyzeTaxHarvestOpportunities(input, taxConfig, asOf);

    // Remaining headroom: 125,000 - 50,000 = 75,000
    expect(result.opportunities[0].unrealizedGainOrLoss).toBe(75000);
    expect(result.ltcgExemptionRemaining).toBe(0);
  });
});
