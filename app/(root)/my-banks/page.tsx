"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox';
import { Plus, Copy, ArrowRight, Activity } from "lucide-react";
import { getAccounts, getAccount } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MyBanks = () => {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountTransactions, setAccountTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedIn(user);
        
        if (user) {
          const accountsData = await getAccounts({ userId: user.$id });
          if (accountsData?.data) {
            setAccounts(accountsData.data);
            setTotalBalance(accountsData.totalCurrentBalance || 0);
            
            // Auto-select first account if available
            if (accountsData.data.length > 0) {
              setSelectedAccount(accountsData.data[0]);
              await loadAccountTransactions(accountsData.data[0].bankDocumentId);
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const loadAccountTransactions = async (bankDocumentId: string) => {
    setIsLoadingTransactions(true);
    try {
      const accountData = await getAccount({ bankDocumentId });
      if (accountData?.transactions) {
        setAccountTransactions(accountData.transactions.slice(0, 5));
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleAddBank = () => {
    router.push("/");
  };

  const handleCardClick = (account: Account) => {
    setSelectedAccount(account);
    loadAccountTransactions(account.bankDocumentId);
  };

  const handleTransferFunds = () => {
    router.push('/payment-transfer');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (isLoading) {
    return (
      <section className='flex'>
        <div className="my-banks w-full">
          <HeaderBox 
            title="My Bank Accounts"
            subtext="Effortlessly manage your banking activites."
          />
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className='flex'>
      <div className="my-banks w-full max-w-7xl mx-auto">
        <HeaderBox 
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />

        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Balance Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Total Bank Balance</h3>
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatAmount(totalBalance)}</p>
            <p className="text-sm text-gray-500 mt-1">Across all accounts</p>
          </div>

          {/* Connected Banks Count Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">Connected Banks</h3>
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{accounts.length} Active Account{accounts.length !== 1 ? 's' : ''}</p>
            <p className="text-sm text-gray-500 mt-1">Successfully linked</p>
          </div>

          {/* AA Sync Status Card */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-500">AA Sync Status</h3>
              <div className="relative">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
              </div>
            </div>
            <p className="text-lg font-semibold text-green-600">Connected via Setu AA</p>
            <p className="text-sm text-gray-500 mt-1">Data sync active</p>
          </div>
        </div>

        {/* Card Grid */}
        <div className="space-y-4">
          <h2 className="header-2">
            Your cards
          </h2>
          <div className="flex flex-wrap gap-6">
            {accounts.map((a: Account) => (
              <div 
                key={a.bankDocumentId}
                onClick={() => handleCardClick(a)}
                className={`cursor-pointer transition-all ${
                  selectedAccount?.bankDocumentId === a.bankDocumentId 
                    ? 'ring-4 ring-blue-500 ring-offset-2 rounded-[20px]' 
                    : ''
                }`}
              >
                <BankCard 
                  account={a}
                  userName={loggedIn?.firstName || ''}
                />
              </div>
            ))}
            
            {/* Add New Card Placeholder */}
            <div
              onClick={handleAddBank}
              className="relative flex h-[190px] w-full max-w-[320px] justify-center items-center rounded-[20px] border-2 border-dashed border-gray-300 bg-gray-50 hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex-center size-12 rounded-full bg-gray-200">
                  <Plus className="size-6 text-gray-500" />
                </div>
                <p className="text-16 font-semibold text-gray-600">
                  Add Bank Account
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Account Detail Panel */}
        {selectedAccount && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Account Details */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Details</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Account Holder</span>
                  <span className="text-sm font-medium text-gray-900">{loggedIn?.firstName} {loggedIn?.lastName}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Account Number</span>
                  <span className="text-sm font-medium text-gray-900">●●●● ●●●● ●●●● {selectedAccount.mask}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">IFSC Code</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">SETU0001234</span>
                    <button 
                      onClick={() => copyToClipboard('SETU0001234')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Account Type</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">{selectedAccount.type}</span>
                </div>
                
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Primary
                  </span>
                </div>
                
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-gray-500">Available Balance</span>
                  <span className="text-sm font-bold text-gray-900">{formatAmount(selectedAccount.availableBalance)}</span>
                </div>
              </div>
              
              <Button 
                onClick={handleTransferFunds}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Transfer Funds From Here
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>

            {/* Right Column: Recent Activity */}
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                <Link 
                  href={`/transaction-history?id=${selectedAccount.bankDocumentId}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  View Full History
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              
              {isLoadingTransactions ? (
                <div className="flex justify-center items-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : accountTransactions.length > 0 ? (
                <div className="space-y-3">
                  {accountTransactions.map((transaction) => (
                    <div 
                      key={transaction.id || transaction.$id}
                      className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'credit' ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                          <Activity className={`w-5 h-5 ${
                            transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{transaction.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(new Date(transaction.date || transaction.$createdAt)).dateOnly}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${
                        transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <Activity className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm">No recent transactions</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MyBanks;