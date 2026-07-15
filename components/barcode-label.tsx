"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function BarcodeLabel({
  specimenNumber,
  patientName,
  patientNumber,
  specimenType,
  collectedAt,
}: {
  specimenNumber: string;
  patientName: string;
  patientNumber: string;
  specimenType: string;
  collectedAt: string | null;
}) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, specimenNumber, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
        margin: 4,
      });
    }
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, specimenNumber, { width: 96, margin: 1 });
    }
  }, [specimenNumber]);

  return (
    <div className="space-y-4">
      <div className="mx-auto w-fit rounded-xl border border-border bg-white p-4 text-black shadow-sm print:shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div className="text-xs">
            <p className="font-semibold">{patientName}</p>
            <p>{patientNumber}</p>
            <p>{specimenType}</p>
            <p>{collectedAt ? new Date(collectedAt).toLocaleString() : "-"}</p>
          </div>
          <canvas ref={qrRef} />
        </div>
        <svg ref={barcodeRef} />
      </div>
      <div className="no-print flex justify-center">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={16} /> Print Label
        </Button>
      </div>
    </div>
  );
}
