# Recommendation Engine Design

## Purpose
The Recommendation Engine takes raw opportunities detected by the deterministic engines and converts them into ranked, structured, actionable advice. The LLM does *not* generate these recommendations; it only formats and explains them.

## The Pipeline

1. **USER INTENT:** "I have ₹1,00,000 available. What should I do with it?"
2. **STRUCTURED INTENT:** LLM translates intent to a tool call: `generateRecommendations({ availableCash: 100000 })`
3. **DETERMINISTIC ANALYSIS:** System checks `calculateFinancialHealth` and `ProtectionScoreOutput`.
4. **OPPORTUNITY DETECTION:** Identifies missing emergency fund, high-interest debt, and remaining 80C limits.
5. **CANDIDATE ACTIONS:** Generates structured candidates.
6. **CONSTRAINT / POLICY CHECK:** Filters out actions barred by the user's tier (e.g., specific stock advice removed for B2C).
7. **SCORING / RANKING:** Deterministically ranks the candidates.
8. **EXPLANATION:** LLM explains the top-ranked candidates to the user.

## Candidate Recommendation Schema

A recommendation is a strict, versioned data structure.

```typescript
interface RecommendationCandidate {
  id: string; // e.g., "rec_tax_harvest_hdfc_2026"
  category: "debt_prepayment" | "liquidity_buffer" | "tax_harvesting" | "investment_allocation" | "subscription_cancellation";
  actionType: "execute" | "review" | "simulate";
  
  // Financial Metrics
  amountRecommended: number; // The exact INR amount
  expectedImpactINR?: number; // e.g., Tax saved, interest saved
  impactHorizonYears: number;
  
  // Confidence & Scoring
  priorityScore: number; // 0-100 deterministic rank
  dataConfidence: number; // 0-100 based on data completeness
  
  // Traceability & Explainability
  sourceEngine: "tax-engine" | "debt-engine" | "liquidity-engine";
  calculationVersion: string; // e.g., "v1.2.0"
  supportingEvidence: {
    metric: string;
    value: any;
  }[]; // e.g., [{ metric: "currentLiquidMonths", value: 1.2 }, { metric: "targetLiquidMonths", value: 6 }]
  
  // Constraints
  prerequisites: string[]; // e.g., ["Requires up-to-date CAS import"]
  policyScope: "B2C_SAFE" | "B2B_ADVISORY" | "PRIVATE_S";
}
```

## Deterministic Scoring Framework

Recommendations are ranked strictly via a deterministic algorithm, not LLM discretion.

**Scoring Factors:**
1. **Urgency / Risk Reduction (Weight: 40%):** 
   - Fixing a 0-month liquidity runway gets maximum score.
   - Prepaying a 24% credit card debt outranks investing in 12% equities.
2. **Expected Financial Impact (Weight: 30%):**
   - Absolute INR value of tax saved or interest avoided.
3. **Certainty (Weight: 20%):**
   - Tax harvesting a known holding is 100% certain.
   - Projecting a 12% equity return carries variance risk; scored lower than guaranteed debt reduction.
4. **Goal Alignment (Weight: 10%):**
   - Does this move the user closer to their target FIRE date?

**The LLM's Role in Ranking:**
The LLM is **FORBIDDEN** from arbitrarily re-ranking these recommendations. If the deterministic engine ranks Emergency Fund completion (Score 95) above Nifty 50 investment (Score 60), the LLM must present the Emergency Fund first. The LLM's only job is to weave the `supportingEvidence` into a conversational explanation.
