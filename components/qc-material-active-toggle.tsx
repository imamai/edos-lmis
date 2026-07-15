"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setQcMaterialActive } from "@/lib/actions/qc";
import { Badge } from "@/components/ui/badge";

export function QcMaterialActiveToggle({ materialId, isActive }: { materialId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate" : "Click to reactivate"}
      onClick={() =>
        startTransition(async () => {
          await setQcMaterialActive(materialId, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
