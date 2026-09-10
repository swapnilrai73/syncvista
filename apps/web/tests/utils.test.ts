import { describe, it, expect } from "./test-utils";
import {
  cn,
  formatAmount,
  formatDateTime,
  getCategoryStyle,
  getAccountTypeColors,
  countTransactionCategories,
  encryptId,
  decryptId,
  getTransactionStatus,
  authFormSchema,
} from "../lib/utils";

describe("Web Utils: ClassName & Formatting (cn, formatAmount, formatDateTime)", () => {
  it("cn merges classes and resolves Tailwind conflicts correctly", () => {
    const result = cn("px-2 py-1", "bg-blue-500", "px-4");
    expect(result).toContain("px-4");
    expect(result).toContain("py-1");
    expect(result).toContain("bg-blue-500");
    // px-2 should have been overridden by px-4
    expect(result.includes("px-2")).toBe(false);
  });

  it("cn filters out falsy and conditional values", () => {
    const isVisible = false;
    const isPrimary = true;
    const result = cn("base-class", isVisible && "visible-class", isPrimary && "primary-class", null, undefined);
    expect(result).toBe("base-class primary-class");
  });

  it("formatAmount formats amounts in INR currency style", () => {
    const formatted = formatAmount(125000);
    // Should contain standard Indian grouping 1,25,000 and two decimal places
    expect(formatted).toContain("1,25,000.00");
    expect(formatted).toContain("₹");

    const zeroFormatted = formatAmount(0);
    expect(zeroFormatted).toContain("0.00");
  });

  it("formatDateTime extracts dateTime, dateDay, dateOnly, and timeOnly components", () => {
    const testDate = new Date(2026, 7, 15, 14, 30, 0); // Aug 15, 2026 14:30:00
    const result = formatDateTime(testDate);

    expect(result).toBeDefined();
    expect(result.dateTime).toContain("Aug");
    expect(result.dateTime).toContain("15");
    expect(result.dateDay).toContain("2026");
    expect(result.dateOnly).toContain("Aug");
    expect(result.timeOnly).toContain("30");
  });
});

describe("Web Utils: Category Styles & Account Type Colors", () => {
  it("getCategoryStyle returns expected metadata for known statuses", () => {
    const successStyle = getCategoryStyle("Success");
    expect(successStyle.bg).toContain("emerald");
    expect(successStyle.text).toContain("emerald-700");

    const pendingStyle = getCategoryStyle("Pending");
    expect(pendingStyle.bg).toContain("blue");

    const failedStyle = getCategoryStyle("Failed");
    expect(failedStyle.bg).toContain("rose");

    const defaultStyle = getCategoryStyle("UnknownCategory");
    expect(defaultStyle.bg).toContain("gray");
  });

  it("getAccountTypeColors returns proper visual color schemes", () => {
    const depository = getAccountTypeColors("depository" as any);
    expect(depository.bg).toContain("blue");
    expect(depository.title).toContain("blue-900");

    const credit = getAccountTypeColors("credit" as any);
    expect(credit.bg).toContain("success");

    const other = getAccountTypeColors("loan" as any);
    expect(other.bg).toContain("green");
  });
});

describe("Web Utils: Category Aggregation & ID Obfuscation", () => {
  it("countTransactionCategories aggregates and sorts descending by frequency", () => {
    const mockTxs: any[] = [
      { id: "1", category: "Dining", amount: 500 },
      { id: "2", category: "Dining", amount: 350 },
      { id: "3", category: "Dining", amount: 1200 },
      { id: "4", category: "Shopping", amount: 2000 },
      { id: "5", category: "Shopping", amount: 1500 },
      { id: "6", category: "Utilities", amount: 800 },
    ];

    const result = countTransactionCategories(mockTxs);
    expect(result).toHaveLength(3);

    // Most frequent first: Dining (3) -> Shopping (2) -> Utilities (1)
    expect(result[0].name).toBe("Dining");
    expect(result[0].count).toBe(3);
    expect(result[0].totalCount).toBe(6);

    expect(result[1].name).toBe("Shopping");
    expect(result[1].count).toBe(2);

    expect(result[2].name).toBe("Utilities");
    expect(result[2].count).toBe(1);
  });

  it("countTransactionCategories handles empty transaction array safely", () => {
    const emptyResult = countTransactionCategories([]);
    expect(emptyResult).toHaveLength(0);
  });

  it("encryptId and decryptId perform symmetric base64 roundtrip", () => {
    const originalId = "bank_account_hdfc_789456123";
    const encrypted = encryptId(originalId);
    expect(encrypted).not.toBe(originalId);

    const decrypted = decryptId(encrypted);
    expect(decrypted).toBe(originalId);
  });

  it("getTransactionStatus identifies recent vs older transactions", () => {
    const recent = new Date(); // right now
    expect(getTransactionStatus(recent)).toBe("Processing");

    const old = new Date();
    old.setDate(old.getDate() - 5); // 5 days ago
    expect(getTransactionStatus(old)).toBe("Success");
  });
});

describe("Web Utils: Auth Schema Validation & Indian PAN Regex", () => {
  it("authFormSchema validates sign-in payload with minimal fields", () => {
    const schema = authFormSchema("sign-in");

    // Valid sign-in
    const validSignIn = schema.safeParse({
      email: "user@example.com",
      password: "securepassword123",
    });
    expect(validSignIn.success).toBe(true);

    // Invalid email
    const invalidEmail = schema.safeParse({
      email: "not-an-email",
      password: "securepassword123",
    });
    expect(invalidEmail.success).toBe(false);

    // Short password (< 8 chars)
    const shortPassword = schema.safeParse({
      email: "user@example.com",
      password: "short",
    });
    expect(shortPassword.success).toBe(false);
  });

  it("authFormSchema enforces Indian PAN format regex on sign-up", () => {
    const schema = authFormSchema("sign-up");

    const baseData = {
      firstName: "Rahul",
      lastName: "Sharma",
      address1: "42 MG Road",
      city: "Bengaluru",
      state: "KA",
      postalCode: "560001",
      dateOfBirth: "1990-01-01",
      email: "rahul@example.com",
      password: "strongPassword123!",
    };

    // Valid PAN: 5 uppercase letters + 4 digits + 1 uppercase letter
    const validPAN = schema.safeParse({
      ...baseData,
      panNumber: "ABCDE1234F",
    });
    expect(validPAN.success).toBe(true);

    // Invalid PANs
    const lowercasePAN = schema.safeParse({
      ...baseData,
      panNumber: "abcde1234f",
    });
    expect(lowercasePAN.success).toBe(false);

    const wrongDigitsPAN = schema.safeParse({
      ...baseData,
      panNumber: "ABCD12345F",
    });
    expect(wrongDigitsPAN.success).toBe(false);

    const shortPAN = schema.safeParse({
      ...baseData,
      panNumber: "ABCD123E",
    });
    expect(shortPAN.success).toBe(false);
  });

  it("authFormSchema enforces postal code length restrictions on sign-up", () => {
    const schema = authFormSchema("sign-up");
    const baseData = {
      firstName: "Rahul",
      lastName: "Sharma",
      address1: "42 MG Road",
      city: "Bengaluru",
      state: "KA",
      dateOfBirth: "1990-01-01",
      panNumber: "ABCDE1234F",
      email: "rahul@example.com",
      password: "strongPassword123!",
    };

    // 6-digit Indian PIN code -> valid
    const validPin = schema.safeParse({ ...baseData, postalCode: "560001" });
    expect(validPin.success).toBe(true);

    // Too short (< 3 chars)
    const tooShortPin = schema.safeParse({ ...baseData, postalCode: "12" });
    expect(tooShortPin.success).toBe(false);

    // Too long (> 6 chars)
    const tooLongPin = schema.safeParse({ ...baseData, postalCode: "1234567" });
    expect(tooLongPin.success).toBe(false);
  });
});
