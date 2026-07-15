"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

type ToggleAction = (id: string, isActive: boolean) => Promise<{ error: string | null } | void>;

/** Generic active/inactive badge-toggle for master-data entities. */
export function ActiveToggle({ id, isActive, action }: { id: string; isActive: boolean; action: ToggleAction }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={isPending}
      title={isActive ? "Click to deactivate" : "Click to reactivate"}
      onClick={() =>
        startTransition(async () => {
          await action(id, !isActive);
          router.refresh();
        })
      }
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}
