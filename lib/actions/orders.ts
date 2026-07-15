"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createOrder(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const patientId = String(formData.get("patient_id") ?? "");
  const testIds = formData.getAll("test_ids").map(String);
  const panelIds = formData.getAll("panel_ids").map(String);

  if (!patientId) return { error: "Select a patient." };
  if (testIds.length === 0 && panelIds.length === 0) {
    return { error: "Select at least one test or panel." };
  }

  const { data: orderNumber, error: numberError } = await supabase.rpc(
    "edoslmis_generate_order_number"
  );
  if (numberError) return { error: numberError.message };

  const { data: order, error: orderError } = await supabase
    .from("edoslmis_orders")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      order_number: orderNumber as string,
      patient_id: patientId,
      ordering_clinician: String(formData.get("ordering_clinician") ?? "").trim() || null,
      ordering_user_id: staff.userId,
      priority: String(formData.get("priority") ?? "routine"),
      clinical_indication: String(formData.get("clinical_indication") ?? "").trim() || null,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (orderError) return { error: orderError.message };

  const orderTestRows: {
    tenant_id: string;
    order_id: string;
    test_id: string;
    panel_id: string | null;
    department_id: string | null;
    price: number;
  }[] = [];

  if (testIds.length > 0) {
    const { data: tests, error: testsError } = await supabase
      .from("edoslmis_tests")
      .select("id, department_id, price")
      .in("id", testIds);
    if (testsError) return { error: testsError.message };
    for (const t of tests ?? []) {
      orderTestRows.push({
        tenant_id: staff.tenantId,
        order_id: order.id,
        test_id: t.id,
        panel_id: null,
        department_id: t.department_id,
        price: t.price,
      });
    }
  }

  if (panelIds.length > 0) {
    const { data: panelTests, error: panelError } = await supabase
      .from("edoslmis_panel_tests")
      .select("panel_id, edoslmis_tests(id, department_id, price)")
      .in("panel_id", panelIds);
    if (panelError) return { error: panelError.message };
    for (const pt of panelTests ?? []) {
      const test = pt.edoslmis_tests as unknown as {
        id: string;
        department_id: string | null;
        price: number;
      } | null;
      if (!test) continue;
      orderTestRows.push({
        tenant_id: staff.tenantId,
        order_id: order.id,
        test_id: test.id,
        panel_id: pt.panel_id,
        department_id: test.department_id,
        price: test.price,
      });
    }
  }

  const { error: lineItemsError } = await supabase
    .from("edoslmis_order_tests")
    .insert(orderTestRows);
  if (lineItemsError) return { error: lineItemsError.message };

  // Best-effort: auto-issue the invoice right away so an order can't silently
  // release with no billing record on file. Non-fatal — edoslmis_generate_invoice_for_order
  // requires edoslmis.billing.manage, so for a staff member without that
  // permission this simply no-ops and the manual "Generate Invoice" button on
  // the order page remains the fallback.
  await supabase.rpc("edoslmis_generate_invoice_for_order", { p_order_id: order.id });

  redirect(`/orders/${order.id}`);
}

export async function updateOrder(_prevState: { error: string | null } | null, formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_orders")
    .update({
      ordering_clinician: String(formData.get("ordering_clinician") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "routine"),
      clinical_indication: String(formData.get("clinical_indication") ?? "").trim() || null,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath(`/orders/${orderId}`);
  return { error: null };
}

const CANCELLABLE_ORDER_TEST_STATUSES = new Set(["pending", "specimen_collected", "received", "in_analysis"]);

export async function cancelOrder(orderId: string, reason: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  if (!reason.trim()) return { error: "Enter a cancellation reason." };

  const { data: orderTests } = await supabase
    .from("edoslmis_order_tests")
    .select("id, status")
    .eq("order_id", orderId);

  const hasIrreversibleProgress = (orderTests ?? []).some(
    (ot) => !CANCELLABLE_ORDER_TEST_STATUSES.has(ot.status) && ot.status !== "cancelled" && ot.status !== "rejected"
  );
  if (hasIrreversibleProgress) {
    return { error: "Cannot cancel — this order already has resulted, verified, or released tests." };
  }

  const { error } = await supabase
    .from("edoslmis_orders")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      updated_by: staff.userId,
    })
    .eq("id", orderId);
  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_order_tests")
    .update({ status: "cancelled" })
    .eq("order_id", orderId)
    .in("status", Array.from(CANCELLABLE_ORDER_TEST_STATUSES));

  // Best-effort, same permission model as the auto-invoice-on-create call
  // above: requires edoslmis.billing.manage, silently no-ops otherwise so a
  // clerk without billing rights can still cancel the order itself.
  await supabase.rpc("edoslmis_cancel_invoice_for_order", { p_order_id: orderId, p_reason: reason });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { error: null };
}
