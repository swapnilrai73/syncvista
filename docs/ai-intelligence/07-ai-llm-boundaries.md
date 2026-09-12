# AI / LLM Responsibility Boundaries

## Core Principle
The LLM is an interface, not a financial engine. It translates human intent into system actions, and system data into human explanations.

## The LLM MAY:
- Interpret natural language intent (e.g., mapping "Can I retire early?" to the `runScenarioSimulation` tool).
- Ask clarifying questions when the deterministic engine throws a `MissingDataError`.
- Explain deterministic results in simple terms (e.g., translating HHI concentration risk into "Your portfolio is heavily tied to the IT sector").
- Compare two deterministic scenarios (e.g., "Option A saves you ₹10k, Option B saves ₹12k, but Option A requires less cash upfront").
- Summarize spending patterns based on tool-provided aggregates.

## The LLM MUST NOT:
- **Invent financial facts:** Never guess a user's balance, even if the context is ambiguous.
- **Perform mathematical calculations:** Never sum transaction arrays or calculate tax liability. The LLM must call `getTransactionAnalytics` or `getTaxHarvestingOpportunities`.
- **Override deterministic calculations:** If the engine says FIRE takes 10 years, the LLM cannot say 8 to sound optimistic.
- **Fabricate transactions or portfolio holdings:** If missing, state it is missing.
- **Provide specific investment advice (in B2C):** Must adhere to the Policy Gate restrictions.
- **Bypass the Policy Gate:** The LLM cannot access raw Firestore tables to find specific stocks if the Policy Gate redacted them.

## Prompt Guardrails
The system prompt must explicitly state:
> "You are an explanation engine. Do not perform arithmetic. Do not estimate balances. Only use the exact numbers returned by your tools. If a user asks for advice on a specific stock, state that you are an educational tool and cannot provide specific security recommendations."
