"use server";

import { parseStringify } from "../utils";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type SetuEnvironment = "sandbox" | "production";

type SetuConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
};

const getSetuConfig = (): SetuConfig | null => {
  const environment = (process.env.SETU_ENV || "sandbox") as SetuEnvironment;
  const baseUrl = environment === "production"
    ? "https://fiu.setu.co"
    : "https://fiu-sandbox.setu.co";

  const { SETU_CLIENT_ID, SETU_CLIENT_SECRET, SETU_PRODUCT_INSTANCE_ID } = process.env;
  if (!SETU_CLIENT_ID || !SETU_CLIENT_SECRET || !SETU_PRODUCT_INSTANCE_ID) {
    console.warn("Setu credentials not configured, falling back to mock mode");
    return null;
  }

  return {
    baseUrl,
    clientId: SETU_CLIENT_ID,
    clientSecret: SETU_CLIENT_SECRET,
    productInstanceId: SETU_PRODUCT_INSTANCE_ID,
  };
};

const getSetuAccessToken = async (config: SetuConfig) => {
  const response = await fetch("https://orgservice-prod.setu.co/v1/users/login", {
    method: "POST",
    headers: {
      client: "bridge",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientID: config.clientId,
      grant_type: "client_credentials",
      secret: config.clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Setu authentication failed (${response.status})`);
  }

  const data = await response.json();
  return data.accessToken || data.access_token;
};

const getMockAccountData = () => ({
  bankName: "SyncVista Demo Bank",
  accountNumber: "9876543210",
  accountId: "mock-account-9876543210",
  balance: 125000,
  availableBalance: 125000,
  currentBalance: 125000,
  institutionId: "syncvista-demo-bank",
  name: "SyncVista Demo Savings",
  officialName: "SyncVista Demo Bank Savings Account",
  mask: "3210",
  type: "depository",
  subtype: "savings",
  transactions: [
    {
      id: "mock-transaction-1",
      name: "Salary Credit",
      description: "Salary Credit",
      amount: 85000,
      type: "credit",
      paymentChannel: "online",
      category: "Income",
      date: "2026-08-01",
      pending: false,
    },
    {
      id: "mock-transaction-2",
      name: "Grocery Store",
      description: "Grocery Store",
      amount: 2450,
      type: "debit",
      paymentChannel: "in store",
      category: "Food and Drink",
      date: "2026-08-12",
      pending: false,
    },
  ],
});

export const createSetuConsent = async (user: User) => {
  try {
    const config = getSetuConfig();
    
    // Fallback to mock mode if credentials not configured
    if (!config || process.env.SETU_ENV === "sandbox") {
      const consentId = `mock-${user.$id}`;
      await setDoc(doc(db, "banks", consentId), {
        userId: user.$id,
        consentId,
        bankId: consentId,
        accountId: "mock-account-9876543210",
        shareableId: consentId,
        status: "approved",
        mock: true,
        accountData: getMockAccountData(),
      });

      return parseStringify({
        consentId,
        mock: true,
        consentUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/setu/callback?consentId=${consentId}&status=approved`,
        accountData: getMockAccountData(),
      });
    }

    const accessToken = await getSetuAccessToken(config);
    const response = await fetch(`${config.baseUrl}/v2/consents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-product-instance-id": config.productInstanceId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        vua: process.env.SETU_VUA || user.email,
        consentDuration: { unit: "MONTH", value: 1 },
        consentMode: "VIEW",
        fetchType: "ONETIME",
        consentTypes: ["TRANSACTIONS"],
        fiTypes: ["DEPOSIT"],
        dataRange: {
          from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString(),
        },
        dataLife: { unit: "MONTH", value: 0 },
        frequency: { unit: "MONTH", value: 1 },
        purpose: {
          code: "101",
          text: "Personal finance management",
          category: { type: "PERSONAL FINANCE" },
          refUri: "https://api.rebit.org.in/aa/purpose/101.xml",
        },
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/setu/callback`,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Setu consent creation failed (${response.status}): ${details}`);
    }

    const data = await response.json();
    const consentId = data.consentId || data.id;
    if (!consentId) throw new Error("Setu did not return a consent ID");

    await setDoc(doc(db, "banks", consentId), {
      userId: user.$id,
      consentId,
      bankId: consentId,
      accountId: consentId,
      shareableId: consentId,
      status: "pending",
    });

    return parseStringify({
      consentId,
      consentUrl: data.consentUrl || data.url || data.redirectUrl,
    });
  } catch (error) {
    console.error("Setu consent creation failed:", error);
    return {
      error: error instanceof Error
        ? error.message
        : "Unable to start bank connection.",
    };
  }
};

export const getSetuAccountData = async (consentId: string) => {
  try {
    const config = getSetuConfig();
    
    // Fallback to mock mode if credentials not configured
    if (!config || process.env.SETU_ENV === "sandbox") {
      const bank = await getDoc(doc(db, "banks", consentId));
      return bank.exists() && bank.data().accountData
        ? parseStringify(bank.data().accountData)
        : parseStringify(getMockAccountData());
    }

    const accessToken = await getSetuAccessToken(config);
    const response = await fetch(`${config.baseUrl}/v2/consents/${consentId}/data`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Setu account data request failed (${response.status})`);
    }

    return parseStringify(await response.json());
  } catch (error) {
    console.error("Setu account data request failed:", error);
    throw error;
  }
};

export const pollConsentStatus = async (consentId: string): Promise<string> => {
  try {
    const config = getSetuConfig();
    
    // Fallback to mock mode if credentials not configured
    if (!config || process.env.SETU_ENV === "sandbox") {
      return "APPROVED";
    }

    const accessToken = await getSetuAccessToken(config);
    const response = await fetch(`${config.baseUrl}/v2/consents/${consentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Setu consent status check failed (${response.status})`);
    }

    const data = await response.json();
    return data.status || "PENDING";
  } catch (error) {
    console.error("Setu consent status polling failed:", error);
    return "FAILED";
  }
};

export const updateConsentStatus = async (consentId: string, status: string) => {
  try {
    await setDoc(doc(db, "banks", consentId), { status }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Failed to update consent status:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
};