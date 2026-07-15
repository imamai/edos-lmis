"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStaffRoleActive } from "@/lib/actions/staff";
import { Badge } from "@/components/ui/badge";

export function StaffRoleToggle({
  userRoleId,
  roleName,
  isActive,
}: {
  userRoleId: string;
  roleName: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate" : "Click to reactivate"}
      onClick={() =>
        startTransition(async () => {
          await setStaffRoleActive(userRoleId, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "primary" : "neutral"}>{roleName}{!isActive ? " (inactive)" : ""}</Badge>
    </button>
  );
}
