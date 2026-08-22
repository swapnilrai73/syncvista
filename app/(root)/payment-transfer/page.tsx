"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import HeaderBox from "@/components/HeaderBox";
import { BankDropdown } from "@/components/BankDropdown";
import { getAccounts } from "@/lib/actions/bank.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const formSchema = z.object({
  senderBankId: z.string().min(1, "Please select a bank account"),
  beneficiary: z.string().min(1, "Please enter beneficiary account number or UPI ID"),
  ifsc: z.string().optional(),
  amount: z.string().min(1, "Please enter amount").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Please enter a valid amount"
  ),
  transferMode: z.string().min(1, "Please select transfer mode"),
  note: z.string().optional(),
});

const Transfer = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      senderBankId: "",
      beneficiary: "",
      ifsc: "",
      amount: "",
      transferMode: "",
      note: "",
    },
  });

  const transferMode = form.watch("transferMode");
  const { isValid } = form.formState;

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      const user = await getLoggedInUser();
      if (user) {
        const accountsData = await getAccounts({ userId: user.userId });
        if (accountsData?.data) {
          setAccounts(accountsData.data);
          if (accountsData.data.length > 0) {
            form.setValue("senderBankId", accountsData.data[0].bankDocumentId);
          }
        }
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Failed to load bank accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const user = await getLoggedInUser();
      if (!user) {
        toast.error("Please log in to continue");
        router.push("/sign-in");
        return;
      }

      const transactionData = {
        name: values.beneficiary,
        amount: values.amount,
        senderBankId: values.senderBankId,
        transferMode: values.transferMode,
        note: values.note,
      };

      const result = await createTransaction(transactionData);

      if (result) {
        toast.success(`Transfer successful! Transaction ID: ${result.transactionId}`);
        form.reset();
        await loadAccounts();
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error(error.message || "Transfer failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="payment-transfer">
      <HeaderBox
        title="Payment Transfer"
        subtext="Send money to any bank account or UPI ID"
      />

      <section className="size-full pt-5">
        <div className="payment-transfer-form">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="senderBankId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source Bank Account</FormLabel>
                    <FormControl>
                      {isLoading ? (
                        <div className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />
                      ) : (
                        <BankDropdown
                          accounts={accounts}
                          setValue={form.setValue}
                          otherStyles="w-full"
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="beneficiary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {transferMode === "UPI" ? "UPI ID" : "Beneficiary Account Number"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          transferMode === "UPI"
                            ? "example@upi"
                            : "Enter account number"
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {transferMode !== "UPI" && (
                <FormField
                  control={form.control}
                  name="ifsc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter IFSC code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter amount in INR"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transferMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transfer Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select transfer mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="IMPS">IMPS</SelectItem>
                        <SelectItem value="NEFT">NEFT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a note for this transfer"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-center pt-4">
                <Button
                  type="submit"
                  className={`
                    min-w-[200px] px-8 py-3 rounded-lg font-semibold text-white
                    ${isValid 
                      ? 'bg-[#0179FE] hover:bg-[#0165D0] shadow-md' 
                      : 'bg-[#0179FE]/70 hover:bg-[#0179FE]/70 cursor-not-allowed'
                    }
                    transition-all duration-200
                  `}
                  disabled={!isValid || isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Simulating...
                    </>
                  ) : (
                    "Transfer Now"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </section>
    </section>
  );
};

export default Transfer;