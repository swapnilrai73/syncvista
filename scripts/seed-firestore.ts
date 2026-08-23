/**
 * Firestore Seed Script
 * Populates Firestore with mock bank accounts and transactions for testuser2
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { MOCK_BANK_ACCOUNTS, MOCK_TRANSACTIONS, MOCK_USER_ID } from "../lib/mockData";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearExistingData() {
  console.log("Clearing existing data for testuser2...");
  
  // Clear existing banks
  const banksQuery = query(collection(db, "banks"), where("userId", "==", MOCK_USER_ID));
  const banksSnapshot = await getDocs(banksQuery);
  for (const bankDoc of banksSnapshot.docs) {
    await deleteDoc(doc(db, "banks", bankDoc.id));
  }
  
  // Clear existing transactions for this user
  const transactionsQuery = query(collection(db, "transactions"), where("senderBankId", "in", MOCK_BANK_ACCOUNTS.map(b => b.bankDocumentId)));
  const transactionsSnapshot = await getDocs(transactionsQuery);
  for (const txnDoc of transactionsSnapshot.docs) {
    await deleteDoc(doc(db, "transactions", txnDoc.id));
  }
  
  console.log("Cleared existing data.");
}

async function seedBankAccounts() {
  console.log("Seeding bank accounts...");
  
  for (const bankAccount of MOCK_BANK_ACCOUNTS) {
    await addDoc(collection(db, "banks"), {
      userId: bankAccount.userId,
      accountId: bankAccount.accountId,
      shareableId: bankAccount.shareableId,
      bankName: bankAccount.bankName,
      consentId: bankAccount.consentId,
      currentBalance: bankAccount.currentBalance,
      availableBalance: bankAccount.availableBalance,
      mask: bankAccount.mask,
      type: bankAccount.type,
      subtype: bankAccount.subtype,
      institutionId: bankAccount.institutionId,
      name: bankAccount.name,
      officialName: bankAccount.officialName,
      mock: true,
    });
  }
  
  console.log(`Seeded ${MOCK_BANK_ACCOUNTS.length} bank accounts.`);
}

async function seedTransactions() {
  console.log("Seeding transactions...");
  
  let count = 0;
  for (const transaction of MOCK_TRANSACTIONS) {
    await addDoc(collection(db, "transactions"), {
      transactionId: transaction.transactionId,
      name: transaction.name,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      date: transaction.date,
      paymentChannel: transaction.paymentChannel,
      channel: transaction.channel,
      senderBankId: transaction.senderBankId,
      receiverBankId: transaction.receiverBankId,
      pending: transaction.pending,
      status: transaction.status,
      $createdAt: transaction.$createdAt,
    });
    count++;
  }
  
  console.log(`Seeded ${count} transactions.`);
}

async function main() {
  try {
    console.log("Starting Firestore seed for testuser2...");
    await clearExistingData();
    await seedBankAccounts();
    await seedTransactions();
    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error seeding Firestore:", error);
    process.exit(1);
  }
}

main();
