# Policy & Capability Matrix

## Overview
SyncVista operates under three product capability tiers. The Intelligence Layer must enforce strict boundaries on what data is analyzed and what recommendations are surfaced based on the active tier.

## Capability Matrix

| Capability | PRIVATE / S | B2B (Advisory) | B2C (Retail) | Deterministic Engine | LLM Assisted | Consent Required |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Financial Health Score** | ✅ Full | ✅ Full | ✅ Full | Yes | Yes (Explain) | AA Consent |
| **Cash-flow & Anomalies** | ✅ Full | ✅ Full | ✅ Full | Yes | Yes (Explain) | AA Consent |
| **Debt Optimization** | ✅ Full | ✅ Full | ✅ Full | Yes | Yes (Explain) | AA Consent |
| **FIRE Horizon Simulation** | ✅ Full | ✅ Full | ✅ Full | Yes | Yes (Scenario) | AA Consent |
| **General Tax Analysis** | ✅ Full | ✅ Full | ✅ Full | Yes | Yes (Explain) | AA Consent / CAS |
| **Asset Allocation (Broad)** | ✅ Full | ✅ Full | ✅ Full | Yes | No | CAS |
| **Specific Stock Recommendations** | ✅ Full | ✅ Allowed (RIA) | ❌ **BLOCKED** | Yes | No | Explicit Opt-in |
| **Direct Portfolio Rebalancing** | ✅ Full | ✅ Allowed (RIA) | ❌ **BLOCKED** | Yes | No | Explicit Opt-in |
| **Automated Trade Execution** | ✅ Full | ❌ Blocked | ❌ **BLOCKED** | Yes | No | Execution Auth |

## Policy Enforcement Architecture

The Policy Gate sits between the `Recommendation Engine` and the `Explanation Engine (LLM)`.

1. **Engine Layer:** Detects all possible opportunities, including specific fund switches (e.g., "Switch HDFC Top 100 to Nifty Index").
2. **Policy Middleware:** Checks user's tier. 
   - If `B2C`: Strips out the specific instrument names. Converts to generic advice: "Consider shifting high-cost active funds to index funds."
   - If `PRIVATE / S`: Passes the exact instrument names through.
3. **LLM Layer:** Receives the *filtered* recommendation and explains it.

*Result:* The LLM physically cannot leak B2B/Private specific advice to a B2C user because it never receives that data from the tools.
