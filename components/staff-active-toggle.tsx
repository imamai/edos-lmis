"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStaffActive } from "@/lib/actions/staff";
import { Badge } from "@/components/ui/badge";

export function StaffActiveToggle({ userId, isActive }: { userId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate this account" : "Click to reactivate this account"}
      onClick={() =>
        startTransition(async () => {
          await setStaffActive(userId, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "critical"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
