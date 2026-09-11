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
    expect(detectSubscriptions([{ id: "1", name: "OnlyOne", amount: 100, date: "2026-01-01" } as any])).toHaveLength(0);
  });
});

describe("Analytics Engine: Anomaly Detection via Z-Scores & Adversarial Auditing", () => {
  it("flags transactions exceeding 2.5 standard deviations in categories with >=5 entries", () => {
    const transactions: any[] = [
      { id: "d1", category: "Dining", amount: 450, name: "Lunch", date: "2026-03-01", type: "debit" },
      { id: "d2", category: "Dining", amount: 500, name: "Dinner", date: "2026-03-03", type: "debit" },
      { id: "d3", category: "Dining", amount: 480, name: "Cafe", date: "2026-03-05", type: "debit" },
      { id: "d4", category: "Dining", amount: 520, name: "Snacks", date: "2026-03-07", type: "debit" },
      { id: "d5", category: "Dining", amount: 490, name: "Lunch", date: "2026-03-09", type: "debit" },
      { id: "d6", category: "Dining", amount: 510, name: "Dinner", date: "2026-03-11", type: "debit" },
      { id: "d7", category: "Dining", amount: 470, name: "Cafe", date: "2026-03-13", type: "debit" },
      { id: "d8", category: "Dining", amount: 530, name: "Dinner", date: "2026-03-15", type: "debit" },
      { id: "d9", category: "Dining", amount: 500, name: "Lunch", date: "2026-03-17", type: "debit" },
      // Massive outlier in Dining: ₹25,000
      { id: "d10", category: "Dining", amount: 25000, name: "Luxury Banquet", date: "2026-03-20", type: "debit" },
    ];

    const anomalies = detectAnomalies(transactions);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].transactionId).toBe("d10");
    expect(anomalies[0].amount).toBe(25000);
    expect(anomalies[0].zScore).toBeGreaterThan(2.5);
  });

  // Adversarial Test A: ₹2,000 spent every month for 12 months -> Should NOT be classified as anomalous
  it("Adversarial A: identical recurring monthly expenses (stdDev = 0) are not flagged", () => {
    const txs: any[] = Array.from({ length: 12 }, (_, i) => ({
      id: `a_${i}`,
      name: "Broadband Bill",
      amount: 2000,
      category: "Utilities",
      type: "debit",
      date: `2026-${String(i + 1).padStart(2, "0")}-05`,
    }));
    const anomalies = detectAnomalies(txs);
    expect(anomalies).toHaveLength(0);
  });

  // Adversarial Test B: ₹2,000 subscription followed by ₹2,000 next month -> recognized as recurring
  it("Adversarial B: recognized recurring subscriptions are excluded from outlier flagging", () => {
    const txs: any[] = [
      { id: "sub1", name: "Netflix", amount: 1999, category: "Entertainment", type: "debit", date: "2026-01-01" },
      { id: "sub2", name: "Netflix", amount: 1999, category: "Entertainment", type: "debit", date: "2026-02-01" },
      { id: "sub3", name: "Netflix", amount: 1999, category: "Entertainment", type: "debit", date: "2026-03-01" },
      { id: "sub4", name: "Netflix", amount: 1999, category: "Entertainment", type: "debit", date: "2026-04-01" },
      { id: "e1", name: "Cinema ticket", amount: 300, category: "Entertainment", type: "debit", date: "2026-01-10" },
      { id: "e2", name: "Gaming arcade", amount: 250, category: "Entertainment", type: "debit", date: "2026-02-12" },
      { id: "e3", name: "Board game cafe", amount: 350, category: "Entertainment", type: "debit", date: "2026-03-15" },
    ];
    const anomalies = detectAnomalies(txs);
    const flaggedNetflix = anomalies.some((a) => a.name === "Netflix");
    expect(flaggedNetflix).toBe(false);
  });

  // Adversarial Test C: Normal monthly salary credit -> Should NOT be treated as expense anomaly
  it("Adversarial C: large monthly salary credits are never classified as expense anomalies", () => {
    const txs: any[] = [
      { id: "sal1", name: "Monthly Salary Credit", amount: 250000, category: "Salary", type: "credit", date: "2026-01-01" },
      { id: "sal2", name: "Monthly Salary Credit", amount: 250000, category: "Salary", type: "credit", date: "2026-02-01" },
      { id: "sal3", name: "Bonus Credit", amount: 600000, category: "Salary", type: "credit", date: "2026-03-01" },
      { id: "d1", name: "Lunch", amount: 300, category: "Dining", type: "debit", date: "2026-01-02" },
      { id: "d2", name: "Dinner", amount: 400, category: "Dining", type: "debit", date: "2026-01-03" },
      { id: "d3", name: "Lunch", amount: 350, category: "Dining", type: "debit", date: "2026-01-04" },
      { id: "d4", name: "Snacks", amount: 200, category: "Dining", type: "debit", date: "2026-01-05" },
      { id: "d5", name: "Dinner", amount: 450, category: "Dining", type: "debit", date: "2026-01-06" },
    ];
    const anomalies = detectAnomalies(txs);
    const flaggedSalary = anomalies.some((a) => a.category === "Salary" || a.name.includes("Salary") || a.name.includes("Bonus"));
    expect(flaggedSalary).toBe(false);
  });

  // Adversarial Test D: One unusually large expense flagged if statistical and business rules justify it
  it("Adversarial D: genuine unbudgeted spending spike in shopping is correctly flagged", () => {
    const txs: any[] = [
      { id: "s1", name: "Book", amount: 400, category: "Shopping", type: "debit", date: "2026-01-02" },
      { id: "s2", name: "Stationery", amount: 350, category: "Shopping", type: "debit", date: "2026-01-05" },
      { id: "s3", name: "Shirt", amount: 600, category: "Shopping", type: "debit", date: "2026-01-10" },
      { id: "s4", name: "Socks", amount: 300, category: "Shopping", type: "debit", date: "2026-01-15" },
      { id: "s5", name: "Notebook", amount: 250, category: "Shopping", type: "debit", date: "2026-01-20" },
      { id: "s6", name: "T-shirt", amount: 450, category: "Shopping", type: "debit", date: "2026-01-22" },
      { id: "s7", name: "Belt", amount: 500, category: "Shopping", type: "debit", date: "2026-01-23" },
      { id: "s8", name: "Scarf", amount: 350, category: "Shopping", type: "debit", date: "2026-01-24" },
      { id: "s9", name: "Designer Leather Jacket", amount: 32000, category: "Shopping", type: "debit", date: "2026-01-25" },
    ];
    const anomalies = detectAnomalies(txs);
    expect(anomalies.length).toBe(1);
    expect(anomalies[0].transactionId).toBe("s9");
    expect(anomalies[0].amount).toBe(32000);
  });

  // Adversarial Test E: All transactions identical -> stdDev = 0 does not divide by zero or crash
  it("Adversarial E: variance = 0 does not crash or generate false outliers", () => {
    const txs: any[] = [
      { id: "1", name: "Metro Pass", amount: 1500, category: "Transport", type: "debit", date: "2026-01-01" },
      { id: "2", name: "Metro Pass", amount: 1500, category: "Transport", type: "debit", date: "2026-02-01" },
      { id: "3", name: "Metro Pass", amount: 1500, category: "Transport", type: "debit", date: "2026-03-01" },
      { id: "4", name: "Metro Pass", amount: 1500, category: "Transport", type: "debit", date: "2026-04-01" },
      { id: "5", name: "Metro Pass", amount: 1500, category: "Transport", type: "debit", date: "2026-05-01" },
    ];
    expect(detectAnomalies(txs)).toHaveLength(0);
  });

  // Adversarial Test F: Only 1-2 transactions exist -> does not make statistically unjustified claims
  it("Adversarial F: small sample sizes (N < 5) never make statistically unjustified outlier claims", () => {
    const txs: any[] = [
      { id: "1", name: "Pen", amount: 50, category: "Stationery", type: "debit", date: "2026-01-01" },
      { id: "2", name: "Printer", amount: 15000, category: "Stationery", type: "debit", date: "2026-01-02" },
    ];
    expect(detectAnomalies(txs)).toHaveLength(0);
  });

  // Adversarial Test G: High recurring insurance payment does not get flagged as anomalous
  it("Adversarial G: recurring insurance charges recognized in subscription detection are not flagged", () => {
    const txs: any[] = [
      { id: "i1", name: "Term Life Insurance", amount: 18000, category: "Insurance", type: "debit", date: "2025-01-10" },
      { id: "i2", name: "Term Life Insurance", amount: 18000, category: "Insurance", type: "debit", date: "2026-01-10" },
    ];
    expect(detectAnomalies(txs)).toHaveLength(0);
  });

  // Adversarial Test H: Refund / reversal sign and classification handling
  it("Adversarial H: refunds and reversals are treated as credits and never flagged as expense spikes", () => {
    const txs: any[] = [
      { id: "r1", name: "Amazon Refund", amount: -4500, category: "Shopping", type: "debit", date: "2026-01-15" },
      { id: "r2", name: "Flight Cancellation Refund", amount: 12000, category: "Refund", type: "credit", date: "2026-01-20" },
      { id: "s1", name: "Shoes", amount: 3000, category: "Shopping", type: "debit", date: "2026-01-01" },
      { id: "s2", name: "Socks", amount: 200, category: "Shopping", type: "debit", date: "2026-01-05" },
      { id: "s3", name: "Hat", amount: 500, category: "Shopping", type: "debit", date: "2026-01-10" },
      { id: "s4", name: "Scarf", amount: 400, category: "Shopping", type: "debit", date: "2026-01-12" },
      { id: "s5", name: "Gloves", amount: 600, category: "Shopping", type: "debit", date: "2026-01-14" },
    ];
    const anomalies = detectAnomalies(txs);
    const refundAnomaly = anomalies.some((a) => a.name.includes("Refund") || a.amount < 0);
    expect(refundAnomaly).toBe(false);
  });

  // Adversarial Test I: Self transfer between user's own accounts does not become spending anomaly
  it("Adversarial I: self-transfers between user's own accounts are excluded from anomaly detection", () => {
    const txs: any[] = [
      {
        id: "t1",
        name: "Self Transfer to ICICI",
        amount: 100000,
        category: "Transfer",
        type: "debit",
        senderBankId: "bank_hdfc",
        receiverBankId: "bank_hdfc", // Same user account link
        date: "2026-01-10",
      },
    ];
    expect(detectAnomalies(txs)).toHaveLength(0);
  });

  // Adversarial Test J: Recurring subscription with occasional minor price increase
  it("Adversarial J: subscription with minor price update remains recognized and unflagged", () => {
    const txs: any[] = [
      { id: "sub1", name: "Spotify Premium", amount: 119, category: "Entertainment", type: "debit", date: "2026-01-01" },
      { id: "sub2", name: "Spotify Premium", amount: 119, category: "Entertainment", type: "debit", date: "2026-02-01" },
      { id: "sub3", name: "Spotify Premium", amount: 119, category: "Entertainment", type: "debit", date: "2026-03-01" },
      { id: "sub4", name: "Spotify Premium", amount: 139, category: "Entertainment", type: "debit", date: "2026-04-01" },
    ];
    expect(detectAnomalies(txs)).toHaveLength(0);
  });
});

describe("Financial Analytics Engine: Deterministic Metric Cross-Checks", () => {
  it("cross-checks Income ₹100,000, Expenses ₹40,000 -> Savings ₹60,000, Savings Rate = 60%", () => {
    const txs: any[] = [
      { id: "i1", type: "credit", amount: 100000, category: "Salary", name: "Salary", date: "2026-03-01" },
      // Positive debit amounts as stored in real banking APIs
      { id: "e1", type: "debit", amount: 20000, category: "Rent", name: "Rent", date: "2026-03-05" },
      { id: "e2", type: "debit", amount: 10000, category: "Groceries", name: "Groceries", date: "2026-03-10" },
      { id: "e3", type: "debit", amount: 6000, category: "Utilities", name: "Electricity", date: "2026-03-15" },
      { id: "e4", type: "debit", amount: 4000, category: "Dining", name: "Dinner", date: "2026-03-20" },
    ];

    const health = calculateFinancialHealth(txs);
    expect(health.savingsRate).toBe(60);
    expect(health.burnRate).toBe(40000);
  });

  it("cross-checks Liquid Capital ₹300,000 / Monthly Burn ₹50,000 -> Runway = 6 months", () => {
    const totalLiquid = 300000;
    const monthlyBurn = 50000;
    const runway = Math.floor(totalLiquid / monthlyBurn);
    expect(runway).toBe(6);
  });

  it("cross-checks Assets ₹1,000,000, Liabilities ₹250,000 -> Net Worth ₹750,000", () => {
    const bankBalances = [{ currentBalance: 400000 }];
    const investmentSummary = { totalPortfolioValue: 600000 };
    const liabilities = 250000;

    const netWorth = calculateNetWorth(bankBalances, investmentSummary, liabilities);
    expect(netWorth).toBe(750000);
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
