# SyncVista Intelligence Layer (Step 2)

This directory contains the architectural specification and research audit for Phase 2 of SyncVista: The Intelligence Layer.

## Core Principle
**The LLM is an interface, not a calculator.** All financial truth, logic, and recommendations originate from deterministic engines. The AI explains, but never calculates.

## Documentation Index

1. [01 Current State Audit](01-current-state-audit.md) - Codebase review and current AI flaws.
2. [02 Intelligence Architecture](02-intelligence-architecture.md) - The multi-tier pipeline from Data to LLM.
3. [03 Recommendation Engine](03-recommendation-engine.md) - Deterministic scoring and opportunity detection.
4. [04 Tool Contracts](04-tool-contracts.md) - How the LLM interacts with the backend.
5. [05 Data Confidence](05-data-confidence.md) - Handling missing or stale data.
6. [06 Policy Capability Matrix](06-policy-capability-matrix.md) - B2C vs B2B vs Private boundaries.
7. [07 AI LLM Boundaries](07-ai-llm-boundaries.md) - What the LLM can and cannot do.
8. [08 RAG Knowledge Architecture](08-rag-knowledge-architecture.md) - Fixing the current Pinecone implementation.
9. [09 Security Threat Model](09-security-threat-model.md) - Prompt injection and isolation risks.
10. [10 Regulatory Architecture Notes](10-regulatory-architecture-notes.md) - SEBI and DPDP implications.
11. [11 Step 2 Implementation Plan](11-step-2-implementation-plan.md) - Execution sequence for Phase 2B.
