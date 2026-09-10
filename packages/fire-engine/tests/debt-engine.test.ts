import { describe, it, expect } from "./test-utils";
import { runDebtClearanceEngine, compareDebtStrategies } from "../src/debt-engine";
import type { DebtClearanceInput } from "../src/types";

describe("Debt Clearance Engine (Module D)", () => {
  const sampleInput: DebtClearanceInput = {
    loans: [
      {
        id: "loan-personal",
        label: "Personal Loan",
        type: "personal",
        outstandingBalance: 300000, // ₹3 Lakhs
        annualInterestRate: 0.14,    // 14%
        monthlyEMI: 15000,
      },
      {
        id: "loan-home",
        label: "Home Loan",
        type: "home",
        outstandingBalance: 4000000, // ₹40 Lakhs
        annualInterestRate: 0.085,   // 8.5%
        monthlyEMI: 40000,
        section24bEligible: true,
      },
      {
        id: "loan-car",
        label: "Car Loan",
        type: "car",
        outstandingBalance: 500000,  // ₹5 Lakhs
        annualInterestRate: 0.095,   // 9.5%
        monthlyEMI: 12000,
      },
    ],
    extraMonthlyPayment: 10000,
    strategy: "avalanche",
    userMarginalTaxRate: 0.30,
    expectedPostTaxPortfolioReturn: 0.10,
  };

  it("avalanche targets highest interest rate first (personal -> car -> home)", () => {
    const output = runDebtClearanceEngine({ ...sampleInput, strategy: "avalanche" });

    expect(output.strategy).toBe("avalanche");
    expect(output.payoffOrder[0]).toBe("loan-personal"); // 14% first
    expect(output.payoffOrder[1]).toBe("loan-car");      // 9.5% second
    expect(output.payoffOrder[2]).toBe("loan-home");     // 8.5% last
  });

  it("snowball targets lowest outstanding balance first (personal -> car -> home)", () => {
    const output = runDebtClearanceEngine({ ...sampleInput, strategy: "snowball" });

    expect(output.strategy).toBe("snowball");
    expect(output.payoffOrder[0]).toBe("loan-personal"); // ₹3L smallest
    expect(output.payoffOrder[1]).toBe("loan-car");      // ₹5L second
    expect(output.payoffOrder[2]).toBe("loan-home");     // ₹40L largest
  });

  it("avalanche pays less or equal total interest than snowball", () => {
    const comparison = compareDebtStrategies(sampleInput);

    expect(comparison.avalanche.totalInterestPaid).toBeLessThanOrEqual(
      comparison.snowball.totalInterestPaid
    );
    expect(comparison.avalanche.monthsToDebtFree).toBeGreaterThan(0);
  });

  it("tracks freed monthly cash flow across years as loans clear", () => {
    const output = runDebtClearanceEngine(sampleInput);

    const initialTotalEmi = 15000 + 40000 + 12000; // 67,000
    expect(output.totalFreedMonthlyCashFlowByYear).toBeDefined();

    // After all loans are cleared, freed monthly cash flow equals initial total EMI
    const finalYear = Math.ceil(output.monthsToDebtFree / 12);
    expect(output.totalFreedMonthlyCashFlowByYear[finalYear]).toBe(initialTotalEmi);
  });

  it("correctly issues prepay-vs-invest recommendations with reasoning", () => {
    const output = runDebtClearanceEngine(sampleInput);

    expect(output.recommendation).toBeDefined();
    expect(output.recommendationReasoning).toContain("after-tax cost");
  });
});
