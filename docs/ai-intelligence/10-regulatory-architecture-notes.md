# Regulatory & Architecture Notes

## Overview
SyncVista operates in the Indian fintech context. Compliance is an architectural constraint, not just a legal one.

## Key Regulatory Frameworks

### 1. SEBI Investment Adviser (RIA) Regulations
- **Rule:** Only registered persons can provide "investment advice" (recommendations regarding specific securities).
- **Implication:** B2C tier CANNOT output "Buy HDFC Bank" or "Sell Reliance." It can only output "Consider increasing equity exposure based on your risk profile." 
- **Architecture:** Enforced by the `Policy Gate` redacting specific instrument names (`assetLabel`) for non-advisory tiers.

### 2. Account Aggregator (AA) Framework & DPDP Act
- **Rule:** Financial data obtained via AA must be used strictly for the consented purpose and cannot be indefinitely retained or used for unauthorized profiling.
- **Implication:** Users must explicitly consent to "AI Analysis" of their data.
- **Architecture:** The Intelligence Layer must check the consent state before processing data. If consent is revoked, local data must be purged, and recommendations disabled.

### 3. AI & Explainability (MeitY / SEBI Guidelines)
- **Rule:** Financial institutions using AI must ensure models are explainable, unbiased, and don't introduce systemic risk.
- **Implication:** Black-box LLM financial advice is unacceptable.
- **Architecture:** This validates the SyncVista approach: Deterministic engines make the decision; the LLM merely translates it. Every recommendation has a versioned calculation hash for auditability.

*Disclaimer: This document outlines architectural implications of regulations, not legal advice.*
