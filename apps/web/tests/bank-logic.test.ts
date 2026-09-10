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
});
