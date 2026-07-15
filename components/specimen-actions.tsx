"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receiveSpecimen, rejectSpecimen } from "@/lib/actions/specimens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SpecimenActions({ specimenId }: { specimenId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (showReject) {
    return (
      <div className="flex items-center gap-2">
        <Input
          placeholder="Rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 w-40"
        />
        <Button
          size="sm"
          variant="danger"
          disabled={isPending || !reason.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await rejectSpecimen(specimenId, reason);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShowReject(false)}>
          Cancel
        </Button>
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await receiveSpecimen(specimenId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        Receive
      </Button>
      <Button size="sm" variant="outline" onClick={() => setShowReject(true)}>
        Reject
      </Button>
      {error && <span className="text-xs text-critical">{error}</span>}
    </div>
  );
}
