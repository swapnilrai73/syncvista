export function normalizeSetuTransaction(raw: SetuTransaction): NormalizedTransaction {
  return {
    id: raw.id || raw.transactionId || crypto.randomUUID(),
    name: raw.description || raw.narration || raw.name || "Transaction",
    amount: Number(raw.amount || 0),
    date: raw.date || raw.transactionDate || new Date().toISOString(),
    category: raw.category || "General",
    type: (raw.type === "CREDIT" || raw.type === "credit") ? "credit" : "debit",
    paymentChannel: raw.mode || raw.paymentChannel || "online",
    pending: Boolean(raw.pending),
  };
}

export function normalizeFirebaseTransfer(raw: FirebaseTransferTransaction, contextBankId?: string): NormalizedTransaction {
  return {
    id: raw.$id,
    name: raw.name,
    amount: raw.amount,
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

  return {
    id: raw.$id || raw.id || crypto.randomUUID(),
    name: raw.name || "Mock Transaction",
    amount: Number(raw.amount || 0),
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
