// ─────────────────────────────────────────────────────────────────────────
// Module D — Debt-Clearance Engine (avalanche vs. snowball).
//
// Runs a full month-by-month amortization simulation for one strategy per
// call. index.ts calls this twice (once per strategy) for the standalone
// comparison report, and separately uses whichever strategy the caller
// specified in FireEngineInput.debtClearance.strategy to drive the actual
// corpus-math auto-feed (housing bucket + investable capacity).
// ─────────────────────────────────────────────────────────────────────────

import type { Loan, DebtClearanceInput, DebtClearanceOutput } from "./types";

const MAX_MONTHS = 40 * 12; // safety cap against runaway loops on bad input

function selectTarget(activeLoans: Loan[], strategy: "avalanche" | "snowball"): Loan {
  const sorted = [...activeLoans].sort((a, b) =>
    strategy === "avalanche"
      ? b.annualInterestRate - a.annualInterestRate
      : a.outstandingBalance - b.outstandingBalance
  );
  return sorted[0];
}

export function runDebtClearanceEngine(input: DebtClearanceInput): DebtClearanceOutput {
  const workingLoans = input.loans.map((l) => ({ ...l }));
  const originalTotalEmiAll = input.loans.reduce((sum, l) => sum + l.monthlyEMI, 0);

  const payoffOrder: string[] = [];
  const loanClearedMonth: Record<string, number> = {};
  const housingExpenseByYear: Record<number, number> = {};
  const totalFreedMonthlyCashFlowByYear: Record<number, number> = {};

  let totalInterestPaid = 0;
  let extraPool = input.extraMonthlyPayment;
  let month = 0;

  while (workingLoans.some((l) => l.outstandingBalance > 0) && month < MAX_MONTHS) {
    month++;
    const year = Math.ceil(month / 12);

    const active = workingLoans.filter((l) => l.outstandingBalance > 0);
    const target = selectTarget(active, input.strategy);

    for (const loan of active) {
      const monthlyRate = loan.annualInterestRate / 12;
      const interestThisMonth = loan.outstandingBalance * monthlyRate;
      const extra = loan.id === target.id ? extraPool : 0;

      let principalPaid = loan.monthlyEMI - interestThisMonth + extra;
      if (principalPaid > loan.outstandingBalance) principalPaid = loan.outstandingBalance;

      totalInterestPaid += interestThisMonth;
      const remaining = Math.max(0, loan.outstandingBalance - principalPaid);
      const justCleared = loan.outstandingBalance > 0 && remaining === 0;
      loan.outstandingBalance = remaining;

      if (justCleared) {
        payoffOrder.push(loan.id);
        loanClearedMonth[loan.id] = month;
        // Roll this loan's EMI into the pool accelerating the next target.
        extraPool += loan.monthlyEMI;
      }
    }

    const outstandingHomeEmi = workingLoans
      .filter((l) => l.outstandingBalance > 0 && l.type === "home")
      .reduce((sum, l) => sum + l.monthlyEMI, 0);
    const outstandingTotalEmi = workingLoans
      .filter((l) => l.outstandingBalance > 0)
      .reduce((sum, l) => sum + l.monthlyEMI, 0);

    // Last month of each year determines that year's figure — good enough
    // resolution for the annual corpus-calculation buckets that consume this.
    housingExpenseByYear[year] = outstandingHomeEmi;
    totalFreedMonthlyCashFlowByYear[year] = originalTotalEmiAll - outstandingTotalEmi;
  }

  const monthsToDebtFree = month;

  // Aggregate per-loan prepay-vs-invest decisions into the single overall
  // recommendation the established contract expects.
  const perLoanActions = input.loans.map((loan) => {
    const getsTaxBenefit =
      (loan.section24bEligible || loan.section80CEligible) === true;
    // section24b/80C benefits are old-regime-only by design of the fields
    // themselves (callers should only set them true under the old regime) —
    // no separate regime flag needed here since the caller already encodes it.
    const afterTaxLoanCost = loan.annualInterestRate * (getsTaxBenefit ? 1 - input.userMarginalTaxRate : 1);
    return afterTaxLoanCost > input.expectedPostTaxPortfolioReturn ? "prepay" : "invest";
  });

  const allPrepay = perLoanActions.every((a) => a === "prepay");
  const allInvest = perLoanActions.every((a) => a === "invest");
  const recommendation: DebtClearanceOutput["recommendation"] = allPrepay
    ? "prepay_aggressively"
    : allInvest
    ? "invest_surplus_instead"
    : "balanced";

  const reasoningParts = input.loans.map((loan, i) => {
    const getsTaxBenefit = (loan.section24bEligible || loan.section80CEligible) === true;
    const afterTaxLoanCost = loan.annualInterestRate * (getsTaxBenefit ? 1 - input.userMarginalTaxRate : 1);
    return `${loan.label}: after-tax cost ${(afterTaxLoanCost * 100).toFixed(1)}% vs expected after-tax return ${(input.expectedPostTaxPortfolioReturn * 100).toFixed(1)}% → ${perLoanActions[i]}`;
  });
  const recommendationReasoning = reasoningParts.join("; ");

  return {
    strategy: input.strategy,
    payoffOrder,
    loanClearedMonth,
    totalInterestPaid,
    monthsToDebtFree,
    recommendation,
    recommendationReasoning,
    housingExpenseByYear,
    totalFreedMonthlyCashFlowByYear,
  };
}

/** Runs both strategies for the standalone comparison report. */
export function compareDebtStrategies(input: DebtClearanceInput): {
  avalanche: DebtClearanceOutput;
  snowball: DebtClearanceOutput;
} {
  return {
    avalanche: runDebtClearanceEngine({ ...input, strategy: "avalanche" }),
    snowball: runDebtClearanceEngine({ ...input, strategy: "snowball" }),
  };
}