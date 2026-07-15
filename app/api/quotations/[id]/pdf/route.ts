import { NextResponse } from "next/server";
import { createElement } from "react";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { getQuotation } from "@/lib/data/quotations";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { QuotationDocument } from "@/lib/pdf/quotation-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();

  const [{ data: quotation, error: quotationError }, settings] = await Promise.all([
    getQuotation(id),
    getTenantSettings(staff.tenantId),
  ]);

  if (quotationError) {
    return NextResponse.json({ error: quotationError }, { status: 500 });
  }
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(QuotationDocument, { quotation, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${quotation.quotation_number}.pdf`),
    },
  });
}
