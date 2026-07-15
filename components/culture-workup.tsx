"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCulture, setCultureGrowth, addIsolate, addSensitivityResult, finalizeCulture } from "@/lib/actions/microbiology";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Organism = { id: string; name: string };
type Antibiotic = { id: string; name: string };
type Sensitivity = { id: string; interpretation: string; zone_diameter_mm: number | null; edoslmis_micro_antibiotics: { name: string } | null };
type Isolate = { id: string; colony_count: string | null; significance: string; edoslmis_micro_organisms: { name: string } | null };
type Culture = {
  id: string;
  culture_type: string;
  status: string;
  media_used: string | null;
  gram_stain_result: string | null;
};

const interpretationTone: Record<string, "success" | "warning" | "critical"> = {
  susceptible: "success",
  intermediate: "warning",
  resistant: "critical",
};

export function CultureWorkup({
  orderTestId,
  culture,
  isolates,
  sensitivitiesByIsolate,
  organisms,
  antibiotics,
}: {
  orderTestId: string;
  culture: Culture | null;
  isolates: Isolate[];
  sensitivitiesByIsolate: Record<string, Sensitivity[]>;
  organisms: Organism[];
  antibiotics: Antibiotic[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(action: (orderTestId: string, formData: FormData) => Promise<{ error: string | null }>, e: FormEvent<HTMLFormElement>) {
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

  if (!culture) {
    return (
      <form onSubmit={(e) => run(createCulture, e)}>
        <Card>
          <CardHeader><CardTitle>Set Up Culture</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="culture_type">Culture Type</Label>
              <Select id="culture_type" name="culture_type" defaultValue="aerobic">
                <option value="aerobic">Aerobic</option>
                <option value="anaerobic">Anaerobic</option>
                <option value="fungal">Fungal</option>
                <option value="afb">AFB</option>
                <option value="blood_culture">Blood Culture</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="media_used">Media Used</Label>
              <Input id="media_used" name="media_used" placeholder="e.g. Blood agar, MacConkey" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gram_stain_result">Gram Stain Result</Label>
              <Textarea id="gram_stain_result" name="gram_stain_result" rows={2} />
            </div>
          </CardContent>
        </Card>
        {error && <p className="mt-2 text-sm text-critical">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Set Up Culture"}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Culture — {culture.culture_type.replace(/_/g, " ")}</CardTitle>
          <Badge tone={culture.status === "finalized" ? "success" : "info"}>{culture.status.replace(/_/g, " ")}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Media: {culture.media_used ?? "-"}</p>
          {culture.gram_stain_result && <p className="text-sm text-foreground">Gram stain: {culture.gram_stain_result}</p>}
          {culture.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setCultureGrowth(culture.id, orderTestId, "growth");
                    if (result.error) setError(result.error);
                    else router.refresh();
                  })
                }
              >
                Growth Observed
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await setCultureGrowth(culture.id, orderTestId, "no_growth");
                    if (result.error) setError(result.error);
                    else router.refresh();
                  })
                }
              >
                No Growth
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {culture.status === "growth" && (
        <Card>
          <CardHeader><CardTitle>Add Isolate</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => run(addIsolate, e)} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
              <input type="hidden" name="culture_id" value={culture.id} />
              <div className="sm:col-span-2">
                <Label htmlFor="organism_id">Organism</Label>
                <Select id="organism_id" name="organism_id" required defaultValue="">
                  <option value="" disabled>Select organism</option>
                  {organisms.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </Select>
              </div>
              <div>
                <Label htmlFor="colony_count">Colony Count</Label>
                <Input id="colony_count" name="colony_count" placeholder="> 100,000 CFU/mL" />
              </div>
              <div>
                <Label htmlFor="significance">Significance</Label>
                <Select id="significance" name="significance" defaultValue="pathogen">
                  <option value="pathogen">Pathogen</option>
                  <option value="contaminant">Contaminant</option>
                  <option value="normal_flora">Normal Flora</option>
                </Select>
              </div>
              <div className="sm:col-span-4">
                <Button type="submit" size="sm" disabled={isPending}>{isPending ? "Adding..." : "Add Isolate"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isolates.map((isolate) => (
        <Card key={isolate.id}>
          <CardHeader>
            <CardTitle>
              {isolate.edoslmis_micro_organisms?.name} {isolate.colony_count && `(${isolate.colony_count})`}{" "}
              <Badge tone="neutral" className="ml-1">{isolate.significance.replace(/_/g, " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(sensitivitiesByIsolate[isolate.id] ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{s.edoslmis_micro_antibiotics?.name}</span>
                <Badge tone={interpretationTone[s.interpretation] ?? "neutral"}>{s.interpretation}</Badge>
              </div>
            ))}
            {isolate.significance === "pathogen" && (
              <form onSubmit={(e) => run(addSensitivityResult, e)} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                <input type="hidden" name="isolate_id" value={isolate.id} />
                <div>
                  <Label htmlFor={`abx-${isolate.id}`}>Antibiotic</Label>
                  <Select id={`abx-${isolate.id}`} name="antibiotic_id" required defaultValue="">
                    <option value="" disabled>Select</option>
                    {antibiotics.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`zone-${isolate.id}`}>Zone (mm)</Label>
                  <Input id={`zone-${isolate.id}`} name="zone_diameter_mm" type="number" step="0.1" />
                </div>
                <div>
                  <Label htmlFor={`interp-${isolate.id}`}>Interpretation</Label>
                  <Select id={`interp-${isolate.id}`} name="interpretation" required defaultValue="">
                    <option value="" disabled>Select</option>
                    <option value="susceptible">Susceptible</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="resistant">Resistant</option>
                  </Select>
                </div>
                <div>
                  <Button type="submit" size="sm" disabled={isPending} className="w-full">Add</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-critical">{error}</p>}

      {culture.status !== "finalized" && culture.status !== "pending" && (
        <div className="flex justify-end">
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await finalizeCulture(culture.id, orderTestId);
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
