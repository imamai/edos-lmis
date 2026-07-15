"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addListItem, deleteListItem } from "@/lib/actions/settings-lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

type ListItem = { id: string; value: string; label: string };

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
  const [isDeleting, startDeleting] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
          {items.map((item) => (
            <Badge key={item.id} tone="neutral" className="flex items-center gap-1.5">
              {item.label}
              <button
                type="button"
                disabled={isDeleting}
                title={`Remove ${item.label}`}
                onClick={() => startDeleting(async () => {
                  await deleteListItem(item.id);
                  router.refresh();
                })}
                className="disabled:opacity-50"
              >
                <X size={12} />
              </button>
            </Badge>
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
