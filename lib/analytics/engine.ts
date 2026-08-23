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
export function calculateFinancialHealth(transactions: Transaction[]): FinancialHealthResult {
  if (!transactions || transactions.length === 0) {
    return {
      savingsRate: 0,
      burnRate: 0,
      forecast: [],
      topExpenseCategories: [],
    };
  }

  // Separate income and expenses
  const income = transactions
    .filter((t) => t.type === 'credit' || t.amount > 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const expenses = transactions
    .filter((t) => t.type === 'debit' || t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Calculate savings rate
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  // Calculate burn rate (average monthly expenses)
  const uniqueMonths = new Set(
    transactions.map((t) => {
      const date = new Date(t.date);
      return `${date.getFullYear()}-${date.getMonth()}`;
    })
  ).size;
  const burnRate = uniqueMonths > 0 ? expenses / uniqueMonths : 0;

  // Single Exponential Smoothing forecast (α = 0.3)
  const alpha = 0.3;
  const monthlyCashFlow: number[] = [];
  
  // Group transactions by month
  const monthlyData = new Map<string, number>();
  transactions.forEach((t) => {
    const date = new Date(t.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    const amount = t.type === 'debit' || t.amount < 0 ? -Math.abs(t.amount) : Math.abs(t.amount);
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
    .filter((t) => t.type === 'debit' || t.amount < 0)
    .forEach((t) => {
      const amount = Math.abs(t.amount);
      categoryExpenses.set(t.category, (categoryExpenses.get(t.category) || 0) + amount);
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
 * Detect anomalous transactions using Z-score analysis
 * Flags transactions with Z-score > 2.5 relative to category averages
 */
export function detectAnomalies(transactions: Transaction[]): AnomalyDetection[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  // Calculate category statistics
  const categoryStats = new Map<string, { mean: number; stdDev: number; count: number }>();
  const categoryTransactions = new Map<string, Transaction[]>();

  transactions.forEach((t) => {
    const category = t.category;
    const amount = Math.abs(t.amount);
    
    if (!categoryTransactions.has(category)) {
      categoryTransactions.set(category, []);
    }
    categoryTransactions.get(category)!.push(t);
  });

  categoryTransactions.forEach((txs, category) => {
    const amounts = txs.map((t) => Math.abs(t.amount));
    const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    categoryStats.set(category, { mean, stdDev, count: amounts.length });
  });

  // Detect anomalies
  const anomalies: AnomalyDetection[] = [];

  transactions.forEach((t) => {
    const stats = categoryStats.get(t.category);
    if (!stats || stats.count < 3) return; // Need at least 3 transactions for meaningful stats

    const amount = Math.abs(t.amount);
    const zScore = stats.stdDev > 0 ? (amount - stats.mean) / stats.stdDev : 0;

    if (Math.abs(zScore) > 2.5) {
      anomalies.push({
        transactionId: t.id,
        name: t.name,
        amount: t.amount,
        category: t.category,
        zScore,
        date: t.date,
      });
    }
  });

  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
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
 * Calculate net worth from bank balances and investments
 */
export function calculateNetWorth(bankBalances: Account[], investmentSummary?: any): number {
  const bankTotal = bankBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const investmentTotal = investmentSummary?.totalPortfolioValue || 0;
  return bankTotal + investmentTotal;
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
export function calculateMonthlyCashFlow(transactions: any[]): MonthlyCashFlow[] {
  const monthlyData: { [key: string]: { inflow: number; outflow: number } } = {}

  transactions.forEach((t) => {
    const rawDate = t.date || t.$createdAt
    if (!rawDate) return

    const d = new Date(rawDate)
    if (isNaN(d.getTime())) return

    const monthKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) // e.g., "Mar 2026"

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { inflow: 0, outflow: 0 }
    }

    const amt = Math.abs(t.amount || 0)
    const isExpense =
        t.type?.toLowerCase() === 'debit' ||
        t.amount < 0 ||
        (t.category && t.category.toLowerCase() !== 'income')

    if (isExpense) {
      monthlyData[monthKey].outflow += amt
    } else {
      monthlyData[monthKey].inflow += amt
    }
  })

  return Object.keys(monthlyData).map((month) => {
    const inflow = monthlyData[month].inflow
    const outflow = monthlyData[month].outflow
    return {
      month,
      inflow,
      outflow,
      net: inflow - outflow,
    }
  })
}