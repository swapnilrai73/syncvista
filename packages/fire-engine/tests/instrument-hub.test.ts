import { describe, it, expect } from "./test-utils";
import {
  INSTRUMENT_ASSUMPTIONS_2026,
  estimatePortfolioReturnFromInstruments,
  estimatePortfolioVolatilityFromInstruments,
  computeMaxInstrumentWeight,
  computeSafeInstrumentFraction,
  resolvePortfolioReturn,
} from "../src/instrument-hub";
import type { InstrumentPortfolio } from "../src/types";

describe("Multi-Instrument Indian Asset Hub (Module C)", () => {
  const samplePortfolio: InstrumentPortfolio = [
    { type: "epf", currentValue: 3000000 },           // ₹30L, 8.15%
    { type: "ppf", currentValue: 1500000 },           // ₹15L, 7.1%
    {
      type: "npsTier1",
      currentValue: 2000000,                         // ₹20L
      npsInternalAllocation: {
        equity: 0.75,                                // 75% equity (12%)
        corporateDebt: 0.15,                         // 15% corp debt (8%)
        governmentSecurities: 0.10,                  // 10% g-sec (7.5%)
      },
    },
    { type: "fixedDeposit", currentValue: 1000000 },  // ₹10L, 7%
    { type: "equityDomestic", currentValue: 7500000 },// ₹75L, 12%
  ];

  it("verifies Indian statutory instrument return assumptions", () => {
    expect(INSTRUMENT_ASSUMPTIONS_2026.epf.expectedNominalReturn).toBe(0.0815);
    expect(INSTRUMENT_ASSUMPTIONS_2026.ppf.expectedNominalReturn).toBe(0.071);
    expect(INSTRUMENT_ASSUMPTIONS_2026.ssy.expectedNominalReturn).toBe(0.082);
    expect(INSTRUMENT_ASSUMPTIONS_2026.fixedDeposit.expectedNominalReturn).toBe(0.07);
    expect(INSTRUMENT_ASSUMPTIONS_2026.sgbLegacy.expectedNominalReturn).toBe(0.105);
  });

  it("calculates weighted return with real instrument precision", () => {
    const total = 3000000 + 1500000 + 2000000 + 1000000 + 7500000; // ₹1.5 Crore
    const expReturn = estimatePortfolioReturnFromInstruments(samplePortfolio);

    expect(expReturn).toBeGreaterThan(0.08);
    expect(expReturn).toBeLessThan(0.12);
  });

  it("computes maximum single-instrument concentration weight correctly", () => {
    const total = 15000000; // 1.5 Cr
    const maxWeight = computeMaxInstrumentWeight(samplePortfolio);

    // Largest instrument is equityDomestic (75L / 150L = 0.50)
    expect(maxWeight).toBeCloseTo(0.50, 2);
  });

  it("computes safe instrument fraction correctly including NPS debt/g-sec", () => {
    const safeFraction = computeSafeInstrumentFraction(samplePortfolio);

    // EPF (30L) + PPF (15L) + FD (10L) + NPS safe portion (20L * (0.15 + 0.10) = 5L) = 60L / 150L = 0.40
    expect(safeFraction).toBeCloseTo(0.40, 2);
  });

  it("falls back to 6-bucket model when instruments array is empty", () => {
    const retFromBucket = resolvePortfolioReturn({
      allocation: {
        equityDomestic: 0.5,
        equityInternational: 0.1,
        debt: 0.3,
        gold: 0.05,
        realEstate: 0,
        cash: 0.05,
      },
      instruments: [],
    });

    expect(retFromBucket).toBeGreaterThan(0.08);
  });
});
