"use client";

import Image from "next/image";
import { useState } from "react";
import { createSetuConsent } from "@/lib/actions/setu.actions";
import { Button } from "./ui/button";

const SetuConnect = ({ user, variant }: SetuConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const connectBank = async () => {
    setIsLoading(true);
    try {
      const consent = await createSetuConsent(user);
      if (!consent?.consentUrl) throw new Error("Setu did not return a consent URL");
      window.location.assign(consent.consentUrl);
    } catch (error) {
      console.error("Unable to start Setu bank connection:", error);
      setIsLoading(false);
    }
  };

  const content = (
    <>
      <Image src="/icons/connect-bank.svg" alt="connect bank" width={24} height={24} />
      <p className={variant === "primary" ? "hidden" : "text-[16px] font-semibold text-black-2"}>
        Connect bank
      </p>
    </>
  );

  return (
    <Button
      onClick={connectBank}
      disabled={isLoading}
      variant={variant === "ghost" ? "ghost" : "default"}
      className={variant === "primary" ? "setuconnect-primary" : "setuconnect-default"}
    >
      {isLoading ? "Connecting..." : content}
    </Button>
  );
};

export default SetuConnect;