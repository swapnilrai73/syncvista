"use server";

import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    // Generate unique transaction ID
    const transactionId = `TXN_${transaction.transferMode}_${Date.now()}`;

    // Get sender bank document to deduct balance
    const senderBankDoc = await getDoc(doc(db, "banks", transaction.senderBankId));
    if (!senderBankDoc.exists()) {
      throw new Error("Sender bank account not found");
    }

    const senderBankData = senderBankDoc.data();
    const currentBalance = senderBankData.currentBalance || 0;
    const transferAmount = parseFloat(transaction.amount);

    if (currentBalance < transferAmount) {
      throw new Error("Insufficient balance");
    }

    // Deduct amount from sender bank account
    await updateDoc(doc(db, "banks", transaction.senderBankId), {
      currentBalance: currentBalance - transferAmount,
    });

    // Create transaction record
    const newTransaction = await addDoc(collection(db, "transactions"), {
      transactionId,
      channel: 'Online',
      category: 'Transfer',
      status: 'Success',
      name: transaction.name,
      amount: transferAmount,
      senderBankId: transaction.senderBankId,
      receiverBankId: transaction.receiverBankId || null,
      transferMode: transaction.transferMode,
      note: transaction.note || '',
      $createdAt: new Date().toISOString(),
    });

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/transaction-history');
    revalidatePath('/my-banks');

    return parseStringify({ 
      $id: newTransaction.id, 
      transactionId,
      ...transaction,
      status: 'Success'
    });
  } catch (error) {
    console.error("Transaction error:", error);
    throw error;
  }
}

export const getTransactionsByBankId = async ({bankId}: getTransactionsByBankIdProps) => {
  try {
    const senderTransactions = await getDocs(
      query(collection(db, "transactions"), where("senderBankId", "==", bankId))
    );
    const receiverTransactions = await getDocs(
      query(collection(db, "transactions"), where("receiverBankId", "==", bankId))
    );

    const transactions = {
      total: senderTransactions.size + receiverTransactions.size,
      documents: [
        ...senderTransactions.docs.map((transaction) => ({ $id: transaction.id, ...transaction.data() })),
        ...receiverTransactions.docs.map((transaction) => ({ $id: transaction.id, ...transaction.data() })),
      ]
    }

    return parseStringify(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return parseStringify({ total: 0, documents: [] });
  }
}