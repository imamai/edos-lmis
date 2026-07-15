"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type DeleteAction = (id: string) => Promise<{ error: string } | void>;

export function DeleteEntityButton({
  id,
  action,
  canDelete,
  blockedMessage,
  entityLabel = "record",
}: {
  id: string;
  action: DeleteAction;
  canDelete: boolean;
  blockedMessage?: string;
  entityLabel?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!canDelete) {
    return (
      <div className="text-right">
        <Button variant="outline" disabled title={blockedMessage}>
          Delete
        </Button>
        {blockedMessage && <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">{blockedMessage}</p>}
      </div>
    );
  }

  if (show) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Delete this {entityLabel}?</span>
        <Button
          variant="danger"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await action(id);
              if (result?.error) {
                setError(result.error);
                setShow(false);
              } else {
                router.refresh();
              }
            })
          }
        >
          Confirm Delete
        </Button>
        <Button variant="ghost" onClick={() => setShow(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline" onClick={() => setShow(true)}>
        Delete
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
