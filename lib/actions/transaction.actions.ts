"use server";

import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { parseStringify } from "../utils";

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const newTransaction = await addDoc(collection(db, "transactions"), {
      channel: 'online',
      category: 'Transfer',
      ...transaction,
      $createdAt: new Date().toISOString(),
    });

    return parseStringify({ $id: newTransaction.id, ...transaction });
  } catch (error) {
    console.log(error);
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
    console.log(error);
  }
}