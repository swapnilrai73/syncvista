"use client";

import Image from "next/image";
import { useState } from "react";
import { createSetuConsent } from "@/lib/actions/setu.actions";
import { Button } from "./ui/button";

const SetuConnect = ({ user, variant }: SetuConnectProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const connectBank = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const consent = await createSetuConsent(user);
      if ("error" in consent) throw new Error(consent.error);
      if (!consent?.consentUrl) throw new Error("Setu did not return a consent URL");
      window.location.assign(consent.mock ? "/" : consent.consentUrl);
    } catch (error) {
      console.error("Unable to start Setu bank connection:", error);
      setErrorMessage(error instanceof Error ? error.message : "Unable to connect bank.");
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
    <div className="flex flex-col gap-2">
      <Button
        onClick={connectBank}
        disabled={isLoading}
        variant={variant === "ghost" ? "ghost" : "default"}
        className={variant === "primary" ? "setuconnect-primary" : "setuconnect-default"}
      >
        {isLoading ? "Connecting..." : content}
      </Button>
      {errorMessage && <p className="form-message" role="alert">{errorMessage}</p>}
    </div>
  );
};

export default SetuConnect;