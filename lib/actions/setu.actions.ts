"use server";

import { parseStringify } from "../utils";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

type SetuEnvironment = "sandbox" | "production";

type SetuConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  productInstanceId: string;
};

const getSetuConfig = (): SetuConfig => {
  const environment = (process.env.SETU_ENV || "sandbox") as SetuEnvironment;
  const baseUrl = environment === "production"
    ? "https://fiu.setu.co"
    : "https://fiu-uat.setu.co";

  const { SETU_CLIENT_ID, SETU_CLIENT_SECRET, SETU_PRODUCT_INSTANCE_ID } = process.env;
  if (!SETU_CLIENT_ID || !SETU_CLIENT_SECRET || !SETU_PRODUCT_INSTANCE_ID) {
    throw new Error("Setu credentials are not configured");
  }

  return {
    baseUrl,
    clientId: SETU_CLIENT_ID,
    clientSecret: SETU_CLIENT_SECRET,
    productInstanceId: SETU_PRODUCT_INSTANCE_ID,
  };
};

const getSetuAccessToken = async (config: SetuConfig) => {
  const response = await fetch(`${config.baseUrl}/v2/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Setu authentication failed (${response.status})`);
  }

  const data = await response.json();
  return data.accessToken || data.access_token;
};

export const createSetuConsent = async (user: User) => {
  try {
    const config = getSetuConfig();
    const accessToken = await getSetuAccessToken(config);
    const response = await fetch(`${config.baseUrl}/v2/consents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purpose: { code: "101", text: "Personal finance management" },
        fiTypes: ["DEPOSIT"],
        customer: { id: user.$id, email: user.email },
        redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/api/setu/callback`,
        productInstanceId: config.productInstanceId,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Setu consent creation failed (${response.status})`);
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
    throw error;
  }
};

export const getSetuAccountData = async (consentId: string) => {
  try {
    const config = getSetuConfig();
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