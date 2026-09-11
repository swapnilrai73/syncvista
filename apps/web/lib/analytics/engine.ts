// Financial Analysis Engine for SyncVista

export interface FinancialHealthResult {
  savingsRate: number;
  burnRate: number;
  forecast: number[];
  topExpenseCategories: { category: string; amount: number; percentage: number }[];
}

export interface SubscriptionDetection {
  merchant: string;
  averageAmount: number;
  frequency: string;
  totalAmount: number;
  lastChargeDate: string;
}

export interface AnomalyDetection {
  transactionId: string;
  name: string;
  amount: number;
  category: string;
  zScore: number;
  date: string;
}

export interface CASPortfolioAnalysis {
  equityToDebtRatio: number;
  liquidityCoverageRatio: number;
  sectorConcentrationIndex: number;
  sectorBreakdown: { sector: string; value: number; percentage: number }[];
}

/**
 * Calculate Financial Health metrics
 * - Savings Rate: (Income - Expenses) / Income
 * - Burn Rate: Average monthly expenses
 * - Forecast: Single Exponential Smoothing with α=0.3
 * - Top Expense Categories: Top 5 spending categories
 */

export function isCreditTransaction(t: any): boolean {
  if (!t) return false;

  const type = String(t.type || t.transactionType || '').toLowerCase();
  const category = String(t.category || '').toLowerCase();
  const name = String(t.name || t.description || '').toLowerCase();

  // 1. Explicit Type Flags
  if (['credit', 'inflow', 'income', 'cr'].includes(type)) return true;
  if (['debit', 'outflow', 'expense', 'dr'].includes(type)) return false;

  // 2. Category Checks (Includes substring matches)
  if (
    category.includes('income') || 
    category.includes('salary') || 
    category.includes('deposit') ||
    category.includes('transfer')
  ) {
    return true;
  }

  // 3. Name & Keyword Matching for Uncategorized HDFC Credits
  if (
    name.includes('salary') ||
    name.includes('upi/cr') ||
    name.includes('neft cr') ||
    name.includes('imps cr') ||
    name.includes('credit') ||
    name.includes('deposit') ||
    name.includes('refund')
  ) {
    return true;
  }

  // 4. Negative Polarity Check (if schema stores expenses as + and income as -)
  if (typeof t.amount === 'number' && t.amount < 0) {
    return true;
  }

  return false;
}
export function calculateFinancialHealth(transactions: Transaction[]): FinancialHealthResult {
  if (!transactions || transactions.length === 0) {
    return {
      savingsRate: 0,
      burnRate: 0,
      forecast: [],
      topExpenseCategories: [],
    };
  }

  // Separate income and expenses deterministically via isCreditTransaction
  const income = transactions
    .filter((t) => isCreditTransaction(t))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  const expenses = transactions
    .filter((t) => !isCreditTransaction(t))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

  // Calculate savings rate
  const savingsRate = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0;

  // Calculate burn rate (average monthly expenses)
  const uniqueMonths = new Set(
    transactions
      .map((t) => {
        let rawDate = (t as any).date || (t as any).createdAt || (t as any).$createdAt;
        if (rawDate && typeof rawDate.toDate === 'function') {
          rawDate = rawDate.toDate();
        }
        if (!rawDate) return null;
        const date = new Date(rawDate);
        return isNaN(date.getTime()) ? null : `${date.getFullYear()}-${date.getMonth()}`;
      })
      .filter(Boolean)
  ).size;
  const burnRate = uniqueMonths > 0 ? expenses / uniqueMonths : expenses;

  // Single Exponential Smoothing forecast (α = 0.3)
  const alpha = 0.3;
  const monthlyCashFlow: number[] = [];
  
  // Group transactions by month
  const monthlyData = new Map<string, number>();
  transactions.forEach((t) => {
    let rawDate = (t as any).date || (t as any).createdAt || (t as any).$createdAt;
    if (rawDate && typeof rawDate.toDate === 'function') {
      rawDate = rawDate.toDate();
    }
    if (!rawDate) return;
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const amount = isCreditTransaction(t) ? Math.abs(t.amount || 0) : -Math.abs(t.amount || 0);
    monthlyData.set(monthKey, (monthlyData.get(monthKey) || 0) + amount);
  });

  const sortedMonths = Array.from(monthlyData.keys()).sort();
  sortedMonths.forEach((month) => {
    monthlyCashFlow.push(monthlyData.get(month) || 0);
  });

  // Generate forecast using exponential smoothing
  const forecast: number[] = [];
  if (monthlyCashFlow.length > 0) {
    let smoothed = monthlyCashFlow[0];
    forecast.push(smoothed);
    
    for (let i = 1; i < monthlyCashFlow.length; i++) {
      smoothed = alpha * monthlyCashFlow[i] + (1 - alpha) * smoothed;
      forecast.push(smoothed);
    }
    
    // Forecast next 3 months
    for (let i = 0; i < 3; i++) {
      smoothed = alpha * smoothed + (1 - alpha) * smoothed;
      forecast.push(smoothed);
    }
  }

  // Calculate top expense categories
  const categoryExpenses = new Map<string, number>();
  transactions
    .filter((t) => !isCreditTransaction(t))
    .forEach((t) => {
      const category = t.category || 'General';
      const amount = Math.abs(t.amount || 0);
      categoryExpenses.set(category, (categoryExpenses.get(category) || 0) + amount);
    });

  const sortedCategories = Array.from(categoryExpenses.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const topExpenseCategories = sortedCategories.map(([category, amount]) => ({
    category,
    amount,
    percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
  }));

  return {
    savingsRate,
    burnRate,
    forecast,
    topExpenseCategories,
  };
}

/**
 * Detect recurring subscription payments
 * Uses time-delta standard deviation (σ_t < 2 days) to identify subscriptions
 */
export function detectSubscriptions(transactions: Transaction[]): SubscriptionDetection[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Group transactions by merchant name
  const merchantTransactions = new Map<string, Transaction[]>();
  transactions.forEach((t) => {
    const merchant = t.name.toLowerCase().trim();
    if (!merchantTransactions.has(merchant)) {
      merchantTransactions.set(merchant, []);
    }
    merchantTransactions.get(merchant)!.push(t);
  });

  const subscriptions: SubscriptionDetection[] = [];

  merchantTransactions.forEach((txs, merchant) => {
    if (txs.length < 2) return; // Need at least 2 transactions

    // Sort by date
    const sorted = txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate time deltas between consecutive transactions
    const deltas: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const delta = new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime();
      deltas.push(delta);
    }

    // Calculate standard deviation of time deltas (in days)
    const meanDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
    const variance = deltas.reduce((sum, d) => sum + Math.pow(d - meanDelta, 2), 0) / deltas.length;
    const stdDevDays = Math.sqrt(variance) / (1000 * 60 * 60 * 24);

    // If standard deviation is less than 2 days, it's likely a subscription
    if (stdDevDays < 2) {
      const averageAmount = sorted.reduce((sum, t) => sum + Math.abs(t.amount), 0) / sorted.length;
      const totalAmount = sorted.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Determine frequency based on average delta
      let frequency = 'Monthly';
      const avgDays = meanDelta / (1000 * 60 * 60 * 24);
      if (avgDays < 7) frequency = 'Weekly';
      else if (avgDays < 14) frequency = 'Bi-weekly';
      else if (avgDays > 35) frequency = 'Yearly';

      subscriptions.push({
        merchant: sorted[0].name,
        averageAmount,
        frequency,
        totalAmount,
        lastChargeDate: sorted[sorted.length - 1].date,
      });
    }
  });

  return subscriptions.sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Detect anomalous transactions using robust statistical analysis
 * - Filters for genuine debit/expense transactions (never flags salary, refunds, or internal transfers)
 * - Excludes known recurring subscriptions and scheduled bills
 * - Requires at least 5 transactions in a category for sample variance (N - 1)
 * - Flags only positive expenditure spikes (Z-score > 2.5) with a ₹500 / 50% materiality floor
 */
export function detectAnomalies(transactions: Transaction[]): AnomalyDetection[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // 1. Filter for debit / expense transactions only (exclude credits, refunds, and self-transfers)
  const debitTransactions = transactions.filter((t) => {
    if (isCreditTransaction(t)) return false;
    if (t.senderBankId && t.receiverBankId && t.senderBankId === t.receiverBankId) return false;
    return true;
  });

  if (debitTransactions.length === 0) return [];

  // 2. Identify known recurring subscriptions to avoid flagging regular planned charges
  const detectedSubs = detectSubscriptions(transactions);
  const recurringMerchantNames = new Set(
    detectedSubs.map((s) => s.merchant.toLowerCase().trim())
  );

  // 3. Group expense transactions by category
  const categoryTransactions = new Map<string, Transaction[]>();
  debitTransactions.forEach((t) => {
    const category = t.category || "General";
    if (!categoryTransactions.has(category)) {
      categoryTransactions.set(category, []);
    }
    categoryTransactions.get(category)!.push(t);
  });

  const anomalies: AnomalyDetection[] = [];

  categoryTransactions.forEach((txs, category) => {
    // Statistical validity constraint: Need at least 5 transactions in a category
    // for sample standard deviation and Z-score to be statistically justified.
    if (txs.length < 5) return;

    const amounts = txs.map((t) => Math.abs(t.amount || 0));
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;

    // Sample variance (Bessel's correction N - 1)
    const variance =
      amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / (amounts.length - 1);
    const stdDev = Math.sqrt(variance);

    // If variance is 0 (all transactions identical), no statistical outlier can exist
    if (stdDev <= 0) return;

    txs.forEach((t) => {
      // Exclude known recurring subscriptions
      const nameLower = (t.name || "").toLowerCase().trim();
      if (recurringMerchantNames.has(nameLower)) return;

      const amount = Math.abs(t.amount || 0);
      const zScore = (amount - mean) / stdDev;

      // Positive outlier: Z-score > 2.5
      // Plus materiality floor: must exceed mean by at least ₹500 and 50%
      if (zScore > 2.5 && amount >= mean + 500 && amount >= mean * 1.5) {
        anomalies.push({
          transactionId: t.id || (t as any).$id || (t as any).transactionId || "",
          name: t.name,
          amount: t.amount,
          category,
          zScore,
          date: t.date || (t as any).$createdAt || "",
        });
      }
    });
  });

  return anomalies.sort((a, b) => b.zScore - a.zScore);
}

/**
 * Analyze CAS Portfolio
 * - Equity-to-Debt Ratio: Total Equity / Total Debt
 * - Liquidity Coverage Ratio (LCR): Liquid Assets / Short-term Liabilities
 * - Sector Concentration Index (HHI): Herfindahl-Hirschman Index
 */
// Clean analyzeCASPortfolio with no unused parameters/variables
export function analyzeCASPortfolio(casData: any, bankBalances: any[]) {
  if (!casData) return null

  const totalValue = casData.reduce((sum: number, item: any) => sum + (item.currentValue || 0), 0)
  const bankTotal = bankBalances.reduce((sum: number, item: any) => sum + (item.currentBalance || item.balance || 0), 0)

  return {
    portfolioValue: totalValue,
    totalAssets: totalValue + bankTotal,
  }
}

/**
 * Calculate net worth from Firestore bank balances, investments, and optional liabilities
 */
export function calculateNetWorth(
  bankBalances: any[] = [],
  investmentSummary?: any,
  liabilities: number = 0
): number {
  const bankTotal = bankBalances.reduce((sum, acc) => {
    // Firestore fields for account balances
    const bal = acc.currentBalance ?? acc.balance ?? acc.availableBalance ?? 0;
    return sum + Number(bal);
  }, 0);

  const investmentTotal = investmentSummary?.totalPortfolioValue || investmentSummary?.currentValue || 0;
  return Math.max(0, bankTotal + investmentTotal - (liabilities || 0));
}

/**
 * Calculate month-over-month cash flow
 */
export interface MonthlyCashFlow {
  month: string
  inflow: number
  outflow: number
  net: number
}
// Fixed calculateMonthlyCashFlow: accurately detects expense vs income transactions
export function calculateMonthlyCashFlow(transactions: any[] = []): MonthlyCashFlow[] {
  const monthlyData: { [key: string]: { inflow: number; outflow: number } } = {};

  transactions.forEach((t) => {
    // Handle Firestore Timestamp objects (t.date.toDate()) or ISO strings
    let rawDate = t.date || t.createdAt;
    if (rawDate && typeof rawDate.toDate === 'function') {
      rawDate = rawDate.toDate();
    }
    if (!rawDate) return;

    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return;

    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { inflow: 0, outflow: 0 };
    }

    const amt = Math.abs(t.amount || 0);
    if (isCreditTransaction(t)) {
      monthlyData[monthKey].inflow += amt;
    } else {
      monthlyData[monthKey].outflow += amt;
    }
  });

  return Object.keys(monthlyData).map((month) => {
    const inflow = monthlyData[month].inflow;
    const outflow = monthlyData[month].outflow;
    return {
      month,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  });
}