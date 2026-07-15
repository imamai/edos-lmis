"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postStockCountCorrection } from "@/lib/actions/inventory";

function fmt(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

export function PostStockCorrectionButton({
  itemId,
  checkDate,
  difference,
}: {
  itemId: string;
  checkDate: string;
  difference: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  if (Math.abs(difference) < 0.01) return null;

  if (posted) {
    return <span className="text-xs text-success">Correction posted</span>;
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await postStockCountCorrection(itemId, checkDate);
            if (result?.error) setError(result.error);
            else {
              setPosted(true);
              router.refresh();
            }
          })
        }
        className="text-xs font-medium text-primary underline hover:no-underline disabled:opacity-50"
        title="Posts a stock count correction transaction so the inventory balance matches this physical count"
      >
        {isPending ? "Posting..." : `Post correction (${difference > 0 ? "+" : ""}${fmt(difference)})`}
      </button>
      {error && <p className="text-xs text-critical">{error}</p>}
    </div>
  );
}
