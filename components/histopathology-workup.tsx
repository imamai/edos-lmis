"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createHistoCase, addBlock, addSlide, finalizeDiagnosis } from "@/lib/actions/histopathology";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Block = { id: string; block_number: string; tissue_description: string | null };
type Slide = { id: string; block_id: string; slide_number: string; stain_type: string };
type Diagnosis = { id: string; microscopic_description: string; diagnosis: string; icd_o_code: string | null; margins_status: string | null; signed_at: string };
type Case = {
  id: string;
  specimen_type: string;
  status: string;
  clinical_history: string | null;
  gross_description: string | null;
  number_of_pieces: number;
};

const statusTone: Record<string, "neutral" | "info" | "warning" | "success"> = {
  received: "neutral",
  grossed: "warning",
  processing: "info",
  microscopy: "info",
  finalized: "success",
};

export function HistopathologyWorkup({
  orderTestId,
  histoCase,
  blocks,
  slidesByBlock,
  diagnosis,
  stainTypes,
}: {
  orderTestId: string;
  histoCase: Case | null;
  blocks: Block[];
  slidesByBlock: Record<string, Slide[]>;
  diagnosis: Diagnosis | null;
  stainTypes: { value: string; label: string }[];
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

  if (!histoCase) {
    return (
      <form onSubmit={(e) => run(createHistoCase, e)}>
        <Card>
          <CardHeader><CardTitle>Specimen Receipt & Grossing</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="specimen_type">Specimen Type</Label>
              <Select id="specimen_type" name="specimen_type" defaultValue="biopsy">
                <option value="biopsy">Biopsy</option>
                <option value="resection">Resection</option>
                <option value="cytology">Cytology</option>
                <option value="frozen_section">Frozen Section</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="number_of_pieces">Number of Pieces</Label>
              <Input id="number_of_pieces" name="number_of_pieces" type="number" defaultValue="1" min={1} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="clinical_history">Clinical History</Label>
              <Textarea id="clinical_history" name="clinical_history" rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gross_description">Gross Description</Label>
              <Textarea id="gross_description" name="gross_description" rows={3} />
            </div>
          </CardContent>
        </Card>
        {error && <p className="mt-2 text-sm text-critical">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Record Grossing"}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{histoCase.specimen_type.replace(/_/g, " ")} &middot; {histoCase.number_of_pieces} piece(s)</CardTitle>
          <Badge tone={statusTone[histoCase.status] ?? "neutral"}>{histoCase.status}</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {histoCase.clinical_history && <p className="text-sm text-muted-foreground">History: {histoCase.clinical_history}</p>}
          {histoCase.gross_description && <p className="text-sm text-foreground">Gross: {histoCase.gross_description}</p>}
        </CardContent>
      </Card>

      {histoCase.status !== "finalized" && (
        <Card>
          <CardHeader><CardTitle>Add Tissue Block</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={(e) => run(addBlock, e)} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
              <input type="hidden" name="case_id" value={histoCase.id} />
              <div>
                <Label htmlFor="block_number">Block Number</Label>
                <Input id="block_number" name="block_number" required placeholder="A1" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="tissue_description">Tissue Description</Label>
                <Input id="tissue_description" name="tissue_description" />
              </div>
              <div>
                <Button type="submit" size="sm" disabled={isPending} className="w-full">Add Block</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {blocks.map((block) => (
        <Card key={block.id}>
          <CardHeader>
            <CardTitle>Block {block.block_number} {block.tissue_description && `— ${block.tissue_description}`}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(slidesByBlock[block.id] ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">Slide {s.slide_number}</span>
                <Badge tone="neutral">{s.stain_type}</Badge>
              </div>
            ))}
            {histoCase.status !== "finalized" && (
              <form onSubmit={(e) => run(addSlide, e)} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
                <input type="hidden" name="block_id" value={block.id} />
                <input type="hidden" name="case_id" value={histoCase.id} />
                <div>
                  <Label htmlFor={`slide-${block.id}`}>Slide Number</Label>
                  <Input id={`slide-${block.id}`} name="slide_number" required />
                </div>
                <div>
                  <Label htmlFor={`stain-${block.id}`}>Stain</Label>
                  <Select id={`stain-${block.id}`} name="stain_type" defaultValue={stainTypes[0]?.value ?? "H&E"}>
                    {stainTypes.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Button type="submit" size="sm" disabled={isPending} className="w-full">Add Slide</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ))}

      {error && <p className="text-sm text-critical">{error}</p>}

      {diagnosis ? (
        <Card>
          <CardHeader><CardTitle>Microscopic Diagnosis</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-foreground">Microscopic: {diagnosis.microscopic_description}</p>
            <p className="text-sm font-medium text-foreground">Diagnosis: {diagnosis.diagnosis}</p>
            {diagnosis.icd_o_code && <p className="text-sm text-muted-foreground">ICD-O: {diagnosis.icd_o_code}</p>}
            {diagnosis.margins_status && <p className="text-sm text-muted-foreground">Margins: {diagnosis.margins_status}</p>}
            <p className="text-xs text-muted-foreground">Signed {new Date(diagnosis.signed_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      ) : (
        histoCase.status !== "finalized" &&
        blocks.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Microscopic Examination & Diagnosis</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => run(finalizeDiagnosis, e)} className="space-y-3">
                <input type="hidden" name="case_id" value={histoCase.id} />
                <div>
                  <Label htmlFor="microscopic_description">Microscopic Description</Label>
                  <Textarea id="microscopic_description" name="microscopic_description" rows={3} required />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-3">
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Textarea id="diagnosis" name="diagnosis" rows={2} required />
                  </div>
                  <div>
                    <Label htmlFor="icd_o_code">ICD-O Code</Label>
                    <Input id="icd_o_code" name="icd_o_code" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="margins_status">Margins Status</Label>
                    <Input id="margins_status" name="margins_status" placeholder="e.g. Clear, 5mm from nearest margin" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Signing..." : "Sign & Send to Verification"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
