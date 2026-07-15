"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTestComponent, updateTestComponent, deleteTestComponent } from "@/lib/actions/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Trash2, Pencil } from "lucide-react";
import type { TestComponentRow } from "@/lib/data/catalog";

function optionsToLines(options: TestComponentRow["selectOptions"]) {
  return options.map((o) => (o.critical ? `${o.value}*` : o.value)).join("\n");
}

function rangeSummary(c: TestComponentRow) {
  if (c.dataType === "select") {
    return c.selectOptions.length === 0
      ? "No options configured"
      : c.selectOptions.map((o) => (o.critical ? `${o.value} (critical)` : o.value)).join(" / ");
  }
  if (c.dataType === "text") {
    return c.textRange ? `Expected: ${c.textRange}` : "No expected value set";
  }
  if (c.low !== null || c.high !== null) {
    return `${c.low ?? "-"} – ${c.high ?? "-"}${c.unit ? ` ${c.unit}` : ""}`;
  }
  return "No range set";
}

function TypeFields({
  dataType,
  setDataType,
  defaults,
  prefix,
}: {
  dataType: "numeric" | "text" | "select";
  setDataType: (t: "numeric" | "text" | "select") => void;
  defaults?: TestComponentRow;
  prefix: string;
}) {
  return (
    <>
      <div>
        <Label htmlFor={`${prefix}_data_type`}>Data Type</Label>
        <Select
          id={`${prefix}_data_type`}
          name="data_type"
          value={dataType}
          onChange={(e) => setDataType(e.target.value as "numeric" | "text" | "select")}
        >
          <option value="numeric">Numeric</option>
          <option value="text">Text</option>
          <option value="select">Select (fixed options)</option>
        </Select>
      </div>
      {dataType === "numeric" && (
        <>
          <div>
            <Label htmlFor={`${prefix}_low`}>Low</Label>
            <Input id={`${prefix}_low`} name="low" type="number" step="0.01" defaultValue={defaults?.low ?? ""} />
          </div>
          <div>
            <Label htmlFor={`${prefix}_high`}>High</Label>
            <Input id={`${prefix}_high`} name="high" type="number" step="0.01" defaultValue={defaults?.high ?? ""} />
          </div>
          <div>
            <Label htmlFor={`${prefix}_critical_low`}>Critical Low</Label>
            <Input
              id={`${prefix}_critical_low`}
              name="critical_low"
              type="number"
              step="0.01"
              defaultValue={defaults?.criticalLow ?? ""}
            />
          </div>
          <div>
            <Label htmlFor={`${prefix}_critical_high`}>Critical High</Label>
            <Input
              id={`${prefix}_critical_high`}
              name="critical_high"
              type="number"
              step="0.01"
              defaultValue={defaults?.criticalHigh ?? ""}
            />
          </div>
        </>
      )}
      {dataType === "text" && (
        <div className="sm:col-span-2">
          <Label htmlFor={`${prefix}_text_range`}>Expected value</Label>
          <Input id={`${prefix}_text_range`} name="text_range" placeholder="e.g. Negative" defaultValue={defaults?.textRange ?? ""} />
        </div>
      )}
      {dataType === "select" && (
        <div className="sm:col-span-2">
          <Label htmlFor={`${prefix}_select_options`}>Options</Label>
          <Textarea
            id={`${prefix}_select_options`}
            name="select_options"
            rows={3}
            placeholder={"Non-Reactive\nReactive*"}
            defaultValue={defaults ? optionsToLines(defaults.selectOptions) : ""}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            One option per line. Add * after an option to flag it as critical, e.g. <code>Reactive*</code>.
          </p>
        </div>
      )}
    </>
  );
}

function ComponentRow({ component, testId }: { component: TestComponentRow; testId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [dataType, setDataType] = useState(component.dataType);
  const [state, formAction, pending] = useActionState(updateTestComponent, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className="border-t border-border p-3">
        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="component_id" value={component.id} />
          <input type="hidden" name="test_id" value={testId} />
          <div>
            <Label htmlFor="edit_name">Name</Label>
            <Input id="edit_name" name="name" required defaultValue={component.name} />
          </div>
          <div>
            <Label htmlFor="edit_unit">Unit</Label>
            <Input id="edit_unit" name="unit" defaultValue={component.unit ?? ""} />
          </div>
          <TypeFields dataType={dataType} setDataType={setDataType} defaults={component} prefix="edit" />
          {state?.error && <p className="text-sm text-critical sm:col-span-2">{state.error}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-t border-border p-3">
      <div>
        <p className="font-medium text-foreground">
          {component.name} <span className="text-muted-foreground">({component.dataType})</span>
        </p>
        <p className="text-sm text-muted-foreground">{rangeSummary(component)}</p>
      </div>
      {!confirmingDelete ? (
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setEditing(true)} title="Edit" className="rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground">
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            title="Delete"
            className="rounded p-1 text-muted-foreground hover:bg-critical/10 hover:text-critical"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <span>Delete?</span>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() =>
              startDelete(async () => {
                const result = await deleteTestComponent(component.id, testId);
                if (result?.error) {
                  setDeleteError(result.error);
                  setConfirmingDelete(false);
                } else {
                  router.refresh();
                }
              })
            }
            className="font-medium text-critical hover:underline"
          >
            {isDeleting ? "Deleting..." : "Confirm"}
          </button>
          <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted-foreground hover:underline">
            Cancel
          </button>
        </div>
      )}
      {deleteError && <p className="text-xs text-critical">{deleteError}</p>}
    </div>
  );
}

export function TestComponentManager({ testId, components }: { testId: string; components: TestComponentRow[] }) {
  const [state, formAction, pending] = useActionState(addTestComponent, null);
  const [dataType, setDataType] = useState<"numeric" | "text" | "select">("numeric");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result Components</CardTitle>
        <p className="text-sm text-muted-foreground">
          What the Enter Results form asks for, and the reference range shown on the report. Leave empty for a plain
          text entry.
        </p>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        {components.length === 0 && (
          <p className="p-3 text-sm text-muted-foreground">
            No components configured — this test currently uses a single free-text result field.
          </p>
        )}
        {components.map((c) => (
          <ComponentRow key={c.id} component={c} testId={testId} />
        ))}

        <form action={formAction} className="grid grid-cols-1 gap-3 border-t border-border p-3 sm:grid-cols-2">
          <input type="hidden" name="test_id" value={testId} />
          <div>
            <Label htmlFor="new_name">Name</Label>
            <Input id="new_name" name="name" required placeholder="e.g. Result" />
          </div>
          <div>
            <Label htmlFor="new_unit">Unit</Label>
            <Input id="new_unit" name="unit" placeholder="e.g. g/dL" />
          </div>
          <TypeFields dataType={dataType} setDataType={setDataType} prefix="new" />
          {state?.error && <p className="text-sm text-critical sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Adding..." : "Add Component"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
