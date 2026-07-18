"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function SendPoButton({ poId }: { poId: string }) {
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
            const result = await sendPurchaseOrder(poId);
            if (result.error) {
              setError(result.error);
              return;
            }
            setNotice(
              result.emailed
                ? `Emailed to ${result.supplierEmail}`
                : result.supplierEmail
                  ? `Marked as sent — email failed (${result.emailError ?? "unknown error"}), send the PDF manually.`
                  : "Marked as sent — no supplier email on file, send the PDF manually."
            );
            router.refresh();
          })
        }
      >
        {isPending ? "Sending..." : "Send to Supplier"}
      </Button>
      {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
