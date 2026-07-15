"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeRfq } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function CloseRfqButton({ rfqId }: { rfqId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await closeRfq(rfqId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Closing..." : "Close RFQ"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
