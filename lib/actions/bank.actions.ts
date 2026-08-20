"use server";

import { parseStringify } from "../utils";
import { getSetuAccountData } from "./setu.actions";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        const accountData = await getSetuAccount(bank);

        const account = {
          id: accountData.id,
          availableBalance: accountData.availableBalance,
          currentBalance: accountData.currentBalance,
          institutionId: accountData.institutionId,
          name: accountData.name,
          officialName: accountData.officialName,
          mask: accountData.mask,
          type: accountData.type,
          subtype: accountData.subtype,
          bankDocumentId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ bankDocumentId }: getAccountProps) => {
  try {
    // get bank from db
    const bank = await getBank({ documentId: bankDocumentId });

    const accountData = await getSetuAccount(bank);

    // Include locally recorded transfer transactions.
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = transferTransactionsData.documents.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category,
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })
    );

    const setuData = await getSetuAccountData(bank.consentId);
    const transactions = getSetuTransactions(setuData);

    const account = {
      id: accountData.id,
      availableBalance: accountData.availableBalance,
      currentBalance: accountData.currentBalance,
      institutionId: accountData.institutionId,
      name: accountData.name,
      officialName: accountData.officialName,
      mask: accountData.mask,
      type: accountData.type,
      subtype: accountData.subtype,
      bankDocumentId: bank.$id,
    };

    // sort transactions by date such that the most recent transaction is first
      const allTransactions = [...transactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// Get bank info
const getSetuAccount = async (bank: Bank) => {
  const data = await getSetuAccountData(bank.consentId);
  const account = data.accounts?.[0] || data.Accounts?.[0] || data;
  const balance = account.balance || account.balances?.current || 0;
  return {
    id: account.accountId || account.account_id || bank.accountId,
    availableBalance: account.availableBalance ?? balance,
    currentBalance: account.currentBalance ?? balance,
    institutionId: account.institutionId || account.fiId || "setu",
    name: account.name || account.accountType || "Bank account",
    officialName: account.officialName || account.name || "Bank account",
    mask: account.mask || account.maskedAccountNumber || "",
    type: account.type || "depository",
    subtype: account.subtype || "bank",
  };
};

const getSetuTransactions = (data: any): Transaction[] => {
  const transactions = data.transactions || data.Transactions || data.accounts?.flatMap((account: any) => account.transactions || []) || [];
  return transactions.map((transaction: any) => ({
    id: transaction.id || transaction.transactionId,
    name: transaction.description || transaction.narration || transaction.name || "Transaction",
    paymentChannel: transaction.mode || transaction.paymentChannel || "online",
    type: transaction.type || "debit",
    accountId: transaction.accountId || "",
    amount: Number(transaction.amount || 0),
    pending: Boolean(transaction.pending),
    category: transaction.category || "",
    date: transaction.date || transaction.transactionDate,
    image: transaction.image || "",
  }));
};