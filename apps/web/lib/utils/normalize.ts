export function normalizeTransactionDirection(
  t: Record<string, unknown>
): "credit" | "debit" {
  const type = String(t.type ?? t.transactionType ?? "").toLowerCase().trim();
  const category = String(t.category ?? "").toLowerCase();
  const name = String(t.name ?? t.description ?? "").toLowerCase();
  const amount = typeof t.amount === "number" ? t.amount : NaN;

  // 1. Exclusion: Credit Card Bill from savings is a debit.
  if (
    name.includes("credit card bill") ||
    name.includes("credit card payment") ||
    name.includes("credit card emi") ||
    category === "credit card payment"
  ) {
    return "debit";
  }

  // 2. Explicit type field
  if (["credit", "inflow", "income", "cr"].includes(type)) return "credit";
  if (["debit", "outflow", "expense", "dr"].includes(type)) return "debit";

  // 3. Category keyword
  if (
    category.includes("income") ||
    category.includes("salary") ||
    category.includes("deposit")
  ) {
    return "credit";
  }

  // 4. Name / narration keyword (matches HDFC credit narration patterns)
  if (
    name.includes("salary") ||
    name.includes("upi/cr") ||
    name.includes("neft cr") ||
    name.includes("imps cr") ||
    name.includes("deposit") ||
    name.includes("refund") ||
    name.includes("dividend") ||
    name.includes("interest")
  ) {
    return "credit";
  }

  // 5. Negative amount polarity (legacy schema fallback)
  if (!isNaN(amount) && amount < 0 && !category.includes("transfer")) return "credit";

  return "debit";
}

export function normalizeSetuTransaction(raw: SetuTransaction): NormalizedTransaction {
  const sourceTransactionId = raw.transactionId || raw.id || crypto.randomUUID();
  const rawAmount = Number(raw.amount || 0);
  
  return {
    id: `norm-setu-${sourceTransactionId}`,
    sourceTransactionId,
    source: "setu",
    name: raw.description || raw.narration || raw.name || "Transaction",
    amount: Math.abs(rawAmount),
    currency: (raw as any).currency || undefined,
    date: raw.date || raw.transactionDate || new Date().toISOString(),
    category: raw.category || "General",
    type: normalizeTransactionDirection({
      type: raw.type,
      category: raw.category,
      name: raw.description || raw.narration || raw.name,
      amount: rawAmount
    }),
    paymentChannel: raw.mode || raw.paymentChannel || "online",
    pending: Boolean(raw.pending),
  };
}

export function normalizeFirebaseTransfer(raw: FirebaseTransferTransaction, contextBankId?: string): NormalizedTransaction {
  return {
    id: `norm-fb-${raw.$id}`,
    sourceTransactionId: raw.$id,
    source: "firebase",
    name: raw.name,
    amount: Math.abs(raw.amount),
    currency: (raw as any).currency || undefined,
    date: raw.$createdAt,
    category: raw.category || "Transfer",
    type: (contextBankId && raw.senderBankId === contextBankId) ? "debit" : "credit",
    paymentChannel: raw.channel || "online",
    pending: false,
    senderBankId: raw.senderBankId,
    receiverBankId: raw.receiverBankId,
  };
}

export function normalizeMockTransaction(raw: any, candidateKeys?: Set<string>, contextBankId?: string): NormalizedTransaction {
  let initialType: "credit" | "debit" = raw.type === "credit" ? "credit" : "debit";
  if (!raw.type && candidateKeys && raw.senderBankId) {
    initialType = candidateKeys.has(raw.senderBankId) ? "debit" : "credit";
  }

  const type = normalizeTransactionDirection({ ...raw, type: initialType });
  const sourceTransactionId = raw.$id || raw.id || crypto.randomUUID();
  const rawAmount = Number(raw.amount || 0);

  return {
    id: `norm-mock-${sourceTransactionId}`,
    sourceTransactionId,
    source: "mock",
    name: raw.name || "Mock Transaction",
    amount: Math.abs(rawAmount),
    currency: raw.currency || undefined,
    date: raw.date || raw.$createdAt || new Date().toISOString(),
    category: raw.category || "General",
    type,
    paymentChannel: raw.paymentChannel || raw.channel || "online",
    pending: Boolean(raw.pending),
    senderBankId: raw.senderBankId,
    receiverBankId: raw.receiverBankId,
    bankDocumentId: contextBankId || raw.bankDocumentId,
    mock: true,
  };
}
