import { NextResponse } from "next/server";
import { createElement } from "react";
import { getPurchaseOrder } from "@/lib/data/procurement";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { PurchaseOrderDocument } from "@/lib/pdf/purchase-order-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const [{ data: po, error: poError }, settings] = await Promise.all([
    getPurchaseOrder(id),
    getTenantSettings(staff.tenantId),
  ]);

  if (poError) {
    return NextResponse.json({ error: poError }, { status: 500 });
  }
  if (!po) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }

  const buffer = await renderPdf(createElement(PurchaseOrderDocument, { po, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${po.po_number}.pdf`),
    },
  });
}
