import { NextResponse } from "next/server";
import { createElement } from "react";
import { getRfq } from "@/lib/data/procurement";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { RfqDocument } from "@/lib/pdf/rfq-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const [{ data: rfq, error: rfqError }, settings] = await Promise.all([
    getRfq(id),
    getTenantSettings(staff.tenantId),
  ]);

  if (rfqError) {
    return NextResponse.json({ error: rfqError }, { status: 500 });
  }
  if (!rfq) {
    return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(RfqDocument, { rfq, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${rfq.rfq_number}.pdf`),
    },
  });
}
