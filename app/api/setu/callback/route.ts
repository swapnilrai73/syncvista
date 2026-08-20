import { NextRequest, NextResponse } from "next/server";

export function GET(request: NextRequest) {
  const consentId = request.nextUrl.searchParams.get("consentId");
  const status = request.nextUrl.searchParams.get("status");
  const redirectUrl = new URL("/my-banks", request.url);

  if (consentId) redirectUrl.searchParams.set("consentId", consentId);
  if (status) redirectUrl.searchParams.set("status", status);

  return NextResponse.redirect(redirectUrl);
}