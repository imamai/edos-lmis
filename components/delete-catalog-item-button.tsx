"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteSupplierCatalogItem } from "@/lib/actions/procurement";
import { Trash2 } from "lucide-react";

export function DeleteCatalogItemButton({ catalogItemId, supplierId }: { catalogItemId: string; supplierId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <span className="flex items-center gap-1 text-xs">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSupplierCatalogItem(catalogItemId, supplierId);
              if (result?.error) {
                setError(result.error);
                setConfirming(false);
              } else {
                router.refresh();
              }
            })
          }
          className="font-medium text-critical hover:underline"
        >
          {isPending ? "Removing..." : "Confirm"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground hover:underline">
          Cancel
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Remove from catalogue"
        className="rounded p-1 text-muted-foreground hover:bg-critical/10 hover:text-critical"
      >
        <Trash2 size={14} />
      </button>
      {error && <p className="mt-1 text-xs text-critical">{error}</p>}
    </>
  );
}
