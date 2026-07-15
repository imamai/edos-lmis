"use client";

import { useActionState, useState } from "react";
import { updatePanel } from "@/lib/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PanelDetail } from "@/lib/data/catalog";

type TestOption = { id: string; code: string; name: string };

export function EditPanelForm({ panel, tests }: { panel: PanelDetail; tests: TestOption[] }) {
  const [state, formAction, pending] = useActionState(updatePanel, null);
  const [query, setQuery] = useState("");
  const selected = new Set(panel.test_ids);
  const filtered = tests.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.code.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="panel_id" value={panel.id} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required defaultValue={panel.code} />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={panel.name} />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={panel.price} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tests included *</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Filter tests..." value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm text-foreground hover:bg-surface-muted">
                <input type="checkbox" name="test_id" value={t.id} defaultChecked={selected.has(t.id)} className="h-4 w-4" />
                {t.name} <span className="text-muted-foreground">({t.code})</span>
              </label>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No matching tests.</p>}
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
