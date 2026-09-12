# Tool Call Architecture

## Overview
To prevent hallucination, the LLM must interact with SyncVista's deterministic engines via strict Tool Calling (Function Calling). The LLM will no longer receive unstructured transaction dumps in its context window for arithmetic tasks.

## Design Principles
1. **Typed Boundaries:** Every tool must have rigid Zod/TypeScript schemas for inputs and outputs.
2. **Explicit Errors:** If a tool lacks data (e.g., missing tax profile), it returns a structured error which the LLM translates to a clarifying question.
3. **No Raw Database Access:** The LLM cannot query Firebase/Firestore directly. It only calls bounded engine functions.
4. **Provenance Metadata:** Every tool response includes a `meta` block containing data freshness and confidence scores.

## Proposed Core Tools

### 1. `getFinancialHealthSnapshot`
*Purpose:* Replaces the need for the LLM to summarize raw accounts.
- **Input:** `{ userId: string, targetMonth?: string }`
- **Output:** `ProtectionScoreOutput` & `FinancialHealthResult` from `engine.ts`.
- **LLM Use:** "What is my current financial health?"

### 2. `runScenarioSimulation`
*Purpose:* Interfaces with `monte-carlo.ts` and `corpus.ts`.
- **Input:** `{ extraMonthlySavings?: number, customRetirementAge?: number, prepayDebtAmount?: number }`
- **Output:** Delta in `yearsToRetirement`, `targetCorpus`, and `survivalProbability`.
- **LLM Use:** "What happens if I invest ₹10,000 more every month?"

### 3. `getDebtOptimizationPlan`
*Purpose:* Interfaces with `debt-engine.ts`.
- **Input:** `{ surplusCash: number, strategyPreference?: "avalanche" | "snowball" }`
- **Output:** `DebtClearanceOutput` containing `monthsToDebtFree` and `totalInterestPaid`.
- **LLM Use:** "I have ₹50k extra this month, which loan should I pay?"

### 4. `getTaxHarvestingOpportunities`
*Purpose:* Interfaces with `tax-harvest.ts`.
- **Input:** `{ taxYear: string }`
- **Output:** `PresentedTaxHarvestOutput` (Tiers applied).
- **LLM Use:** "Can I save any tax on my investments this year?"

### 5. `getTransactionAnalytics`
*Purpose:* Replaces vector-search for computational queries.
- **Input:** `{ category?: string, dateRange: { start: string, end: string }, merchantName?: string }`
- **Output:** Aggregated totals, counts, and top 5 transactions. (Never raw row dumps unless strictly needed).
- **LLM Use:** "How much did I spend on Swiggy last month?"

## Tool Execution Flow
1. LLM decides it needs data.
2. LLM emits tool call.
3. Server executes deterministic function (e.g., `calculateMonthlyCashFlow`).
4. Server wraps result in context:
   ```json
   {
     "data": { "inflow": 120000, "outflow": 95000 },
     "meta": {
       "dataFreshness": "2026-09-10T00:00:00Z",
       "confidence": "HIGH",
       "calculationVersion": "v1.2"
     }
   }
   ```
5. LLM generates natural language response citing the deterministic result.
