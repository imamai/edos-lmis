"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { enterResults } from "@/lib/actions/results";
import { queueOfflineAction } from "@/lib/offline/queue";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ResultComponentRow = {
  id: string | null;
  name: string;
  unit: string | null;
  dataType: "numeric" | "text" | "select";
  selectOptions: { value: string; critical: boolean }[];
  rangeLabel: string | null;
};

export function ResultEntryForm({
  orderTestId,
  components,
}: {
  orderTestId: string;
  components: ResultComponentRow[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const router = useRouter();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        formData.set("order_test_id", orderTestId);
        await queueOfflineAction("enterResults", `Result entry`, formData);
        setQueued(true);
        return;
      }
      const result = await enterResults(orderTestId, formData);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (queued) {
    return (
      <Card>
        <CardContent>
          <p className="text-sm text-warning">Results queued offline — will submit automatically when back online.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Enter Results</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Parameter</th>
              <th className="px-4 py-2 font-medium">Result</th>
              <th className="px-4 py-2 font-medium">Unit</th>
              <th className="px-4 py-2 font-medium">Reference Range</th>
            </tr>
          </thead>
          <tbody>
            {components.map((comp) => {
              const fieldId = `value_${comp.id ?? "main"}`;
              return (
                <tr key={comp.id ?? "main"} className="border-t border-border">
                  <td className="px-4 py-2 font-medium text-foreground">{comp.name}</td>
                  <td className="px-4 py-2">
                    {comp.dataType === "select" ? (
                      <Select id={fieldId} name={fieldId} defaultValue="" className="h-9">
                        <option value="" disabled>
                          Select...
                        </option>
                        {comp.selectOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.value}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={fieldId}
                        name={fieldId}
                        type={comp.dataType === "numeric" ? "number" : "text"}
                        step={comp.dataType === "numeric" ? "any" : undefined}
                        placeholder={comp.dataType === "text" ? comp.rangeLabel ?? undefined : undefined}
                        className="h-9"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{comp.unit ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{comp.rangeLabel ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Results"}
        </Button>
      </div>
    </form>
  );
}
