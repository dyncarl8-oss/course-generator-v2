import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Loader2 } from "lucide-react";

interface WithdrawRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  availableBalance: number;
  apiBasePath?: string;
}

export function WithdrawRequestDialog({
  open,
  onOpenChange,
  companyId,
  availableBalance,
  apiBasePath,
}: WithdrawRequestDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState(availableBalance.toString());

  useEffect(() => {
    if (open) {
      setAmount(availableBalance.toString());
    }
  }, [open, availableBalance]);

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: number) => {
      const endpoint = apiBasePath
        ? `${apiBasePath}/withdraw-request`
        : `/api/dashboard/${companyId}/withdraw-request`;
      return apiRequest("POST", endpoint, { amount: withdrawAmount });
    },
    onSuccess: (data) => {
      toast({
        title: "Withdraw Request Sent",
        description: `Your request for $${data.amount.toFixed(2)} has been submitted. Your available balance has been updated.`,
      });
      // Invalidate queries to refresh balance
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Submit Request",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = () => {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }
    if (withdrawAmount > availableBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You cannot withdraw more than your available balance.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    withdrawMutation.mutate(withdrawAmount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Withdrawal</DialogTitle>
          <DialogDescription>
            Enter the amount you would like to withdraw from your available earnings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-400/10">
              <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold">${availableBalance.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={availableBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <p>Your withdrawal request will be processed manually. You'll receive payment directly to your Whop account within 2-5 business days.</p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || availableBalance <= 0 || !amount || parseFloat(amount) <= 0}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
