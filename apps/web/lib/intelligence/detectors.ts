import { calculateMonthlyCashFlow } from "../analytics/engine";

/**
 * PHASE 9: DETERMINISTIC SCANNERS
 * These functions scan a canonical FinancialSnapshot and emit strict 
 * FinancialOpportunity contracts. NO LLM OR PROBABILISTIC LOGIC ALLOWED.
 */

export function detectOpportunities(snapshot: FinancialSnapshot): FinancialOpportunity[] {
  const opportunities: FinancialOpportunity[] = [];
  const now = new Date().toISOString();

  // 1. Calculate liquid bank balance
  const totalLiquidCash = snapshot.accounts
    .filter(a => a.type === "depository" || a.type === "bank")
    .reduce((sum, acc) => sum + (acc.availableBalance ?? acc.currentBalance ?? 0), 0);

  // 2. Calculate average monthly burn rate
  const cashFlows = calculateMonthlyCashFlow(snapshot.transactions);
  let averageMonthlyBurn = 0;
  if (cashFlows.length > 0) {
    const totalBurn = cashFlows.reduce((sum, cf) => sum + cf.outflow, 0);
    averageMonthlyBurn = totalBurn / cashFlows.length;
  }
  
  // Default to a safe assumed burn if no transaction history exists yet
  if (averageMonthlyBurn === 0) averageMonthlyBurn = 50000; 

  const targetEmergencyFund = averageMonthlyBurn * 6; // 6 months standard

  // DETECTOR 1: LOW EMERGENCY FUND
  if (totalLiquidCash < targetEmergencyFund) {
    const shortfall = targetEmergencyFund - totalLiquidCash;
    opportunities.push({
      id: `OPP-EMG-${snapshot.userId}-${Date.now()}`,
      type: "LOW_EMERGENCY_FUND",
      severity: totalLiquidCash < (averageMonthlyBurn * 2) ? "CRITICAL" : "HIGH",
      title: "Emergency Fund Shortfall",
      description: `Your liquid cash is ₹${shortfall.toLocaleString()} below the recommended 6-month safety net.`,
      detectedValue: shortfall,
      metadata: { currentLiquidCash: totalLiquidCash, target: targetEmergencyFund },
      createdAt: now,
    });
  }

  // DETECTOR 2: EXCESS IDLE CASH
  // If liquid cash exceeds 8 months of burn, it's losing value to inflation.
  const idleThreshold = averageMonthlyBurn * 8;
  if (totalLiquidCash > idleThreshold) {
    const excessCash = totalLiquidCash - idleThreshold;
    opportunities.push({
      id: `OPP-IDLE-${snapshot.userId}-${Date.now()}`,
      type: "EXCESS_IDLE_CASH",
      severity: excessCash > (averageMonthlyBurn * 6) ? "HIGH" : "MEDIUM",
      title: "Excess Idle Cash",
      description: `You have ₹${excessCash.toLocaleString()} sitting in low-yield accounts losing purchasing power to inflation.`,
      detectedValue: excessCash,
      metadata: { currentLiquidCash: totalLiquidCash, idleThreshold },
      createdAt: now,
    });
  }

  // DETECTOR 3: OUTSTANDING CREDIT BALANCE
  // Scanning for explicit credit card balances or known loans. We do not assume high interest
  // unless we have specific APR data or interest charge transactions.
  const creditAccounts = snapshot.accounts.filter(
    a => a.type === "credit" || a.subtype === "credit_card" || a.type === "loan "
  );
  
  let totalCreditDebt = 0;
  creditAccounts.forEach(acc => {
    // Current balance on a credit card/loan is debt
    const debt = Math.abs(acc.currentBalance ?? 0);
    if (debt > 0) {
      totalCreditDebt += debt;
      opportunities.push({
        id: `OPP-DEBT-${acc.id}-${Date.now()}`,
        type: "OUTSTANDING_CREDIT_BALANCE",
        severity: debt > averageMonthlyBurn ? "CRITICAL" : "HIGH",
        title: `Outstanding Balance on ${acc.name}`,
        description: `You are carrying a balance of ₹${debt.toLocaleString()} on this credit account.`,
        detectedValue: debt,
        metadata: { accountId: acc.id, accountName: acc.name },
        createdAt: now,
      });
    }
  });

  return opportunities;
}
