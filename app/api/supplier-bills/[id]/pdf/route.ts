import { NextResponse } from "next/server";
import { createElement } from "react";
import { getSupplierBill } from "@/lib/data/supplier-bills";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { SupplierBillDocument } from "@/lib/pdf/supplier-bill-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const [{ data: bill, error: billError }, settings] = await Promise.all([
    getSupplierBill(id),
    getTenantSettings(staff.tenantId),
  ]);

  if (billError) {
    return NextResponse.json({ error: billError }, { status: 500 });
  }
  if (!bill) {
    return NextResponse.json({ error: "Supplier bill not found" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(SupplierBillDocument, { bill, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${bill.bill_number}.pdf`),
    },
  });
}
