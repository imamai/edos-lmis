"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSupplierActive } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function SupplierActiveToggle({ supplierId, isActive }: { supplierId: string; isActive: boolean }) {
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
            const result = await setSupplierActive(supplierId, !isActive);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Saving..." : isActive ? "Mark Inactive" : "Mark Active"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
