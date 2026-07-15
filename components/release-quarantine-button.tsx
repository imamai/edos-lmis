"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { releaseFromQuarantine } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";

export function ReleaseQuarantineButton({ unitId }: { unitId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        size="sm"
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseFromQuarantine(unitId);
            if (result?.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Releasing..." : "Release (screening clear)"}
      </Button>
      {error && <p className="mt-1 text-xs text-critical">{error}</p>}
    </div>
  );
}
