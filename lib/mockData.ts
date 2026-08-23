/**
 * Mock Seed Data for testuser2
 *
 * Updated with realistic salary-to-expense ratios so inflow exceeds outflow,
 * giving proper retained income calculations, clean sparkline trends, and 14 active subscriptions.
 */

export const MOCK_USER_ID = "testuser2";

// Bank Accounts for testuser2
export const MOCK_BANK_ACCOUNTS = [
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

// Expense Categories
export const EXPENSE_CATEGORIES = {
  essential: [
    { id: "rent", name: "Rent", monthlyAmount: 25000 },
    { id: "groceries", name: "Groceries", monthlyAmount: 8500 },
    { id: "utilities", name: "Utilities", monthlyAmount: 3200 },
    { id: "fuel_transport", name: "Fuel/Transport", monthlyAmount: 4500 },
  ],
  discretionary: [
    { id: "dining", name: "Dining & Food Delivery", monthlyAmount: 3500 },
    { id: "shopping", name: "Shopping", monthlyAmount: 4000 },
    { id: "travel", name: "Travel", monthlyAmount: 2000 },
    { id: "entertainment", name: "Entertainment", monthlyAmount: 1500 },
  ],
};

// 14 Recurring Subscriptions for Leakage Tracking
export const SUBSCRIPTIONS = [
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

// Helper function to generate transaction ID
const generateTransactionId = (type: string, date: string): string => {
  return `TXN_${type}_${date.replace(/-/g, "")}_${Math.floor(Math.random() * 1000)}`;
};

// Helper function to create transaction
const createTransaction = (
    id: string,
    name: string,
    amount: number,
    type: "credit" | "debit",
    category: string,
    date: string,
    bankId: string,
    paymentChannel: string = "online"
) => ({
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

// Generate 6 months of historical transactions (March 2026 - August 2026)
export const generateHistoricalTransactions = () => {
  const transactions: any[] = [];
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

export const MOCK_TRANSACTIONS = generateHistoricalTransactions();

export const MOCK_DATA_SUMMARY = {
  totalBankAccounts: MOCK_BANK_ACCOUNTS.length,
  totalBalance: MOCK_BANK_ACCOUNTS.reduce((sum, acc) => sum + acc.currentBalance, 0),
  totalTransactions: MOCK_TRANSACTIONS.length,
  dateRange: {
    start: "2026-03-01",
    end: "2026-08-31",
  },
  monthlySalary: 240000,
  essentialExpensesTotal: 41200,
  subscriptionsCount: SUBSCRIPTIONS.length,
  subscriptionLeakageTotal: SUBSCRIPTIONS.reduce((sum, s) => sum + s.averageAmount, 0),
};

export const MOCK_DATA = {
  userId: MOCK_USER_ID,
  bankAccounts: MOCK_BANK_ACCOUNTS,
  transactions: MOCK_TRANSACTIONS,
  categories: EXPENSE_CATEGORIES,
  subscriptions: SUBSCRIPTIONS,
  summary: MOCK_DATA_SUMMARY,
};