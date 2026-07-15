"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createOrganism,
  setOrganismActive,
  createAntibiotic,
  setAntibioticActive,
} from "@/lib/actions/microbiology";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { OrganismRow, AntibioticRow } from "@/lib/data/microbiology-catalog";

const GRAM_STAIN_LABELS: Record<string, string> = {
  positive: "Gram positive",
  negative: "Gram negative",
  variable: "Gram variable",
  not_applicable: "N/A",
};

function ActiveBadge({ isActive, onToggle }: { isActive: boolean; onToggle: () => void }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { onToggle(); router.refresh(); })}
      className="disabled:opacity-50"
    >
      <Badge tone={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
    </button>
  );
}

export function MicrobiologyCatalogManager({
  organisms,
  antibiotics,
}: {
  organisms: OrganismRow[];
  antibiotics: AntibioticRow[];
}) {
  const [organismState, organismAction, organismPending] = useActionState(createOrganism, null);
  const [antibioticState, antibioticAction, antibioticPending] = useActionState(createAntibiotic, null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Organisms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <table className="w-full text-sm">
            <tbody>
              {organisms.map((o) => (
                <tr key={o.id} className="border-b border-border">
                  <td className="py-1.5 text-foreground">{o.name}</td>
                  <td className="py-1.5 text-muted-foreground">{GRAM_STAIN_LABELS[o.gram_stain] ?? o.gram_stain}</td>
                  <td className="py-1.5 text-right">
                    <ActiveBadge isActive={o.is_active} onToggle={() => setOrganismActive(o.id, !o.is_active)} />
                  </td>
                </tr>
              ))}
              {organisms.length === 0 && (
                <tr><td className="py-1.5 text-muted-foreground">None yet.</td></tr>
              )}
            </tbody>
          </table>
          <form action={organismAction} className="flex items-end gap-2">
            <Input name="name" placeholder="Organism name" required className="flex-1" />
            <Select name="gram_stain" defaultValue="not_applicable" className="w-40">
              {Object.entries(GRAM_STAIN_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Button type="submit" variant="outline" disabled={organismPending}>
              {organismPending ? "Adding..." : "Add"}
            </Button>
          </form>
          {organismState?.error && <p className="text-sm text-critical">{organismState.error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Antibiotics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <table className="w-full text-sm">
            <tbody>
              {antibiotics.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="py-1.5 text-foreground">{a.name}</td>
                  <td className="py-1.5 text-muted-foreground">{a.antibiotic_class ?? "-"}</td>
                  <td className="py-1.5 text-right">
                    <ActiveBadge isActive={a.is_active} onToggle={() => setAntibioticActive(a.id, !a.is_active)} />
                  </td>
                </tr>
              ))}
              {antibiotics.length === 0 && (
                <tr><td className="py-1.5 text-muted-foreground">None yet.</td></tr>
              )}
            </tbody>
          </table>
          <form action={antibioticAction} className="flex items-end gap-2">
            <Input name="name" placeholder="Antibiotic name" required className="flex-1" />
            <Input name="antibiotic_class" placeholder="Class (optional)" className="w-40" />
            <Button type="submit" variant="outline" disabled={antibioticPending}>
              {antibioticPending ? "Adding..." : "Add"}
            </Button>
          </form>
          {antibioticState?.error && <p className="text-sm text-critical">{antibioticState.error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
