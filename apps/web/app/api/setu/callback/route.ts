import { NextRequest, NextResponse } from "next/server";
import { updateConsentStatus, getSetuAccountData } from "@/lib/actions/setu.actions";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  const consentId = request.nextUrl.searchParams.get("consentId");
  const status = request.nextUrl.searchParams.get("status");
  const redirectUrl = new URL("/", request.url);

  if (consentId) {
    redirectUrl.searchParams.set("consentId", consentId);
    
    // Update consent status in Firestore
    const finalStatus = status || "APPROVED";
    await updateConsentStatus(consentId, finalStatus);
    
    // If consent is approved, fetch account data
    if (finalStatus === "APPROVED" || finalStatus === "approved") {
      try {
        const accountData = await getSetuAccountData(consentId);
        await setDoc(doc(db, "banks", consentId), {
          accountData: accountData,
          status: "active",
        }, { merge: true });
      } catch (error) {
        console.error("Failed to fetch account data after consent approval:", error);
      }
    }
  }
  
  if (status) redirectUrl.searchParams.set("status", status);

  return NextResponse.redirect(redirectUrl);
}