# Data Confidence & Quality System

## Overview
A financial intelligence system cannot treat all data as equally reliable. The Recommendation Engine must factor in data freshness and completeness before making assertions. "I don't know" is a mathematically valid and safe state.

## Confidence Vectors

### 1. Data Completeness
- **Full Scope:** User has connected 3+ banks via Setu AA, uploaded CAS, and linked liabilities.
- **Partial Scope:** User has only connected 1 salary account. (Expenses might be under-reported).
- **Behavior:** If completeness is low, limit recommendations. Do not say "You spend ₹0 on dining." Say "Based on the 1 account connected, we see X. Connect other accounts for a full picture."

### 2. Data Freshness
- **Real-time:** Setu AA sync within last 24h.
- **Stale:** AA consent revoked, or last sync > 7 days ago.
- **Behavior:** Tool output metadata includes `dataFreshness`. If stale, LLM must preface insights with "Based on your data from last Tuesday..."

### 3. Calculation Confidence
- **High:** Deterministic logic on complete data (e.g., exact tax computation).
- **Medium:** Extrapolated data (e.g., predicting next month's burn rate based on only 2 months of history).
- **Behavior:** Engine attaches `confidenceScore: 0.0 - 1.0`. Recommendations below `0.6` are suppressed.

## Dealing with Missing Data
- **Never silently fill missing data.** 
- If salary cannot be identified, the system halts FIRE calculations and sets `missingInputs: ["salary"]`.
- The LLM's response should be: "To calculate your FIRE horizon, I need to know your monthly income. Would you like to enter it manually?"

## Provenance Tracking
Every tool response must carry:
```typescript
interface DataProvenance {
  lastSync: string;
  source: "AA" | "MANUAL" | "CAS" | "INFERRED";
  completenessFlag: "PARTIAL" | "FULL";
}
```
