"use server";

import { parseStringify } from "../utils";
import { getSetuAccountData } from "./setu.actions";
import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank, getLoggedInUser } from "./user.actions";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { MOCK_BANK_ACCOUNTS, MOCK_TRANSACTIONS } from "../mockData";

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    // If no banks from Firestore or error, return mock data
    if (!banks || banks.length === 0) {
      console.log("No banks found in Firestore, returning mock data");
      const mockAccounts = MOCK_BANK_ACCOUNTS.map((bank: any) => ({
        id: bank.accountId,
        availableBalance: (bank as any).availableBalance || (bank as any).currentBalance || 0,
        currentBalance: (bank as any).currentBalance || 0,
        institutionId: (bank as any).institutionId || "setu",
        name: (bank as any).name || "Bank account",
        officialName: (bank as any).officialName || (bank as any).name || "Bank account",
        mask: (bank as any).mask || "",
        type: (bank as any).type || "depository",
        subtype: (bank as any).subtype || "bank",
        bankDocumentId: bank.bankDocumentId,
        shareableId: bank.shareableId,
      }));

      const totalBanks = mockAccounts.length;
      const totalCurrentBalance = mockAccounts.reduce((total, account) => {
        return total + account.currentBalance;
      }, 0);

      return parseStringify({ data: mockAccounts, totalBanks, totalCurrentBalance });
    }

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        // For mock data, use Firestore data directly; otherwise use Setu
        let accountData;
        if (bank.mock) {
          accountData = {
            id: bank.accountId,
            availableBalance: (bank as any).availableBalance || (bank as any).currentBalance || 0,
            currentBalance: (bank as any).currentBalance || 0,
            institutionId: (bank as any).institutionId || "setu",
            name: (bank as any).name || "Bank account",
            officialName: (bank as any).officialName || (bank as any).name || "Bank account",
            mask: (bank as any).mask || "",
            type: (bank as any).type || "depository",
            subtype: (bank as any).subtype || "bank",
          };
        } else {
          accountData = await getSetuAccount(bank);
        }

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

    const hasInvalidAccounts = accounts.some(
      (account: any) => 
        account.currentBalance === undefined || 
        account.currentBalance === null ||
        !account.name
    );

    if (hasInvalidAccounts) {
      console.log("Found accounts with zero balance or missing fields, returning mock data");
      const mockAccounts = MOCK_BANK_ACCOUNTS.map((bank: any) => ({
        id: bank.accountId,
        availableBalance: (bank as any).availableBalance || (bank as any).currentBalance || 0,
        currentBalance: (bank as any).currentBalance || 0,
        institutionId: (bank as any).institutionId || "setu",
        name: (bank as any).name || "Bank account",
        officialName: (bank as any).officialName || (bank as any).name || "Bank account",
        mask: (bank as any).mask || "",
        type: (bank as any).type || "depository",
        subtype: (bank as any).subtype || "bank",
        bankDocumentId: bank.bankDocumentId,
        shareableId: bank.shareableId,
      }));

      const totalBanks = mockAccounts.length;
      const totalCurrentBalance = mockAccounts.reduce((total, account) => {
        return total + account.currentBalance;
      }, 0);

      return parseStringify({ data: mockAccounts, totalBanks, totalCurrentBalance });
    }

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
    // Return mock data on error
    console.log("Error fetching accounts, returning mock data");
    const mockAccounts = MOCK_BANK_ACCOUNTS.map((bank: any) => ({
      id: bank.accountId,
      availableBalance: (bank as any).availableBalance || (bank as any).currentBalance || 0,
      currentBalance: (bank as any).currentBalance || 0,
      institutionId: (bank as any).institutionId || "setu",
      name: (bank as any).name || "Bank account",
      officialName: (bank as any).officialName || (bank as any).name || "Bank account",
      mask: (bank as any).mask || "",
      type: (bank as any).type || "depository",
      subtype: (bank as any).subtype || "bank",
      bankDocumentId: bank.bankDocumentId,
      shareableId: bank.shareableId,
    }));

    const totalBanks = mockAccounts.length;
    const totalCurrentBalance = mockAccounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: mockAccounts, totalBanks, totalCurrentBalance });
  }
};

// Get one bank account
export const getAccount = async ({ bankDocumentId }: getAccountProps) => {
  try {
    // STOPGAP AUTH CHECK: never trust bankDocumentId alone — verify it
    // belongs to the currently logged-in user before returning any data.
    const loggedIn = await getLoggedInUser();
    if (!loggedIn) {
      throw new Error("Unauthorized: no active session");
    }

    // get bank from db
    const bank = await getBank({ documentId: bankDocumentId });

    if (!bank) {
      throw new Error("Bank account not found");
    }

    if (bank.userId !== loggedIn.$id) {
      // Do not reveal whether the ID exists — same error either way.
      throw new Error("Bank account not found");
    }

    let accountData;
    let transactions = [];

    // For mock data, use Firestore data directly; otherwise use Setu
    if (bank.mock) {
      accountData = {
        id: bank.accountId,
        availableBalance: bank.availableBalance || bank.currentBalance || 0,
        currentBalance: bank.currentBalance || 0,
        institutionId: bank.institutionId || "setu",
        name: bank.name || "Bank account",
        officialName: bank.officialName || bank.name || "Bank account",
        mask: bank.mask || "",
        type: bank.type || "depository",
        subtype: bank.subtype || "bank",
      };

      // If account has zero balance or missing fields, merge with mock data
      if (accountData.currentBalance === 0 || !accountData.officialName || accountData.officialName === "Bank account") {
        console.log("Account has zero balance or missing fields, merging with mock data");
        const mockAccount = MOCK_BANK_ACCOUNTS.find((mock: any) => 
          mock.bankName?.toLowerCase().includes(bank.name?.toLowerCase() || "") ||
          mock.institutionId === bank.institutionId
        );

        if (mockAccount) {
          accountData = {
            ...accountData,
            currentBalance: mockAccount.currentBalance,
            availableBalance: mockAccount.availableBalance,
            officialName: mockAccount.officialName,
            mask: mockAccount.mask,
            name: mockAccount.name,
          };
        } else {
          // Fallback to first mock account if no match found
          const fallbackAccount = MOCK_BANK_ACCOUNTS[0];
          accountData = {
            ...accountData,
            currentBalance: fallbackAccount.currentBalance,
            availableBalance: fallbackAccount.availableBalance,
            officialName: fallbackAccount.officialName,
            mask: fallbackAccount.mask,
            name: fallbackAccount.name,
          };
        }
      }

      // Get transactions from Firestore for this mock bank
      const transferTransactionsData = await getTransactionsByBankId({
        bankId: bank.$id,
      });

      transactions = transferTransactionsData.documents.map(
        (transferData: Transaction) => ({
          id: transferData.$id,
          name: transferData.name!,
          amount: transferData.amount!,
          date: transferData.date || transferData.$createdAt,
          paymentChannel: transferData.paymentChannel || transferData.channel,
          category: transferData.category,
          type: transferData.senderBankId === bank.$id ? "debit" : "credit",
          bankDocumentId: bank.$id,
        })
      );
    } else {
      accountData = await getSetuAccount(bank);

      // If account has zero balance or missing fields, merge with mock data
      if (accountData.currentBalance === 0 || !accountData.officialName || accountData.officialName === "Bank account") {
        console.log("Setu account has zero balance or missing fields, merging with mock data");
        const mockAccount = MOCK_BANK_ACCOUNTS.find((mock: any) => 
          mock.bankName?.toLowerCase().includes(bank.name?.toLowerCase() || "") ||
          mock.institutionId === bank.institutionId
        );

        if (mockAccount) {
          accountData = {
            ...accountData,
            currentBalance: mockAccount.currentBalance,
            availableBalance: mockAccount.availableBalance,
            officialName: mockAccount.officialName,
            mask: mockAccount.mask,
            name: mockAccount.name,
          };
        } else {
          // Fallback to first mock account if no match found
          const fallbackAccount = MOCK_BANK_ACCOUNTS[0];
          accountData = {
            ...accountData,
            currentBalance: fallbackAccount.currentBalance,
            availableBalance: fallbackAccount.availableBalance,
            officialName: fallbackAccount.officialName,
            mask: fallbackAccount.mask,
            name: fallbackAccount.name,
          };
        }
      }

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
      const setuTransactions = getSetuTransactions(setuData);

      transactions = [...setuTransactions, ...transferTransactions];
    }

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
    const allTransactions = transactions.sort(
      (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
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

// Get transactions from all bank accounts
export const getAllTransactions = async ({ userId }: getAccountsProps) => {
  try {
    const banks = await getBanks({ userId });
    
    // If no banks from Firestore, return mock transactions
    if (!banks || banks.length === 0) {
      console.log("No banks found in Firestore, returning mock transactions");
      return parseStringify(MOCK_TRANSACTIONS);
    }
    
    // Check if any bank is mock data - if so, query Firestore transactions directly
    const hasMockBanks = banks?.some((bank: Bank) => bank.mock);
    
    if (hasMockBanks) {
      // Query all transactions from Firestore for this user's banks
      const bankIds = banks?.map((bank: Bank) => bank.$id) || [];
      
      if (bankIds.length === 0) {
        console.log("No bank IDs found, returning mock transactions");
        return parseStringify(MOCK_TRANSACTIONS);
      }
      
      // Query transactions where senderBankId or receiverBankId matches any of the user's banks
      const senderTransactionsQuery = query(
        collection(db, "transactions"),
        where("senderBankId", "in", bankIds)
      );
      const receiverTransactionsQuery = query(
        collection(db, "transactions"),
        where("receiverBankId", "in", bankIds)
      );
      
      const [senderSnapshot, receiverSnapshot] = await Promise.all([
        getDocs(senderTransactionsQuery),
        getDocs(receiverTransactionsQuery)
      ]);
      
      const allTransactions = [
        ...senderSnapshot.docs.map((doc) => ({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        })),
        ...receiverSnapshot.docs.map((doc) => ({
          id: doc.id,
          $id: doc.id,
          ...doc.data()
        }))
      ];
      
      // If no transactions found in Firestore, return mock data
      if (allTransactions.length === 0) {
        console.log("No transactions found in Firestore, returning mock transactions");
        return parseStringify(MOCK_TRANSACTIONS);
      }
      
      const sortedTransactions = allTransactions.sort(
        (a: any, b: any) => new Date(b.date || b.$createdAt).getTime() - new Date(a.date || a.$createdAt).getTime()
      );
      
      return parseStringify(sortedTransactions);
    }

    // Original Setu-based flow for non-mock banks
    const allTransactions = await Promise.all(
      banks?.map(async (bank: Bank) => {
        const setuData = await getSetuAccountData(bank.consentId);
        const setuTransactions = getSetuTransactions(setuData);

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
            bankDocumentId: bank.$id,
          })
        );

        const transactionsWithBankId = setuTransactions.map((txn) => ({
          ...txn,
          bankDocumentId: bank.$id,
        }));

        return [...transactionsWithBankId, ...transferTransactions];
      })
    );

    const flattenedTransactions = allTransactions.flat();
    
    // If no transactions from Setu, return mock data
    if (flattenedTransactions.length === 0) {
      console.log("No transactions from Setu, returning mock transactions");
      return parseStringify(MOCK_TRANSACTIONS);
    }
    
    const sortedTransactions = flattenedTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify(sortedTransactions);
  } catch (error) {
    console.error("An error occurred while getting all transactions:", error);
    // Return mock data on error
    console.log("Error fetching transactions, returning mock transactions");
    return parseStringify(MOCK_TRANSACTIONS);
  }
};