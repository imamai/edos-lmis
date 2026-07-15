"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyResult, rejectResultForRecollection, releaseResult } from "@/lib/actions/results";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function VerifyButton({ orderTestId }: { orderTestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Verification comments (required if rejecting)"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        rows={2}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await verifyResult(orderTestId, comments);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          {isPending ? "Verifying..." : "Verify Results (Scientist)"}
        </Button>
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await rejectResultForRecollection(orderTestId, comments);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          Reject &mdash; Needs Recollection
        </Button>
      </div>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}

export function ReleaseButton({ orderTestId }: { orderTestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await releaseResult(orderTestId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Releasing..." : "Approve & Release (Pathologist)"}
      </Button>
      {error && <p className="mt-1 text-sm text-critical">{error}</p>}
    </div>
  );
}
