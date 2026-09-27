export function normalizeSetuTransaction(raw: SetuTransaction): NormalizedTransaction {
  const sourceTransactionId = raw.transactionId || raw.id || crypto.randomUUID();
  const rawAmount = Number(raw.amount || 0);
  
  return {
    id: `norm-setu-${sourceTransactionId}`,
    sourceTransactionId,
    source: "setu",
    name: raw.description || raw.narration || raw.name || "Transaction",
    amount: Math.abs(rawAmount),
    currency: (raw as any).currency || undefined, // missing if unknown, do not assume INR
    date: raw.date || raw.transactionDate || new Date().toISOString(),
    category: raw.category || "General",
    type: (raw.type === "CREDIT" || raw.type === "credit") ? "credit" : "debit",
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
    currency: (raw as any).currency || undefined, // missing if unknown, do not assume INR
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
  let type: "credit" | "debit" = raw.type === "credit" ? "credit" : "debit";
  if (!raw.type && candidateKeys && raw.senderBankId) {
    type = candidateKeys.has(raw.senderBankId) ? "debit" : "credit";
  }

  const sourceTransactionId = raw.$id || raw.id || crypto.randomUUID();
  const rawAmount = Number(raw.amount || 0);

  return {
    id: `norm-mock-${sourceTransactionId}`,
    sourceTransactionId,
    source: "mock",
    name: raw.name || "Mock Transaction",
    amount: Math.abs(rawAmount),
    currency: raw.currency || undefined, // missing if unknown, do not assume INR
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
