"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendQuotation } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";

export function ResendQuotationButton({ quotationId }: { quotationId: string }) {
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
            const result = await resendQuotation(quotationId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setNotice(`Revised quotation emailed to ${result.customerEmail}`);
            router.refresh();
          })
        }
      >
        {isPending ? "Sending..." : "Resend Corrected Quotation"}
      </Button>
      {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
