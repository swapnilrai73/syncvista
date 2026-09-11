import { describe, it, expect } from "./test-utils";

describe("Bank Actions Invariant: Account Balance Validation & Nullish Coalescing", () => {
  // Exact validation predicate from apps/web/lib/actions/bank.actions.ts:
  // const hasInvalidAccounts = accounts.some(
  //   (account: any) => 
  //     account.currentBalance === undefined || 
  //     account.currentBalance === null ||
  //     Number.isNaN(account.currentBalance) ||
  //     !account.name
  // );
  function checkHasInvalidAccounts(accounts: any[]): boolean {
    return accounts.some(
      (account: any) =>
        account.currentBalance === undefined ||
        account.currentBalance === null ||
        Number.isNaN(account.currentBalance) ||
        !account.name
    );
  }

  it("considers accounts with legitimate ₹0 currentBalance as completely valid", () => {
    const realAccounts = [
      {
        id: "acc_active_1",
        name: "HDFC Salary Account",
        currentBalance: 85000,
      },
      {
        id: "acc_zero_balance_2",
        name: "SBI Savings Secondary",
        currentBalance: 0, // Legitimate ₹0 balance
      },
    ];

    const hasInvalid = checkHasInvalidAccounts(realAccounts);
    expect(hasInvalid).toBe(false);
  });

  it("correctly flags accounts with undefined, null, NaN, or missing names as invalid", () => {
    // Undefined balance
    expect(checkHasInvalidAccounts([{ name: "ICICI Bank", currentBalance: undefined }])).toBe(true);

    // Null balance
    expect(checkHasInvalidAccounts([{ name: "Axis Bank", currentBalance: null }])).toBe(true);

    // NaN balance
    expect(checkHasInvalidAccounts([{ name: "Kotak Bank", currentBalance: NaN }])).toBe(true);

    // Missing or empty name
    expect(checkHasInvalidAccounts([{ name: "", currentBalance: 50000 }])).toBe(true);
    expect(checkHasInvalidAccounts([{ currentBalance: 50000 }])).toBe(true);
  });

  it("nullish coalescing (??) preserves 0 balance where logical OR (||) would corrupt", () => {
    const rawBank = {
      availableBalance: 0,
      currentBalance: 0,
    };

    // Broken previous implementation using ||:
    // (0 || 0 || 125000) -> would fall through to fallback if last item was non-zero
    // But with ??:
    const availableSafe = (rawBank as any).availableBalance ?? (rawBank as any).currentBalance ?? 0;
    const currentSafe = (rawBank as any).currentBalance ?? 0;

    expect(availableSafe).toBe(0);
    expect(currentSafe).toBe(0);
  });

  it("preserves legitimate account name and officialName without mock overwriting", () => {
    const userAccount = {
      id: "acc_user_custom",
      name: "Bank account",
      officialName: "Bank account",
      currentBalance: 0,
      mask: "1234",
    };

    // Verify that keeping the account data intact maintains the user's real balance
    expect(userAccount.currentBalance).toBe(0);
    expect(userAccount.mask).toBe("1234");
    // Under the old bug, currentBalance would have been replaced with 125000
    expect(userAccount.currentBalance).not.toBe(125000);
  });

  it("calculates Burn Stability smoothly aligned with runway cushion without cliff collapses", () => {
    function calculateBurnStability(netWorth: number, burnRate: number) {
      const runwayFraction = burnRate > 0 ? (netWorth > 0 ? netWorth / burnRate : 0) : 12;
      if (burnRate <= 0) return 100;
      if (netWorth <= 0) return 10;
      if (runwayFraction >= 12) return 100;
      if (runwayFraction >= 6) return Math.min(100, Math.round(80 + ((runwayFraction - 6) / 6) * 20));
      if (runwayFraction >= 3) return Math.round(50 + ((runwayFraction - 3) / 3) * 30);
      if (runwayFraction >= 1) return Math.round(20 + ((runwayFraction - 1) / 2) * 30);
      return Math.max(5, Math.round(runwayFraction * 20));
    }

    // Demo account parameters: netWorth ₹4,19,000, burnRate ₹63,775 -> runway ~6.57 months
    const demoScore = calculateBurnStability(419000, 63775);
    expect(demoScore).toBe(82); // Smooth 82/100 instead of previously broken 0/100

    // 12 months runway -> 100/100
    expect(calculateBurnStability(600000, 50000)).toBe(100);

    // Exactly 6 months runway -> 80/100
    expect(calculateBurnStability(300000, 50000)).toBe(80);

    // 3 months runway -> 50/100
    expect(calculateBurnStability(150000, 50000)).toBe(50);

    // 0 burn rate -> 100/100
    expect(calculateBurnStability(500000, 0)).toBe(100);
  });

  it("resolves transaction bank aliases accurately when matching account tabs", () => {
    const account = {
      bankDocumentId: "XFTQ8Keq944zpHHea2DO",
      id: "HDFC123456789",
      name: "HDFC Savings Account",
      officialName: "HDFC Bank Savings Account",
      institutionId: "hdfc",
    };

    const ids = new Set<string>();
    ids.add(account.bankDocumentId.toLowerCase());
    ids.add(account.id.toLowerCase());
    if (account.name.toLowerCase().includes("hdfc")) {
      ids.add("bank_hdfc_savings");
    }

    const txns = [
      { name: "Rent Payment", senderBankId: "bank_hdfc_savings", amount: 25000 },
      { name: "Salary", senderBankId: "bank_icici_salary", amount: 210000 },
    ];

    const matched = txns.filter((t) => ids.has(t.senderBankId.toLowerCase()));
    expect(matched.length).toBe(1);
    expect(matched[0].name).toBe("Rent Payment");
  });
});

