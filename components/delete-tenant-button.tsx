"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTenant } from "@/lib/actions/tenant-admin";
import { Button } from "@/components/ui/button";

export function DeleteTenantButton({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="danger"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(`Delete ${tenantName}? This only works if the tenant has no branches, staff, or other data, and cannot be undone.`)) {
            return;
          }
          startTransition(async () => {
            const result = await deleteTenant(tenantId);
            if (result?.error) {
              setError(result.error);
              return;
            }
            router.push("/admin/tenants");
          });
        }}
      >
        {isPending ? "Deleting..." : "Delete tenant"}
      </Button>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
