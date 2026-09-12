# Step 2 Implementation Plan

## Phase 2A: Audit & Specification
✅ Completed (You are reading the results).

## Phase 2B: Core Engine Refactoring
1. **Remove Computational RAG:** Delete `syncUserDataToVectorStore` logic in `rag.ts` that pushes transactions/balances to Pinecone.
2. **Standardize Engines:** Ensure `engine.ts` and `fire-engine` strictly export typed outputs (like `FinancialHealthResult`, `ProtectionScoreOutput`) without UI/Prompt side-effects.

## Phase 2C: Opportunity & Recommendation Layer
1. **Build `detectors.ts`:** Functions that consume State/Health and yield raw opportunities (e.g., `detectHighInterestDebt()`, `detectMissingEmergencyFund()`).
2. **Build `recommendation-engine.ts`:** Implement the deterministic scoring framework. Rank opportunities and output `RecommendationCandidate` objects.
3. **Build `policy-gate.ts`:** Implement the tier-based filter that redacts specific instrument names for B2C users.

## Phase 2D: Tool & AI Integration
1. **Define Tool Schemas:** Define Zod schemas for the tools (e.g., `getFinancialHealthSnapshot`).
2. **Wire Tools to LLM:** Update `api/chat/route.ts` to use a modern SDK (like Vercel AI SDK) that supports Tool Calling natively.
3. **Update System Prompt:** Enforce the "No Math, Use Tools" rule.

## Phase 2E: UI & Validation
1. **Build Recommendation UI:** Render the structured recommendations in the Financial Command Center.
2. **Test:** Validate that the LLM correctly explains recommendations without altering the deterministic amounts.
