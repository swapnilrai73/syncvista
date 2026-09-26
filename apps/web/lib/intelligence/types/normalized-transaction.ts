/**
 * normalized-transaction.ts
 *
 * Canonical transaction representation for the SyncVista Intelligence Layer.
 * This type replaces the ambient `Transaction` global (apps/web/types/index.d.ts)
 * in all intelligence/analytics contexts so that downstream code never needs
 * `any` casts or ad-hoc field discovery.
 *
 * Design constraints:
 *  - Zero dependencies on other intelligence files (fully standalone).
 *  - No imports from Firebase, fire-engine, or AI packages.
 *  - All exported functions are pure (no side-effects, no I/O).
 *  - `amount` is ALWAYS stored as a positive number; polarity lives in `direction`.
 *
 * Sources reconciled:
 *  - Ambient Transaction (types/index.d.ts): id, $id, name, paymentChannel, type,
 *    accountId, amount, pending, category, date, image, $createdAt, channel,
 *    senderBankId, receiverBankId, bankDocumentId?
 *  - Mock data (mockData.ts createTransaction): adds transactionId, bankId, status
 *  - Setu AA (bank.actions.ts getSetuTransactions): id, name, paymentChannel,
 *    type, accountId, amount, pending, category, date, image
 */

// ---------------------------------------------------------------------------
// Enums / union literals
// ---------------------------------------------------------------------------

/**
 * Explicit polarity of a transaction from the user's perspective.
 *   credit — money arrived in the account (salary, UPI received, refund, …)
 *   debit  — money left the account (purchase, transfer out, …)
 */
export type TransactionDirection = "credit" | "debit";

/**
 * Provenance tag — identifies which pipeline produced this record.
 *   AA           — Setu Account Aggregator (live bank feed)
 *   MANUAL_TRANSFER — created via the in-app P2P transfer flow
 *   MOCK         — seeded from mockData.ts / seed-firestore.ts
 *   FALLBACK     — produced by a degraded path (missing or unrecognised fields)
 */
export type TransactionSource = "AA" | "MANUAL_TRANSFER" | "MOCK" | "FALLBACK";

// ---------------------------------------------------------------------------
// Core interface
// ---------------------------------------------------------------------------

/**
 * NormalizedTransaction — the single shape used by all Intelligence Layer
 * calculations. Every analytics function, opportunity detector, and
 * recommendation engine consumes this type, never raw source records.
 */
export interface NormalizedTransaction {
  /** Canonical ID. Prefer `$id` over `id` when both are present in the source. */
  id: string;

  /** Bank account this transaction belongs to. */
  accountId: string;

  /**
   * Normalized ISO date string.
   * Preferred format: YYYY-MM-DD (date-only) or full ISO 8601.
   * Empty string if the source date could not be parsed.
   */
  date: string;

  /**
   * Unix epoch milliseconds for fast sorting and range queries.
   * Set to `NaN` when `date` is empty / unparseable.
   */
  dateTimestamp: number;

  /**
   * Absolute magnitude of the transaction in INR.
   * ALWAYS positive. Use `direction` to determine whether money arrived or left.
   *
   * Ambiguity note: some legacy source records store expenses as positive and
   * credits as negative (e.g. certain Plaid-format feeds). `normalizeTransaction`
   * calls `Math.abs` on the raw amount and sets `direction` correctly.
   */
  amount: number;

  /** Explicit credit / debit label derived from the source record. */
  direction: TransactionDirection;

  /**
   * Spending / income category.
   * Defaults to "General" when the source field is absent or empty.
   */
  category: string;

  /**
   * Merchant name, payee, or narration string — the raw `name` field from source.
   * Empty string if not present.
   */
  merchant: string;

  /**
   * Payment rail / channel (e.g. "online", "in store", "upi", "neft").
   * Empty string if not present.
   */
  paymentChannel: string;

  /** Whether the transaction is still pending settlement. */
  pending: boolean;

  /** Which data pipeline produced this record. */
  source: TransactionSource;

  /**
   * True when `senderBankId` and `receiverBankId` are both present AND equal,
   * indicating an internal account-to-account transfer within the same user.
   * These should be excluded from expense and income calculations.
   *
   * Ambiguity note: the field is `false` (not `null`) when the source record
   * does not carry bank-routing fields, so callers can use a simple boolean
   * check without null-guarding.
   */
  isSelfTransfer: boolean;

  /**
   * Original fields from the source record, preserved verbatim for debugging.
   * NEVER used in any financial calculation; only for traceability.
   */
  rawFields: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// normalizeDate
// ---------------------------------------------------------------------------

/**
 * Converts a raw date value to a canonical ISO string and a numeric timestamp.
 *
 * Handles:
 *  1. JS `Date` objects
 *  2. Firestore `Timestamp`-like objects that expose a `.toDate()` method
 *  3. ISO 8601 strings (full datetime or date-only YYYY-MM-DD)
 *  4. Any other value → returns `{ isoDate: "", timestamp: NaN }`
 *
 * The returned `isoDate` is the full ISO 8601 string produced by
 * `Date.prototype.toISOString()`. Callers that only need the date portion
 * may slice the first 10 characters.
 */
export function normalizeDate(raw: unknown): { isoDate: string; timestamp: number } {
  const INVALID = { isoDate: "", timestamp: NaN };

  if (raw == null) return INVALID;

  let date: Date;

  // Firestore Timestamp-like: { toDate(): Date }
  if (typeof raw === "object" && typeof (raw as { toDate?: unknown }).toDate === "function") {
    date = (raw as { toDate(): Date }).toDate();
  } else if (raw instanceof Date) {
    date = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    date = new Date(raw.trim());
  } else if (typeof raw === "number") {
    // Unix ms epoch (edge case in some backends)
    date = new Date(raw);
  } else {
    return INVALID;
  }

  if (isNaN(date.getTime())) return INVALID;

  return {
    isoDate: date.toISOString(),
    timestamp: date.getTime(),
  };
}

// ---------------------------------------------------------------------------
// normalizeTransactionDirection
// ---------------------------------------------------------------------------

/**
 * Replicates the `isCreditTransaction` heuristic from `apps/web/lib/analytics/engine.ts`
 * verbatim, returning a typed `TransactionDirection` instead of a boolean.
 *
 * Decision tree (evaluated in order):
 *  1. `type` field exact match → credit/inflow/income/cr → "credit";
 *                                debit/outflow/expense/dr → "debit"
 *  2. `category` substring   → income/salary/deposit/transfer → "credit"
 *  3. `name` substring       → salary/upi\/cr/neft cr/imps cr/credit/deposit/refund → "credit"
 *  4. Negative `amount`      → "credit" (some backends invert the sign)
 *  5. Default                → "debit"
 *
 * NOTE: This function intentionally does NOT import engine.ts so that this
 * module remains a leaf with zero app-code dependencies.
 */
export function normalizeTransactionDirection(
  t: Record<string, unknown>
): TransactionDirection {
  const type = String(t.type ?? t.transactionType ?? "").toLowerCase().trim();
  const category = String(t.category ?? "").toLowerCase();
  const name = String(t.name ?? t.description ?? "").toLowerCase();
  const amount = typeof t.amount === "number" ? t.amount : NaN;

  // 1. Explicit type field
  if (["credit", "inflow", "income", "cr"].includes(type)) return "credit";
  if (["debit", "outflow", "expense", "dr"].includes(type)) return "debit";

  // 2. Category keyword
  if (
    category.includes("income") ||
    category.includes("salary") ||
    category.includes("deposit") ||
    category.includes("transfer")
  ) {
    return "credit";
  }

  // 3. Name / narration keyword (matches HDFC credit narration patterns)
  if (
    name.includes("salary") ||
    name.includes("upi/cr") ||
    name.includes("neft cr") ||
    name.includes("imps cr") ||
    name.includes("credit") ||
    name.includes("deposit") ||
    name.includes("refund")
  ) {
    return "credit";
  }

  // 4. Negative amount polarity (schema stores income as negative in some feeds)
  if (!isNaN(amount) && amount < 0) return "credit";

  // 5. Default
  return "debit";
}

// ---------------------------------------------------------------------------
// normalizeTransaction
// ---------------------------------------------------------------------------

/**
 * Maps a raw source record (any shape) to a fully typed `NormalizedTransaction`.
 *
 * Field resolution order:
 *  - `id`           : raw.$id → raw.id → raw.transactionId → ""
 *  - `accountId`    : raw.accountId → raw.bankId → ""
 *  - `date`         : raw.date → raw.$createdAt → raw.createdAt (via normalizeDate)
 *  - `amount`       : Math.abs(raw.amount) — always positive
 *  - `direction`    : normalizeTransactionDirection(raw)
 *  - `category`     : raw.category || "General"
 *  - `merchant`     : raw.name || raw.description || ""
 *  - `paymentChannel`: raw.paymentChannel || raw.channel || ""
 *  - `pending`      : Boolean(raw.pending)
 *  - `isSelfTransfer`: raw.senderBankId === raw.receiverBankId (both non-null strings)
 *
 * All original fields are captured in `rawFields` for debugging.
 */
export function normalizeTransaction(
  raw: Record<string, unknown>,
  source: TransactionSource
): NormalizedTransaction {
  // ID — prefer Firestore document ID ($id) over logical transaction ID
  const id =
    String(raw.$id ?? raw.id ?? raw.transactionId ?? "");

  // Account association
  const accountId = String(raw.accountId ?? raw.bankId ?? "");

  // Date normalization
  const rawDate = raw.date ?? raw.$createdAt ?? raw.createdAt;
  const { isoDate, timestamp } = normalizeDate(rawDate);

  // Amount — always positive; polarity from direction
  const rawAmount = typeof raw.amount === "number" ? raw.amount : Number(raw.amount);
  const amount = isNaN(rawAmount) ? 0 : Math.abs(rawAmount);

  // Direction
  const direction = normalizeTransactionDirection(raw);

  // Category
  const category =
    typeof raw.category === "string" && raw.category.trim() !== ""
      ? raw.category.trim()
      : "General";

  // Merchant / narration
  const merchant =
    typeof raw.name === "string"
      ? raw.name
      : typeof raw.description === "string"
      ? raw.description
      : "";

  // Payment channel
  const paymentChannel =
    typeof raw.paymentChannel === "string"
      ? raw.paymentChannel
      : typeof raw.channel === "string"
      ? raw.channel
      : "";

  // Pending flag
  const pending = Boolean(raw.pending);

  // Self-transfer detection — only true when BOTH routing fields are present
  // and equal (same user, internal movement).
  const senderBankId = raw.senderBankId;
  const receiverBankId = raw.receiverBankId;
  const isSelfTransfer =
    typeof senderBankId === "string" &&
    senderBankId.trim() !== "" &&
    typeof receiverBankId === "string" &&
    receiverBankId.trim() !== "" &&
    senderBankId === receiverBankId;

  return {
    id,
    accountId,
    date: isoDate,
    dateTimestamp: timestamp,
    amount,
    direction,
    category,
    merchant,
    paymentChannel,
    pending,
    source,
    isSelfTransfer,
    rawFields: { ...raw },
  };
}

// ---------------------------------------------------------------------------
// normalizeTransactions
// ---------------------------------------------------------------------------

/**
 * Maps an array of raw source records to `NormalizedTransaction[]`.
 * Null/undefined entries are silently skipped.
 */
export function normalizeTransactions(
  raws: Record<string, unknown>[],
  source: TransactionSource
): NormalizedTransaction[] {
  if (!Array.isArray(raws)) return [];
  return raws
    .filter((r): r is Record<string, unknown> => r != null && typeof r === "object")
    .map((r) => normalizeTransaction(r, source));
}
