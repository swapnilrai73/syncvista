# SyncVista

**A personal finance platform for India, built around a from-scratch, India-specific FIRE (Financial Independence, Retire Early) and tax-planning engine — not a generic 25x-expenses calculator with Indian rupee signs bolted on.**

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

---

## What this actually is now

SyncVista started as a bank-account-aggregation dashboard. It's since been rebuilt around a much more specific bet: **India's financial life is too structurally different from the US/UK for a Western FIRE calculator to give honest answers** — sectoral inflation divergence (healthcare running 2x general CPI), a fragmented instrument landscape (EPF/PPF/NPS/SGB, each with its own government-set rate and lock-in), home-loan EMIs dominating household cash flow, and a regulatory environment that treats specific, personalized investment advice as a licensed activity, not a feature toggle.

The project is now split into two tracks, built in parallel:

1. **A conservative, self-directed consumer web app** — the current `apps/web`, positioned as an educational/analytical simulation tool, never issuing personalized "buy this, sell that" advice.
2. **A far more capable engine** (`packages/fire-engine`) that powers that conservative consumer experience *and* is designed to power a future B2B/advisor API and a fully unrestricted personal-use instance — one engine, three tiers of output specificity, gated by a real code boundary, not just a UI setting.

---

## Repository structure (pnpm + Turborepo monorepo)

```
syncvista/
├── apps/
│   └── web/                        # The Next.js 14 consumer app
│       ├── app/                    # App Router pages, layouts, API routes
│       ├── components/             # React components (shadcn/ui based)
│       ├── lib/actions/            # Server actions (auth, bank data, transactions, AI)
│       └── types/
├── packages/
│   └── fire-engine/                # The actual FIRE/tax engine — framework-agnostic, pure TS
│       └── src/
│           ├── types.ts            # Single source of truth for every module's input/output contract
│           ├── corpus.ts           # Deterministic bucketed-inflation corpus calculation
│           ├── monte-carlo.ts      # Retirement survival simulation, with shock injection
│           ├── debt-engine.ts      # Avalanche/snowball debt clearance, prepay-vs-invest logic
│           ├── safety-net.ts       # Liquidity bucketing, withdrawal ordering, protection score
│           ├── tax-harvest.ts      # LTCG/STCG harvest-opportunity analysis
│           ├── instrument-hub.ts   # Real EPF/PPF/NPS/SGB/FD-level return modeling
│           ├── city-cost-index.ts  # City-tier cost-of-living multipliers
│           ├── presenter.ts        # Tier-gating layer — the actual specificity boundary
│           └── tax-config/         # Versioned, annually-reviewed tax constants
├── pnpm-workspace.yaml
└── turbo.json
```

This restructure (flat Next.js app → monorepo) happened specifically so `packages/fire-engine` can be imported by both the consumer app *and* a future B2B API without duplicating a single line of financial math between them.

---

## The FIRE engine — what's actually built

Every module below has been implemented, type-checked (`tsc --strict`), and functionally verified with hand-calculated test scenarios before being committed — not just written and assumed correct.

| Module | What it does |
|---|---|
| **Core corpus calculation** | Bucketed sectoral inflation (healthcare, education, housing, general, tech each inflate at their own rate), goal milestones landing at specific years, a 25x terminal buffer |
| **Monte Carlo simulation** | Retirement survival probability across randomized return paths, with configurable probability-weighted shock events (medical emergencies, etc.) that measurably degrade survival probability rather than being a static warning |
| **Debt-Clearance Engine** | Full month-by-month amortization for both avalanche and snowball strategies, a mathematical prepay-vs-invest decision rule (after-tax loan cost vs. after-tax expected return), and automatic feed-through into the corpus calculation — a cleared EMI stops inflating and the freed cash flow increases investable capacity from that point forward |
| **Safety-Net Engine** | Splits the target corpus into immediate/medium/growth liquidity buckets, sequences withdrawals for tax efficiency (respecting that the Section 87A rebate does *not* apply to capital gains income), and computes a Net Worth Protection Score from insurance adequacy, liquidity months, and concentration risk |
| **Tax-Lot Harvesting** | Identifies harvestable losses (Section 70 set-off) and unrealized LTCG gains sitting within remaining Section 112A exemption headroom — correctly treats debt-fund holdings differently from equity, reflecting the 2023 reform that removed indexed long-term gains for most debt funds |
| **Multi-Instrument Asset Hub** | Replaces a generic "debt: 60%" allocation bucket with real EPF/PPF/NPS (including NPS's own internal equity/debt split)/SGB/FD-level modeling — this also fixed a real false-positive in concentration-risk scoring, where three genuinely distinct instruments were previously flagged as "concentrated" purely for sharing one macro-category |
| **City-Tier Cost Index** | Mumbai vs. Bangalore/Pune/Delhi-NCR vs. Bhopal-tier cost multipliers, sourced from 2026 cost-of-living comparisons rather than treating every "metro" as equally expensive |
| **Presenter/Tier-Gating Layer** | The actual code boundary between Base, Pro, and Supreme tiers — strips real fund/security names below Supreme tier, and structurally gates the (not-yet-built) spouse/HUF/joint-property structuring module to Supreme only |

**Not yet built:** the recommendation-generation logic that turns tax-harvest facts and portfolio data into an actual "sell Fund X, buy Fund Y" output — this is intentionally blocked on wiring in real fund/market data first (see below), rather than shipping placeholder-quality recommendations.

---

## Why three tiers, and why that's a code boundary, not a UI setting

Indian securities regulation treats specific, personalized investment recommendations as a licensed activity (SEBI Investment Adviser regulations), and recent enforcement (through 2025-2026) has explicitly rejected "educational purposes" framing as a shield when the underlying substance is personalized advice. So:

- **Base** (consumer web app): self-directed simulation only. No specific fund names, no "you should" language.
- **Pro** (planned B2B/SDK): richer output, structured as input for a *licensed advisor's* own professional review — not a finished recommendation auto-forwarded to their retail clients.
- **Supreme** (personal use only, never distributed to another user): full specificity, real fund names, prescriptive language — because there's no "client" involved, just an individual using software to analyze their own money.

The `presenter.ts` module and its `canAccessStructuringLayer()` gate are how this is enforced in code, verified by tests that prove a real fund name is stripped to a generic placeholder at Base/Pro and only surfaces at Supreme.

---

## Consumer app (`apps/web`) features

- Multi-bank aggregation via **Setu Account Aggregator** (with a mock-mode fallback for development)
- Transaction history with categorization and filtering
- Financial analytics dashboard (burn rate, liquidity runway, subscription-leakage detection, cash-flow trajectory, category risk breakdown)
- CAS (Consolidated Account Statement) upload for investment/mutual-fund data
- AI chat assistant (Cohere + Pinecone RAG) with per-user vector namespacing

**Removed:** the original payment-transfer feature was deliberately deleted — routing money between accounts pulls in NPCI/PPI licensing obligations that don't align with the platform's actual moat (the FIRE/tax engine), so the scope was cut rather than carried as dead weight.

---

## Security posture (as actually implemented, not aspirational)

- Session authentication uses **Firebase Admin-issued, cryptographically signed session cookies**, verified server-side on every request — replacing an earlier raw-UID cookie that was trivially forgeable
- Ownership checks on bank-account and transaction-history access, closing an IDOR path where one authenticated user could previously view another's financial data by ID
- The AI chat and CAS-parsing routes derive the active user from the verified session, not from a client-supplied field in the request body

This list reflects what's been built and tested in this codebase specifically — not a general security claim about the platform as a whole.

---

## Data sourcing — honest status, not a wishlist

| Source | Status |
|---|---|
| **AMFI direct NAV feed** | Confirmed solid for both personal and commercial use — real operating products in this exact space rely on it as their sole data source |
| **mfapi.in / mfdata.in** | Free community APIs; mfdata.in claims genuine portfolio-holdings and sector-allocation data beyond NAV — promising, not yet live-verified against its actual API responses |
| **NSE via community scrapers (nsepython etc.)** | NSE's own Terms of Use carve out "personal, non-commercial use" — plausible for the Supreme/personal instance, not for anything commercial |
| **Fyers API** | Explicitly prohibits using their data to build "charting/technical tools" — ruled out for the commercial recommendation engine |
| **Upstox API** | Commercial-use terms are ambiguous (even their own developer community asks this unanswered) — written confirmation from Upstox required before relying on it commercially |
| **EODHD** | Has a genuine commercial licensing path, but India-specific fundamentals depth is unverified — needs a live API test against a real NSE ticker |
| **RupeeVest** | A website/platform with genuinely useful monthly holdings-change data, but no documented public API — using it would mean scraping, which is a materially different risk than an open regulatory feed |

---

## Regulatory positioning

This platform is built to stay on the "educational, analytical, decision-support" side of India's investment-advisory regulations at the Base and Pro tiers — output is self-directed simulation, never a specific, personalized buy/sell instruction. This is an engineering and product design constraint informed by ongoing legal consultation, not a substitute for it — final regulatory sign-off is being sought before any tier that gives more specific output reaches actual users beyond the founder's personal use.

---

## Tech stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend/Backend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Auth & Data:** Firebase Admin (verified sessions), Cloud Firestore
- **Bank Aggregation:** Setu Account Aggregator API
- **AI:** Cohere (embeddings + chat), Pinecone (per-user namespaced vector search)
- **Planned:** Upstash Redis/QStash (caching, async job queueing), Neon Postgres (B2B partner/API-key/billing data — kept separate from Firestore since it's genuinely relational)

---

## Future scope

- Wire real fund/market data (AMFI holdings data, resolved equity data source) into the engine, then build the actual recommendation-generation logic on top of the now-proven presenter/gating boundary
- Full covariance-matrix-based portfolio volatility (current model uses a simplified weighted average that ignores cross-asset correlation)
- Client-side (WASM/Web Worker) CAS parsing, keeping tax-lot data off the server entirely for that module
- The Supreme-only tax-optimized structuring layer (spouse/HUF/joint-property modeling) — currently only a gated boundary in code, no computation implemented yet
- B2B API/SDK: Neon-backed partner accounts, API-key auth, usage metering, and a formal "advisor workflow tool" output contract distinct from the consumer app's presenter
- Full profession-based income-curve modeling (currently a simple categorical liquidity-buffer adjustment, not a real simulation)
- Real, sourced city-tier cost-of-living multipliers (current bands are researched estimates from 2026 cost-of-living aggregators, not an official index — none exists)
- Dynamic, government-notification-driven updates to the versioned tax-config layer instead of manual annual review
- Mobile app
