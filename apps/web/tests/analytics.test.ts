import { describe, it, expect } from "./test-utils";
import {
  isCreditTransaction,
  calculateFinancialHealth,
  detectSubscriptions,
  detectAnomalies,
  calculateNetWorth,
  calculateMonthlyCashFlow,
  analyzeCASPortfolio,
} from "../lib/analytics/engine";

describe("Analytics Engine: Credit Transaction Detection (isCreditTransaction)", () => {
  it("identifies transactions by explicit credit/debit type strings", () => {
    expect(isCreditTransaction({ type: "credit" })).toBe(true);
    expect(isCreditTransaction({ type: "inflow" })).toBe(true);
    expect(isCreditTransaction({ type: "cr" })).toBe(true);
    expect(isCreditTransaction({ transactionType: "income" })).toBe(true);

    expect(isCreditTransaction({ type: "debit" })).toBe(false);
    expect(isCreditTransaction({ type: "outflow" })).toBe(false);
    expect(isCreditTransaction({ type: "expense" })).toBe(false);
    expect(isCreditTransaction({ type: "dr" })).toBe(false);
  });

  it("detects credit transactions by category heuristics", () => {
    expect(isCreditTransaction({ category: "Salary" })).toBe(true);
    expect(isCreditTransaction({ category: "Rental Income" })).toBe(true);
    expect(isCreditTransaction({ category: "Cash Deposit" })).toBe(true);
    expect(isCreditTransaction({ category: "Bank Transfer" })).toBe(true);

    expect(isCreditTransaction({ category: "Dining" })).toBe(false);
    expect(isCreditTransaction({ category: "Groceries" })).toBe(false);
  });

  it("identifies Indian banking narration keywords in description/name", () => {
    expect(isCreditTransaction({ name: "SALARY CREDITED FOR MARCH" })).toBe(true);
    expect(isCreditTransaction({ name: "UPI/CR/12345678/REFUND" })).toBe(true);
    expect(isCreditTransaction({ name: "NEFT CR-HDFC0001234-COMPANY" })).toBe(true);
    expect(isCreditTransaction({ name: "IMPS CR 987654" })).toBe(true);
    expect(isCreditTransaction({ name: "Swiggy Order Refund" })).toBe(true);

    expect(isCreditTransaction({ name: "Amazon India Marketplace" })).toBe(false);
    expect(isCreditTransaction({ name: "Uber Trip" })).toBe(false);
  });

  it("detects negative polarity numbers as credits", () => {
    expect(isCreditTransaction({ amount: -5000 })).toBe(true);
    expect(isCreditTransaction({ amount: 5000, type: "debit" })).toBe(false);
  });
});

describe("Analytics Engine: Financial Health Calculation", () => {
  it("returns zeros and empty arrays for empty transaction set", () => {
    const health = calculateFinancialHealth([]);
    expect(health.savingsRate).toBe(0);
    expect(health.burnRate).toBe(0);
    expect(health.forecast).toHaveLength(0);
    expect(health.topExpenseCategories).toHaveLength(0);
  });

  it("computes accurate savings rate, burn rate, and top expense categories", () => {
    const transactions: any[] = [
      // Income: 1,00,000 (positive credit)
      { id: "1", type: "credit", amount: 100000, date: "2026-03-01", category: "Salary", name: "Salary" },
      // Expenses: 40,000 total (negative debits)
      { id: "2", type: "debit", amount: -20000, date: "2026-03-05", category: "Rent", name: "House Rent" },
      { id: "3", type: "debit", amount: -10000, date: "2026-03-10", category: "Groceries", name: "Supermarket" },
      { id: "4", type: "debit", amount: -6000, date: "2026-03-15", category: "Utilities", name: "Electricity" },
      { id: "5", type: "debit", amount: -4000, date: "2026-03-20", category: "Dining", name: "Restaurants" },
    ];

    const health = calculateFinancialHealth(transactions);

    // Savings rate: (1,00,000 - 40,000) / 1,00,000 = 60%
    expect(health.savingsRate).toBe(60);

    // Burn rate: 40,000 over 1 unique month
    expect(health.burnRate).toBe(40000);

    // Top categories: Rent (50%), Groceries (25%), Utilities (15%), Dining (10%)
    expect(health.topExpenseCategories).toHaveLength(4);
    expect(health.topExpenseCategories[0].category).toBe("Rent");
    expect(health.topExpenseCategories[0].amount).toBe(20000);
    expect(health.topExpenseCategories[0].percentage).toBe(50);

    expect(health.topExpenseCategories[1].category).toBe("Groceries");
    expect(health.topExpenseCategories[1].amount).toBe(10000);
    expect(health.topExpenseCategories[1].percentage).toBe(25);

    // Forecast generated via Single Exponential Smoothing
    expect(health.forecast.length).toBeGreaterThan(0);
  });
});

describe("Analytics Engine: Subscription Detection", () => {
  it("detects monthly recurring subscriptions with low delta standard deviation", () => {
    // Netflix recurring on the 1st of every month
    const transactions: any[] = [
      { id: "s1", name: "Netflix", amount: 649, date: "2026-01-01T10:00:00Z" },
      { id: "s2", name: "Netflix", amount: 649, date: "2026-02-01T10:00:00Z" },
      { id: "s3", name: "Netflix", amount: 649, date: "2026-03-01T10:00:00Z" },
      { id: "s4", name: "Netflix", amount: 649, date: "2026-04-01T10:00:00Z" },
      // One-off irregular merchant
      { id: "o1", name: "Zara", amount: 4500, date: "2026-01-05T10:00:00Z" },
      { id: "o2", name: "Zara", amount: 2200, date: "2026-01-28T10:00:00Z" },
      { id: "o3", name: "Zara", amount: 8900, date: "2026-03-20T10:00:00Z" },
    ];

    const subscriptions = detectSubscriptions(transactions);
    expect(subscriptions.length).toBe(1);

    const sub = subscriptions[0];
    expect(sub.merchant).toBe("Netflix");
    expect(sub.averageAmount).toBe(649);
    expect(sub.frequency).toBe("Monthly");
    expect(sub.totalAmount).toBe(649 * 4);
  });

  it("handles empty or insufficient transactions safely", () => {
    expect(detectSubscriptions([])).toHaveLength(0);
    expect(detectSubscriptions([{ id: "1", name: "OnlyOne", amount: 100, date: "2026-01-01" }])).toHaveLength(0);
  });
});

describe("Analytics Engine: Anomaly Detection via Z-Scores", () => {
  it("flags transactions exceeding 2.5 standard deviations in categories with >=3 entries", () => {
    // By Samuelson's inequality, max Z-score for sample N is sqrt(N-1).
    // For Z > 2.5, we need N > 1 + 2.5^2 = 7.25 (i.e. N >= 8).
    // With 9 regular transactions (~₹500) and 1 outlier (₹25,000), Z is ~2.8 > 2.5.
    const transactions: any[] = [
      { id: "d1", category: "Dining", amount: 450, name: "Lunch", date: "2026-03-01" },
      { id: "d2", category: "Dining", amount: 500, name: "Dinner", date: "2026-03-03" },
      { id: "d3", category: "Dining", amount: 480, name: "Cafe", date: "2026-03-05" },
      { id: "d4", category: "Dining", amount: 520, name: "Snacks", date: "2026-03-07" },
      { id: "d5", category: "Dining", amount: 490, name: "Lunch", date: "2026-03-09" },
      { id: "d6", category: "Dining", amount: 510, name: "Dinner", date: "2026-03-11" },
      { id: "d7", category: "Dining", amount: 470, name: "Cafe", date: "2026-03-13" },
      { id: "d8", category: "Dining", amount: 530, name: "Dinner", date: "2026-03-15" },
      { id: "d9", category: "Dining", amount: 500, name: "Lunch", date: "2026-03-17" },
      // Massive outlier in Dining: ₹25,000
      { id: "d10", category: "Dining", amount: 25000, name: "Luxury Banquet", date: "2026-03-20" },
    ];

    const anomalies = detectAnomalies(transactions);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].transactionId).toBe("d10");
    expect(anomalies[0].amount).toBe(25000);
    expect(anomalies[0].zScore).toBeGreaterThan(2.5);
  });

  it("does not flag anomalies if category has fewer than 3 transactions", () => {
    const smallSampleTxs: any[] = [
      { id: "1", category: "Electronics", amount: 1000, name: "Cable", date: "2026-03-01" },
      { id: "2", category: "Electronics", amount: 95000, name: "MacBook", date: "2026-03-02" },
    ];
    const anomalies = detectAnomalies(smallSampleTxs);
    expect(anomalies).toHaveLength(0);
  });
});

describe("Analytics Engine: Net Worth & CAS Portfolio Analysis", () => {
  it("calculates net worth preserving legitimate ₹0 bank balances", () => {
    const bankBalances = [
      { id: "b1", currentBalance: 350000 },
      { id: "b2", currentBalance: 0 }, // Legitimate ₹0 balance
      { id: "b3", currentBalance: 150000 },
    ];
    const investmentSummary = { totalPortfolioValue: 1200000 };

    const netWorth = calculateNetWorth(bankBalances, investmentSummary);
    // 3,50,000 + 0 + 1,50,000 + 12,00,000 = 17,00,000
    expect(netWorth).toBe(1700000);
  });

  it("analyzeCASPortfolio aggregates holdings and combined assets", () => {
    const casData = [
      { isin: "INF1", currentValue: 500000 },
      { isin: "INF2", currentValue: 300000 },
    ];
    const bankBalances = [{ currentBalance: 200000 }];

    const result = analyzeCASPortfolio(casData, bankBalances);
    expect(result).not.toBe(null);
    expect(result!.portfolioValue).toBe(800000);
    expect(result!.totalAssets).toBe(1000000);
  });
});

describe("Analytics Engine: Monthly Cash Flow Grouping", () => {
  it("correctly partitions monthly inflow, outflow, and net cash flow", () => {
    const transactions: any[] = [
      // March 2026
      { type: "credit", amount: 80000, date: "2026-03-01T00:00:00Z" },
      { type: "debit", amount: 30000, date: "2026-03-10T00:00:00Z" },
      // April 2026
      { type: "credit", amount: 85000, date: "2026-04-01T00:00:00Z" },
      { type: "debit", amount: 45000, date: "2026-04-15T00:00:00Z" },
    ];

    const flows = calculateMonthlyCashFlow(transactions);
    expect(flows.length).toBe(2);

    const march = flows.find((f) => f.month.includes("Mar"));
    expect(march).toBeDefined();
    expect(march!.inflow).toBe(80000);
    expect(march!.outflow).toBe(30000);
    expect(march!.net).toBe(50000);

    const april = flows.find((f) => f.month.includes("Apr"));
    expect(april).toBeDefined();
    expect(april!.inflow).toBe(85000);
    expect(april!.outflow).toBe(45000);
    expect(april!.net).toBe(40000);
  });

  it("handles Firestore Timestamp objects with .toDate()", () => {
    const firestoreDateObj = {
      toDate: () => new Date("2026-05-15T10:00:00Z"),
    };
    const tx = [{ type: "credit", amount: 50000, date: firestoreDateObj }];

    const flows = calculateMonthlyCashFlow(tx);
    expect(flows.length).toBe(1);
    expect(flows[0].month).toContain("May");
    expect(flows[0].inflow).toBe(50000);
  });
});
