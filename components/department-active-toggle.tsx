"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDepartmentActive } from "@/lib/actions/catalog";
import { Badge } from "@/components/ui/badge";

export function DepartmentActiveToggle({ departmentId, isActive }: { departmentId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate" : "Click to reactivate"}
      onClick={() =>
        startTransition(async () => {
          await setDepartmentActive(departmentId, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
