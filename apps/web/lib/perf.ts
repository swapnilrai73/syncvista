/**
 * SyncVista Performance Instrumentation Utility
 * Provides structured, low-overhead performance.mark() and performance.measure()
 * tracking for routes and key data operations across development and testing.
 */

const isClient = typeof window !== "undefined";
const isDev = process.env.NODE_ENV !== "production";

export function markStart(name: string): void {
  try {
    if (typeof performance !== "undefined" && performance.mark) {
      performance.mark(`${name}:start`);
    }
  } catch {
    // Ignore any measurement errors silently
  }
}

export function markEnd(name: string): number | null {
  try {
    if (typeof performance !== "undefined" && performance.mark && performance.measure) {
      performance.mark(`${name}:end`);
      try {
        const measure = performance.measure(name, `${name}:start`, `${name}:end`);
        const duration = measure?.duration ?? null;

        if (isDev && isClient) {
          console.log(`⏱️ [Perf] ${name}: ${duration ? duration.toFixed(1) : 0}ms`);
        }

        return duration;
      } catch {
        return null;
      }
    }
  } catch {
    // Ignore any measurement errors silently
  }
  return null;
}

export function getSyncVistaMeasures(): { name: string; duration: number }[] {
  try {
    if (typeof performance !== "undefined" && performance.getEntriesByType) {
      const entries = performance.getEntriesByType("measure");
      return entries
        .filter((e) => e.name.startsWith("SyncVista:"))
        .map((e) => ({
          name: e.name,
          duration: Math.round(e.duration * 10) / 10,
        }));
    }
  } catch {
    // Return empty array on error
  }
  return [];
}

/**
 * Standard Named Marks for SyncVista
 */
export const PERF_MARKS = {
  HOME_LOAD: "SyncVista:Home:load",
  MY_BANKS_LOAD: "SyncVista:MyBanks:load",
  FINANCIAL_INTEL_LOAD: "SyncVista:FinancialIntelligence:load",
  INVESTMENTS_LOAD: "SyncVista:Investments:load",
  CONNECT_BANK_LOAD: "SyncVista:ConnectBank:load",
  FIREBASE_ACCOUNTS: "SyncVista:Firebase:accounts",
  FIREBASE_TRANSACTIONS: "SyncVista:Firebase:transactions",
  ANALYTICS_HEALTH: "SyncVista:Analytics:financial-health",
  ANALYTICS_ANOMALIES: "SyncVista:Analytics:anomalies",
  ANALYTICS_CASHFLOW: "SyncVista:Analytics:cashflow",
  ANALYTICS_PORTFOLIO: "SyncVista:Analytics:portfolio",
} as const;
