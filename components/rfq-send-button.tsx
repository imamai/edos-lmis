"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendRfq } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function RfqSendButton({ rfqId }: { rfqId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendRfq(rfqId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setNotice(
              `Emailed ${result.emailedCount} of ${result.supplierCount} supplier(s).` +
                (result.emailError ? ` Failure reason: ${result.emailError}` : "")
            );
            router.refresh();
          })
        }
      >
        {isPending ? "Sending..." : "Send to Suppliers"}
      </Button>
      {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
