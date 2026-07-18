"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateStaffPermissionOverrides } from "@/lib/actions/staff";
import { PERMISSION_GROUPS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function EditStaffPermissionsButton({
  userId,
  staffName,
  currentPermissions,
}: {
  userId: string;
  staffName: string;
  currentPermissions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateStaffPermissionOverrides, null);
  const router = useRouter();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
  }, [pending]);

  useEffect(() => {
    if (!pending && submittedRef.current && !state?.error) {
      submittedRef.current = false;
      setOpen(false);
      router.refresh();
    }
  }, [pending, state, router]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Permissions{currentPermissions.length > 0 ? ` (${currentPermissions.length})` : ""}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Custom permissions — ${staffName}`}>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="user_id" value={userId} />
          <p className="text-sm text-muted-foreground">
            Access granted here is in addition to whatever this person&apos;s roles already grant — unchecking a
            box removes only this individual exception, not any role-based access.
          </p>
          <div className="space-y-3 rounded-lg border border-border p-3">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.group}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.group}
                </p>
                <div className="flex flex-wrap gap-3">
                  {group.permissions.map((p) => (
                    <label key={p.value} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        name="permission"
                        value={p.value}
                        defaultChecked={currentPermissions.includes(p.value)}
                        className="h-4 w-4"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {state?.error && <p className="text-sm text-critical">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Permissions"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
