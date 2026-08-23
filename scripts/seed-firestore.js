/**
 * Firestore Seed Script
 * Populates Firestore with mock bank accounts and transactions for testuser2
 */

require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } = require("firebase/firestore");

const MOCK_USER_ID = "testuser2";

const MOCK_BANK_ACCOUNTS = [
  {
    id: "bank_hdfc_savings",
    bankDocumentId: "bank_hdfc_savings",
    userId: MOCK_USER_ID,
    accountId: "HDFC123456789",
    shareableId: "hdfc-savings-123",
    bankName: "HDFC Bank",
    name: "HDFC Savings Account",
    officialName: "HDFC Bank Savings Account",
    currentBalance: 210000,
    availableBalance: 210000,
    mask: "5678",
    type: "depository",
    subtype: "savings",
    institutionId: "hdfc",
    consentId: "consent_hdfc_001",
  },
  {
    id: "bank_icici_salary",
    bankDocumentId: "bank_icici_salary",
    userId: MOCK_USER_ID,
    accountId: "ICICI987654321",
    shareableId: "icici-salary-456",
    bankName: "ICICI Bank",
    name: "ICICI Salary Account",
    officialName: "ICICI Bank Salary Account",
    currentBalance: 145000,
    availableBalance: 145000,
    mask: "4321",
    type: "depository",
    subtype: "checking",
    institutionId: "icici",
    consentId: "consent_icici_001",
  },
];

const SUBSCRIPTIONS = [
  { id: "aws_cloud", name: "AWS Hosting", merchant: "AWS Cloud Services", averageAmount: 2450, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
  { id: "chatgpt_plus", name: "ChatGPT Plus", merchant: "OpenAI ChatGPT", averageAmount: 1650, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
  { id: "cult_fit", name: "Cult.fit Pass", merchant: "Cult.fit Gym", averageAmount: 1250, frequency: "Monthly", category: "Healthcare", startDate: "2026-01-01" },
  { id: "github_copilot", name: "GitHub Copilot", merchant: "GitHub", averageAmount: 830, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
  { id: "netflix_4k", name: "Netflix Premium", merchant: "Netflix", averageAmount: 649, frequency: "Monthly", category: "Entertainment", startDate: "2026-01-01" },
  { id: "swiggy_one", name: "Swiggy One Membership", merchant: "Swiggy One", averageAmount: 299, frequency: "Monthly", category: "Dining", startDate: "2026-01-01" },
  { id: "youtube_premium", name: "YouTube Premium", merchant: "YouTube Premium", averageAmount: 189, frequency: "Monthly", category: "Entertainment", startDate: "2026-01-01" },
  { id: "apple_one", name: "Apple One", merchant: "Apple Subscription", averageAmount: 195, frequency: "Monthly", category: "Entertainment", startDate: "2026-01-01" },
  { id: "spotify_premium", name: "Spotify Premium", merchant: "Spotify", averageAmount: 119, frequency: "Monthly", category: "Entertainment", startDate: "2026-01-01" },
  { id: "amazon_prime", name: "Amazon Prime", merchant: "Amazon Prime", averageAmount: 125, frequency: "Monthly", category: "Shopping", startDate: "2026-01-01" },
  { id: "icloud_storage", name: "iCloud+ 200GB", merchant: "Apple iCloud", averageAmount: 75, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
  { id: "google_one", name: "Google One 100GB", merchant: "Google Storage", averageAmount: 130, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
  { id: "zomato_gold", name: "Zomato Gold", merchant: "Zomato Gold", averageAmount: 99, frequency: "Monthly", category: "Dining", startDate: "2026-01-01" },
  { id: "notion_plus", name: "Notion Personal", merchant: "Notion AI", averageAmount: 415, frequency: "Monthly", category: "Software", startDate: "2026-01-01" },
];

const generateTransactionId = (type, date) => {
  return `TXN_${type}_${date.replace(/-/g, "")}_${Math.floor(Math.random() * 1000)}`;
};

const createTransaction = (id, name, amount, type, category, date, bankId, paymentChannel = "online") => ({
  $id: id,
  transactionId: generateTransactionId(type, date),
  name,
  amount,
  type,
  category,
  date,
  paymentChannel,
  senderBankId: type === "debit" ? bankId : null,
  receiverBankId: type === "credit" ? bankId : null,
  pending: false,
  status: "Success",
  channel: paymentChannel,
  $createdAt: date,
});

const generateHistoricalTransactions = () => {
  const transactions = [];
  const months = [
    { year: 2026, month: 3, name: "March", salary: 210000 },
    { year: 2026, month: 4, name: "April", salary: 210000 },
    { year: 2026, month: 5, name: "May", salary: 225000 },
    { year: 2026, month: 6, name: "June", salary: 225000 },
    { year: 2026, month: 7, name: "July", salary: 240000 },
    { year: 2026, month: 8, name: "August", salary: 240000 },
  ];

  let transactionCounter = 1;

  months.forEach(({ year, month, salary }) => {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const salaryDate = `${monthStr}-01`;
    const salaryBankId = "bank_icici_salary";

    // Monthly Salary Credit (Inflow)
    transactions.push(
      createTransaction(
        `txn_${transactionCounter++}`,
        "Monthly Salary Credit",
        salary,
        "credit",
        "Salary",
        salaryDate,
        salaryBankId,
        "bank_transfer"
      )
    );

    // Fixed Essential Expenses
    const essentialExpenses = [
      { name: "Rent Payment", amount: 25000, category: "Rent", day: 5, bankId: "bank_hdfc_savings" },
      { name: "Groceries - BigBasket", amount: 8500, category: "Groceries", day: 10, bankId: "bank_hdfc_savings" },
      { name: "Utilities - Electricity Bill", amount: 3200, category: "Utilities", day: 15, bankId: "bank_hdfc_savings" },
      { name: "Fuel & Transport", amount: 4500, category: "Fuel/Transport", day: 20, bankId: "bank_icici_salary" },
    ];

    essentialExpenses.forEach((expense) => {
      const date = `${monthStr}-${String(expense.day).padStart(2, "0")}`;
      transactions.push(
        createTransaction(
          `txn_${transactionCounter++}`,
          expense.name,
          expense.amount,
          "debit",
          expense.category,
          date,
          expense.bankId,
          "online"
        )
      );
    });

    // 14 Recurring Subscriptions charged monthly
    SUBSCRIPTIONS.forEach((sub, idx) => {
      const day = Math.min(28, (idx * 2) + 1);
      transactions.push(
        createTransaction(
          `txn_${transactionCounter++}`,
          sub.merchant,
          sub.averageAmount,
          "debit",
          "Subscription",
          `${monthStr}-${String(day).padStart(2, "0")}`,
          "bank_icici_salary",
          "online"
        )
      );
    });

    // Discretionary Expenses
    const discretionaryExpenses = [
      { name: "Swiggy Food Delivery", amount: 2400, category: "Dining", day: 12, bankId: "bank_icici_salary" },
      { name: "Zomato Food Order", amount: 1800, category: "Dining", day: 18, bankId: "bank_icici_salary" },
      { name: "Amazon Shopping", amount: 5500, category: "Shopping", day: 14, bankId: "bank_hdfc_savings" },
      { name: "Flipkart Order", amount: 3200, category: "Shopping", day: 22, bankId: "bank_hdfc_savings" },
      { name: "Movie Tickets", amount: 1200, category: "Entertainment", day: 28, bankId: "bank_icici_salary" },
    ];

    discretionaryExpenses.forEach((expense) => {
      const date = `${monthStr}-${String(expense.day).padStart(2, "0")}`;
      transactions.push(
        createTransaction(
          `txn_${transactionCounter++}`,
          expense.name,
          expense.amount,
          "debit",
          expense.category,
          date,
          expense.bankId,
          "online"
        )
      );
    });
  });

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const MOCK_TRANSACTIONS = generateHistoricalTransactions();

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
  const bankIds = MOCK_BANK_ACCOUNTS.map(b => b.bankDocumentId);
  if (bankIds.length > 0) {
    const transactionsQuery = query(collection(db, "transactions"), where("senderBankId", "in", bankIds));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    for (const txnDoc of transactionsSnapshot.docs) {
      await deleteDoc(doc(db, "transactions", txnDoc.id));
    }
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
    console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log("Firebase Config:", JSON.stringify(firebaseConfig, null, 2));
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
