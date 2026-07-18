"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addListItem, deleteListItem, setListItemActive } from "@/lib/actions/settings-lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";

type ListItem = { id: string; value: string; label: string; is_active: boolean };

export function SettingsListManager({
  listKey,
  title,
  description,
  items,
}: {
  listKey: string;
  title: string;
  description: string;
  items: ListItem[];
}) {
  const [state, formAction, pending] = useActionState(addListItem, null);
  const [isBusy, startBusy] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}. Uncheck an entry to hide it from pickers without deleting it — useful for standardizing the
          list without losing entries already used on old records.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-md px-1 py-1 hover:bg-surface-muted">
              <label className="flex flex-1 items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={item.is_active}
                  disabled={isBusy}
                  onChange={(e) =>
                    startBusy(async () => {
                      await setListItemActive(item.id, e.target.checked);
                      router.refresh();
                    })
                  }
                />
                <span className={item.is_active ? "" : "text-muted-foreground line-through"}>{item.label}</span>
              </label>
              <button
                type="button"
                disabled={isBusy}
                title={`Delete ${item.label} permanently`}
                onClick={() =>
                  startBusy(async () => {
                    await deleteListItem(item.id);
                    router.refresh();
                  })
                }
                className="text-muted-foreground hover:text-critical disabled:opacity-50"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="list_key" value={listKey} />
          <div className="flex-1">
            <Input name="label" placeholder="Add a new one..." required />
          </div>
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Adding..." : "Add"}
          </Button>
        </form>
        {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
