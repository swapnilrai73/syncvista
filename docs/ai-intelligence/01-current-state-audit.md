# Current State Audit

## Overview
This document outlines the current state of SyncVista's financial engine and AI implementation based on a full repository audit. 

## Dependency Map

Currently, the architecture generally flows as follows:
**DATA** (Firebase/Appwrite + Setu AA via `bank.actions.ts` & `setu.actions.ts`)
→ **DOMAIN ENGINE** (`packages/fire-engine/src/*`, `apps/web/lib/analytics/engine.ts`)
→ **UI** (Web UI rendering deterministic metrics)

**Current AI Path:**
**DATA** → **RAG SYNC** (`rag.ts`) → **PINECONE** → **LLM** (`api/chat/route.ts`) → **UI** (Chatbot)

### Boundary Leaks & Architectural Flaws
1. **Chat Route is acting as an aggregator:** `api/chat/route.ts` currently fetches accounts via `getAccounts` and injects them directly into the Cohere preamble. This bypasses a formalized "Intelligence Layer."
2. **Context Stuffing:** The Vector Sync (`rag.ts`) converts critical deterministic state (total balances, net flows) into stringified sentences and stuffs them into Pinecone. This makes the LLM rely on text similarity rather than strict mathematical queries to answer questions about exact current balances.
3. **No Intermediate Recommendation Layer:** There is no "Financial Intelligence" or "Recommendation Engine" layer. The AI route jumps straight from "Raw Transactions/Accounts" to "Conversational Agent."
4. **Duplicate Analytics:** `engine.ts` calculates monthly cash flow, but `rag.ts` duplicates this logic (`monthlyIncome`, `monthlyExpenses`, `netMonthlyCashFlow`) before converting it to text.
5. **No Tool Calling:** The current LLM implementation (`command-r-08-2024` via Cohere) does not use tools. It reads a static preamble with deterministic context injected at request-time.

## Current Source of Truth

| Capability | Source of Truth | Current Implementation | Deterministic? |
| --- | --- | --- | --- |
| Net Worth | Deterministic | `calculateNetWorth` (`engine.ts`) | Yes |
| Cash Balance | Deterministic | `getAccounts` → Total Balance | Yes |
| Income / Expenses | Deterministic | `isCreditTransaction`, `calculateMonthlyCashFlow` | Yes |
| Savings Rate | Deterministic | `calculateFinancialHealth` (`engine.ts`) | Yes |
| Burn Rate | Deterministic | `calculateFinancialHealth` (`engine.ts`) | Yes |
| Anomalies | Deterministic | `detectAnomalies` (Z-score > 2.5) | Yes |
| Subscriptions | Deterministic | `detectSubscriptions` (std-dev < 2 days) | Yes |
| FIRE Target / Corpus | Deterministic | `packages/fire-engine` | Yes |
| Debt / Tax | Deterministic | `debt-engine.ts`, `tax-harvest.ts` | Yes |

*The LLM is currently NOT the source of truth for arithmetic, which is a good baseline, but it lacks structured access to these deterministic engines.*

## Current AI Implementation Gaps

- **Hallucination Risk:** The LLM is instructed not to guess balances, but since historical transactions are provided via RAG as unstructured text (`TRANSACTION: ...`), questions like "How much did I spend on food this year?" rely on the LLM's mental arithmetic over the retrieved context, which will inevitably fail or hallucinate.
- **RAG Misuse:** Vector databases (Pinecone) are being used for transactional lookup. A transaction database is inherently tabular/computational, not semantic. Vector searching "grocery expenses" might miss exact category matches in favor of semantically similar but irrelevant transactions.
- **Explainability:** Current output has no provenance. We cannot trace *why* the AI said something beyond looking at the raw prompt logs.

## Bugs / Risks Identified
1. **RAG Namespace:** `rag.ts` uses `process.env.PINECONE_INDEX_NAME!` and namespaces by `userId`. If `userId` is spoofed in the UI (since the chat payload takes it from `getLoggedInUser` safely, but RAG sync takes it from the client action payload), there could be cross-talk.
2. **Date Parsing:** In `engine.ts`, `t.createdAt` and `t.$createdAt` are used interchangeably, sometimes assuming Firestore `toDate()`, sometimes ISO strings. This could lead to NaN errors in cash flow aggregations if the schema drifts.
