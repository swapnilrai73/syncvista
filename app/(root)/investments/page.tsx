"use client";

import { useState, useEffect } from "react";
import HeaderBox from '@/components/HeaderBox';
import CasUploadCard from '@/components/CasUploadCard';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getInvestmentSummary } from '@/lib/actions/investment.actions';
import { TrendingUp, PieChart, BarChart3, Wallet } from 'lucide-react';
import { MOCK_DATA } from '@/lib/mockData';

const Investments = () => {
  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [investmentSummary, setInvestmentSummary] = useState<InvestmentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedIn(user);
        
        if (user) {
          const summary = await getInvestmentSummary({ userId: user.$id });
          setInvestmentSummary(summary);
        }
      } catch (error) {
        console.error("Error loading investment data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <section className='flex'>
      <div className="investments">
        <HeaderBox 
          title="Investments & Net Worth"
          subtext="Manage your equity, mutual funds, and portfolio holdings"
        />

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-center size-10 rounded-full bg-blue-50">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
            </div>
            <p className="text-24 font-semibold text-gray-900">
              {isLoading ? '₹0' : `₹${(investmentSummary?.totalPortfolioValue || 0).toLocaleString('en-IN')}`}
            </p>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-center size-10 rounded-full bg-green-50">
                <PieChart className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Equity</p>
            </div>
            <p className="text-24 font-semibold text-gray-900">
              {isLoading ? '₹0' : `₹${(investmentSummary?.equity || 0).toLocaleString('en-IN')}`}
            </p>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-center size-10 rounded-full bg-purple-50">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Mutual Funds</p>
            </div>
            <p className="text-24 font-semibold text-gray-900">
              {isLoading ? '₹0' : `₹${(investmentSummary?.mutualFunds || 0).toLocaleString('en-IN')}`}
            </p>
          </div>

          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-center size-10 rounded-full bg-orange-50">
                <Wallet className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-sm font-medium text-gray-600">Other Assets / Debt</p>
            </div>
            <p className="text-24 font-semibold text-gray-900">
              {isLoading ? '₹0' : `₹${(investmentSummary?.unparsedHoldings || 0).toLocaleString('en-IN')}`}
            </p>
          </div>
        </div>

        {/* CAS Upload Section */}
        <div className="mt-8">
          <h2 className="header-2 mb-4">Upload Consolidated Account Statement (CAS)</h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Upload Component */}
            <div className="lg:col-span-7">
              <CasUploadCard userId={loggedIn?.$id || ''} />
            </div>
            
            {/* Right Column: CAS Information & Guide */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 h-full">
                <h3 className="text-18 font-semibold text-gray-900 mb-4">How to get your CAS PDF?</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="flex-center size-6 rounded-full bg-blue-50 flex-shrink-0 mt-0.5">
                      <span className="text-12 font-semibold text-blue-600">1</span>
                    </div>
                    <p className="text-14 text-gray-600 leading-relaxed">Request CDSL/NSDL Consolidated Account Statement via email from your depository participant.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-center size-6 rounded-full bg-blue-50 flex-shrink-0 mt-0.5">
                      <span className="text-12 font-semibold text-blue-600">2</span>
                    </div>
                    <p className="text-14 text-gray-600 leading-relaxed">Password format: PAN in CAPITAL letters or Date of Birth (DDMMYYYY).</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-center size-6 rounded-full bg-blue-50 flex-shrink-0 mt-0.5">
                      <span className="text-12 font-semibold text-blue-600">3</span>
                    </div>
                    <p className="text-14 text-gray-600 leading-relaxed">Syncs equity and mutual fund folios securely without storing passwords.</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Investments;
