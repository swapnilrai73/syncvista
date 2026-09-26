import { NextRequest, NextResponse } from "next/server";
import { updateConsentStatus, getSetuAccountData } from "@/lib/actions/setu.actions";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getLoggedInUser } from "@/lib/actions/user.actions";

export async function GET(request: NextRequest) {
  const consentId = request.nextUrl.searchParams.get("consentId");
  const status = request.nextUrl.searchParams.get("status");
  const redirectUrl = new URL("/", request.url);

  if (consentId) {
    redirectUrl.searchParams.set("consentId", consentId);
    
    // 1. Authenticate the request
    const user = await getLoggedInUser();
    if (!user) {
      console.error("Setu callback failed: User is not authenticated.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify ownership of this consentId
    try {
      const bankDoc = await getDoc(doc(db, "banks", consentId));
      if (!bankDoc.exists() || bankDoc.data().userId !== user.$id) {
        console.error(`Setu callback failed: Consent ID ${consentId} does not belong to user ${user.$id}`);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (error) {
      console.error("Setu callback failed to verify consent ownership:", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    
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