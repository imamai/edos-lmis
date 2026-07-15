"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createMolecularRun, addMolecularTarget, finalizeMolecularRun } from "@/lib/actions/molecular";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Target = { id: string; target_name: string; ct_value: number | null; result: string };
type Run = { id: string; assay_name: string; status: string };

const resultTone: Record<string, "success" | "critical" | "warning"> = {
  detected: "critical",
  not_detected: "success",
  indeterminate: "warning",
};

export function MolecularWorkup({
  orderTestId,
  run: molecularRun,
  targets,
}: {
  orderTestId: string;
  run: Run | null;
  targets: Target[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function submit(action: (orderTestId: string, formData: FormData) => Promise<{ error: string | null }>, e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(orderTestId, formData);
      if (result.error) setError(result.error);
      else {
        setError(null);
        router.refresh();
      }
    });
  }

  if (!molecularRun) {
    return (
      <form onSubmit={(e) => submit(createMolecularRun, e)}>
        <Card>
          <CardHeader><CardTitle>Set Up PCR / Molecular Run</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="assay_name">Assay Name</Label>
            <Input id="assay_name" name="assay_name" required placeholder="e.g. SARS-CoV-2 RT-PCR" />
          </CardContent>
        </Card>
        {error && <p className="mt-2 text-sm text-critical">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Start Run"}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{molecularRun.assay_name}</CardTitle>
          <Badge tone={molecularRun.status === "completed" ? "success" : "info"}>{molecularRun.status.replace(/_/g, " ")}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Target</th>
                <th className="px-4 py-2 font-medium">Ct Value</th>
                <th className="px-4 py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {targets.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No targets recorded yet.</td></tr>
              )}
              {targets.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{t.target_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.ct_value ?? "-"}</td>
                  <td className="px-4 py-2"><Badge tone={resultTone[t.result] ?? "neutral"}>{t.result.replace("_", " ")}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {molecularRun.status === "pending" && (
        <Card>
          <CardHeader><CardTitle>Add Target Result</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => submit(addMolecularTarget, e)} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
              <input type="hidden" name="run_id" value={molecularRun.id} />
              <div>
                <Label htmlFor="target_name">Target</Label>
                <Input id="target_name" name="target_name" required placeholder="e.g. N gene" />
              </div>
              <div>
                <Label htmlFor="ct_value">Ct Value</Label>
                <Input id="ct_value" name="ct_value" type="number" step="0.01" />
              </div>
              <div>
                <Label htmlFor="result">Result</Label>
                <Select id="result" name="result" required defaultValue="">
                  <option value="" disabled>Select</option>
                  <option value="detected">Detected</option>
                  <option value="not_detected">Not Detected</option>
                  <option value="indeterminate">Indeterminate</option>
                </Select>
              </div>
              <div>
                <Button type="submit" disabled={isPending} className="w-full">{isPending ? "Adding..." : "Add Target"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-critical">{error}</p>}

      {molecularRun.status === "pending" && targets.length > 0 && (
        <div className="flex justify-end">
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await finalizeMolecularRun(molecularRun.id, orderTestId);
                if (result.error) setError(result.error);
                else router.refresh();
              })
            }
          >
            {isPending ? "Finalizing..." : "Finalize & Send to Verification"}
          </Button>
        </div>
      )}
    </div>
  );
}
