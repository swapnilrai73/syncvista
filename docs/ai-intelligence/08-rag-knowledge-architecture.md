# Knowledge & RAG Architecture

## Overview
The current RAG implementation (`rag.ts`) stuffs transactional data into Pinecone. This is an architectural anti-pattern. Vector databases are excellent for semantic search, but terrible for exact aggregation or ledger math.

## Redefining RAG in SyncVista

We must separate data types:

### A. COMPUTATIONAL DATA (Transactions, Balances)
- **Current state:** Stored in Pinecone.
- **Target state:** REMOVED from Pinecone. Stored in Firebase/Postgres. Accessed strictly via SQL-like deterministic queries through Tool Calling.

### B. REGULATORY / TAX KNOWLEDGE (The True RAG)
- **Current state:** None.
- **Target state:** Pinecone should hold SEBI guidelines, Income Tax Act (Section 80C, 112A, 70), and tax slab data. 
- **Usage:** When a user asks "How does STCG work?", the LLM queries Pinecone for the exact legal text, ensuring its explanation is accurate to current Indian law.

### C. GENERAL FINANCIAL EDUCATION (Knowledge Base)
- **Current state:** None.
- **Target state:** Curated articles on FIRE, liquidity, and debt management indexed in Pinecone.
- **Usage:** Provides context for explaining concepts (e.g., "What is the avalanche method?").

## Required Changes to `rag.ts`
1. Stop syncing `transactions` and `banks` to Pinecone.
2. Stop calculating `monthlyIncome` in the RAG pipeline.
3. Repurpose the vector store purely for static, versioned knowledge documents (Tax Codes, Product Definitions, Educational Content).
