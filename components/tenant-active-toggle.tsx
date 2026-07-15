"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTenantActive } from "@/lib/actions/tenant-admin";
import { Badge } from "@/components/ui/badge";

export function TenantActiveToggle({ tenantId, isActive }: { tenantId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate this tenant (blocks all its staff logins)" : "Click to reactivate this tenant"}
      onClick={() =>
        startTransition(async () => {
          await setTenantActive(tenantId, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "critical"}>{isActive ? "Active" : "Deactivated"}</Badge>
    </button>
  );
}
