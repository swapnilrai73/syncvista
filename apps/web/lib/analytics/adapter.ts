import { 
  calculateFinancialHealth, 
  detectSubscriptions, 
  detectAnomalies, 
  calculateNetWorth, 
  calculateMonthlyCashFlow,
  FinancialHealthResult,
  SubscriptionDetection,
  AnomalyDetection,
  MonthlyCashFlow
} from "./engine";

export interface UnifiedAnalyticsResult {
  health: FinancialHealthResult;
  subscriptions: SubscriptionDetection[];
  anomalies: AnomalyDetection[];
  netWorth: number;
  cashFlow: MonthlyCashFlow[];
}

/**
 * Adapter mapping the canonical FinancialSnapshot directly into the 
 * Web Analytics Engine (engine.ts).
 */
export function runWebAnalytics(snapshot: FinancialSnapshot): UnifiedAnalyticsResult {
  return {
    health: calculateFinancialHealth(snapshot.transactions),
    subscriptions: detectSubscriptions(snapshot.transactions),
    anomalies: detectAnomalies(snapshot.transactions),
    netWorth: calculateNetWorth(snapshot.accounts, snapshot.investmentSummary, 0),
    cashFlow: calculateMonthlyCashFlow(snapshot.transactions),
  };
}
