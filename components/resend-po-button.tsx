"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function ResendPoButton({ poId }: { poId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await resendPurchaseOrder(poId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setNotice(`Revised PO emailed to ${result.supplierEmail}`);
            router.refresh();
          })
        }
      >
        {isPending ? "Sending..." : "Resend Corrected PO"}
      </Button>
      {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
