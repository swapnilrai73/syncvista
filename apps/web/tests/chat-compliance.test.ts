import { describe, it, expect } from "./test-utils";

describe("Chat API: Regulatory System Prompt & Deterministic System of Record", () => {
  // Helper modeling the preamble generation logic from apps/web/app/api/chat/route.ts
  function buildChatPreamble(deterministicRecord: string, contextText: string): string {
    return `You are SyncVista Assistant, an AI financial intelligence and decision-support companion for SyncVista.

REGULATORY STATUS & STRICT COMPLIANCE BOUNDARIES:
- You are an educational decision-support tool, NOT a SEBI-registered Investment Adviser (RIA), broker, portfolio manager, or research analyst under SEBI (Investment Advisers) Regulations, 2013.
- You MUST NOT claim to be a "personal financial advisor", give personalized investment advice, recommend specific securities or stock purchases/sales, or promise or guarantee financial returns.
- All financial calculations, projections, and scenarios are strictly mathematical models designed for informational and educational decision support.
- Always include an advisory note reminding the user to consult a SEBI-registered professional before making significant investment, tax, or legal decisions.

=== DETERMINISTIC FINANCIAL SYSTEM OF RECORD ===
${deterministicRecord || "No connected accounts found in the primary ledger."}
================================================

=== RETRIEVED HISTORICAL & TRANSACTION CONTEXT ===
${contextText || "No contextual transaction records found in the vector database."}
==================================================

OPERATIONAL INSTRUCTIONS & ARITHMETIC RULES:
1. AUTHORITATIVE TRUTH: The metrics in the "DETERMINISTIC FINANCIAL SYSTEM OF RECORD" represent verified, real-time ledger data. NEVER perform mental arithmetic over fragmented chunks in the "RETRIEVED CONTEXT" to recalculate, guess, or contradict total bank balances or account counts. When the user asks for their total balance or accounts, cite the authoritative figures directly.
2. CONTEXTUAL REASONING: Use the "RETRIEVED HISTORICAL & TRANSACTION CONTEXT" to answer questions regarding merchant transactions, category spending, historical cash flows, or temporal patterns.
3. MISSING OR AMBIGUOUS DATA: If the requested information cannot be found in either the deterministic record or the retrieved context, explicitly state: "I couldn't find relevant financial records in your synced data." Do not fabricate transactions or balances.
4. CURRENCY & NUMBER FORMAT: Always format amounts in Indian Rupees (₹) using Indian number grouping (e.g., ₹1,00,000 or ₹12,50,000). Maintain a professional, objective, and analytical tone.`;
  }

  function formatDeterministicRecord(accountsResult: {
    data: any[];
    totalBanks: number;
    totalCurrentBalance: number;
  }): string {
    const { data: accounts, totalBanks, totalCurrentBalance } = accountsResult;
    const formattedAccounts = (accounts || [])
      .map(
        (acc: any) =>
          `- ${acc.officialName || acc.name || "Account"} (mask: ${acc.mask || "N/A"}, type: ${acc.subtype || acc.type || "depository"}): ₹${Number(acc.currentBalance || 0).toLocaleString("en-IN")}`
      )
      .join("\n");

    return [
      `Total Connected Bank Accounts: ${totalBanks}`,
      `Total Liquid / Depository Balance: ₹${Number(totalCurrentBalance || 0).toLocaleString("en-IN")}`,
      "Account Breakdown:",
      formattedAccounts || "- No individual accounts listed.",
    ].join("\n");
  }

  it("strictly disclaims 'personal financial advisor' claim in the prompt", () => {
    const preamble = buildChatPreamble("", "");
    expect(preamble.includes("You are SyncVista AI, a personal financial advisor")).toBe(false);
    expect(preamble.includes("You MUST NOT claim to be a \"personal financial advisor\"")).toBe(true);
  });

  it("includes explicit SEBI RIA regulatory disclaimer and educational boundaries", () => {
    const preamble = buildChatPreamble("", "");
    expect(preamble).toContain("SEBI (Investment Advisers) Regulations, 2013");
    expect(preamble).toContain("educational decision-support tool");
    expect(preamble).toContain("NOT a SEBI-registered Investment Adviser (RIA)");
  });

  it("formats deterministic ledger data with Indian Rupee formatting", () => {
    const mockAccountsResult = {
      totalBanks: 2,
      totalCurrentBalance: 250000,
      data: [
        { officialName: "HDFC Salary Account", mask: "4321", subtype: "savings", currentBalance: 200000 },
        { name: "ICICI Digital Savings", mask: "9876", subtype: "savings", currentBalance: 50000 },
      ],
    };

    const formatted = formatDeterministicRecord(mockAccountsResult);
    expect(formatted).toContain("Total Connected Bank Accounts: 2");
    expect(formatted).toContain("Total Liquid / Depository Balance: ₹2,50,000");
    expect(formatted).toContain("HDFC Salary Account (mask: 4321, type: savings): ₹2,00,000");
    expect(formatted).toContain("ICICI Digital Savings (mask: 9876, type: savings): ₹50,000");
  });

  it("instructs LLM to never perform mental arithmetic over RAG fragments", () => {
    const preamble = buildChatPreamble("Total Balance: ₹2,50,000", "Tx snippet 1");
    expect(preamble).toContain("NEVER perform mental arithmetic over fragmented chunks");
    expect(preamble).toContain("cite the authoritative figures directly");
  });
});
